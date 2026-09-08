# RESEARCH.md — Production prompt-technique selection

**Research date:** 2026-09-07  
**Status:** Blocked for evidence-validated adoption decisions.

The supplied verification record accepts no material evidence anchors because it did not inspect the source notes or original sources. Therefore, the quantitative findings below are preserved as **unverified sourced claims**, not accepted findings or a universal ranking. Do not adopt a technique from this report without reproducing the paired local evaluation.

## Scope and decision

Scope: prompting and scaffold/context boundaries for production text, reasoning, and tool-using LLMs. Excludes aesthetic image/video prompting.

The candidate techniques address different failure modes:

| Failure mode | Candidate technique | Provisional selection rule | Escalation signal |
|---|---|---|---|
| Early branching choices invalidate later work | Tree-of-Thought search | Use only with meaningful intermediate states and an evaluator. | Direct/CoT already succeeds, or state scoring is unreliable. |
| Relevant evidence is buried in context | Retrieval/context placement | Test placement before increasing retrieval depth or context length. | Material first/middle/last performance gap. |
| A validator identifies a concrete defect | Validator-conditioned repair | Repair only from deterministic or trusted diagnostic feedback, then revalidate. | False passes/fails, generic feedback, or repair loops. |
| Actions retrieve state or change an observable environment | ReAct-style action traces | Use explicit action schemas and final-state validation. | Invalid calls, stale observations, loops, or low-value search. |
| No external correctness signal exists | Diverse sampling baseline | Compare against equal-budget independent sampling. | Reflection loses to equal-token sampling. |

## Evidence by question

### R1. Measured effects, conditions, and cost

All anchors in this section are **excluded from accepted evidence** pending original-source inspection. They are rendered to preserve their source-bound conditions and comparators.

