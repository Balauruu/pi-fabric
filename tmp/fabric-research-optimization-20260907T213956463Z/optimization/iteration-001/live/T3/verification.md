# T3 control evidence

**Disposition: partial.** R1–R3 have source-backed support, but no inspected formal standard directly measures tool-agent reliability or security. Do not claim benchmark success proves deployment security.

## Coverage

| Requirement | Disposition | Control |
|---|---|---|
| R1 evaluations / standards | Qualified | Retain evaluated benchmarks. State NIST AI RMF is voluntary risk-management guidance, not a measured tool-agent evaluation. |
| R2 limits / transfer | Supported | Retain simulator, evaluator, adaptive-attack, and benchmark-version limits. |
| R3 controls | Qualified | Retain source-derived measurements and external enforcement controls. Deployment thresholds remain system-specific. |

## Exact quantitative retention checks

| Source | Source-bound check | Conditions / comparator | Required report location |
|---|---|---|---|
| [τ-bench §4–5, Table 2, Fig. 4](https://arxiv.org/html/2406.12045) | GPT-4o function calling: airline `pass^1=35.2%`; retail about `61% pass^1`, retail `pass^8<25%`. | Retail/airline database APIs, `gpt-4-0613` simulated user, agent temp `0.0`, user temp `1.0`, ≤`30` actions, ≥`3` trials/task. `pass^k` requires all k trials to succeed. | Analysis: repeated-run reliability |
| [AgentProp-Bench §3–8, Tables 2, 6, 7](https://arxiv.org/html/2604.16706v2) | `2,000` core tasks, `14,750` traces, `13` agents. Human κ=`0.835`, raw agreement=`92%`, n=`100`. Rejection/recovery ρ=`0.041`, p=`0.893`, n=`13`. Fabricated-use classifier precision=`37/40=92.5%`. | Deterministic Python/JSON-schema tools, one schema-valid semantic parameter corruption before first execution, temperature `0`. | Analysis: evaluator validity and recoverable failure |
| [ToolSandbox §2–3, Table 3–4, §7](https://arxiv.org/html/2408.04682v1) | ToolSandbox: `1,032` cases, `34` tools, mean `13.9` turns and `3.80` tool calls. GPT-4o-2024-05-13 average score=`73.0/100`; Claude-3-Opus=`69.2/100`. | Stateful Python environment, GPT-4o user simulator, human-authored milestone/minefield DAG evaluator. Comparator workloads: BFCL `2.00` turns, ToolEval `7.53`, API-Bank `3.88`. | Analysis: stateful final-state evaluation |
| [CAX-Agent §III–V, Tables I–II](https://arxiv.org/html/2605.15218) | `450` runs = `50` APDL prompts × `3` strategies × `3` repeats. Model-only completion=`0.9267` (95% CI `0.885–0.968`) vs rule-only=`0.7733` and no-recovery=`0.6933`; total score `9.16/10` vs `7.03/10` and `5.60/10`. | MAPDL only, Qwen-27B local model plus Claude Sonnet 4.6 external model, temperature `0`; retry budgets 4 vs 2 vs 1. | Analysis: bounded recovery comparison |
| [AgentDojo §3–4, Table 5, data card F.5.2](https://arxiv.org/html/2406.13352) | `97` tasks, `27` injection targets, `629` security cases. GPT-4o tool filter: benign utility=`73.13%`, utility-under-attack=`56.28%`, targeted ASR=`6.84%`. Detector: `41.49%`, `21.14%`, `7.95%`. | Four stateful environments and deterministic utility/security functions. Table 1/data card report `70` tools, while §3.1 says `74`. | Analysis: prompt injection and utility trade-off |
| [ToolEmu §3–5, Tables 4–5, §7](https://arxiv.org/html/2309.15817) | `36` toolkits, `311` tools, `144` cases, `9` risk types. GPT-4 safety prompt failure=`23.9%` vs GPT-4 basic=`39.4%`; NoAct failure=`0.00%`, helpfulness=`0.063` on a `0–3` scale. Safety-evaluator recall=`73.1%` vs human=`78.8%`. | GPT-4, temperature `0`, LM-emulated tools and LM safety/helpfulness evaluator. | Analysis: evaluator error and safety/utility trade-off |

## Compact retention set

| Decision dimension | Source-unique contribution | URL / locator | Required report location | Disposition |
|---|---|---|---|---|
| R1 repeated reliability | `pass^k` distinguishes all-runs success from one-of-k success. | [τ-bench §4](https://arxiv.org/html/2406.12045#S4) | Analysis: repeated-run reliability | Retain |
| R1 evaluator validity | Response matching can be invalid. Human calibration and provenance failure are separately measurable. | [AgentProp §5, §8](https://arxiv.org/html/2604.16706v2#S5) | Analysis: evaluator validity | Retain |
| R1 stateful task success | Final world state, ordering, and forbidden actions can be evaluated separately from text plausibility. | [ToolSandbox §2.3](https://arxiv.org/html/2408.04682v1#S2.SS3) | Analysis: stateful final-state evaluation | Retain |
| R1 recovery | A bounded retry harness has a controlled MAPDL comparison. | [CAX-Agent Table I](https://arxiv.org/html/2605.15218) | Analysis: recovery | Retain, domain-qualified |
| R1 security behavior | Prompt-injection utility, utility-under-attack, and targeted ASR are distinct outcomes. | [AgentDojo §3.4, Table 5](https://arxiv.org/html/2406.13352#S3.SS4) | Analysis: security-relevant behavior | Retain |
| R1 risk discovery | Emulated-tool risk evaluation measures a bounded underspecification threat model. | [ToolEmu §3](https://arxiv.org/html/2309.15817#S3) | Analysis: risk discovery | Retain, evaluator-qualified |
| R1 standards | AI RMF is voluntary governance guidance, not a measured security or reliability standard. | [NIST AI RMF overview](https://www.nist.gov/itl/ai-risk-management-framework) | Answer and scope; source appendix | Retain as boundary |
| R2 simulation / evaluator limits | One-parameter injection, deterministic simulators, limited human calibration, and stage-two n=`2–56`. | [AgentProp §11](https://arxiv.org/html/2604.16706v2#S11) | Disagreements, alternatives and limitations | Retain |
| R2 transfer limits | User-simulator errors, milestone-authoring scalability, external-service reproducibility, no authentication coverage. | [ToolSandbox §7](https://arxiv.org/html/2408.04682v1#S7) | Limitations | Retain |
| R2 recovery transfer | Simple geometries, single solver/model, only three repeats, and unequal retry budgets. | [CAX-Agent §V](https://arxiv.org/html/2605.15218) | Limitations | Retain |
| R2 security boundary | Fixed attacks are insufficient. Adaptive attacks are required. Tool filtering fails when legitimate permissions suffice for attack. | [AgentDojo §3.3–4.3](https://arxiv.org/html/2406.13352#S3.SS3) | Limitations | Retain |
| R2 benchmark drift | Old τ-bench airline/retail tasks are outdated. τ³ `<1.0.1` and `>=1.0.1` banking_knowledge results are non-comparable. | [τ-bench README](https://github.com/sierra-research/tau-bench), [τ³ README](https://github.com/sierra-research/tau2-bench) | Limitations; controls | Retain |
| R3 operational controls | Deterministic final-state and policy validators, provenance ledger, separate rejection/recovery/fabrication outcomes. | [AgentProp §§7–9](https://arxiv.org/html/2604.16706v2#S7) | Recommendations and decision table | Retain as inference |
| R3 security controls | Measure benign utility, attacked utility, ASR, and privileged side effects jointly under adaptive attacks. | [AgentDojo Table 5](https://arxiv.org/html/2406.13352#S4) | Recommendations and smallest resolving evaluation | Retain as inference |
| R3 recovery controls | Fixed retry budget, checkpointed state, external idempotency enforcement, safe stop and escalation. | [CAX-Agent §IV–V](https://arxiv.org/html/2605.15218) | Recommendations and smallest resolving evaluation | Retain, do not generalize safety |
| R3 version controls | Pin benchmark commit/tag, grader, environment, model snapshot, tool schema, and date. | [τ³ README, grading update](https://github.com/sierra-research/tau2-bench) | Recommendations; coverage | Retain |

## Bounded corrections

1. **AgentProp:** replace “injected parameter error reaches wrong answer with probability ≈0.62” with “mean across 13 models for the *execution-to-wrong-answer hop* was ≈`0.62`; pooled raw hop was `217/271=0.80`, human-calibrated ≈`0.65`.” Do not label `0.62` as an unconditional injection-to-error rate.
2. **AgentDojo:** resolve the tool-count discrepancy. Report “Table 1 and data card: `70` tools, §3.1 text: `74`,” rather than one unqualified number. Drop the unverified `±` CI figures unless copied exactly from Table 5.
3. **ToolSandbox:** retain GPT-4o overall `73.0/100`, but omit the `76.6/100` state-dependency figure unless independently checked against Table 4.
4. **CAX-Agent:** identify both Qwen-27B and Claude Sonnet 4.6, and state unequal retry budgets (`B=4`, `B=2`, `B=1`) beside the comparison.
5. **Standards coverage:** explicitly state that no inspected formal standard directly measures tool-agent security or production reliability.

**Gate:** retain the mapped source-bound units and corrections, label deployment controls as bounded inferences, and keep the final conclusion partial until a target-system evaluation supplies production-equivalent evidence.