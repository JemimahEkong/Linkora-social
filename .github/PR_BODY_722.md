# test(contracts): strengthen block_user tip-prevention coverage (#722)

> Issue #722 requested a test verifying that `block_user` prevents a tipper
> from tipping the author's post and that the call panics with `"blocked"`.

## Summary

The repository already contains `test_tip_blocked_by_author` (lines 449–474
of `packages/contracts/contracts/linkora-contracts/src/test.rs`) which
exactly satisfies the literal wording of issue #722:
*Author A blocks tipper B → B's tip panics with `"blocked"`.* Rather than
duplicate that test, this PR adds **three additional tests** that pin down
the surrounding invariants and edge cases the original test does not
directly assert. Together the four tests form a thorough net around the
`tip` ↔ `block_user` interaction.

All changes are confined to a single file and add no contract logic.

## Motivation & Context

- **Issue:** [#722](https://github.com/Epta-Node/Linkora-social/issues/722)
  — `test(contracts): verify block_user prevents tipper from tipping
  author's post` — *Author A blocks tipper B. B attempts to tip A's post.
  Verify the call panics with 'blocked'.*
- **Background:** The base test (`test_tip_blocked_by_author`) covers the
  one literal scenario in the issue. The three new tests below pin down
  related invariants that the contract implicitly relies on but that no
  existing test asserts directly.
- **Scope:** Test-only change to `test.rs`. No contract logic, no types, no
  events, no storage keys, no compile-time config are touched.
  Behavioural diff: **zero**.

## Tests Added

### New file
`packages/contracts/contracts/linkora-contracts/src/test.rs` — three tests
inserted directly after `test_tip_non_blocked_user` and before the
existing `test_profile_count` test:

| # | Test | What it pins down |
|---|------|-------------------|
| A | `test_tip_block_preserves_no_state_changes_on_panic` | blocked tip must leave no half-committed state and must NOT consume the per-(post, tipper) cooldown |
| B | `test_tip_block_is_unidirectional_blocker_can_still_tip_blocked` | if A blocks B, the block is unidirectional: A can still tip B's posts and B still receives tip income |
| C | `test_tip_block_multiple_blocked_tippers_panic_independently` | multiple addresses on the same author's block list each panic independently; an unrelated unblocked tipper still succeeds and pays the fee |

### Detail per test

**Test A — *No half-committed state & no cooldown burn***

Wraps the existing panic behaviour in a richer assertion set:

1. Sets up: contract initialized, author creates a post, author `block_user`s
   the tipper.
2. Snapshots tipper / author / treasury balances and `post.tip_total` *before*
   the blocked attempt.
3. Calls `client.try_tip(&tipper, &post_id, &token, &1_000)` — must return
   `Err`.
4. Asserts **nothing changed**: all three balances are unchanged,
   `post.tip_total` is unchanged, and the blocked relationship still holds
   (so the block map wasn't corrupted by the failed call).
5. **Critical invariant** — the only one test_tip_after_unblock implicitly
   relies on: a blocked attempt must not burn the per-(post, tipper)
   cooldown. Verified end-to-end by `unblock_user` then a fresh
   `tip(&tipper, &post_id, &token, &1)` on the same ledger. If the blocked
   attempt had written `StorageKey::TipCooldown`, the fresh tip would
   panic with `"tip cooldown not expired"` (default
   `TIP_COOLDOWN_LEDGERS = 17_280`).

The "block check happens before cooldown write" ordering in `fn tip`
(`packages/contracts/contracts/linkora-contracts/src/lib.rs` ~line 1330)
is what makes the existing `test_tip_after_unblock` and this new test
both pass. This is the most load-bearing invariant pinned down here.

**Test B — *Block must be unidirectional***

`A blocks B` (so B is restricted). Test asserts:

- `A` (the blocker) tips `B`'s post with `1_000` tokens.
- The tip **succeeds** because `is_blocked(post.author=B, tipper=A)`
  is `false` — `B` has not blocked anyone.
- Treasury receives `25` (2.5% fee on 1000).
- `B`'s balance increases by `975`.
- `post.tip_total` reaches `1_000`.

This catches an easy regression in which someone "tightens" the block
check into a symmetric predicate.

**Test C — *Multi-block isolation***

Two addresses (`blocked_a`, `blocked_b`) are independently blocked by the
same author. Test asserts:

- `client.try_tip(&blocked_a, …)` returns `Err`.
- `client.try_tip(&blocked_b, …)` returns `Err`.
- A third unblocked address tips `500` and only that tip is recorded
  (`post.tip_total == 500`).
- `blocked_a` and `blocked_b` balances are untouched.
- The unblocked tipper pays full tip; treasury receives the fee
  (`500 * 250 / 10_000 = 12` via i128 integer division); author receives
  `488`.

This catches overruns where the second `block_user` overwrites the
first, or where entries in the block map interact unexpectedly.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [x] Tests (added test coverage)
- [ ] Contract change (logic, storage, or API)
- [ ] Documentation update
- [ ] Refactor / chore

## Testing Done

The new tests follow the exact conventions used in the existing tip and
block tests in the same file:

- `env.mock_all_auths()` to bypass Stellar auth signatures (required
  because `tip` calls `tipper.require_auth()`).
- `setup_token(&env, &admin)` to register a Stellar asset contract and mint
  10 000 units to `admin`.
- `StellarAssetClient::new(&env, &token).mint(&addr, &amount)` to fund
  additional addresses beyond the default.
- `client.try_tip(...)` — the auto-generated `try_*` form exposed by the
  Soroban client — to capture failed calls as `Result<(), soroban_sdk::Error>`
  without aborting the test.
- Pre/post snapshot assertions to make state-change checks explicit
  rather than relying on Soroban's `try_*` rollback semanstics alone.

**Math used in the new assertions** (verified by hand):
- `1_000 * 250 / 10_000 = 25` fee — author receives `975` (Test B).
- `500 * 250 / 10_000 = 12` fee (i128 truncation) — author receives `488`
  (Test C).

These match what `test_tip_fee_split` (lines ~419) and `test_tip_after_unblock`
(lines ~478) already verify manually.

**Local validation status.** Rust is not installed in the dev container that
opened this PR, so `cargo test -p linkora-contracts` was not run locally.
The GitHub Actions `ci.yml` workflow (which runs `pnpm --filter contracts
test`) will execute the suite on the PR. The reviewer feedback applied to
this PR includes verification of the math, panic string
(`"blocked"`, `"tip cooldown not expired"`), and confirmation that no
existing test is duplicated.

- [ ] `cargo test` passes — **to be verified in CI** (see comment above).
- [x] New tests added for changed behaviour — three new tests significantly
  extend #722 coverage.
- [ ] Manually verified on Testnet — **N/A** (no on-chain behaviour changed).

## Files Touched

| File                                          | Change                              | Lines |
|-----------------------------------------------|-------------------------------------|-------|
| `packages/contracts/contracts/linkora-contracts/src/test.rs` | Added 3 new tests + section comment | ~190 |

No other files were modified.

## Visibility

The existing test `test_tip_blocked_by_author` (lines ~449) already
satisfies the literal wording of the issue and is the test most directly
referenced by `Closes #722`. The three tests added in this PR are listed
adjacent to it (lines ~533+) so anyone scanning the tip / block area of
`test.rs` will read the strengthened coverage as a single group.

## Checklist

- [x] Changes are focused — one concern per PR.
- [x] If a contract function was added or changed, the README API table is
      updated — **N/A** (test-only).
- [x] No unresolved merge conflicts.
- [x] No secrets or private keys committed.
- [x] Commit message follows Conventional Commits
      (`test(contracts): strengthen block_user tip-prevention coverage`).
- [x] Branched from `main`.

## Related Issue

Closes #722

## Out of scope (followups, intentionally left for separate PRs)

- Adding the existing `test_tip_after_unblock` (post-unblock success path)
  assertion to also verify cooldown logic was clean before the
  transition. Already covered by the new Test A in this PR.
- Snapshot/component tests generated by the soroban-sdk test framework
  (`test_snapshots/test/test_tip_block_*.1.json`) will be auto-produced
  on the first CI test run and committed in a followup if needed.
- Adding an analogous `test_follow_block_preserves_no_state_changes_on_panic`
  for the `follow` ↔ `block_user` interaction (the same shape of invariant
  applies, and `test_blocked_user_cannot_follow_blocker_no_relationship_created`
  already partially covers it).
