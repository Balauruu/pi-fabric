# Target architecture

Status: proposal. No suggested method/field below is claimed available unless marked **existing**. S/F/R path prefixes are defined in [findings](findings.md).

## Ownership

| Experiment module | Fabric runtime |
| --- | --- |
| Frozen design, tasks, assignment law and admissibility policy | Agent/model/harness resolution and launch |
| Grading topology, references, calibration and failure policy | Native concurrency semaphore and execution ceilings |
| Experiment call budgets, role reservations and stopping rules | Child lifecycle, waits, cancellation and residency |
| Immutable assignment/result/label records and evidence projections | Native results, usage, transcripts and tool events |
| Statistical units, estimands, uncertainty and decisions | Existing executor, transports and lifecycle notifications |
| Deterministic reports and read-only inspection | Existing activity/dashboard infrastructure |

The experiment chooses **which eligible row is next** and charges its own budget. It must not build a second launcher, agent scheduler/runtime, provider-rate limiter, descendant supervisor, process observer or telemetry collector. Keep the existing file-backed lifecycle as the experiment ledger and numerical libraries as analysis owners.

## Small public interface

### Design and inspect: local, deterministic

Proposed additions to `S/scripts/run.py`:

```text
run.py design --input draft.json --output resolved-spec.json
run.py preview --spec-path resolved-spec.json --format markdown
run.py report --run-dir RUN --format summary|markdown|json
```

Design compiles a compact authoring document into a strict resolved design. Preview performs no dispatch, scoring, fetching, installation or run mutation. It shows assembled measured/judge templates, shared restrictions versus condition deltas, unsupported methods, semantic warnings and worst-case calls. Output creation is explicit for design, never a report side effect.

A simple screen needs tasks, conditions/delta, public outcome/requirements, valid deterministic rule or evaluator, and a spend ceiling. Compiler defaults may derive IDs, equal weights, one repetition, fixed sample/final look, no retries/model analysis, finite curated scope when explicitly selected, and estimate-only decisions. Show all expanded defaults. Never invent population sampling, practical margins, factual references or acceptable calibration error.

### Native run/resume

**Existing:** fixed benchmark.ts in a dedicated fabric_exec, request `{specPath, outputDirectory}`. Preserve until its replacement is verified.

**Recommended smallest upstream entry:** registered-workflow variant of the existing fabric_exec tool, conceptually:

```text
fabric_exec({workflow: "agent-benchmarking", payloads: {request: ...}, agentBudget: B})
```

This is **not currently available**. `workflow` would be mutually exclusive with code. Versioned registration binds an installed trusted workflow ID to fixed code and payload schema. Fabric loads/typechecks it through the same executor, permissions, agent guard, cancellation and telemetry. Unknown/ambiguous/untrusted IDs fail before assignment. Do not accept arbitrary untrusted executable paths, eval strings, nested executors or an agent maintaining the workflow.

Evidence: `F/package.json:8-18` exports main/protocol; `F/dist/protocol.d.ts:226-258` does not give plain providers a generic nested dispatcher. Managed components have public context.call (`F/dist/components/types.d.ts:58-71`), but invocation budget/deadline/cancellation forwarding from provider callers is not established. A component-provider is an alternative only after those semantics are proven. Avoid compulsory per-experiment component setup.

### Effective allowance, not guessed capacity

Add a public immutable **effective agent-call allowance for this dedicated workflow invocation**, after top-level/configured clamps, to Fabric's existing workflow execution context. Expose effective native concurrency and its scope too. Exact names require upstream agreement. No private config/chunk imports.

R2 requires dedicated invocation ownership: all child calls in that outer execution belong to this workflow, and serialized experiment admission counts them exactly. This avoids needing a generic shared-window reservation system. If shared invocation consumption is later allowed, native atomic reservation/consume semantics are required; a racy remaining-count snapshot is not enough. Without the effective contract, use one-call fallback. Never infer native capacity from default 100 or large fake windows.

## Execution and grading lifecycle

```text
validate design + selected capabilities
 -> freeze spec, inputs, schedule and grading policy
 -> acquire one experiment writer
 -> reconstruct immutable work ledger
 -> choose eligible work and charge experiment budget
 -> save assignment before effects
 -> Fabric native dispatch / returned handle
 -> save native result immediately on settlement
 -> local outcome evidence or judge dependencies
 -> individual labels / explicit evaluator failure
 -> prespecified complete-cluster analysis
 -> deterministic summary and final report commit
```

### Work-conserving native execution

