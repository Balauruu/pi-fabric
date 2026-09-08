# Independent review

## T1: Prompting and scaffold decisions

- **Coverage:** Strong. Covers prompting, context, tool loops, structure, and injection boundaries, then separates benchmark evidence from local selection.
- **Concrete methods:** Strong. A0–A4 arms, frozen controls, stratification, trajectory ledger, paired gates, and explicit stop rule are directly runnable.
- **Source support:** Strong. Decisive claims checked against original CoT and ReAct tables. The report correctly uses PaLM-540B GSM8K **17.9% → 56.9%**, not the inherited 58.1 value. [CoT](https://arxiv.org/html/2201.11903v6), [ReAct](https://arxiv.org/html/2210.03629)
- **Counterevidence:** Strong. It includes small-model/easy-task CoT regressions, reflection failures, weak retrieval, context-position effects, structure-versus-semantics limits, and security–utility trade-offs.
- **Actionability:** Strong. The operational table links observed conditions to candidates, comparators, failure signals, and adoption gates.
- **Structure:** Strong. Decision first, evidence table, limits, operating table, protocol, then explicit coverage gaps.

**Assessment:** Installable for its scoped purpose. It materially improves the legacy transport report by broadening the evidence boundary while retaining the legacy report’s disciplined conditional adoption model.

## T2: Fixed-model coding-agent run design

- **Coverage:** Very strong. It covers contracts, context, tool feedback, recovery, verification, parallelism, scope discipline, abstention, and evaluation integrity.
- **Concrete methods:** Very strong. The task contract, tool-call protocol, worker receipt, verifier contract, evaluation-integrity checklist, and paired local plan form a coherent operating system rather than disconnected advice.
- **Source support:** Strong but heterogeneous by design. It distinguishes direct evidence, systems mechanism, vendor evidence, and field signal. The report appropriately avoids claiming a normalized causal frontier across all run-design levers.
- **Counterevidence:** Strong. It explicitly addresses feedback repair controls, correlated errors, retry harm, false completion, benchmark contamination, access-policy sensitivity, and evaluation gaming.
- **Actionability:** Very strong. The failure-signal matrix and before/during/after policy provide a practical execution sequence. The proposed local experiments identify what would overturn each default.
- **Structure:** Strong. It has one owner and one decision framework despite wide scope.

**Assessment:** Installable as the coding-agent operating report. Its main limit is evidentiary, not structural: several recommended defaults are well-supported systems controls but lack direct fixed-model repository-agent ablations. The report states that limit instead of laundering it into performance proof.

## T3 rev04: Evaluation, reliability, and security boundaries

- **Coverage:** Strong. It addresses state-based evaluation, repeated-run reliability, evaluator calibration, attack/utility trade-offs, runtime authority boundaries, recovery, and deployment release conditions.
- **Concrete methods:** Strong. The 50-scenario resolving evaluation, repeated stochastic runs, executable final-state and policy checks, paired control comparison, and catastrophic-path release blockers are operationally specific.
- **Source support:** Strong. Key figures checked against originals:
  - τ-bench supports approximately **61% retail pass¹** and **below 25% retail pass⁸**, bound to its simulated-user harness. [τ-bench](https://arxiv.org/html/2406.12045)
  - AgentDojo supports the GPT-4o defense trade-off: **57.69% ASR** without defense, **7.95%** with detector but **21.14%** utility under attack, and **6.84%** ASR with tool filtering. [AgentDojo](https://arxiv.org/html/2406.13352v3)
  - AgentProp-Bench supports evaluator disagreement and fabricated tool-use concerns, including human κ **0.835** and fabrication up to **37.5%** in the stated condition. [AgentProp-Bench](https://arxiv.org/html/2604.16706)
- **Counterevidence:** Strong. It does not treat pass¹, low ASR, tool filtering, LLM judging, or synthetic benchmarks as deployment proof.
- **Actionability:** Strong. The decision table maps each permission class to required evidence, enforced boundaries, and block or rollback signals.
- **Structure:** Strong. The report keeps benchmark facts, inference limits, and deployment controls distinct.

**Assessment:** rev04 is at least legacy quality, with stated limits. It exceeds the legacy transport reference on security evaluation, evaluator validity, repeated-run reliability, and deploy/no-deploy controls. It does **not** replace the legacy report’s prompt-technique selection scope, nor does it establish production security or provide risk-owner numeric thresholds. Those limits are explicit and appropriate.

## Material regressions

- **R1:** No material T1 regression found. The frozen stream’s incorrect 58.1 CoT figure is corrected in the candidate to 56.9.
- **R2:** No material T2 regression found. Its breadth increases inference risk, but it consistently marks direct-ablation gaps rather than presenting recommendations as measured effects.
- **R3:** No material T3 rev04 regression found. The NIST claims should remain framed as governance guidance because the inspected PDF extraction did not independently expose the cited control identifiers. The report already avoids treating NIST as efficacy evidence or certification.

## Install recommendation

**Install T1, T2, and T3 rev04 as separate scoped reports.**  
Use **T3 rev04** as the replacement for the legacy-quality standard on evaluation, reliability, and security boundaries. Do not collapse the three reports into a universal performance ranking, and do not grant production authority from any report without the prescribed local paired evaluation and runtime enforcement controls.