# H2 vs H2b fixed-evidence review: tool-security A

## Scope and method

Compared only `fixed/tool-security-{1,2}-{X,Y}/RESEARCH.md`, their matching `assignment.md`, and the assigned frozen primary source `corpus/T3/sources/agentdojo-2406.13352v3.md`. X is the H2 retrieval condition and Y the H2b condition. The assignment requires exact model, task/security-case sample, metrics, attack selection, defense comparators, outcomes, limits, practical boundaries, and a concrete paired local transfer test. No live retrieval or other reports were inspected.

## Primary-passage checks

| Check | Literal primary passage | Finding |
|---|---|---|
| Mechanism and comparator | `Tool filter ... first restricts itself to a set of tools required to solve a given task, before observing any untrusted data` (source lines 286-291) | Both X and Y preserve the pre-untrusted-data condition and GPT-4o-only defense comparison. |
| Exact defense results and units | Table 5: no defense targeted ASR `57.69% (±3.9)`; tool filter `6.84% (±2.0)`; benign utility `69.0% (±3.6)` and `73.13% (±3.5)` (lines 759-835) | Both conditions retain the percentage-point comparison, correct units, confidence intervals, and table-local comparator. |
| Sample and metric definitions | `629 security test cases, for 97 different user tasks` (line 196); targeted ASR is the fraction of security cases where the goal is met and attack collections succeed if `any` attack succeeds (lines 181-190) | Both conditions preserve distinct 97/629 denominators and do not substitute an ordinary-sample average for oracle/per-case attack selection. |
| Operational failure boundaries | Filtering fails when tools cannot be planned in advance, when legitimate tools suffice for the attack (`17%`), and may fail across unreset multi-task context. Symbolic isolation remains vulnerable when content alters a result without further hijacking (lines 300-305). | Both conditions retain dynamic-plan, overlap, retained-context, and recommendation-integrity boundaries. |
| Adaptive counterevidence | Generic fixed attacks can produce non-robust defenses and `require an adaptive attack evaluation` (lines 176-180). The data card calls default-attacks-only use unsuitable (lines 1160-1165). | Both conditions require local adaptive attacks rather than treating four fixed phrasings as a security proof. |

## Pair 1: `tool-security-1-X` → `tool-security-1-Y`

**Outcome: conclusive H2b gain, no material regression; correction closure partial.**

- **Exact numeric/comparator mapping.** X says: `Tool filter ... 6.84% ±2.0` and `No defense ... 57.69% ±3.9`. Y states: `6.84% ±2.0 versus 57.69% ±3.9 ... 50.85 percentage-point reduction`, then retains the full Table 5 tradeoff. This is source-faithful and makes the comparator and effect explicit.
- **Sample, units, and attack-selection mapping.** X defines `97` benign tasks and `629` security cases, and says included-attack success models the best included attack. Y likewise defines the 97/629 metric denominators and labels Max a `best-of-collection measure`; it does not claim an ordinary average or an oracle result for a typical one-shot attack.
- **Boundary and paired-evaluation mapping.** X has P0/P1 identical-state cases and five pre-registered partitions. Y has identical-state arms, fixed prompts/state/tool implementations, S1 separable and S2-S5 failure strata, denominators, intervals, and paired IDs. Y is at least as decision-useful. Its S1-only transfer claim appropriately does not require an artificial local effect in known source-failure strata.
- **Conflict handling.** X says `Table 1 ... 70 tools` while also noting prose `74`; Y gives suite rows totaling `74` and explicitly says the Table 1 caption/data card say `70`. The primary has both: its Table 1 caption says `70`, while the four listed rows total 74. Y improves the literal account without concealing the conflict.
- **No-new-material check.** Y omits no assigned decision material from X. The omitted full ten-model table is not material here because it preserves representative configuration-specific baseline evidence and the directly relevant GPT-4o defense comparator. It adds no external evidence.

## Pair 2: `tool-security-2-X` → `tool-security-2-Y`

**Outcome: conclusive H2b gain, no material regression; correction closure partial.**

- **Exact numeric/comparator mapping.** X says tool filtering reduced GPT-4o targeted ASR `from 57.69% to 6.84%` and reports 73.13% benign utility. Y supplies the complete Table 5 row comparison, including the detector at `7.95% ±2.1` and `41.49% ±3.9`, correctly preserving the utility tradeoff. Both align with the primary table.
- **Sample, units, and attack-selection mapping.** X and Y retain 97 benign tasks, 629 security cases, 95% intervals, and the fixed-phrase versus Max distinction. Y’s `Max per-case selector` is more explicit than X’s `per-case best-of-set Max`; neither turns it into an ordinary-sample average.
- **Boundary and paired-evaluation mapping.** X proposes paired arms and adaptive planner/filter attacks. Y retains identical matched trials, deterministic user/security outcomes, arm-specific toolsets, stratification, denial/escalation, denominators, intervals, and a local decision condition. Its failure-stratum treatment is correctly separate rather than a false demand for the source mechanism to transfer to overlap/dynamic/persistent/integrity cases.
- **Source-bound useful addition.** Y retains the primary Appendix D estimate: `629 security test cases ... around US$35` and `97 utility test cases ... US$4` (source lines 843-844), clearly calls it historical planning rather than a local forecast. This is a material, source-bound planning datum, not new material.
- **No-new-material check.** Y does not lose a required X condition. It adds source-consistent tool-count, Table 3/4/5, and Max conflicts, and preserves the external-control/proposed-result distinction.

## Shared defect and table-context result

**Shared defect, low decision impact:** both X and Y omit the primary’s internal discrepancy in the tool-isolation prose: `lowering the attack success rate to 7.5%` (source line 299) versus Table 5’s `6.84% (±2.0)` (lines 819-835). The reports correctly use the precise table value, so this does not reverse the bounded deployment decision, but the assignment requires source conflicts to remain visible. Neither condition closes it.

**Recovered-table context:** conclusive for the assigned Tool-security table. Table 5’s defense labels, all three metrics, intervals, and comparator survive extraction and final composition in X and Y. The T1 `S2-cost-tables.md` recovered Generate/Prompt-token table is prompt-cost evidence, not assigned Tool-security material. It cannot establish a Tool-security recovery defect, and its details were not required in these reports.

## Verdict

H2b Y is a **conclusive per-pair improvement** over H2 X for both tool-security pairs, with no material regression and no new material. Correction closure is **partial**, because the shared primary prose-versus-Table-5 7.5%/6.84% discrepancy remains undisclosed. Full legacy parity and speed were not evaluated because they are outside this controlled fixed-evidence comparison.