- Pass lazy thunks to existing workflow.parallel, never already launched promises. Each thunk uses agents.run to retain the full native result. workflow.agent normally projects text/value and is not the measurement record.
- Serialize only short ledger admission/publication. Await agents concurrently. Each thunk catches its own failure, persists it and only then releases its slot. Refill on each settlement rather than the slowest sibling. Bound plan pages, queued work and active calls.
- Fabric's combinator and native semaphore enforce concurrency. Do not port the test ThreadPoolExecutor into production or add a skill-owned semaphore runtime.
- R2 supports independent ordinary tasks/conditions and parallel judges after measurement. Existing shared taskState stays serial initially. Different directories allow independent experiments under one Fabric owner/semaphore; multiple owners/processes do not have a proven shared ceiling.
- Later resource-key scheduling should extend Fabric's existing combinator/dispatch queue if no public helper can skip blocked keys without occupying slots. Benchmarking supplies resource IDs/dependencies; Fabric dispatches ready work. This belongs upstream, not in a polling scheduler inside the skill.
- Parallelism is optional: coding worktrees isolate files, not browser accounts, databases, provider quotas, caches or host CPU. Unknown shared state stays conservative. Counterbalanced/carryover tasks retain period barriers and resets.

### Measurement versus grading overlap

Default to measurement-first/model-grading-second when latency or usage is an outcome. Judges and numerical analysis can perturb model service time, CPU/memory and rate quotas. Allow overlap only under a frozen policy with role ceilings, native aggregate ceiling, interference/isolation evidence and reporting strata. Independent experiments may overlap only when shared resources and interpretation permit it. Distinguish measured latency from experiment throughput/makespan; faster orchestration is not necessarily faster condition performance.

### Assignment validity

Generate labels/order from the frozen seed before outputs. Persist task/repetition/block/order/period separately from actual start/finish. Scheduling may choose among independent ready rows but must not use answer quality, completion speed or cheaper model availability to change assignment probabilities. Resource lanes preserve within-lane law and symmetric eligibility. If resources correlate with conditions, failures induce selection, or duration determines censoring, flag interference and revise design/estimand explicitly.

Keep the saved randomization support, conditioning and weights; do not retrofit independent-block inference to another schedule. Sequential look frontiers use prespecified complete clusters, not the first fast tasks to finish. Out-of-order results never change task weights or inferential sample size.

## Budget semantics

Let `A=T*C*R` first measured attempts and `U` maximum retries. Count admissions, not successful results.

| Control | Meaning / owner |
| --- | --- |
| Total direct calls | Measured + retry + judge + verifier + calibration + adjudicator admissions; experiment ledger |
| Role maxima/reserves | Prevent measurement/retries consuming required grading budget; experiment ledger |
| Role concurrency | Simultaneous active jobs; native combinator/queue lowered by native ceilings |
| Effective invocation calls | Hard child allowance in this outer execution; Fabric |
| Provider requests/tokens per interval | Rate, not concurrency or experiment spend; native runtime/provider only |
| Hard descendant calls | Tree-wide cap, distinct from depth/root direct calls; native only |
| Observed token/cost stop | Stop new admissions after settled usage reaches threshold; experiment policy over native evidence |
| Experiment time | Saved elapsed or cumulative active admission budget across resumes; experiment ledger |
| Agent cancellation/deadline | Native enforcement where supported; Fabric timeout floors disclosed |

Admission requires sufficient experiment total, role allocation and known invocation allowance plus resource/look prerequisites. Ambiguous charges remain consumed/reserved. Release only on native proof of no dispatch, not helper PID death. Concurrency is not a spend budget.

Token/cost limits are observational unless native pre-consumption enforcement exists. Parallel overshoot is remaining usage of in-flight work, possibly unbounded absent further caps. Unknown usage/currency follows prespecified stop-new-work or continue-with-warning policy. Zero stop limit admits no new work; null disables it. Report observed usage, unknown capacity and overshoot. Do not add parent-inclusive and child-direct usage or call a maxDepth setting a descendant-call cap.

## Authoritative task and grading contract

New public task contract: condition-neutral question, requirements with stable IDs, output structure, scope/date, relevant inputs and public acceptance criteria. outcomeDefinition becomes generated explanation or explicitly private grading meaning, not an undelivered promise.

Private evidence: answer keys, reference passages, expected states, hidden correctness tests and criterion definitions. Hidden answer keys are normal; hidden formatting requirements are not. Each criterion maps to public requirement IDs or a declared private correctness oracle. Shared restrictions are assembled identically across conditions; only intended intervention deltas vary.

