## Requirement coverage

| Requirement | Disposition | Checked basis |
|---|---|---|
| R1 | qualified | Retain ToolBench-X, τ-bench, AgentDojo, and ToolEmu. AgentProp-Bench numeric calibration values require version repair. |
| R2 | supported | Retain simulator, evaluator-recall, benchmark-design, and version-comparability limits. |
| R3 | qualified | Controls are bounded inferences from tested failure modes. No source supports a universal autonomy, ASR, pass^k, or κ threshold. |

## Source-checked evidence anchors

### E1 — retain
- **Claim:** Diagnosis materially improves recovery from injected tool hazards beyond extra interaction rounds alone.
- **Source/locator:** [ToolBench-X v1, Figure 4](https://arxiv.org/html/2606.25819v1#Sx4.F4).
- **Exact result/unit:** Hint: +25.5–35.5 percentage points, recovering about 60–80% of baseline-to-oracle loss. Ten extra rounds: +3.5–11.5 points.
- **Conditions:** 200-task sample, five models, injected recoverable hazards.
- **Comparator:** Injected baseline, clean-tool oracle, post-failure Hint, test-time scaling.
- **Caveat:** Hint is oracle-like diagnosis. Synthetic recoverable paths do not establish production incident recovery.
- **Question contribution:** R1, R3.

### E2 — retain
- **Claim:** ToolBench-X exact-match final-answer scoring had bounded semantic-validity evidence.
- **Source/locator:** [ToolBench-X v1, Appendix A](https://arxiv.org/html/2606.25819v1#A1.SS2).
- **Exact result/unit:** 97/100 agreement, 97.0%.
- **Conditions:** Stratified random sample of 100 retained instances.
- **Comparator:** Backend exact match versus independent human semantic judgment.
- **Caveat:** Validates final-answer matching, not trajectory quality, recovery behavior, or safety.
- **Question contribution:** R1, R2.

### E3 — retain
- **Claim:** Deterministic state-based evaluation exposes a security-utility tradeoff under a defined prompt-injection suite.
- **Source/locator:** [AgentDojo v3, Appendix C Table 5](https://arxiv.org/html/2406.13352v3#A3.T5).
- **Exact result/unit:** GPT-4o no defense: targeted ASR 57.69% ±3.9, utility under attack 50.01% ±3.9. Tool filter: ASR 6.84% ±2.0, utility under attack 56.28% ±3.9.
- **Conditions:** 629 security cases, authors’ GPT-4o, attack, tool-filter, and validator configuration.
- **Comparator:** No defense versus tool filter.
- **Caveat:** Fixed attack family and bounded stateful environment. It does not establish general prompt-injection security.
- **Question contribution:** R1, R3.

### E4 — retain
- **Claim:** Repeated-run reliability differs from one-shot success.
- **Source/locator:** [τ-bench, §5.1 and Figure 4](https://arxiv.org/html/2406.12045#S5).
- **Exact result/unit:** GPT-4o function-calling pass^1 is about 61% in retail and 35.2% in airline. Retail pass^8 is <25%.
- **Conditions:** Simulated retail and airline domains, deterministic database/API state, GPT-4-0613 user simulator, at least three trials per task.
- **Comparator:** pass^1 versus pass^8 for the same agent/domain.
- **Caveat:** Simulated-user and benchmark-domain result. Aggregate pass^1 must not be exponentiated to estimate aggregate pass^k.
- **Question contribution:** R1, R2, R3.

### E5 — qualify
- **Claim:** Automated evaluator agreement requires local calibration before release decisions.
- **Source/locator:** [AgentProp-Bench v2, §5 Table 2](https://arxiv.org/html/2604.16706#S5.T2).
- **Exact result/unit:** Current inspected version reports substring heuristic κ=0.049, GPT-4o-mini κ=0.567, three-LLM ensemble κ=0.432, and human-human κ=0.835 with 92% raw agreement, n=100.
- **Conditions:** Two blinded annotators on a stratified 100-trace P2 sample. Benchmark totals 14,750 traces from 13 models.
- **Comparator:** Automatic judges versus human annotators and their consensus.
- **Caveat:** Small calibration sample, one benchmark, and version-sensitive results. Not a universal evaluator threshold.
- **Question contribution:** R1, R2, R3.

### E6 — retain
- **Claim:** Low tool-call frequency can create a misleading appearance of injection rejection.
- **Source/locator:** [AgentProp-Bench v2, §8 Table 7](https://arxiv.org/html/2604.16706#S8.T7).
- **Exact result/unit:** Gemini-2.0-Flash called tools in 5% of tested traces and fabricated tool use in 37.5%.
- **Conditions:** P2 semantic-wrong traces in deterministic simulated tools.
- **Comparator:** Apparent rejection rate versus tool-call adherence and provenance behavior.
- **Caveat:** Benchmark-specific injection condition and simulated tools.
- **Question contribution:** R1, R2, R3.

### E7 — retain
- **Claim:** LM emulation and judging can identify risks but cannot show absence of harm.
- **Source/locator:** [ToolEmu v2, validation](https://arxiv.org/html/2309.15817v2#S4.SS3) and [limitations](https://arxiv.org/html/2309.15817v2#S7).
- **Exact result/unit:** Evaluator precision 75.3%, recall 73.1%. Held-out human precision 78.7%, recall 78.8%. Adversarial-emulator identified-failure precision 68.8% ±6.7%.
- **Conditions:** GPT-4 emulator and evaluator, 144 cases across 36 toolkits.
- **Comparator:** Automatic evaluator versus three-human majority and held-out human annotators.
- **Caveat:** Emulator can omit constraints, especially in complex or adversarial settings.
- **Question contribution:** R1, R2, R3.

### E8 — qualify
- **Claim:** Public prompt-injection benchmark outcomes can be distorted by weak attacks and metric or implementation defects.
- **Source/locator:** [Firewalls or Stronger Benchmarks? v2, abstract](https://arxiv.org/html/2510.05244v2#abstract), [§7](https://arxiv.org/html/2510.05244v2#S7), and [conclusion](https://arxiv.org/html/2510.05244v2#S9).
- **Exact result/unit:** Qualitative audit finding. Revised ASB free tool selection changes reported no-defense ASR from 70% to 9.2%.
- **Conditions:** Authors’ analysis and revised settings for AgentDojo, ASB, InjecAgent, and τ-bench-derived evaluation.
- **Comparator:** Original benchmark settings versus authors’ revised settings and adaptive attack cascade.
- **Caveat:** Defense-authored preprint. It motivates fixed-version adaptive retesting, not invalidation of all earlier results.
- **Question contribution:** R2, R3.

## Reject dispositions

| Item | Disposition | Reason |
|---|---|---|
| Reliability note AgentDojo 7.5% tool-filter anchor | reject | Superseded by the source-checked Table 5 paired result in E3, 6.84% ±2.0 versus 57.69% ±3.9. |
| Reliability note AgentProp-Bench κ values 0.036, 0.586, 0.448 | reject | Unversioned URL currently resolves to v2, whose inspected reported values are 0.049, 0.567, and 0.432. |

## Decision-changing repairs

| Repair | Status |
|---|---|
| Pin AgentProp-Bench to an explicit version and replace the unversioned-note κ values with the inspected v2 values, or retain the prior version only with an archived versioned locator. | accepted |
| Use AgentDojo Appendix C Table 5 paired values, not the rounded 7.5% narrative figure, for the tool-filter comparison. | accepted |
| Keep operational controls conditional on the evaluated tool class and prohibit claims that benchmark passage proves production security. | accepted |