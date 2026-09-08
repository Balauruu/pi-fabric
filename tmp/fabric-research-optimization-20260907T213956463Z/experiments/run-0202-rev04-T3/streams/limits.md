# T3-C: Validity, contamination, reproducibility, and transfer limits for tool-agent evaluation

**Decision:** Treat benchmark results as bounded evidence about a specified agent–tool–environment configuration, not evidence that the deployed agent is reliable or secure. Security benchmarks measure attack success in their threat model. They do not prove security.

## Requirements coverage

| Requirement | Coverage | Evidence |
|---|---|---|
| R1 | Direct | AgentBench, ToolBench, τ-bench, WebArena, AgentDojo, AgentProp-Bench |
| R2 | Direct | Human-calibrated evaluator audit, LiveBench contamination analysis, benchmark authors’ stated limits |
| R3 | Direct operational implications | Derived from measured failure modes and transfer constraints |
| Standards | Gap | No inspected standard supplied a tool-agent reliability/security pass criterion. Do not substitute a risk-management standard for empirical evidence. |

## Source-bound measurement units

| Evaluation | Exact environment and method | Agent/model and comparator | Metric and outcome | Budget / caveat |
|---|---|---|---|---|
| **AgentBench** [§§2, 4.1–4.3; Tables 2–4](https://arxiv.org/html/2308.03688) | Eight text environments: OS, database, knowledge graph, card game, lateral-thinking puzzles, household, WebShop, and web browsing. Primitive CoT `Thought` + `Action`, greedy decoding, temperature 0. | 29 API and open models. GPT-4 0613 vs commercial/API peers and OSS models ≤70B. | GPT-4 weighted overall score **4.01**. Per-environment results: OS **42.4**, DB **32.0**, KG **58.8**, card game **74.5**, puzzle **16.6**, household **78.0**, shopping **61.1**, browsing **29.0**. Mean API score **2.32** vs OSS **0.51**. | Test has 1,014 tasks and about 11k expected calls. The result measures this primitive prompting setup, not a modern scaffold or live deployment. Failure taxonomy is valuable: database invalid format **53.3%**, household invalid action **64.1%**, and time-limit exhaustion up to **82.5%** in puzzles. |
| **ToolBench / ToolEval** [§§2.1–3.2; Tables 3–4; App. A.5](https://arxiv.org/html/2307.16789) | 3,451 tools and 16,464 RapidAPI REST APIs. Single-tool and two multi-tool classes. ToolEval uses ChatGPT to judge executability and pairwise quality. | ToolLLaMA, LLaMA-2-7B fine-tuned on 126,486 generated instruction/solution pairs, vs ChatGPT, GPT-4, Claude-2, Vicuna, Alpaca. DFSDT vs ReAct and cost-matched ReAct@N. | DFSDT annotation pass rate **63.8%**, vs ReAct **35.3%** and ReAct@N **44.5%**. Main averages: GPT-4 DFSDT **71.1 pass / 70.4 win**; ToolLLaMA DFSDT **66.7 / 60.0**. | Most main methods receive **oracle APIs**, while retriever mode receives top five APIs. “Limited budgets” are not numerically specified. ToolEval human agreement was **87.1%** for pass and **80.3%** for win, not a guarantee of correct scoring. RapidAPI changes over time and multiple valid paths exist. |
| **τ-bench** [§3; §5; Table 2; Fig. 4; §6](https://arxiv.org/html/2406.12045) | Simulated dynamic customer conversations in retail and airline domains. The score requires both correct final database state and sufficient final response. | Function-calling, text-ReAct, and Act-only agents. gpt-4o, GPT-4 variants, Claude 3 family, Gemini 1.5, Mistral, Mixtral, and Llama 3. | gpt-4o function-calling: about **61% pass¹** retail and **35.2%** airline. Despite over 60% retail mean success, **pass⁸ <25%**. | Maximum **30 actions** per task, ≥3 trials/task, agent temperature 0, user simulator temperature 1. A “pass⁸” metric assumes independent trials. User simulator and policy/task construction introduce distributional and curation limits. |
| **WebArena** [evaluation and limitations](https://arxiv.org/html/2307.13854) | 812 long-horizon tasks over self-hosted ecommerce, forum, GitLab-like collaborative development, CMS, and knowledge/tool sites. Programmatic state validators or answer matching. Docker resets initial state. | Best GPT-4-based web agent vs human baseline. | Agent end-to-end success **14.41%** vs human **78.24%**. | Self-hosting improves reproducibility but creates a bounded replica, not live-web transfer. Domain knowledge and Northeast-US map coverage limit external validity. |
| **AgentDojo** [§§3.4–4.3; Tables 1, 3–5; §5](https://arxiv.org/html/2406.13352v3) | 629 prompt-injection security cases and 97 benign user tasks across Workspace, Slack, Travel, Banking. 70 tools and 27 injection targets. | Ten models including GPT-4o, Claude 3/3.5, Gemini 1.5, Command-R+, Llama 3 70B. GPT-4o defenses: none, delimiting, detector, repeat prompt, tool filter. | GPT-4o: benign utility **69.00%**, utility under attack **50.08%**, targeted attack success **47.69%**. With the strongest tested “Important message” attack, GPT-4o targeted ASR **57.7%**. Tool filter reduced it from **57.69%** to **6.84%**, with benign utility **73.13%** and utility-under-attack **56.28%**. | 95% CIs reported. Paper estimates GPT-4o cost at **$35** for security cases and **$4** for utility cases. No repeat count reported. Attacks/defenses are explicitly “relatively simple”; no multimodal or multi-task-over-time coverage. Tool filter cannot help when necessary tools also enable the attack, reported for **17%** of cases. |
| **AgentProp-Bench evaluator audit** [§§3–5, 9, 11; Tables 2–3, 8](https://arxiv.org/html/2604.16706) | Deterministic JSON-schema Python tool simulators for calendar, weather, medical, knowledge, plus held-out retail. 2,000 core tasks, 300 holdout retail tasks, 14,750 released traces. | Thirteen models. Compare substring heuristic, GPT-4o/Gemini-2.5-Flash/GPT-4o-mini majority judge, GPT-4o-mini judge, and two blinded human annotators. | Human inter-annotator κ **0.835**. Substring heuristic κ **0.036** against consensus, essentially chance. Ensemble κ **0.432**. GPT-4o-mini κ **0.567**. Ensemble called **25%** correct where humans called **38%**, a roughly **13pp** undercount. | Only 100 human-labeled traces and two similar-background annotators. Per-model stage-two samples are 2–56. Deterministic simulators and one injected bad parameter do not establish live-tool, multi-error, or multi-turn reliability. |
| **AgentProp runtime interceptor** [§4; §9; Table 8](https://arxiv.org/html/2604.16706) | Concurrent interceptor checks schema/tool errors, selected error-language markers, and unsupported numeric claims; compared to a no-interceptor control on the same tasks. | GPT-4o-mini, Gemini-2.0-Flash, Qwen2.5-7B/14B, Hermes-3-Llama-8B. | Hallucination reductions: GPT-4o-mini **−23.0pp**, Qwen2.5-7B **−24.0pp**, Qwen2.5-14B **−8.0pp**, Hermes **−4.0pp**. Schema-only Qwen7B precision **0.62**: 39 harmful outputs stopped, 24 correct outputs withheld. | Absolute outcome rates were not human-validated per arm. Gemini’s near-null reduction (−1.3pp) coincided with rare tool calling, showing that low injection admission can be non-use rather than robustness. |

## Counterevidence and transfer boundaries

### Evaluator validity

1. **Automatic correctness can be wrong enough to reverse an operational conclusion.** AgentProp-Bench’s common-style substring grader had κ=0.036 against human consensus, while its LLM ensemble systematically undercalled correctness by about 13pp. Report answer-level success only after human calibration on representative traces. Do not use an unvalidated judge as the sole release gate.

2. **A low attack-admission rate can be a failure signal.** In AgentProp-Bench, Gemini-2.0-Flash rarely issued tool calls and fabricated tool-derived results on **37.5%** of no-tool-call traces. An “agent rejected the malicious parameter” metric without tool-call adherence and evidence provenance can reward non-execution or fabricated execution.

3. **Task success conceals reliability shape.** τ-bench’s pass¹ and pass⁸ contrast means a system that often succeeds once may be unsuitable where all repeated or chained jobs must succeed. Report per-run success, repeated-run success, abstention, and the distribution of failure classes separately.

### Contamination and benchmark drift

1. **Static public tasks are contamination-exposed unless evidence shows otherwise.** AgentBench includes public materials and ToolBench uses public RapidAPI documentation. SWE-bench is derived from public GitHub issues and repositories. None of the inspected evaluations establishes that every evaluated model’s pretraining/fine-tuning corpus excludes every task, issue, documentation page, solution, and close paraphrase. Therefore their score cannot distinguish generalization from prior exposure.

2. **Contamination mitigation is imperfect even when designed for it.** LiveBench defines contamination as test questions and answers appearing in training data, reports cutoff-related performance changes and GitHub-frequency correlation, yet acknowledges likely contamination in some November-2023 coding and lightly modified AMC questions. Its countermeasures are recent sourcing, private questions for one month, monthly refresh, and replacement of about one sixth of questions per update. [LiveBench §1, §§2.7, A.6–A.7](https://arxiv.org/html/2406.19314)

3. **APIs and benchmarks drift.** ToolBench’s authors state RapidAPI temporal variability makes a fixed solution path impractical. τ-bench’s task and policy choices are curated. WebArena’s containerized replica trades live realism for determinism. Reproduce the exact image, API schema/version, model version, prompt, tool policy, and seed. A later rerun without this manifest is a new evaluation.

### Security transfer

1. **AgentDojo measures tool-output prompt injection in four simulated domains.** Its result is strong evidence that these models and defenses can fail under that threat model. It is not evidence about indirect injection in the deployed data sources, credential theft, cross-tenant effects, multimodal payloads, malicious tool implementations, timing races, or an attacker adapting after observing defenses.

2. **A control that reduces benchmark ASR can still be bypassable or harmful.** Tool filtering is limited when required tools also permit the malicious action, and it may block correct work. The reported 6.84% ASR is a measured residual in a specific suite, not a system-level upper bound.

## Decision table

| Deployment decision | Minimum evidence threshold | Block / downgrade signal | Resulting control |
|---|---|---|---|
| Read-only, reversible tool use | Held-out tasks from the target workflow, trace-level human calibration, repeated runs, and observed tool-call adherence. | Success evaluated only by an unvalidated LLM/substring judge, or fabricated claimed tool use. | Read-only scopes, provenance log, explicit “not completed” state when no verified tool result exists. |
| State-changing but reversible actions | Above plus state-validator success, idempotency/retry test, and failure recovery test under schema error, timeout, stale data, and ambiguous user request. | Nontrivial invalid-action/format or time-limit failure rate, or pass¹ presented without repeated-run evidence. | Transaction boundaries, dry run, rollback, deduplication key, and confirmation at the action boundary. |
| Actions involving money, external commitments, secrets, or privilege changes | Target-domain security evaluation with untrusted tool content, human-reviewed adversarial cases, measured benign utility and ASR, and a residual-risk decision by owner. | Any target attack completes a consequential action, tool result can influence authority without policy enforcement, or evaluation excludes the required tool/action combination. | Separate authorization service, least privilege, scoped short-lived credentials, allowlisted action parameters, mandatory human approval. |
| Autonomous operation after model/tool/prompt change | Re-run locked release suite and a fresh holdout slice with version manifest. | Model alias/provider update, changed tool schema, changed prompt, changed policy, or benchmark drift without rerun. | Canary rollout, version pinning, rollback threshold, and change-specific re-approval. |

## Concrete failure signals to instrument

- **Protocol:** invalid tool-call JSON, schema rejection, unknown tool, wrong argument type, repeated identical call, action-budget exhaustion, timeout.
- **Execution:** state validator fails, unexpected write set, retry without idempotency key, rollback failure, tool return differs from expected schema/version.
- **Truthfulness:** claimed completion with no corresponding successful tool event, final numeric/value claim unsupported by a logged observation, answer–database-state mismatch.
- **Security:** untrusted content appears in the causal trace of a privileged tool call, attempted use of a tool outside task allowlist, secret-bearing output routed to external tool, targeted attack objective achieved.
- **Evaluation integrity:** unknown model revision, missing seed/image/prompt/tool manifest, judge–human disagreement above calibrated tolerance, holdout overlap or public-task exposure unresolved.

## Smallest resolving evaluation

Before permitting a consequential tool action, run **50–100 newly authored, private, target-workflow cases** in a cloned environment:

- Split: 60% normal work, 20% realistic tool faults and ambiguous instructions, 20% adversarial untrusted-tool-content cases.
- Run the exact release candidate with the production prompt, tool schemas, permissions, action budget, and model revision. Use at least three independent runs per stochastic configuration.
- Score final state programmatically where possible. Blindly human-label a stratified trace sample, including every security failure, every abstention, and judge-disagreement cases.
- Report: state success, pass³, tool-call adherence, invalid-action rate, timeout rate, abstention precision/recall, targeted ASR, benign utility, and human-calibrated score uncertainty.
- **Decision rule:** any unauthorized consequential action is a release blocker. Otherwise, deploy only the action classes whose residual failure rate and recovery behavior match the explicit risk owner threshold.

This resolves the principal unknowns that public benchmarks cannot: target-domain transfer, current model/tool behavior, evaluator validity, and the security boundary of the actual authority surface.

## Retained-source appendix

1. **AgentBench**, *AgentBench: Evaluating LLMs as Agents*. Sections 2, 4.1–4.3; Tables 2–4.  
   https://arxiv.org/html/2308.03688

2. **ToolLLM / ToolBench**, *ToolLLM: Facilitating Large Language Models to Master 16000+ Real-world APIs*. Sections 2.1–3.2; Tables 3–4; Appendix A.5.  
   https://arxiv.org/html/2307.16789

3. **τ-bench**, *A Benchmark for Tool-Agent-User Interaction in Real-World Domains*. Sections 3, 5, 6; Table 2; Figure 4.  
   https://arxiv.org/html/2406.12045

4. **WebArena**, *A Realistic Web Environment for Building Autonomous Agents*. Evaluation and limitations sections.  
   https://arxiv.org/html/2307.13854

5. **AgentDojo**, *A Dynamic Environment to Evaluate Prompt Injection Attacks and Defenses for LLM Agents*. Sections 3.4–5; Tables 1, 3–5; Appendix D.  
   https://arxiv.org/html/2406.13352v3

6. **AgentProp-Bench**, *Auditing Automated Evaluation, Error Propagation, and Runtime Mitigation in Tool-Using Language Agents*. Sections 3–5, 9, 11; Tables 2–3, 8. Preprint, so retain its stated sample-size and simulator limitations.  
   https://arxiv.org/html/2604.16706

7. **LiveBench**, *LiveBench: A Challenging, Contamination-Limited LLM Benchmark*. Sections 1, 2.7, 5, A.4, A.6–A.7. Used only for the general contamination-method evidence, not as a tool-agent reliability result.  
   https://arxiv.org/html/2406.19314