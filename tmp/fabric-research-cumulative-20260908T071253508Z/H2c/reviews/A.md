# H2c fixed-note correction recheck A

## Literal mappings and evidence boundary

| Topic | Pre-correction comparator | Candidates rechecked | Same original evidence |
|---|---|---|---|
| prompt-cost | `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/H2b/fixed/prompt-cost-2-Y/RESEARCH.md` | `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/H2c/fixed/prompt-cost-1/RESEARCH.md`; `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/H2c/fixed/prompt-cost-2/RESEARCH.md` | `corpus/T1/sources/S2-tree-of-thoughts.md`; `corpus/T1/sources/S2-cost-tables.md` |
| tool-security | `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/H2b/fixed/tool-security-2-Y/RESEARCH.md` | `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/H2c/fixed/tool-security-1/RESEARCH.md`; `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/H2c/fixed/tool-security-2/RESEARCH.md` | `corpus/T3/sources/agentdojo-2406.13352v3.md` |

No fresh retrieval was used.

## Decisive original passages

- **ToT methods/comparators:** `S2-tree-of-thoughts.md` §4.1 says IO and CoT were sampled 100 times *for average performance*, CoT-SC returns the majority of 100 CoT samples, and the IO/CoT “best of k” calculation is an **oracle setup**. It reports 7.3%, 4.0%, 9.0%, 45%, and 74%, and says best-of-100 CoT is 49% (§4.1, lines 141–149).
- **ToT resource units:** `S2-cost-tables.md` states that `Generate/Prompt tokens` is the table header, calls 5.5k “completion tokens” in prose, and does not define the slash notation. Table 7 is CoT-best-of-100 6.7k/2.2k, $0.47, 49%, versus ToT 5.5k/1.4k, $0.74, 74% (lines 9–27). Thus near-completion tokens do not establish equal compute, cost, latency, or selector opportunity.
- **ToT mechanism gate:** the source specifies three intermediate-equation steps, BFS `b=5`, sure/maybe/impossible valuation sampled three times, and about 60% CoT first-step failure (§4.1, lines 143–149). Creative Writing instead uses depth two, `b=1`, five plan samples/votes and five passage samples/votes (§4.2, lines 159–163). The candidates retain this distinction and keep exploratory transfer separate from the demonstrated mechanism cohort.
- **AgentDojo defense condition:** `agentdojo-2406.13352v3.md` §4.3 defines Tool filter as selecting task-required tools **before observing untrusted data** (line 289). It reports the read-versus-write applicability condition, failure for dynamically planned tools, shared user/attack tools in 17% of cases, persistent context, and recommendation manipulation (lines 301–305).
- **AgentDojo metrics/results:** the paper evaluates 629 security cases and 97 user tasks (line 196). Table 5 reports no-defense targeted ASR 57.69% and Tool filter 6.84%, with Tool-filter benign utility 73.13% (appendix lines 775–839). The prose's 7.5% is retained as a qualified source conflict, not silently substituted. The defense comparison is against the paper's strongest reported fixed attack, not an adaptive defense-specific attack (§4.3, lines 283–305; data-card guidance lines 1169 and 1294).

## Per-repeat verdicts

| Repeat | Verdict | Material correction result | Remaining defect |
|---|---|---|---|
| prompt-cost-1 | **Conclusive** | Separates ordinary averages/CoT-SC from retrospective best-of-100 oracle; preserves exact Table 7 units, $0.74 versus $0.47, and non-equivalence of selection regimes. | None material. Undefined token slash and absent latency/request counts remain correctly identified source limits. |
| prompt-cost-2 | **Conclusive** | Correctly calls 74% versus 49% informative but not strictly resource-matched, retains the $0.74 versus $0.47 cost reversal, Creative-Writing staged vote mechanism, and mechanism-versus-exploratory evaluation split. | None material. Same primary-source format and transfer limits remain qualified. |
| tool-security-1 | **Conclusive** | Conditions the 57.69% to 6.84% result on GPT-4o, 629-case, fixed-attack evaluation; states no equal-compute/cost/latency finding; preserves the 17%, dynamic-plan, persistence, and content-manipulation exclusions. | None material. It retains the Table 3/4/5 and Max conflicts rather than pooling them. |
| tool-security-2 | **Conclusive** | Same corrected applicability and comparator conditions, including adaptive-attack limitation. Its local artifact makes the pre-plannable/no-overlap stratum the acceptance stratum and reports non-transfer strata separately. It does not treat a full-tool incumbent comparison or parity condition as an incumbent gain. | None material. The source's 7.5%-prose versus 6.84%-table conflict and incomplete run details remain expressly qualified. |

## Overall verdict

**Conclusive.** All four repeats close the material comparability and condition defects. Earlier useful evidence is retained: exact outcomes, units, model/task methods, resource/cost contexts, source conflicts, and operational limits. No material new regression was found. Shared remaining limitations are original-source limitations, not candidate defects: undefined ToT token slash semantics and missing latency/request data, historical task/model transfer limits, AgentDojo's fixed-attack/synthetic setting, and its unresolved internal reporting differences.
