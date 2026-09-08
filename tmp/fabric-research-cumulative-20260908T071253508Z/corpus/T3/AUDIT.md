# T3 corpus audit

## Scope and provenance

This audit records only source-audited facts needed to grade a response to the T3 phase-only task. Every cited source file is a complete readable extraction of the original publication, with its retrieved URL, version, headings, tables, and continuation ranges in its header. Numbers below are measurements only where explicitly labeled **Measured**. Operational controls are **Proposed controls**, not experimental findings.

| ID | Primary source | Frozen file |
|---|---|---|
| S1 | *A Benchmark for Tool-Agent-User Interaction in Real-World Domains*, arXiv HTML `2406.12045` | `sources/tau-bench-2406.12045.md` |
| S2 | *Beyond Function Calling: Benchmarking Tool-Using Agents under Tool-Environment Unreliability*, arXiv `2606.25819v1` | `sources/toolbench-x-2606.25819v1.md` |
| S3 | *Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation*, arXiv HTML `2607.02577` | `sources/evaluator-validity-audit-2607.02577.md` |
| S4 | *AgentDojo: A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents*, arXiv `2406.13352v3` | `sources/agentdojo-2406.13352v3.md` |

## A1. Repeat-run reliability: τ-bench

**Original model/environment/comparator/sample/conditions.** S1 §3–§5 defines retail and airline customer-service environments with deterministic Python database APIs, domain policies, and a `gpt-4-0613` simulated user. The agent can see APIs and policy, not task annotations. The reward is final database equality to the unique annotated outcome plus required user-facing information. Main results use function calling except text-ReAct for Llama-3, cap tasks at 30 agent actions, run at least three trials per task, agent temperature 0.0, user temperature 1.0. The reported comparison is across models and methods, with GPT-4o function calling the leading reported function-calling baseline.

**Exact saved primary passages.** S1 Abstract and §3:

> “We employ an efficient and faithful evaluation process that compares the database state at the end of a conversation with the annotated goal state. We also propose a new metric (pass^k) to evaluate the reliability of agent behavior over multiple trials.”
>
> “For real-world agent tasks requiring reliability and consistency like customer service, we propose a new metric – pass^k (pass hat k), defined as the chance that all k i.i.d. task trials are successful, averaged across tasks.”
>
> “In our case, for the same task, the user prompt and database transitions are the same, with just the LM sampling of the user and agent messages generating sufficient stochasticity.”

**Measured.** S1 §1 and §5.1 report GPT-4o function calling at approximately 61% pass^1 on τ-retail and 35% on τ-airline. The paper reports retail pass^8 below 25% for that agent. Its manual retail sample had 115 trajectories, 40 failures, pass^1 = 65.2%; after four typo/ambiguity cases were fixed, 36 were treated as agent issues. Units are percent or fraction of benchmark task trials, not production incidents or breach probabilities.

**Qualification/counterevidence.** S1 §3 says `r=1` can be necessary but not sufficient, for example an agent can violate a confirmation policy while meeting the rule-based reward. S1 §6 identifies simulated-user typos/ambiguities and incomplete domain knowledge as limitations. Thus pass^k measures the paper’s stochastic conversations with the same semantics and fixed policies, not arbitrary live users or security.

## A2. Recoverable tool-environment failures: ToolBench-X

**Original model/environment/comparator/sample/conditions.** S2 §3–§4 evaluates executable multi-step tasks with deterministic Python tools and canonical final answers. Starting from clean tool environments, it injects five structured, explicitly recoverable hazards: specification drift, invocation error, execution failure, output drift, and cross-source conflict. A 200-task stratified evaluation pool is compared in Baseline (injected exceptions), Hint (after a failure, disclose the current tool-environment problem), TTS (after a failure, give 10 additional interaction rounds without a hint), and Oracle (clean environment). The diagnostic comparison reported in the supplied original is across five models, from DeepSeek-V4-Flash to GPT-5.4-Mini, not an asserted twelve-model result.

**Exact saved primary passages.** S2 §3–§4:

> “We do not inject arbitrary corruptions that make the task unsolvable. Instead, every uncertainty-injected instance preserves at least one viable recovery path, which may involve retrying a failed call, selecting a fallback tool, normalizing a changed output format, checking multiple sources, or verifying suspicious evidence before producing the final answer.”
>
> “In Test Time Scaling (TTS), after the agent fails a task, the model is given an additional budget of 10 interaction rounds to retry without any hint.”
>
> “Hint lifts Baseline accuracy by 25.5 to 35.5 absolute points, recovering roughly 60 to 80 percent of the lost accuracy across all five models.”
>
> “TTS improves Baseline accuracy by only 3.5–11.5 percentage points, while Hint consistently outperforms TTS by 24–32 points.”

**Measured.** The units are absolute task-accuracy percentage points on the 200-task diagnostic subset. The reported experiment supports a diagnosis-information versus extra-rounds comparison under constructed recoverable hazards. It does not establish that a deployment will diagnose unknown, irreversible, adversarial, or intrinsically unsolvable failures.

**Qualification/counterevidence.** S2’s recoverability guarantee is a construction condition. Any claim that arbitrary retries recover real failures overextends the source. The source attributes residual failure to adaptive recovery behavior and identifies diagnosis, not added computation alone, as the bottleneck.

## A3. Evaluator validity and repeated scoring: validity audit

