# ADR-008: Post Threading (Parent-Child Replies)

**Status:** Accepted  
**Date:** 2026-06-24  
**Authors:** Linkora Engineering

## Context

The current `Post` data model is flat: every post is a top-level post with no parent-child relationship. There is no way to reply to a post, no way to retrieve replies to a post, and no depth tracking for nested discussions. To support conversations, the protocol requires a threading model where posts can be created as replies to existing posts.

The threading model must satisfy:

1. **O(limit)** pagination for reading replies — never O(total replies).
2. **Bounded depth** to prevent abuse and unbounded instruction costs during root resolution.
3. **AuthorPosts only tracks top-level posts** — replies should not appear in the author's timeline index.
4. **Thread root tracking** — every reply must know its ultimate ancestor for efficient thread queries.
5. **Backward-compatible events** — existing indexers must not break when a reply is created.

## Decision

We implement a reply-indexed threading model using dedicated `StorageKey` variants for parent tracking, thread root tracking, reply ordering, reply counting, and depth enforcement. The design follows the same adjacency-set indexing pattern established in ADR-001 (social graph) to guarantee O(limit) pagination.

## Storage Layout

The following keys are added to the `StorageKey` enum:

```
StorageKey::ParentPost(u64)     -> u64      // post_id -> direct parent (0 = top-level)
StorageKey::ThreadRoot(u64)     -> u64      // post_id -> root of the thread
StorageKey::ReplyIdx(u64, u32)  -> u64      // (parent_id, seq) -> reply_post_id
StorageKey::ReplyCount(u64)     -> u32      // parent_id -> total reply count
StorageKey::ThreadDepth(u64)    -> u32      // post_id -> depth (0 = top-level)
```

### Data Model

The `Post` struct gains an optional `parent_id` field for indexer convenience. The primary threading metadata lives in dedicated storage keys, not in the `Post` struct.

### Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAX_THREAD_DEPTH` | `5` | Maximum nesting depth; replies beyond this are rejected |

## Algorithms

### create_post with Parent ID

```
create_post(env, author, content, parent_id: Option<u64>):
  1. Standard validation (auth, content length)
  2. id = POST_CT + 1
  3. Write Post { id, author, content, ... }

  4. If parent_id is None (top-level):
     a. ThreadRoot(id) = id
     b. ParentPost(id) = 0
     c. ThreadDepth(id) = 0
     d. Append id to AuthorPosts(author)  // only top-level posts indexed

  5. If parent_id is Some(parent):
     a. Assert parent exists (StorageKey::Post(parent) is Some)
     b. Read ThreadDepth(parent) -> depth
     c. Assert depth < MAX_THREAD_DEPTH, otherwise panic("max thread depth exceeded")
     d. ParentPost(id) = parent
     e. ThreadRoot(id) = ThreadRoot(parent)  // inherit root
     f. ThreadDepth(id) = depth + 1
     g. Do NOT append to AuthorPosts(author)
     h. Increment ReplyCount(parent) by 1
     i. ReplyIdx(parent, count) = id  // append to reply index

   6. Publish PostCreatedEvent { id, author, parent_id, root_id }
   7. Return id
```

### get_replies

```
get_replies(env, post_id, offset, limit) -> Vec<u64>:
  1. Assert 0 < limit <= MAX_PAGINATION_LIMIT
  2. count = ReplyCount(post_id).unwrap_or(0)
  3. if offset >= count: return empty
  4. end = min(offset + limit, count)
  5. for seq in offset..end:
       result.push(ReplyIdx(post_id, seq))
  6. return result
```

This is O(limit) — exactly `limit` storage key reads, regardless of total reply count.

### delete_post with Threading Awareness

```
delete_post(env, author, post_id):
  1. Standard auth and existence checks
  2. Read ParentPost(post_id)
  3. If post has a parent (parent_id != 0):
     a. Swap-remove reply_id from ReplyIdx(parent_id, *)
     b. Decrement ReplyCount(parent_id)
  4. Remove from AuthorPosts (if it exists there — top-level only)
  5. Remove Post entry
  6. Publish PostDeleted { post_id, author }
```

## Event Changes

`PostCreatedEvent` gains two non-indexed data fields:

```rust
pub struct PostCreatedEvent {
    #[topic]
    pub id: u64,
    #[topic]
    pub author: Address,
    pub parent_id: Option<u64>,   // present only for replies
    pub root_id: u64,             // thread root ID (= id for top-level posts)
}
```

- `parent_id`: `Option<u64>` — `None` (null) for top-level posts, `Some(parent)` for replies.
- `root_id`: `u64` — the ultimate ancestor post ID of the thread. For top-level posts, `root_id == id`. For replies, `root_id` is inherited from the thread root.

Existing indexers decoding only the `id` and `author` topic fields will continue to work. The new data fields are silently ignored by decoders that do not read them.

## MAX_THREAD_DEPTH

**Value: 5**

Rationale:

- **Instruction cost:** Root resolution reads ThreadDepth of the parent (1 read). No traversal of the parent chain is needed because depth is stored directly. A depth check is O(1).
- **UX:** Most social platforms limit nesting to 3–8 levels. Reddit allows ~8, Twitter/X has 1 level of replies. 5 levels is generous enough for threaded conversations without creating unusably deep nests.
- **Storage cost:** Each depth level adds one `ParentPost` entry (~72 bytes). At depth 5, a fully nested thread costs ~360 bytes for the metadata entries alone.
- **Enforcement:** The check is a single comparison at reply-creation time. There is no runtime overhead for reads.

## Consequences

### Positive

- O(limit) reply pagination ensures predictable instruction costs regardless of thread size.
- AuthorPosts remains bounded to top-level posts only, keeping its Vec size manageable.
- Depth-limited nesting prevents abuse from infinitely nested replies.
- Backward-compatible event schema — existing indexers continue to work unmodified.

### Negative

- Each reply creates 4 additional storage entries (ParentPost, ThreadRoot, ReplyIdx, ThreadDepth) plus one counter increment (ReplyCount). For 10,000 replies under a post, this is ~40,001 storage entries (~2.8 MB).
- Deleting a reply requires swap-remove from the reply index and cleanup of threading metadata.
- AuthorPosts remains a Vec (unbounded — pre-existing issue), though it now only contains top-level posts, reducing its growth rate.
- Existing `review_report` (moderation) must also clean up threading metadata when deleting a post via moderation.
