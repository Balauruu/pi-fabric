# Tree of Thoughts for production reasoning: original-evidence decision

**Decision:** Do **not** replace direct or chain-of-thought (CoT) prompting with Tree of Thoughts (ToT) as a production default. The original study supports ToT only as a bounded escalation candidate for representative tasks where branching over externally checkable intermediate states corrects demonstrated early-commitment failures and the incremental quality is worth its measured total cost. It does not establish a general production advantage.

**Scope and research date:** This report is limited to the original *Deliberate Problem Solving with Large Language Models* paper, arXiv v2 (3 December 2023), retrieved live on 2026-09-08. Principal experiments ran 5–16 May 2023 with Chat Completion GPT-4 at temperature 0.7 unless stated otherwise. The investigation ends here because current-model and production-domain evidence are outside the original-paper-only assignment.

## What the original evidence establishes

### Game of 24: a large result in a constructed, verifier-friendly search task

The 100-case test set was games 901–1,000 from 1,362 4nums.com puzzles, sorted by human solving time. A result was successful only if it equaled 24 and used every supplied number exactly once. In this setting, the paper reports:

| Arm | Result | Conditions that matter |
|---|---:|---|
| IO | 7.3% success | Five in-context examples. |
| CoT | 4.0% success | Three demonstrated intermediate equations. |
| CoT self-consistency | 9.0% success | Majority result from 100 independent CoT samples. |
| ToT BFS, `b=1` | 45% success | ToT decomposition and LLM state evaluation, but one retained state. |
| ToT BFS, `b=5` | **74% success** | Three equation steps, task-specific proposal prompt, five retained states per step, and three `sure`/`maybe`/`impossible` evaluator samples per candidate. |
| IO + refine | 27% success | Up to 10 iterations with ground-truth equation-correctness feedback. |
| IO best-of-100 | 33% success | **Oracle** success if any of 100 samples is correct. |
| CoT best-of-100 | 49% success | **Oracle** success if any of 100 samples is correct. |

