# Source-only installation and availability

Pi packages execute with the user's OS authority. Review source before installation. The package requires Node 24+, peer `pi-fabric >=0.83.0 <0.84.0` and runtime `tsx@4.23.13`. Observed tests use Node 26.7.0, Pi 0.85.1 and Fabric 0.83.0.

## Install and configure

```sh
pi install /absolute/path/to/pi-fabric-arbor
# After publication: pi install npm:pi-fabric-arbor@0.1.0
pi list
pi config
```

Use `-l` for project scope in a trusted project. Enable both package extensions in Pi. Registration is passive; it declares the `arbor` component but creates no actor or database. No build/prepack compilation or certificates are required.

```text
/arbor availability
/arbor setup
/reload
/arbor doctor
```

Setup atomically merges one enabled `{id:"arbor", component:"arbor"}` entry into the project's `.pi/fabric.json`. It preserves unrelated entries, inherits global component entries when no project array exists, and refuses duplicate/conflicting Arbor bindings. Default `stateDirectory` is beneath the active Pi profile's `arbor/<project-path-hash>/v2/`, not inside candidate material. Existing configured storage is preserved. No research starts.

Setup does not change agent, mesh, trust, Schema or approval policy. Enable native agents and project actors explicitly through Fabric configuration. Schema enforce blocks this delegation path; Arbor never silently downgrades it.

Doctor distinguishes installed, configured, enabled, observed capabilities and tested behavior. Global/project values are configuration facts, not proof of effective runtime policy. Missing exact refs, waiting/failed owner lifecycle and disabled policies have actionable blockers. An active component can still have disabled runtime execution: Fabric 0.83.0 retains agent descriptors when `agents.enabled` is false. Doctor is not an inference test.

## PR2 owner-only execution surface

After activation, inspect schemas in the owning Pi Fabric session:

```ts
await tools.describe({ ref: "arbor.start" });
await components.status({ id: "arbor.owner" });
```

| Ref | Caller | Risk / effect |
|---|---|---|
| `arbor.start` | Live intrinsic owning Pi root | agent / ordered emission |
| `arbor.cancel` | Same recorded native root/host/identity | agent / ordered emission |
| `arbor.inspect` | Read-only committed provider caller | read / none |

`start` accepts a closed object with required `runId`, `materialId`, canonical Git `cwd`, exact `oid`, `policyId` and `objective`; optional `model` must be an exact available `provider/id`, otherwise the active Pi model is recorded. `maxWaves` and `concurrency` each default to 1 and allow only 1 or 2. This is a bounded inspect-only execution contract, not the future PR3 research specification or a scoring/review API. The generation retains at most 128 bindings.

Workers have only native read/grep/find/ls tools, no recursion and no extensions, so Arbor/Fabric refs are absent. Their model must work without extension registration, such as a built-in or `models.json` provider. Extension-only model availability in Main is not proof of worker availability; failures remain failed execution, never scores. The coordinator uses a closed `agents.self` commitment and cannot resolve Arbor mutation or worker-dispatch refs.

```ts
// Explicitly chosen, existing material and policy only; do not copy placeholders.
await tools.call({ ref: "arbor.start", args: {
  runId: "inspection-1", materialId: "chosen-material",
  cwd: "/canonical/chosen/git-material", oid: "<exact HEAD OID>",
  policyId: "inspect-only-v1", objective: "Inspect this fixed material"
} });
await tools.call({ ref: "arbor.inspect", args: { runId: "inspection-1" } });
```

Repeated identical starts in one generation return the same binding, without another actor. A replacement generation or another native root is blocked pending explicit reconciliation; PR2 provides no automatic resume/adoption. Cleanup uncertainty, including a revoked unreturned create handle, retains dispatch provenance as `cleanup_pending`. Never treat a queued/remote stop as local completion or delete retained evidence to clear it.

## Read-only surfaces and updates

`/arbor availability` and `/arbor assets` remain available; `/arbor start` directs callers to the owning Fabric provider rather than executing a separate command path. Exactly one `/skill:fabric-arbor` is packaged. Roles and conditional references are internal assets, not additional skills or agents.

The standalone CLI only supports availability/assets/asset and bounded existing-file inspect/replay/artifact retrieval. It cannot setup, attach, start, control, review, apply/undo or generate exports. Browser assets remain static and read-only, with no server.

Reload source updates with `/reload`. `npm run check` runs package/install, retained source and managed tests with no emitted files; `npm run test:pr2:e2e` runs the separate real-host lane. See [PR2 evidence](pr2-managed-owner-evidence.md) for observed and unverified boundaries. Full research, operational role assembly and resume remain later PRs, not legacy v1 compatibility routes.

Remove registration with `pi remove npm:pi-fabric-arbor` (or `-l` for project scope). Removal does not authorize deletion of user databases, reports, artifacts, keys, workspaces or certification evidence.
