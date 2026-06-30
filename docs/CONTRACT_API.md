# Contract API Reference

Full function reference for the Linkora Soroban smart contract (`packages/contracts`).

---

## Initialization

| Function     | Signature                                           | Auth |
| ------------ | --------------------------------------------------- | ---- |
| `initialize` | `(admin: Address, treasury: Address, fee_bps: u32)` | —    |

---

## Profiles

| Function                  | Signature                                                   | Auth   |
| ------------------------- | ----------------------------------------------------------- | ------ |
| `set_profile`             | `(user: Address, username: String, creator_token: Address)` | `user` |
| `get_profile`             | `(user: Address) → Option<Profile>`                         | —      |
| `get_profile_count`       | `() → u64`                                                  | —      |
| `delete_profile`          | `(user: Address)`                                           | `user` |
| `get_address_by_username` | `(username: String) → Option<Address>`                      | —      |

---

## Credentials (ZK)

| Function                 | Signature                                                                                 | Auth   |
| ------------------------ | ----------------------------------------------------------------------------------------- | ------ |
| `update_credential_root` | `(user: Address, root: BytesN<32>, signature: BytesN<64>)`                                | `user` |
| `verify_credential`      | `(user: Address, proof: Vec<BytesN<32>>, leaf: BytesN<32>, nullifier: BytesN<32>) → bool` | —      |
| `get_credential_root`    | `(user: Address) → Option<BytesN<32>>`                                                    | —      |

---

## Direct Messages

| Function         | Signature                                    | Auth   |
| ---------------- | -------------------------------------------- | ------ |
| `publish_dm_key` | `(user: Address, x25519_pubkey: BytesN<32>)` | `user` |
| `get_dm_key`     | `(user: Address) → Option<BytesN<32>>`       | —      |

---

## Social Graph

| Function               | Signature                                                 | Auth       |
| ---------------------- | --------------------------------------------------------- | ---------- |
| `follow`               | `(follower: Address, followee: Address)`                  | `follower` |
| `unfollow`             | `(follower: Address, followee: Address)`                  | `follower` |
| `get_following`        | `(user: Address, offset: u32, limit: u32) → Vec<Address>` | —          |
| `get_followers`        | `(user: Address, offset: u32, limit: u32) → Vec<Address>` | —          |
| `migrate_follow_graph` | `(users: Vec<Address>)`                                   | admin      |
| `block_user`           | `(blocker: Address, blocked: Address)`                    | `blocker`  |
| `unblock_user`         | `(blocker: Address, blocked: Address)`                    | `blocker`  |
| `is_blocked`           | `(blocker: Address, blocked: Address) → bool`             | —          |

> `limit` max is 50.

---

## Posts

| Function              | Signature                                               | Auth     |
| --------------------- | ------------------------------------------------------- | -------- |
| `create_post`         | `(author: Address, content: String) → u64`              | `author` |
| `get_post`            | `(id: u64) → Option<Post>`                              | —        |
| `get_post_count`      | `() → u64`                                              | —        |
| `delete_post`         | `(author: Address, post_id: u64)`                       | `author` |
| `get_posts_by_author` | `(author: Address, offset: u32, limit: u32) → Vec<u64>` | —        |
| `like_post`           | `(user: Address, post_id: u64)`                         | `user`   |
| `get_like_count`      | `(post_id: u64) → u64`                                  | —        |
| `has_liked`           | `(user: Address, post_id: u64) → bool`                  | —        |

> `content` max length is 280 characters.

---

## Tipping

| Function | Signature                                                       | Auth     |
| -------- | --------------------------------------------------------------- | -------- |
| `tip`    | `(tipper: Address, post_id: u64, token: Address, amount: i128)` | `tipper` |

---

## Community Pools

