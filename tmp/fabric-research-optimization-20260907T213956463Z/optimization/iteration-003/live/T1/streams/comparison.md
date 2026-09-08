## T1 — ReAct and repair-loop evidence

**Status:** partial, researched to 2026-09-07. Scope is ReAct-style tool scaffolds and iterative repair/refinement, not a universal prompt ranking.

| Requirement | Contribution |
|---|---|
| R1: “Which techniques have measured effects, with exact task, model, comparator, results, method and measured compute/cost where available?” | Primary measured ReAct, Self-Refine, Reflexion, and budget-matched repair evidence below. |
| R2: “What strongest counterevidence, regressions and model/task transfer limits constrain adoption?” | ReAct prompt brittleness, self-feedback limitations, and equal-token repair evidence below. |
| R3: “What practical selection rules, failure signals and paired local evaluation follow?” | Bounded selection rules and evaluation artifact below. |

### Findings

- **ReAct is supported when actions retrieve or validate state, but not as a generally superior reasoning format.** In the original [ReAct paper, Table 1](https://arxiv.org/html/2210.03629v3#S3.T1), PaLM-540B ReAct improved over action-only prompting on HotpotQA EM (27.4 vs. 25.7) and FEVER accuracy (60.9 vs. 58.9). It was worse than CoT on HotpotQA (27.4 vs. 29.4), though better on FEVER (60.9 vs. 56.3). The combined methods were strongest in that experiment: ReAct→CoT-SC 35.1 EM on HotpotQA and CoT-SC→ReAct 64.6% FEVER accuracy.
- **In interactive tasks, original ReAct results were substantial but benchmark-specific.** In [Table 3](https://arxiv.org/html/2210.03629v3#S4.T3), ALFWorld average success was 57% for ReAct versus 45% for Act. In [Table 4](https://arxiv.org/html/2210.03629v3#S4.T4), WebShop success was 40.0% for ReAct versus 30.1% Act. Those are environment-success units, not transferable text-quality gains.
- **ReAct’s operating cost is trajectory-dependent.** The original study does not report token or dollar cost. A later controlled ReAct sensitivity study reports about **14 million input tokens and 150,000 output tokens for 134 ALFWorld instances**, driven by re-sending the prompt after actions ([Appendix A / experiment notes](https://arxiv.org/html/2405.13966#A2)). This is evidence of context-replay cost in that harness, not a universal ReAct cost.
- **Self-Refine measured gains against one-pass generation, with up to four feedback–refine rounds.** The original [Self-Refine §3.1 and Table 1](https://arxiv.org/html/2303.17651#S3) compares each model with its own one-pass output on seven tasks, using GPT-3.5, ChatGPT, GPT-4, and Codex. GPT-4 code-optimization performance rose from 27.3% to 36.0%, an 8.7-point gain. The method retains previous outputs and feedback in the refine prompt, so both call count and prompt length grow by iteration.
- **Repair helps most when the feedback is specific and externally checkable.** In [Self-Refine §4](https://arxiv.org/html/2303.17651#S4), ChatGPT code-optimization score fell from 27.5 with actionable feedback to 26.0 with generic feedback and 24.8 with no feedback. The same paper reports that math gains were modest because the model often failed to detect errors, with ChatGPT returning “everything looks good” for 94% of instances; oracle error identification produced gains above 5 points ([§3.3](https://arxiv.org/html/2303.17651#S3.SS3)).
- **Reflexion has positive results where executable feedback is informative, but its own authors document failure under exploration demand.** The [Reflexion programming results and analysis](https://arxiv.org/html/2303.11366#S4.SS3) report 91% overall HumanEval Python accuracy with GPT-4 and a 1.4% false-positive internal-test rate, versus 16.3% false positives on MBPP Python. In its [WebShop limitation](https://arxiv.org/html/2303.11366#A2.SS1), a two-shot ReAct+Reflexion agent was stopped after four trials in 100 environments because it showed no improvement and generated unhelpful reflections. The paper concludes it could not solve tasks requiring substantial diversity and exploration.
- **Equal-budget counterevidence materially changes the repair decision.** [Sample More, Reflect Less §4–5](https://arxiv.org/html/2607.28576#S4) tested Qwen2.5 1.5B, 3B, and 7B on 150 GSM8K and 150 MATH-500 questions per setting, comparing actual generated-token cost to a self-consistency curve. Self-Refine used three critique/revise rounds, seven calls. Forced Reflexion also used seven calls. At 7B, these methods were **3.6–10.1 percentage points below** equal-completion-token sampling baselines. At 1.5B, published-procedure Reflexion self-assessed “correct” on every question and never retried. This is direct counterevidence for unvalidated self-repair on small open mathematical-reasoning models, not evidence against externally verified repair or frontier models.
- **ReAct’s apparent benefit can be dominated by exemplar design.** [Bhattacharya et al., Table 1](https://arxiv.org/html/2405.13966#S5.T1) evaluated six ALFWorld task types. GPT-3.5-Instruct base ReAct averaged 44.7% success, while a non-interleaved exemplar-CoT variant reached 61.9%; GPT-4 base ReAct was 23.3% versus 43.3%. In their controlled prompt changes, replacing task-matched exemplars caused collapse: GPT-3.5-Turbo exemplar-CoT declined from 46.6% success to 28.3% with one mismatched exemplar and 10.4% with both mismatched ([Appendix B.4](https://arxiv.org/html/2405.13966#A2.SS4)). This study is limited to ALFWorld and relatively small GPT-4/Claude samples, 60 instances each.

### Operational selection rules

| Decision condition | Prefer | Avoid or escalate when |
|---|---|---|
| The task requires current facts or stateful tools, and tool observations directly constrain next actions | ReAct-like action–observation loop with explicit action schema | Search/tool observations are low-value, stale, or frequently empty. Original ReAct attributes 23% of its analyzed HotpotQA failures to uninformative search ([Table 2](https://arxiv.org/html/2210.03629v3#S3.T2)). |
| Candidate output has an executable validator, test failure, compiler trace, or deterministic checker | Bounded repair loop using validator output and acceptance only on re-validation | The validator is only a weak proxy, or a repaired state can replace a previously valid state without a final validator. |
| Quality is multi-constraint but feedback can name violated constraints | One or two feedback–revise rounds, retain best validator-scored candidate | Feedback becomes generic, repeatedly says “correct,” or quality dimensions trade off. |
| No external feedback exists and the objective is exact reasoning | Compare repair against equal-token repeated sampling/self-consistency before adoption | Do not infer repair value from comparison with a single first attempt. |
| Few-shot ReAct exemplars are needed | Treat examples, prompt placement, tool schema, and context budget as part of the scaffold version | Exemplar/query similarity changes, model version changes, or invalid actions rise. Re-run paired evaluation. |

### Minimal paired local evaluation artifact

```text
Population: representative accepted and failed production tasks.

Arms, randomized per task:
A. Current one-pass / current action scaffold.
B. ReAct or repair scaffold.
C. Equal-total-token alternative: repeated independent candidates with the same
   input, output, tool, retry, and verifier budget as B.

Hold fixed: model snapshot, tools, tool permissions, retrieval corpus, task
instructions, context window, max actions, timeout, validator, and acceptance rule.

Record per task:
- final validator acceptance
- harmful regression from an initially accepted state
- retries/actions, input and output tokens, tool calls, wall-clock latency
- failure class: invalid action, empty/stale observation, generic critique,
  false “correct,” validator failure, context overflow
- total cost per accepted task, including retries and verification

Decision rule:
Adopt B only if its acceptance gain over both A and C is material for the
product threshold and it does not worsen harmful-regression rate or accepted-task
cost beyond the stated limit. Otherwise retain C or one-pass A.
```

## Counterevidence and transfer limits

1. **Comparator confounding:** Self-Refine’s original gains are primarily versus one-pass generation, while each repair round adds calls and growing context. Equal-token comparisons are required before attributing improvement to reflection.
2. **Feedback competence is the bottleneck:** [Is Self-Repair a Silver Bullet?](https://ar5iv.labs.arxiv.org/html/2306.09896#S4) found that for GPT-4 on APPS, 10 initial samples plus one repair each achieved 1.05× pass@20, while two initial samples plus 10 repairs each achieved only 0.97× pass@22. Replacing GPT-4 self-feedback with human feedback increased repaired-program pass rate from 33.3% to 52.6%.
3. **Self-bias:** [Xu et al.](https://aclanthology.org/2024.acl-long.826/) report self-bias across six models and three task families. Their conclusion is that self-refinement can improve fluency and understandability while amplifying preference for the model’s own output. This supports external or independently generated feedback where correctness matters.
4. **ReAct result conditions differ:** Original ReAct used PaLM-540B, fixed benchmark APIs/simulators, and task-specific few-shot trajectories. Its scores do not measure present-model tool reliability, latency, production tool risk, or generalized planning ability.
5. **Counterevidence scope differs:** The 2026 equal-token study uses Qwen2.5 1.5B–7B on exact-answer math and completion-token cost, not APIs, retrieval agents, full input-token cost, or frontier models. It restricts the claim to its tested conditions.

## Evidence anchors

| Claim | Source and locator | Result / unit | Conditions | Comparator | Caveat | Question contribution |
|---|---|---:|---|---|---|---|
| ReAct improves action-only prompting on two knowledge tasks but not CoT on HotpotQA | [Yao et al., ReAct Table 1](https://arxiv.org/html/2210.03629v3#S3.T1) | HotpotQA EM: ReAct 27.4, Act 25.7, CoT 29.4. FEVER accuracy: ReAct 60.9, Act 58.9, CoT 56.3 | PaLM-540B, prompting, Wikipedia API | Act and CoT | Benchmark/API/model-specific | R1, R2 |
| ReAct improves ALFWorld and WebShop success | [ReAct Tables 3–4](https://arxiv.org/html/2210.03629v3#S4) | ALFWorld 57% vs 45% Act. WebShop 40.0% vs 30.1% Act | Simulated interactive environments | Act | Environment success, no cost report | R1 |
| ReAct has groundedness/flexibility failure trade-off | [ReAct Table 2 and §3.3](https://arxiv.org/html/2210.03629v3#S3.SS3) | ReAct reasoning errors 47%; non-informative search 23% of failures | 50 manually sampled trajectories per method | CoT | Manual classification and small sample | R2, R3 |
| ReAct prompt replay can dominate input cost | [Bhattacharya et al., Appendix A](https://arxiv.org/html/2405.13966#A2) | ~14M input and 150K output tokens for 134 instances | ALFWorld sensitivity study | No general token baseline | One harness, repeated prompt context | R1, R3 |
| Self-Refine improves GPT-4 code optimization | [Madaan et al., §3.1–3.3](https://arxiv.org/html/2303.17651#S3) | 27.3% to 36.0%, +8.7 points | GPT-4, up to four feedback/refine rounds | Same model, one-pass generation | Extra calls/context not budget-matched | R1, R2 |
| Specific feedback matters; self-detection can fail | [Self-Refine §4](https://arxiv.org/html/2303.17651#S4) | Code optimization 27.5 actionable, 26.0 generic, 24.8 no feedback; 94% “everything looks good” in cited math analysis | ChatGPT/GPT-3.5 task-specific prompts | Generic/no-feedback variants | Different metrics and tasks | R1, R2, R3 |
| Reflexion fails where diverse exploration is required | [Shinn et al., WebShop limitation](https://arxiv.org/html/2303.11366#A2.SS1) | No improvement after four trials, stopped in 100 environments | Two-shot ReAct+Reflexion WebShop | Its own prior trials | Early-stopped qualitative outcome | R2, R3 |
| ReAct performance is highly exemplar-sensitive | [Bhattacharya et al., Table 1 and Appendix B.4](https://arxiv.org/html/2405.13966#S5.T1) | GPT-3.5-Instruct 44.7% base vs 61.9% non-interleaved CoT; GPT-3.5-Turbo 46.6% matched vs 10.4% two mismatched exemplars | ALFWorld, temperature 0, 134 GPT-3.5 / 60 GPT-4 and Claude instances | Prompt-only variants | Single planning domain, small expensive-model samples | R2, R3 |
| Reflection loses to repeated sampling at equal completion-token cost | [Sample More, Reflect Less §§4–6](https://arxiv.org/html/2607.28576#S4) | At 7B, Self-Refine and forced Reflexion 3.6–10.1 points below equal-cost sampling; 1.5B Reflexion never retried | Qwen2.5 1.5B/3B/7B, GSM8K and MATH-500, 150 questions each | Self-consistency curve matched to actual completion tokens | No frontier models, input tokens or agent tools | R1, R2, R3 |
| Repair budget should favor diverse initials over deep self-repair | [Inala et al., §4](https://ar5iv.labs.arxiv.org/html/2306.09896#S4) | GPT-4 APPS: 10 initial + 1 repair 1.05× pass@20; 2 initial + 10 repairs 0.97× pass@22 | Python HumanEval/APPS, executable tests | Equal-sample i.i.d. baseline | Programming tasks with test access | R1, R3 |