## T1 — Production selection evidence: search, context placement, repair, and tool traces

**Status: partial.** Original studies were inspected. Findings are bounded to their benchmark models, tasks, prompts, and 2023-era APIs. No study establishes a universal prompt-technique ranking or a production total-cost result.

| Requirement | Exact question | Contribution |
|---|---|---|
| R1 | “Which techniques have measured effects, with exact task, model, comparator, results, method and measured compute/cost where available?” | Supplies measured contrasts and accounting. |
| R2 | “What strongest counterevidence, regressions and model/task transfer limits constrain adoption?” | Prevents benchmark results becoming general policy. |
| R3 | “What practical selection rules, failure signals and paired local evaluation follow?” | Converts bounded evidence into testable production choices. |

### 1. Tree-of-Thought: choose only where search corrects branching failures

[Tree of Thoughts (ToT)](https://arxiv.org/pdf/2305.10601), §4.1/Table 2 and Appendix B.3/Table 7, tested GPT-4 on 100 Game-of-24 cases. It generated intermediate equations, scored candidates `sure/maybe/impossible` three times, and used breadth-first search retaining beam `b=5`.

- **Result:** ToT `b=5` solved **74%**, versus single CoT **4.0%**, CoT self-consistency `k=100` **9.0%**, and best-of-100 CoT **49%**.
- **Token/cost accounting:** per Game-of-24 case, ToT used **5.5k completion / 1.4k prompt tokens**, **$0.74**, versus best-of-100 CoT **6.7k / 2.2k**, **$0.47**, and best-of-100 IO **1.8k / 1.0k**, **$0.13**. The paper states ToT can require **5–100×** more generated tokens than CoT, depending on prompt and search.
- **Selection rule:** use bounded search only if direct/CoT attempts fail because early irreversible choices produce invalid states and you can define intermediate states plus a useful evaluator. Track accepted-task cost, not token price alone.
- **Counterevidence:** the authors say ToT may be unnecessary for tasks GPT-4 already handles and evaluated only three relatively simple tasks. Its self-evaluator, model snapshot, puzzle structure, and 2023 prices do not transfer directly to production reasoning or tool workflows.

### 2. Long context: placement is an intervention, not a capacity claim

[Lost in the Middle](https://arxiv.org/pdf/2307.03172), §2.3/Figure 5/Table 1, varied the position of the sole answer-bearing document among **10, 20, and 30 retrieved documents** in multi-document QA. It compared LongChat-13B-16K, MPT-30B-Instruct, GPT-3.5-Turbo, GPT-3.5-Turbo-16K, Claude-1.3, and Claude-1.3-100K, with closed-book and single-document-oracle conditions.

- **Result:** performance was highest when the relevant document was first or last and lowest in the middle. For GPT-3.5-Turbo, the worst 20/30-document case dropped by **more than 20 percentage points** and below its **56.1%** closed-book accuracy. Its oracle accuracy with only the answer document was **88.3%**.
- **Long-window comparator:** when 10/20 documents fit both windows, GPT-3.5-Turbo and GPT-3.5-Turbo-16K curves were nearly superimposed. Merely increasing available context did not fix positional use.
- **Selection rule:** before increasing retrieval count or context budget, run a position sweep with production-like documents. Put the task contract and decisive evidence in an empirically tested salient location, preferably near boundaries, and do not treat advertised context length as usable-reasoning evidence.
- **Caveat:** this is controlled single-relevant-document QA and key-value retrieval, not a current model survey. It supports testing placement, not a universal “always put evidence last” rule.

### 3. Verifier-conditioned repair: repair only behind a trustworthy signal

[Reflexion](https://arxiv.org/pdf/2303.11366), §4/Table 1–2, uses generate → evaluate with generated unit tests → verbal reflection → regenerate. Its verifier signal is therefore generated test execution, not an independent oracle.

- **Result:** on HumanEval Python, Reflexion reached **91.0% Pass@1**, versus single-generation GPT-4 **80.1%**. On MBPP Python it regressed to **77.1%**, versus GPT-4 **80.1%**. On LeetCode Hard Python it reached **15.0%**, versus **7.5%** GPT-4 baseline.
- **Verifier diagnostic:** Table 2 reports HumanEval-Python test generation with **TP 0.99, FN 0.40, FP 0.01, TN 0.60** and MBPP-Python with **TP 0.84, FN 0.59, FP 0.16, TN 0.41**. The authors explicitly attribute MBPP regression to flaky or incorrect generated tests, which can incorrectly pass wrong solutions or fail correct ones.
- **Selection rule:** invoke repair after a deterministic validator, contract check, trusted test suite, or audited reviewer finding identifies a specific defect. Log verifier outcome, defect class, repair delta, and post-repair validation. Do not loop on generic “improve it” feedback.
- **Cost caveat:** the paper reports no comparable per-accepted-task token, latency, or API-cost accounting.

[Self-Refine](https://arxiv.org/pdf/2303.17651), §3–4/Table 1–2, corroborates the importance of feedback specificity but does **not** supply an external verifier. With ChatGPT, targeted feedback versus generic/no feedback scored **27.5/26.0/24.8** on code optimization, **43.2/31.2/0** on sentiment reversal, and, with GPT-3.5, **56.4/54.0/48.0** on acronym generation. This supports actionable diagnosis, not trusting the model’s self-critique as correctness evidence.

### 4. Staged tool-call traces: use for observable state and diagnosable failures

[ReAct](https://arxiv.org/pdf/2210.03629v3), §3/Table 1 and §3.2/Table 4, interleaves `Thought → Action → Observation`, using a Wikipedia API for QA/fact verification and interactive environments for decision tasks.

- **Tool-use result:** on ALFWorld, best ReAct success was **71%**, versus Act **45%** and BUTLER **37%**. Across six controlled trials, ReAct’s relative gain over Act ranged **33–90%**, averaging **62%**.
- **Counterexample:** on PaLM-540B HotpotQA/FEVER, ReAct alone scored **27.4 EM / 60.9% accuracy**, versus CoT **29.4 / 56.3** and CoT self-consistency **33.4 / 60.4**. Hybrid sequences did better: CoT-SC→ReAct **34.2 / 64.6**, ReAct→CoT-SC **35.1 / 62.0**.
- **Selection rule:** use staged traces when each action changes observable state or retrieves evidence and a wrong call can be classified from its action, arguments, observation, and subsequent reasoning. A trace is a diagnostic artifact, not evidence that the result is correct. Require final-state validation separately.
- **Failure signal:** if traces show repeated invalid arguments, stale-state assumptions, unsupported action selection, or loops, stop and repair the tool schema, state summary, examples, or validator before adding more reasoning tokens.
- **Caveat:** ReAct’s tool traces improve inspectability, but this paper does not measure production debugging time, incident reduction, total tool cost, or current-tool API robustness. Complex action spaces also needed more demonstrations and could exceed in-context limits.

## Minimal paired local evaluation

| Candidate | Hold fixed | Measure | Decision signal |
|---|---|---|---|
| Direct/CoT vs ToT | model, task set, validator, max retries, tool access | accepted-task rate, input/output/reasoning tokens, latency, total cost | Adopt ToT only if its accepted-task gain clears its additional accepted-task cost and latency. |
| Context placement A/B | same documents and answer, randomize answer-bearing item first/middle/last | final-state correctness by position | Do not expand context or retrieval depth if middle placement causes material loss. |
| One-shot vs verifier-repair | same initial output and deterministic validator | repair success, false-pass/false-fail rate, loops, incremental cost | Enable repair only when validator precision is adequate and a repair materially improves accepted outcomes. |
| Action-only vs staged trace | same tools, task set, action budget, final validator | task success, invalid-call rate, recovery rate, tool calls, diagnostic defect class | Keep staged traces when they reduce validated failures enough to justify token and latency overhead. |

## Evidence anchors

1. **Claim:** ToT improved GPT-4 Game-of-24 success to **74%**, but at **5.5k completion tokens** and **$0.74/case**.  
   **Source/locator:** [ToT](https://arxiv.org/pdf/2305.10601), Table 2; Appendix B.3/Table 7.  
   **Conditions/comparator:** 100 cases, BFS `b=5`, three value samples, versus CoT and best-of-100 CoT.  
   **Caveat:** puzzle benchmark, self-evaluation, 2023 model/prices.  
   **Question contribution:** R1 token accounting, R2 transfer limit, R3 search gate.

2. **Claim:** middle-position evidence can reduce GPT-3.5-Turbo QA by **>20 points**, below its **56.1%** closed-book result.  
   **Source/locator:** [Lost in the Middle](https://arxiv.org/pdf/2307.03172), §2.3/Figure 5/Table 1.  
   **Conditions/comparator:** 10/20/30 document multi-document QA, answer document position varied, versus closed-book and oracle.  
   **Caveat:** controlled retrieval setting and 2023 model versions.  
   **Question contribution:** R1 intervention condition, R2 context-window counterevidence, R3 placement test.

3. **Claim:** verifier-conditioned code repair improved HumanEval Python to **91.0%** but regressed MBPP Python to **77.1%**.  
   **Source/locator:** [Reflexion](https://arxiv.org/pdf/2303.11366), §4/Table 1–2.  
   **Conditions/comparator:** generated unit tests gate reflection and regeneration, versus single GPT-4 generation at **80.1%** on both benchmarks.  
   **Caveat:** generated tests have false positives/negatives and are not independent validation.  
   **Question contribution:** R1 measured repair, R2 regression mechanism, R3 validator gate.

4. **Claim:** targeted feedback outperformed generic/no feedback in iterative refinement.  
   **Source/locator:** [Self-Refine](https://arxiv.org/pdf/2303.17651), §4/Table 2.  
   **Result/unit:** ChatGPT code optimization **27.5 vs 26.0 vs 24.8**.  
   **Conditions/comparator:** specific actionable feedback versus generic and absent feedback.  
   **Caveat:** self-feedback, task-specific metrics, no external correctness verifier.  
   **Question contribution:** R1 repair ablation, R3 diagnostic specificity.

5. **Claim:** interleaved reasoning and actions improved ALFWorld success but did not dominate CoT on HotpotQA.  
   **Source/locator:** [ReAct](https://arxiv.org/pdf/2210.03629v3), §3/Table 1 and §3.2/Table 4.  
   **Result/unit:** ALFWorld **71% vs 45% Act**. HotpotQA **27.4 EM ReAct vs 29.4 CoT**.  
   **Conditions/comparator:** few-shot PaLM-540B, environment/Wikipedia observations.  
   **Caveat:** benchmark tools and demonstrations, no production diagnostic-cost measurement.  
   **Question contribution:** R1 staged-tool results, R2 task dependence, R3 trace-and-validator rule.