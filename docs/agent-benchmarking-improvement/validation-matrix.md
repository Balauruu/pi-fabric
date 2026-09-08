# Validation matrix

This is a future implementation acceptance matrix, **not a claim these features passed**. Review-time observations are in [evidence](evidence.md). Use no-model local fixtures first. Paid native/evaluator calls and expensive scientific studies require separate authorization and must remain named as unrun until then.

Levels: **P** pure schema/policy/renderer; **L** local file lifecycle with injected native results; **N** real Fabric executor/queue with deterministic fake transport, no model backend; **A** separately authorized live acceptance. A Python fake reaching high concurrency is not N or A evidence.

| ID | Coverage / stimulus | Required observation | Owner / level |
| --- | --- | --- | --- |
| V01 | Minimal ordinary screen | Draft resolves with explicit defaults; no calibration/manifests/component/database needed for deterministic text; preview no mutation; supported grader zero judge calls | WP1-WP2; P/L |
| V02 | Exact JSON and embedded schemas | true differs from 1 recursively; duplicate keys/nonfinite/malformed JSON explicit; unsupported keyword such as multipleOf rejected before dispatch; valid supported schema succeeds | WP1; P/L |
| V03 | Command/final-state selection | Before producer release: zero-call unsupported. After: only runner-observed post-attempt evidence counts; pre-readiness/agent pass claims cannot grade outcome | WP1/WP6; L |
| V04 | Task/rubric alignment | Missing public quotation/format requirement detected; declared requirement delivered identically to each condition and grader; keys/private tests never leak to measured agents | WP2; P/L |
| V05 | Essential context and blinding | Original question, public requirements and selected references present; model/condition/cost/timing/order/prior-label sentinels absent; residual answer identity retained as limitation | WP2/WP6; P/L |
| V06 | Source verification evidence | Fabricated quote, duplicate URLs/underlying source, unsupported claim, stale date, missing reference and insufficient evidence distinguished; appearance-only mode never claims factual verification | WP2/WP6; P/L; A only for evaluator performance |
| V07 | Examples versus measured calibration | Examples-only reports uncalibrated; known-good/bad, isolated-defect, boundary, malformed, abstention matrix scores actual predictions; constant grader fails; holdout/case IDs frozen | WP6; P/L, then A if authorized |
| V08 | Evaluator identities, repetitions and samples | One config ×12 calls = one evaluator identity; sampled second grader follows seeded balanced task/pair law; labels/repetitions not independent tasks; disagreement coverage/resolver precedence explicit | WP6; P/L |
| V09 | Pairwise end to end | Matched task/repetition/contrast outputs, private inverse map, swapped/identical outputs/ties/abstention correct; preference metric distinct from absolute score; missing counterpart not substituted | WP7; P/L/N |
| V10 | Batches and partial responses | B=4 gives three calls for 12 pointwise items within one compatible stratum; IDs/criteria exact; duplicate/missing/extra items fail appropriately; valid siblings retained; split/overflow deterministic | WP7; P/L/N |
| V11 | Public workflow registration | Registered trusted ID resolves same fixed program through existing executor; unknown/duplicate/untrusted ID or invalid payload makes zero assignments; code/workflow mutually exclusive; no private imports/eval/launcher | WP4; N |
| V12 | Real concurrency and enforced ceilings | Deferred native fake jobs reach requested/native min ceiling and never exceed it. Test 1/2/3 and configured clamp below request. Queued thunks do not consume calls until admission | WP4-WP5; N; A still needed for live backend claim |
| V13 | Work conservation / out-of-order results | With slow A/fast B and capacity 2, B result persists and C starts before A ends; completion order does not alter assignment labels/weights. Memory/queue bounded for large roster | WP5; L/N |
| V14 | Failed siblings and publication errors | B fail/timeout/cancel does not erase A/C; each native result saved independently; full failure-inclusive denominator; persistence failure blocks unsafe admission without losing already saved siblings | WP5; L/N |
| V15 | Resource conflicts and isolation | Same key never overlaps; unrelated ready key progresses; state reset verified per attempt/retry; worktree does not imply account/database isolation; carryover period order preserved | WP5 serial fallback, WP8 general; L/N |
| V16 | Independent experiments / runtime scope | Same directory second writer blocked; different directories progress under same native semaphore; cross-owner/process requested global constraint unsupported unless native enforcement proven | WP5/WP8; L/N |
| V17 | Total calls versus concurrency | Total 5/concurrency 2 yields at most five admissions; measured/judge/retry/adjudicator/calibration/verifier charged once; role grading reserve cannot be consumed by retries; unknown invocation allowance refuses | WP1/WP4-WP5; L/N |
| V18 | Observational versus hard limits | Zero observed-stop cap admits zero; settled excess stops refill; unknown/currency conflicts follow explicit policy; overshoot retained; invocation versus experiment time survives resume; sub-floor timeout never called enforced | WP1/WP5; L/N |
| V19 | Provider rate / descendants | Rate governs calls per interval, not active concurrency; native hard tree cap includes grandchildren and races; depth not substituted; unsupported hard scope fails before scored dispatch | WP8; N, A only if authorized |
| V20 | Interruption and ambiguity | Crash before assignment, after assignment, after dispatch/before handle, after return/before save, after save/before terminal. Only saved result derives locally; assigned/no-result never replayed; lost handle remains blocked | WP0/WP5; L/N |
| V21 | Cancellation and notification duplicates | Native abort stops owner work; no hidden supervisor, new launch or process polling; surviving outcomes persisted; duplicate at-least-once native events deduplicate; helper PID death does not clear live ownership | WP4-WP5; N |
| V22 | Reports and unavailable telemetry | Golden concise summary with quality/reliability/latency/makespan/tokens/tools/cost; separate measured/overhead; observed zero versus unknown; currency basis; paired uncertainty/practical margins/regressions; failed fit never adoption | WP3; P/L |
| V23 | Historical inspection and preservation | Entire directory entries, hashes, sizes and mtimes unchanged after report; no dispatch/backend import/install/lock removal/repair/recompute; missing old summary rendered in memory; malformed input explicit | WP0/WP3; L |
| V24 | Sequential law and capability truth | Offline versus operational mode explicit; frozen complete-cluster frontier gates admission; no fastest-sibling looks; family alpha validated pre-dispatch; planned stop distinct from budget exhaustion; known failed model gates remain visible | WP1/WP9; P/L/N |

