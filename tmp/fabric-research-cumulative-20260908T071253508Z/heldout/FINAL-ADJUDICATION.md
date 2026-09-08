# H2c final held-out adjudication

## Conclusive result

**Reject H2c.** It does not improve the incumbent without material regression across the held-out set. **T2 fails** because Y omits the closest direct, repeated, hidden-gold-test context-delivery null central to the requested context-selection decision. **T4 is incumbent-relative positive**, but cannot cure T2. No further trial is necessary to decide rejection. No speed claim is warranted before a quality-heldout pass.

This is source adjudication, not a repair request. No candidate, source, skill, or report was changed.

## Decision ledger

| Task | Incumbent-relative result | Why | Further trial needed to decide rejection? |
|---|---|---|---|
| T2 fixed-model run design | **NO: material regression** | Y drops the strongest retained direct counterevidence for context selection. | **No.** The omission and its decision relevance are directly established. |
| T4 Pi architecture decisions | **YES: no material Y-only regression** | Y corrects Wayfinder's tracker fallback and preserves the decisive no-efficacy boundary. Its Fovea benchmark omission is non-material because no benchmark output was inspected. | **No.** The source design and both reports establish the result. |

“Improves without material regression” is distinct from legacy breadth. T4's historical report is only a close-task reference, not a formal parity target. No full-legacy-parity verdict is made.

## T2

### Material regression: omitted direct context-file null

**Candidate path:** `heldout/live/T2-Y/RESEARCH.md`, Executive decision and R1 “Context selection and tool feedback.” It prioritizes evaluating bounded context from SWE-agent interface ablations, but contains no Khatri context-file study or equivalent countervailing result.

**Incumbent path:** `heldout/live/T2-X/RESEARCH.md`, “1. Context selection and delivery.” It retains the exact needed limiting passage:

> “17 PR-derived Python tasks from three repositories with hidden PR gold tests… [with] three repeats per task (288 valid evaluations).”
>
> “no statistically significant overall difference… Claude pairwise gaps were at most 2.3 percentage points… Codex’s maximum was 5.9 pp, with omnibus p=1.00 and p=0.66.”
>
> “In the dynamic-range subset, no-context resolved 58% versus 42% for both always-on and selective context.”

**Original inspected source:** `https://arxiv.org/html/2607.27250v1`, Abstract, §§3.1–3.3, §4.1–4.2. Decisive passages state: “288 evaluated runs with gold-test evaluation”; “neither agent shows a statistically significant strategy effect”; the 4 Codex-borderline tasks yield “none achieves 58% vs. always_on 42% and selective 42%”; and the selective corpus is 10×/18× broader for two repositories. Its opshin process signal is explicitly exploratory, n=4/5, not a correctness gain.

This is material to T2 R1/R2/R3. The source directly tests the named context-delivery intervention under repeated hidden-test evaluation and bounds how SWE-agent's configuration-specific positive viewer/history ablations may be generalized. It does not show context is universally harmful. It requires the operational conclusion that bounded context is a locally testable hypothesis, not a literature-supported first priority.

**Provenance:** `heldout/live/T2-Y/streams/s1.md` retains SWE-agent, Agentless, AutoCodeRover, and RepairAgent. Its searched contents contain no Khatri record. `T2-Y/streams/s2.md` also contains no Khatri record. This is a source-note selection loss, not merely synthesis compression. It is therefore an actual incumbent-relative regression.

### $1.67 denominator: reviewer correction is false

**Candidate passages:** `heldout/live/T2-Y/RESEARCH.md`, R1 says “API inference cost averaged over successfully resolved instances”; `heldout/live/T2-Y/streams/s1.md`, L6 says “SWE-agent reports average cost over successfully resolved instances.”

**Original inspected source:** `https://arxiv.org/html/2405.15793`, §4 “Metrics” says: “We also report the $ Avg. Cost metric, the API inference cost incurred by SWE-agent averaged over all successfully resolved instances. Due to budget constraints, we set the per-instance budget to $4…”. Table 1 reports Lite shell-only 11.00/$1.46 and SWE-agent GPT-4 Turbo 18.00/$1.67.

Thus Y's denominator and its non-comparability warning are correct. `heldout/reviews/T2-A.md` and `heldout/reviews/T2-B.md` incorrectly inferred the denominator from the table label while overlooking the immediately preceding Metrics definition, then misattributed a Y source-note/synthesis defect. There is **no T2 cost-denominator regression in Y**. Conversely, X's “$1.67 average cost per instance” wording is not supported by the source. That incumbent defect does not offset Y's material loss of the Khatri null.

