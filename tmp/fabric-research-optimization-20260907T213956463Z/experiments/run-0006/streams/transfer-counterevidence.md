# Transfer-counterevidence

## Status: partial

**Research date:** 2026-09-07.  
The required configured web-search/fetch provider was unavailable in this execution environment. I did not use a browser or substitute shell/network retrieval. Therefore no primary original was inspected, and no empirical null/regression claim below is asserted as verified evidence.

## Question and decision

- **R2:** Where do more context, more agents, retries or self-critique fail, and what cannot transfer to current GPT-5.6 Terra?
- **R4:** What fixed-model paired evaluation could change the recommendation, including accepted-task quality, wall time, and complete failure accounting?

**Decision:** Do not adopt scale, retry, or critique mechanisms as generally beneficial for GPT-5.6 Terra. Treat each as an unverified intervention until a paired evaluation demonstrates benefit under the production scaffold.

## Bounded failure modes and transfer limits

| Mechanism | Failure condition to test | What cannot transfer to GPT-5.6 Terra |
|---|---|---|
| More context | Relevant evidence is crowded out, stale, contradictory, or exceeds effective attention; additional files increase localization or editing error. | Results from another model, context window, repository-selection policy, summarizer, or tool transcript format. Token count alone is not comparable. |
| More agents | Coordination duplicates work, introduces incompatible edits, weakens accountability, or consumes wall time before validation. | Results depend on role prompts, communication topology, parallelism, merge policy, tool isolation, and model sampling. A multi-agent benchmark result is not a Terra result. |
| Retries | Repeating a failed trajectory replays the same mistaken diagnosis, damages a previously workable tree, or merely increases attempts until one sample passes. | Any reported gain whose denominator omits exhausted retries, infrastructure failures, reverted edits, or total elapsed time. Retry count and state-reset policy must match. |
| Self-critique | The critic shares the generator’s blind spots, lacks independent execution evidence, or causes unnecessary rewrites after a correct patch. | Results from a different model, prompt, critique rubric, validator feedback, or extra reasoning budget. “Self-critique” without an independently observable signal is not a transferable intervention. |

**Inference:** These are credible operational hypotheses, not documented findings for Terra. The safe default is a bounded single-agent workflow with validator-grounded escalation, rather than unconditional context expansion, delegation, retrying, or critique.

## Fixed-model paired evaluation checklist

### A1. Freeze the baseline

For every task, hold constant:

1. **Model:** exact GPT-5.6 Terra snapshot or immutable deployment identifier.
2. **Reasoning effort:** identical configured level and any hidden reasoning/token limits.
3. **Task set:** precommitted accepted-task set, repository commits, issue text, fixtures, and environment images.
4. **Scaffold:** system prompt, tools, permissions, tool versions, shell/network access, timeout, concurrency, and repository-reset method.
5. **Budgets:** input-context policy except the tested treatment, action/tool-call cap, output cap, retry cap, and total wall-clock cap.
6. **Sampling:** temperature, seed where supported, and matched repetitions where it is not.
7. **Validator:** identical pinned test command, build/lint/static-analysis commands, acceptance rubric, and human-review protocol if used.
8. **Accounting:** every attempted run remains in the denominator. Do not exclude timeouts, crashes, invalid patches, validator failures, merge conflicts, or infrastructure failures.

### A2. Pairing design

For each task-repetition pair, run:

- **Control:** production baseline policy.
- **Treatment:** exactly one changed mechanism: added context, agent decomposition, retry policy, or critique step.

Randomize execution order within each pair. Reset the repository and environment before every run. Do not let a treatment reuse the control’s diagnosis, tool outputs, patch, test output, or retained memory unless that reuse is itself the intervention and is identically available to control.

### A3. Outcomes

Record per run:

- task and repository revision
- policy arm and exact configuration
- start and finish timestamps
- total wall time, plus queue/setup/model/tool/validator components where measurable
- accepted-task result: pass/fail under the pinned validator
- validator output and final repository diff hash
- attempts, tool calls, context tokens supplied, and agent count
- failure class: model failure, validator failure, timeout, tool failure, environment failure, coordinator/merge failure, or cancelled run
- whether a valid patch was produced but rejected by acceptance criteria

Primary metric: **accepted-task quality**, `accepted tasks / all assigned tasks`.  
Secondary metric: median and tail wall time per assigned task, plus total failure-rate and failure-class distribution.

### A4. Decision-changing rule

Adopt a treatment only if, on the same paired task-repetitions:

1. accepted-task quality is higher than control by a predeclared practically meaningful margin,
2. the paired uncertainty interval supports that margin or the result reaches the predeclared statistical criterion,
3. median and p90 wall time do not exceed a predeclared operational limit,
4. no failure class materially worsens, especially timeout, invalid-patch, merge, or infrastructure failure, and
5. the complete-denominator result agrees with the headline result.

Keep the baseline if quality is indistinguishable, the treatment’s gain disappears under complete failure accounting, or its wall-time/failure cost exceeds the predeclared limit.

## Sources and inspected support

No web source was retrieved or inspected because the required configured provider was unavailable. The supplied local materials were inspected:

- Local: [`researcher.md`](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/candidates/rev-02/researcher.md)
- Local: [`stream-contracts.md`](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/candidates/rev-02/references/stream-contracts.md)

## Coverage and gaps

- **R2 — failure conditions and GPT-5.6 Terra non-transfer:** **qualified.** The failure-mode table provides operational hypotheses and explicit transfer boundaries, but no inspected primary null/regression evidence. Smallest next check: retrieve and inspect primary coding-agent studies with ablations for context, delegation, retries, and critique, preserving their full setup and denominator.
- **R4 — fixed-model paired evaluation:** **supported as an executable protocol.** It is a proposed evaluation design, not evidence that any intervention works.

**Stop reason:** retrieval was constrained to the configured provider, and that provider was unavailable.