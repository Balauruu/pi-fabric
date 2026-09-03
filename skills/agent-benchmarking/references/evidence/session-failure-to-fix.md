# Session failure-to-fix ledger

Source packet: `/data/AI/PI/Fabric/benchmarks/fabric-research-actor-eval-2026-09-02`. The amendment decision records and final report were read as historical evidence. They describe failures of bespoke session workflows, not supported behavior of this package.

| Revision | Observed failure | Durable correction |
| --- | --- | --- |
| v2 | Fabric rejected recursive agents with a custom cwd. | Recursive parent requests omit `cwd`, start from Fabric's supported project root, and receive sealed absolute input/output paths. If the fixed runner cannot express that adaptation, return `unsupported`; never create replacement TypeScript. |
| v3 | Parent logs were not scanned for forbidden benchmark/profile access. | Require a deterministic allowlist scan of the complete native log before mechanism validity. |
| v4 | Absolute temporary Fabric logs were rejected; bounded transport and large-file parsing lost evidence. | Archive only validated absolute Fabric log paths with create-only copy; scan locally in pages and emit compact derivatives. Preserve failed terminals. |
| v5 | Evidence publication failed because destination parents were absent. | Create owned parent directories before create-only publication; directory creation is not evidence completion. |
| v6 | A free-form status equality rejected a truthful qualified pass. | Use typed statuses plus separate limitations/blockers, not prefix matching or prose status variants. |
| v7 | Multi-megabyte logs exceeded bounded Fabric result transport before mechanism extraction. | Keep raw captures outside model-visible/results channels; derive byte-bound compact mechanism evidence locally. |
| v8 | A stale non-actor variable crashed control finalization. | Exercise production-shaped actor and non-actor branches before scoring; mechanism evidence is total for every terminal. |
| v9 | Analyze assumed `mechanism.json` existed for every invalid attempt. | Represent missing mechanism evidence explicitly as invalid/missing and retain the row in all denominators. |
| v10 | Telemetry cache/cost semantics conflicted with strict normalization. | Preserve provider-native records, publish a versioned derivative, distinguish direct/inclusive/unknown scope, and never invent currency semantics. |
| v11 | Analyze wrote before creating its owned analysis directory. | Each stage prepares only its declared output parents before transactional publication. |
| v12 | Blind mapping omitted the required commit receipt and used unrooted validation paths. | Commit and verify the private map before public packets; resolve every path under the packet root. |
| v13 | The effective 100-call cap stopped adjudication, while null results were treated as complete. | Preplan bounded judge/adjudication batches below the observed cap, account globally, and require one terminal per planned call. |
| v14 | Final reconciliation omitted a required raw-seal receipt. | Finalize with zero model calls from a sealed stage closure; verify every revision-qualified receipt before publishing the report. |

The chain ended with a structurally reconciled but confounded benchmark. No amendment retroactively restored confirmatory validity, replayed a measured attempt, or erased protected-state mutations.
