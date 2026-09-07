# Findings

Paths are relative to `/home/balauru/.pi-profiles/fabric`. **S** = `skills/agent-benchmarking`; **F** = `npm/node_modules/pi-fabric`; **R** = `benchmarks/fabric-research-prompt-screen-20260906`. Single-line JSON citations identify the record and named fields. [Evidence](evidence.md) records probe details.

Severity: **high** can invalidate measurements, spend calls on unsupported work, or impair recovery; **medium** materially affects throughput, interpretation or usability. These are not security vulnerability ratings.

## F01. Native execution is deliberately one-call, not effectively concurrent

**Verified limitation; high operational impact. Classification: runner / Fabric integration / skill guidance.**

Evidence: `S/workflows/benchmark.ts:17-19,157-220` fixes allowance 1, requires one job, awaits one `agents.run` and never admits another call. `S/scripts/run.py:80-191,225-251` has wave admission, but takes the minimum of design concurrency and remaining invocation/global ceilings. `S/scripts/lifecycle_store.py:792-834` locks the run directory, not the profile. `R/spec.json:105-124` itself selects concurrency 1, so this run does not demonstrate an ignored request for larger concurrency. Source proves larger settings cannot improve this guest's native throughput.

Root cause: conservative handling of unknown usable host allowance, not a Fabric requirement. `F/docs/agents.md:9-21,519-536` documents native combinators, a semaphore, per-execution limits and per-process recursive concurrency. This is not evidence of a machine-wide/all-session quota. Different run directories have independent locks but still contend for native/provider/host resources.

Correction: WP4-WP5, native bounded allowance, lazy work-conserving Fabric dispatch, independent settlement persistence, role concurrency separate from total budgets. Default grading to a separate phase for latency studies; overlap only under frozen interference policy. Stateful/counterbalanced periods remain serial or use supported resource constraints.

Alternative: retain one-call dispatch until the public contract exists. Replacing 1 with 100, unbounded `Promise.all`, Python production threads, or multiple guests against the same lock is not a safe correction.

## F02. Grader identities, calls and labels are different quantities

**Verified design limitation; medium-high cost/scientific impact. Classification: grading / experiment authoring.**

Evidence: `S/scripts/grade.py:571-655` creates item × grader-ID × repetition jobs using one shared runner/model; `S/schemas/spec.schema.json:150-176` has multiple IDs but one evaluator configuration. `S/scripts/lifecycle_store.py:399-407` reserves measured/retry × grader repetitions plus maximum adjudication. `R/spec.json:136-176` selects one identity, one model and one repetition; saved job/result records total 12, not 12 independent graders.

Pairwise helper: `S/scripts/grade.py:471-541` projects injected `criterionEvidence.presentations`. Ordinary assignments never construct matched pairs (`S/scripts/lifecycle_store.py:1094-1130,1774-1842`); the private reverse-map branch is not end-to-end pairing. Parsing remains attempt-centric (`grade.py:696-712`).

Root cause: one topology/configuration and helper functionality being broader than the public lifecycle. Correction: explicit evaluator configurations, grading topology and separate task/output/judgment/call/label counts. Preserve zero-model deterministic grading; default to one pointwise judgment when needed. Add prespecified second-evaluator sampling; later pairwise/batch planning, parsing and analysis as a complete feature.

Alternatives: one evaluator is valid for a cheap labeled screen. Repetitions estimate evaluator variability, not task diversity. Pairwise may halve base calls for two conditions but changes the estimand to preference/win probability. Never silently substitute it for absolute quality differences or fit grader-population effects to renamed IDs.

## F03. Markdown embeds analysis without explaining measurements

**Verified reporting defect; medium impact. Classification: reporting.**

Evidence: `S/scripts/lifecycle_store.py:2248-2285` renders attempt counts, decision and indented analysis JSON, not quality/efficiency explanations. `R/run/report.md:5-21` starts the JSON block; the file is 33,272 bytes/1,032 lines. `S/references/audit-and-reporting.md:16-30` promises a more useful report than this renderer produces.

