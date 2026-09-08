# Primary source snapshot

Title: Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation
URL: https://arxiv.org/html/2607.02577
Version: arXiv HTML 2607.02577 (retrieved URL had no explicit v suffix)
Locators: original headings and anchors are preserved below, including §3.3–§3.5, §4.1–§4.4, Tables 3–5, and §5.
Retrieval: readable extraction, complete 45,935-character source followed through offsets 0 and 30,000.

---

# Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation

   Vishvesh Bhat Affiliation: CoreThink AI    Muhammad Ahmed Mohsin Affiliation: Stanford University    Asad Aali Affiliation: Stanford University

Abstract. Tool-calling benchmarks are increasingly used to rank language-model agents, yet their scores are often treated as ground truth without validating the evaluators themselves. We present a systematic validity and reproducibility audit of four major tool-calling benchmark families: BFCL v4, τ2\\tau^{2}\-Bench, LiveMCPBench, and MCP-Atlas. Across 496 expert-reviewed benchmark tasks, we find 92 evaluator-human disagreements, corresponding to an 18.5% misalignment rate. The failures are not isolated annotation mistakes: deterministic benchmarks exhibit brittle state matching, trajectory lock-in, incorrect ground truths, substring-based communication failures, and reward-basis misalignment, while LLM-judge benchmarks exhibit rubric drift, hallucinated completion, answer-only scoring, and substantial run-to-run variance. In LiveMCPBench, 23 repeated evaluations of the same setup produce scores ranging from 57.9% to 76.8%, a spread of 18.9 percentage points, large enough to change leaderboard conclusions. These results show that current tool-calling scores can reflect evaluator artifacts rather than agent capability. We introduce a unified taxonomy of tool-calling evaluation failures, release trace-level audit artifacts and corrected evaluation components, and argue for decomposed metrics that separately measure tool invocation, task completion, and outcome verification. Our findings suggest that progress in tool-using agents requires benchmarks whose evaluators are themselves reproducible, auditable, and aligned with human judgments of task success. We further introduce Tool-Veritas, a configurable benchmark that combines deterministic state verification with optional qualitative judging, and Harness Lab, an open-source system for benchmark execution, trace inspection, repeated-run comparison, and evaluator debugging.

## 1 Introduction

