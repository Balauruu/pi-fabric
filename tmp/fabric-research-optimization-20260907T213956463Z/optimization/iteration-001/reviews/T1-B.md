Literal candidate path confirmed:

`/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/optimization/iteration-001/live/T1/RESEARCH.md`

## Q1. Measured-technique coverage — **material regression**
Candidate adds solid zero-shot CoT, self-consistency, ToT, prompt-order, and CoT-transfer evidence. Its checked quantitative claims are supported.

But it drops two decision-relevant measured techniques from legacy:
- **Verifier-backed repair/Reflexion:** GPT-4 Rust HumanEval hard-50, 60% baseline vs 68% Reflexion, while no executable-feedback condition is 52%.
- **Tool/API selection validity:** API-Bank `gpt-4-0613` 60.24% overall correctness, with 67.86% failed API retrieval and 17.86% false call format.

A production guide covering tool-using LLMs should retain both.

## Q2. Conditions, comparators, compute — **tradeoff**
Candidate is stronger for CoT/self-consistency/ToT conditions and avoids false cost extrapolation. Its ReAct values and hybrid-policy interpretation are accurate.

Regression: it removes Song et al.’s directly measured ReAct prompt brittleness and token burden: about **14M input / 150K output tokens for 134 ALFWorld instances**, plus evidence that weak or irrelevant guidance can match or beat base ReAct. This is material counterevidence for attributing gains to reasoning traces.

## Q3. Counterevidence and transfer limits — **material regression**
Candidate improves CoT counterevidence substantially: explicit regressions, cross-model limits, and instruction-tuned-model failures are well supported.

However, it entirely loses:
- feedback-free repair regression
- ReAct causal/brittleness evidence
- API-retrieval and call-format failure taxonomy
- long-context scratchpad/end-position regression

Those omissions weaken R2 for production scaffolds.

## Q4. Operational selection rules — **tradeoff**
Candidate’s table is clearer for direct text, symbolic reasoning, bounded search, tools, and long context. Its side-effecting-tool guardrails are appropriate.

But its code/API repair row disappears. “Plan, validate, authorize, execute, verify” is sensible but is not a replacement for legacy’s evidence-backed rule: use bounded repair only when a trustworthy verifier yields actionable feedback.

## Q5. Local evaluation artifact — **tradeoff**
Candidate’s artifact is concise and usable, with paired inputs, frozen conditions, position rotation, tool traces, and accepted-task cost.

Legacy is stronger for production-grade evaluation because it specifies clean initial states, version/hashes, protected strata, repetitions, postconditions, unsafe attempts, p95 latency, and rollback criteria. Candidate is acceptable but less complete for stateful tools and repair.

## Q6. Appendix — **tradeoff**
Internally, candidate’s appendix is complete for its nine retained citations and gives links, evidence forms, and limitations.

Concrete defect: `https://arxiv.org/html/2304.03262` is titled **“When do you need Chain-of-Thought Prompting for ChatGPT?”**, not *“Large Language Models Can Self-Improve.”* The linked claim is supported, but the bibliography title is wrong.

Across the comparison, the candidate appendix is less decision-complete because it omits four legacy primary sources: Song et al. 2024, Shinn et al. 2023, API-Bank, and Anthropic’s long-context study.

**Verdict:** **material regression** despite stronger CoT breadth and cleaner writing. Restore verifier-conditioned repair, API-Bank tool-stage evidence, ReAct brittleness/token accounting, and the long-context scratchpad/end-position evidence.