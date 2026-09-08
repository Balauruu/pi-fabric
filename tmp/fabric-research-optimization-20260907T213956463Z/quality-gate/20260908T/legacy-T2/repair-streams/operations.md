# R3 — Fixed-model run-design rules

**Decision:** adopt bounded, summarized context retrieval and test-informed repair as defaults. Add retries only when a failed validation produces new diagnostic evidence. Do not adopt exhaustive search, full-history retention, or larger budgets by default.

| Lever | Evidence and condition | Adoption rule |
|---|---|---|
| Context selection | GPT-4 Turbo on 300 SWE-bench Lite tasks: summarized search resolved **18.0%**. Iterative result-by-result search resolved **12.0%**, below **no search: 15.7%**. Full-file viewing was **12.7%** versus **18.0%** with 100-line windows. | Return ranked, bounded summaries with explicit refinement. Cap file slices. Reject a design that encourages traversal of every hit. |
| Tool feedback / edit guardrails | Same SWE-agent ablation: linting edit action **18.0%** versus **15.0%** without it. | Normalize and compact compiler/test feedback. Prevent or immediately surface malformed edits. |
| Context history | Same setup: last five observations **18.0%** versus full history **15.0%**. | Keep a bounded working state: task, hypotheses, changed files, latest test result, and unresolved evidence. Do not replay raw full trajectory. |
| Validation and repair | Agentless, GPT-4o: majority-vote selection **77/300 (25.67%)**; adding regression tests **81/300 (27.00%)** at **$0.01**; adding reproduction tests **96/300 (32.00%)** at **$0.25**. | Run cheap regression validation first. Generate a reproduction test only for plausible patches whose result can change selection. Record test provenance. |
| Retries / decomposition | RepairAgent’s 100-bug ablation fixed **21** with its full multi-cycle workflow. Removing search tools fixed about half as many and doubled cost. A configuration reported **16 fixes for $29**, a **25%** capability decrease with **81%** higher cost. | Retry only after a distinct state transition: new localization, a new hypothesis, or a compacted failure signal. Start with simple/local patches, then broaden scope. |
| Stop condition | In SWE-agent, successful GPT-4 Turbo runs had median **$1.21 / 12 steps**. Unsuccessful runs averaged **$2.52 / 21 steps**. | Set a per-task cost and turn cap. Stop or escalate when two attempts yield no new evidence, the same failure signature repeats, or the cap is reached. |

## Primary evaluation evidence

