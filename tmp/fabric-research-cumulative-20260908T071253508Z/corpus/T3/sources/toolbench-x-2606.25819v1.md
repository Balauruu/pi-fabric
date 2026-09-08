# Primary source snapshot

Title: Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability
URL: https://arxiv.org/html/2606.25819v1
Version: arXiv v1
Locators: original headings and anchors are preserved below, including §3, §4, Figure 4, and §6.
Retrieval: readable extraction, complete 83,070-character source followed through offsets 0, 30,000, and 60,000.

---

# Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability

###### Abstract

Large language models are increasingly deployed as agents that solve tasks by interacting with external tool environments. Although recent tool-use benchmarks increasingly cover complex task settings, they still largely assume clean, stable, and trustworthy tool environments, leaving tool-environment unreliability insufficiently examined. We introduce ToolBench-X, a benchmark for evaluating agents under recoverable reliability hazards. ToolBench-X contains executable multi-step tasks across diverse domains and sequential, parallel, and mixed workflows, each paired with deterministic tools and a canonical final answer for automatic evaluation. Starting from clean tool environments, ToolBench-X injects five structured hazard types: Specification Drift, Invocation Error, Execution Failure, Output Drift, and Cross-source Conflict. Crucially, each injected instance remains solvable through at least one valid recovery path, such as retrying, fallback, verification, or cross-checking. Experiments reveal a substantial reliability gap: agents that perform well with reliable tools often fail under recoverable hazards. Further analysis shows that failures are driven less by tool-use volume or inference budget than by limited hazard diagnosis and ineffective recovery. Targeted recovery hints recover many failed tasks, while test-time scaling yields more limited gains. These results suggest that tool-use evaluation should move beyond function-call accuracy toward task completion under unreliable tool environments. The code and data is available at https://github.com/Foreverskyou/ToolBench-X.

School of AI, Shanghai Jiao Tong University

## Introduction

Benchmark

# Tasks

# Tools

Specification Drift

Invocation Errors

Execution Failures

Output Drift

Cross-Source Conflict

Sequential Tool-Use

Parallel Tool-Use

Mixed Tool-Use

ToolBench-X

1106

4956

✓

✓

✓

✓

✓

✓

✓

✓

