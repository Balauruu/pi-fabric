# T1 Validation Disposition: **Qualified**

## R1 — Accept

The report answers measured-effects requirements with source-bound task, model, comparator, result, method, and available compute/cost conditions. It avoids a cross-study ranking.

**Independent source checks**
- [Wei et al.](https://arxiv.org/html/2201.11903): PaLM-540B GSM8K table reports standard **17.9** and CoT **56.9 (+39.0)**. The paper states CoT does not positively affect performance until sufficient model scale.
- [Kojima et al.](https://arxiv.org/html/2205.11916): confirms MultiArith **17.7→78.7** and GSM8K **10.4→40.7** for `text-davinci-002`, and explicitly describes **two-stage prompting**: rationale generation followed by answer extraction. `RESEARCH.md` correctly states two sequential generations.
- [Wang et al.](https://arxiv.org/html/2203.11171): explicitly reports results averaged over 10 runs with **40 independently sampled outputs** per run against greedy CoT.
- [Yao et al., ReAct](https://arxiv.org/html/2210.03629): reports ALFWorld best-trial **71% ReAct vs 45% Act**, with six controlled trials.
- The report keeps ToT, ReAct, and self-consistency as distinct measurement units and identifies missing cost components as unknown.

## R2 — Accept

The report provides substantive counterevidence and confines conclusions to the evaluated models, tasks, configurations, and threat models.

**Independent source checks**
- [Zhao et al.](https://arxiv.org/html/2102.09690v2) reports GPT-3 2.7B SST-2 four-shot order sensitivity from **54.3% to 93.4%**.
- [Turpin et al., rationale ablation](https://arxiv.org/html/2212.10001v2) contains the stated `text-davinci-003` valid/invalid-rationale rows: GSM8K **54.5→51.5** and Bamboogle F1 **59.5→56.4**.
- [Lost in the Middle](https://arxiv.org/html/2307.03172v3) reports that GPT-3.5-Turbo can lose more than 20 points, with **56.1%** closed-book performance exceeding worst 20/30-document results.
- [AgentDojo](https://arxiv.org/html/2406.13352v3) reports Claude 3.5 Sonnet benign utility **78.22%**, attacked utility **51.19%**, and targeted ASR **33.86%**.
- [Turpin et al., unfaithful explanations](https://arxiv.org/html/2305.04388v2) reports GPT-3.5 zero-shot CoT under Suggested Answer bias at **59.6→23.3** on bias-contradicting BBH cases, with paired-difference confidence intervals.

## R3 — Qualify: correction required

The paired evaluation artifact is concrete and appropriately favors final-state metrics and fixture-based tool testing. However, it does not implement all prior verification corrections and therefore does not yet meet the decision-grade operational-evaluation requirement.

### Material problems

1. **P1 — Self-consistency configuration is internally invalid.**  
   In `RESEARCH.md`’s YAML artifact, global decoding fixes `temperature: 0`, while `self_consistency_5` requests multiple samples without treatment-specific sampling settings. This cannot produce the diverse paths required by self-consistency.  
   **Required correction:** add treatment-specific nonzero-temperature and sampling parameters, and make the path count a parameterized **5/10 screening sweep**, not a fixed five-path treatment.

2. **P2 — Total-cost-per-accepted-task accounting is absent.**  
   The artifact records tokens, latency, and tool calls, but not the requested cost components: input, cached input, reasoning, output, tool, retry, and verification costs, nor explicit `unknown` values where unavailable. “Added tokens, latency, and tool calls fit production budget” is not total operating-cost accounting.  
   **Required correction:** record those components and state the accepted-task denominator.

3. **P3 — Unsupported local design choices are not sufficiently labeled and justified.**  
   `repeats: 3`, the stratified-bootstrap 95% CI rule, and the hard rule `lower 95% CI > 0` remain prescriptive artifact settings. The prose calls the artifact proposed and says three repeats and fixed thresholds are not universally optimal, but it does not identify these fields as proposed decision-specific choices or provide their basis.  
   **Required correction:** explicitly label each as proposed local design, state its decision-specific basis, and preserve that local thresholds must be predeclared.

4. **P4 — The text/schema starting rule remains presented as an evidence-backed selection rule.**  
   The selection table says bounded transformation/extraction should start with “Direct instruction and explicit output schema.” The retained studies do not measure a production prose-quality benefit for that baseline.  
   **Required correction:** label it a proposed local baseline, not an empirical conclusion.

5. **P5 — Repair-stream evidence remains contradictory.**  
   [`repair-streams/effects.md`](/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/quality-gate/20260908T/candidate-T1/repair-streams/effects.md) still says zero-shot CoT used “**One generation per case**.” This contradicts both the original Kojima paper and corrected `RESEARCH.md`, which correctly state two sequential model generations.  
   **Required correction:** repair the retained source note so the evidence record is internally consistent.

The source appendix is complete for the retained sources and the report does not make a universal technique-ranking claim.