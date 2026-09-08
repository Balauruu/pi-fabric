# T2 Facet Source Note: Operational Run-Design Adoption Rules

**Scope:** fixed model and fixed reasoning effort. This note addresses context selection, tool feedback, validation/repair, retries, and decomposition as *run design*, not model capability. Quantitative results are source-specific and are not universal rankings.

## R1 — What primary evaluations support operational choices?

| Run-design lever | Primary evaluation, task, agent/model, comparator, method | Source-bound outcome and cost condition | Operational implication |
|---|---|---|---|
| Tool interface, search feedback, edit guardrail | SWE-agent on 300-task SWE-bench Lite. **GPT-4 Turbo** held fixed across ACI variants. Ablates summarized versus iterative/no search, editor alternatives, linting, context management. | The paper’s Table 3 reports **18.0% resolved** for its summarized-search ACI, versus **12.0%** iterative search and **15.7%** no search. Its linting-enabled editor is **18.0%**, versus **15.0%** without linting and **10.3%** with no edit tool. [SWE-agent, Table 3 / §3–5](https://arxiv.org/html/2405.15793#S4.T3) | Treat concise, task-relevant tool output and pre-commit syntax feedback as individually testable defaults. Do not infer that every summary policy or linter improves every repository. |
| Repair feedback and bounded recovery | Same SWE-agent evaluation. The agent receives command execution feedback after each action; edit application is guarded by linting. | Across **2,294** GPT-4 Turbo trajectories, **1,185 (51.7%)** had at least one failed edit. Eventual successful-edit probability was **90.5%** for an attempted edit but **57.2% after one failed edit**. [SWE-agent, §5.3 / Appendix B.3.3](https://arxiv.org/html/2405.15793#S5) | Preserve actionable failure output, but make a repeated identical or cascading failure a stop-and-relocalize signal, not an invitation to spend indefinitely. |
| Retry budget and stopping rule | Same agent and full SWE-bench run data, observing solved versus unsolved trajectories rather than randomizing retry caps. | Resolved runs had **median $1.21 and 12 steps**. Unresolved runs had **mean $2.52 and 21 steps**. The authors report **93.0%** of resolved instances submitted before budget exhaustion, versus **69.0%** overall, and explicitly suspect larger budgets will not substantially improve performance. [SWE-agent, Appendix B.9](https://arxiv.org/html/2405.15793#S5) | Instrument cost and steps. Set a bounded retry budget and require a state change such as new test evidence, a changed localization hypothesis, or a changed patch before another repair attempt. This is observational evidence, not proof that a particular cap is optimal. |
| Context selection and decomposition | Agentless evaluates a fixed three-phase pipeline on SWE-bench Lite: hierarchical file → symbol → edit-location localization; patch generation; generated reproduction tests plus regression tests for selection. | On **300 SWE-bench Lite** tasks, Agentless reports **96/300 = 32.00%** resolved at **$0.70 average cost per issue**. Its method explicitly narrows context before exposing code snippets for repair. [Agentless, Abstract; §3](https://arxiv.org/html/2407.01489#S3) | Compare a staged localize–repair–validate pipeline against an unconstrained interactive loop before adding more autonomy. Use retrieval/context artifacts as auditable intermediate outputs. |
| Validation and candidate selection | Agentless uses generated reproduction tests, checks whether each reproduces on the unpatched base, then ranks candidate patches with the surviving reproduction test and existing regression tests. | Exact method: “sample multiple reproduction tests,” select based on “actual execution results on the original codebase,” then use reproduction and regression tests for patch ranking. [Agentless, §3 and §3.3](https://arxiv.org/html/2407.01489#S3) | A generated test is evidence only after it fails on the base and passes on the candidate. Keep base result, candidate result, command, exit code, and test text. |
| Evaluation outcome | SWE-bench is a repository-level issue-resolution evaluation: issue description plus base repository, evaluated by applying a prediction and running PR-derived tests. | Original benchmark contains **2,294 problems from 12 Python repositories**. The harness checks out the base commit, applies test patch and prediction, then runs the repository’s test command. [SWE-bench, Abstract; Appendix A.4](https://arxiv.org/html/2310.06770) | Use an isolated base checkout and separate hidden acceptance tests from agent-visible validation when measuring production changes. A patch must apply and run, not merely look plausible. |

### Exact inspected passages and locators

1. **Tool feedback and guardrails.** SWE-agent states: “At each step, SWE-agent generates a thought and a command, then incorporates the feedback from the command’s execution in the environment.” It also states that a code linter is integrated into editing “to alert the agent of mistakes it may have introduced.” [§3](https://arxiv.org/html/2405.15793#S3)

2. **Context de-noising.** SWE-agent states that after a malformed response followed by a valid one, it removes the malformed action/response from history, calling this “de-noising” that reduces unnecessary context. [Appendix A / context-management discussion](https://arxiv.org/html/2405.15793#S3)

3. **Hierarchical context.** Agentless states that full-file context can be “large,” constructs class/function “skeleton” representations, then exposes the code of selected elements to identify edit locations. [§3.1.2–3.1.3](https://arxiv.org/html/2407.01489#S3)

4. **Benchmark evaluation mechanics.** SWE-bench’s prediction evaluation sequence is: reset to base commit, activate environment, install, apply test patch, apply prediction, attempt automatic patch-file repair if application fails, then run the test script. [Appendix A.4](https://arxiv.org/html/2310.06770)

## R2 — Counterevidence and reliability limits

| Constraint | Evidence and exact condition | Consequence for adoption |
|---|---|---|
| Simpler decomposition can beat a richer agent loop on this benchmark | Agentless reports its fixed pipeline, without autonomous tool selection, outperformed the then-compared open-source approaches on SWE-bench Lite at its reported $0.70 mean cost. [Abstract](https://arxiv.org/html/2407.01489) | Do not presume retries, tool breadth, or autonomous decomposition are beneficial. The comparator must be the simpler fixed pipeline. |
| Context/tool benefits are conditional | Agentless reports that closed-source agent tools did better where there was **no location clue**, describing complex code-search tools as an advantage in those cases. [§6.2](https://arxiv.org/html/2407.01489#S6) | Segment results by localization difficulty. A context policy that wins on easy, well-localized fixes may lose on cross-cutting tasks. |
| Benchmark-task defects and leakage in descriptions | Agentless’s manual review of 300 Lite tasks found **4.3%** with the exact ground-truth patch in the description, **10.0%** missing critical information, and **5.0%** containing misleading solutions. [§1 and §6.1](https://arxiv.org/html/2407.01489#S6) | Report results both on the retained set and with predeclared exclusions. Do not tune selection/retry policies against known public task text and call the result production evidence. |
| Public benchmark contamination | OpenAI’s publisher analysis says SWE-bench’s open-source repositories make contamination difficult to avoid, and reports that tested frontier models reproduced human gold-patch details or verbatim problem specifics on some tasks. [OpenAI, “Why SWE-bench Verified no longer measures frontier coding,” contamination section](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/) | Treat public SWE-bench scores as a regression signal for a fixed harness, not as standalone evidence of production capability. Include internally held-out tasks created after the model’s likely data cutoff. |
| Evaluation is test-oracle bounded | SWE-bench evaluates PR-derived tests. The original benchmark intentionally separates test patch from gold patch and grades by executing the derived test script. [SWE-bench, Appendix A.1 and A.4](https://arxiv.org/html/2310.06770) | Passing is evidence only for the tested behavior. Add independently authored acceptance checks, patch review, and production-like integration tests for decisions with broader correctness requirements. |
| Non-comparable systems and versions | The official SWE-bench documentation notes a Docker harness for reproducibility, but its datasets and leaderboards encompass different agent systems and configurations. [SWE-bench overview](https://www.swebench.com/SWE-bench/) | Freeze container image, repository revision, tool versions, prompts, temperature/seed policy, budgets, and evaluator revision within a paired experiment. |
| Security is unmeasured by these primary evaluations | None of the cited SWE-agent, Agentless, or SWE-bench results measures exploit resistance, secret protection, sandbox escape, supply-chain safety, or production authorization safety. | Do not convert test-pass improvements into security claims. Isolation and approval controls below are deployment requirements, not empirically validated security improvements. |

## R3 — Fixed-model experiment and adoption rules

### Operational decision table

| Signal observed in the paired evaluation | Run-design action | Adopt when | Reject or escalate when |
|---|---|---|---|
| Failures are dominated by malformed edits, syntax errors, or patch-application errors | Add deterministic parse/lint/apply feedback before running broader tests. Return the failing file, locator, command, and concise error. | Paired hidden-test pass rate does not fall and malformed-edit rate falls, within the fixed per-task budget. | The guardrail blocks valid edits or causes more repeated attempts. |
| The agent searches broadly or consumes large context before editing | Add staged repository map → file shortlist → symbol/edit-location context. Log every selected and omitted file. | Improvement holds in the cross-cutting and poor-localization strata, not merely easy tasks. | Localization recall falls, or harder tasks lose despite a cheaper/easier-task gain. |
| A candidate patch fails a reproducer or regression test | Return structured failure evidence and permit one repair only if it changes the patch or localization hypothesis. | Repair-after-validation produces net hidden-test wins per additional dollar and no rise in unrelated-test regressions. | Repeated attempts have identical failure signatures, oscillate between patches, or exceed budget. |
| No useful test/reproducer can be made | Stop autonomous retries. Mark “insufficient oracle,” retain artifacts, route for human review. | Never auto-merge solely on agent explanation. | N/A. This is an abstention condition. |
| Agent tries an operation outside intended code/test scope | Deny it deterministically and report a policy error without exposing credentials or unrestricted environment output. | Always enabled for production. | Human approval is required for scope expansion. No effectiveness claim is made. |
| Candidate passes visible tests | Run hidden acceptance tests and review diff scope before allowing merge. | Hidden acceptance tests pass, diff stays within task scope, required checks pass, and approval policy is satisfied. | Any hidden-test, policy, dependency, or scope failure. |

### Minimum resolving paired artifact

This is a **screening artifact**, not a general-capability claim.

```yaml
study: run-design-pair-01
question: >
  Does structured validation feedback plus one state-changing repair improve
  task resolution over the current loop, with model and reasoning effort fixed?
fixed:
  model: <exact-provider/model-version>
  reasoning_effort: <exact-setting>
  system_prompt: <hash>
  temperature: <value>
  seed_policy: same-seed-per-pair
  tools: <same executable/tool permissions except treatment feedback>
  container_image: <digest>
  time_budget_minutes: 20
  token_budget: <integer>
  max_patch_attempts: 2
population:
  source: internally held-out issues, excluded from prompt/examples/tuning
  smallest_screen:
    strata:
      local_single_file: 8
      cross_file: 8
      failing-test-present: 8
    total_tasks: 24
    repeats_per_arm: 3
    paired_runs: 72
arms:
  A_control:
    loop: current tool feedback and retry policy
  B_treatment:
    loop:
      - deterministic parse_or_lint_before_test
      - concise structured_test_failure
      - exactly_one_repair_only_if:
          - patch_diff_changes
          - localization_hypothesis_changes
        otherwise: stop_with_abstention
outcomes:
  primary:
    - hidden_acceptance_pass_per_task
  secondary:
    - visible_regression_pass
    - patch_apply_rate
    - malformed_edit_rate
    - abstention_rate
    - median_wall_time
    - median_input_output_tokens
    - median_cost_per_task
    - unrelated_files_changed
  safety_process:
    - denied_out_of_policy_commands
    - secret_or_network_access_attempts
    # process telemetry, not a security-effectiveness metric
analysis:
  unit: task
  pairing: task_id + repeat_index + seed
  report:
    - paired_win_loss_tie_on_hidden_acceptance
    - stratified_results
    - bootstrap_95_percent_interval_for_pass_difference
    - median_cost_and_time_difference
    - complete_failure-signature distribution
decision_rule:
  screening:
    adopt_for_pilot_if: >
      Treatment has a positive paired hidden-acceptance difference, its 95%
      interval excludes a materially harmful effect predefined by the owner,
      and median cost/task stays within the predefined ceiling.
  production:
    require: >
      Replicate on a larger fresh holdout and observe no increase in unrelated
      regressions, policy denials, or out-of-scope modifications.
```

**Why this is the smallest resolving design:** 24 tasks across three operationally distinct strata can expose an obvious harmful or directional effect while preserving task pairing. Three fixed-seed repeats distinguish a one-off trajectory from a consistent effect. It cannot establish a stable production effect size. Promotion therefore requires a larger fresh holdout.

### Deployment controls

- Run each task in an ephemeral, isolated checkout with no production credentials.
- Default-deny network egress, secret stores, package publication, destructive commands, and writes outside the task workspace.
- Make lint/test/apply feedback structured and bounded. Preserve full logs outside the model context for audit.
- Require a new patch or new localization evidence before repair. Stop on repeated failure signature.
- Separate agent-visible tests from hidden acceptance tests.
- Record model version, reasoning setting, prompt hash, tool schema/version, context-selection trace, commands, diffs, tests, costs, and stop reason.
- These are operational controls. The retained sources do **not** measure their security efficacy.

## Retained-source appendix

| ID | Original source | Type and date | Inspected material retained | Coverage |
|---|---|---|---|---|
| S1 | [SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering](https://arxiv.org/html/2405.15793) | NeurIPS conference paper, 2024 | §3, Table 3, §5, Appendix B.3.3 and B.9. Directly fetched and passage-located. | R1 tool feedback, guardrails, context, recovery, cost. R2 conditionality. R3 retry and feedback rules. |
| S2 | [Agentless: Demystifying LLM-based Software Engineering Agents](https://arxiv.org/html/2407.01489) | Research paper, 2024 | Abstract, §3–3.3, §6.1–6.3, tables referenced therein. Directly fetched and passage-located. | R1 staged context, validation, candidate selection, cost. R2 benchmark defects and counterexample to complex loops. R3 staged baseline. |
| S3 | [SWE-bench: Can Language Models Resolve Real-World GitHub Issues?](https://arxiv.org/html/2310.06770) | ICLR oral paper, 2024 | Abstract, Appendix A.1 and A.4. Directly fetched and passage-located. | R1 task/evaluator mechanics. R2 test-oracle boundary and benchmark construction. R3 isolated evaluation. |
| S4 | [SWE-bench overview and documentation](https://www.swebench.com/SWE-bench/) | Benchmark maintainer documentation, undated, inspected 2026-09-07 requested cutoff | Overview statement on Docker-based reproducible evaluation, datasets, and 500 engineer-confirmed Verified tasks. Directly fetched and passage-located. | R1 evaluator environment. R2 version/configuration control. |
| S5 | [Why SWE-bench Verified no longer measures frontier coding](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/) | Publisher evaluation-analysis article, date displayed by publisher page, inspected through original-source search extraction because direct fetch returned HTTP 403 | Contamination section: public repository exposure and reproduced gold-patch/verbatim details. | R2 contamination constraint. R3 fresh internal holdout requirement. |