1. **SWE-agent controlled ACI ablation**  
   [Source](https://arxiv.org/html/2405.15793)  
   Fixed agent/model: GPT-4 Turbo, 300-task SWE-bench Lite, $4 per-instance cap. Outcome is percentage resolved, meaning all benchmark tests pass after applying the patch.  
   Decisive passage: “Editor edit action **15.0** … w/ linting **18.0**”; “Search Summarized **18.0**, Iterative **12.0**, No search **15.7**”; “File Viewer 30 lines **14.3**, 100 lines **18.0**, Full file **12.7**”; “Last 5 Obs. **18.0**, Full history **15.0**.”  
   This is the strongest causal source here because the model and benchmark are held constant while interface/run-design components vary.

2. **Validation-stage comparison**  
   [Agentless](https://arxiv.org/html/2407.01489)  
   Fixed model: GPT-4o-2024-05-13. Its staged workflow is localization, repair, then patch validation. It localizes three files, samples four edit locations, uses ±10-line contexts, produces 40 patches, and samples 40 reproduction tests.  
   The source reports: “Majority voting **77 (25.67%) $0.00**,” “+Regression test **81 (27.00%) $0.01**,” “+Reproduction test **96 (32.00%) $0.25**.”  
   This supports test-based selection, but the source’s Agentless-versus-SWE-agent result is **not** a clean workflow-only causal comparison because systems differ beyond controller design.

3. **Retry/reflection counterexample**  
   [Reflexion](https://arxiv.org/html/2303.11366)  
   GPT-4 on HumanEval: reported **91% pass@1** for Reflexion versus **80%** for prior GPT-4. However, generated tests can be wrong: reported false-positive test execution is **16.3%** on MBPP Python and **1.4%** on HumanEval Python. More importantly, on the 50 hardest HumanEval Rust tasks, reflection was **52%**, below the **60%** baseline.  
   Therefore, retries/reflection require empirical gating, not blanket adoption.

4. **Stateful repair and search ablation**  
   [RepairAgent](https://arxiv.org/html/2403.17134)  
   GPT-3.5-0125, Defects4J. The controller alternates localization, information collection, hypothesis formation, patching, and validation. It reports 164 correct fixes of 835 bugs and average **270,000 tokens / $0.14 per bug**. Its ablation is only 100 randomly selected bugs, so use it as directional evidence, not a production performance estimate.

## Paired fixed-model evaluation artifact

```yaml
experiment: controller-change/<short-name>
unit: issue-or-task-instance
pairing:
  corpus: production-like holdout, frozen before implementation
  stratify_by: [repository, language, task_type, change_size]
  assignment: every task runs both arms from identical base commit
fixed:
  model: <exact-provider-model-version>
  reasoning_effort: <exact-setting>
  system_prompt: <hash>
  temperature: <value>
  seed_policy: <same-seed-or-N-seeds-per-arm>
  tool_permissions: <identical>
  environment_image: <digest>
  task_inputs: <issue-and-repository-revision-hashes>
  wall_clock_cap: <seconds>
  token_cap: <tokens>
  dollar_cap: <currency-value>
arms:
  A_baseline:
    controller_version: <hash>
    context_policy: <current>
    retry_policy: <current>
    validation_policy: <current>
  B_candidate:
    controller_version: <hash>
    changed_lever: <one lever only>
    expected_mechanism: <pre-registered>
outcomes:
  primary: independently-run heldout tests pass
  secondary:
    - patch applies cleanly
    - regression tests pass
    - reviewer acceptance or blinded semantic review
    - cost_usd
    - input_output_tokens
    - wall_clock_seconds
    - tool_calls
    - attempts
    - unsafe_or_policy_blocked_actions
analysis:
  primary_estimate: paired resolved-rate difference B_minus_A
  uncertainty: paired bootstrap 95% CI
  report:
    - wins_B
    - wins_A
    - both_pass
    - neither_pass
    - median paired cost difference
    - failure-signature transition table
  exclusions: predeclared only, with raw count and reason
decision_rule:
  adopt_if:
    - primary CI lower bound is greater than 0
    - no increase in policy-blocked or sandbox-escape events
    - median cost increase is within predeclared budget
    - no material regression in any predeclared task stratum
  otherwise: retain baseline or run a narrowed follow-up
artifacts_per_run:
  - immutable task revision
  - controller/config hashes
  - complete tool trace
  - compacted contexts supplied to model
  - patch
  - test commands, outputs, and exit codes
  - token/cost/time accounting
```

## Operational adoption table

| Change | Evaluate first | Adopt when | Reject or roll back when |
|---|---|---|---|
| Summarized search | Localization-heavy holdout | Paired resolved-rate CI is positive and cost is non-inferior | Search traversal rises, context cap is hit more often, or hard-task resolution falls |
| Compact feedback | Build/test-failure tasks | More successful repair after a failing validation | Compression removes file, line, assertion, or stack-frame information needed to repair |
| Bounded history | Multi-step fixes | Same or higher resolution at lower token use | Agent repeats already-refuted hypotheses or loses required cross-file state |
| Reproduction tests | Candidate-patch selection | Incremental acceptance quality exceeds test-generation and execution cost | Generated tests are flaky, fail to discriminate patches, or are not isolated |
| Extra retries | Tasks with diagnostic failure output | Attempt \(n+1\) changes hypothesis, evidence, or patch scope and improves paired outcomes | Repeated failure signature, no new evidence, or marginal success is below predeclared cost threshold |

## Reliability limits and gaps

- SWE-bench evaluates patch behavior through derived tests. Its original evaluator applies a test patch and requires all **FAIL_TO_PASS** and **PASS_TO_PASS** tests to pass. It does not establish maintainability, completeness, or production acceptance. The paper says test-only evaluation is “insufficient to guarantee reliable performance” and all instances are Python. [Source](https://arxiv.org/html/2310.06770)
- Benchmark/test leakage remains plausible. Agentless explicitly identifies ground-truth SWE-bench Lite patches potentially appearing in GPT-4o training data. RepairAgent likewise notes GPT-3.5 may have seen evaluated Java projects. Use temporally held-out internal tasks and separate repositories where possible.
- Validation is not correctness. Reflexion documents false positives from generated tests. Require hidden or independently authored tests and, for high-impact changes, blinded human review.
- Fixed-model evidence is model-, benchmark-, budget-, and controller-specific. The cited historical dollar costs are not current cost forecasts.
- No inspected source establishes unmeasured security properties. Sandbox and policy-blocked-action metrics belong in the local paired evaluation artifact.

## Retained-source appendix

1. SWE-agent, *Agent-Computer Interfaces Enable Automated Software Engineering*  
   https://arxiv.org/html/2405.15793  
   Inspected for fixed-model ACI ablations, budgets, trajectory cost, and context/search counterevidence.

2. SWE-bench, *Can Language Models Resolve Real-World GitHub Issues?*  
   https://arxiv.org/html/2310.06770  
   Inspected for evaluator construction, resolved metric, test-patch method, and stated limitations.

3. Reflexion, *Language Agents with Verbal Reinforcement Learning*  
   https://arxiv.org/html/2303.11366  
   Inspected for fixed-GPT-4 programming outcomes, test-generation method, false positives, and negative Rust result.

4. Agentless, *Demystifying LLM-based Software Engineering Agents*  
   https://arxiv.org/html/2407.01489  
   Inspected for fixed-GPT-4o staged validation contrasts, cost/token figures, and leakage/generalization limits.

5. RepairAgent, *An Autonomous, LLM-Based Agent for Program Repair*  
   https://arxiv.org/html/2403.17134  
   Inspected for workflow, controlled ablation scope, search/retry evidence, costs, and validity threats.