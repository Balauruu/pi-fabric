# Tool-Using Agent Prompt Techniques: Decision Note  
**Assignment:** `tool-agent-effects` · **as-of:** 2026-09-07 · **status:** partial but decision-grade for R1/R2  
**Scope:** technical text/reasoning/tool-use scaffolds. Results below retain their original task, model, harness, and budget conditions. They are not a universal ranking.

## Bottom line

Use **grounded ReAct-style loops** as the default when tool observations resolve uncertainty. Add a bounded plan only when failures are long-horizon coordination failures. Add retry/reflection only when a trustworthy, task-specific verifier supplies actionable feedback. Treat tool documentation, schemas, and retrieved relevant tool definitions as prerequisites, not optional prompt decoration.

Do not adopt “reason more,” “retry more,” or “add examples” without a paired evaluation that fixes model, tools, action/retry budgets, state reset, and final-state grader.

## R1 — Measured effects

| Technique | Original measurement and comparator | Result under original conditions | Production implication |
|---|---|---|---|
| **Interleaved reasoning, action, and observation grounding (ReAct)** | [ReAct](https://arxiv.org/html/2210.03629v3), PaLM-540B. HotPotQA question-only with a constrained Wikipedia API: manually composed 6-shot ReAct versus Act/CoT. | HotPotQA EM: Act **25.7**, ReAct **27.4**, CoT **29.4**. FEVER accuracy: Act **58.9**, ReAct **60.9**, CoT **56.3**. Hybrid fallbacks were best: ReAct→CoT-SC **35.1 EM** on HotPotQA, CoT-SC→ReAct **64.6%** on FEVER. ReAct was capped at **7** and **5** steps respectively because more did not help. | Grounding helps where retrieval resolves facts, but it is not automatically the best pure-reasoning method. Bound tool steps and define a fallback trigger. |
| **ReAct for stateful tool tasks** | Same paper, ALFWorld: 134 unseen games, 6 controlled two-trajectory prompt permutations, greedy decoding. Comparator Act uses identical action trajectories with thoughts removed. | Best ReAct average success **71%**, Act **45%**, BUTLER **37%**. Worst ReAct prompt was **48%**, still above the best Act run. ReAct-IM, which replaces sparse goal-directed thoughts with dense feedback-like thoughts, was **53%**. | Preserve a compact goal/subgoal/state representation. Merely appending observations or verbose “thoughts” is not equivalent to grounded planning. |
| **ReAct for noisy web environment** | Same paper, WebShop: 500 test instructions. One-shot prompt. Final success requires the bought product satisfy all requirements. | Act SR **30.1%**; ReAct SR **40.0%**. Product-attribute score: **62.3** versus **66.6**. Human SR: **59.6%**. | Measure both final success and partial quality. A gain in attribute coverage is not a substitute for a completed transaction. |
| **Tool documentation instead of selected demonstrations** | [Tool Documentation Enables Zero-Shot Tool Usage](https://arxiv.org/html/2308.00675), normally `gpt-3.5-turbo`; prompt combinations of docs and 0–16 demonstrations across ScienceQA, TabMWP, NLVRv2, and a 50-question renamed-GCP CLI benchmark. | The authors report documentation-only zero-shot was on par with **16-shot** TabMWP and **12-shot** NLVRv2. On the CLI task, each task needed at least two commands from 200 tools, and documentation was retrieved by TF-IDF because all docs did not fit context. No dollar/token cost was reported. | Give each callable tool a concise purpose, constraints, typed arguments, result contract, and error semantics. Retrieve a small relevant tool subset. Do not use examples as the only specification. |
| **Explicit planning** | [Plan-and-Act](https://arxiv.org/html/2503.09572), WebArena-Lite final-state success. Baseline is a ReAct-style executor with no planner; the intervention is a trained Planner plus varying Executor training, not prompt-only planning. | With a base executor, planner addition increased SR **9.85% → 29.63%**. The full trained system reported **57.58%**, with CoT adding **4.36 points** at that point. Data intervention was substantial: 923 synthetic action trajectories, 10,000 generated plans, and 5,000 targeted failure-derived query-plan pairs. | This is evidence for planning *with tailored training and a specific browser harness*, not proof that a “make a plan” prompt transfers. Test prompt-only planning separately. |
| **Reflection/retry with executable feedback** | [Reflexion](https://arxiv.org/html/2303.11366), GPT-4 coding agent, HumanEval. The agent generated up to six unit tests, executed them, kept at most one memory experience, and reflected across attempts. | Reported HumanEval Python **91% pass@1**, versus then-reported GPT-4 **80%**. Crucial ablation on the 50 hardest HumanEval-Rust translations: unguided self-reflection was **52%**, below the **60%** base result. | Retries are justified only where the evaluator exposes a reliable failure signal such as compiler output, deterministic tests, or validated API error. “Critique yourself” without external evidence can regress. |

### Tool-result grounding and tool-selection limits

[API-Bank](https://arxiv.org/html/2304.08244) provides a useful warning against assuming that model capability or a well-written tool prompt is sufficient. Its manually retained evaluation set had **314 dialogues and 753 API calls** after discarding **21.5%** of 400 annotated dialogues. The reported API-call correctness progression was:

| Model/version | Call | Retrieve+Call | Plan+Retrieve+Call | Overall |
|---|---:|---:|---:|---:|
| `gpt-3.5-turbo-0613` | 59.40% | 38.52% | 22.00% | 47.16% |
| `gpt-4-0613` | 63.66% | 37.04% | 70.00% | 60.24% |

The original error analysis attributes **67.86%** of GPT-4 errors to failed API retrieval and **17.86%** to invalid call format. This supports evaluating tool retrieval, parameter serialization, execution, and final task completion as separate stages.

## R2 — Counterevidence, regressions, and transfer limits

1. **ReAct is task-dependent.** On the same PaLM-540B setup, ReAct lost to CoT on HotPotQA (**27.4 vs 29.4 EM**) while winning on FEVER. Its authors also report that prompt-only ReAct was worst among four methods for PaLM-8B/62B, because learning both action and reasoning from few-shot examples was difficult. [[ReAct, §3.3]](https://arxiv.org/html/2210.03629v3)

2. **The claimed ALFWorld gain is not a single-run estimate.** It is best-of-six prompt selection against best-of-six Act and best-of-eight BUTLER results. The paper reports six prompt variations but no confidence intervals. Production evaluation should report all seeds/prompt variants and paired differences, not the maximum. [[ReAct, §4]](https://arxiv.org/html/2210.03629v3)

3. **Reflection without grounded feedback can be harmful.** Reflexion’s own Rust ablation dropped below base performance when it removed test generation/execution. The useful intervention is therefore feedback-conditioned repair, not reflection text alone. [[Reflexion, §4.3/Table 3]](https://arxiv.org/html/2303.11366)

4. **Tool documentation evidence has context-retrieval confounding.** The 200-tool CLI experiment retrieves and truncates documentation using TF-IDF. The result supports *documentation plus relevance filtering*, not stuffing a complete tool catalog into every request. It also uses renamed GCP commands and `gpt-3.5-turbo`, rather than contemporary production tool-calling interfaces. [[Tool Documentation, §§3–4]](https://arxiv.org/html/2308.00675)

5. **Planning evidence is architecture-and-training evidence.** Plan-and-Act changes module separation, base models, synthetic data, and training, so its 9.85→29.63 result cannot be attributed solely to an explicit plan prompt. No latency, token, or API-cost result was reported. [[Plan-and-Act, §§4–5]](https://arxiv.org/html/2503.09572)

6. **Final-state success can conceal unsafe or wasteful trajectories.** ReAct’s WebShop final grader measures purchase satisfaction, but does not price token/tool costs. API-Bank shows a model can appear capable at a simple call yet collapse on retrieval-plus-planning. Track per-stage validity, tool count, retries, and irreversible-action attempts beside success. [[API-Bank, §§3.3, 7]](https://arxiv.org/html/2304.08244)

## Operational decision table

| Failure pattern | First intervention | Do not add | Required evaluation signal |
|---|---|---|---|
| Answer depends on fresh or external facts | ReAct loop with observation citations or structured evidence IDs | Unbounded web/tool search | Evidence-to-claim coverage, invalid-tool-call rate, final task score |
| Agent chooses wrong tool from a large catalog | Retrieved concise docs and typed schemas | A long static tool list or generic examples | Top-k tool retrieval recall, chosen-tool correctness, argument validity |
| Agent loses goal/state over several steps | Compact explicit subgoal/state update after each observation | Full transcript repetition | State-consistency errors, duplicate actions, final-state success |
| Long-horizon task fails from ordering/decomposition | Bounded plan with replan only after material state change | A fixed plan that cannot absorb observations | Plan-step completion, replan count, success per action budget |
| Code/API execution has a deterministic verifier | One repair attempt using verifier output and a short failure memory | Self-critique with no test/error evidence | Repair uplift, false-pass rate, retries per solved task |
| Repeated tool calls, loops, or latency blowups | Enforce action, retry, token, wall-clock, and spend budgets | “Try again” without a budget | Success-at-budget curve and timeout/loop rate |
| Tool call is irreversible or externally consequential | Validate arguments and require explicit precondition checks | Autonomous retry after ambiguous failure | Unsafe-attempt rate and postcondition verification rate |

## Reusable paired evaluation artifact

Use the following as a minimum experiment contract. Run baseline and candidate on the **same frozen tasks, tool fixtures, model version, decoding, and seed list**. Reset state between runs.

```yaml
experiment: tool_prompt_change
baseline:
  scaffold: concise_tool_docs + structured_tool_results
candidate:
  scaffold: concise_tool_docs + structured_tool_results + react_state + one_verified_repair

fixed:
  model: "<provider/model-version>"
  temperature: 0
  seeds: [11, 29, 47, 71, 97]
  task_set: "<versioned held-out manifest>"
  tool_fixture_version: "<recorded API/database/browser snapshot>"
  max_actions: 12
  max_retries: 1
  max_input_tokens: 16000
  max_output_tokens: 6000
  max_wall_seconds: 90
  reset_state_per_task: true
  final_grader: "<deterministic final-state grader or blinded human rubric>"

trace_fields:
  - task_id
  - condition
  - seed
  - final_success
  - final_grader_reason
  - tool_selected
  - tool_schema_valid
  - tool_result_evidence_id
  - unsupported_final_claim
  - actions
  - retries
  - input_tokens
  - output_tokens
  - tool_latency_ms
  - wall_latency_ms
  - estimated_cost
  - timeout_or_budget_stop
  - irreversible_action_attempt

decision_rule:
  promote_only_if:
    - "paired final-success improvement has a bootstrap 95% CI whose lower bound is > 0"
    - "unsafe/unsupported/invalid-call rate does not increase"
    - "p95 latency and cost remain within declared SLOs"
    - "improvement remains on at least one held-out task family"
  diagnose_if:
    - "success rises but action count, retry count, or cost rises materially"
    - "tool validity improves but final success does not"
    - "gain appears only in best prompt/seed"
```

## Coverage and stop reason

- **R1: supported.** Direct measured evidence was retained for ReAct/action traces, observation grounding, documentation, planning, retry/reflection, and tool-retrieval failure.
- **R2: supported with qualification.** Strongest directly inspected constraints are within-study regressions and harness confounds. There was no retained independent replication with matched modern production models.
- **R3: qualified.** The operational rules and artifact are inference from the measured conditions, not directly benchmarked as a package.
- **Compute/cost:** No inspected source supplied comparable token, dollar, or end-to-end latency measurements. API-Bank alone reports annotation cost of **$8 per dialogue**. This is an evidence gap, not zero cost.
- **Stop reason:** saturation after primary sources supplied direct quantitative effects for each scoped intervention and a decisive negative reflection ablation plus tool-retrieval error analysis. Further retrieval was unlikely to make compatible cost claims, and broad recent-social research was excluded by scope.

## Retained-source appendix

1. Yao et al., **[ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/html/2210.03629v3)**. Inspected §3/Table 1–2, §4/Table 3–4, Appendix A/Table 5, and implementation conditions.  
2. Yao et al., **[ReAct implementation and prompts](https://github.com/ysymyth/ReAct)**. Inspected repository instructions confirming notebooks and 500-sample HotPotQA/FEVER evaluation practice.  
3. Shinn et al., **[Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/html/2303.11366)**. Inspected coding results, verifier-dependent ablation, and memory/test limits.  
4. Shinn et al., **[Reflexion logs and implementation](https://github.com/noahshinn/reflexion)**. Inspected trial configuration and logged-run availability.  
5. Hsieh et al., **[Tool Documentation Enables Zero-Shot Tool Usage with Large Language Models](https://arxiv.org/html/2308.00675)**. Inspected task setup, documentation/demo intervention, 200-tool CLI retrieval constraint, and findings.  
6. Li et al., **[API-Bank: A Comprehensive Benchmark for Tool-Augmented LLMs](https://arxiv.org/html/2304.08244)**. Inspected dataset/metric construction, model versions, Table 3, and error analysis.  
7. Kang et al., **[Plan-and-Act: Improving Planning of Agents for Long-Horizon Tasks](https://arxiv.org/html/2503.09572)**. Inspected planner/executor intervention, data-generation confounds, final-state success metric, and reported results.