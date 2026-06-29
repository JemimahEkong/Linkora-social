/**
 * Post Event Handlers
 * Handles PostCreatedEvent and PostDeletedEvent from the Linkora contract
 */

import { Pool } from "pg";

export interface PostCreatedEvent {
  id: bigint;
  author: string;
  parent_id?: bigint | null;
  root_id?: bigint | null;
}

export interface PostDeletedEvent {
  post_id: bigint;
  author: string;
}

export interface PostEventContext {
  txHash: string;
  ledgerSeq: number;
  timestamp: Date;
  content?: string; // Fetched from contract state if needed
}

/**
 * Handle PostCreatedEvent
 * Inserts a new post row into the posts table
 * Idempotent: Uses ON CONFLICT DO NOTHING to handle duplicate events
 */
export async function handlePostCreated(
  pool: Pool,
  event: PostCreatedEvent,
  context: PostEventContext
): Promise<void> {
  const { id, author, parent_id, root_id } = event;
  const { timestamp, content } = context;

  // Fetch content from contract state if not provided
  const postContent = content || "";

  // root_id is provided by the contract event (ADR-008).
  // For top-level posts, root_id = id. For replies, root_id = thread root.
  const rootId = root_id != null ? root_id.toString() : null;

  const query = `
    INSERT INTO posts (id, author, content, tip_total, like_count, created_at, parent_id, root_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (id) DO NOTHING
  `;

  const values = [
    id.toString(),
    author,
    postContent,
    0, // Initial tip_total
    0, // Initial like_count
    timestamp,
    parent_id != null ? parent_id.toString() : null,
    rootId,
  ];

  try {
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      console.log(`Post ${id} already exists (idempotent skip)`);
    } else {
      console.log(`Post ${id} created by ${author}`);
    }
  } catch (error) {
    console.error(`Error handling PostCreatedEvent for post ${id}:`, error);
    throw error;
  }
}

/**
 * Handle PostDeletedEvent
 * Marks a post as deleted (soft delete) by setting deleted_at timestamp
 * Idempotent: Only updates if deleted_at is NULL
 */
export async function handlePostDeleted(
  pool: Pool,
  event: PostDeletedEvent,
  context: PostEventContext
): Promise<void> {
  const { post_id, author } = event;
  const { timestamp } = context;

  const query = `
    UPDATE posts
    SET deleted_at = $1
    WHERE id = $2 AND author = $3 AND deleted_at IS NULL
  `;

  const values = [timestamp, post_id.toString(), author];

  try {
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      console.log(`Post ${post_id} already deleted or not found (idempotent skip)`);
    } else {
      console.log(`Post ${post_id} deleted by ${author}`);
    }
  } catch (error) {
    console.error(`Error handling PostDeletedEvent for post ${post_id}:`, error);
    throw error;
  }
}

/**
 * Fetch post content from contract state
 * This is a placeholder - implement based on your Stellar SDK setup
 */
export async function fetchPostContent(_contractId: string, _postId: bigint): Promise<string> {
  // TODO: Implement contract state fetch using Stellar SDK
  // Example:
  // const contract = new Contract(contractId);
  // const post = await contract.call('get_post', postId);
  // return post.content;

  return "";
}

/**
 * Unit test helper: Mock event data
 */
export function createMockPostCreatedEvent(
  id: bigint = 1n,
  author: string = "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  parentId?: bigint | null,
  rootId?: bigint | null
): { event: PostCreatedEvent; context: PostEventContext } {
  return {
    event: {
      id,
      author,
      parent_id: parentId ?? null,
      root_id: rootId ?? (parentId != null ? 1n : id),
    },
    context: {
      txHash: "0x1234567890abcdef",
      ledgerSeq: 12345,
      timestamp: new Date(),
      content: "Test post content",
    },
  };
}

export function createMockPostDeletedEvent(
  post_id: bigint = 1n,
  author: string = "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
): { event: PostDeletedEvent; context: PostEventContext } {
  return {
    event: { post_id, author },
    context: {
      txHash: "0xabcdef1234567890",
      ledgerSeq: 12346,
      timestamp: new Date(),
    },
  };
}
