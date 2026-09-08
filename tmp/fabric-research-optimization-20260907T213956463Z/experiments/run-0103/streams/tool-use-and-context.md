# Tool-use and context scaffold research note

## Question, scope, and status

**Question:** Which tool-using-agent and context/scaffold techniques have measured effects, where do they regress or fail to transfer, and what local evaluation should select production defaults?

**Scope:** Text/reasoning/tool-using LLMs only. Examined primary papers for interleaved reasoning/action, tool-description retrieval, context placement, and indirect prompt-injection limits. Research cut-off supplied: **2026-09-07**.

**Status:** **Partial.** Strong direct evidence covers the requested mechanism classes, but not a universal comparison. Reported dollar cost and end-to-end latency are sparse and benchmarks use materially different models, tools, tasks, and graders.

## Requirement contract

| ID | Exact question | Required inclusions | Expected final-report contribution | Decision context | Status |
|---|---|---|---|---|---|
| R1 | Which techniques have measured effects, with exact task, model, comparator, results, method and measured compute/cost where available? | measured effect; exact task/model/comparator/result/method; compute or cost where reported | Technique evidence and comparability-qualified quantitative table. | Choose production prompting/scaffold defaults without a universal ranking. | Qualified: measured effects are supported. Cost and latency are often unreported. |
| R2 | What strongest counterevidence, regressions and model/task transfer limits constrain adoption? | negative or regressive results; model/task/context transfer limits; conditions that overturn adoption | Counterevidence and limitation analysis. | Avoid deploying prompts whose gains do not transfer to the target workload. | Supported. |
| R3 | What practical selection rules, failure signals and paired local evaluation follow? | operational selection rules; failure signals; paired local evaluation artifact | Operational decision table and reusable evaluation protocol. | Run an evidence-sensitive local choice among candidate prompting approaches. | Supported as an evidence-based evaluation design, not as a claim of universal benchmark superiority. |

## Findings

### Measured evidence, not rankable across studies

