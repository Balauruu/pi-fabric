## T3 — Tool-agent reliability, recovery, and evaluator validity

**Status:** Partial, source-inspected 2026-09-07. This note addresses recoverable tool failures, recovery conditions, benchmark snapshots, and evaluator validity. It does not establish production security.

### Requirement contract

| ID | Exact question | Required contribution |
|---|---|---|
| T3 / R1 | “which primary evaluations or standards measure tool-agent reliability, task success, failure handling, and security-relevant behavior, with exact environment, agent/model, comparator, method and outcomes?” | Identify primary evaluations with source-bound methods and results. |
| T3 / R2 | “what counterevidence, benchmark/evaluator limits, and transfer constraints prevent overclaiming safety or reliability?” | State validity limits and conflicting evidence. |
| T3 / R3 | “what actionable evaluation and operational controls follow for deploying a tool-using agent?” | Give a decision table and smallest resolving evaluation. |

## Findings

### 1. Recoverability must be constructed and separately measured

[ToolBench-X, arXiv v1](https://arxiv.org/html/2606.25819v1) evaluates tool agents in deterministic executable tasks with canonical answers. Its stated snapshot has **1,106 tasks and 4,956 tools** and injects five hazard classes: specification drift, invocation error, execution failure, output drift, and cross-source conflict ([Introduction comparison table](https://arxiv.org/html/2606.25819v1#Sx1.T1)). Every injected task is intended to retain at least one valid recovery path: retry, fallback, output normalization, cross-check, or verification ([“Recoverability”](https://arxiv.org/html/2606.25819v1#Sx2.SS1.SSS2)).

Its diagnostic experiment sampled **200 tasks**, comparing injected-hazard baseline with: **Oracle** clean tools, **Hint** after failure identifying the hazard, and **test-time scaling** with ten extra interaction rounds but no hint ([“Are failures unrecoverable, or merely undiagnosed?”](https://arxiv.org/html/2606.25819v1#Sx4.SS1)). Across five evaluated models, baseline-to-oracle differed by roughly **35–50 percentage points**. Hints improved accuracy by **25.5–35.5 points**, recovering roughly **60–80%** of the lost accuracy. Extra rounds alone added only **3.5–11.5 points**. Reported examples: GPT-5.4-Mini **0.840 Hint vs 0.520 TTS** and Claude-Sonnet-4.6 **0.775 vs 0.535** ([Figure 4 discussion](https://arxiv.org/html/2606.25819v1#Sx4.F4)).

**Interpretation:** This supports measuring anomaly detection and recovery policy separately from ordinary task success. It does not show that a model can recognize unmodeled production incidents. The “Hint” is an oracle-like diagnostic aid, not an operationally available signal.

The same paper validates exact-match evaluation against independent human semantic judgments on a stratified sample of 100 retained instances: **97/100 agreement (97.0%)** ([Appendix A, “Agreement between exact match and semantic judgment”](https://arxiv.org/html/2606.25819v1#A1.SS2)). This is evidence that its final-answer evaluator is reasonably aligned for that sample, not that trajectory safety or recovery quality is fully measured.

### 2. Stateful deterministic validators are stronger evidence for security-task completion

[AgentDojo, arXiv v3](https://arxiv.org/html/2406.13352v3) is a dynamic stateful environment for indirect-prompt-injection evaluation. Its initial benchmark version contains **70 tools, 97 user tasks, 27 injection targets, and 629 security test cases** across Workspace, Slack, Travel, and Banking ([Table 1](https://arxiv.org/html/2406.13352v3#S3.T1)).

A task’s utility is a **deterministic binary function** over the model output plus environment state before and after execution, rather than an LLM judge ([“User tasks”](https://arxiv.org/html/2406.13352v3#S3.SS1.SSS2)). This makes it suitable for checking whether the intended state change occurred and whether a specified attacker objective occurred.

On the full 629 security cases, the paper reports for **GPT-4o** under its “Important message” attack: benign utility **69.00% ±3.61**, utility under attack **50.08% ±3.91**, and targeted attack-success rate **47.69% ±3.90** ([Appendix C, Table 3](https://arxiv.org/html/2406.13352v3#A3.T3)). With GPT-4o, its tool-filter defense had targeted ASR **6.84% ±2.0** versus **57.69% ±3.9** with no defense, while utility under attack was **56.28% ±3.9** versus **50.01% ±3.9** ([Appendix C, Table 5](https://arxiv.org/html/2406.13352v3#A3.T5)).

**Interpretation:** Evaluate both attacker success and user-task utility under attack. An ASR reduction alone can be achieved by refusing or disabling useful actions.

### 3. LM emulation and LM judges can find risks, but cannot prove absence of risk

[ToolEmu, arXiv v2](https://arxiv.org/html/2309.15817v2) uses GPT-4 both to emulate tools/sandbox state and to score safety and helpfulness. Its benchmark has **144 underspecified-instruction test cases**, across **36 toolkits** and **nine risk types** ([§1](https://arxiv.org/html/2309.15817v2#S1)).

The evaluator found **73.1% recall** and **75.3% precision** against majority vote of three human annotators. A held-out human had average recall **78.8%** and precision **78.7%**. Of failures identified by the emulator/evaluator, **68.8%** were human-validated as genuinely risky with realistic emulation trajectories ([§4.3 validation](https://arxiv.org/html/2309.15817v2#S4.SS3)). In its model comparison, GPT-4 with a safety prompt had **23.9% failure incidence**, versus GPT-4 Basic **39.4%**, Claude-2 **44.3%**, and ChatGPT-3.5 **62.0%** ([Table 5](https://arxiv.org/html/2309.15817v2#S5.T5)).

**Interpretation:** ToolEmu is evidence for scalable failure discovery and relative comparisons in its threat model. Its imperfect recall means a “no detected failure” result is not a security claim. Its own limitations section reports emulators missing core constraints, particularly in complex or adversarial cases ([§7](https://arxiv.org/html/2309.15817v2#S7)).

## Benchmark versions and comparability

| Evaluation | Inspected version/snapshot | What it measures | Do not compare directly with |
|---|---|---|---|
| ToolBench-X | arXiv **v1**, 1,106-task paper snapshot | Final-answer accuracy under injected but recoverable tool hazards | AgentDojo ASR or ToolEmu safety incidence |
| AgentDojo | arXiv **v3**, initial suite of 97 tasks / 629 security cases | Deterministic utility and attacker-goal completion in stateful environments | ToolBench-X accuracy |
| ToolEmu | arXiv **v2**, 144 cases / 36 toolkits | LM-emulated risk discovery and LM-judged safety/helpfulness | Deterministic security pass rates |

Paper versions are not package commits. A deployment evaluation must record benchmark release/commit, task subset, agent scaffold, model/API snapshot, prompt, tool schema, retry budget, timeouts, and validator version. Otherwise scores are not a common leaderboard.

## Counterevidence and limits

[Firewalls or Stronger Benchmarks?, arXiv v2](https://arxiv.org/html/2510.05244v2) argues that public indirect-prompt-injection benchmarks can be saturated by simple defenses because of **flawed success metrics, implementation bugs, and weak attacks**, and proposes revised AgentDojo/ASB settings plus cascading adaptive attacks ([Abstract](https://arxiv.org/html/2510.05244v2#abstract); [Conclusion](https://arxiv.org/html/2510.05244v2#S9)). It specifically argues that InjecAgent lacks utility measurement and ASB has missing tool arguments and unnatural calling conditions. This is counterevidence to reading low ASR as robust security.

The counterevidence is itself a preprint proposing and evaluating a defense. Treat it as a strong reason to re-test with adaptive attacks and fixed benchmark versions, not independent proof that every prior result is invalid.

## Deployment decision table

| Decision | Evidence-supported action | Failure signal | Boundary |
|---|---|---|---|
| Recoverable execution failures | Implement typed error classification, bounded retry only for explicitly transient failures, fallback selection, and post-recovery verification. | Repeated identical calls, continued execution after contradictory output, or incomplete final state. | Retry is unsafe for non-idempotent or irreversible tools without an idempotency key. |
| Output/specification drift | Require schema validation, freshness/version checks, and explicit uncertainty escalation. | Parse succeeds but semantic checks, source agreement, or schema version fail. | ToolBench-X models synthetic, known recovery paths. |
| Untrusted tool output | Treat tool output as data, restrict available tools per task, and require deterministic authorization/state checks before high-impact calls. | Tool output requests an unrelated action, data export, permission change, or policy override. | AgentDojo measures a bounded attack suite, not all prompt injections. |
| Evaluator validity | Prefer deterministic final-state validators and retain traces. Use blinded human review for residual judgment calls. | LLM judge disagrees with deterministic state or reviewer. | ToolEmu evaluator recall of 73.1% means absence of detected harm is insufficient. |
| Release decision | Gate deployment on paired benign, recoverable-failure, and adaptive-adversarial evaluations with the same agent/tool budget. | Security improvement coincides with utility collapse, or failure recovery increases destructive calls. | No cited benchmark establishes production security. |

## Smallest resolving evaluation

**Decision:** whether to permit the agent to autonomously retry and recover on a production tool class.

Use a small representative set of tasks that contain the actual high-impact operations. For each task, pair a clean run with one controlled, recoverable fault: transient timeout, permanent failure, schema/output drift, and contradictory untrusted content. Hold model, prompt, tools, context/action budget, credentials, and task state fixed. Randomize fault ordering.

Use deterministic final-state correctness, policy-violation occurrence, and successful recovery as primary measures. Log: first failure signal, diagnostic classification, retry count, fallback chosen, post-recovery validation, irreversible calls, latency, and total model/tool cost. Blind-review only cases where deterministic correctness is unavailable.

The decision changes only if the retry policy improves final-state success over no retry **without increasing policy violations or irreversible duplicate effects**. If it does, permit recovery only for the fault classes and tool operations that passed. Otherwise require human escalation.

## Evidence anchors

1. **Claim:** Diagnosis, not extra interaction budget alone, was the main recoverability bottleneck.  
   **Source/locator:** [ToolBench-X v1, Figure 4 discussion](https://arxiv.org/html/2606.25819v1#Sx4.F4).  
   **Result/unit:** Hint +25.5–35.5 percentage points, recovering ~60–80% of baseline-to-oracle loss. TTS +3.5–11.5 points.  
   **Conditions:** 200-task sampled subset, five models, injected hazards, Hint after failure, TTS gets 10 extra rounds.  
   **Comparator:** injected baseline, clean-tool oracle, Hint, TTS.  
   **Caveat:** synthetic recoverable paths and diagnostic hints do not represent arbitrary incidents.  
   **Contribution:** R1, R3.

2. **Claim:** ToolBench-X’s final-answer exact match had limited human validity evidence.  
   **Source/locator:** [ToolBench-X v1, Appendix A](https://arxiv.org/html/2606.25819v1#A1.SS2).  
   **Result/unit:** 97/100, 97.0% agreement with independent semantic judgment.  
   **Conditions:** stratified random sample of retained instances.  
   **Comparator:** backend exact match versus human semantic judgment.  
   **Caveat:** validates answer matching, not recovery trajectory or safety.  
   **Contribution:** R2.

3. **Claim:** Deterministic state-based utility and attack validators can expose the security-utility tradeoff.  
   **Source/locator:** [AgentDojo v3, task utility design](https://arxiv.org/html/2406.13352v3#S3.SS1.SSS2); [Table 5](https://arxiv.org/html/2406.13352v3#A3.T5).  
   **Result/unit:** GPT-4o no defense: 57.69% targeted ASR and 50.01% utility under attack. Tool filter: 6.84% ASR and 56.28% utility under attack.  
   **Conditions:** AgentDojo’s 629 security cases, GPT-4o, authors’ attack and defense configuration.  
   **Comparator:** no defense versus tool filter.  
   **Caveat:** bounded suite and attack family.  
   **Contribution:** R1, R3.

4. **Claim:** LM-judge/emulator findings are useful but cannot establish absence of harm.  
   **Source/locator:** [ToolEmu v2, validation](https://arxiv.org/html/2309.15817v2#S4.SS3); [limitations](https://arxiv.org/html/2309.15817v2#S7).  
   **Result/unit:** safety evaluator precision 75.3%, recall 73.1%; 68.8% of identified failures human-validated as realistic and risky.  
   **Conditions:** GPT-4 emulation and evaluation, comparison with three human annotators.  
   **Comparator:** automatic evaluator versus majority and held-out human annotators.  
   **Caveat:** missed risks and emulation constraint omissions, especially in complex/adversarial cases.  
   **Contribution:** R2.

5. **Claim:** Existing prompt-injection benchmark outcomes may be inflated by weak attacks and metric/design defects.  
   **Source/locator:** [Firewalls or Stronger Benchmarks? v2, Abstract](https://arxiv.org/html/2510.05244v2#abstract); [Conclusion](https://arxiv.org/html/2510.05244v2#S9).  
   **Result/unit:** qualitative audit finding, not a directly comparable reliability score.  
   **Conditions:** authors’ analysis of AgentDojo, ASB, InjecAgent, and τ-bench-derived setup.  
   **Comparator:** original benchmark settings versus proposed revised settings and adaptive attack cascade.  
   **Caveat:** defense-authored preprint, requiring independent reproduction.  
   **Contribution:** R2, R3.