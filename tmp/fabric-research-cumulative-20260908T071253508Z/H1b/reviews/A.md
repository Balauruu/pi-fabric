# Independent final comparison: H1b versus incumbent

## Outcome

- **Status:** conclusive
- **Incumbent gain:** no
- **Material regression:** yes
- **Promotion:** blocked
- **Needed targeted check:** Correct H1b T1-1's LaMDA-137B GSM8K calculator result and locator, then recheck that one claim against the frozen CoT table. The primary reports **17.8**, not 17.3.

## Candidate-relative evidence

### Loss L1: new incorrect numerical claim

- **Baseline report passage:** `baseline/T1-1/RESEARCH.md`, “What the ablations establish”: “LaMDA 137B GSM8K 14.3% to **17.8%**.”
- **H1b report passage:** `H1b/T1-1/RESEARCH.md`, same subsection: “LaMDA 137B GSM8K 14.3% to **17.3%**,” cited as Table 2.
- **Decisive frozen primary passage:** `corpus/T1/sources/S1-chain-of-thought.md:500-650`, the arithmetic table’s LaMDA-137B row: “Chain of thought 14.3 …” and “+ ext. calc **17.8** …”. The changed H1b number is unsupported, and the cited Table-2 locator does not identify this calculator row.
- **Finding:** H1b replaces the incumbent’s correct condition-specific measurement with an incorrect one. This is a material factual regression in a decision-grade evidence synthesis.

### Gains

None found. T1-2 is substantively unchanged on the inspected numerical evidence. T3-1 is unchanged. T3-2 is unchanged on the inspected decisive measurements.

## T3 scope and numerical verification

- `corpus/T3/SCOPE-ADJUDICATION.md` controls: ToolBench-X v1 contains both the twelve-model Table-2 main benchmark and the five-model, 200-task Figure-4 diagnostic. H1b’s T3 reports keep those scopes distinct and do not require a private-audit conflict.
- **ToolBench-X primary:** `corpus/T3/sources/toolbench-x-2606.25819v1.md:637-695` identifies Table 2 as the twelve-model main results and Figure 4 as the five-model 200-task Baseline/Hint/TTS/Oracle diagnostic. H1b’s reported 25.5–35.5-point Hint and 3.5–11.5-point TTS changes are supported by the Figure-4 discussion.
- **AgentDojo primary:** `corpus/T3/sources/agentdojo-2406.13352v3:650-830` distinguishes the 47.69% Table-3 generic-attack result from the 57.69% Table-5 no-defense result, and reports 73.13%, 56.28%, and 6.84% for the tool filter. H1b T3-2 names the Table-5 no-defense condition and is supported. It preserves the 7.5% prose versus 6.84% table discrepancy.

## Shared baseline limitations, not H1b regressions

- T1 remains phase-only historical evidence. It has no current-production parity, speed, latency, or common cross-technique ranking evidence.
- T3 remains simulated/deterministic benchmark evidence. It does not establish live-deployment reliability or production security. The reports appropriately do not infer parity or speed from phase-only tests.
- The retained ToolBench-X, AgentDojo, evaluator-audit, and AgentProp limitations remain transfer constraints shared with the incumbent, not candidate-relative losses.