### Promising T2 components

Y's Agentless selection table, evaluator-audit qualification, repeated-run variance evidence, and paired fixed-model artifact are useful gains. They remain insufficient to establish no material regression after the context-null loss.

## T4

### Candidate gain: Wayfinder authority and selection boundary

**Incumbent passage:** `heldout/live/T4-X/RESEARCH.md` requires an “authorized tracker” and says the workflow depends on tracker operations.

**Candidate passage:** `heldout/live/T4-Y/RESEARCH.md`, “Wayfinder,” says: “Without it, the source says to use a local-Markdown tracker,” while retaining the tracker-operation limitation.

**Original inspected source:** `https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/wayfinder/SKILL.md`, “The Map”: “Where the map, its child tickets, blocking, and frontier queries physically live is tracker-specific… If no tracker has been provided, default to the local-markdown tracker.” “Tickets” specifies native blocking as preferred, with a body convention only when unavailable.

Y therefore corrects a material adoption boundary. A hosted/native tracker is not a prerequisite to use Wayfinder's planning discipline. Its controlled, role-specific local evaluation is also a promising gain.

### Fovea benchmark disagreement: no material Y-only regression

**X evidence:** `heldout/live/T4-X/RESEARCH.md`, quantitative-evidence table, retains `pi-fovea/scripts/bench.ts`: bounded focus versus alphabetically ordered outline at 500/1,000/2,000/4,000 tokens, recall against Fovea's own 16,000-token focus output, followed by “No benchmark output was inspected. Self-oracle, weak comparator... cannot establish better architecture decisions.”

**Y evidence:** `heldout/live/T4-Y/RESEARCH.md`, “Fovea's limited numerical evidence,” says the eight-project route-shape observation reports “no architectural-decision accuracy, task completion, precision/recall across graph edges, cost, latency, uncertainty, or user outcome.”

**Original inspected source:** `https://raw.githubusercontent.com/monotykamary/pi-fovea/main/scripts/bench.ts`. The script labels itself “Developer-only rate–distortion and refresh benchmark,” uses a finite 16K `focus` response as `reference`, compares lower-budget focus output with an alphabetically ordered outline, and prints results for 500/1,000/2,000/4,000 budgets. No output was supplied or inspected.

Reviewer B correctly identifies the design caveat and the note-stage difference. X retains it in `T4-X/streams/s2.md`; Y does not retain it in its notes. But the omission is **not material** to T4's actual selection, permission, or efficacy answer. An unrun, self-oracle, weak-comparator script provides no empirical evidence of better Fovea performance or architecture outcomes. Y's categorical denial of architecture-outcome evidence preserves the decision-changing limitation. Typography or source-table labeling does not change this result.

### Wayfinder `research/<name>` branch: shared permission gap

The original Wayfinder source, “Chart the map,” step 5, directs research subagents to capture findings “on a throwaway `research/<name>` branch with a context pointer from the ticket.” This is a documented branch/write operation.

Neither final report carries that explicit branch-authority guard. It is a **shared final-report permission-completeness gap**, not a Y-only regression and not evidence of measured efficacy. Its stage attribution differs:

- X retains the fact in `heldout/live/T4-X/streams/s1.md` (“research subagents and throwaway branches”), but drops it in final synthesis.
- Y's retained note set does not carry the branch fact, and its final likewise omits it.

The gap is material only as an implementation permission safeguard. Use of the default charting path needs explicit repository write/branch authority or a declared no-write evidence-capture alternative. It does not change the T4 selection result and does not create a need for another experimental trial.

## Inspected report and review paths

- Questions: `heldout/T2.md`; `heldout/T4.md`.
- Candidates and incumbents: `heldout/live/T2-{X,Y}/RESEARCH.md`; `heldout/live/T4-{X,Y}/RESEARCH.md`.
- Independent reviews: `heldout/reviews/T2-A.md`, `T2-B.md`, `T4-A.md`, `T4-B.md`.
- Source-note trace: `heldout/live/T2-Y/streams/{s1,s2}.md`; `heldout/live/T4-X/streams/{s1,s2}.md`; `heldout/live/T4-Y/streams/{s1,s2}.md`.

## Quality gate

Quality-heldout does **not** pass because T2 has a material incumbent-relative evidence regression. No further trial is required to reject H2c. No claim about speed, cost reduction, or efficacy is authorized by this adjudication.
