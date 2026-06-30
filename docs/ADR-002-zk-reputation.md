# ADR-002: ZK-Compatible Credential Reputation

## Status

Accepted

## Context

Profiles currently store a `creator_token` address, but that does not let a creator prove reputation, tier membership, or off-chain credentials such as "verified journalist" or "KYC'd investor" without publishing the underlying data on-chain.

This ADR adds a privacy-preserving credential commitment layer. The contract stores only the current Merkle root for each user and verifies inclusion proofs for selected credentials.

## Design

Each credential is represented off-chain as:

```text
leaf = sha256(credential_type || credential_value || salt)
```

The `credential_type` names the claim class, such as `verified_journalist`. The `credential_value` is the underlying value, such as an issuer id or credential id. The `salt` is high-entropy random data known only to the credential holder and trusted issuer. The salt prevents dictionary attacks against common credential values.

Credential leaves are placed into a binary Merkle tree. Branches are constructed as:

```text
branch = sha256(left || right)
```

For contract and SDK portability, sibling pairs are sorted lexicographically before hashing. This lets a proof be represented as `Vec<BytesN<32>>` without exposing or encoding direction bits.

Odd-width tree levels duplicate the final node. A single-leaf tree has the leaf as its root.

## Proof Generation

A prover builds the tree locally from their credential leaf set, stores the root on-chain, and later selects one credential leaf to disclose. The prover sends:

- the selected `leaf`
- the Merkle `proof` containing only sibling hashes on the selected path
- a one-time `nullifier`

The verifier recomputes the path using SHA-256 and compares the computed root to `StorageKey::CredentialRoot(user)`. Non-selected leaves are not revealed; only their hashes along the selected path are visible.

The nullifier is stored under `StorageKey::NullifierSet(user, nullifier)` after a successful proof, which prevents replay of the same credential proof in workflows that require one-time use.

## Why Native Soroban Crypto Is Enough

This design proves membership in a committed set, not arbitrary private computation. Soroban's `env.crypto().sha256()` is sufficient because the contract only needs to recompute deterministic hashes and compare the result to a stored root.

A full zero-knowledge circuit would be useful if the claim required hidden predicates such as "age is over 18" without revealing a birthdate, or "balance exceeds a threshold" without revealing a balance. For this phase, the private data is already committed into salted leaves off-chain and the contract verifies inclusion of a selected commitment.

## Alternatives

Semaphore-style identity groups provide nullifiers and group membership proofs, but they require proving systems and verifier contracts that are heavier than this requirement and not native to Soroban today.

Noir circuits can express richer private predicates, but they require circuit compilation, proof generation infrastructure, and verifier integration. That is out of scope until Soroban has a well-supported verifier stack and the product requires predicates beyond set inclusion.

## Attack Vectors

Forged proofs are rejected because a prover cannot produce a valid path to a stored root without knowing the correct sibling hashes for that credential set, assuming SHA-256 second-preimage resistance.

Replay of valid proofs is mitigated by per-user nullifiers. A successful proof consumes `StorageKey::NullifierSet(user, nullifier)`, and later attempts with the same nullifier return `false`.

Replay across users is prevented by checking the proof against `StorageKey::CredentialRoot(user)` and storing nullifiers under the user address. A proof for one user's root does not verify against another user's root unless both users deliberately publish the same root.

Front-running of root updates is mitigated by requiring the profile owner's Soroban authorization for `update_credential_root`. The update message includes the ledger sequence in the signed digest design so clients can bind updates to a recent ledger when raw Ed25519 account-key verification is available. The contract also emits `CredentialRootUpdatedEvent` so indexers can audit unexpected root changes.

Credential dictionary attacks are mitigated by requiring high-entropy salts in leaves. Without salts, common credential values could be guessed and hashed off-chain.

## Consequences

This approach is simple to verify on-chain, works with Soroban's native cryptography, and keeps credential contents off-chain. It does not provide arbitrary private predicate proofs; future ADRs can layer a proving system on top if Soroban verifier support matures.
