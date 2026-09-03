# External and runtime evidence

This package relies on installed primary contracts, not generic assumptions. The detailed declaration map is in the architecture reference; this file records the durable conclusions and transfer limits.

| Evidence | Verified conclusion | Transfer limit |
| --- | --- | --- |
| Pi 0.84.4 package manifest, skills documentation, RPC documentation, and agent-session implementation | Skill expansion is path-specific; exact-path canaries must distinguish expansion from literal prompt text. | Recheck after Pi, transport, or invocation-path changes. |
| Pi Fabric 0.75.0 public exports and generated guest declarations | `agents.run` returns the measurement-bearing result; `workflow.agent` is a lossy convenience projection. | Internal `dist` files are evidence only, never workflow imports. |
| Pi Fabric execution service and agent manager implementation | Guest checking precedes host-call setup; concurrency and depth controls are normalized; recursive managers do not provide a tree-global semaphore. | Implementation details may change without public API compatibility. |
| Pi Fabric budget and usage implementation | Direct `agents.run` calls bypass workflow helper token accounting; recursive/token/cost guards can overshoot. | Only a provider-side pre-consumption limit is a hard spend boundary. |
| Pi Fabric output/detail/trace bounds and historical v4/v7 captures | Large logs cannot safely transit bounded result channels. | Archive authorized native logs by validated absolute path and derive compact evidence locally. |
| Historical v13 execution receipt | The observed effective per-invocation ceiling was 100 agent calls despite a larger requested/package-level value. | Treat 100 as an observed compatibility bound, not a universal constant; probe and reserve headroom. |
| OpenTelemetry GenAI semantic conventions, Development status at the recorded research cutoff | Requested/resolved/observed identity and provider-native usage are useful vocabulary. | Development conventions do not establish provider billing semantics or require a collector. |

Compatibility claims are therefore narrow: only the pinned versions and canaried runner/provider path are supported. A version mismatch, absent stage API, recursive-cwd conflict, inaccessible absolute log, or unprovable call ceiling is an `unsupported` result before consequential mutation.