Root cause: machine-document serialization stands in for human reporting. Correction: one deterministic reporting module, new-run `summary.md`, and in-memory historical/partial summary view. Explain denominators, quality scale, reliability, uncertainty, practical relevance, latency versus makespan, tokens, tools, cost units, failures and overhead. Link authoritative JSON rather than embed it.

Alternative: replace `report.md` instead of adding an artifact. Recommend summary plus a short index/same-renderer report for new runs; preserve historical Markdown. One skill-local measurement guide owns definitions. No narrative model call.

## F04. Public task requirements and private grading rules diverge

**Verified authoring error plus missing safeguard; high validity impact. Classification: experiment authoring / runner / skill guidance.**

Evidence: `R/spec.json:14-64` asks substantive questions; outcome definitions promise a required format/two sources without delivering that format. Conditions refer to the task's required format (`:81,97`); rubric adds restatement, quotations and evidence fields (`:126-158`). `S/scripts/lifecycle_store.py:1094-1130` delivers prompt, input paths and instructions, not outcomeDefinition. Saved `R/run/attempts/a-000008/assignment.json:1` confirms missing Rust format requirements. `R/run/grading/grade-a-000001-judge-astra-judge-r001-9753aa46024f149950b20e56.json:1` penalizes absent question restatement and quotations; a second sampled grade does likewise.

Root cause: author placed requirements in nondelivered fields; runner lacks alignment safeguards. It did not remove requirements actually written in task.prompt.

Correction: authoritative public task/output contract assembled for every condition and judge, stable requirement IDs, private keys separately scoped, criteria linked to public requirements or explicit private correctness checks. Preview final assembled inputs before scoring. Remove duplicate rubric authority.

Alternative: prose checklist is cheap but insufficient. IDs/checks cannot prove natural-language consistency; retain author semantic review and explicit unresolved warnings. Do not repair/regrade the recent run in place.

## F05. Blinding removes necessary task context

**Verified projection defect; high validity impact. Classification: grading / runner.**

Evidence: `S/scripts/grade.py:509-560` defaults to output, rubric and blind ID, omitting original question, requirements and outcome definition. Saved `R/run/grading/jobs/judge-blind-000001-astra-judge-r001-e58f934a269e34575dfaeb3c/assignment.json:1` contains Rust answer/global rubric/examples, not the authoritative Rust task. An answer's self-restatement is not a substitute.

Correction: allowlist condition-neutral question, requirements, relevant frozen inputs/reference evidence, evaluation scope and output. Exclude condition/model/provider/price/timing/order/prior labels. Use the same projector for ordinary, pairwise, batch and adjudication jobs; keep private maps separate.

Alternative: a self-contained task-specific rubric could work, but duplicates context and drifts. Generate both from one contract. Retain residual unblinding rather than selectively discarding conditions.

## F06. Citation appearance cannot establish factual verification

**Verified evidence limitation; high impact if called factual accuracy. Classification: experiment authoring / grading.**

Evidence: rubric asks for apparent authority/visible quotation support while forbidding browsing (`R/spec.json:126-158`); judge gets no source passages (F05). `S/scripts/grade.py:543-558,643-651` makes no-tools jobs; saved judge results have zero tools. `R/calibration.json:4-21` contains illustrative example.org sources, not factual keys.

Root cause: the evidence supports presentation/internal coherence, not URL contents, quote authenticity, factual correctness as of a date or material coverage. Two URLs may repeat one source; counts are not independent support.

Correction: domain-neutral evidence descriptors with research-specific guidance separating factual correctness, claim-to-source support, coverage and presentation. Freeze reference passages with provenance/date, or separately budget verification then freeze its output. Retain inaccessible/changed/disputed/unverified sources. Quote matching proves text occurrence, not truth or entailment.

Alternatives: honestly label visible-report quality if verification is unaffordable, or use a separate evidence-enabled verifier. Unrestricted browsing by every judge changes evidence/cost unevenly and is not a free fix.

## F07. Calibration files are examples, not measured evaluator performance

**Verified lifecycle gap/terminology risk; medium-high impact. Classification: grading / skill guidance.**

