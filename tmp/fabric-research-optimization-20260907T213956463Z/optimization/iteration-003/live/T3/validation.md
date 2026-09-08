## Not accepted

## Q1 — ToolBench-X: accepted
- **E1 → table and “Reliability and failure handling.”** Source supports Hint **+25.5–35.5 percentage points**, recovering roughly **60–80%** of baseline-to-oracle loss, versus ten extra rounds’ **+3.5–11.5 points**, on 200 tasks across five models with injected recoverable hazards. Oracle-like hints and synthetic paths are correctly caveated.
- **E2 → “Reliability and failure handling.”** Source supports **97/100 (97.0%)** exact-match versus independent human semantic-judgment agreement on a stratified sample of 100 retained instances. Report correctly limits this to final-answer matching.

## Q2 — τ-bench: accepted
- **E4 → table and “Reliability and failure handling.”** Source supports GPT-4o FC retail pass¹ ≈**61%**, airline pass¹ **35.2%**, and retail pass⁸ **<25%**, with deterministic state validation, GPT-4-0613 user simulation, and at least three trials. The simulated-domain and policy-compliance caveats are retained.

## Q3 — AgentDojo: accepted
- **E3 → table and “Security-relevant behavior.”** Source supports 629-case GPT-4o comparison: no defense targeted ASR **57.69% ±3.9**, utility **50.01% ±3.9**; tool filter ASR **6.84% ±2.0**, utility **56.28% ±3.9**. The report correctly bounds this to the tested attacks, filter, validator, and environment.

## Q4 — AgentProp-Bench calibration: qualified
- **E5 → table, reliability section, and limitations.** The reported GPT-4o-mini κ **0.567**, ensemble κ **0.432**, and human κ **0.835** with **92%** raw agreement are supported for the 100-trace blinded P2 calibration.
- The substring κ **0.049** is not a single aggregate comparator. It is versus one annotator. The source also reports **0.015** versus the other annotator and **0.036** versus consensus.
- The report labels the source v2 but links the mutable unversioned URL.

## Q5 — provenance and ToolEmu: qualified
- **E6 → table and “Security-relevant behavior.”** Gemini-2.0-Flash’s **5%** parseable-tool-call rate and **37.5%** fabricated-tool-use rate are source-supported, but the latter is conditioned on traces **without** a tool call. The report omits that denominator.
- **E7 → table and “Security-relevant behavior.”** ToolEmu supports evaluator precision/recall **75.3%/73.1%**, held-out human **78.7%/78.8%**, across 144 cases and 36 toolkits. The report correctly limits emulation as risk screening rather than proof of safety.

## Q6 — benchmark sensitivity: not accepted
- **E8 → “Counterevidence and transfer limits.”** The cited source reports ASB no-defense ASR changing from **70% to 9.25%**, not 9.2%. The comparison is specifically GPT-4o with no defense, changing from forced attacker-tool inclusion to free selection from the full tool set, still containing attack tools. The report omits these material conditions.

## Bounded corrections

1. Pin all AgentProp-Bench links to [v2](https://arxiv.org/html/2604.16706v2). State the substring heuristic’s comparator or omit that number.
2. Qualify the **37.5%** fabrication rate as “among P2 semantic-wrong traces with no parseable tool call.”
3. Replace E8’s **9.2%** with **9.25%** and state the forced-inclusion versus free-tool-selection condition.