Tool-calling has emerged as a core capability of modern language-model agents, enabling interaction with external APIs, databases, operating systems, web services, and enterprise tools ([Patil et al., 2023](#bib.bib4); [Li and others, 2023a](#bib.bib3); [Qin et al., 2024](#bib.bib22); [Guo et al., 2024](#bib.bib23)). Consequently, benchmark-driven evaluation has become the primary mechanism for measuring progress, comparing models, and guiding deployment decisions. Benchmarks such as BFCL, τ\\tau\-bench, τ2\\tau^{2}\-Bench, LiveMCPBench, and MCP-Atlas are increasingly used as standard references for function calling, stateful interaction, and large-scale tool-use evaluation ([Gorilla Team, 2024](#bib.bib21); [Yao and others, 2024](#bib.bib7); [Barres and others, 2025](#bib.bib8); [Mo and others, 2025](#bib.bib13); [Bandi and others, 2026](#bib.bib17)). Implicit in their adoption is the assumption that benchmark scores provide a reliable measurement of tool-calling capability.

However, benchmark validity requires more than task coverage and scale. An evaluation must correctly distinguish successful from unsuccessful executions, faithfully capture user intent, and produce reproducible scores under repeated evaluation. Prior work has already shown that tool-use and LLM evaluation can be sensitive to API instability, automatic evaluator design, judge bias, and preference-aggregation artifacts ([Guo et al., 2024](#bib.bib23); [Zheng et al., 2023](#bib.bib18); [Dubois et al., 2024](#bib.bib24); [Chiang et al., 2024](#bib.bib20)). We find that many existing tool-calling benchmarks fail to satisfy these requirements in more fundamental ways. Through a systematic audit of four widely used benchmarks, we identify pervasive evaluation artifacts that are often unrelated to actual tool-use ability. Deterministic benchmarks suffer from brittle state comparisons, exact-match constraints, incorrect ground-truth annotations, trajectory lock-in, and reward formulations that fail to capture task completion. LLM-judge benchmarks exhibit a different failure mode: stochastic rubric generation, judge variance, hallucinated evaluations, and implementation-paper mismatches that introduce substantial score instability.

These issues have practical consequences. We identify numerous false negatives where agents correctly complete tasks but are marked as failures due to evaluator artifacts, as well as false positives where benchmarks assign passing scores despite incomplete or incorrect task execution. We further show that leaderboard results can become highly unstable under repeated evaluation; for example, rerunning LiveMCPBench with its default evaluation pipeline produces score swings approaching twenty percentage points without changing the evaluated model. Collectively, these findings suggest that current benchmark scores often reflect properties of the evaluator rather than properties of the agent being evaluated.

To address these limitations, this work makes five contributions. First, we conduct a trace-level audit of 496 executions across BFCL v4, τ2\\tau^{2}\-Bench, LiveMCPBench, and MCP-Atlas, identifying 92 evaluator–human disagreements. Second, we develop a unified taxonomy of deterministic and LLM-judge evaluation failures, including brittle state matching, trajectory lock-in, annotation errors, reward-basis mismatch, rubric drift, hallucinated completion, and judge variance. Third, we propose a decomposed evaluation framework that separately measures tool invocation, task completion, and outcome verification. Fourth, we introduce Tool-Veritas, a configurable tool-calling benchmark that evaluates factual task completion through deterministic state gates and uses an optional restricted LLM judge only for qualitative criteria. Fifth, we develop Harness Lab, a benchmark execution and debugging system that preserves raw artifacts, exposes case- and turn-level diagnostics, compares repeated runs, supports selective retry, and records human adjudications.

## 2 Related Work

#### Tool-use and function-calling benchmarks.

Early tool-use benchmarks evaluate whether language models can select APIs, fill arguments, and produce valid tool calls, including ToolBench ([Xu and others, 2023](#bib.bib1)), ToolAlpaca ([Tang and others, 2023](#bib.bib2)), API-Bank ([Li and others, 2023a](#bib.bib3)), Gorilla ([Patil et al., 2023](#bib.bib4)), ToolLLM ([Qin et al., 2023](#bib.bib5)), and BFCL ([Patil and others, 2024](#bib.bib6)). These benchmarks substantially advanced standardized function-calling evaluation, but they often reduce success to syntactic call matching, AST equivalence, or narrow execution checks. As a result, they under-specify whether the agent actually satisfies user intent in realistic multi-turn environments.

#### Interactive and stateful agent evaluation.

Recent benchmarks move beyond isolated tool calls toward stateful interaction, simulated users, and persistent environments, including τ\\tau\-bench ([Yao and others, 2024](#bib.bib7)), τ2\\tau^{2}\-bench ([Barres and others, 2025](#bib.bib8)), ToolSandbox ([Lu and others, 2024](#bib.bib9)), WebArena ([Zhou and others, 2023](#bib.bib10)), WorkArena ([Drouin and others, 2024](#bib.bib11)), and OSWorld ([Xie and others, 2024](#bib.bib12)). These settings better capture long-horizon tool use, policy following, and environment updates, but their scoring is typically tied to final database hashes, scripted trajectories, or brittle natural-language checks. This makes them vulnerable to false negatives when agents reach valid alternative outcomes and false positives when unchanged state is incorrectly treated as success. MAVEN introduces a verification-centered reasoning scaffold and MAVEN-Bench, an adversarial multi-step math and physics benchmark that exposes substantial cross-benchmark degradation in frontier models and highlights the need for process-aware evaluation of tool-using agents [Ghugarkar et al. (2026)](#bib.bib25).

#### MCP and LLM-as-a-judge evaluations.

MCP-based benchmarks such as LiveMCPBench ([Mo and others, 2025](#bib.bib13)), MCP-Bench ([Wang and others, 2025](#bib.bib14)), MCP-Universe ([Luo and others, 2025](#bib.bib15)), MCPMark ([Wu and others, 2025](#bib.bib16)), and MCP-Atlas ([Bandi and others, 2026](#bib.bib17)) evaluate agents in larger tool ecosystems with realistic multi-server workflows. To scale evaluation, many rely on LLM-as-a-judge protocols inspired by MT-Bench ([Zheng et al., 2023](#bib.bib18)), AlpacaEval ([Li and others, 2023b](#bib.bib19)), and Chatbot Arena ([Chiang et al., 2024](#bib.bib20)). However, these evaluators often judge final answers rather than verified tool use, introduce rubric and judge variance, and can hallucinate task completion, leaving benchmark scores sensitive to evaluator artifacts rather than agent capability.

#### Benchmark execution and debugging infrastructure.

Existing benchmark releases generally provide benchmark-specific execution scripts and aggregate scoring, but offer limited support for cross-benchmark trace inspection, repeated-run comparison, selective case retry, and persistent human adjudication. Harness Lab addresses this infrastructure gap by providing a common execution and debugging layer across heterogeneous benchmark implementations while preserving each benchmark’s original evaluator and raw artifacts.

## 3 Methodology

### 3.1 Preliminaries

We model a tool-calling benchmark as a tuple ℬ\=(𝒯,ℰ,𝒢)\\mathcal{B}=(\\mathcal{T},\\mathcal{E},\\mathcal{G}), where 𝒯\\mathcal{T} denotes the benchmark tasks, ℰ\\mathcal{E} the evaluation harness, and 𝒢\\mathcal{G} the benchmark-specific success criterion. Each task t∈𝒯t\\in\\mathcal{T} consists of a user query qq, an initial environment state s0s\_{0}, a set of available tools 𝒜\\mathcal{A}, and an expected outcome o∗o^{\*}. Given an agent π\\pi, task execution produces a trajectory τ\={(s0,a1),(s1,a2),…,(sT,aT)}\\tau=\\{(s\_{0},a\_{1}),(s\_{1},a\_{2}),\\ldots,(s\_{T},a\_{T})\\} consisting of tool invocations, environment transitions, and natural-language responses. The benchmark evaluator assigns a binary outcome y\=ℰ⁡(τ)y=\\mathcal{E}(\\tau).

The central assumption underlying benchmark evaluation is that the benchmark verdict matches the true task outcome. Let ℋ⁡(τ)\\mathcal{H}(\\tau) denote the expert trace-level assessment of task success.An evaluator agrees with the expert judgment on trajectory τ\\tau when

ℰ⁡(τ)\=ℋ⁡(τ).\\mathcal{E}(\\tau)=\\mathcal{H}(\\tau).

(1)

Our objective is to systematically identify and characterize instances where this equality fails.

### 3.2 Benchmark Audit Framework

We audit four representative tool-calling benchmarks spanning both deterministic and LLM-judge-based evaluation paradigms: BFCL, τ2\\tau^{2}\-Bench, LiveMCPBench, and MCP-Atlas. For each benchmark, we collect complete execution traces, tool invocation logs, evaluator outputs, environment states, and final benchmark verdicts. Each benchmark instance is represented as xi\=(τi,yi,mi)x\_{i}=(\\tau\_{i},y\_{i},m\_{i}), where τi\\tau\_{i} denotes the execution trace, yiy\_{i} the benchmark-assigned label, and mim\_{i} benchmark-specific metadata including evaluator logs, expected states, and judge outputs.

Our audit procedure consists of three stages: (i) reproducing benchmark evaluations, (ii) manually adjudicating benchmark outcomes, and (iii) performing root-cause analysis on benchmark disagreements. This enables direct comparison between benchmark-assigned labels and human-verified task outcomes.

### 3.3 Human Adjudication

For each flagged instance, annotators inspect the complete interaction trajectory, tool execution sequence, state transitions, and final user-visible outcome. A human label hi∈{PASS,FAIL}h\_{i}\\in\\{\\texttt{PASS},\\texttt{FAIL}\\} is assigned based on whether the user objective was successfully achieved.

We define a benchmark disagreement whenever the benchmark label differs from the human assessment. More formally,

δi\=𝟙\[yi≠hi\].\\delta\_{i}=\\mathbbm{1}\[y\_{i}\\neq h\_{i}\].

(2)

We further partition disagreements into false negatives (yi\=0,hi\=1y\_{i}=0,h\_{i}=1) and false positives (yi\=1,hi\=0y\_{i}=1,h\_{i}=0), enabling systematic quantification of evaluator failures across benchmarks.

### 3.4 Failure Taxonomy

Using manually verified disagreements, we construct a unified taxonomy of tool-calling evaluation failures. For deterministic benchmarks, we identify failures arising from exact-match constraints, state over-specification, trajectory lock-in, annotation errors, and reward misalignment. For LLM-judge-based benchmarks, we identify rubric drift, judge variance, hallucinated completion, and implementation-specification mismatches.

Each disagreement is assigned to one or more failure categories through trace-level analysis and evaluator inspection. This taxonomy provides a benchmark-agnostic framework for characterizing evaluation failures independently of any specific benchmark implementation.

### 3.5 Reproducibility Analysis

For benchmarks employing stochastic judges, a single benchmark score is insufficient to characterize evaluation reliability. We therefore execute repeated benchmark runs under identical settings and measure score variability. Given a set of benchmark scores S\={s1,…,sK}S=\\{s\_{1},\\ldots,s\_{K}\\} obtained from KK independent evaluations, we report the mean score μ\\mu, standard deviation σ\\sigma, and score spread Δ\\Delta.

The score spread,

Δ\=max⁡(S)−min⁡(S),\\Delta=\\max(S)-\\min(S),

(3)

captures the maximum leaderboard variation attributable solely to evaluation stochasticity. Large values of Δ\\Delta indicate poor reproducibility and unstable benchmark rankings.

### 3.6 Corrected Evaluation Framework

Our audit reveals that existing benchmarks frequently collapse multiple aspects of agent behavior into a single binary score. We therefore decompose evaluation into three independent components: tool invocation correctness, task completion correctness, and outcome verification. Rather than assigning a single pass/fail label, evaluation is represented as

𝐜\=(Ctool,Ctask,Coutcome),\\mathbf{c}=\\left(C\_{\\text{tool}},C\_{\\text{task}},C\_{\\text{outcome}}\\right),

(4)

where each component evaluates a distinct aspect of agent behavior. This decomposition localizes evaluation failures, improves interpretability, and reduces sensitivity to benchmark-specific artifacts.

### 3.7 Benchmark Corrections

Using the identified failure cases, we construct corrected benchmark annotations, repaired evaluation logic, and revised evaluation harnesses. The corrected benchmark suite removes erroneous ground-truth labels, reduces brittle state comparisons, aligns evaluation procedures with benchmark specifications, and incorporates reproducibility-aware reporting. These corrected artifacts form the basis of the benchmark re-evaluation presented in the subsequent sections.

### 3.8 Tool-Veritas: Deterministic-First Tool-Calling Evaluation

Our audit reveals complementary limitations in existing evaluation paradigms. Deterministic evaluators are reproducible but can reject semantically valid executions because of rigid syntax, trajectory, or state matching. LLM-based evaluators accommodate legitimate variation but can introduce rubric drift, unsupported success judgments, and score instability. Tool-Veritas addresses this trade-off through a deterministic-first protocol with a restricted LLM fallback.

A Tool-Veritas task is defined as

t\=(q,s0,𝒜,𝒢,𝒥),t=\\left(q,s\_{0},\\mathcal{A},\\mathcal{G},\\mathcal{J}\\right),

where qq is the user request, s0s\_{0} is the initial sandbox state, 𝒜\\mathcal{A} is the available tool set, 𝒢\\mathcal{G} is a collection of deterministic state predicates, and 𝒥\\mathcal{J} is an optional qualitative rubric.

After each interaction turn, deterministic gates inspect observable properties of the sandbox state. These gates verify factual outcomes such as whether a file was created, a database record was updated, a calendar event was added, or a required tool-mediated action was completed. For environment state sts\_{t} after turn tt, deterministic completion is defined as

Cstate(t)\=∏j\=1mt𝟙\[gt,j(st)\=1\],C\_{\\mathrm{state}}(t)=\\prod\_{j=1}^{m\_{t}}\\mathbbm{1}\\left\[g\_{t,j}(s\_{t})=1\\right\],

where gt,jg\_{t,j} is the jjth required predicate and mtm\_{t} is the number of predicates evaluated at turn tt. A task cannot pass factual-completion evaluation when a required gate fails.

The LLM judge is invoked only for criteria that cannot be represented reliably as state predicates, including communication quality, policy adherence, and the adequacy of user-facing confirmations. It cannot override a failed deterministic requirement. This separation prevents fluent responses from receiving credit when the required environment change did not occur, while retaining flexibility for genuinely qualitative criteria.

Tool-Veritas also provides a bounded repair window. When a tool invocation fails, the agent may inspect the returned error and issue a corrected action before the turn is finalized. First-attempt completion and completion after repair are recorded separately, preserving execution errors while measuring recovery.

Tools, domains, state predicates, and Model Context Protocol (MCP) endpoints are configuration-defined. Each run produces a per-turn JSONL trace containing the model action, tool response, state transition, gate result, repair status, and optional judge output. The current benchmark spans sixteen domains, including filesystem operations, databases, version control, banking, travel, calendars, smart-home control, and healthcare workflows.

The empirical analysis in Section [4.5](#S4.SS5 "4.5 RQ4: Does Deterministic-First Evaluation Improve Human Agreement? ‣ 4 Experiments ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation") shows that this evaluator achieves 95.5% aggregate agreement with expert trace-level judgments across the evaluated model–task pairs. We therefore study deterministic verification with restricted LLM fallback as a general scoring design for agentic benchmarks, while leaving the detailed agreement analysis and cross-benchmark comparison to RQ4.

Table 1: Evaluator characteristics of Tool-Veritas and the benchmark versions audited in this work.

### 3.9 Harness Lab

Harness Lab is the execution and debugging infrastructure used for the benchmark audit. It runs benchmark suites against OpenAI-compatible model endpoints, preserves raw benchmark artifacts, parses case-level results, and provides benchmark-specific diagnostic views.

The current implementation supports seven benchmark families across 21 suite variants: BFCL v3/v4, τ2\\tau^{2}\-Bench, Toolathlon, MCP-Atlas, SWE-Bench Lite, LiveCodeBench v6, and LiveMCPBench. Each benchmark remains associated with its original runner and evaluator.

For every run, Harness Lab stores the raw harness output, official score files, inference logs, case summaries, turn-level diagnostics, and execution metadata. Raw artifacts are retained in object storage, while parsed records are materialized into a relational database for case-level queries.

Harness Lab provides benchmark-specific diagnostics. For BFCL, it identifies the first failed turn, error category, and state-field mismatch. For τ2\\tau^{2}\-Bench, it exposes database checks, action assertions, communication assertions, and reward components. For MCP-Atlas and LiveMCPBench, it displays expected and observed tool trajectories together with judge outputs.

The system also supports paired run comparison. Cases are aligned by identifier and classified as passed in both runs, failed in both runs, improved in one run, or missing from one run. For multi-turn tasks, the comparison identifies the first turn at which two runs diverge.

Selective retry allows transiently failed cases to be regenerated without rerunning the complete benchmark. Retried cases are merged with unaffected results, after which the official evaluator is executed again. Human verdicts and unreliable-case annotations are stored separately from official benchmark labels, preserving the distinction between automated scores and expert adjudication.

Table 2: Harness Lab functionality used in the audit.

## 4 Experiments

We evaluate whether current tool-calling benchmarks measure agent capability or evaluator behavior. Our analysis addresses three questions: RQ1 whether official benchmark labels agree with expert trace-level judgments; RQ2 which deterministic evaluator failures cause disagreement; and RQ3 whether LLM-judge benchmarks produce reproducible scores under repeated evaluation.

### 4.1 Experimental Setup

#### Benchmarks and agents.

We audit four benchmark families spanning deterministic and LLM-based evaluation: BFCL v4, τ2\\tau^{2}\-Bench Retail, LiveMCPBench, and MCP-Atlas. BFCL v4 evaluates function calls and simulator state using AST and state-based checks. τ2\\tau^{2}\-Bench combines database-state verification with action, communication, and natural-language assertions. LiveMCPBench and MCP-Atlas use LLM-based scoring over trajectories, final responses, or reference claims. We evaluate moonshotai/kimi-k2.6 on τ2\\tau^{2}\-Bench Retail and minimax/minimax-m2.7 on BFCL v4, LiveMCPBench, and MCP-Atlas.

#### Audit protocol.

For each task, we retain the complete user prompt, model trajectory, tool calls, tool outputs, final response, official benchmark verdict, evaluator diagnostics, and available environment states. Let yi∈{0,1}y\_{i}\\in\\{0,1\\} denote the official label for task ii and hi∈{0,1}h\_{i}\\in\\{0,1\\} the expert trace-level judgment. We define disagreement as

mi\=𝟙\[yi≠hi\],m\_{i}=\\mathbbm{1}\[y\_{i}\\neq h\_{i}\],

(5)

and the benchmark-level misalignment rate as

Err⁡(ℬ)\=1Nℬ​∑i\=1Nℬmi.\\mathrm{Err}(\\mathcal{B})=\\frac{1}{N\_{\\mathcal{B}}}\\sum\_{i=1}^{N\_{\\mathcal{B}}}m\_{i}.

(6)

A false negative occurs when yi\=0y\_{i}=0 and hi\=1h\_{i}=1; a false positive occurs when yi\=1y\_{i}=1 and hi\=0h\_{i}=0.

#### Expert adjudication.

Three independent expert annotators reviewed the complete execution traces, including the user request, tool calls, tool outputs, environment-state changes, and final response. Disagreements were resolved through adjudication. The review required 89 annotator-hours in total, corresponding to approximately 10.8 minutes per task.

#### Execution and artifact collection.

All runs were launched and inspected through Harness Lab with benchmark-specific diagnostic logging enabled. Harness Lab preserved raw vendor outputs, official score files, inference traces, evaluator logs, and available environment states. Benchmark revisions, local patches, datasets, endpoint configurations, and execution metadata were versioned for each run. The system was used to identify first-failure turns in BFCL, inspect decomposed τ2\\tau^{2} rewards, compare repeated LiveMCPBench executions, and store human adjudications separately from official labels. Benchmark runners were deployed in Google Cloud us-central1; evaluated models were accessed through OpenAI-compatible HTTP endpoints. We therefore report benchmark-side compute rather than model-serving hardware.

Table 3: Audit scale and evaluator–human agreement. Agreement is the fraction of official labels matching expert trace-level judgments.

Benchmark

Evaluator

Agent

Audited

Agreement

Misaligned

Error rate

τ2\\tau^{2}\-Bench Retail

DB hash + NL assertions

Kimi-K2.6

112

90.0%

11

9.8%

BFCL v4

AST + simulator state

MiniMax-M2.7

200

80.0%

40

20.0%

MCP-Atlas

LLM claim coverage

MiniMax-M2.7

89

87.0%

12

13.5%

LiveMCPBench

LLM judge

MiniMax-M2.7

95

69.0%

29

30.5%

Total

–

–

496

81.5%

92

18.5%

### 4.2 RQ1: Do Official Labels Match Human Judgments?

Table [3](#S4.T3 "Table 3 ‣ Execution and artifact collection. ‣ 4.1 Experimental Setup ‣ 4 Experiments ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation") reports evaluator–human agreement across the four benchmark families. Among 496 audited tasks, 92 official labels disagree with expert judgments, yielding an aggregate misalignment rate of 18.5%. The error rate ranges from 9.8% on τ2\\tau^{2}\-Bench Retail to 30.5% on LiveMCPBench. BFCL v4 exhibits a 20.0% error rate, while MCP-Atlas exhibits a 13.5% error rate.

Misalignment occurs under both evaluation paradigms. Deterministic evaluators produce errors through brittle state comparisons, annotation defects, exact-match assumptions, and under-specified reward conditions. LLM-based evaluators produce errors through rubric instability, unsupported success judgments, answer-only scoring, and judge variance. These results indicate that replacing deterministic checks with LLM judging does not, by itself, produce reliable tool-calling evaluation.

### 4.3 RQ2: Where Do Deterministic Evaluators Fail?

#### BFCL v4.

BFCL v4 exhibits 40 evaluator–human disagreements across 200 audited tasks. In the inspected 50-task multi-turn base export, the official evaluator assigns 25 passes and 25 failures. Of the 25 official failures, 20 are labeled instance\_state\_mismatch and 5 are labeled empty\_turn\_model\_response; thus, state mismatch accounts for 80% of failures in this export.

Trace inspection shows that instance\_state\_mismatch conflates genuine task failures with evaluator artifacts. Genuine failures include omitted required actions. Artifact-driven failures include task-irrelevant state differences, punctuation-level discrepancies, full-object comparisons when only a subset of fields is relevant, and premature termination before a later corrective action. In such cases, the benchmark measures exact simulator-state conformity rather than whether the user objective was achieved.

#### τ2\\tau^{2}\-Bench Retail.

The τ2\\tau^{2}\-Bench Retail audit contains 112 tasks and 11 disagreements. Eight are false negatives and three are false positives. False negatives arise when the agent completes the requested action but fails a brittle database-hash or communication assertion. False positives arise when unchanged database state or an incomplete rubric permits an unsuccessful trajectory to pass.

A representative false negative is Task 7. The database state and all five expected tool actions match, but the task fails because the final response does not contain the substring “1628”. The user asks for the cost of remaining flights after two reservations are being canceled; the agent excludes the canceled reservations and returns $708. The evaluator expects $1,628, which includes flights no longer relevant to the request. The failure is therefore caused by an incorrect semantic target implemented as a substring check.

A representative false positive is Task 10. The user asks to return two orders, but the agent transfers the user to a human without invoking the return tool. Because the database remains unchanged and the rubric does not explicitly require the return action, the benchmark assigns a pass. This demonstrates that final-state scoring can reward inaction when the expected state is itself unchanged.

Table 4: Core audit statistics. BFCL reports the inspected 50-task multi-turn export, τ2\\tau^{2} reports disagreement direction, and LiveMCPBench reports variability across repeated full runs.

BFCL v4 failure mix

τ2\\tau^{2} disagreement direction

LiveMCPBench reruns

### 4.4 RQ3: How Reproducible Are LLM-Judge Benchmarks?

We evaluate LiveMCPBench reproducibility using 23 full runs of the same 95-task configuration. Let sks\_{k} denote the aggregate score from run kk. We report the mean

μ\=1K​∑k\=1Ksk,\\mu=\\frac{1}{K}\\sum\_{k=1}^{K}s\_{k},

the standard deviation

σ\=1K−1​∑k\=1K(sk−μ)2,\\sigma=\\sqrt{\\frac{1}{K-1}\\sum\_{k=1}^{K}(s\_{k}-\\mu)^{2}},

and the score spread

Δ\=maxk⁡sk−mink⁡sk.\\Delta=\\max\_{k}s\_{k}-\\min\_{k}s\_{k}.

Across 23 runs, LiveMCPBench scores range from 57.9% to 76.8%, with mean 69.4%, standard deviation 5.4 percentage points, and spread 18.9 percentage points. The best and worst runs differ by 18 successful tasks out of 95. This variation is large relative to many reported leaderboard margins and makes a single-run score insufficient for fine-grained model comparisons.

The observed variance combines two sources. First, model trajectories vary across complete reruns. Second, the evaluator is itself stochastic: it regenerates task-specific key points and applies an LLM judge to the resulting rubric. Consequently, two evaluations may assess the same task under different generated criteria. The reported benchmark score is therefore a function of both agent sampling and evaluator sampling.

The audit also motivates a separation between benchmark design and benchmark infrastructure. Tool-Veritas applies deterministic checks to observable task outcomes and restricts LLM judging to qualitative criteria. Harness Lab preserves the execution evidence required to inspect those decisions, compare repeated runs, and record human corrections. Together, these components make evaluator behavior explicit rather than treating scoring as an opaque final stage.

### 4.5 RQ4: Does Deterministic-First Evaluation Improve Human Agreement?

We evaluate Tool-Veritas on 70 tasks with six models and compare its benchmark verdicts against expert trace-level judgments. Table [5](#S4.T5 "Table 5 ‣ 4.5 RQ4: Does Deterministic-First Evaluation Improve Human Agreement? ‣ 4 Experiments ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation") reports deterministic-gate completion, final benchmark success, human success, and evaluator–human agreement. Agreement ranges from 91% to 100% across models, with an aggregate agreement of 95.5% (401/420 model–task evaluations). This exceeds the agreement observed in our audits of BFCL v4 (80.0%), τ2\\tau^{2}\-Bench Retail (90.0%), MCP-Atlas (87.0%), a


# Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation

nd LiveMCPBench (69.0%). All 19 Tool-Veritas disagreements are false negatives in which the benchmark is stricter than the expert judgment; we observe no false positives in which the benchmark passes an execution rejected by the human reviewer. In these evaluated settings, deterministic state gates with restricted LLM fallback substantially reduce unsupported passes while retaining high agreement with expert judgments. Because these results use different task distributions and model configurations from the audited benchmarks, we interpret them as evidence for the evaluator design rather than as a controlled benchmark-level ranking.

Table 5: Tool-Veritas results over 70 tasks per model. Agreement compares the final benchmark verdict with expert trace-level judgment. Strict disagreements are benchmark failures judged successful by the expert; lenient disagreements are benchmark successes judged unsuccessful.

## 5 Conclusion

Tool-calling benchmarks are increasingly used as proxies for agent capability, but this paper shows that their evaluators are often not reliable enough to support that role. Across 496 expert-reviewed tasks from BFCL v4, τ2\\tau^{2}\-Bench, LiveMCPBench, and MCP-Atlas, we find 92 evaluator-human disagreements, corresponding to an 18.5% misalignment rate. These failures are not confined to a single benchmark or scoring paradigm. Deterministic evaluators fail through brittle state matching, trajectory lock-in, annotation errors, substring checks, and reward-basis mismatch; LLM-judge evaluators fail through rubric drift, hallucinated completion, answer-only scoring, and substantial run-to-run variance. In LiveMCPBench, repeated evaluation of the same setup changes the aggregate score by 18.9 percentage points, large enough to alter leaderboard conclusions.

In addition to identifying evaluator failures, we introduce two components for more auditable tool-calling evaluation. Tool-Veritas separates deterministic outcome verification from optional qualitative judging and records whether an agent succeeds initially or after a bounded repair. Harness Lab provides versioned benchmark execution, raw artifact preservation, case- and turn-level diagnostics, repeated-run comparison, selective retry, and human adjudication. These components implement the central recommendation of this work: benchmark evaluators should be inspectable, reproducible, and evaluated against human judgments of task success.

## Availability

We will release the trace-level audit artifacts, corrected benchmark components, Tool-Veritas configurations, and Harness Lab source code. Harness Lab is being prepared for release under the MIT License. Repository links and versioned artifact identifiers will be included in the final version.

## References

*   Bandi et al. (2026) P. Bandi et al. MCP-atlas: evaluating agentic tool use across large mcp ecosystems. arXiv preprint arXiv:2601.XXXX. Cited by: [§1](#S1.p1.1 "1 Introduction ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation"), [§2](#S2.SS0.SSS0.Px3.p1.1 "MCP and LLM-as-a-judge evaluations. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Barres et al. (2025) V. Barres et al. Tau2-bench: a comprehensive evaluation framework for interactive tool-using agents. arXiv preprint arXiv:2503.XXXX. Cited by: [§1](#S1.p1.1 "1 Introduction ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation"), [§2](#S2.SS0.SSS0.Px2.p1.1 "Interactive and stateful agent evaluation. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Chiang et al. (2024) W. Chiang L. Zheng et al. Chatbot arena: an open platform for evaluating llms by human preference. ICML. Cited by: [§1](#S1.p2.1 "1 Introduction ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation"), [§2](#S2.SS0.SSS0.Px3.p1.1 "MCP and LLM-as-a-judge evaluations. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Drouin et al. (2024) A. Drouin et al. WorkArena: how capable are web agents at solving common knowledge work tasks?. arXiv preprint arXiv:2403.07718. Cited by: [§2](#S2.SS0.SSS0.Px2.p1.1 "Interactive and stateful agent evaluation. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Dubois et al. (2024) Y. Dubois, B. Galambosi, P. Liang, and T. B. Hashimoto Length-controlled alpacaeval: a simple way to debias automatic evaluators. arXiv preprint arXiv:2404.04475. Cited by: [§1](#S1.p2.1 "1 Introduction ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Ghugarkar et al. (2026) O. Ghugarkar, V. Bhat, M. A. Mohsin, and A. Aali MAVEN: improving generalization in agentic tool calling. External Links: 2605.30738, [Link](https://arxiv.org/abs/2605.30738) Cited by: [§2](#S2.SS0.SSS0.Px2.p1.1 "Interactive and stateful agent evaluation. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Gorilla Team (2024) Gorilla Team Berkeley function calling leaderboard. Note: [https://gorilla.cs.berkeley.edu/leaderboard.html](https://gorilla.cs.berkeley.edu/leaderboard.html)Accessed 2026 Cited by: [§1](#S1.p1.1 "1 Introduction ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Guo et al. (2024) Z. Guo, S. Cheng, H. Wang, S. Liang, Y. Qin, P. Li, Z. Liu, M. Sun, and Y. Liu StableToolBench: towards stable large-scale benchmarking on tool learning of large language models. In Findings of the Association for Computational Linguistics: ACL 2024, pp. 11143–11156. Cited by: [§1](#S1.p1.1 "1 Introduction ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation"), [§1](#S1.p2.1 "1 Introduction ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Li et al. (2023a) M. Li et al. API-bank: a comprehensive benchmark for tool-augmented llms. arXiv preprint arXiv:2304.08244. Cited by: [§1](#S1.p1.1 "1 Introduction ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation"), [§2](#S2.SS0.SSS0.Px1.p1.1 "Tool-use and function-calling benchmarks. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Li et al. (2023b) T. Li et al. AlpacaEval: an automatic evaluator of instruction-following models. arXiv preprint arXiv:2307.16140. Cited by: [§2](#S2.SS0.SSS0.Px3.p1.1 "MCP and LLM-as-a-judge evaluations. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Lu et al. (2024) J. Lu et al. ToolSandbox: a stateful, conversational, interactive evaluation benchmark for tool use capabilities of language models. arXiv preprint arXiv:2408.04682. Cited by: [§2](#S2.SS0.SSS0.Px2.p1.1 "Interactive and stateful agent evaluation. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Luo et al. (2025) Y. Luo et al. MCP-universe: large-scale evaluation of mcp-based agents. arXiv preprint arXiv:2505.XXXX. Cited by: [§2](#S2.SS0.SSS0.Px3.p1.1 "MCP and LLM-as-a-judge evaluations. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Mo et al. (2025) Y. Mo et al. LiveMCPBench: evaluating language agents on real mcp tool ecosystems. arXiv preprint arXiv:2506.07982. Cited by: [§1](#S1.p1.1 "1 Introduction ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation"), [§2](#S2.SS0.SSS0.Px3.p1.1 "MCP and LLM-as-a-judge evaluations. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Patil et al. (2024) S. Patil et al. BFCL: the berkeley function calling leaderboard. arXiv preprint arXiv:2410.XXXX. Cited by: [§2](#S2.SS0.SSS0.Px1.p1.1 "Tool-use and function-calling benchmarks. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Patil et al. (2023) S. Patil, T. Zhang, X. Wang, et al. Gorilla: large language model connected with massive apis. arXiv preprint arXiv:2305.15334. Cited by: [§1](#S1.p1.1 "1 Introduction ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation"), [§2](#S2.SS0.SSS0.Px1.p1.1 "Tool-use and function-calling benchmarks. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Qin et al. (2024) Y. Qin, S. Liang, Y. Ye, K. Zhu, L. Yan, Y. Lu, Y. Lin, X. Cong, X. Tang, B. Qian, S. Zhao, L. Hong, R. Tian, R. Xie, J. Zhou, M. Gerstein, D. Li, Z. Liu, and M. Sun ToolLLM: facilitating large language models to master 16000+ real-world apis. In International Conference on Learning Representations, Cited by: [§1](#S1.p1.1 "1 Introduction ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Qin et al. (2023) Y. Qin, Y. Ye, L. Fang, et al. ToolLLM: facilitating large language models to master 16000+ real-world apis. arXiv preprint arXiv:2307.16789. Cited by: [§2](#S2.SS0.SSS0.Px1.p1.1 "Tool-use and function-calling benchmarks. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Tang et al. (2023) Q. Tang et al. ToolAlpaca: generalized tool learning for language models. arXiv preprint arXiv:2306.05301. Cited by: [§2](#S2.SS0.SSS0.Px1.p1.1 "Tool-use and function-calling benchmarks. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Wang et al. (2025) Z. Wang et al. MCP-bench: benchmarking model context protocol agents. arXiv preprint arXiv:2505.XXXX. Cited by: [§2](#S2.SS0.SSS0.Px3.p1.1 "MCP and LLM-as-a-judge evaluations. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Wu et al. (2025) H. Wu et al. MCPMark: benchmarking and diagnosing mcp agent systems. arXiv preprint arXiv:2506.XXXX. Cited by: [§2](#S2.SS0.SSS0.Px3.p1.1 "MCP and LLM-as-a-judge evaluations. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Xie et al. (2024) T. Xie et al. OSWorld: benchmarking multimodal agents for open-ended tasks in real computer environments. arXiv preprint arXiv:2404.07972. Cited by: [§2](#S2.SS0.SSS0.Px2.p1.1 "Interactive and stateful agent evaluation. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Xu et al. (2023) Q. Xu et al. ToolBench: towards comprehensive, automatic and scalable evaluation for tool learning of large language models. arXiv preprint arXiv:2307.16789. Cited by: [§2](#S2.SS0.SSS0.Px1.p1.1 "Tool-use and function-calling benchmarks. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Yao et al. (2024) S. Yao et al. Tau-bench: a benchmark for tool-agent-user interaction in real-world domains. arXiv preprint arXiv:2406.12045. Cited by: [§1](#S1.p1.1 "1 Introduction ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation"), [§2](#S2.SS0.SSS0.Px2.p1.1 "Interactive and stateful agent evaluation. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Zheng et al. (2023) L. Zheng W. Chiang et al. Judging llm-as-a-judge with mt-bench and chatbot arena. Advances in Neural Information Processing Systems. Cited by: [§1](#S1.p2.1 "1 Introduction ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation"), [§2](#S2.SS0.SSS0.Px3.p1.1 "MCP and LLM-as-a-judge evaluations. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").
*   Zhou et al. (2023) S. Zhou et al. WebArena: a realistic web environment for building autonomous agents. arXiv preprint arXiv:2307.13854. Cited by: [§2](#S2.SS0.SSS0.Px2.p1.1 "Interactive and stateful agent evaluation. ‣ 2 Related Work ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation").

“‘latex

## Appendix A Qualitative Evaluator Failure Cases

This appendix provides representative cases underlying the aggregate disagreement and reproducibility results in Section [4](#S4 "4 Experiments ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation"). The examples illustrate two distinct failure modes: an incorrect deterministic communication target in τ2\\tau^{2}\-Bench and instability induced by stochastic rubric generation and judging in LiveMCPBench.

### A.1 τ2\\tau^{2}\-Bench: Incorrect Communication Target

Table [6](#A1.T6 "Table 6 ‣ A.1 𝜏^2-Bench: Incorrect Communication Target ‣ Appendix A Qualitative Evaluator Failure Cases ‣ Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation") summarizes a false negative from τ2\\tau^{2}\-Bench Retail. The official evaluator assigns a failure, whereas expert review assigns a pass. The database hash matches the reference state and all five expected tool actions are completed correctly. The only failed component is a natural-language assertion requiring the final response to contain the substring “1628.”

The user requested that reservations XEHM4B and 59XX6W be canceled and asked for the total cost of any _other_ upcoming flights. The remaining reservations were 7WPL39, costing $402, and 3EMQJ6, costing $306. The agent therefore reported

$402+$306\=$708.\\$402+\\$306=\\$708.

The reference target of $1,628 includes reservations that the user explicitly asked to cancel. The evaluator thus rejects a task-consistent answer because its communication assertion encodes an incorrect semantic target.

Table 6: Representative τ2\\tau^{2}\-Bench false negative.

The agent first identified the two remaining upcoming reservations and reported their combined cost as $708. After completing the requested upgrade and cancellations, it repeated the same total in the final response. The task therefore demonstrates that agreement on database state and tool execution does not guarantee a correct benchmark verdict when the communication target itself is semantically mis-specified.

### A.2 LiveMCPBench: Stochastic Rubric and Judge Instability

LiveMCPBench exhibits a different failure mode. Repeated execution of the default evaluation pipeline on the same 95-task configuration produces aggregate scores ranging from 57.9% to 76.8% across 23 valid runs. The mean is 69.4%, the standard deviation is 5.4 percentage points, and the total spread is 18.9 percentage points. This variation is large enough to change conclusions when leaderboard differences are only a few points.

Table 7: LiveMCPBench variability across 23 full runs of the default pipeline.

The default OpenBench scorer performs two stochastic LLM calls for each task. First, identify\_key\_points(task) regenerates evaluation criteria from the task text. Second, grader\_model.generate(...) evaluates the trajectory and final response against the generated criteria and returns a success or failure verdict. Human-authored step annotations are used only as a fallback when key-point generation fails; under normal execution, they do not determine the rubric.

This design introduces two sources of evaluator variability. First, regenerated key points can differ in specificity and strictness across runs, causing the same underlying behavior to be assessed against different criteria. Second, the final LLM verdict is itself stochastic and can flip on borderline traces. The default judge is gpt-4.1-mini, rather than the stronger judge configuration recommended in the benchmark paper, which may further increase instability.

Because these are complete benchmark reruns, the observed spread combines variation in agent trajectories with variation in rubric generation and judging. It therefore measures end-to-end pipeline instability rather than isolated judge noise. A controlled judge-only analysis would require repeatedly rescoring fixed trajectories under fixed and regenerated rubrics. “‘