Save the actual assembled native task or exact content reference, not only components. Preview judge templates with placeholder outputs and representative local fixtures before scoring; save actual judge requests at job creation. Reject unknown requirement IDs, incomplete task-key coverage, contradictory rubric owners, unsupported evidence producers and unsupported schema keywords. Flag selected factual checks without evidence. Deterministic validation cannot prove prose alignment; unresolved consequential ambiguity must be resolved by the author, not silently certified.

## Grading choices and call formulas

Let `N <= A+U` eligible outputs, `G` evaluator configurations, `J_g` repetitions per configuration, `B` batch size, `P` declared matched pairs, `K` calibration calls, `V` verification calls and `D` maximum adjudication calls. Budget against worst-case eligibility, report realized failure-inclusive use.

| Mode | Judge calls | Meaning |
| --- | --- | --- |
| Deterministic | 0 | Objective score; local compute/time still overhead |
| One pointwise evaluator | N | Absolute rubric score conditional on one evaluator |
| Multiple pointwise | N * sum(J_g) | Labels nested in outputs/tasks, not new tasks |
| Batched pointwise | sum(J_g * ceil(N/B)), within compatible context strata | Same pointwise estimand only after batch-equivalence validation |
| Pairwise | P * sum(J_g) | Preference/tie/abstain, not absolute score difference |
| Batched pairwise | sum(J_g * ceil(P/B)), within strata | Pair and batch dependence retained |
| Sampled second evaluator | Base + S*J_2, or declared stratified batch equivalent | Seeded S-output or complete-pair sample with known inclusion law |

Total reservation = `A + U + judge_max + K + V + D`, including any selected judge/verifier retry maxima. Local grading adds zero native calls. Six tasks × two conditions × one repeat means measured 12; pointwise 12; pairwise 6 under a different outcome; batches of four pointwise items 3 under validated batching. These are design illustrations, not permission to regrade/rerun historical data.

Evaluator identity binds runner/model/instructions/tools/settings/rubric/references. Renaming IDs or repeating calls on one configuration does not establish a grader population. Labels may outnumber judgments; judgments may outnumber calls. Sample second evaluators at frozen task/pair level, balanced across conditions, not from favorable outcomes. Disagreement-triggered adjudication is selected on outcomes: retain selection reason/original labels/coverage and declared precedence. Do not estimate population error from difficult-only cases without justified sampling/weighting. Missing first judgments cannot be replaced by adjudication.

### Blinding, pairwise and batching

Allowlist question, requirements, neutral evidence, answers, criteria and scope. Exclude identity, price, timing, schedule/prior-label fields. Pairwise order uses a frozen content-independent random bit/permutation per pair/evaluator/repetition, with private output-ID reverse maps. Test identical outputs, swapped order, ties, abstention and self-identifying answers. Do not derive order from answer content or repeatedly reuse an unexamined position effect.

Batches have opaque IDs, context/token/byte limits, exact expected item/criterion sets and per-item failures. Freeze packing independently of results where possible; prespecify overflow/split rules. One malformed item does not erase valid siblings unless the whole response is unparsable. Keep batch IDs for dependence sensitivity. No replay of an ambiguous batch; retries are linked new calls under frozen policy.

### Research evidence and calibration

Core remains domain-neutral. Research guidance separates factual correctness, claim support, coverage and presentation. Use frozen reference passages with provenance/date or a separately budgeted verifier whose output becomes immutable judge input. Quote matching proves occurrence, not truth/entailment; repeated sources do not create independent corroboration.

Separate illustrative examples from measured calibration. Studies evaluate the same assembled judge against held-out good/bad, isolated-defect, boundary, malformed and abstention cases, with failure-inclusive metrics and prespecified thresholds. Self-reported confidence is not calibrated error probability. Examples-only screens retain an explicit limitation. No extra model is required for reporting or routine schema validation.

## Evidence, progress and reporting

Preserve immutable spec/schedule/assignments/native results/grades/analysis. Add versioned ownership, role admission, native handle association when returned, input-contract references, outcome evidence and disposition records. Use atomic create-only publication; checkpoints/dashboard are caches.

Progress distinguishes native work from evaluation:

- by role: planned/pending, admitted, queued/running when natively known, result-saved, completed, failed/timed-out/cancelled, ambiguous;
- evaluation: expected judgments, calls completed, valid/abstained/malformed/missing labels, resolved/unresolved outputs;
- budgets: consumed/reserved/remaining, effective scope, enforcement kind, unknown usage/overshoot.

