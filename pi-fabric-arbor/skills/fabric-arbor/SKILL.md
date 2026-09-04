---
name: fabric-arbor
description: Set up, admit, and drive a bounded Arbor research run through pi-fabric when the package, components, actions, and exact certificates are available; otherwise explain the fail-closed blocker or use explicitly labeled fixtures.
---

# Fabric Arbor

## Setup and discovery

1. Do not assume `arbor.*` actions exist. Inspect Pi's installed packages and pi-fabric component/provider/action discovery first.
2. If the package is absent, stop and give the pinned `pi install` command from `docs/consumer-installation.md`. Do not install or activate it without the user's request.
3. Confirm the package extension and this skill are enabled at the intended global or project scope. Project-local resources require project trust and a Pi restart or reload.
4. Confirm `arbor-runtime` is configured and active. Configure `arbor-web` separately only when detached local monitoring is wanted.
5. Read the compatibility/admission result before any run. Require one exact supported release from the certified set `pi-fabric@0.76.2 || pi-fabric@0.77.0`, current B0-B12 and Phase 4-7 certificates, release/distribution/platform checks, package-issued boundary wrappers, and `realAgentsEnabled: true` for real work. The current certified host is `pi-fabric@0.77.0`; any other or drifted payload must remain blocked.
6. If actions are undiscovered or admission is blocked, report the exact blocker. Never invent an action call, relax a version, substitute an artifact root, or treat a fixture as production evidence.

## Run protocol

1. Read the run contract and display its immutable digest, metric direction, budgets, editable/protected paths, and trust limitations.
2. Call discovered `arbor.start` only to persist the contract. Do not imply that it starts workers or evaluators.
3. Claim the driver lease, retain the returned private fence outside browser-visible data, and follow one package-issued directive at a time.
4. Process browser intents only when the package reports a driver yield. A promotion request is not authorization.
5. Never substitute paths, commands, tools, scores, refs, handles, or containment identities into package-issued directives.
6. Stop on `WRITE_CONFINEMENT_UNAVAILABLE`, `UPSTREAM_CERTIFICATION_REQUIRED`, `COMPATIBILITY_CERTIFICATION_REQUIRED`, `INDETERMINATE`, or `QUARANTINED`. Do not bypass these outcomes.
7. Before retrying an external effect, reconcile it and require a proven absent or terminal outcome. Worker retry always creates a new attempt.
8. Build held-out baseline and candidate only from package-issued exact-OID detached-construction directives. Require exact same-policy certificates before promotion.
9. Treat browser promotion/rollback as requests only. Require a fresh owner-TTY signature and a separate Fabric-policy decision, then plan, apply, and observe exact-OID winner-ref CAS as distinct journaled steps. Never reuse an authorization or infer success from an unobservable ref.
10. Plan, publish, and observe a report as separate steps. Report fixture evidence as fixture-only, never certified production evidence. Current-host B1 admission and B7/B8/Phase 5 evidence remain independent and never upgrade one another.
11. Export only complete manifest-verified report generations. Apply retention and manifest-only cleanup after report coverage; uninstalling the Pi package must not delete user state.