Evidence: `S/scripts/lifecycle_store.py:389-390,1811-1819` checks paths and appends their text. It measures no predictions against reference labels. `R/calibration.json:2-21` explicitly illustrates labels with three examples, omitting adequate/boundary/isolated-defect evaluation. `S/scripts/grade.py:989-1040` has a useful five-class deterministic fixture checker, but no lifecycle invocation was found. Bundled evaluator tests do not validate every authored rule/model.

Correction: distinguish rubricExamples from calibrationStudy. Measured calibration freezes cases, references, evaluator configuration, thresholds, holdout policy and budget; saves predictions, confusion/error summaries, abstentions, malformed returns and uncertainty. Include good/bad, isolated-defect, boundary, malformed and insufficient-evidence cases.

Alternatives: examples-only is acceptable for explicitly uncalibrated screening. Consequential/confirmatory use should require justified measured calibration. No universal threshold or rerun-until-pass policy.

## F08. Exposure is partly observable; compliance remains unestablished

**Documented limitation with partial native evidence; high interpretation impact. Classification: runner / experiment authoring / skill guidance.**

Evidence: `S/scripts/lifecycle_store.py:1633-1641` refuses mechanismObservation. `R/spec.json:96-97` describes a prompt condition, not verified exposure; both conditions prohibit delegation (`:81,97`), so not an unrestricted research-workflow test. `R/run/attempts/a-000001/result.json:1` retains task delivery. Its `native.log:469-471` starts a shell cat of the active profile's fabric-research/SKILL.md and returns successfully with skill content. This establishes one content load, not all six treatment loads, retained instructions, references or behavioral compliance.

Pi docs/skills.md distinguishes catalog exposure, expansion and actual reads. `F/docs/audit-trace.md:67-90` distinguishes retained core paths from omitted MCP/extension arguments; missing bounded trace evidence is not proof of no read.

Correction: separate requested delivery, supplied instruction content, observed load, behavioral evidence and unknown coverage. Use native task/results/logs, not self-report or an attestation subsystem. Make restrictions explicit. Assignment-based analysis remains primary; exposure subsets are diagnostics unless justified by design.

Alternative: supplying frozen skill content directly removes loading ambiguity but changes the intervention. Do not silently substitute content delivery for invocation behavior.

## F09. Exact-source submission is a fragile public interface

**Verified usability limitation; reported eval failure unverified here. Medium-high impact. Classification: skill guidance / Fabric integration.**

Evidence: `S/SKILL.md:19-27`, `S/README.md:21-42` require repeated exact-source submissions; the guest contains substantial request/bridge logic. Reviewed run records do not retain outer caller eval/wrapper attempts, so their failure cause remains a user-reported lead, not a verified defect.

`F/package.json:8-18` exports main/protocol, not a public runner loader. `F/dist/protocol.d.ts:226-258` provides invocation context but no generic nested agent/executor handle. Managed components do have context.call (`F/dist/components/types.d.ts:58-71`), but activation-scoped calls do not prove caller-scoped budget/cancellation semantics for a wrapper.

Correction: a small generic registered-workflow variant of Fabric's existing executor, loading trusted fixed code and payload schema. Caller supplies identity/request, not eval/source. Keep pending work internal.

Alternatives: retain exact guest fallback; consider a managed provider only after public context forwarding is proven. No private manager imports, new Pi process launcher, raw model client, or recursive supervisor agent.

## F10. Progress excludes grading; capability claims need finer states

**Verified progress/capability gaps; medium-high impact. Classification: runner / reporting / skill guidance.**

Evidence: `S/scripts/lifecycle_store.py:122-137` counts only attempts; result schema (`S/schemas/result.schema.json:39-52`) has no role progress. `S/scripts/run.py:208-224,319-331` returns those counts in grade phase. Saved report counts 12 assigned/terminal while 24 direct results exist. Correct as attempt counts, misleading as work progress.

README candidly retains scientific failures/unsupported methods (`S/README.md:143-179,204-219`), but helper coverage can appear public support (F02/F11), and transient historical worker status burdens setup. Preflight correctly refuses human input/mechanism/some transforms and targets/hard descendants (`lifecycle_store.py:1627-1716`); retain this.

