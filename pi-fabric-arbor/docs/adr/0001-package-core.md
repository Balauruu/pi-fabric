# ADR 0001: Package and core boundary

Status: Accepted through Phase 7 production admission and release hardening

## Decision

`pi-fabric-arbor` is a separately versioned, publishable ESM TypeScript package. It builds with `tsc`, requires Node 24 or newer, uses `node:test`, and declares the exact peer `pi-fabric@0.76.2`.

`ArborApplication` is the only owner of legal transitions. Providers, fixture drivers, Web inboxes, stores, and report publishers cannot directly choose domain state. Stores enforce revision, fence, and idempotency atomically and persist application decisions.

The package imports pi-fabric only from its public exports. Retained `0.76.2` and current-host evidence is valid only while every bound input remains exact. Production composition cannot assert a certification boolean. The graduated loader verifies all prior, release, and Phase 7 gates against the executing shipped bytes, exact configuration, and package-issued boundary decorators, then issues a process-local opaque admission bound by object identity to that adapter graph. `ArborApplication` rejects copied tokens, changed bindings, and direct production mode strings. The default extension publishes the real provider only after the graduated composition API succeeds; otherwise it publishes a blocked provider with exact reasons. Explicit fixture composition remains test-only.

`arbor.start` validates and persists a content-addressed contract only. It does not claim a lease, dispatch an agent, evaluate, write reports, or clean resources. An admitted driver consumes typed directives.

## Consequences

- Internal adapters can be replaced without exposing them to browser code.
- Fixture adapters are deterministic and labeled `fixture`; they are not production containment.
- Real child dispatch requires current-host B1 plus the independent B3/B5/B6 and phase-specific startup gates. No retained artifact can bypass another gate.
- Promotion and rollback planning consume separate one-time package authorizations. The actual apply operation must then traverse Fabric write policy and journal a distinct B9-bound host-call proof before any CAS; fixture proofs are explicitly non-production.
- Every terminal outcome creates complete-report debt centrally. Cleanup requires a published intent/dependency report before deletion and creates post-cleanup report debt.
