# Arbor surfaces

Use `/arbor` for the current research selector or launch card. `/arbor start` asks only for missing consequential configuration, confirms the resolved scope/evaluation/model/limits and submits through normal Fabric policy. Existing explicit JSON start requests remain supported. Commands default to the current run and provide candidate/review selection. An explicit run remains supported for reproducibility.

Four facade operations are `arbor.start`, `arbor.inspect`, `arbor.control`, `arbor.export`. Six deterministic owner operations are `arbor.propose`, `arbor.dispatch`, `arbor.collect`, `arbor.evaluate`, `arbor.distill`, `arbor.decide`. The coordinator returns proposals, never calls these mutations. Narrow review/source/recovery/research/scaffold operations retain their existing separate risk classes.

Read exact effective schemas with `tools.describe` before programmatic calls. The [action manifest](../../../docs/pr3-action-manifest.json) owns refs, schemas, command mappings, callers, risks and effects. Start/resume compose execute-risk `arbor.runResearch` when research is selected. Review uses an actual owning-Pi dialog, not a caller approval flag.

Native participant topology, status, full logs and operational controls belong to `/fabric`, `/fabric log`, `/fabric chat` and documented public `agents.*` reads. Arbor shows research facts and native references, not another participant registry. A native stop acknowledgment alone is not Arbor cleanup completion.

The standalone CLI is strictly read-only:

```text
pi-fabric-arbor inspect --state <existing-state-directory> --run <run>
pi-fabric-arbor replay --state <existing-state-directory> --run <run>
pi-fabric-arbor artifact --state <existing-state-directory> --run <run> --id <existing-artifact>
pi-fabric-arbor inspect --file <existing-file>
pi-fabric-arbor replay --file <existing-jsonl>
pi-fabric-arbor artifact --root <existing-root> --path <existing-relative-file>
pi-fabric-arbor availability
pi-fabric-arbor assets
pi-fabric-arbor asset <asset-id>
```

`--state` reads the exact current SQLite revision without creating it. File reads are explicitly existing artifacts, not a promise of current state. Replay shows saved research events, not reconstructed historical workspaces. There is no attached/offline write mode or serve command.

`/arbor browser` starts a conventional read-only listener in the owning Pi session. It closes at session shutdown/reload. Browser tree/evidence/diff/log-summary/SSE/replay and existing-artifact requests never control or answer review and never generate exports. Only `/arbor export [run] [json|report|trajectory]` generates derived artifacts. Source artifact readers cannot forward remote provider calls.