Sources: [paper §4.1](https://arxiv.org/html/2305.10601v2#S4.SS1), [Game of 24 results table](https://arxiv.org/html/2305.10601v2#S4.F3).

**Interpretation.** The 74% versus 4.0% single CoT result is evidence that this custom search-and-evaluation implementation can improve a constrained arithmetic task. The more decision-relevant compute-scale comparison is ToT 74% versus oracle CoT best-of-100 49%, not a deployable head-to-head selector: ToT contains an LLM evaluator and custom proposal prompt, while best-of-100 assumes an oracle verifier. Therefore neither arm is an out-of-the-box generic prompt. At near completion-token scale, the result supports intermediate branching plus evaluation for this puzzle, not a universal ToT claim.

### Creative Writing: improvement over IO and CoT, but refinement is a counterexample to a ToT default

For 100 inputs of four random sentences, the model had to produce a coherent four-paragraph passage ending each paragraph with the corresponding sentence. There was no reference answer. ToT generated five plans, voted five times to select one plan, generated five passages conditioned on it, and voted five times again. Its retained breadth after each vote was one.

| Arm | GPT-4 coherence score (1–10) | Comparator meaning |
|---|---:|---|
| Zero-shot IO | 6.19 | Direct generation. |
| Zero-shot CoT | 6.93 | Brief plan, then passage. |
| ToT | 7.56 | Plan-and-passage candidate generation plus voting. |
| IO + iterative refine | **7.67** | Exceeds unrefined ToT on the automatic score. |
| ToT + iterative refine | 7.91 | Additional refinement after ToT. |

A blind pairwise author-subset comparison of ToT with CoT over 100 pairs preferred ToT in 41 cases, CoT in 21, and rated 38 similarly coherent. The automatic GPT-4 score averaged five ratings per output; the paper reports average within-output standard deviation around 0.56 and cautions that the automatic metric may be noisy.

Sources: [paper §4.2](https://arxiv.org/html/2305.10601v2#S4.SS2), [Creative Writing results figure](https://arxiv.org/html/2305.10601v2#S4.F5).

**Interpretation.** ToT improved the paper’s model-judge score over direct and brief-plan CoT, but IO refinement alone scored 7.67 versus ToT’s 7.56. This is direct counterevidence to making explicit tree search the preferred control for open-ended writing. The primary scalar is also GPT-4 judging GPT-4 outputs, and the human result is a directional pairwise preference rather than a calibrated quality estimate.

## Compute and cost: historical accounting, not a current budget

The original cost tables label the fields **Generate/Prompt tokens**. The first number below is generated/completion tokens, the second prompt tokens. Dollar figures are historical per-case figures from the paper’s GPT-4 setup and must not be used as current provider-price forecasts.

| Task and arm | Generated / prompt tokens per case | Historical cost per case | Outcome | Boundary on comparison |
|---|---:|---:|---:|---|
| Game24, IO best-of-100 | 1.8k / 1.0k | $0.13 | 33% | Oracle best-of-100, not deployable without a verifier. |
| Game24, CoT best-of-100 | 6.7k / 2.2k | $0.47 | 49% | Oracle best-of-100. |
| Game24, ToT | 5.5k / 1.4k | $0.74 | 74% | Custom BFS/evaluator configuration. |
| Creative Writing, IO | 0.9k / 0.4k | $0.06 | 6.19 | Zero-shot direct baseline. |
| Creative Writing, CoT | 0.9k / 0.4k | $0.07 | 6.93 | Brief-plan baseline. |
| Creative Writing, ToT | 4.0k / 2.9k | $0.32 | 7.56 | Five plans, votes, five passages, votes. |

Sources: [Appendix B.3, Game24 Table 7](https://arxiv.org/html/2305.10601v2#A2.T7), [Appendix B.3, Creative Writing Table 8](https://arxiv.org/html/2305.10601v2#A2.T8). Table 8’s caption incorrectly says “Cost analysis on Game of 24”; its surrounding text and rows identify Creative Writing. This report preserves that source error rather than silently treating it as a different experiment.

Two useful but limited contrasts follow:

- Game24 ToT (74%, 5.5k generated tokens) beat oracle CoT best-of-100 (49%, 6.7k generated tokens), but its listed historical per-case cost was higher ($0.74 versus $0.47). Prompt-token counts and pricing structure differ, so completion tokens alone do not reproduce cost.
- Creative Writing ToT used about 4.4× the generated tokens and about 5.3× the historical dollar cost of IO, for a 1.37-point model-judge increase. It used the same generated-token count as CoT (0.9k) only for the baselines, not as a budget-matched search comparison.

The paper estimates the two main 100-case ToT experiments at about **$106** (`$0.74 × 100 + $0.32 × 100`) and says ToT can require **5–100×** more generated tokens than CoT depending on prompts and search algorithm. It supplies no latency, tail-latency, request-count, retry, reliability, safety, or evaluator-calibration measurements. [Appendix B.3](https://arxiv.org/html/2305.10601v2#A2.SS3)

## Practical adoption boundary

Use ToT as an escalation candidate only when all conditions hold:

1. **Search structure:** The workflow has meaningful intermediate states and either deterministic verification or a demonstrably credible evaluator.
2. **Observed failure mode:** Representative direct and CoT runs fail because an early commitment prevents recovery, rather than because the model lacks the needed knowledge or tool access.
3. **Economic fit:** The bounded extra requests, tokens, latency, and implementation effort have a validated value greater than their incremental total cost.

Keep direct/CoT as the default otherwise. Cap depth, candidate count, beam, votes, and retries before deployment. Treat evaluator errors as a product risk: the paper shows that task-specific evaluation and pruning are integral to the Game24 result, not incidental infrastructure. Do not route subjective work on a self-judged score alone.

## Transfer limits that constrain the decision

- **Task and era:** The authors describe only three relatively simple tasks and state that ToT may be unnecessary where GPT-4 already excels. The evidence is May-2023 GPT-4, not a current production model or workflow. [Limitations, §6](https://arxiv.org/html/2305.10601v2#S6)
- **Model dependence:** On Game24, GPT-3.5 ToT achieved 19% versus GPT-4 ToT’s 74%, with a changed one-shot-to-three-shot proposal prompt. GPT-4 generation with GPT-3.5 evaluation achieved 64%; GPT-3.5 generation with GPT-4 evaluation achieved 31%. This supports generation quality as a local bottleneck, while confounding a clean cross-model transfer claim. [Appendix B.2](https://arxiv.org/html/2305.10601v2#A2.SS2)
- **Unequal selection mechanisms:** Oracle best-of-100 is not deployable without a verifier. Conversely, ToT’s generator and evaluator prompts encode task-specific engineering. Neither establishes performance from adding a generic “think in a tree” instruction.
- **Open-ended evaluation:** Creative Writing’s central numeric metric uses GPT-4 to judge GPT-4-generated text. The human comparison helps, but does not validate the magnitude of the 1–10 score differences.

## Concrete local paired-evaluation artifact

The following is a proposed artifact, not a measured result. Freeze and version it before running. It tests whether ToT earns deployment versus the **best non-ToT arm at the same budget**, not merely versus a weak baseline.

| Field | Required value |
|---|---|
| `case_id`, `stratum`, `difficulty` | Immutable held-out case identifier and predeclared difficulty stratum. |
| `verification_mode` | `deterministic`, `blinded_expert`, or a separately tracked outcome signal. |
| `arm` | `io`, `cot`, `cot_sc`, `refine`, or `tot`. |
| `model_snapshot`, `temperature`, `system_prompt_hash` | Identical across arms except the pre-registered intervention. |
| `input_tokens`, `output_tokens`, `cached_tokens`, `tool_tokens`, `requests`, `retries` | Actual per-case resource record. |
| `latency_ms`, `status`, `validator_result`, `blinded_score` | End-to-end operational and outcome record. |
| `tot_spec_hash` | For ToT only: decomposition, candidates, beam, votes, evaluator prompt, pruning rule, max depth, early-stop rule. |

**Paired protocol**

1. Freeze representative held-out cases and stratify by difficulty and verification mode. Give every arm the same model snapshot, temperature, system prompt, retrieval/tool permissions, schema, and end-to-end latency cap.
2. Run two predeclared comparisons: (a) a fixed request-level token and latency cap and (b) a fixed current-dollar cap. Report input, output, cached, and tool tokens separately, plus requests, retries, p50/p95 latency, failures, and validator outcomes.
3. Pre-register ToT with `b=1` and one bounded wider beam. This ablation separates thought decomposition/evaluation from raw candidate volume. Do not tune its evaluator on the held-out set.
4. For verifiable work, make the deterministic validator the decision metric. For subjective work, use blinded expert pairwise review, a fixed rubric, and inter-rater agreement. Keep a model judge diagnostic-only.
5. Adopt only if ToT improves validated quality or reduces error cost beyond the best non-ToT arm at the matched budget while meeting pre-set p95 latency and reliability limits. Otherwise retain the simpler arm.

## Material gaps

The assigned source has no current-model results, confidence intervals, per-case latency, full request/retry counts, evaluator calibration, safety results, production-domain benchmark, or current pricing. It cannot establish a universal IO-versus-CoT-versus-ToT ranking. Those unknowns make local paired evaluation necessary before a production switch.

## Source appendix

| Retained source | Type/date | Evidence form and supported finding | Important limitation |
|---|---|---|---|
| [Yao et al., *Tree of Thoughts*, arXiv v2 HTML](https://arxiv.org/html/2305.10601v2) | Original paper, v2, 3 Dec 2023 | Methods, principal Game24 and Creative Writing outcomes, Appendix B token/cost accounting, ablations, and limitations. | One paper, three simple tasks, May-2023 model configuration. |
| [§4.1 Game of 24](https://arxiv.org/html/2305.10601v2#S4.SS1) and [Table 2](https://arxiv.org/html/2305.10601v2#S4.F3) | Original-paper experiment | Dataset, success criterion, baseline/ToT configuration, 74% `b=5` result. | Structured task with exact verifier and custom prompts/evaluator. |
| [§4.2 Creative Writing](https://arxiv.org/html/2305.10601v2#S4.SS2) and [Figure 5](https://arxiv.org/html/2305.10601v2#S4.F5) | Original-paper experiment | Model-judge scores, human pairwise result, refinement counter-result. | Self-judging model metric and non-calibrated human comparison. |
| [Appendix B.2](https://arxiv.org/html/2305.10601v2#A2.SS2) and [B.3](https://arxiv.org/html/2305.10601v2#A2.SS3) | Original-paper ablation/cost analysis | Cross-model sensitivity, token/cost tables, $106 estimate, 5–100× token statement. | Historical pricing, configuration-specific resource use, no latency or reliability data. |
| [Local assigned source note](streams/s1.md) | Local evidence note, supplied for this assignment | Preserves extracted Table 7/8 token and dollar rows, source qualifications, and the Table 8 caption error. | Secondary local transcription, not independent corroboration; original-paper links above remain the evidence origin. |