Correction: role states, judgment/label coverage, consumed/reserved/remaining budgets and enforcement scope. Distinguish represented, implemented, currently available, validated and known failing. Live native running state is not historical inferred running. Keep legacy attempt counts and add versioned role progress. Link historical evidence instead of embedding transient inventories.

Alternative: judgeCalls alone fixes immediate ambiguity but not recovery/coverage.

## F11. Command/final-state grading lacks a production evidence producer

**Verified end-to-end defect; high cost/validity impact. Classification: runner / grading.**

Evidence: `S/scripts/grade.py:374-392` correctly requires outer deterministicEvidence/finalState, not agent claims. `S/scripts/lifecycle_store.py:1239-1286,1446-1460` persists native result then grades without generating those fields; bridge accepts only native/error (`S/scripts/run.py:291-313`). taskState (`lifecycle_store.py:1140-1210`) is readiness, not outcome grading. Helper tests manually insert evidence (`S/tests/test_grading.py:151-195`). Direct fake-run probes for each kind dispatched one call then failed with GRADING_FAILED, missing evidence and no terminal.

Correction: refuse before dispatch unless an executable outcome-check contract is supported. Later runner-owned post-attempt checks save bounded command/state evidence outside agent results, using existing local command mechanics, not an agent launcher.

Alternative: retire public options until implemented; retain helpers for explicit evidence import. Never replace them with agent pass booleans.

## F12. Token/cost guards are not guards; wall time resets per invocation

**Verified guard defect plus documented time trade-off; high resource impact. Classification: runner / reporting.**

Evidence: execution references tokenGuard/costGuard only in finalization disclaimers (`S/scripts/lifecycle_store.py:2409-2411`), not threshold admission (`run.py:144-191`; `lifecycle_store.py:1718-1745,2557-2598`). Fake run with both guards zero dispatched all four calls and completed. This is weaker than best-effort stop-after-observed-usage; threshold/remaining/overshoot are not computed.

Wall time is honestly defined per invocation (`S/schemas/spec.schema.json:638`); `run.py:158-160` uses new lock start. Recent 900-second setting coexists with measured native span 2,068.105 seconds, consistent with this documented meaning, not a violated hard deadline. Fabric timeout floors and best-effort recursive cost accounting differ (`F/docs/configuration.md:18-46`; `F/docs/agents.md:233,534-536`). No verified public experiment-wide hard descendant-call or provider-rate API found.

Correction: separate invocation admission duration, experiment elapsed/active admission budget, native deadlines, observed token/cost stops and enforcement status. Stop new admissions at observed limits; retain unknowns/overshoot. Reject unsupported hard requirements. Never claim lower-than-floor timeout enforcement.

Alternative: rename to report-only thresholds and actually report comparisons. Recommend stop-new-work for new specs; legacy semantics stay unchanged.

## F13. Telemetry leaves usable timing and token distinctions unprojected

**Verified telemetry gap; medium impact. Classification: analysis / reporting / Fabric integration.**

Evidence: `S/scripts/aggregate_telemetry.py:578-587,777-791` handles duration aliases, not finishedAt-startedAt; `:875-879` retains timestamps. Saved a-000001 native result has numeric timestamps; `R/run/telemetry.json:1` marks all 12 measured latencies unavailable. Metric list omits reasoning/total tokens. Experiment dispatch counts are known separately from unavailable native usage.agentCalls.

Measured native durations sum 1,947.588 seconds but span 2,068.105; judges sum 159.679 and span 244.848. Neither span is complete experiment wall time. Cache-write zero is observed; latency unavailable is not zero. Native cost is numeric with null unit and explicit limitation.

Correction: documented native timestamp duration, separate immutable experiment timing, per-condition/role summaries with availability. Include reasoning/total only when scope is known; never naive cache/token addition. Preserve unknown currency absent public proof; never use mtimes as latency.

Alternative: leave timestamp-derived duration unavailable until native semantics are documented, with explanation rather than silent omission.

## F14. Objective JSON validation has false positives

**Verified correctness defects; high validity impact. Classification: grading.**

