## R1 — Retain with qualifications

- **Retain:** State-based evaluation, repeated-trial consistency, trace-level failure classes, and paired utility/attack metrics. τ-bench defines `pass^k` as all *k* i.i.d. trials succeeding and reports GPT-4o retail `pass¹ ≈61%` but `pass⁸ <25%`. Its inference is limited to simulated customer conversations, specified tools, policies, and sampling settings. [τ-bench §3, §5](https://arxiv.org/html/2406.12045)
- **Retain:** WebArena’s `14.41%` best GPT-4 result versus `78.24%` human result, with outcome-based checks, supports difficulty in its self-hosted environment, not live-web reliability. The cited stop rules are exact experimental-harness settings: 30 transitions, halt after >3 repeated same actions or 3 consecutive invalid actions. [WebArena §5, App. A.6](https://arxiv.org/html/2307.13854)
- **Retain:** Automated judging needs calibration. ToolEval’s reported human agreement is `87.1%` pass and `80.3%` win on sampled trajectories, not a correctness guarantee. AgentProp-Bench independently supports this concern: substring consensus κ=`0.036`, human κ=`0.835`, and an ensemble undercalls correctness by about 13pp on its 100-trace calibration sample. [ToolLLM App. A.5](https://arxiv.org/html/2307.16789), [AgentProp-Bench §§4–5](https://arxiv.org/html/2604.16706)
- **Qualify:** AgentProp-Bench is a preprint with deterministic simulators and only 100 human-labeled traces. Retain it for the narrow evaluator-validity and fabricated-tool-use findings, not as evidence of live-tool reliability.
- **Reject:** Any phrasing that treats benchmark scores as deployment reliability or security evidence. None of the inspected originals supports that causal transfer.

## R2 — Retain with quantitative-comparability constraints

- **Retain:** AgentDojo establishes an attack/utility trade-off under its harness. In the paper’s GPT-4o defense table, no defense is `50.01%` utility-under-attack and `57.69% ±3.9` targeted ASR, while tool filtering is `56.28% ±3.9` and `6.84% ±2.0`. The paper also states tool filtering fails when required tools enable the attack, reported for `17%` of cases. [AgentDojo §4, Table 5](https://arxiv.org/html/2406.13352v3)
- **Qualify:** Do not combine the paper-table AgentDojo values above with `47.69%` ASR, `69.07%` benign utility, or `72.16%` tool-filter utility as though they are one experiment. Those values in `security.md` are attributed to a live-results page and differ from the paper’s table. Synthesis must preserve source URL, model snapshot, attack family, defense configuration, metric definition, and result date.
- **Retain:** AgentHarm supports the narrow claim that chat-style refusal does not necessarily transfer to its synthetic tool-agent setup. Its jailbreak template changes GPT-4o harm from `48.4%` to `72.7%` and Claude 3.5 Sonnet from `13.5%` to `68.7%`; best-of-five raises scores further. The paper explicitly calls its synthetic tools easier and less realistic proxies for harm. [AgentHarm §§3–5](https://arxiv.org/html/2410.09024)
- **Retain with strong qualification:** ToolEmu is evidence for scalable failure discovery in an LM-emulated sandbox. Its `68.8%` human-validated identified-failure figure and `73.1%` evaluator recall do not validate real APIs, side effects, authorization, or production failure incidence. [ToolEmu §§3–5](https://arxiv.org/html/2309.15817)
- **Reject:** Cross-benchmark rank-ordering, aggregate “agent safety,” or universal thresholds from these rates. Environments, task distributions, models, attack budgets, evaluator methods, and outcome definitions are not comparable.

## R3 — Retain controls, reject overstated authority

- **Retain:** Runtime authority controls are justified independently of model scores: server-side authorization, least privilege, typed validation, idempotency, state assertions, immutable provenance, bounded retries, approval for consequential effects, and fail-closed privileged paths.
- **Retain:** Release gates based on any unauthorized irreversible action, cross-tenant disclosure, missing policy/audit event, or unreconciled ambiguous write are appropriate system-level constraints. They are policy decisions, not empirical thresholds supplied by the benchmarks.
- **Qualify:** NIST AI 600-1 supports risk-specific TEVV, adversarial testing, deployment-like testing, and documented generalizability limits. It is a voluntary risk-management profile, not a “governing standard,” certification, or proof that an agent is secure. [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- **Reject:** “Low ASR,” “high rejection,” or “no tool call” as a standalone security metric. AgentProp-Bench reports Gemini-2.0-Flash called tools in only `5%` of relevant traces and fabricated tool-derived results in `37.5%`; low admission can reflect non-execution, not robustness.

### Decision-changing gaps

1. **Deployment-matched evidence:** Run private scenarios using the exact model revision, orchestration, tool schemas, privileges, credentials, action/retry budget, and real policy layer.
2. **Security boundary:** Test every untrusted-content ingress against every consequential sink, including adaptive attacks and required-tool overlap.
3. **Evaluator validity:** Use executable state and policy assertions. Blindly human-review every prohibited effect and a stratified sample of judge disagreements.
4. **Repeatability:** Report `pass¹` and repeated-run success separately, with run count, stochastic settings, denominator, abstentions, timeouts, and failure classes.

### Synthesis constraints

- Bind every number to its original source, table/section, model snapshot, environment, attack set, metric denominator, and budget.
- Do not present simulator, benchmark, or evaluator results as production rates.
- Do not merge paper and live-dashboard AgentDojo results without an explicit configuration crosswalk.
- Treat public-benchmark contamination as an unresolved generalization threat unless model-specific exposure evidence is supplied.
- Frame controls as required system safeguards and risk-owner decisions, not as benchmark-proven protections.