| Function                | Signature                                                                                 | Auth               |
| ----------------------- | ----------------------------------------------------------------------------------------- | ------------------ |
| `create_pool`           | `(admin: Address, pool_id: Symbol, token: Address, admins: Vec<Address>, threshold: u32)` | `admin`            |
| `pool_deposit`          | `(depositor: Address, pool_id: Symbol, token: Address, amount: i128)`                     | `depositor`        |
| `pool_withdraw`         | `(signers: Vec<Address>, pool_id: Symbol, amount: i128, recipient: Address)`              | `signers` (M-of-N) |
| `add_pool_admin`        | `(signers: Vec<Address>, pool_id: Symbol, new_admin: Address)`                            | `signers` (M-of-N) |
| `remove_pool_admin`     | `(signers: Vec<Address>, pool_id: Symbol, admin: Address)`                                | `signers` (M-of-N) |
| `update_pool_threshold` | `(signers: Vec<Address>, pool_id: Symbol, threshold: u32)`                                | `signers` (M-of-N) |
| `get_pool_admins`       | `(pool_id: Symbol) → Vec<Address>`                                                        | —                  |

---

## Governance

| Function           | Signature                                                                                     | Auth        |
| ------------------ | --------------------------------------------------------------------------------------------- | ----------- |
| `gov_init_config`  | `(vote_window: u32, timelock: u32, quorum_bps: u32, decay_bps: u32, floor_bps: u32)`          | admin       |
| `gov_propose`      | `(proposer: Address, parameter: GovParameter, value: u32, description: Option<String>) → u64` | `proposer`  |
| `gov_vote`         | `(voter: Address, proposal_id: u64, support: bool)`                                           | `voter`     |
| `gov_execute`      | `(proposal_id: u64)`                                                                          | —           |
| `gov_veto`         | `(signers: Vec<Address>, proposal_id: u64)`                                                   | pool M-of-N |
| `gov_proposal_get` | `(proposal_id: u64) → Option<GovProposal>`                                                    | —           |

### GovParameter values

`FeeBps` · `TipCooldownWindow` · `ModerationSlashBps` · `TreasuryAddress`

---

## Moderation

| Function           | Signature                                                                                        | Auth             |
| ------------------ | ------------------------------------------------------------------------------------------------ | ---------------- |
| `report_post`      | `(reporter: Address, post_id: u64, token: Address, stake_amount: i128, reason_hash: BytesN<32>)` | `reporter`       |
| `review_report`    | `(signers: Vec<Address>, post_id: u64, reporter: Address, verdict: ReportStatus)`                | mods pool M-of-N |
| `get_report`       | `(post_id: u64, reporter: Address) → Option<Report>`                                             | —                |
| `get_report_count` | `(post_id: u64) → u32`                                                                           | —                |

### Verdicts

- `Upheld` — post deleted, stake refunded to reporter, author slashed if `moderation_slash_bps > 0` and allowance exists.
- `Dismissed` — stake sent to treasury.

---

## Storage Rent

| Function                | Signature                                       | Auth   |
| ----------------------- | ----------------------------------------------- | ------ |
| `pay_rent`              | `(user: Address, token: Address, amount: i128)` | `user` |
| `get_rent_expiry`       | `(user: Address) → u32`                         | —      |
| `set_rent_rate_bps`     | `(rate: u32)`                                   | admin  |
| `get_rent_rate_bps`     | `() → u32`                                      | —      |
| `batch_bump_user_graph` | `(user: Address) → u32`                         | admin  |

---

## Admin

| Function                  | Signature                     | Auth  |
| ------------------------- | ----------------------------- | ----- |
| `set_fee`                 | `(fee_bps: u32)`              | admin |
| `set_treasury`            | `(treasury: Address)`         | admin |
| `set_tip_cooldown_window` | `(window: u32)`               | admin |
| `upgrade`                 | `(new_wasm_hash: BytesN<32>)` | admin |

---

## Analytics Oracle

| Function                       | Signature                                                                                                           | Auth  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----- |
| `register_oracle`              | `(name: Symbol, pubkey: BytesN<32>)`                                                                                | admin |
| `verify_analytics_attestation` | `(oracle: Symbol, report_cbor: Bytes, signature: BytesN<64>, creator: Address, window_start: u64, window_end: u64)` | —     |

---

## Events

See [`packages/contracts/contracts/linkora-contracts/EVENTS.md`](../packages/contracts/contracts/linkora-contracts/EVENTS.md) for the full event schema.
