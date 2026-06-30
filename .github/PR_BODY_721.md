# test(contracts): verify update_pool_threshold rejects threshold of zero (#721)

> Issue #721 requested a test verifying that `update_pool_threshold` rejects
> `threshold = 0` and that the call panics with `"threshold must be positive"`.

## Summary

This PR adds **two tests** to `packages/contracts/contracts/linkora-contracts/src/test.rs`
that pin down the contract's input-validation behaviour for `update_pool_threshold`:

1. `test_update_pool_threshold_zero_panics` — the literal test from the issue
   body. Verifies that `update_pool_threshold(..., &0)` panics with the
   exact message `"threshold must be positive"`.
2. `test_update_pool_threshold_zero_does_not_mutate_pool_threshold` —
   strengthens coverage by also pinning the **storage invariant** behind
   the panic: `pool.threshold` must remain at the last successfully
   written value after the rejected `&0` call, regardless of Soroban's
   transaction-rollback semantics.

No contract logic, types, events, storage keys, or compile-time config
were touched. Behavioural diff: **zero**.

## Motivation & Context

- **Issue:** [#721](https://github.com/Epta-Node/Linkora-social/issues/721)
  — `test(contracts): verify update_pool_threshold rejects threshold of
  zero` — *Call `update_pool_threshold` with threshold 0. Verify it
  panics with 'threshold must be positive'.*
- **Background:** The contract **does** enforce this invariant today.
  The guard at line 1599 of `packages/contracts/contracts/linkora-contracts/src/lib.rs`:

  ```rust
  pub fn update_pool_threshold(env: Env, signers: Vec<Address>, pool_id: Symbol, threshold: u32) {
      Self::bump_instance(&env);
      assert!(threshold > 0, "threshold must be positive");
      ...
  ```

  No regression test exists today. This PR adds one (and a storage-invariance
  companion test) to lock the behaviour in.
- **Scope:** Test-only change to a single file.

## Tests Added

### File touched

`packages/contracts/contracts/linkora-contracts/src/test.rs` — two new
tests inserted directly after `test_pool_threshold_updated_event` and
before the existing `// ── Issue #124: delete_post …` section header.

### Test 1 — `test_update_pool_threshold_zero_panics` (literal issue test)

```rust
#[test]
#[should_panic(expected = "threshold must be positive")]
fn test_update_pool_threshold_zero_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin, _) = setup_contract(&env);

    let pool_admin1 = Address::generate(&env);
    let pool_admin2 = Address::generate(&env);
    let token = setup_token(&env, &pool_admin1);

    let pool_id = symbol_short!("p721a");
    // 2-of-2 pool: provides enough valid signers that any panic observed
    // must originate from the threshold-positivity assertion, not from
    // the (later) "insufficient signers" or "unauthorized signer" checks.
    client.create_pool(
        &admin,
        &pool_id,
        &token,
        &vec![&env, pool_admin1.clone(), pool_admin2.clone()],
        &2,
    );

    // The 0-threshold call must panic with "threshold must be positive".
    client.update_pool_threshold(
        &vec![&env, pool_admin1.clone(), pool_admin2.clone()],
        &pool_id,
        &0,
    );
}
```

This is the exact test requested in issue #721. The 2-of-2 pool
configuration is intentional: it gives the call enough legitimate
signers to reach the threshold assertion, so any panic observed is
guaranteed to be the one from `assert!(threshold > 0, "threshold must
be positive")` and not from a later signer check.

### Test 2 — `test_update_pool_threshold_zero_does_not_mutate_pool_threshold`

```rust
#[test]
fn test_update_pool_threshold_zero_does_not_mutate_pool_threshold() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin, _) = setup_contract(&env);

    let pool_admin1 = Address::generate(&env);
    let pool_admin2 = Address::generate(&env);
    let token = setup_token(&env, &pool_admin1);

    let pool_id = symbol_short!("p721b");
    client.create_pool(
        &admin,
        &pool_id,
        &token,
        &vec![&env, pool_admin1.clone(), pool_admin2.clone()],
        &2,
    );

    // Establish a known-good, non-zero threshold of 1 first.
    client.update_pool_threshold(
        &vec![&env, pool_admin1.clone(), pool_admin2.clone()],
        &pool_id,
        &1,
    );
    assert_eq!(
        client.get_pool(&pool_id).unwrap().threshold,
        1,
        "sanity: happy-path update must succeed"
    );

    // Rejected zero call: must return Err (no panic aborting the test).
    let result = client.try_update_pool_threshold(
        &vec![&env, pool_admin1.clone(), pool_admin2.clone()],
        &pool_id,
        &0,
    );
    assert!(
        result.is_err(),
        "update_pool_threshold(.., threshold=0) must return Err"
    );

    // The previously stored threshold must still be 1.
    let pool_after = client.get_pool(&pool_id).unwrap();
    assert_eq!(
        pool_after.threshold, 1,
        "pool.threshold must remain at the last successfully written value (1) \
         after the rejected 0 call"
    );
}
```

This test pins down the storage invariant behind the panic. The
function order in `update_pool_threshold` is:

1. `bump_instance` (touches only instance TTL — not `pool.threshold`)
2. `assert!(threshold > 0, "threshold must be positive")` — panics
   on `threshold = 0`
3. read pool from storage
4. "insufficient signers" check
5. write new threshold

Because step 2 fires before step 5, the stored threshold must remain
at the last successfully written value after step 2 panics. Soroban's
transaction-level rollback also guarantees this, but the explicit
post-call read assertion protects against future re-orderings in which
someone moves the `assert!` after a storage write or relaxes it.

The `try_update_pool_threshold` (auto-generated by the Soroban client
for every public method) is used so the test can inspect the pool state
**after** the rejected call without aborting the test on the panic —
the same pattern used elsewhere in this file (`try_tip`, `try_follow`,
`try_initialize`).

### Why two tests instead of one?

The literal wording of the issue is satisfied by Test 1 alone. Test 2
is added because the contract's input-validation logic has a
documented, easily-broken invariant ("the assert! fires before any
storage write") that no existing test covers. Test 2 locks that
invariant in alongside Test 1.

The same split was used for similar recent issues:

- #715 (`set_tip_cooldown_window` rejects zero) — two tests
- #722 (`block_user` prevents tipping) — three tests
- #713 (`pool_withdraw` requires minimum threshold signers) — one test

For #721, **two** tests is the proportionate coverage — one for the
literal panic, one for the related storage invariant. Test 1 matches the
issue body 1:1; Test 2 strengthens it without scope creep.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [x] Tests (added test coverage)
- [ ] Contract change (logic, storage, or API)
- [ ] Documentation update
- [ ] Refactor / chore

## Testing Done

The new tests follow the exact conventions used in the surrounding pool
tests in the same file (`test_pool_threshold_updated_event`, `test_pool_withdraw_*`,
`test_pool_admin_*`):

- `env.mock_all_auths()` to bypass Stellar auth signatures (required
  because `update_pool_threshold` calls `signer.require_auth()` for each
  signer, and `create_pool` calls `admin.require_auth()`).
- `setup_contract(&env)` to register the contract and `initialize` it
  with a fresh admin/treasury (using the helper that already exists at
  the top of the file).
- `setup_token(&env, &pool_admin1)` to register a Stellar asset
  contract (required by `create_pool`).
- `client.try_*` — the Soroban-client auto-generated `Result`-returning
  form of public contract methods — to inspect post-state after a
  rejected call without aborting the test.
- `#[should_panic(expected = "threshold must be positive")]` for the
  literal panic assertion (mirrors how `test_set_tip_cooldown_window_zero_panics`
  handles the issue #715 equivalent).

**Pool IDs used.** The two tests use distinct `symbol_short!` pool IDs
(`"p721a"`, `"p721b"`) to guarantee independence — Soroban's test
`Env` is fresh per `#[test]`, but explicit IDs also protect against
any snapshot/share-state interactions in the future.

**Local validation status.** Rust's `cargo` is not installed in the
dev container that opened this PR, so `cargo test -p linkora-contracts`
was not run locally — the same constraint that applied to PR #722.
The CI workflow `ci.yml` will execute the test suite on the PR. The
code is reviewed against the existing function source
(`packages/contracts/contracts/linkora-contracts/src/lib.rs` line 1597)
and against the established patterns in the same test file
(`test_set_tip_cooldown_window_zero_panics`, `test_pool_withdraw_*`,
`test_tip_block_*`).

- [ ] `cargo test` passes — **to be verified in CI** (see comment above).
- [x] New tests added for changed behaviour — two new tests, one
      matches the issue body verbatim and one strengthens the related
      storage invariant.
- [ ] Manually verified on Testnet — **N/A** (no on-chain behaviour
      changed; pure test-only diff).

## Files Touched

| File                                          | Change                              | Lines |
|-----------------------------------------------|-------------------------------------|-------|
| `packages/contracts/contracts/linkora-contracts/src/test.rs` | Added 2 new tests + section comment | ~115  |

No other files were modified.

## Visibility

The two new tests are listed adjacent to `test_pool_threshold_updated_event`,
which is the immediately-related existing pool test for the same
function. Anyone scanning the pool section of `test.rs` will see the
new tests as a single group with their purpose documented in the
section comment above them.

## Checklist

- [x] Changes are focused — one concern per PR (input validation of
      `update_pool_threshold`).
- [x] If a contract function was added or changed, the README API
      table is updated — **N/A** (test-only).
- [x] No unresolved merge conflicts.
- [x] No secrets or private keys committed.
- [x] Commit message follows Conventional Commits
      (`test(contracts): verify update_pool_threshold rejects threshold of zero`).
- [x] Branched from `main`.

## Related Issue

Closes #721

## Out of scope (followups, intentionally left for separate PRs)

- Adding companion tests for `create_pool`'s `invalid threshold` guard
  (which already covers `0 < threshold <= admins.len()` at pool
  creation time using the existing `"invalid threshold"` panic
  message). Could be hardened similarly as a follow-up.
- Adding a test that verifies the additive behaviour between the two
  guards: i.e., that a *valid* `update_pool_threshold` (e.g.,
  `threshold = 2 → threshold = 1`) still succeeds and emits
  `PoolThresholdUpdatedEvent` — already covered by the existing
  `test_pool_threshold_updated_event`.
- Snapshot/component tests generated by the soroban-sdk test framework
  (`test_snapshots/test/test_update_pool_threshold_*.1.json`) will be
  auto-produced on the first CI test run and committed in a followup
  if needed.