| Technique and source | Method, task, model | Result and comparator | Cost or accounting | Applicability and caveat |
|---|---|---|---|---|
| [Tree of Thoughts](https://arxiv.org/pdf/2305.10601), §4.1/Table 2, Appendix B.3/Table 7 | GPT-4, 100 Game-of-24 cases. Intermediate equations were scored `sure/maybe/impossible` three times. Breadth-first search retained beam `b=5`. | ToT solved **74%**, versus single CoT **4.0%**, CoT self-consistency `k=100` **9.0%**, and best-of-100 CoT **49%**. | Per case: ToT **5.5k completion / 1.4k prompt tokens**, **$0.74**. Best-of-100 CoT: **6.7k / 2.2k**, **$0.47**. Best-of-100 IO: **1.8k / 1.0k**, **$0.13**. The paper reports ToT may use **5–100×** more generated tokens than CoT. | Puzzle search with a self-evaluator and 2023 prices. Not production reasoning or tool-use cost evidence. |
| [Lost in the Middle](https://arxiv.org/pdf/2307.03172), §2.3/Figure 5/Table 1 | Multi-document QA with the sole answer-bearing document placed among **10, 20, or 30** retrieved documents. Models: LongChat-13B-16K, MPT-30B-Instruct, GPT-3.5-Turbo, GPT-3.5-Turbo-16K, Claude-1.3, Claude-1.3-100K. | Relevant documents first or last performed best and middle placement worst. GPT-3.5-Turbo’s worst 20/30-document condition fell **more than 20 percentage points**, below its **56.1%** closed-book accuracy. Single-document oracle accuracy was **88.3%**. GPT-3.5-Turbo and GPT-3.5-Turbo-16K had nearly superimposed curves where 10/20 documents fit both windows. | No production cost measurement. | Controlled QA/key-value retrieval and 2023 model versions. It supports placement testing, not a universal boundary-placement rule. |
| [Reflexion](https://arxiv.org/pdf/2303.11366), §4/Tables 1–2 | Generate → generated-unit-test evaluation → verbal reflection → regenerate. | GPT-4 HumanEval Python: **91.0% Pass@1** versus single-generation **80.1%**. MBPP Python: **77.1%** versus **80.1%**, a regression. LeetCode Hard Python: **15.0%** versus **7.5%**. | No comparable accepted-task token, latency, or API-cost result. | Generated tests are not independent validation. Reported test-generation diagnostics: HumanEval TP **0.99**, FN **0.40**, FP **0.01**, TN **0.60**. MBPP TP **0.84**, FN **0.59**, FP **0.16**, TN **0.41**. |
| [Self-Refine](https://arxiv.org/pdf/2303.17651), §3–4/Tables 1–2 | Up to four feedback–refine rounds retaining prior output and feedback. GPT-3.5, ChatGPT, GPT-4, and Codex across seven tasks. | GPT-4 code optimization: **27.3% → 36.0%**, +**8.7 points**, versus that model’s one-pass result. ChatGPT code-optimization feedback ablation: actionable **27.5**, generic **26.0**, none **24.8**. Sentiment reversal: **43.2/31.2/0**. GPT-3.5 acronym generation: **56.4/54.0/48.0**. | Calls and prompt context grow per iteration. No equal-budget operating-cost result. | Self-feedback is not an external correctness verifier. In cited math analysis, ChatGPT said “everything looks good” for **94%** of cases. |
| [ReAct](https://arxiv.org/html/2210.03629v3#S3.T1), Table 1 | PaLM-540B with Wikipedia API, interleaving Thought → Action → Observation. | HotpotQA EM: ReAct **27.4**, Act **25.7**, CoT **29.4**, CoT self-consistency **33.4**. FEVER accuracy: ReAct **60.9%**, Act **58.9%**, CoT **56.3%**, CoT self-consistency **60.4%**. Hybrids: CoT-SC→ReAct **34.2 EM / 64.6%** and ReAct→CoT-SC **35.1 EM / 62.0%**. | No token or dollar cost reported. | Benchmark API and few-shot trajectories do not establish current production tool reliability. |
| [ReAct](https://arxiv.org/html/2210.03629v3#S4), Tables 3–4 | Interactive benchmark environments. | ALFWorld average success: **57%** ReAct versus **45%** Act. WebShop: **40.0%** ReAct versus **30.1%** Act. A separate reported best ALFWorld ReAct result was **71%**, versus **45%** Act and **37%** BUTLER. | No production total-cost result. | Environment success is not text-quality or general planning evidence. |
| [Bhattacharya et al.](https://arxiv.org/html/2405.13966#A2), Appendix A | ReAct sensitivity harness, 134 ALFWorld instances. | Context replay consumed about **14 million input tokens** and **150,000 output tokens**. | This is a harness-specific replay cost, not a general ReAct cost. | Re-sending context after actions can dominate input-token usage. |
| [Sample More, Reflect Less](https://arxiv.org/html/2607.28576#S4), §§4–6 | Qwen2.5 1.5B, 3B, 7B on 150 GSM8K and 150 MATH-500 questions per setting. Self-Refine and forced Reflexion used seven calls. | At 7B, Self-Refine and forced Reflexion were **3.6–10.1 percentage points below** equal-completion-token sampling baselines. At 1.5B, published-procedure Reflexion self-assessed every response as correct and never retried. | Comparator matched actual completion-token cost, not full input-token or tool cost. | Small open models, exact-answer math, no retrieval/tool agents or frontier models. |
| [Is Self-Repair a Silver Bullet?](https://ar5iv.labs.arxiv.org/html/2306.09896#S4), §4 | GPT-4 programming experiments with executable tests. | Ten initial samples plus one repair achieved **1.05× pass@20**. Two initial samples plus ten repairs achieved **0.97× pass@22**. Human feedback increased repaired-program pass rate from **33.3%** to **52.6%**. | Budget is expressed through sample/repair allocation rather than full operating cost. | Programming tasks with test access. |

### R2. Counterevidence and transfer limits

1. **Search is not free or generally necessary.** ToT’s gain was measured on Game-of-24 with a self-evaluator. The source itself limits evaluation to three relatively simple tasks and notes that ToT may be unnecessary when GPT-4 already solves the task.

2. **More context is not necessarily better context.** The long-context study found position sensitivity even when a longer context window was available. It does not establish current-model behavior or a rule to always place evidence first or last.

3. **Repair quality depends on feedback validity.** Reflexion’s MBPP regression is attributed to flaky or incorrect generated tests. Self-Refine’s one-pass comparator confounds reflection with added calls and growing context. Equal-token results from [Sample More, Reflect Less](https://arxiv.org/html/2607.28576#S4) show self-repair can lose to repeated sampling.

4. **Self-feedback can reinforce model preference.** [Xu et al.](https://aclanthology.org/2024.acl-long.826/) report self-bias across six models and three task families. The reported implication is that self-refinement may improve fluency and comprehensibility while amplifying preference for the model’s own output.

5. **ReAct is task and exemplar sensitive.** [Bhattacharya et al.](https://arxiv.org/html/2405.13966#S5.T1) report ALFWorld GPT-3.5-Instruct base ReAct at **44.7%** versus a non-interleaved exemplar-CoT variant at **61.9%**. GPT-4 base ReAct was **23.3%** versus **43.3%**. For GPT-3.5-Turbo, exemplar-CoT declined from **46.6%** with matched examples to **28.3%** with one mismatched example and **10.4%** with two mismatched examples. This was one planning domain with 134 GPT-3.5 and 60 GPT-4/Claude instances.

6. **Tool traces do not prove correctness.** In [ReAct Table 2](https://arxiv.org/html/2210.03629v3#S3.T2), **23%** of analyzed HotpotQA failures involved non-informative search, and **47%** involved reasoning errors. Tool observations need final-state validation.

## R3. Operational rules and reusable local evaluation

### Selection and failure rules

- Use search only when a direct or CoT baseline fails from early, irreversible branching and intermediate-state scoring is meaningful.
- Treat context layout as a controlled input. Test task-contract and decisive-evidence placement before expanding retrieval count or context budget.
- Run repair only after a deterministic validator, trusted test suite, contract check, or audited reviewer identifies a specific defect. Preserve the best validated candidate and revalidate every repair.
- Prefer equal-budget diverse candidates when correctness feedback is unavailable or self-critique is generic.
- Use staged action traces where observations constrain the next action. Require typed action schemas, state summaries, bounded action budgets, and final-state validation.
- Stop and repair the scaffold when invalid arguments, stale-state assumptions, empty observations, unsupported actions, context overflow, generic critiques, false “correct” judgments, or loops recur.

### Paired evaluation artifact

```text
Population: representative production tasks, including accepted and failed cases.

Randomized arms:
A. Current direct/CoT or action-only scaffold.
B. Candidate: ToT, placement change, verifier-repair, or staged trace.
C. Equal-total-budget alternative: independent sampling/self-consistency using
   the same model, tools, retry allowance, verifier, and total token budget as B.

Hold fixed:
- model snapshot and decoding settings
- task instructions, retrieval corpus, and tool permissions
- context window, max actions/retries, timeout, and acceptance rule
- deterministic validator or blinded review protocol

Record per task:
- final validator acceptance and harmful regression from an accepted state
- correctness by evidence position for placement tests
- input, output, and reasoning tokens
- tool calls, retries, loops, wall-clock latency, and total cost per accepted task
- failure class: invalid action, stale/empty observation, context overflow,
  generic critique, false “correct,” false validator result, or unresolved defect

Decision:
Adopt B only when it improves accepted-task outcomes over both A and C by the
product’s stated threshold without exceeding its accepted-task cost, latency, or
harmful-regression limit. Otherwise retain A or C. No universal threshold is
established here.
```

## Coverage and stop reason

| Requirement | Coverage | Disposition |
|---|---|---|
| R1: measured effects, methods, comparators, and cost | Candidate anchors preserve exact reported conditions, metrics, and available accounting. | **Blocked:** no anchor was independently accepted in the supplied verification record. |
| R2: counterevidence, regressions, and transfer limits | Candidate notes include regression, budget-matched, exemplar-sensitivity, and self-bias evidence. | **Blocked:** source inspection is required before using these as decision-grade constraints. |
| R3: selection rules, failure signals, and local evaluation | A concrete paired evaluation is supplied. | **Qualified:** it is a proposed operational artifact, not a measured production result. |

**Stop reason:** Original-source retrieval and independent source-note verification were unavailable under the supplied verification record. The highest-impact next check is source-by-source inspection of the anchors below, beginning with equal-budget repair comparisons and the target model’s placement/tool-use evaluation.

## Source appendix

| Source | Type and date | Evidence form | Supported claim in this report | Important limitation |
|---|---|---|---|---|
| [Tree of Thoughts](https://arxiv.org/pdf/2305.10601) | Research paper, 2023 | GPT-4 Game-of-24 benchmark and token/cost tables | Search improved Game-of-24 success with higher cost. | Puzzle task, self-evaluation, 2023 prices. |
| [Lost in the Middle](https://arxiv.org/pdf/2307.03172) | Research paper, 2023 | Controlled document-position QA experiment | Evidence placement can materially affect QA accuracy. | Not a current-model or production retrieval survey. |
| [Reflexion](https://arxiv.org/pdf/2303.11366) | Research paper, 2023 | Generated-test-conditioned code repair benchmarks | Repair can improve HumanEval and regress on MBPP. | Generated tests are not independent validators. |
| [Self-Refine](https://arxiv.org/pdf/2303.17651) | Research paper, 2023 | Iterative feedback/refinement and feedback ablations | Specific feedback outperformed generic/no feedback in reported tasks. | Mostly one-pass comparators and self-feedback. |
| [ReAct](https://arxiv.org/html/2210.03629v3) | Research paper, 2023 | PaLM-540B QA and interactive-agent benchmarks | Action-observation traces help some environments but do not dominate CoT on HotpotQA. | Fixed benchmark APIs, demonstrations, and model. |
| [Bhattacharya et al.](https://arxiv.org/html/2405.13966) | Research paper, 2024 | ALFWorld ReAct sensitivity and context-replay experiments | ReAct behavior and input cost can be exemplar/harness sensitive. | Single planning domain and limited expensive-model samples. |
| [Sample More, Reflect Less](https://arxiv.org/html/2607.28576) | Research paper, 2026 | Equal-completion-token math comparison | Self-repair can lose to repeated sampling at equal completion-token cost. | Small Qwen models, math tasks, no full input/tool accounting. |
| [Is Self-Repair a Silver Bullet?](https://ar5iv.labs.arxiv.org/html/2306.09896) | Research paper, 2023 | GPT-4 programming repair-budget allocation | Diverse initial candidates can outperform deep self-repair. | Programming with executable tests. |
| [Xu et al.](https://aclanthology.org/2024.acl-long.826/) | ACL research paper, 2024 | Six-model, three-task-family self-bias study | Self-refinement may amplify preference for a model’s own output. | Does not establish exact-production correctness impact. |