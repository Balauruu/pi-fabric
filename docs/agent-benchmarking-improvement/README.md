# Agent benchmarking improvement review

## Recommendation

Keep experiment policy behind a small **design / run-or-resume / inspect** interface. Fabric remains the sole agent runtime. Improve task contracts, grading and reporting immediately; add throughput through a supported registered-workflow entry and verified effective execution allowances, not Python launchers or model-authored wrappers.

This is a plan, not an implementation or a verdict on the recent comparison.

## Contents

- [Findings](findings.md): ten requested issues and seven additional findings, with evidence, severity, ownership, alternatives and uncertainty.
- [Target architecture](architecture.md): native integration, lifecycle, budgets, grading, evidence and compatibility.
- [Implementation plan](implementation-plan.md): ordered work packages, likely files, acceptance, recovery, documentation and rollback.
- [Validation matrix](validation-matrix.md): test cases and release gates.
- [Evidence](evidence.md): bounded operational observations, local tests and reproducible defect probes.

## Scope and method

Root: `/home/balauru/.pi-profiles/fabric`. Reviewed `skills/agent-benchmarking/`, relevant installed public Fabric documentation/contracts under `npm/node_modules/pi-fabric/`, and decisive records in `benchmarks/fabric-research-prompt-screen-20260906/`.

No blacklisted-profile access, paid agents, model fits, benchmark dispatch, package installation, implementation edits or historical repair. Fake-dispatch probes used disposable temporary directories. Historical report inspection preserved all 148 entries, bytes and mtimes. Existing unrelated changes were not modified. The installed runtime is a distribution without its upstream source/test tree; proposed upstream paths are likely owners, not files available for editing here.

Read profile guidance, the benchmarking skill and method references, skill-design guidance, Pi's skill-loading contract, and Fabric agent/workflow/configuration/provider/component/audit documentation. Fovea supplied a bounded skill silhouette; decisive claims use source and saved records, not graph edges. No agent workers were used because paid calls are prohibited.

## Acceptance ledger

Review acceptance means evidence and a testable plan, not delivery of the proposed feature.

| Lead | Review outcome | Finding / work package |
| --- | --- | --- |
| 1. Serialization | Guest cap verified; recent design also explicitly selected concurrency 1. Runtime scope distinguished from experiment policy. | F01; WP4-WP5, WP8 |
| 2. Grading cost/coverage | 12 calls to one identity; supported objective path works; pairwise is helper-only. Choices/formulas specified. | F02, F11; WP2, WP6-WP7 |
| 3. Readable measurements | JSON-dump renderer confirmed; deterministic summary and measurement guide specified. | F03, F13; WP3 |
| 4. Task/rubric divergence | Authoring mismatch and missing runner safeguard verified. | F04; WP2 |
| 5. Blinded context | Ordinary projection omits task and outcome definition. | F05; WP2 |
| 6. Citation verification | No-tools judge lacks source evidence; appearance is not factual validation. | F06; WP2, WP6 |
| 7. Calibration | Examples transported; evaluator performance not measured by lifecycle. | F07; WP6-WP7 |
| 8. Skill exposure | Observer unsupported; one successful load observed, not run-wide compliance. Delegation restricted. | F08, F16; WP2, WP6 |
| 9. Public run/resume | Exact-source procedure verified; reported eval failure not established by inspected files. Public entry proposed upstream. | F09; WP4 |
| 10. Progress/capabilities | Counts exclude grading; capability/documentation gaps identified. | F10; WP1, WP3, WP5 |
| Additional correctness | Objective producers, guard non-enforcement, timing, JSON semantics, offline stopping, tool policy and persistence barriers. | F11-F17 |
| Preservation | Frozen inputs/design, atomic create-only records, native evidence, failure retention, read-only reports and ambiguity refusal retained. | All packages; validation matrix |

## Release sequence

1. **R1, smallest useful release:** truthful preflight, objective correctness fixes, shared task/judge contract and preview, role progress, deterministic readable reports. Preserve one-call dispatch until throughput prerequisites exist.
2. **R2, native throughput:** Fabric registered-workflow entry and effective allowance contract, then work-conserving independent execution/judges with immediate persistence and conservative resume.
3. **R3, selected extensions:** measured calibration, runner-owned outcome checks, pairwise/batched grading, resource scheduling, native provider-rate/descendant enforcement where required, and operational sequential stopping.

Existing scientific validation failures remain open. Configured/schema-present/helper-tested behavior is not the same as live supported behavior.

## Highest priorities and unresolved choices

- Fix lost task context and unannounced grading requirements before further model-graded comparisons.
- Fix exact-JSON/schema validation; refuse unwired objective methods before dispatch.
- Make token/cost semantics honest: currently these do not stop subsequent admission at a threshold.
- Ship explanatory reports and role counts without a model call.
- Do not raise the guest cap by guessing host capacity; resolve a small public Fabric integration first.

Recommended defaults: deterministic grading where valid, otherwise one frozen pointwise evaluator; separate measurement/grading for latency studies; stateless concurrency unless independence is declared and supported. Pairwise preference is a different estimand. Calibration thresholds, practical margins, contention policy and hard versus observational budgets remain explicit author choices. Architecture records options and recommendations.