BFCL v3 ([Patil et al. 2025](#bib.bib1))

1,000

N/R

×\\times

×\\times

×\\times

×\\times

×\\times

×\\times

✓

×\\times

BFCL v2 ([Patil et al. 2025](#bib.bib1))

2,251

N/R

×\\times

×\\times

×\\times

×\\times

×\\times

×\\times

✓

×\\times

BFCL v1 ([Patil et al. 2025](#bib.bib1))

2,000

N/R

×\\times

×\\times

×\\times

×\\times

×\\times

×\\times

✓

×\\times

ToolBench ([Qin et al. 2024](#bib.bib2))

126,486

16,464 APIs

×\\times

×\\times

×\\times

×\\times

×\\times

✓

×\\times

×\\times

AnyToolBench ([Du et al. 2024b](#bib.bib3))

400

\>\>16,000 APIs

×\\times

×\\times

×\\times

×\\times

×\\times

✓

×\\times

×\\times

τ2\\tau^{2}\-bench ([Barres et al. 2025](#bib.bib4))

279

48

×\\times

×\\times

×\\times

×\\times

×\\times

✓

×\\times

×\\times

τ\\tau\-bench ([Yao et al. 2024](#bib.bib5))

165

28

×\\times

×\\times

×\\times

×\\times

×\\times

✓

×\\times

×\\times

T-EVAL ([Chen et al. 2024](#bib.bib6))

553

15

×\\times

×\\times

×\\times

×\\times

×\\times

✓

×\\times

×\\times

UltraTool ([Huang et al. 2024a](#bib.bib7))

5,824

2,032

×\\times

×\\times

×\\times

×\\times

×\\times

✓

×\\times

×\\times

AgentNoiseBench ([Wang et al. 2026](#bib.bib26))

–

–

×\\times

×\\times

✓\\checkmark

✓\\checkmark

×\\times

✓

×\\times

×\\times

Table 1: Comparative analysis of ToolBench-X against representative tool-use benchmarks.

Large language models (LLMs) are advancing at an unprecedented pace, and the development of agents built upon them has emerged as a promising direction in AI research ([Liu et al. 2024](#bib.bib8); [Yang et al. 2025](#bib.bib9)). These agents interact with the real world through diverse tools, thereby unlocking novel opportunities for practical applications. Consequently, establishing robust benchmarks to reliably evaluate the tool-use capabilities of LLMs has become increasingly critical ([Huang et al. 2024a](#bib.bib7); [Du et al. 2024a](#bib.bib10); [Yao et al. 2024](#bib.bib5); [Guo et al. 2025](#bib.bib17)).

However, correct function calling is only a necessary condition for reliable tool use. In real-world systems, tools are rarely perfectly specified, perfectly stable, or perfectly trustworthy. API documentation may become stale; expected fields may be renamed or wrapped; services may timeout; returned values may be incomplete, non-canonical, or semantically shifted; and different tools may provide conflicting evidence. Even when a correct answer remains reachable, an agent may fail by trusting a suspicious intermediate result, retrying the wrong call, inventing missing arguments, or finishing before the required evidence is complete. These failures are not captured well by evaluations that assume clean tool contracts and focus primarily on whether the model selected the right function with the right arguments.

This work posits that advancing the evaluation of tool-using agents requires moving beyond mere function invocation: from assessing isolated call correctness to evaluating robust task completion under conditions of structured tool uncertainty. A competent tool agent should not only execute tools correctly but also recognize when tool outputs are unreliable, validate incomplete or contradictory results, recover from runtime errors, and ultimately generate a benchmark-consistent final answer. In other words, evaluating tool use should go beyond asking “Can the model invoke the tool?” to also consider “Can the model accomplish the task when the tool environment is uncertain?”

To investigate this question, we introduce a challenging benchmark for evaluating tool-using agents under structured Reliability Hazards. The benchmark defines executable multi-step tool tasks spanning sequential, parallel, and mixed workflows. Each task is associated with Python tools and a canonical final answer, enabling automatic execution and precise exact-match evaluation. We then convert previously successful baseline tools into uncertainty-injected versions according to a controlled taxonomy of five uncertainty types: specification uncertainty, invocation uncertainty, execution uncertainty, output uncertainty, and cross-source uncertainty. These categories encompass common real-world failure modes, including contract drift, argument ambiguity, service failures, schema or surface-form drift, and conflicting evidence across multiple tools.

A central design principle of our framework is that injected failures should be both disruptive and recoverable. Consequently, we avoid merely corrupting tools to create unsolvable tasks. Instead, each injected task maintains at least one viable recovery path, which may involve retrying, fallback strategies, cross-checking, normalization, or evidence verification. Our experiments indicate that executing tasks in environments subject to reliability hazards is challenging: all evaluated models achieved success rates below 60%.

We further observe that providing targeted hints when the model encounters difficulty can substantially increase its task completion success rate. Moreover, our failure-triggered, test-time scaling experiments demonstrate that allowing the model to reflect on its failures and engage in additional reasoning rounds also improves performance. This suggests that some recovery capabilities can emerge from extended inference-time computation. Collectively, these findings indicate that many failures are not attributable to inherently unsolvable tasks, but rather to insufficient failure diagnosis, inadequate evidence verification, and limited recovery strategies.

In summary, this work advances the study of tool-using agents along three key dimensions. First, we develop a scalable framework that conceptualizes reliable tool use as the successful completion of tasks under five distinct sources of uncertainty, thereby extending evaluation beyond simple function-call scenarios. Second, we introduce a rigorous benchmark comprising executable tasks, systematically injected uncertainties, and recovery mechanisms, which enables precise assessment of agent robustness in real-world settings. Third, our empirical results demonstrate that current tool-using agents remain highly fragile under runtime uncertainty; however, structured guidance and test-time recovery strategies can substantially enhance task success rates.

## Related Work

#### Large language models agents.

Large language models are increasingly studied not only as text generators, but as agents that perceive task context, plan intermediate steps, take actions, observe feedback, and update their behavior over time. This agentic paradigm has been explored across a wide range of domains. For example, WebArena ([Zhou et al. 2023](#bib.bib11)) and Mind2Web ([Deng et al. 2023](#bib.bib12)) evaluate agents that operate over realistic websites and user instructions; SWE-bench ([Jimenez et al. 2023](#bib.bib13)) evaluates agents on resolving real GitHub issues by editing code and interacting with execution environments; Voyager ([Wang et al. 2023](#bib.bib14)) studies an embodied lifelong-learning agent in Minecraft; and AgentBench ([Liu et al. 2023](#bib.bib15)) evaluates LLM agents across diverse interactive environments. These works show that modern agents are expected to complete tasks through interaction with external environments rather than by producing a single static response. Across these settings, tool use is a foundational capability. Whether an agent queries a database, calls a web API, executes code, searches documents, edits files, or invokes a domain-specific simulator, it must decide which external operation to perform, provide valid inputs, interpret the returned observation, and incorporate that observation into subsequent reasoning. Tool use therefore acts as an atomic action interface between language models and the external world. Improvements in tool use directly affect broader agent reliability, because higher-level planning and reasoning depend on the correctness and trustworthiness of these low-level interactions.

#### Benchmarks for tool-using agents.

Existing benchmarks have made important progress in evaluating tool-use ability. T-EVAL ([Chen et al. 2024](#bib.bib6)), UltraTool ([Huang et al. 2024a](#bib.bib7)), and MetaTool ([Huang et al. 2024b](#bib.bib16)) assess various sub-capabilities of tool-use, but treat tool invocation as a simple question-answering task, which fails to capture the multi-turn interactive nature of the LLM agent loop. On the other hand, BFCL-V1 ([Patil et al. 2025](#bib.bib1)) and BFCL-V2 ([Patil et al. 2025](#bib.bib1)) pioneered the evaluation of parallel tool-use but were still limited to single-turn scenarios. BFCL-V3 ([Patil et al. 2025](#bib.bib1)) introduced multi-turn evaluation and assessed the sequential multi-step capabilities of LLMs. Beyond evaluating whether agents can use tools correctly, assessing their robustness to imperfect or unreliable tool environments is also an important research direction ([Wang et al. 2026](#bib.bib26); [Xi et al. 2026](#bib.bib27)). However, prior studies largely focus on shallow tool perturbations, simple tool-call chains, or single-type untrusted tool environments. In contrast, our work systematically evaluates agents under realistic and unexpected tool-environment uncertainties that may emerge throughout a complete, complex task-execution cycle, assessing their ability to complete task progress in unreliable yet recoverable tool environments.

![Refer to caption](2606.25819v1/pipeline_toolbench_x_title_centered_clear.png)

Figure 1: Benchmark construction pipeline. We first define seven topic categories, generate diverse task scenarios for each topic, synthesize executable tools and canonical answers, inject structured reliability hazards while preserving a valid recovery path, and finally conduct human review to ensure task validity, tool correctness, hazard consistency, and answer reliability.

## ToolBench-X

### Problem Formulation

A tool-using agent can be formalized as a sequential decision-making process. At each step, the agent observes the task context along with previous tool outputs, and selects an action such as invoking a tool with specific arguments, retrying an operation, switching tools, verifying evidence, or producing a final answer. Formally, this can be represented as a Markov Decision Process (MDP):

ℳ\=(𝒮,𝒜,P)\\mathcal{M}=(\\mathcal{S},\\mathcal{A},P)

where 𝒮\\mathcal{S} is the state space of environment, 𝒜\\mathcal{A} contains tool calls and the transition kernel P⁡(st+1∣st,at)P(s\_{t+1}\\mid s\_{t},a\_{t}) characterizes how the external tool environment responds to the agent. Existing function-calling benchmarks largely evaluate agents under a clean transition kernel P0P\_{0}, in which a valid function call call\_tool​(f,x)\\texttt{call\\\_tool}(f,x) reliably returns a documented output Tf​(st,x)T\_{f}(s\_{t},x). Under this assumption, the primary challenge lies in action correctness: selecting the appropriate function and providing the correct arguments. In practice, however, real-world tool environments often violate this assumption. Runtime failures, outdated schemas, output drift, missing fields, and inconsistencies across tools introduce perturbations, resulting in a modified transition kernel PhP\_{h} such that

Ph​(st+1∣st,at)≠P0​(st+1∣st,at)P\_{h}(s\_{t+1}\\mid s\_{t},a\_{t})\\neq P\_{0}(s\_{t+1}\\mid s\_{t},a\_{t})

Since tool-use tasks are inherently multi-step, even localized perturbations can propagate through subsequent argument generation, evidence aggregation, and final answer synthesis. For a fixed policy π\\pi, the key metric is therefore not only its nominal performance VP0πV\_{P\_{0}}^{\\pi}, but also the degradation VP0π−VPhπV\_{P\_{0}}^{\\pi}-V\_{P\_{h}}^{\\pi} induced by unreliable tools environment. This is crucial, as it better reflects the model’s true capabilities in real-world scenarios.

Furthermore, an environment with unreliable tools is partially observable. The agent cannot directly determine whether a returned field is stale, whether an exception reflects a transient failure, or whether conflicting outputs stem from corrupted sources. As a result, the optimal policy under PhP\_{h} may differ substantially from that under P0P\_{0}, leading to degraded decision quality when the agent relies on incomplete, inconsistent, or unreliable tool observations. This distinction highlights the limitations of conventional function-calling benchmark as a measure of reliable tool-agent performance. A model may perform strongly under P0P\_{0} yet exhibit substantial degradation under PhP\_{h}, because traditional benchmarks rarely capture the reliability hazards present in tool-environment interactions. Our work addresses this gap by explicitly constructing hazards and evaluating both the resulting performance degradation under PhP\_{h} and the performance improvements enabled by additional reliability signals. Table [1](#Sx1.T1 "Table 1 ‣ Introduction ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability") shows the comparison of ToolBench-X and other representative tools using benchmarks.

### Benchmark Construction

(a) Task domain distribution.

(b) Reliability Hazard types.

(c) Number of tools per task.

Figure 2: Overview of the benchmark distribution across task domains, reliability hazard types, and number of tools per task, showing broad topical coverage, diverse reliability challenges, and varied multi-tool complexity.

We construct the benchmark using a multi-stage pipeline designed to generate diverse, executable, and recoverable tool-use tasks. Our aim is not merely to produce tool-calling problems, but also to introduce controlled reliability hazards that still allow a correct final answer to be reached. The detailed pipeline is illustrated in Fig. [1](#Sx2.F1 "Figure 1 ‣ Benchmarks for tool-using agents. ‣ Related Work ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").

#### Topic and Scenario Generation.

We begin by defining seven broad topic categories to encompass a wide range of real-world tool-use topics. These topics are designed to capture variations in task intent, information structure, and interaction patterns. For each topic, we prompt a large language model to generate multiple realistic scenarios in which an agent must leverage external tools to fulfill a user request. The resulting scenarios include sequential workflows, parallel workflows, and mixture workflows that incorporate both sequential and parallel processes.

#### Task and Tool Construction.

For each scenario, A large language model is employed to produce both detailed task specifications and the Python toolset required for task completion. Each tool is accompanied by a natural language description, input schema, executable implementation, and deterministic output behavior. Additionally, we provide a clean result for each task, in which the task can be successfully solved through correct tool selection, parameter specification, execution, and answer synthesis.

#### Reliability Hazard Injection.

Starting from the clean tools, We define five types of tool uncertainty according to where the mismatch between expected and observed tool behavior occurs. In all cases, the ground-truth answer is fixed by the original benchmark expected answer and the deterministic no-injection tool path; exception injection perturbs only the agent’s observable interaction with tools, not the underlying task answer.

Specification Drift occurs when the documented tool contract differs from the runtime contract, such as renamed fields, changed types, altered output shapes, or shifted units. It models stale documentation or API version drift. The correct answer is recovered by mapping the observed runtime behavior back to the intended contract.

Invocation Error occurs when the agent selects the right tool, but the intended call is not faithfully delivered to or interpreted by the tool. Arguments or wrapper-mediated payloads may be dropped, renamed, coerced, defaulted, truncated, or rejected at the tool boundary. It models failures in adapters, middleware, parameter binding, or request construction. The correct answer is recovered by verifying required inputs, reconstructing a valid call, and avoiding downstream use of incomplete or misbound arguments.

Execution Failure occurs after a valid call has reached the tool, but the tool execution is unstable due to timeouts, connection errors, runtime exceptions, or parsing failures. It models unreliable services or execution environments. The correct answer is recovered through bounded retry, fallback, and refusal to finish from partial execution evidence.

Output Drift occurs when the tool result is available but its returned surface form is unstable, such as wrapped values, added units, nested fields, aliases, or non-canonical answer formats. It models formatting and serialization drift. The correct answer is recovered by extracting the underlying value and canonicalizing it to the benchmark-required form.

Cross-source Conflict occurs when the answer depends on multiple tools or evidence branches that may be incomplete, inconsistent, or differently formatted. It models multi-source aggregation and verification. The correct answer is not selected by voting among sources; it is the original benchmark answer, recovered by checking branch completeness, normalizing source outputs, resolving contradictions, and propagating only reconciled evidence.

A key constraint in our construction is recoverability. We do not inject arbitrary corruptions that make the task unsolvable. Instead, every uncertainty-injected instance preserves at least one valid path to the canonical answer. Depending on the uncertainty type, the recovery path may require retrying a failed call, selecting a fallback tool, normalizing a changed output format, checking multiple sources, or verifying suspicious evidence before producing the final answer.

#### Human Validation.

Finally, all generated instances undergo rigorous human review. This process verifies that each task is well-posed, the associated tools are executable, the baseline answer is correct, the injected hazard aligns with its intended uncertainty category, and the recovery path is valid. Instances exhibiting ambiguous instructions, multiple plausible final answers, irrecoverable failures, inconsistent tool behavior, or answer leakage through the prompt are either revised or removed. This human-in-the-loop validation ensures that benchmark failures reflect genuine limitations of agent reliability rather than artifacts arising from dataset construction.

#### Statistics of ToolBench-X

Models

Task Type

Exception Type

Overall

Parallel

Sequential

Mixture

Cross-Source

Execution

Invocation

Output

Specification

DeepSeek-V4-Pro ([DeepSeek-AI 2026](#bib.bib18))

0.469

0.397

0.411

0.335

0.355

0.272

0.663

0.468

0.425

GPT-5.4 ([Singh et al. 2025](#bib.bib19))

0.472

0.450

0.438

0.350

0.358

0.283

0.727

0.518

0.453

Doubao-Seed-2.0-Lite ([ByteDance 2026](#bib.bib24))

0.587

0.439

0.516

0.460

0.457

0.353

0.750

0.468

0.513

Claude-Sonnet-4.6 ([Anthropic 2026](#bib.bib25))

0.425

0.402

0.405

0.312

0.332

0.272

0.655

0.454

0.410

Gemini-3.1-Flash ([Google 2026](#bib.bib23))

0.528

0.339

0.386

0.354

0.396

0.301

0.572

0.418

0.416

GLM-5.1 ([Zeng et al. 2026](#bib.bib22))

0.511

0.357

0.395

0.373

0.411

0.318

0.557

0.390

0.420

GPT-4o ([Singh et al. 2025](#bib.bib19))

0.352

0.386

0.338

0.300

0.291

0.249

0.527

0.418

0.359

MiniMax-M2.7 ([Chen et al. 2026](#bib.bib21))

0.257

0.243

0.246

0.186

0.181

0.179

0.402

0.291

0.249

Kimi-K2.6 ([Team et al. 2026](#bib.bib20))

0.170

0.262

0.200

0.137

0.177

0.127

0.330

0.298

0.212

Qwen-3.0-30B-A3B-Instruct ([Yang et al. 2025](#bib.bib9))

0.411

0.405

0.395

0.354

0.306

0.243

0.617

0.475

0.403

Qwen-3.5-35B-A3B ([Yang et al. 2025](#bib.bib9))

0.394

0.360

0.362

0.319

0.291

0.225

0.572

0.426

0.372

Qwen-3.5-35B-A3B-Thinking ([Yang et al. 2025](#bib.bib9))

0.475

0.368

0.416

0.350

0.362

0.301

0.602

0.454

0.419

Table 2: Main Results on ToolBench-X. Bold text indicates the best result in each category, while underlined text indicates the second-best result.

Figure [2](#Sx3.F2 "Figure 2 ‣ Benchmark Construction ‣ ToolBench-X ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability") presents an overview of the benchmark composition. The tasks span seven diverse real-world domains. Reliability hazards are represented across all five uncertainty types, with cross-source, execution, and output uncertainty comprising the largest categories, while invocation and specification uncertainty provide complementary coverage. The benchmark further incorporates a balanced mix of sequential, parallel, and hybrid workflow structures. Most tasks involve multi-step tool usage, predominantly concentrated around four-tool workflows, with additional variability in the length of tool chains.

## Experiments

### Experimental Setup

We conduct a comprehensive evaluation on ToolBench-X by benchmarking twelve prominent large language models, covering both proprietary and open-source systems. The complete list of evaluated models is provided in Table [7](#A5.T7 "Table 7 ‣ Test-Time Scaling Prompts ‣ Appendix E Prompt Templates ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability"). We report final-task accuracy as the primary metric. A task is considered correct if the execution state recorded by the backend at task completion matches the ground truth, or if the model’s final response explicitly contains the ground-truth answer.

### Main Result

Table [2](#Sx3.T2 "Table 2 ‣ Statistics of ToolBench-X ‣ Benchmark Construction ‣ ToolBench-X ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability") reports the performance of twelve representative LLMs on ToolBench-X. The results show that robust tool use under exceptions remains highly challenging. Even the best-performing model, Doubao-Seed-2.0-Lite, solves only slightly more than half of the cases. Other frontier models also remain below the 0.50 accuracy threshold, with GPT-5.4 achieving 0.453, followed by DeepSeek-V4-Pro, GLM-5.1, Gemini-3.1-Flash, and Claude-Sonnet-4.6. This suggests that no proprietary model family has yet addressed exception-aware tool use in unreliable tool-use environments.

Open-source models substantially narrow this gap. Qwen-3.5-35B-A3B-Thinking reaches an accuracy of 0.419, outperforming GPT-4o and approaching several closed-source systems. Comparisons within the Qwen family further suggest that explicit reasoning is more effective than parameter scaling alone: the thinking-enabled 35B model improves over its non-thinking counterpart by 4.7 percentage points, while the non-thinking 35B model underperforms the smaller Qwen-3.0-30B-A3B-Instruct.

Task-level results reveal that Parallel tasks are the easiest, with an average accuracy of 0.421, followed by Mixture and Sequential tasks. The performance gap reaches as much as fifteen percentage points for stronger models, confirming that errors accumulate when tool calls depend on previous outputs. Exception-level results show even sharper disparities. Output exceptions are handled relatively well, with an average accuracy of 0.581, whereas Specification exceptions are only moderately addressed. Execution, Cross-Source, and especially Invocation exceptions remain the dominant failure modes. The gap of more than thirty percentage points between Output and Invocation exceptions suggests that current LLMs are considerably better at post-hoc interpretation of tool results than at proactively generating correct tool calls under unreliable environments.

Overall, model rankings are relatively stable across task types but fluctuate markedly across exception types, while no model achieves an overall score above 0.60. Moreover, large-scale closed-source models do not exhibit a clear advantage over open-source counterparts. These results indicate that robust task execution in untrusted tool environments is a capability that must be explicitly targeted, rather than an ability that can be obtained through parameter scaling alone.

### Further Analysis

Figure 3: Post-error behaviors after the first failed tool response.

Post-Failure Recovery Behavior. Aggregate accuracy alone does not explain why agents fail. We therefore examine the action immediately following the first failed tool call. Figure [3](#Sx4.F3 "Figure 3 ‣ Further Analysis ‣ Experiments ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability") shows that retrying the same tool dominates across all models, accounting for 44% to 76% of post-failure trajectories, while direct termination remains below 12%. However, this behavior pattern is only weakly associated with overall accuracy in Table [2](#Sx3.T2 "Table 2 ‣ Statistics of ToolBench-X ‣ Benchmark Construction ‣ ToolBench-X ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability"). High retry rates appear in both the strongest model, Doubao-Seed-2.0-Lite with accuracy 0.513, and weaker models such as GPT-4o with accuracy 0.359. Similarly, switch-heavy models such as Claude-Sonnet-4.6 and Gemini-3.1-Flash achieve only mid-level accuracy. These results indicate that recovery quality depends not on retrying or switching, but on whether the action matches the underlying hazard. Failures mainly reflect inaccurate hazard diagnosis, demonstrating that diagnosis is the central bottleneck.

Figure 4: Overall accuracy on the 200-task subset across five models. Baseline is the exception-injected setting, Oracle is the clean upper bound, and Test-time scaling and Hint are recovery strategies.

#### Are failures unrecoverable, or merely undiagnosed?

Agents fail substantially under tool exceptions, but aggregate accuracy alone cannot explain why. Low scores may reflect cases that become intrinsically unsolvable under a corrupted tool environment, or cases that remain solvable but require the agent to diagnose the tool environment hazard and adapt its strategy. To obtain credible conclusions while keeping evaluation cost manageable, we uniformly sample a subset of 200 tasks from the full benchmark as our evaluation pool, preserving the original distribution of task types and exception categories. The standard setting with injected exceptions on this subset serves as the Baseline. We further introduce three diagnostic settings. In Hint, after the agent fails a task, the model is informed of the current problem in the tool environment. In Test Time Scaling (TTS), after the agent fails a task, the model is given an additional budget of 10 interaction rounds to retry without any hint. In Oracle, the same tasks are evaluated in the original clean tool environment without exception injection, providing an upper bound on achievable performance. The gap between Baseline and Oracle measures the performance loss caused by tool exceptions, while the relative positions of Hint and TTS within this gap help distinguish failures caused by poor diagnosis from those caused by insufficient compute.

#### Diagnosis is the dominant bottleneck.

Figure [4](#Sx4.F4 "Figure 4 ‣ Further Analysis ‣ Experiments ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability") reveals a sizable gap of roughly 35 to 50 points between Baseline and Oracle, confirming that exception injection is a substantive source of failure rather than a minor perturbation. Hint close the bulk of this gap. Hint lifts Baseline accuracy by 25.5 to 35.5 absolute points, recovering roughly 60 to 80 percent of the lost accuracy across all five models. The improvement is consistent across capability tiers, from DeepSeek


# Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability

-V4-Flash to GPT-5.4-Mini, indicating that diagnosis is a uniformly limiting factor rather than a weakness specific to smaller models. Although each hint provides only a brief explanation of the anomaly in the tool environment, this signal alone is sufficient to turn most failures into successes. Most no-hint failures are therefore not on irrecoverable tasks but on tasks where the agent cannot identify the hazard on its own. Nevertheless, a residual gap between Hint and Oracle remains, suggesting that certain hazards require adaptive recovery behaviors that current models still fail to execute reliably.

#### Compute alone does not explain the Hint gain.

TTS isolates the effect of additional compute by granting extra inference rounds while withholding any information about anomalies in the tool environment. Thus, any remaining advantage of Hint over TTS can be attributed to diagnostic information rather than to additional reasoning steps. The results indicate that compute alone is a weak intervention: TTS improves Baseline accuracy by only 3.5–11.5 percentage points, while Hint consistently outperforms TTS by 24–32 points. This gap persists even among the strongest models in our evaluation. GPT-5.4-Mini achieves 0.840 accuracy with Hint but only 0.520 with TTS, while Claude-Sonnet-4.6 reaches 0.775 versus 0.535. Taken together with the strong Hint performance, these findings identify diagnosis, rather than recovery, as the primary bottleneck. Once an agent knows which hazard it faces, it can often recover effectively. Robust exception handling therefore requires hazard-aware sensing and self-diagnosis, rather than simply scaling the inference budget.

MLLMs

Tools per Task

Overall

≤3\\leq 3

44

≥5\\geq 5

DeepSeek-V4-Pro

0.413

0.432

0.399

0.425

GPT-5.4

0.442

0.461

0.422

0.453

Doubao-Seed-2.0-Lite

0.577

0.515

0.462

0.513

Claude-Sonnet-4.6

0.442

0.414

0.376

0.410

Gemini-3.1-Flash-Lite

0.442

0.433

0.318

0.416

GLM-5.1

0.490

0.428

0.335

0.420

GPT-4o

0.423

0.363

0.301

0.359

MiniMax-M2.7

0.269

0.251

0.225

0.249

Kimi-K2.6

0.269

0.203

0.220

0.212

Qwen-3.0-30B-A3B-Instruct

0.404

0.415

0.347

0.403

Qwen-3.5-35B-A3B

0.404

0.370

0.358

0.372

Qwen-3.5-35B-A3B-Thinking

0.471

0.425

0.358

0.419

N

104

829

173

1106

Table 3: Overall accuracy on the full benchmark by tool-count complexity. Tasks are grouped into low-complexity (≤3\\leq 3 tools), medium-complexity (4 tools), and high-complexity (≥5\\geq 5 tools) buckets.

#### Do longer tool chains compound exception hazards?

A natural concern is that the failures we observe are amplified by task length: each additional tool call introduces another point of potential exception, another intermediate observation that must be checked, and another opportunity for errors to propagate downstream. We therefore examine how reliability scales with the number of tools required by a task. Because exact tool-count bins are unevenly populated, we group tasks into three buckets — low (≤3\\leq 3 tools), medium (44 tools), and high (≥5\\geq 5 tools), which preserves statistical power in each bucket while exposing the trend across complexity levels.

Table [3](#Sx4.T3 "Table 3 ‣ Compute alone does not explain the Hint gain. ‣ Further Analysis ‣ Experiments ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability") reports accuracy under this grouping. Most models show a clear decline from low- to high-complexity tasks. For example, Doubao-Seed-2.0-Lite drops from 0.5770.577 to 0.4620.462, Gemini-3.1-Flash-Lite from 0.4420.442 to 0.3180.318, GLM-5.1 from 0.4900.490 to 0.3350.335, and GPT-4o from 0.4230.423 to 0.3010.301. These declines indicate that exception handling becomes harder as agents must coordinate longer chains of tool calls.

The trend is not perfectly monotonic across all models, suggesting that tool count is not the only source of difficulty. Exception type, workflow structure, and dependencies between calls also affect robustness. Nevertheless, the overall pattern supports a compounding-risk interpretation: as tool chains grow longer, a single mishandled exception is more likely to corrupt subsequent reasoning. Reliable agent behavior under tool uncertainty therefore requires robust per-call diagnosis and recovery, not merely stronger final-answer generation.

Figure 5: Process efficiency versus accuracy on the full benchmark.

#### Does robustness come from _more_ calls, or _better_ calls?

A natural hypothesis is that the more accurate models in Table [2](#Sx3.T2 "Table 2 ‣ Statistics of ToolBench-X ‣ Benchmark Construction ‣ ToolBench-X ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability") simply call tools more aggressively. To test this, we measure each model’s tool-invocation intensity using the Average Call Expansion Ratio:

R¯\=1|𝒯|​∑t∈𝒯CtKt,\\overline{R}\\;=\\;\\frac{1}{|\\mathcal{T}|}\\sum\_{t\\in\\mathcal{T}}\\frac{C\_{t}}{K\_{t}},

where CtC\_{t} denotes the number of tool calls made on task tt, and KtK\_{t} denotes the number of tools specified by that task. We use R¯\\overline{R} as a process-level diagnostic rather than a capability score.

Figure [5](#Sx4.F5 "Figure 5 ‣ Do longer tool chains compound exception hazards? ‣ Further Analysis ‣ Experiments ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability") compares accuracy with R¯\\overline{R} across models. The association is weak, with a descriptive model-level Pearson r\=0.326r=0.326 computed from each model’s average performance over 1,106 tasks. The ordering of several models further contradicts a volume-based explanation. Doubao-Seed-2.0-Lite achieves the highest accuracy of 0.5130.513 with a relatively low expansion ratio of 0.7730.773, whereas GPT-4o and Qwen-3.0-30B-A3B-Instruct invoke tools more frequently, with expansion ratios of 0.9480.948 and 0.9500.950, yet obtain lower accuracy. These results indicate that robustness is not primarily explained by invocation volume. Effective agents recover by using additional observations to revise their reasoning, rather than by merely increasing the number of tool calls.

### Error Analysis

Figure 6: Failure behavior taxonomy by model.

Final-answer accuracy indicates whether an agent succeeds, but not how failure unfolds. To diagnose failed no-hint trajectories, we use four observable signals: final-answer validity, whether tool use continues after the first error, the number of post-error calls AtA\_{t}, and the call expansion ratio RtR\_{t}. With median thresholds of At\=3A\_{t}=3 and Rt\=1.00R\_{t}=1.00, we group failures into four behaviors: Ineffective Continuation, where agents keep using tools intensively but fail to recover; Early Abandonment, where agents stop early or return invalid answers; Under-utilization, where tool coverage remains insufficient; and Answer Synthesis Failure, where agents use tools but fail to produce the correct final answer.

Figure [6](#Sx4.F6 "Figure 6 ‣ Error Analysis ‣ Experiments ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability") shows that Ineffective Continuation is the dominant failure mode, accounting for 48.6%48.6\\% of failed trajectories, followed by Early Abandonment at 26.7%26.7\\%. This indicates that many failures arise not from immediate stopping, but from unproductive recovery attempts after tool errors. The model-level breakdown further reveals that similar final accuracies can hide distinct failure mechanisms. Qwen-3.0-30B-A3B-Instruct and GPT-4o show large shares of Ineffective Continuation, suggesting repeated but poorly adapted retries, whereas Kimi-K2.6 shows more Under-utilization, indicating insufficient tool exploration. These patterns motivate trajectory-level diagnostics beyond aggregate accuracy.

## Conclusion

This work introduces ToolBench-X, a benchmark for evaluating tool-using agents under recoverable tool-environment unreliability. By incorporating structured hazards into otherwise solvable tasks, ToolBench-X shifts evaluation from task completion with reliable tools to agents’ ability to diagnose unreliable tool behavior, adapt their strategies, recover from failures, and ultimately complete the task. Experiments show that current agents remain fragile, with failures driven more by limited anomaly awareness and ineffective recovery than by tool-use volume or inference budget. These findings suggest that robust tool use requires reliability-aware agent design, including better uncertainty estimation, verification, fallback, and recovery mechanisms. ToolBench-X provides a foundation for systematically evaluating and developing trustworthy, resilient tool-using agents in real-world settings.

## References

*   Anthropic (2026) Anthropic Claude Sonnet 4.6 system card. External Links: [Link](https://anthropic.com/claude-sonnet-4-6-system-card) Cited by: [Table 2](#Sx3.T2.1.1.6.1 "In Statistics of ToolBench-X ‣ Benchmark Construction ‣ ToolBench-X ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Barres et al. (2025) V. Barres, H. Dong, S. Ray, X. Si, and K. Narasimhan τ2\\tau^{2}\-Bench: Evaluating Conversational Agents in a Dual-control Environment. arXiv preprint arXiv:2506.07982. Cited by: [Table 1](#Sx1.T1.1.1.8.1 "In Introduction ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   ByteDance (2026) ByteDance Doubao-Seed-2.0-Lite. Note: Model/API documentation External Links: [Link](https://www.volcengine.com/product/ark) Cited by: [Table 2](#Sx3.T2.1.1.5.1 "In Statistics of ToolBench-X ‣ Benchmark Construction ‣ ToolBench-X ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Chen et al. (2026) A. Chen, A. Li, B. Zhou, B. Gong, B. Jiang, B. Dan, C. Yu, C. Wang, C. Ma, C. Zhong, et al. The minimax-m2 series: mini activations unleashing max real-world intelligence. arXiv preprint arXiv:2605.26494. Cited by: [Table 2](#Sx3.T2.1.1.10.1 "In Statistics of ToolBench-X ‣ Benchmark Construction ‣ ToolBench-X ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Chen et al. (2024) Z. Chen, W. Du, W. Zhang, K. Liu, J. Liu, M. Zheng, J. Zhuo, S. Zhang, D. Lin, K. Chen, and F. Zhao T-Eval: Evaluating the Tool Utilization Capability of Large Language Models Step by Step. In Proceedings of the 62nd Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers), ACL 2024, Bangkok, Thailand, August 11-16, 2024, L. Ku, A. Martins, and V. Srikumar (Eds.), pp. 9510–9529. External Links: [Document](https://dx.doi.org/10.18653/V1/2024.ACL-LONG.515), [Link](https://doi.org/10.18653/v1/2024.acl-long.515) Cited by: [Table 1](#Sx1.T1.1.1.10.1 "In Introduction ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability"), [Benchmarks for tool-using agents.](#Sx2.SS0.SSS0.Px2.p1.1 "Benchmarks for tool-using agents. ‣ Related Work ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   DeepSeek-AI (2026) DeepSeek-AI DeepSeek-v4: towards highly efficient million-token context intelligence. Cited by: [Table 2](#Sx3.T2.1.1.3.1 "In Statistics of ToolBench-X ‣ Benchmark Construction ‣ ToolBench-X ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Deng et al. (2023) X. Deng, Y. Gu, B. Zheng, S. Chen, S. Stevens, B. Wang, H. Sun, and Y. Su Mind2web: towards a generalist agent for the web. Advances in Neural Information Processing Systems 36, pp. 28091–28114. Cited by: [Large language models agents.](#Sx2.SS0.SSS0.Px1.p1.1 "Large language models agents. ‣ Related Work ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Du et al. (2024a) Y. Du, F. Wei, and H. Zhang Anytool: self-reflective, hierarchical agents for large-scale api calls. arXiv preprint arXiv:2402.04253. Cited by: [Introduction](#Sx1.p1.1 "Introduction ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Du et al. (2024b) Y. Du, F. Wei, and H. Zhang AnyTool: Self-Reflective, Hierarchical Agents for Large-scale API Calls. In Forty-first International Conference on Machine Learning, ICML 2024, Vienna, Austria, July 21-27, 2024, External Links: [Link](https://openreview.net/forum?id=qFILbkTQWw) Cited by: [Table 1](#Sx1.T1.1.1.7.1.1 "In Introduction ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Google (2026) Google Gemini API: models. External Links: [Link](https://ai.google.dev/gemini-api/docs/models) Cited by: [Table 2](#Sx3.T2.1.1.7.1 "In Statistics of ToolBench-X ‣ Benchmark Construction ‣ ToolBench-X ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Guo et al. (2025) D. Guo, D. Yang, H. Zhang, J. Song, P. Wang, Q. Zhu, R. Xu, R. Zhang, S. Ma, X. Bi, et al. Deepseek-r1: incentivizing reasoning capability in llms via reinforcement learning. arXiv preprint arXiv:2501.12948. Cited by: [Introduction](#Sx1.p1.1 "Introduction ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Huang et al. (2024a) S. Huang, W. Zhong, J. Lu, Q. Zhu, J. Gao, W. Liu, Y. Hou, X. Zeng, Y. Wang, L. Shang, X. Jiang, R. Xu, and Q. Liu Planning, Creation, Usage: Benchmarking LLMs for Comprehensive Tool Utilization in Real-world Complex Scenarios. In Findings of the Association for Computational Linguistics, ACL 2024, Bangkok, Thailand and virtual meeting, August 11-16, 2024, L. Ku, A. Martins, and V. Srikumar (Eds.), pp. 4363–4400. External Links: [Document](https://dx.doi.org/10.18653/V1/2024.FINDINGS-ACL.259), [Link](https://doi.org/10.18653/v1/2024.findings-acl.259) Cited by: [Table 1](#Sx1.T1.1.1.11.1.1 "In Introduction ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability"), [Introduction](#Sx1.p1.1 "Introduction ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability"), [Benchmarks for tool-using agents.](#Sx2.SS0.SSS0.Px2.p1.1 "Benchmarks for tool-using agents. ‣ Related Work ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Huang et al. (2024b) Y. Huang, J. Shi, Y. Li, C. Fan, S. Wu, Q. Zhang, Y. Liu, P. Zhou, Y. Wan, N. Gong, et al. Metatool benchmark for large language models: deciding whether to use tools and which to use. In International Conference on Learning Representations, Vol. 2024, pp. 42978–43007. Cited by: [Benchmarks for tool-using agents.](#Sx2.SS0.SSS0.Px2.p1.1 "Benchmarks for tool-using agents. ‣ Related Work ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Jimenez et al. (2023) C. E. Jimenez, J. Yang, A. Wettig, S. Yao, K. Pei, O. Press, and K. Narasimhan Swe-bench: can language models resolve real-world github issues?, 2024. URL https://arxiv. org/abs/2310.06770 7. Cited by: [Large language models agents.](#Sx2.SS0.SSS0.Px1.p1.1 "Large language models agents. ‣ Related Work ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Liu et al. (2024) A. Liu, B. Feng, B. Xue, B. Wang, B. Wu, C. Lu, C. Zhao, C. Deng, C. Zhang, C. Ruan, et al. Deepseek-v3 technical report. arXiv preprint arXiv:2412.19437. Cited by: [Introduction](#Sx1.p1.1 "Introduction ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Liu et al. (2023) X. Liu, H. Yu, H. Zhang, Y. Xu, X. Lei, H. Lai, Y. Gu, and H. Ding Kaiwen men, kejuan yang, et al. 2023b. agentbench: evaluating llms as agents. arXiv preprint arXiv:2308.03688. Cited by: [Large language models agents.](#Sx2.SS0.SSS0.Px1.p1.1 "Large language models agents. ‣ Related Work ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Patil et al. (2025) S. G. Patil, H. Mao, C. Cheng-Jie Ji, F. Yan, V. Suresh, I. Stoica, and J. E. Gonzalez The Berkeley Function Calling Leaderboard (BFCL): From Tool Use to Agentic Evaluation of Large Language Models. In Forty-second International Conference on Machine Learning, Cited by: [Table 1](#Sx1.T1.1.1.3.1.1 "In Introduction ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability"), [Table 1](#Sx1.T1.1.1.4.1 "In Introduction ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability"), [Table 1](#Sx1.T1.1.1.5.1.1 "In Introduction ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability"), [Benchmarks for tool-using agents.](#Sx2.SS0.SSS0.Px2.p1.1 "Benchmarks for tool-using agents. ‣ Related Work ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Qin et al. (2024) Y. Qin, S. Liang, Y. Ye, K. Zhu, L. Yan, Y. Lu, Y. Lin, X. Cong, X. Tang, B. Qian, S. Zhao, L. Hong, R. Tian, R. Xie, J. Zhou, M. Gerstein, D. Li, Z. Liu, and M. Sun ToolLLM: Facilitating Large Language Models to Master 16000+ Real-world APIs. In The Twelfth International Conference on Learning Representations, ICLR 2024, Vienna, Austria, May 7-11, 2024, External Links: [Link](https://openreview.net/forum?id=dHng2O0Jjr) Cited by: [Table 1](#Sx1.T1.1.1.6.1 "In Introduction ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Singh et al. (2025) A. Singh, A. Fry, A. Perelman, A. Tart, A. Ganesh, A. El-Kishky, A. McLaughlin, A. Low, A. Ostrow, A. Ananthram, et al. Openai gpt-5 system card. arXiv preprint arXiv:2601.03267. Cited by: [Table 2](#Sx3.T2.1.1.4.1 "In Statistics of ToolBench-X ‣ Benchmark Construction ‣ ToolBench-X ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability"), [Table 2](#Sx3.T2.1.1.9.1 "In Statistics of ToolBench-X ‣ Benchmark Construction ‣ ToolBench-X ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Team et al. (2026) K. Team, T. Bai, Y. Bai, Y. Bao, S. Cai, Y. Cao, Y. Charles, H. Che, C. Chen, G. Chen, et al. Kimi k2. 5: visual agentic intelligence. arXiv preprint arXiv:2602.02276. Cited by: [Table 2](#Sx3.T2.1.1.11.1 "In Statistics of ToolBench-X ‣ Benchmark Construction ‣ ToolBench-X ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Wang et al. (2023) G. Wang, Y. Xie, Y. Jiang, A. Mandlekar, C. Xiao, Y. Zhu, L. Fan, and A. Anandkumar Voyager: an open-ended embodied agent with large language models. arXiv preprint arXiv:2305.16291. Cited by: [Large language models agents.](#Sx2.SS0.SSS0.Px1.p1.1 "Large language models agents. ‣ Related Work ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Wang et al. (2026) R. Wang, Y. Chen, Y. Wang, C. Wu, J. Fang, X. Cai, Q. Gu, H. Su, A. Zhang, X. Wang, et al. Agentnoisebench: benchmarking robustness of tool-using llm agents under noisy condition. arXiv preprint arXiv:2602.11348. Cited by: [Table 1](#Sx1.T1.1.1.12.1 "In Introduction ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability"), [Benchmarks for tool-using agents.](#Sx2.SS0.SSS0.Px2.p1.1 "Benchmarks for tool-using agents. ‣ Related Work ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Xi et al. (2026) Z. Xi, S. Liang, Q. Liu, J. Zhang, L. Peng, F. Nan, M. Nayim, T. Zhang, R. Mundada, L. Qin, et al. ToolGym: an open-world tool-using environment for scalable agent testing and data curation. arXiv preprint arXiv:2601.06328. Cited by: [Benchmarks for tool-using agents.](#Sx2.SS0.SSS0.Px2.p1.1 "Benchmarks for tool-using agents. ‣ Related Work ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Yang et al. (2025) A. Yang, A. Li, B. Yang, B. Zhang, B. Hui, B. Zheng, B. Yu, C. Gao, C. Huang, C. Lv, et al. Qwen3 technical report. arXiv preprint arXiv:2505.09388. Cited by: [Introduction](#Sx1.p1.1 "Introduction ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability"), [Table 2](#Sx3.T2.1.1.12.1 "In Statistics of ToolBench-X ‣ Benchmark Construction ‣ ToolBench-X ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability"), [Table 2](#Sx3.T2.1.1.13.1 "In Statistics of ToolBench-X ‣ Benchmark Construction ‣ ToolBench-X ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability"), [Table 2](#Sx3.T2.1.1.14.1 "In Statistics of ToolBench-X ‣ Benchmark Construction ‣ ToolBench-X ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Yao et al. (2024) S. Yao, N. Shinn, P. Razavi, and K. Narasimhan τ\\tau\-Bench: A Benchmark for Tool-Agent-user Interaction in Real-world Domains. International Conference on Learning Representations. Cited by: [Table 1](#Sx1.T1.1.1.9.1.1 "In Introduction ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability"), [Introduction](#Sx1.p1.1 "Introduction ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Zeng et al. (2026) A. Zeng, X. Lv, Z. Hou, Z. Du, Q. Zheng, B. Chen, D. Yin, C. Ge, C. Huang, C. Xie, et al. Glm-5: from vibe coding to agentic engineering. arXiv preprint arXiv:2602.15763. Cited by: [Table 2](#Sx3.T2.1.1.8.1 "In Statistics of ToolBench-X ‣ Benchmark Construction ‣ ToolBench-X ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").
*   Zhou et al. (2023) S. Zhou, F. F. Xu, H. Zhu, X. Zhou, R. Lo, A. Sridhar, and X. Cheng Tianyue ou, yonatan bisk, daniel fried, et al. 2023. webarena: a realistic web environment for building autonomous agents. arXiv preprint arXiv:2307.13854. Cited by: [Large language models agents.](#Sx2.SS0.SSS0.Px1.p1.1 "Large language models agents. ‣ Related Work ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").

## Appendix A Human Validation and Quality Control

We validate each generated benchmark instance through a multi-stage human review process. The review team consists of five reviewers, each of whom is either a Ph.D. student or a Ph.D. degree holder. The review spans 20 working days, with an 8-hour schedule per day, for a total of 800 person-hours. Each reviewer is paid at least the applicable local minimum hourly wage.

#### Review process.

Each candidate instance is assigned to a primary reviewer, who examines the task specification, tool implementation, injected reliability exception, reference answer, and recovery path. If an instance passes the initial review but contains ambiguous instructions, non-trivial recovery behavior, cross-source evidence, or possible answer leakage, it is sent to a second reviewer for independent validation. Disagreements are resolved through discussion by at least two reviewers. Instances without consensus are removed from the benchmark.

#### Review criteria.

For each candidate instance, reviewers verify that the user task is clear and has a unique expected answer, that all associated Python tools run deterministically in a clean environment, that the reference answer is consistent with the tool path without exception injection, and that the injected exception matches its intended category, including specification drift, invocation error, execution failure, output drift, or cross-source conflict. These five hazards mark different points at which a task can fail, so we do not apply every hazard type to every task. We assign a hazard only when it fits the task structure and when the original reference answer can still be reached through at least one valid recovery path. Reviewers also verify that the injected instance retains at least one valid recovery path, that the required recovery behavior can be achieved through retry, fallback, normalization, validation, or cross-checking, that the prompt, tool names, tool descriptions, hints, and metadata do not directly reveal the final answer, and that exact-match evaluation agrees with human semantic judgment.

#### Automatic recovery-path validation.

For each candidate instance, we automatically execute both the clean path without exception injection and the expected recovery path in the injected tool environment. An instance passes this check only if the clean path produces the reference answer and the injected environment still contains a valid recovery path to the same answer.

#### Answer-leakage check.

We use both automatic and human checks for answer leakage. The automatic checker searches the user prompt, tool descriptions, tool metadata, exception messages, and recovery hints for exact and normalized forms of the reference answer. Normalization includes lowercase conversion, whitespace removal, punctuation removal, unit stripping, and common numeric format conversion. Human reviewers further check whether the final answer can be inferred without executing the tools. Instances with direct leakage are revised or removed.

#### Candidate-instance statistics.

The initial generation stage produces 2,610 raw task items. We first apply preliminary screening for task validity, duplication, tool executability, and deterministic clean-path execution, yielding 1,250 candidate instances across 84 subtopics and three workflow types. At most five candidates are retained for each combination of task type and subtopic. These candidates then undergo human review and automatic validation. Among the 1,250 candidates, 1,142 pass the automatic recovery-path check, and 1,196 pass the answer-leakage check. Candidates that fail either check are manually inspected and are revised, regenerated, or removed depending on whether the issue can be fixed without changing the task intent. After this process, the final benchmark contains 1,106 instances, including 378 sequential, 358 parallel, and 370 mixture tasks. The overall retention rate is 88.5% over the candidate pool. According to the review logs, 996 instances are retained without substantive changes (79.7%), 72 are retained after revision (5.8%), 38 are retained after regeneration (3.0%), and 144 are removed (11.5%).

#### Double review and agreement.

A total of 200 instances are independently reviewed by two reviewers, covering 18.1% of the retained benchmark. Before discussion, reviewer agreement is measured based on accept, revise, or remove decisions and the assigned exception categories. The initial agreement rate is 91.5%. After discussion and correction, all retained instances receive consensus approval.

#### Agreement between exact match and semantic judgment.

To test whether exact-match evaluation rejects semantically correct answers, we draw a stratified random sample of 100 retained instances and compare the backend exact-match results with independent human semantic judgments. The two criteria agree in 97 cases, giving an agreement rate of 97.0%. Disagreements are manually inspected. If an exact-match target is too brittle or allows multiple valid surface forms, we revise the reference-answer format and recheck the instance.

## Appendix B Additional Dataset Statistics Details

Tables [4](#A5.T4 "Table 4 ‣ Test-Time Scaling Prompts ‣ Appendix E Prompt Templates ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability") and [5](#A5.T5 "Table 5 ‣ Test-Time Scaling Prompts ‣ Appendix E Prompt Templates ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability") report the hierarchical composition of the final dataset by task type, main topic, and subtopic. The dataset contains 1,106 retained tasks, including 378 sequential, 358 parallel, and 370 mixture tasks. Overall, it covers 7 main topics and 84 unique subtopics.

Each table entry gives the number of retained tasks for a particular task-type–subtopic combination. Although up to five tasks were initially generated for each combination, the final counts vary because tasks that did not satisfy the benchmark validation and executability requirements were excluded. Across all task types, the largest topic groups are Commerce & Transactions (234 tasks), Entertainment & Media (215), and Health & Wellness (192).

## Appendix C Detailed Experimental Settings

We conduct a comprehensive evaluation on seven commercial models and seven representative open-source large language models. The complete list of models evaluated is provided in Table [7](#A5.T7 "Table 7 ‣ Test-Time Scaling Prompts ‣ Appendix E Prompt Templates ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability").

All models were accessed via a unified OpenAI\-compatible API and used their default temperature. We allowed 10 rounds per task, 8 parallel workers, a maximum of 8,192 output tokens, and a 120\-second timeout per request. To preserve diagnostic granularity and recovery observability, at most one tool call, retry, fallback, or finish was permitted per round. Each task required a single definite output (e.g., amount, date, count); accordingly, we adopted a strict exact\-match criterion: after stripping whitespace, the model output must be identical to the answer string. API requests were retried up to three times with exponential backoff (2–10 seconds); persistent failures were recorded as task failures.

## Appendix D Case Studies

We present six representative no-hint trajectory pairs from the matched 200-task subset in Fig. [9](#A5.F9 "Figure 9 ‣ Test-Time Scaling Prompts ‣ Appendix E Prompt Templates ‣


# Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability

 Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability"). Each pair uses the same task and injected tool implementation, comparing a model that reaches the canonical benchmark answer with one that fails under the same hazard. Hazard labels are assigned according to the semantic location of the failure and the recovery path required to reach the answer, rather than the surface Python exception alone. Thus, the same exception type may require different recovery behaviors across cases.

## Appendix E Prompt Templates

### Task Generation Prompts

Table [8](#A5.T8 "Table 8 ‣ Test-Time Scaling Prompts ‣ Appendix E Prompt Templates ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability") to [10](#A5.T10 "Table 10 ‣ Test-Time Scaling Prompts ‣ Appendix E Prompt Templates ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability") show the prompt for task generation.

### Tool Generation Prompts

Table [11](#A5.T11 "Table 11 ‣ Test-Time Scaling Prompts ‣ Appendix E Prompt Templates ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability") shows the prompt for tool generation.

### Hazard Injection and Hint Generation Prompts.

Table [12](#A5.T12 "Table 12 ‣ Test-Time Scaling Prompts ‣ Appendix E Prompt Templates ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability") shows the prompt for reliability hazard injection and hint generation.

### Policy Decision Prompts

Table [13](#A5.T13 "Table 13 ‣ Test-Time Scaling Prompts ‣ Appendix E Prompt Templates ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability") shows the prompt for policy decision.

### Tool Arguments Prompts

Table [14](#A5.T14 "Table 14 ‣ Test-Time Scaling Prompts ‣ Appendix E Prompt Templates ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability") shows the prompt for policy decision.

### Final-Answer Fallback Prompts

Table [15](#A5.T15 "Table 15 ‣ Test-Time Scaling Prompts ‣ Appendix E Prompt Templates ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability") shows the prompt for final-answer fallback.

### Test-Time Scaling Prompts

Table [16](#A5.T16 "Table 16 ‣ Test-Time Scaling Prompts ‣ Appendix E Prompt Templates ‣ Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability") shows the prompt for test-time scaling.

Table 4: Number of retained tasks for each task-type, main-topic, and subtopic combination. S, P, and M denote sequential, parallel, and mixture tasks.

Main Topic / Subtopic

S

P

M

Total

Commerce & Transactions

Cart and checkout issue resolution

3

5

5

13

Cart and checkout issue support

5

5

5

15

Coupon and discount lookup

5

5

5

15

Gift purchase coordination

4

4

3

11

Invoice and receipt organization

5

4

4

13

Invoice and receipt retrieval

5

5

5

15

Online order tracking

5

5

5

15

Price drop monitoring

5

1

5

11

Product search and comparison

5

5

4

14

Return and refund handling

5

4

5

14

Return and refund management

5

4

5

14

Service booking and payment follow-up

5

4

5

14

Shipping status tracking

5

5

5

15

Subscription plan review

5

5

5

15

Subscription purchase decisions

4

5

5

14

Vendor and marketplace comparison

5

4

5

14

Vendor and marketplace selection

5

3

4

12

Subtotal

81

73

80

234

Data & Analytics

Customer feedback categorization

5

4

5

14

Dashboard metric tracking

5

4

5

14

Data entry validation and error checking

5

5

5

15

Inventory data monitoring

4

5

4

13

KPI comparison across time periods

4

4

4

12

Report generation and scheduling

5

5

5

15

Sales data summarization

5

5

5

15

Spreadsheet cleanup and formatting

4

4

4

12

Survey response analysis

5

4

5

14

Trend identification in business data

4

5

5

14

Subtotal

46

45

47

138

Entertainment & Media

Book and reading list management

3

4

4

11

Content release date tracking

5

2

5

12

Event and show discovery

4

5

5

14

Event and ticket planning

5

5

3

13

Family-friendly content filtering

5

5

3

13

Game selection by mood or group size

5

4

5

14

Gaming session planning

5

5

4

14

Media release date tracking

5

4

5

14

Media subscription comparison

5

5

5

15

Movie and TV recommendation planning

5

4

5

14

Music playlist organization

5

5

5

15

Photo and video library organization

5

5

4

14

Podcast discovery by interest

5

5

5

15

Streaming subscription management

5

3

5

13

Streaming watchlist management

4

2

5

11

Watchlist and reading list organization

3

5

5

13

Subtotal

74

68

73

215

Table 5: Number of retained tasks by task type, main topic, and subtopic (continued).

Main Topic / Subtopic

S

P

M

Total

Finance & Economics

Bank transaction monitoring

5

4

5

14

Basic investment portfolio tracking

4

2

5

11

Bill payment planning

4

5

3

12

Credit card usage monitoring

5

4

5

14

Currency conversion for spending

4

5

3

12

Expense categorization and review

1

5

5

11

Household cost comparison

3

5

3

11

Loan payment estimation

3

4

3

10

Personal budget tracking

4

5

5

14

Savings goal planning

5

4

4

13

Savings goal tracking

2

2

4

8

Tax document organization

4

2

3

9

Subtotal

44

47

48

139

Government & Public Services

Court and civic appointment reminders

5

5

4

14

Emergency service and alert information

5

3

4

12

License and ID renewal tracking

5

5

5

15

Local government service requests

4

5

5

14

Permit and license application tracking

5

4

5

14

Public benefit application support

2

5

5

12

Public health advisory lookup

5

4

5

14

Public records request preparation

5

5

3

13

Public transit service updates

5

5

4

14

School district and enrollment information

5

1

4

10

Tax filing deadline reminders

5

5

5

15

Utility service setup or transfer

3

2

5

10

Voter registration and election reminders

5

5

5

15

Subtotal

59

54

59

172

Health & Wellness

Appointment scheduling and follow-up

5

5

4

14

Exercise routine planning

5

5

5

15

Fitness routine planning

4

4

3

11

Habit building for healthy routines

5

5

5

15

Meal and nutrition tracking

4

4

3

11

Medication schedule reminders

5

5

5

15

Mental wellness check-ins

5

5

3

13

Nutrition and meal planning

3

5

4

12

Preventive care reminders

5

5

5

15

Recovery and rehabilitation tracking

5

5

3

13

Sleep habit monitoring

5

5

5

15

Stress management support

5

5

5

15

Symptom logging and monitoring

5

5

5

15

Wellness goal check-ins

5

4

4

13

Subtotal

66

67

59

192

Information & Communication

Announcement and newsletter drafting

4

2

4

10

Calendar invite coordination

4

2

0

6

Subtotal

8

4

4

16

Overall Total

378

358

370

1,106

Table 6: Exact counts of mutually exclusive heuristic failure-behavior categories among failed no-hint trajectories. Each failed trajectory is assigned to exactly one category. EA: early abandonment; IC: ineffective continuation; UU: under-utilization; SF: synthesis failure.

Model

Failed

EA

IC

UU

SF

DeepSeek-V4-Pro

636

116

345

59

116

GPT-5.4

605

135

380

18

72

Qwen3-30B-A3B-Instruct

660

34

521

18

87

Qwen3.5-35B-A3B

695

112

282

128

173

Qwen3.5-35B-A3B-Thinking

643

200

295

52

96

Doubao-Seed-2.0-Lite

539

312

153

40

34

Claude-Sonnet-4.6

652

230

282

75

65

Gemini-3.1-Flash-Lite

646

292

183

97

74

GLM-5.1

642

306

249

37

50

GPT-4o

709

73

520

23

93

MiniMax-M2.7

831

109

477

111

134

Kimi-K2.6

872

253

265

257

97

Total

8,130

2,172

3,952

915

1,091

Model Type

Models

Proprietary LLMs

GPT-5.4, GPT-5.4-Mini, GPT-4o

Gemini-3.1-Flash, Claude-Sonnet-4.6

Doubao-Seed-2.0-Lite, Doubao-Seed-2.0-Mini

Open-source LLMs

DeepSeek-V4-Pro, DeepSeek-V4-Flash

GLM-5.1, MiniMax-M2.7, Kimi-K2.6

Qwen3.0-30B-A3B-Instruct, Qwen-3.5-35B-A3B

Table 7: Evaluated large language models.

![Refer to caption](2606.25819v1/sequential.png)

(a) Sequential output drift

![Refer to caption](2606.25819v1/sequential1.png)

(b) Sequential specification drift

![Refer to caption](2606.25819v1/parallel.png)

(a) Parallel execution failure

![Refer to caption](2606.25819v1/parallel_1.png)

(b) Parallel cross-source conflict

![Refer to caption](2606.25819v1/mixture.png)

(a) Mixture execution failure

![Refer to caption](2606.25819v1/mixture_1.png)

(b) Mixture invocation error

Figure 9: Representative failure and recovery trajectories under structured tool uncertainty.

Table 8: Prompt for sequential task generation.

\# Role

You are an autonomous AI assistant that executes tool-based workflows.

\# Task: Generate Tool-Calling Evaluation Data

Your task is to generate data for evaluating an agent’s tool-calling capabilities. You will create specific tool-calling tasks based on a main topic and its subtopics. Each task must require sequential, dependent tool calls.

\*\*Important constraint:\*\* All tools must not involve image processing, image generation, or any visual content. Tools should test text-based operations.

\## Main Topic

{main\_topic}

\## Subtopics

\- {subtopic}

\## Requirements

\### General Requirements

\- You MUST generate \*\*exactly five distinct tasks\*\*.

\- Each task must be solvable \*\*only through a sequence of tool calls\*\*.

\- Each task must include \*\*explicit dependencies between tools\*\* (i.e., outputs from earlier tools are required by later tools).

\- Tools must be \*\*relevant to the topic and subtopics\*\*.

\### User Prompt Constraints

\- user\_prompt must \*\*explicitly instruct the model what to answer\*\*.

\- user\_prompt \*\*must not contain multiple questions\*\*; the agent should produce \*\*a single final answer\*\*.

\- It \*\*MUST NOT\*\*: Reveal execution steps, Suggest intermediate procedures, and Indicate tool usage or order

\### Answer Constraints

\- Each task must produce a final answer that is: \*\*Programmatically verifiable\*\*, OR \*\* A single, objectively correct value\*\*

\- final\_answer must be: \*\*Concise\*\* AND \*\*Result-only\*\* (no explanation, no steps)

\### Diversity Requirement

\- The five tasks must be \*\*diverse in scenario and complexity\*\*.

\## Output Format

Return a valid JSON object:

{

"tasks": \[

{

"id": "task\_1",

"user\_prompt": "string",

"tools\_used": \["tool\_name\_1", "tool\_name\_2"\],

"final\_answer": "string"

}

\]

}

Table 9: Prompt for parallel task generation.

\# Role

You are an autonomous AI assistant that executes tool-based workflows.

\# Task: Generate Parallel Tool-Calling Evaluation Data

Your task is to generate data for evaluating an agent’s \*\*parallel tool-calling capabilities\*\*. You will create specific tasks based on a main topic and its subtopics. Each task must require \*\*all tools to be used\*\*, but \*\*no tool may depend on the output of another\*\* (true parallel execution).

\*\*Important constraint:\*\* All tools must \*\*not involve image processing, image generation, or any visual content\*\*. Tools should test text-based operations.

\## Main Topic

{main\_topic}

\## Subtopics

\- {subtopic}

\## Requirements

\### General Requirements

\- You MUST generate \*\*exactly five distinct tasks\*\*.

\- Each task must require \*\*all listed tools to be used\*\*.

\- Tools must be \*\*independent\*\*: No tool’s output may be used as input to another tool.

\- Tools must be \*\*relevant to the topic and subtopics\*\*.

\### User Prompt Constraints

\- user\_prompt must \*\*explicitly instruct the model what to answer\*\*.

\- user\_prompt \*\*must not contain multiple questions\*\*; the agent should produce \*\*a single final answer\*\*.

\- It \*\*MUST NOT\*\*: Reveal execution steps, Suggest intermediate procedures, and Indicate tool usage or order

\### Answer Constraints

\- Each task must produce a final answer that is: \*\*Programmatically verifiable\*\*, OR \*\* A single, objectively correct value\*\*

\- final\_answer must be: \*\*Concise\*\* AND \*\*Result-only\*\* (no explanation, no steps)

\### Diversity Requirement

\- The five tasks must be \*\*diverse in scenario and complexity\*\*.

\## Output Format

Return a valid JSON object:

{

"tasks": \[

{

"id": "task\_1",

"user\_prompt": "string",

"tools\_used": \["tool\_name\_1", "tool\_name\_2"\],

"final\_answer": "string"

}

\]

}

Table 10: Prompt for mixture task generation.

\# Role

You are an autonomous AI assistant that executes tool-based workflows.

\# Task: Generate Mixed Tool-Calling Evaluation Data

Your task is to generate data for evaluating an agent’s \*\*mixed tool-calling capabilities\*\*. Each task must include \*\*both sequential (dependent) and parallel (independent) tool calls\*\*. All tools must be used to complete the task.

\*\*Important constraint:\*\* All tools must \*\*not involve image processing, image generation, or any visual content\*\*. Tools should test text-based operations.

\## Main Topic

{main\_topic}

\## Subtopics

\- {subtopic}

\## Requirements

\### General Requirements

\- You MUST generate \*\*exactly five distinct tasks\*\*.

\- Each task must include \*\*all listed tools\*\*.

\- Tools may be a mix of: \*\*Sequential\*\*: some tools must be called in order (output of one used as input to the next), \*\*Parallel\*\*: some tools are independent and can be called in any order

\- Tools must be \*\*relevant to the topic and subtopics\*\*.

\### User Prompt Constraints

\- user\_prompt must \*\*explicitly instruct the model what to answer\*\*.

\- user\_prompt \*\*must not contain multiple questions\*\*; the agent should produce \*\*a single final answer\*\*.

\- It \*\*MUST NOT\*\*: Reveal execution steps, Suggest intermediate procedures, and Indicate tool usage or order

\### Answer Constraints

\- Each task must produce a final answer that is: \*\*Programmatically verifiable\*\*, OR \*\* A single, objectively correct value\*\*

\- final\_answer must be: \*\*Concise\*\* AND \*\*Result-only\*\* (no explanation, no steps)

\### Diversity Requirement

\- The five tasks must be \*\*diverse in scenario and complexity\*\*.

\## Output Format

Return a valid JSON object:

{

"tasks": \[

{

"id": "task\_1",

"user\_prompt": "string",

"tools\_used": \["tool\_name\_1", "tool\_name\_2"\],

"final\_answer": "string"

}

\]

}

Table 11: Prompt for tool generation.

\# Role

You are a Python Tool Implementation Engineer for agent-tool evaluation.

\# Mission

Generate executable Python tool functions for the given task. The tools must generalize across valid inputs rather than overfit to a single example.

For the benchmark context, the composed tool chain must reproduce ‘expected\_answer‘, or ‘final\_answer‘ when ‘expected\_answer‘ is absent. For unseen inputs, return results derived from the implemented tool logic.

\# Data to Process

{

"task\_type": "<sequential|parallel|mixture>",

"main\_topic": "<main topic>",

"subtopic": "<subtopic>",

"id": "<task id>",

"user\_prompt": "<user request>",

"tools\_used": \["<tool\_1>", "..."\],

"expected\_answer": "<benchmark answer>",

"final\_answer": "<fallback answer>"

}

\# Core Requirements

1\. Generate exactly one function for each name in ‘tools\_used‘.

2\. Function names must exactly match the requested tool names. Do not add unrelated functions, classes, or helpers.

3\. Use Python 3.9-compatible syntax and ensure that all outputs are deterministic and JSON-serializable.

4\. Respect the specified ‘sequential‘, ‘parallel‘, or ‘mixture‘ workflow and maintain compatible data contracts across tools.

5\. Derive outputs from function inputs and handle unseen but valid inputs through general logic and deterministic fallbacks.

6\. Preserve a guarded benchmark-context path that reproduces the benchmark answer exactly without forcing that answer for unrelated inputs.

7\. When external information is required, prefer public no-key sources and provide deterministic fallback behavior.

8\. Include provenance, confidence, evidence, fallback, and error information where applicable.

9\. Ensure that each downstream required parameter can be obtained from an upstream output or the original user request.

\[… omitted: standardized return schemas, robust input normalization, benchmark-context detection, external-data policies, inter-tool contracts, canonicalization rules, and validation checks …\]

\# Output Requirements

Return Python code only. Do not include explanations, Markdown fences, execution logs, or additional text.

\# Repair Instruction

1\. Fix only the failing parts.

2\. Preserve function names and signatures unless required for correctness.

3\. Return corrected Python code only.

Table 12: Prompt for hazard injection and hint generation.

\# Role

You are a Reliability Stress-Test Prompt Engineer for agent-tool evaluation.

\# Mission

Patch an existing successful Python module in place by adding deterministic reliability hazards. Preserve its function names, signatures, schemas, and original behavior when injection is disabled. Do not regenerate its business logic.

\# Evaluation Objectives

1\. When injection is disabled, the patched module must preserve its original benchmark-correct behavior and output schema.

2\. ‘strict\_no\_hint\_profile‘ must introduce an observable and meaningful failure or behavior drift.

3\. ‘guided\_with\_hint\_profile‘ must retain the same fault schedule and may provide diagnostic information about the observed failure to support recovery, without revealing the final answer.

4\. At least one reachable and verifiable path to the correct answer must remain available.

\# Hazard Categories

Assign exactly one category to each task: Specification, Invocation, Execution, Output, or Cross-Source Uncertainty. All failpoints and hints within the task must use this category.

\# Core Requirements

1\. Select failpoints deterministically using task identity, tool name, call slot, failpoint, and ‘FAIL\_SEED‘.

2\. Record observable injection events without overwriting the original business payload.

3\. Do not silently swallow exceptions or represent hard failures as successful results.

4\. Block premature completion when evidence is incomplete or contradictory, and require final-answer canonicalization before ‘FINISH‘.

5\. Keep the injected fault schedule reproducible across no-hint and with-hint conditions to support controlled comparison.

\[… omitted: activation schemas, failure families, event contracts, recovery rules, and anti-regression checks …\]

\# Runtime Input

{

"task\_type": "<workflow type>",

"id": "<task id>",

"user\_prompt": "<user request>",

"tools\_used": \["<tool\_1>", "..."\],

"final\_answer": "<benchmark answer>",

"target\_exception\_category": "<one of five>",

"existing\_tool\_code": "<complete clean module>"

}

\# Output Requirements

Return only the complete modified Python module. Do not change existing callable identities or provide explanations, Markdown fences, or execution logs.

Table 13: Prompt for evaluation-time policy decisions.

\# Role

You are a tool-orchestration policy model.

\# Output Format

Return ONLY JSON with this schema:

{

"action": "call\_tool" | "retry" |

"fallback" | "finish",

"tool\_name": "<tool name or empty>",

"final\_answer": "<non-empty only for finish>",

"reason": "<short reason>"

}

\# Rules

\- Use only allowed tools.

\- Finish only when available tool outputs are sufficient.

\- If a tool fails, retry it or use another available tool.

\- When finishing, return the exact raw scalar supported by successful tool outputs; prefer fields such as ‘final\_value‘, ‘final\_answer‘, ‘value‘, or ‘result‘.

\- Treat ‘success=false‘, ‘ok=false‘, missing fields, and explicit errors as unresolved evidence.

\- If ‘ORACLE\_HAZARD\_LABEL‘ is present, use it only as diagnostic context; it provides neither a recovery procedure nor an answer.

\- Without recovery hints, allow at most one unguided retry per failed tool.

\- Return no Markdown or explanatory text.

\# Runtime Context

\## User Request

{user\_prompt}

\## Allowed Tools

{allowed\_tools}

\## Round

{round\_index}

\## Previous Action History

{action\_history}

\## Current Tool Results

{tool\_results}

\## Last Error

{last\_error\_or\_None}

{optional\_recovery\_or\_oracle\_context}

Table 14: Prompt for tool-argument generation.

\# Task

You must call the provided function tool using valid arguments.

\# Runtime Context

\## User Request

{user\_prompt}

\## Previous Tool Results

{previous\_results\_or\_None}

\# Operational Rules

\- Use only evidence in the user request or previous tool results.

\- Never invent missing arguments, IDs, paths, amounts, dates, ZIP codes, or enum values.

\- Reuse verified values exactly unless a hint explicitly requires normalization.

\- Do not copy incomplete fields from failed or ‘ok=false‘ results.

\- Generate arguments that support a correct downstream scalar rather than a plausible guess.

\- Required inputs for the selected tool: {schema- and hint-required fields}.

\# API Constraint

The request includes the selected function’s description and JSON parameter schema, with ‘tool\_choice‘ forced to that function.

\# JSON Fallback

If forced tool-call arguments are invalid, return exactly one JSON object using only schema-permitted keys. Do not invent missing values or include Markdown.

Table 15: Fallback prompt for final-answer synthesis.

\# Task

Based on the tool execution results, return the exact final scalar answer to the user’s request.

\# Runtime Context

\## User Request

{user\_prompt}

\## Tool Execution Results

{tool\_results}

\# Instructions

\- Return ONLY the raw final scalar value without Markdown, prose, labels, or explanation.

\- Use successful tool outputs as the sole source of truth; do not fabricate unsupported values.

\- Prefer canonical fields such as ‘final\_value‘, ‘final\_answer‘, ‘final\_total‘, ‘answer‘, ‘value‘, or ‘result‘.

\- Remove currency wrappers when a numeric scalar is required.

\- If results conflict, return only the best-supported scalar from successful outputs.

Table 16: Prompt for failure-triggered test-time scaling.

{original\_user\_prompt}

\[TEST\_TIME\_SCALING\_CONTEXT\]

The previous no-hint attempt for this benchmark

task failed. Re-run the task by calling the available tool(s); do not answer from memory alone. Use the prior failed trajectory only to understand what went wrong, then gather fresh evidence with tool calls in this run.

Do not use or ask for the hidden expected answer.

Return only the exact final scalar/string requested by the original task.

Task metadata:

{task\_metadata\_without\_expected\_answer}

Previous no-hint trajectory, with answer-bearing

fields redacted:

{redacted\_no\_hint\_trajectory}

\[/TEST\_TIME\_SCALING\_CONTEXT\]