Evidence: `S/scripts/grade.py:409-422` uses Python equality for exact JSON and sends embedded schemas directly to subset validation. Probe expected {"x":true}, actual {"x":1} gets correct/1. Probe integer multipleOf:2 with output 3 gets correct/1. `S/scripts/benchmark_lib.py:490-595` ignores unsupported keywords; separate check_schema (`:612-641`) is not invoked there.

Correction: shared JSON-semantic equality, using existing `_json_equal` (`benchmark_lib.py:408`) as a starting point; fail-closed embedded schema checks before dispatch. State the supported subset explicitly.

Alternative: maintained full validator in skill-local environment for grading/authoring, retaining stdlib-only reports. Either route needs these false-positive regressions, not only valid-shape tests.

## F15. Sequential stopping exists in analysis, not admission

**Verified lifecycle gap; high impact when early stop selected. Classification: runner / analysis.**

Evidence: `S/scripts/analysis_engine.py:1174-1263` evaluates looks/crossed boundaries. Lifecycle dispatches all work then finalizes (`S/scripts/lifecycle_store.py:2557-2612,2347-2351`; native `run.py:144-157`); no interim analysis stops admission. Recent fixed-sample run is unaffected. Preflight alpha validation accumulates per hypothesis (`lifecycle_store.py:327-365`) while analysis also validates family-wide finite-look sum; some multi-hypothesis failures can be detected too late.

Correction: shared selected-method preflight now; label/refuse operational sequential stopping until wired. Later complete-cluster look frontiers and explicit not-required-after-planned-stop rows, respecting allocation conditioning and in-flight overshoot.

Alternative: retrospective sequential-policy analysis, clearly named and without promised call savings. Cost interruption is not a valid statistical stop.

## F16. Tool policy, prose restrictions and observed authority differ

**Verified design/confounding risk; medium-high impact. Classification: experiment authoring / Fabric integration / skill guidance.**

Evidence: `R/spec.json:70-97` uses tools:[] with extensions enabled; saved measured results record 171 tool calls. `a-000001/native.log:469-471` uses an MCP shell. Empty optional lists are not a universal prohibition of all Fabric/provider capabilities. Baseline alone prohibits browser/authenticated fetching; treatment does not repeat it. Intent and behavioral effect of this asymmetry remain unresolved. Both prohibit delegation.

Fabric docs describe Pi/captured restrictions and inherited behavior (`F/docs/agents.md:48-52`; `F/skills/fabric-exec/references/agents.md:16-28`), model selection/clamping and cwd. Sample stderr has unrelated MCP startup/root warnings, evidence of ambient overhead, not authority to change other settings.

Correction: preview shared restrictions and intended condition delta; distinguish requested versus effective authority/model/settings. Strict no-tools judges can use extensions:false where verified. Record prompt-only restrictions as such. Make isolation task-specific, not a universal inventory/attestation requirement.

Alternative: keep restrictions advisory and limit causal claims; never label a negative instruction enforced access control.

## F17. Larger windows need active-owner recovery semantics and immediate persistence

**Verified risk for proposed concurrency; medium-high impact. Classification: runner / Fabric integration.**

Evidence: `_dispatch_wave` (`S/scripts/lifecycle_store.py:1762-1768`) and grade waves (`:1989-2004`) collect all fake results before persistence, delaying fast siblings behind slow ones. `inspect_records` (`:1050-1065`) marks assignments without results ambiguous. Naive re-admission while siblings run would trigger this. Lock PID (`:792-808`) belongs to the short-lived helper, not durable Fabric owner; dead helper does not imply dead guest/child.

Good properties: atomic create-only publication (`:533-560`), native evidence (`:1239-1348`), ambiguity refusal and recovery tests pass. Preserve them.

Correction: one experiment writer, native invocation/handle association where available, live-owner in-flight versus orphan ambiguity, result persistence before releasing each slot. Recover exact handles with public wait/status, never names. Missing handle/idempotency guarantee means blocked, not replay.

Alternative: serial checkpoints. Do not productionize test ThreadPoolExecutor, poll processes, auto-delete locks based on PID, or promise exactly-once across external dispatch crashes.