**Original model/evaluator/comparator/sample/conditions.** S3 §3.3–§4.4 audits four benchmark families: BFCL v4, τ²-Bench Retail, LiveMCPBench, and MCP-Atlas. Benchmark labels are compared with expert trace-level judgments. Three independent expert annotators inspect complete traces, tool outputs, state changes, and final user-visible outcome, resolving disagreements through adjudication. The audited agents are Kimi-K2.6 for τ²-Bench and MiniMax-M2.7 for the other listed suites. For stochastic-score reproducibility, S3 reruns the same 95-task LiveMCPBench configuration 23 times.

**Exact saved primary passages.** S3 Abstract, §4.1, Table 3, and §4.4:

> “Across 496 expert-reviewed benchmark tasks, we find 92 evaluator-human disagreements, corresponding to an 18.5% misalignment rate.”
>
> “Three independent expert annotators reviewed the complete execution traces, including the user request, tool calls, tool outputs, environment-state changes, and final response. Disagreements were resolved through adjudication.”
>
> “Across 23 runs, LiveMCPBench scores range from 57.9% to 76.8%, with mean 69.4%, standard deviation 5.4 percentage points, and spread 18.9 percentage points. The best and worst runs differ by 18 successful tasks out of 95.”

**Measured.** Table 3 gives 11/112 (9.8%) misaligned τ²-Bench labels, 40/200 (20.0%) BFCL labels, 12/89 (13.5%) MCP-Atlas labels, and 29/95 (30.5%) LiveMCPBench labels. Aggregate agreement is 81.5%, with 92/496 disagreements. The repeated-run values are a score range, mean, sample standard deviation, and max-minus-min spread for one fixed configuration.

**Qualification/counterevidence.** The audit is itself a publication’s expert-adjudicated analysis, not an independent reproduction by this corpus builder. It finds both deterministic and LLM-judge failure modes, so replacing deterministic checks with an LLM judge alone is not supported as a solution. S3 explicitly limits its proposed Tool-Veritas comparison to different task distributions and model configurations.

## A4. Security boundary and utility trade-off: AgentDojo

**Original model/environment/comparator/sample/conditions.** S4 §3–§4 uses stateful Workspace, Slack, Travel, and Banking environments, 70 tools, 97 user tasks, and 629 security test cases. A security case combines a user task, attacker goal, and injection endpoint in untrusted tool-retrieved content. The evaluator uses utility/security check functions on environment state. It evaluates full security suites and compares no-defense GPT-4o with data delimiters, a BERT prompt-injection detector that aborts on detection, repeat prompting, and a pre-data tool filter. Reported uncertainty is 95% confidence intervals.

**Exact saved primary passages.** S4 §4 and Tables 3–5:

> “Targeted Attack Success Rate (ASR): the fraction of security cases where the attacker’s goal is met (i.e., the agent executes the malicious actions).”
>
> “We evaluate each agent on our full suite of 629 security test cases, for 97 different user tasks.”
>
> “Our simple tool filtering defense is particularly effective, lowering the attack success rate to 7.5%. This defense is effective for a large number of the test cases in our suite, where the user task only requires read-access to a model’s state … while the attacker’s task requires write-access … This defense fails, however, when the list of tools to use cannot be planned in advance.”
>
> “Unfortunately, current techniques are not foolproof, and may be unable to provide guarantees for security-critical tasks.”

**Measured.** Table 3 reports GPT-4o benign utility 69.00% ±3.61, utility under attack 50.08% ±3.91, and targeted ASR 47.69% ±3.90. Table 5 reports, under its strongest attack selection, no-defense targeted ASR 57.69% ±3.9; detector ASR 7.95% ±2.1 with benign utility 41.49% ±3.9; and tool-filter ASR 6.84% ±2.0 with benign utility 73.13% ±3.5. These are benchmark security-case fractions, not probability of compromise in a particular production system.

**Qualification/counterevidence.** S4 says the data are dummy/benign and the benchmark needs adaptive attacks rather than only default attacks. Its tool filter has a planning prerequisite. Therefore lower ASR in this environment is evidence of a tested utility-security trade-off, not a security guarantee or a substitute for authorization enforcement outside the model.

## Proposed controls, kept separate from measurements

The following are deployment evaluation implications, not results measured by S1–S4:

1. Freeze and record model, prompt, orchestration, schemas, tool versions, policy, identity, retrieval snapshot, temperature, and evaluator version before comparing runs.
2. Assert post-state and policy-log effects for consequential tools. Retain traces, inputs, tool outputs, state deltas, evaluator verdicts, and human adjudications for disagreements.
3. Repeat representative workflows and report pass^1 plus an all-runs-success metric such as pass^k, uncertainty/spread, false passes, false fails, and policy violations. A fixed `k=8` is a proposed design choice, not a universal threshold established by S1.
4. Test the actual tool and permission envelope with injected timeout, malformed/schema-drift, stale/conflicting-output, and recoverable-service conditions. Require bounded retry, verified fallback, or explicit escalation rather than fabricated completion.
5. Treat retrieved and third-party tool output as untrusted data. Enforce authorization, scope, approval binding, and irreversible-action policy outside the model. Test every reachable injection channel with adaptive attacks and measure utility together with targeted ASR.

## Legacy corrections

- The legacy claim that the evaluator audit reports “kappa 0.049 versus erroneous 0.036” is **not retained**. Searches in the retrieved original S3 for `Cohen`, `kappa`, `0.049`, and `0.036` return no matches. S3 reports agreement/misalignment and repeated-run score statistics instead.
- The legacy ToolBench-X row combines incompatible result snapshots and names twelve models. This corpus retains only S2’s inspected v1 design and its explicit five-model, 200-task diagnostic comparison. It does not retain unverified best-score values.
- The τ-bench `pass^8` evidence is retained because S1 explicitly defines pass^k and reports retail pass^8 below 25%, but it is not converted into a mandatory deployment repetition count.