An orphaned assignment is not inferred running. Feed existing workflow.item/event; do not create another dashboard or telemetry store.

Pure reporting produces:

1. question/scope/intervention restrictions; operational and scientific statuses;
2. task/output/role-call/label/failure coverage;
3. quality scale, condition summaries, paired effects, practical margin, uncertainty/valid tests;
4. reliability under declared first/retry/pass-at-k policy, not just dispatch completion;
5. native duration distributions, measurement makespan, grading span, total elapsed/active time where saved, throughput denominator;
6. input/output/cache/reasoning/total tokens with scope and known/unknown counts; outer native versus nested tool-call granularity;
7. measured versus overhead cost, currency/basis, provider reports versus estimates;
8. regressions, sensitivity, insufficient evidence and justified follow-up.

No fabricated zeros, survivor-only efficiency, summed latencies mislabeled makespan, invented margins or equivalence from nonsignificance. Link authoritative JSON; no large embedded JSON/model call. One measurement guide owns definitions.

Create summary.md only during **new-run finalization**. report --format summary renders in memory/stdout for all supported saved formats. Explicit export writes only an authorized external destination, never silently backfills old directories. Machine records remain authoritative; record renderer provenance.

## Interruption, cancellation and resume

- Unassigned pending: may admit under frozen policy.
- Same-live-owner in-flight: track native context/handle; do not classify siblings as orphan ambiguity.
- Assignment without result/exact recoverable native identity: blocked, no replay. Names are not idempotency keys.
- Known native handle: public wait/status recovers that work subject to ownership/retention. Expired/lost identity stays ambiguous. No process inspection/private runtime reads.
- Result without grade/terminal: deterministic repair only. New judge/verification needs its own frozen pending ID and budget.
- Cancellation: stop admission, propagate Fabric cancellation, persist settled outcomes where possible. Explicit cancelled status requires native evidence; unpersisted outcomes may remain ambiguous. Guest finally is not guaranteed after executor termination.
- Graceful checkpoint: settle/persist bounded active work, release writer, return role progress. No recursive supervisor or auto-invocation to bypass ceilings.
- Duplicate terminal notifications: deduplicate native event IDs and create-only records. Public subscriptions are at-least-once (`F/skills/fabric-exec/references/agents.md:53-60`), not a polling mechanism.

Durable residency is optional later, not mandatory infrastructure. If exact assignment/dispatch correlation across the crash window is required, request a small idempotency/correlation extension to Fabric's existing dispatch store. It is not available today; conservative blocking is sufficient for R2.

## Compatibility

New semantics require versioned spec/result/evidence schemas. Keep v1 readers/exact-source compatibility. Do not reinterpret frozen v1 runs. Completed v1/older paid runs are read-only data; unfinished v1 uses only its compatible route or is superseded by a new experiment with explicit lineage. No automatic migration, repair, regrading, backfill or added historical requirements.

Historical summaries state missing context/calibration/exposure and use saved analysis. Alternative analysis needs a separate explicit artifact, not ordinary inspection. Fixes can expose limitations in historical grades without modifying them or relabeling them validated.

## Decisions that need explicit policy

| Choice | Options | Recommendation |
| --- | --- | --- |
| Grading | Objective / pointwise / pairwise | Objective where valid; otherwise one pointwise evaluator; pairwise opt-in/new estimand |
| Calibration | Examples / measured gate | Labeled examples-only screening; justified measured gate for consequential claims |
| Overlap | Separate / overlap / isolated resources | Separate for latency studies; overlap only with frozen contention policy |
| Experiments | Same / separate owners | Same-owner semaphore simplest; cross-owner guarantees need native support |
| Hard rates/descendants | Observational / enforced | Refuse unmet hard requirements; never disguise observations as enforcement |
| Time | Elapsed incl. pauses / active time | Explicit elapsed deadline easiest to audit; active-time optional; v1 unchanged |
| Batch failure | All fail / retain valid / linked retry | Retain valid items, missing explicit; never replay ambiguous calls |
| Entry | Registered workflow / managed provider | Registered workflow reuses caller executor/budget; provider only after forwarding verified |

## Non-goals

No second agent runtime, Pi launcher, raw model client, recursive supervisor, polling service, skill-owned cross-process concurrency/rate system, parallel telemetry/attestation infrastructure, universal inventory, compulsory database/component setup, historical migration, adoption verdict or paid validation in this review.
