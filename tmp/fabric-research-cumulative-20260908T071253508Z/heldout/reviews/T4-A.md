# T4 independent complete-workflow review

## Artifact mapping

- **X (installed incumbent00):** `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/heldout/live/T4-X/RESEARCH.md`
- **Y (candidateH2c):** `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/heldout/live/T4-Y/RESEARCH.md`
- **Original task:** `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-cumulative-20260908T071253508Z/heldout/T4.md`
- **Historical reference:** `/home/balauru/.pi-profiles/fabric/runs/research-architecture-decision-tools-1788797692774/REPORT.md`

## Verdict

**Incumbent-relative: CONCLUSIVE YES.** Y improves X without a material regression in the requested core workflow. It retains the correct separation of Wayfinder planning, Factory delivery control, graph navigation, evidence acquisition, architectural judgment, decision recording, and implementation verification. It is more exact on Wayfinder's state/authority model, makes the package/trust boundary clearer, and has a better controlled, role-specific local evaluation.

**Legacy-quality: CONCLUSIVE NO.** Y is a useful decision-grade answer but does not reach the relevant historical reference's breadth or depth. This is a **close-task, not exact-prompt parity** comparison as instructed for T4. The historical report surveys a much wider set of current package and directly compatible-skill alternatives, supplies a concrete architecture-decision contract with primary methodological sources, and gives more decision-useful rejection/selection boundaries. Do not treat its extra claims as correct merely because it is historical.

## Decisive evidence

### Material correction Y makes over X

X says: “Use **Wayfinder** only when … an authorized tracker can represent child issues, assignment/claim, comments, closure, and preferably native blocking,” and later says the workflow “depends on a tracker with actual map/ticket operations.” That over-narrows the primary source. The current original says: “If no tracker has been provided, default to the **local-markdown tracker**.” Native blocking is preferred, with a body convention only when unavailable. The repair is in **X synthesis**, not a lack of cited source: its cited Wayfinder primary supports the fallback.

Y correctly states: “Without it, the source says to use a local-Markdown tracker,” while retaining the important limitation that tracker-specific operations and native frontier visualization are conditional. This changes an adoption boundary materially because a compatible hosted tracker is not a prerequisite to using the method's planning discipline.

Y also preserves the primary's quantitative condition that ticket bodies are “sized to one **100K-token agent session**,” while correctly calling it a sizing rule rather than cost, latency, or efficacy evidence. X retains the one-ticket-per-session constraint but omits the 100K condition.

### Primary-source checks

- Factory primary: “Never write implementation code before the Gate 4 slice plan is approved,” its roughly “**100+ lines**” trigger, `docs/plans/<feature-slug>/` state, explicit approval/backtracking, and per-slice “run it, curl it, or browser-test it” support Y's description exactly.
- Wayfinder primary: “planning by default,” map-as-index rather than detailed store, decision tickets rather than build slices, HITL/AFK ticket distinctions, one **100K**-token ticket body, native blocking preference with local-Markdown fallback, and “never resolve more than one ticket per session, with the exception of research tickets” support Y's decision boundaries.
- Local Fovea README supports Y's boundary that Fovea supplies navigation/impact leads and that actual source reads, tests, CI, review, and rollout remain authoritative. Its eight-project route-shape figures are not architecture-decision outcome evidence, as Y says.

### Why Y wins X

1. **Core accuracy and boundaries.** Y gives the complete Wayfinder fallback and 100K sizing rule, preserves HITL authority, and distinguishes prescribed actions from observed capability.
2. **Actionability.** Y's four-stage workflow says where each artifact belongs, when to skip Wayfinder, when to reopen a decision/gate, and requires a falsifiable check per Factory slice.
3. **Evaluation quality.** Y separates governance from evidence-adjunct comparisons, specifies populations, frozen resources, metrics, and decision rules, and explicitly prohibits pooling incompatible tasks. X's proposed 8–12-task A/B study is useful but mixes several interventions and is less diagnostic.
4. **No material loss within the requested core.** Both retain Factory and Wayfinder limits, Fovea/scouting/design/domain-modeling/grilling/prototype complements, mutable-source cautions, trust boundaries, no efficacy overclaim, conditional adoption, and a retained-source appendix.

## Remaining gap to legacy-quality

The historical reference contains decision-useful material absent from Y: a minimal architecture-decision record with owner, alternatives including status quo, measurable drivers, constraints, pre-mortem, reversibility, rollback/abort, fitness/validation, and flip condition; primary-method grounding in `principal-pi-skills`, ATAM, Kruchten, and ADR guidance; and a broader but bounded package/skill assessment including C4 architecture, Vercel ADR, stack-ops, plan-mode, Lens, and reasons to reject/defer alternatives. Y's local workflow asks for several of these ideas, but does not supply the same explicit contract or substantiate an equally broad directly-compatible-skills landscape.

This is not a reason to copy historical claims without rechecking them. It identifies the smallest legacy gap: add a compact decision-record template and source-check a small shortlist of affirmative external complements, rather than broadening package catalog coverage indiscriminately.

## Validator repair/recheck status

- **R1 required repair for X:** revise the tracker prerequisite as above. It is not fixed merely by identifying it. Recheck against the Wayfinder “The Map” and “Tickets” passages after revision.
- **R2 recheck before relying on Y's maintenance-date claim:** Y says Playbook revision activity through 2026-08-04 and Wayfinder changes through 2026-08-19. Those dates are non-decisive maintenance signals, but the live report contains no retained primary-history passage. Recheck the cited Gist history and GitHub commits response, record immutable revision identifiers/timestamps, or remove the dates. This is a source-note/synthesis traceability gap, not a demonstrated false date.
- No repair is needed for Y's central Factory/Wayfinder composition based on the primary passages checked above.

## Smallest needed checks

1. Apply and recheck R1 if X remains in use.
2. For Y to pursue legacy parity, verify only the affirmative external shortlist and publish the compact decision contract. Do not run a broad catalog survey first.
3. Do not accept a speed claim from either report's proposed evaluations until paired quality validators pass and relevant repeated runs account for resource differences.