| Technique | Task, model, method and comparator | Measured outcome | Budget, cost, and qualification |
|---|---|---|---|
| **Interleaved Thought–Action–Observation (ReAct)** | [ReAct, Table 1 and §§3–4](https://arxiv.org/abs/2210.03629): PaLM-540B, question-only HotpotQA and FEVER with a constrained Wikipedia API. ReAct used manually authored trajectories: six HotpotQA and three FEVER examples. Compared with Standard, CoT, 21-sample CoT self-consistency, and Act-only prompts. | HotpotQA EM: Standard 28.7, CoT 29.4, Act 25.7, ReAct 27.4. Hybrid ReAct→CoT-SC reached **35.1**, versus CoT-SC 33.4. FEVER accuracy: ReAct **60.9**, CoT 56.3, Act 58.9. | CoT-SC used **21 sampled trajectories** at temperature 0.7. More examples did not improve in their setup. No dollar cost or latency reported. Pure ReAct was not the best HotpotQA configuration. |
| **Sparse reasoning plus tool feedback in interactive tasks** | [ReAct, §§4.1–4.2](https://arxiv.org/pdf/2210.03629): PaLM-540B with one or two in-context examples, tool/environment observations, against Act-only and earlier trained methods on ALFWorld and WebShop. | ALFWorld: ReAct best prompt **71%** success, Act-only 45%, BUTLER 37%. WebShop: ReAct **40.0%** success and 66.6 score, Act-only 30.1% and 62.3, IL+RL 28.7% and 62.4. | The paper attributes gains partly to observations enabling plan revision and exception handling. It does not isolate a general “repair prompt” from its reasoning format, action interface, and demonstrations. |
| **Retrieved tool descriptions** | [Gorilla, Tables 1–2, §4](https://arxiv.org/abs/2305.15334): LLaMA-7B-derived Gorilla, APIBench single-call generation over 95 TorchHub, 696 TensorHub, and 925 Hugging Face APIs. Comparators include GPT-3.5, GPT-4, Claude, LLaMA, with no retrieval, BM25, GPT-Index, and oracle documentation. Metric is AST-subtree match, plus hallucination/error. | Gorilla without retrieval: TorchHub **59.13%**, Hugging Face **71.68%**, TensorHub **83.79%**. But Gorilla with BM25 fell to 40.32%, 17.03%, and 41.89%; with GPT-Index, 61.82%, 47.46%, and 64.96%. Oracle descriptions produced 67.20%, 91.26%, and 94.16%. | Finetuning used 8×A100 40GB GPUs for five epochs, but no training-duration, token, dollar-cost, or serving-latency figure. This is single-call API selection, not long-horizon tool execution. |
| **Context position and retrieval volume** | [Lost in the Middle, Tables 1, Figures 5 and 7, §§2–5](https://aclanthology.org/2024.tacl-1.9/): NaturalQuestions-Open multi-document QA, with one answer passage among 10/20/30 documents, and synthetic key-value retrieval with 75/140/300 pairs. Models include GPT-3.5-Turbo-0613, GPT-3.5-Turbo-16K-0613, Claude-1.3/100K, LongChat-13B-16K, and MPT-30B-Instruct. | Relevant information at the beginning or end outperformed middle placement. GPT-3.5-Turbo’s worst 20/30-document middle positions fell **over 20 points** and below its 56.1% closed-book baseline. Increasing retrieved documents from 20 to 50 yielded only about **+1.5%** for GPT-3.5-Turbo and **+1%** for Claude-1.3. | Greedy decoding. The authors did not run full GPT-4 evaluation because it was estimated to cost **over $6,000**. Query before and after the data made synthetic key-value retrieval near-perfect, but minimally changed multi-document-QA position effects. |
| **Indirect prompt injection is a tool-agent limit, not merely a prompt-format problem** | [InjecAgent, Table 3 and §§3–4](https://aclanthology.org/2024.findings-acl.624/): 1,054 cases, 17 user tools, 62 attacker tools. GPT-4-0613 ReAct prompting versus GPT-4 function-calling configuration. | ReAct-prompted GPT-4 attack success was **23.6%** under base attacks and **47.0%** under enhanced attacks. Function-calling was lower at **6.6%** and **7.1%**, not zero. | No deployment cost or latency reported. The result is an indirect-injection benchmark, not benign tool-task utility. |
| **Security–utility trade-off under tool-agent injection** | [AgentDojo, Tables 2–3 and §§4–5](https://proceedings.neurips.cc/paper_files/paper/2024/file/97091a5177d8dc64b1da8bf3e1f6fb54-Paper-Datasets_and_Benchmarks_Track.pdf): 97 realistic tasks, 70 tools, and 629 security cases. | Baseline GPT-4o benign utility was 69.00% with targeted attack success 47.69%. In the GPT-4o defense comparison, a detector reduced attack success from 57.69% to 7.95% but benign utility to 41.49%. Tool filtering reduced it to 6.84% while retaining 73.13% utility. | No cost or latency reported. This is evidence for capability-scoped controls, not evidence that every tool filter transfers to a different permission model. |

## Analysis

### Documented facts

1. **ReAct is not a universal replacement for CoT.** On its HotpotQA setup, pure ReAct underperformed CoT, while a hybrid that combines ReAct with self-consistency performed best. The study therefore supports interleaving tool observations with reasoning when external evidence matters, not a blanket “always use ReAct” default. [ReAct, Table 1](https://arxiv.org/pdf/2210.03629)

2. **Tool descriptions help only when selection quality is adequate.** Gorilla’s oracle-documentation results show available upside, while BM25 and GPT-Index regressions show that appending poorly selected descriptions can materially degrade invocation accuracy. [Gorilla, Tables 1–2](https://arxiv.org/pdf/2305.15334)

3. **More context is not equivalent to more usable context.** The position effect persisted for extended-window variants, and additional retrieved documents produced small gains after saturation. [Lost in the Middle, §§2–5](https://aclanthology.org/2024.tacl-1.9/)

4. **Textual tool feedback is not trusted control data.** Injection benchmarks show that untrusted content returned through tools can redirect a ReAct-style agent. Structured function calling reduces, but does not eliminate, the observed attack rate. [InjecAgent, Table 3](https://aclanthology.org/2024.findings-acl.624/)

### Inference for production selection

Use a **minimal tool loop** as the default: explicit task state, concise selected tool descriptions, structured tool results, bounded retries, and a visible stop condition. Add planning/search only when paired evaluation shows a success gain greater than its token, latency, and failure cost.

Place task-critical instructions and the current objective at a prompt boundary. Do not bury them amid retrieved documents or long tool history. Treat retrieved text and tool output as untrusted data, never as authority to modify policy or permissions.

## Counterevidence and transfer limits

- **C1 — ReAct regression:** ReAct’s 27.4 HotpotQA EM was below CoT’s 29.4. The winning 35.1 result added a 21-sample self-consistency stage, so it also added inference work and is not a like-for-like low-latency default. [ReAct, Table 1](https://arxiv.org/pdf/2210.03629)

- **C2 — Retrieval can be actively harmful:** Gorilla’s BM25 retrieval was substantially worse than zero-shot Gorilla on every reported API source. This overturns “always append retrieved documentation” when retrieval precision is weak. [Gorilla, Tables 1–2](https://arxiv.org/pdf/2305.15334)

- **C3 — Long context does not cure access failure:** GPT-3.5-Turbo and its 16K variant had nearly superimposed position curves where both fit. A larger nominal context window is not sufficient evidence of reliable use of deeply embedded context. [Lost in the Middle, §2.3](https://aclanthology.org/2024.tacl-1.9/)

- **C4 — Synthetic retrieval improvements do not necessarily transfer:** Repeating the query around key-value data fixed the synthetic task but barely changed the multi-document-QA trend. Avoid adopting a placement tactic solely from synthetic retrieval accuracy. [Lost in the Middle, §4.2](https://aclanthology.org/2024.tacl-1.9/)

- **C5 — Security controls trade utility for resistance:** In AgentDojo, a detector greatly reduced attack success but substantially reduced benign utility. Security selection must use both benign completion and adversarial success, not a single attack metric. [AgentDojo, Table 3](https://proceedings.neurips.cc/paper_files/paper/2024/file/97091a5177d8dc64b1da8bf3e1f6fb54-Paper-Datasets_and_Benchmarks_Track.pdf)

- **C6 — Benchmark transfer:** APIBench evaluates single API-call generation. ReAct evaluates constrained web/game environments. AgentDojo and InjecAgent evaluate attack cases. Their scores cannot establish a cross-benchmark ranking or predict a production workload without a local paired test.

## Operational selection rules

| Situation | Default candidate | Failure signal | Required paired comparison |
|---|---|---|---|
| Short, deterministic tool task | Structured function call, concise selected schema, no free-form plan | Invalid arguments, needless calls, schema violations | Structured-only versus ReAct-like plan-plus-act |
| Multi-step task with uncertain external state | Thought–action–observation loop with explicit maximum steps and one repair attempt | Repeated action, unchanged error, state contradiction, retry loop | Act-only versus interleaved loop under identical model, tools, step limit, and temperature |
| Large tool catalog | Retrieve a small set of descriptions and display why each is available | Gold tool absent, irrelevant tools selected, lower accuracy than no-retrieval baseline | No retrieval versus retriever variants versus oracle-description diagnostic |
| Long retrieved context | Put policy and active objective at boundaries, keep evidence compact, cite source IDs | Correct evidence present but ignored, middle-context miss, accuracy decline as top-k grows | Fixed evidence at beginning, middle, and end, at multiple context sizes |
| Tool outputs contain third-party content | Separate data from instructions, enforce capability-scoped tool allowlists, test injection corpus | Agent repeats hostile text as policy, sensitive/action tool call after hostile content | Baseline versus detector/filter/permission guard, reporting both benign utility and attack success |

## Reusable paired local evaluation protocol

1. **Freeze the environment.** Pin model snapshot, system prompt, tool schemas, tool versions, retrieval index, timeout, temperature, seed where supported, maximum turns, retries, and permission set.

2. **Build a representative, labeled set.** Include successful routine tasks, ambiguous tasks, stale or malformed tool outputs, unavailable tools, long-context tasks with relevant material at start/middle/end, and indirect-injection cases. Keep these strata reported separately.

3. **Compare one change at a time.** For example:
   - baseline structured loop versus ReAct-like interleaving
   - no retrieval versus top-*k* descriptions
   - full history versus compact state summary
   - baseline permissions versus tool filtering or detector

4. **Run paired trials.** Execute each task under every candidate with the same model and environment. Use multiple runs for stochastic configurations. Record per-task deltas, not only aggregate averages.

5. **Record the decision ledger.** For every trajectory capture:
   - task success and grader version
   - correct tool selection, valid arguments, tool-result grounding
   - retries, repair success, loops, and unsafe calls
   - prompt/input tokens, output tokens, tool calls, wall-clock latency, model cost, tool cost, and total cost per successful task
   - context length and position of decisive evidence
   - injection attack success and benign utility where applicable

6. **Adopt only under explicit gates.** Require no unacceptable safety regression, a meaningful paired success improvement or cost-per-success reduction, and no material deterioration in the long-context, fault, or injection strata. Retain the simplest candidate when differences fall inside expected sampling noise.

## Coverage and gaps

- **R1 — Measured effects with exact task/model/comparator/results/method/cost where available:** **Qualified.** Five primary sources support measured effects with task and comparator detail. Reported budgets include ReAct’s 21 self-consistency samples, Gorilla’s 8×A100 five-epoch training setup, and Lost in the Middle’s GPT-4 cost estimate. Most papers do not report production-like dollar cost or latency. **Next check:** run the paired local protocol with actual provider pricing and tool latency. **Stop reason:** evidence saturated on original studies; cross-study costs are unavailable and non-comparable.

- **R2 — Counterevidence, regressions, and transfer limits:** **Supported.** Direct regressions include pure ReAct versus CoT, weak retrieval versus no retrieval, placement and retrieval-volume failures, and defense utility loss. **Next check:** reproduce the harmful-retrieval and middle-context strata on the target tool catalog. **Stop reason:** multiple decision-changing counterexamples found.

- **R3 — Practical selection rules, failure signals, and paired local evaluation artifact:** **Supported.** The decision table and protocol translate the measured mechanisms into controlled local choices while preserving safety, reliability, and cost measures. **Next check:** define acceptance thresholds from the production error budget before running candidates. **Stop reason:** source evidence does not justify a universal threshold or universal prompt ranking.