## Required orthogonal controls

- Repeat schedule/assignment checks for two and multiple conditions, unequal task weights, repeated trajectories, family dependence, finite task scope and each actually selected randomization law. Existing exhaustive balanced-cyclic/path-probability oracles remain authoritative.
- For every new path test valid, malformed, boundary, empty, unknown, duplicate and interrupted inputs. Expected empty work is not mistaken for a failed run; absent observations are not numeric zero.
- Judge context redaction is tested with sentinel identities in metadata, output, reference provenance and shared instructions. Metadata can be removed; essential task evidence and unavoidable output disclosure must remain visible with a limitation.
- Calibration reference labels must not appear in the evaluator input for measured calibration unless explicitly evaluating an examples-following task. No training/holdout overlap disguised as measured validation.
- Compare failure mapping before/after batching, retries and adjudication. A valid batch sibling is retained without selectively rewarding a condition; ambiguous whole calls never replay.
- Test finalization interruption between summary/report Markdown and report JSON. Machine-record commit remains the authority; deterministic resume may finish publication without rewriting conflicting records.
- Validate selected task state and immutable input paths separately from benchmark artifacts. Concurrency cannot allow one attempt to mutate another attempt's inputs or private judge evidence.
- Verify all advertised public symbols, schemas, workflow registrations, CLI help and documentation examples mechanically, not by string-only fake assertions.

## Release gates

### R1

V01-V05, report-only/unsupported branches of V06-V08, V17-V18, V22-V23 and preflight portion of V24. Existing lifecycle, grading and measurement tests retained; new review regressions must turn green for the intended cause. No requirement to install model backends for reports. Concurrency remains conservatively one-call until R2.

### R2

V11-V14, V16-V18, V20-V21 through **native fake-transport** path, plus all R1 checks. Stateful tasks retain V15 serial behavior. Cancellation and interruption evidence cannot be substituted with ordinary successful-run evidence. A future paid live smoke must explicitly use the active profile and confirm actual native behavior; it is not performed by this review.

### R3

Gate each optional grading/resource/statistical feature separately: V06-V10, full V15/V19/V24, and regressions across R1/R2. Pairwise/batch speed or helper tests alone do not prove evaluator equivalence/calibration. Preserve expensive-model red gates and original seeds/criteria; evaluate only specifically authorized studies.

## Review-time status

- 29 focused existing no-model tests passed.
- New direct probes demonstrated objective JSON/schema false positives, unwired command/final-state lifecycle and zero guard non-enforcement. These remain **unfixed**.
- Historical read-only report probe passed for 148 entries.
- No new paid/native agent calls, model fits, live concurrency experiments or implementation changes were made.
