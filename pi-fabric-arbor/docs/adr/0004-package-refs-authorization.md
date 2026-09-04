# ADR 0004: Package refs, authorization, and publication

Status: Implemented and locally certified for Phase 5; current-host B1 is separately admitted

## Decision

The only v1 promotion destination is `refs/pi-fabric-arbor/<run-id>/winner`. Promotion and rollback must use expected-OID CAS, never check out the destination, and never move a user-owned ref. User-ref publication is disabled.

Promotion must bind the actual detached merge-candidate OID, same-epoch held-out baseline and candidate certificates, contract digest, winner ref, expected current OID, principal, expiry, and one-time nonce. Rollback binds the journaled predecessor and requires a separate authorization. Re-promotion requires a fresh authorization and Fabric policy traversal.

The browser can append a promotion or rollback request and display redacted status only. It cannot read the nonce/private key, issue signatures, invoke Git, or satisfy Fabric policy. `pi-fabric-arbor authorize promotion|rollback` verifies the current OS UID against an owner-only trusted-principal registry, displays a bounded frozen challenge on the local TTY, requires explicit confirmation, signs canonical bytes with an owner-only Ed25519 key, and stores the one-time authorization through `ArborApplication`.

## Fail-closed behavior

`PromotionGitIntegrator` constructs detached trees in the package private repository and mutates only the package winner ref using exact old/new OID CAS. The application journals pre-observation, planned mutation, apply result, and post-observation. Stale, conflicting, or unobservable state cannot be inferred as success and quarantines when needed. Promotion is disabled unless active B7, B8, and Phase 5 evidence validate. Current-host B1 admission does not replace those gates or turn the local Phase 5 certificate into model-backed promotion evidence.
