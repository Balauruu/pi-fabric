# Primary source snapshot: AgentProp-Bench

Title: *Auditing Automated Evaluation, Error Propagation, and Runtime Mitigation in Tool-Using Language Agents* (AgentProp-Bench)

Primary URL: https://arxiv.org/html/2604.16706

Retrieved: 2026-09-08 from the arXiv HTML primary rendering. The page's internal asset paths identify the rendered revision as `2604.16706v2`. This is a new frozen evidence file. It does not replace `evaluator-validity-audit-2607.02577.md`.

Purpose: preserve the actual source behind the historical κ values and the AgentProp-Bench evidence relevant to evaluator validity, calibration, model-specific tool-call constraints, fabricated-tool outputs, and Table 8's interceptor experiment.

---

## Abstract and study frame

> “We present AgentProp-Bench, a diagnostic benchmark of 14,750 execution traces from thirteen LLM agents (nine proprietary, four open-weight) across four domains … substring-heuristic judging of agent outputs agrees with human annotation only at chance level (Cohen’s κ=0.049 against each of two annotators), while a three-LLM ensemble reaches moderate agreement (κ=0.432) and a single GPT-4o-mini judge is in fact the strongest (κ=0.567); dual-annotator agreement is almost perfect (κ=0.835).”

> “Several agents fabricate tool executions—asserting tool-derived results never obtained (up to 37.5% of traces)—a failure invisible to end-to-end scores.”

The body provides the exact comparator context that qualifies the abstract's condensed wording: Section 5 reports substring κ=0.049 against annotator A1, κ=0.015 against A2, and κ=0.036 against the 92-trace consensus. Thus 0.049 and 0.036 are not competing corrections or versions.

## §3 benchmark, trace, and human-calibration method

> “AgentProp-Bench comprises 2,000 tasks across calendar, weather, medical, and knowledge (ablation) domains, plus 300 held-out retail tasks … Each domain provides 3–5 tools implemented as deterministic Python functions with JSON schemas that validate inputs and return structured responses.”

> “For the semantic-wrong condition we evaluate 200 tasks per model for the six main proprietary models and all four open-weight models, and 50 tasks for three frontier proprietary models: 2,150 semantic-wrong traces in total. Including all four injection types and the interceptor experiment, the released benchmark comprises 14,750 traces.”

> “Two annotators independently labeled a stratified sample of 100 P2 traces (10–12 per proprietary model, three domains) as correct or incorrect, blind to each other and to all automatic verdicts … agreement is Cohen’s κ=0.835 (92% raw).”

> “Because the ensemble judge is conservatively biased, we additionally report human-calibrated rates using the conditional probabilities P(human correct | ensemble correct)=0.76 and P(human correct | ensemble wrong)=0.25 estimated from these labels.”

## §4 evaluator methods and constraints

> “The substring heuristic marks an answer correct if the first 20 characters of the reference appear in the first 200 characters of the answer, or if any content word (>3 characters) from the reference appears.”

> “The three-LLM ensemble takes a majority vote (2/3) of GPT-4o, Gemini-2.5-Flash, and GPT-4o-mini … Human annotation uses the same criterion. Each metric is scored against the human reference by Cohen’s κ.”

> “We decompose robustness into rejection … and recovery … and test independence with Spearman correlation across the thirteen models.”

The stated limitations constrain interpretation: calibration used 100 labels from two annotators of similar background, per-model stage-two samples range from 2 to 56, tools are deterministic simulators rather than live APIs, and the study injects one parameter per trace.

## §5 metric validity, Table 2, and Table 3

> “The substring heuristic is at chance against both (κ=0.049 and 0.015; 0.036 on the 92-trace consensus) … The three individual LLM judges reach κ=0.24–0.40, the ensemble reaches moderate agreement (κ=0.432), and a single GPT-4o-mini judge is strongest (κ=0.567).”

> “Table 2: Reliability of each correctness metric as Cohen’s κ against two human annotators (A1, A2) and their 92-trace consensus (n=100; inter-annotator κ=0.835).”

> “The ensemble marks 25% of traces correct vs. 38% by humans; the dominant disagreement is the ensemble rejecting answers humans accept. Ensemble-judged correctness thus underestimates true correctness by ≈13 pp.”

> “GPT-4o-mini alone scores higher than the ensemble on this 100-label set, but the difference is within overlapping bootstrap CIs … selecting the judge that maximizes agreement on the very labels used for calibration would overfit them. We therefore retain the ensemble as the primary judge and report human-calibrated rates alongside raw ones.”

## §6–§8 propagation and fabricated-tool-use constraints

> “Re-deriving S3 from GPT-4o-mini alone gives a pooled injection-to-error rate of 0.61 and r2,3=0.74, versus 0.71 and 0.80 under the ensemble.”

> “Rejection and recovery rates are statistically independent across the thirteen models (Spearman ρ=0.041, p=0.893; Table 6).”

> “Among traces with no tool call, [we measure] the fraction whose final answer nonetheless asserts a completed tool-derived result … A classifier validated by hand-adjudicating 40 flagged traces has precision 92.5% (37/40).”

> “GPT-4o and GPT-4.1-nano call tools in 99–100% of traces, whereas Gemini-2.0-Flash does so in only 5% and fabricates in 37.5%; GPT-4o-mini calls tools 40% of the time and fabricates 12%.”

The source therefore explicitly warns that low injection admission can be absent or fabricated tool calls rather than robust parameter filtering, and that fabricated tool use is not exposed by end-to-end scores or substring judges.

## §9, Table 8: concurrent-control interceptor experiment

> “Table 8 and Figure 4 report the concurrent-control experiment across five models. The interceptor reduces hallucination on every tool-calling model, all CIs excluding zero: GPT-4o-mini (−23.0 pp), Qwen2.5-7B (−24.0 pp), Qwen2.5-14B (−8.0 pp), and Hermes-3-Llama-8B (−4.0 pp).”

> “The one null case, Gemini-2.0-Flash (−1.3 pp), is exactly the model that rarely emits an injectable tool call.”

> “Table 8: Interceptor concurrent-control experiment (five models). Ctrl/Int: hallucination % without/with the interceptor; Δ: reduction; Abst: abstention %; Sv (Saved): hallucinations correctly abstained; Bk (Broken): correct answers wrongly abstained.”

> “The interceptor’s threshold traces a precision/coverage frontier … Operators should select the operating point per model.”

The source labels Table 8 as a concurrent-control experiment, not a deployment-security guarantee. It reports reduction for models that call tools and a mechanism-consistent null for the low-tool-call model. Absolute arm rates remain subject to the source's stated lack of human validation, while between-arm deltas are argued to be robust to shared judging bias.
