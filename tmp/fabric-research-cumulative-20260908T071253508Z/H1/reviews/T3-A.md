# T3-A independent paired assessment

## Verdict

**Frozen-scope quality: conditional, not decision-grade as written.** H1 does **not** materially improve the incumbent in either exact pair: T3-1 is textually identical, and T3-2 has only two small accuracy/detail additions that do not repair the shared material omissions. Both reports make a sound, actionable core recommendation: test the exact deployment repeatedly, validate scoring against traces, enforce authority outside the model, and do not call benchmark results production security. That conclusion is appropriately bounded. This review makes no finding of full legacy parity, workflow behavior, or speed.

The material shared defect is failure to preserve two source conflicts that affect the report's evidence table: AgentDojo's tool count is stated unqualified as 70 despite the frozen primary source also stating 74, and AgentProp-Bench's abstract/body-table kappa conflict is not disclosed. The reports also repeat an audit-v2 account of ToolBench-X version scope that conflicts with the supplied frozen v1 primary text, without identifying the conflict. These are defects in source-conflict handling, not evidence that the reports' directly source-supported ToolBench-X values are false.

## Pair verdicts

| Pair | Does Y materially improve X without regression? | Evidence-based assessment |
|---|---|---|
| X1 baseline/T3-1 vs. Y1 H1/T3-1 | **No.** | The files are textually identical. For example, each has the same ToolBench-X table passage: “**v1 only.** 1,106 executable multi-step tasks, 4,956 deterministic Python tools … Twelve models are scored …” No H1 gain or H1-specific regression exists. |
| X2 baseline/T3-2 vs. Y2 H1/T3-2 | **No material improvement.** | Y2 adds two correct clarifications, but X2 and Y2 retain the same decision-critical omissions and the same unqualified AgentDojo count. |

## T3-2 H1 gains

1. **G1: tau-bench score predicate is better preserved.** X2 says “Primary result is state-based pass^1”; Y2 changes this to “Primary result is combined database-action and required-output pass^1. A reward of 1 can still miss an explicit-confirmation policy violation.” This is a real improvement. It tracks the required state-plus-user-output structure and the source qualification rather than reducing the metric to state alone.
2. **G2: ToolBench-X scoring and diagnostic sample are better qualified.** X2 says “Exact final-answer matching compares clean and hazard environments.” Y2 instead says “Final-task accuracy is backend-state match or a final response explicitly containing the ground-truth answer. Clean-versus-faulted comparison is limited to the 200-task diagnostic subset.” The frozen S2 §Experiments says exactly that a task is correct if backend state matches **or** the final response explicitly contains the answer, and §Further Analysis identifies the uniformly sampled 200-task subset. This is accurate and decision-relevant.

## Shared defects and exact evidence

1. **D1: AgentDojo tool-count conflict omitted, and T3-2 states a false unqualified count.** X2/Y2 each say: “v1.0 synthetic state for four tool environments, **70 tools**, 97 user tasks, 27 injection targets, and 629 user/injection security cases.” Frozen S4 §3.1 instead says: “We populate AgentDojo with total of **74 tools**.” Its Table 1 caption says “a total of **70 tools**,” but its rows are 24 + 11 + 28 + 11 = 74. The source does not reconcile this. X1/Y1 avoid a tool-count claim, but none of the four reports records the conflict. The correct report formulation is the comparator-qualified conflict, not 70 or 74 alone.

2. **D2: AgentProp-Bench's source-internal kappa conflict is omitted.** X1/Y1 say: “κ=0.049 vs annotator A1, 0.015 vs A2, and 0.036 vs the 92-trace consensus.” X2/Y2 compress this as “κ=.049/.015 vs annotators, .036 consensus.” Those body/Table 2 mappings are correct, but all four omit the decisive counter-passage in frozen S5's abstract: “Cohen’s κ=0.049 **against each of two annotators**.” S5 then explicitly distinguishes §5's “κ=0.049 and 0.015; 0.036 on the 92-trace consensus.” The report must label this as an abstract/body-table conflict and designate §5/Table 2 for comparator-qualified values. Otherwise it does not preserve the required conflict.

3. **D3: ToolBench-X source-versus-audit-v2 scope conflict is unacknowledged.** The reports' factual claims about the frozen v1 text are supported: X1/Y1 state “1,106” tasks, “4,956” tools, “Twelve models,” and Table 2 values; X2/Y2 retain the same broad v1 scope. Frozen S2 itself says “We conduct a comprehensive evaluation … benchmarking **twelve** prominent large language models,” labels its table “**Main Results on ToolBench-X**,” and reports 1,106 and 4,956 in Table 1. That conflicts with AUDIT-v2 C2's assertion that v1 is only the five-model, 200-task diagnostic and that v2 adds the twelve-model main benchmark. Because the primary frozen passage is decisive, the reports should not be penalized for repeating S2's directly supported v1 content. But they should identify the supplied audit/source contradiction rather than write “Do not substitute or blend any later v2 main-benchmark scope/results into this v1 evidence” as if this were uncontroversial. This is a material provenance/control issue.

4. **D4: Some precise values are clear but configuration labels need more discipline.** X2/Y2 combine AgentDojo no-defense and tool-filter values in one sentence: “no defense: benign utility 69.0% … utility under attack 50.01% … targeted ASR 57.69% … tool filter … 6.84%.” These are Table 5 defense-configuration values and differ from S4 Table 3's GPT-4o baseline values (50.08% utility under attack and 47.69% ASR). The reports do identify the 7.5% prose versus 6.84% Table 5 conflict, which is good, but should explicitly bind the 57.69/6.84 set to Table 5's strongest-attack/defense comparison and retain Table 3 as a distinct condition.

## What is preserved well

- The reports consistently separate benchmark measurements from deployment controls and say no source proves production security.
- All distinguish S3 evaluator audit from S5 AgentProp-Bench, retain calibration/sample limitations, and avoid pooling scores.
- The decision tables and local evaluation plans are coherent and operational: version/configuration freeze, repeated clean runs, classified recoverable faults, state/authorization checks, adaptive attacks, human trace review, and least privilege.
- ToolBench-X's recoverable-hazard construction and the diagnostic hint-versus-extra-rounds comparator are accurately explained. Frozen S2 states every injected instance preserves a viable recovery path, and its 200-task analysis states Hint adds 25.5–35.5 points while TTS adds 3.5–11.5.

## Repeat sensitivity and overall judgment

Report quality varies more between repeats than between incumbent and H1. Repeat 2 is more compact and adds G1/G2, but it also introduces the unqualified 70-tool statement. Within each repeat, H1 supplies no material improvement over its incumbent. Across repeats, the shared recommendation remains stable and actionable, but the retained source-conflict defects mean neither H1 output is fully accurate at frozen-corpus scope. No conclusion about legacy parity or system behavior follows from these phase-only reports.
