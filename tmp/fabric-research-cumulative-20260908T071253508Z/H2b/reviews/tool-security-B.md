# Controlled H2 versus H2b comparison: tool-security B

## Scope and method

Compared only the four fixed runs, their `assignment.md`, `streams/s1.md`, synthesis handoffs, and the frozen primary AgentDojo v3 source. The assignment requires exact models, samples, metrics, attack/defense comparators, outcomes, conflicts, operational boundaries, and a concrete paired local transfer comparison (`tool-security-{1,2}-{X,Y}/assignment.md:1-9`). `X` is H2 and `Y` is H2b. This is a report-quality comparison, not a speed or legacy-parity assessment.

Primary passages checked directly:

- **P1, metric and selection definition:** “Utility Under Attack” is a fraction of security cases with correct user task and no adversarial side effect, targeted ASR is the attacker-goal fraction, and a collection succeeds if “any” included attack succeeds (`corpus/T3/sources/agentdojo-2406.13352v3.md:182-190`). This is best-of-included-attacks, not an oracle over an unspecified distribution.
- **P2, defense condition and comparator:** the tool filter has the LLM restrict itself to tools required for the task *before observing untrusted data* (`…agentdojo-2406.13352v3.md:287-291`). Table 5 orders columns No defense, Delimiting, PI detector, Repeat prompt, Tool filter and gives, respectively, targeted ASR 57.69, 41.65, 7.95, 27.82, 6.84 percent with stated 95% intervals (`…agentdojo-2406.13352v3.md:759-837`).
- **P3, known-failure boundary:** the source limits the demonstrated case to read-needed versus attacker-write-needed work; it says filtering fails for output-dependent planning, shared tools (17% of test cases), and unreset multi-task context, while even stronger isolation remains vulnerable to recommendation manipulation without another call (`…agentdojo-2406.13352v3.md:299-305`).
- **P4, adaptive limitation/conflict:** fixed generic attacks can be defeated by non-robust defenses and require adaptive evaluation (`…agentdojo-2406.13352v3.md:174-178`). The prose says Max adds 10%, despite Table 4’s reported targeted Max 57.55 versus Important-message 57.70 (`…agentdojo-2406.13352v3.md:283-285`).

## Recovered-table trace

All four evidence notes retain a labelled Table-5 reconstruction. For example, `tool-security-1-X/streams/s1.md:83-91` maps the five defense labels to all three metrics, including no-defense 69.00/50.01/57.69 and tool-filter 73.13/56.28/6.84. The corresponding final report preserves the same mapping at `tool-security-1-X/RESEARCH.md:45-53`. H2b does likewise: `tool-security-2-Y/streams/s1.md:77-87` to `tool-security-2-Y/RESEARCH.md:77-87`.

**Outcome: conclusive.** Recovered-table context survives extraction and final composition in X and Y. No report swaps the flat-source Table-5 columns, loses the comparator, units, or intervals. This is parity, not a distinct H2b gain.

## Pair 1: `tool-security-1-X` versus `tool-security-1-Y`

### Literal comparison

- **X:** “P1 materially reduces targeted ASR in `disjoint_permission` without an unacceptable local task-success or false-block/abort loss”; the other four partitions are “expected failure tests, not exclusions” (`tool-security-1-X/RESEARCH.md:104-106`). It fixes state and injected content across P0/P1 and records per-case IDs, blocked calls, false blocks, and expansion events (`:82-104`).
- **Y:** requires all of: pre-data determinability, attack-capability exclusion, bounded context lifecycle, and deterministic local checks (`tool-security-1-Y/RESEARCH.md:62-67`). Its transfer gate claims only S1, “preserves benign utility while materially reducing targeted ASR using identical paired cases, disclosed denominators, and intervals”; S2-S5 are explicitly exploratory (`:101-125`).
- **Source mapping:** those Y predicates respectively instantiate P2’s pre-exposure mechanism and P3’s dynamic, overlap, persistent-context, and integrity boundaries. They do not claim that the 17% overlap rate is a local rate.

### Judgment

**H2b gain: conclusive, modest.** Y makes the eligibility condition and the local claim boundary more explicit than X: it separately requires exclusion of the attacker capability and confines transfer support to the separable stratum. This closes the ambiguity between an ordinary pooled sample and the source-demonstrated mechanism.

**No-new-material-regression: conclusive.** Y retains the GPT-4o/Table-5 comparator and units (`tool-security-1-Y/RESEARCH.md:44-54`), distinct 97/629 denominators (`:13-18`), source conflicts (`:127-134`), fixed-attack limitation (`:107-111`), and all four source failure boundaries (`:71-78`). Its shorter cross-model table is source-bound and does not change the decision, so is not a material omission.

## Pair 2: `tool-security-2-X` versus `tool-security-2-Y`

### Literal comparison

- **X:** defines a broadly gated two-arm evaluation, then lists required strata only as `[tool-overlap, delayed-persistent-context, recommendation-manipulation, capability-family]` and gates B on a reduction under “defense-aware local attacks” (`tool-security-2-X/RESEARCH.md:108-123`). It does not name the preplannable, separable mechanism stratum as the sole supported transfer claim.
- **Y:** explicitly adds `S1_preplannable_separable: user tools exclude attack tools` and separately enumerates shared capability, dynamic discovery, retained context, and content integrity (`tool-security-2-Y/RESEARCH.md:101-111`). Its rule is: “Claim transfer only for S1” and treat S2-S5 as exploratory rather than as proof that permissions solve those classes (`:125-128`).
- **Source mapping:** S1 is the P2/P3 read-versus-write mechanism. S2-S5 map one-for-one to P3. The source supports a mechanism transfer test for S1, but not a requirement that that effect be re-demonstrated in a known-failure stratum.

### Judgment

**H2b gain and correction closure: conclusive.** Y repairs X’s local-evaluation ambiguity. It preserves a demonstrated-mechanism stratum, evaluates known-failure strata separately, and prevents a global aggregate or failure-stratum result from deciding S1 transfer. This directly resolves the stated risk of demanding effect in a source-known-failure stratum while dismissing mechanism transfer.

**No-new-material-regression: conclusive.** Y keeps the full Table-5 comparison with correct units and comparator (`tool-security-2-Y/RESEARCH.md:77-87`), the 97/629 metric distinction (`:29-36`), adaptive-attack caveat (`:132-136`), and operational non-coverage (`:93-97`). It also retains source conflicts rather than silently reconciling them (`:135`).

## Shared defects and excluded axes

- **Shared non-defect:** all reports label Table-5 as a separate GPT-4o defense experiment and avoid pooling it with Table 3. This accords with the reported cells and the unresolved source discrepancy.
- **Shared source-bound omission, decision impact:** none found. No omitted detail from one final report changes the bounded permission-filter decision, comparator interpretation, or local gate.
- **Not judged:** source-count/label typography, full legacy parity, and speed. No score is assigned for them.

## Final outcome

**Conclusive:** H2b has no new material regression in either pair. Pair 1 is a modest but real condition-completeness gain. Pair 2 is a material correction: it preserves the primary-supported separable mechanism as its own paired evaluation stratum and does not falsely demand that effect in the source-stated failure strata. Table recovery is stable in both H2 and H2b, so it supplies parity rather than the repair’s differentiator.
