## Findings

### R1 — Tool-use, planning, and reflection scaffolds

| Method | Original evaluation | Result and condition | Decision relevance |
|---|---|---|---|
| **ReAct** | PaLM-540B on HotpotQA, FEVER, ALFWorld, and WebShop. [Yao et al.](https://arxiv.org/abs/2210.03629) | Interleaving thought traces and actions improved tool-environment performance over action-only and often improved QA over chain-of-thought-only prompting. Demonstrations contain both reasoning and tool traces. | Evidence supports an integrated trace when tools reveal information needed for later decisions. It does **not** isolate reasoning format from demonstrations, tool access, trajectory length, or environment feedback. |
| **Plan-and-Solve** | `text-davinci-003` zero-shot arithmetic and reasoning benchmarks. [Wang et al.](https://arxiv.org/abs/2305.04091) | “Devise a plan” then “carry out the plan” improved zero-shot CoT on reported GSM8K and related tasks. | Planning can help decomposition, but its added instruction and generated-plan tokens are an intervention. The comparison is not budget-matched, so it is not evidence that planning is cheaper or universally better. |
| **ART** | GPT-3 with retrieved task-library exemplars and Python/tool execution across BigBench-style multi-step tasks. [Paranjape et al.](https://arxiv.org/abs/2303.09014) | Reported gains arise from a bundle: task retrieval, decomposition, demonstrations, and tools. | Useful for reusable task families, but not an ablation of any single scaffold component. |
| **Program-of-Thoughts** | `code-davinci-002` / `text-davinci-002` on arithmetic and symbolic reasoning. [Chen et al.](https://arxiv.org/abs/2211.12588) | Delegating calculation to Python improved tasks where arithmetic execution is the bottleneck. | Prefer executable tools for deterministic subproblems. This is evidence for *tool substitution*, not for extra free-form reasoning steps. |
| **Reflexion** | Code, decision-making, and QA tasks, using verbal feedback retained across attempts. [Shinn et al.](https://arxiv.org/abs/2303.11366) | Reported improvements follow multi-episode retries plus feedback and retained reflections. | Do not interpret as a cheap “reflection prompt” effect. It changes retry count, context, feedback, and often tool/environment observations. |
| **Intrinsic self-correction counterevidence** | Reasoning tasks under self-correction without new external evidence. [Huang et al.](https://arxiv.org/abs/2310.01798) | The paper finds that simply asking models to revisit answers often fails to improve and can degrade reasoning accuracy. | A retry should have a distinct signal: verifier output, execution failure, retrieved evidence, or a changed search branch. “Try again” alone is not a dependable production policy. |
| **Sampling counterevidence to single-path conclusions** | Multiple sampled CoT paths aggregated by answer consistency. [Wang et al.](https://arxiv.org/abs/2203.11171) | Self-consistency can improve reasoning accuracy, but consumes multiple full trajectories. | Measure quality against total calls/tokens and tail latency. A gain from more paths is not evidence that one scaffold is better per unit budget. |
| **Tool-use training boundary** | Toolformer trains a model to decide when and how to call APIs, then evaluates downstream tasks. [Schick et al.](https://arxiv.org/abs/2302.04761) | The intervention is training-data generation and fine-tuning, not merely a production prompt. | Do not generalize Toolformer results to prompt-only tool orchestration. |

### R2 — Context and budget effects

| Evidence | Result and condition | Production implication |
|---|---|---|
| **Long-context position sensitivity** — [Liu et al., “Lost in the Middle”](https://arxiv.org/abs/2307.03172) | Across multi-document QA and several long-context models, performance was commonly highest when relevant evidence was at the beginning or end and lower in the middle. | More retrieved context is not monotonic improvement. Put the most decision-relevant evidence in a deliberate position, preserve citations/identifiers, and test at production context lengths. |
| **ReAct context growth** — [Yao et al.](https://arxiv.org/abs/2210.03629) | Each tool observation becomes part of the trajectory supplied to later steps. | Tool results, reasoning traces, and retry history compete for the same effective attention/context budget. Summarize or retain structured state rather than blindly replaying full transcripts. |
| **Reflexion memory growth** — [Shinn et al.](https://arxiv.org/abs/2303.11366) | Reflections are retained as episodic memory for later attempts. | Any observed gain may depend on additional context and attempts. Evaluate memory selection, memory length, and retry count separately. |
| **Plan-and-Solve token growth** — [Wang et al.](https://arxiv.org/abs/2305.04091) | The explicit plan adds generated tokens before execution. | Compare against alternatives under fixed total output tokens, calls, and wall-clock budget, not only exact-match accuracy. |

## Decision conditions

1. **Use a tool-augmented scaffold** when the task has a verifiable external or executable subproblem and tool output can change the next decision. Keep the tool result structured and bounded.
2. **Use planning** only when decomposition failure is established on the target task. Compare direct execution, plan-then-execute, and tool-first baselines under equal call and token budgets.
3. **Use reflection/retry** only after a new signal: execution/test result, retrieval evidence, contradiction, or independent verifier. Do not rely on self-critique alone.
4. **Treat context as an intervention.** Log prompt tokens, generated reasoning tokens, tool-observation tokens, retained-memory tokens, calls, retries, latency, tool cost, and final task metric.
5. **Do not select from benchmark averages alone.** ReAct, ART, and Reflexion each bundle multiple changes. Their reported gains do not identify a universal best scaffold.

## Gaps

- No decisive original source found here that factorially holds **model, task, demonstrations, tool access, tool-output budget, context budget, retry count, and total inference budget** constant while isolating ReAct-style interleaving.
- No decisive original source found here that isolates verbal reflection from retry count and retained context across production tool-use tasks.
- Reported benchmark outcomes are not sufficient to estimate production cost, p95 latency, tool-failure behavior, or calibration under real tool schemas.
- The requested configured `web_search` and `fetch_content` actions were not callable in this environment, so decisive passages and quantitative table values could not be independently re-inspected. This is a coverage limitation, not source saturation.

## Stop reason

Stopped at the provider-access boundary rather than claiming saturation. The cited papers are original sources, but the required no-auth search/fetch inspection could not be completed in the available tool configuration.