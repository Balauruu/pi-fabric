# Pi architectural analysis and decision-making: Playbook, Wayfinder, and complementary capabilities

**Scope and date.** Decision-grade, source-based assessment for the requested 2026-09-07 cutoff. It covers the two named methods and locally available Pi complements that fill an evidence-navigation, architectural-judgment, or decision-recording gap. No package/code execution, installation, configuration, tracker mutation, or browser automation occurred. The primary URLs are mutable live sources, so this is not a cryptographically verified historical snapshot.

## Executive decision

**Adopt both conditionally. Do not treat either as an architecture-evaluation method, security control, compatibility proof, or effectiveness evidence.**

- Use **[Wayfinder](https://github.com/mattpocock/skills/blob/main/skills/engineering/wayfinder/SKILL.md)** only when an ambiguous effort exceeds a session and an authorized tracker can represent child issues, assignment/claim, comments, closure, and preferably native blocking. It maps and sequences decisions, not architectural truth.
- Use **[Software Factory Playbook](https://gist.github.com/Maciejdziuba/88890d7e0eeefa5a8738bbe9fd5e20b8)** once pivotal unknowns are resolved, for consequential feature delivery. Its gates turn a selected direction into approved product, system-fit, program-design, and vertical-slice artifacts.
- Add optional complements rather than another end-to-end workflow: **pi-fovea** for candidate code evidence and impact hypotheses in large/unfamiliar repositories, **codebase-design** for module/interface/seam alternatives, and **domain-modeling** for terminology plus a minimal ADR when a decision is durable. Use grilling to elicit the human position and prototype only for contested behavior/shape. Do not make codebase-scouting a second mandatory workflow: reuse its citation and uncertainty discipline.

Change this choice if the local paired evaluation below does not show enough reviewability or rework benefit to pay for gates, map maintenance, and tool overhead.

## What the named methods prescribe

### Software Factory Playbook: controlled feature delivery

The Playbook is a four-gate process for a real feature, not a method for selecting among architecture alternatives. It recommends the full process for multi-file work, a new endpoint/table/screen, or an approximately **100+ line** review-unfriendly diff, and exempts trivial edits, explicit bypasses, and throwaway/prototype work ([primary source, “When to run the gates”](https://gist.github.com/Maciejdziuba/88890d7e0eeefa5a8738bbe9fd5e20b8)).

| Gate | Prescription | State and authority boundary |
|---|---|---|
| 1. Product | End-user problem, one measurable business metric, announcement text, and plain HTML mockups. Technical design is banned. | Human approval before Gate 2. |
| 2. Architecture | Read relevant existing code first, then record fit, endpoints, data/query outlines, end-to-end flow, and external dependencies. Environment-variable **names**, never values. | Human approval. This documents selected fit, not an alternatives analysis. |
| 3. Program design | Files, types/signatures without bodies, call stacks, planned test assertions, and least-confident decisions. | Human approval before the slice plan. |
| 4. Vertical slices | Approve build order, make a running tracer bullet, then one capability per working/testable slice and re-steer after each. | Code only after approved slice plan. |

Durable state lives in `docs/plans/<feature>/`: `00-status.md`, gate documents, mockups, and slice plan. A fresh session reads the folder and resumes at the first unapproved gate/unchecked slice. A later invalidation requires backtracking, revising the earlier artifact, and re-approval ([“Files and state” and “The approval protocol”](https://gist.github.com/Maciejdziuba/88890d7e0eeefa5a8738bbe9fd5e20b8)). The source also requires behavioral proof per slice and rejects tests that already pass before the change or are weakened/skipped ([“Gate 4” and “Standing rules”](https://gist.github.com/Maciejdziuba/88890d7e0eeefa5a8738bbe9fd5e20b8)).

It directly counters premature code, imagined-codebase design, hidden mid-implementation choices, horizontal delivery, and context loss. It does **not** define criteria for coupling, consistency, security, cost, operability, reversibility, stakeholder conflict, or comparative uncertainty. A valid Gate 2 can therefore record a poorly judged option. The inspected artifact is a Maciej Dziuba Gist that attributes its approach to Dex Horthy/HumanLayer and a podcast. That establishes stated provenance, not independent validation.

### Wayfinder: tracker-backed uncertainty reduction

Wayfinder is planning by default: it creates a shared issue-tracker **map** and one-question **decision tickets**, resolving the route until no material decisions remain before implementation ([“Plan, don’t do”](https://github.com/mattpocock/skills/blob/main/skills/engineering/wayfinder/SKILL.md)). The map is an index, not a duplicate decision store. A closed ticket holds the detailed resolution; the map holds a one-line linked gist.

Its method is: name the **destination** with grilling and domain-modeling; map breadth-first; ticket only questions already precise; retain in-scope but not-yet-precise questions as **fog of war**; and put work beyond the destination **out of scope**. Create a `wayfinder:map` issue and child tickets labelled `wayfinder:research`, `prototype`, `grilling`, or `task`; wire dependencies in a second pass; work the frontier of open, unblocked, unclaimed tickets; claim before work; then resolve, comment, close, and update the map ([“The Map,” “Fog of war,” and “Invocation”](https://github.com/mattpocock/skills/blob/main/skills/engineering/wayfinder/SKILL.md)).

Research is AFK. Prototype and grilling are HITL, and the human must speak for themselves. Task may be HITL or AFK, but must unblock a decision rather than deliver the destination ([“Ticket Types”](https://github.com/mattpocock/skills/blob/main/skills/engineering/wayfinder/SKILL.md)). It limits normal resolution to **one ticket per session**, except research.

The workflow depends on a tracker with actual map/ticket operations. Native blocking is preferred for a visible frontier, with a body convention only as fallback. The source does not prove this Pi profile has an authorized compatible tracker, child links, labels, assignments, blocking, comments, closure, or concurrent-edit conflict handling. A vague/disputed destination, map maintenance, and the one-ticket/session rule can create coordination cost. Like the Playbook, it says what to decide next, not which architecture should win.

### How they fit, and what remains missing

| Situation | Use | Do not infer |
|---|---|---|
| Destination/key questions cannot fit one session | Wayfinder | A frontier/dependency graph proves neither evidence quality nor architectural correctness. |
| Competing architecture/module/integration options | Explicit evidence-and-criteria comparison | Neither method supplies a scoring rule, threat model, or uncertainty model. |
| Intent, code fit, interfaces, tests, build plan need approval | Playbook Gates 1–3 | Approval is not empirical proof. |
| Delivery after a plan | Playbook Gate 4 | A tracer bullet or passing test validates only its stated behavior. |
| Durable rationale | Detailed Wayfinder ticket linked to one ADR if warranted | Do not duplicate full rationale in map, ticket, ADR, and feature plan. |

For every pivotal alternative, record evidence and confidence for functional fit, interface/coupling, failure isolation, consistency, security/privacy, operability, migration/rollback, latency/cost, ownership, and reversibility. Record rejected options and the disconfirming observation/reopening trigger. This is the missing architecture-judgment layer.

## Pi compatibility, observed availability, and permission boundaries

Pi documents Agent Skills discovery from configured skill directories and other harness directories, and on-demand loading of complete `SKILL.md` instructions. `disable-model-invocation: true` hides a skill from automatic invocation and requires `/skill:name` ([Pi Skills, local](file:///home/balauru/.local/share/pi-node/node-v22.23.1-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/skills.md)). Wayfinder has that frontmatter, so its format and explicit invocation pattern are **documented packaging compatibility**, not proof of installed status or tracker interoperability. The Playbook's `name`/`description` format is similarly compatible in principle.

This profile **observably exposes** pi-fovea extension tools (`fovea_sketch`, `fovea_focus`, `fovea_dwell`, `fovea_impact`) and lists `codebase-design`, `domain-modeling`, `grilling`, `prototype`, and `codebase-scouting` as available skills. Local pi-fovea metadata reports **0.22.1**, a Pi extension at `src/index.ts`, skills at `skills/`, Node `>=20`, optional `@ast-grep/cli`, and `*` Pi peer ranges ([local metadata](file:///home/balauru/.pi-profiles/fabric/npm/node_modules/pi-fovea/package.json)). This is present metadata and registered availability, **not** artifact integrity, source review, a compatibility matrix, or operational correctness.

Skills are instructions, not permission controls. Pi warns that skills may direct arbitrary actions, extensions/packages run with full system permissions, and project-local dynamic resources load after project trust ([Pi Skills](file:///home/balauru/.local/share/pi-node/node-v22.23.1-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/skills.md), [Pi Extensions](file:///home/balauru/.local/share/pi-node/node-v22.23.1-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md), [Pi Packages](file:///home/balauru/.local/share/pi-node/node-v22.23.1-linux-x64/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md)). Thus, Playbook delivery needs repository-write/test/proof authority; Wayfinder needs tracker-mutation authority; and Fovea needs explicit choices on project trust, indexing scope, cache retention, and proactive state.

## Complement matrix

| Capability | Material complement | Conditional use and failure mode |
|---|---|---|
| [pi-fovea](https://github.com/monotykamary/pi-fovea/blob/main/README.md) | Cross-language graph navigation and impact hypotheses. Sketch/focus/dwell identify candidate source windows. Impact provides causal paths, possible co-change companions, coverage gaps, and obligation ledger. | Use for unfamiliar, large, multi-module/cross-language repositories. Read the actual cited source and treat graph/co-change/heat as leads, not architecture judgment or authorization. Its own skill says a few dozen files may be cheaper to read directly; project tests, CI, review, and rollout remain final gates. |
| `codebase-design` (configured; [source](https://github.com/mattpocock/skills/blob/main/skills/engineering/codebase-design/SKILL.md)) | Compares alternatives via module depth, interface, seam, adapter, leverage, and locality. | Apply only after sourced repository facts. Agent-generated alternate interfaces are not independent evidence. Require source links for every claimed caller, invariant, and impact. |
| `domain-modeling` (configured; [source](https://github.com/mattpocock/skills/blob/main/skills/engineering/domain-modeling/SKILL.md)) | Sharpens disputed terms against code and captures an ADR only for hard-to-reverse, surprising real trade-offs. | Keep the glossary separate from implementation decisions. ADRs record choices but do not validate them or prove conformity. |
| `grilling` and `prototype` (configured) | Wayfinder already prescribes grilling/domain-modeling to establish destination and grilling/prototype ticket types. | Use only for real uncertainty. They do not independently corroborate Wayfinder. Prototype creation requires explicit write/implementation authority. |
| `codebase-scouting` (configured; [local source](file:///home/balauru/.pi-profiles/fabric/skills/codebase-scouting/SKILL.md)) | Citation and observation/inference/unknown discipline. | Borrow discipline, not a duplicate mandatory scouting process. It has no architectural criteria or decision record. |

No popularity conclusion is warranted: no stars, downloads, install count, catalog rank, or user-study measure was retained. Discoverability and metadata are not security, compatibility, or usefulness evidence.

## Quantitative evidence and exact limits

| Source/population | Intervention and baseline | Metric/result | Decision use and limitation |
|---|---|---|---|
| Playbook feature-size guidance | Four gates, no experimental comparator | Approx. **100+ lines** | Applicability heuristic, not a measured benefit. |
| Wayfinder ticket/session model | Map/tickets, no experimental comparator | **One ticket/session**, except research | Workload constraint, not throughput/quality evidence. |
| Fovea README, **8 cloned projects** for route-shape discovery | Posterior promotion of call shapes | Junk below about **0.27**; real route shapes above about **0.75**; cutoff **0.55**, minimum **4 sites** and **2 files** | Extractor discrimination only, not developer or architectural outcome. |
| Fovea `bench.ts` specification | Bounded `fovea_focus` versus alphabetically ordered outline | Budgets **500/1,000/2,000/4,000 tokens**; recall against Fovea's own 16,000-token focus output, plus timing intent | No benchmark output was inspected. Self-oracle, weak comparator, and high-connectivity queries cannot establish better architecture decisions. |

There is **no common benchmark** joining Playbook, Wayfinder, Fovea, codebase-design, or domain-modeling. Neither named workflow reports a corpus, model/system, comparator, sample, completion rate, quality/time/cost measure, uncertainty interval, or independent replication. Missing cost, latency, and uncertainty are unknown, not zero.

## Recommended operating workflow

1. **Acquire evidence.** State destination/decision, alternatives, constraints, owners, required observations, disconfirming evidence, and deadline. Read primary code, runtime/configuration facts, interfaces, operational constraints, and owned-team statements. Label fact, assumption, inference, and unknown. For a large unfamiliar repository, use Fovea only to nominate source windows, coverage gaps, and potential impacts, then inspect source.
2. **Map only if required.** If destination is unclear or pivotal questions exceed one session, use Wayfinder. Create only precise tickets and preserve fog. Use claims/blocking only after tracker compatibility and mutation authority are confirmed. Keep delivery out of tickets except necessary prerequisite work.
3. **Make the judgment explicit.** Compare a small number of alternatives against the stated criteria. Use codebase-design for seam/interface alternatives and domain-modeling for disputed terminology/ownership. Record evidence, confidence, rejected options, risks, reversibility, and falsifiers.
4. **Record once, link everywhere.** Put detail/evidence in the ticket, only a linked gist in the map, and one ADR if the durable-ADR threshold is met. Keep glossary distinct.
5. **Translate to delivery.** Apply Playbook Gates 1–3. Gate 2 validates the selection against real code; Gate 3 exposes files, interfaces, call stacks, tests, and low-confidence assumptions for approval.
6. **Follow through and reopen.** Use Gate 4 tracer bullet then vertical slices. Use Fovea impact as a review checklist, never a mandate. Prove each slice with a test that could fail before the change. If implementation falsifies an assumption, reopen the ticket/ADR and affected gate, re-approve, then continue.

## Conditional adoption and local evaluation

Adopt Playbook now for consequential delivery after design clarity. Adopt Wayfinder only for cross-cutting multi-session uncertainty with an authorized compatible tracker. Use Fovea selectively for evidence/impact where repository scale warrants it. Keep design/ADR skills optional.

After authorization and without package/config changes during the study, select **8–12** real architecture questions across two repositories, one small and one unfamiliar multi-module/cross-language. Lock model/version, prompt, context/time budget, code access, participants, and acceptance criteria. Counterbalance order.

- **A, control:** current planning practice or named workflow alone, using Wayfinder only when its ambiguity condition qualifies.
- **B, treatment:** same baseline plus Fovea for candidate evidence/impact, codebase-design for alternatives, domain-modeling/ADR for durable decisions, and Playbook Gates 1–3 before implementation.

Have an independent reviewer verify cited claims against source and score decision records for accurate context, real alternatives, explicit consequences, answerability of interface/data-flow/rollback/ownership questions, and consistency with implemented code. Measure time to approved internally consistent decision, citation precision/recall, missed affected files, unsupported claims, post-approval invalidations, first-slice rework, ADR corrections, acceptance-check pass rate, tool calls/tokens, and human tracker/document-maintenance time.

Predeclare a threshold: for example, adopt Fovea for a repository class only if B preserves or improves independent evidence accuracy **and** reduces investigation time by at least **20%**, without more unsupported claims or missed impacts. Restrict Wayfinder if map maintenance dominates. Restrict Playbook if gate latency delays low-risk work without reducing rework. Keep design/ADR skills optional unless they improve review quality or decision reversibility.

## Limitations and stopping point

- The requested cutoff is not independently verifiable from mutable Gist and `main`-branch sources. This report records inspected content rather than a pinned historical revision.
- No end-to-end effectiveness trial, independent replication, compatibility matrix, artifact signature, dependency audit, or tracker-specific integration test was inspected.
- Fovea availability/version were observed, but it was not executed. Its documented cache/scope behavior is source documentation, not a local behavioral test.
- Named-skill installation/invocation, tracker configuration, credentials, mutation permissions, branch/worktree capability, and security posture are unestablished.
- Research stopped after the named primary sources, cited Pi documentation, local skill/package material, and Fovea source/benchmark specification. Further conclusions require task- and tracker-specific evaluation outside this research-only scope.

## Retained-source appendix

| Source | Type/evidence retained | Important limitation |
|---|---|---|
| [Software Factory Playbook](https://gist.github.com/Maciejdziuba/88890d7e0eeefa5a8738bbe9fd5e20b8) | Mutable Gist inspected live. Gates, state, approval/backtracking, slice/test rules, stated Dex Horthy provenance. | Prescription only, no study or pinned revision. |
| [Wayfinder SKILL.md](https://github.com/mattpocock/skills/blob/main/skills/engineering/wayfinder/SKILL.md) | Mutable `main` file inspected live. Map/ticket/fog/frontier, tracker operations, HITL/AFK, one-ticket rule. | Not tracker compatibility/security or efficacy evidence. |
| [Pi Skills](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md), [Packages](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md), [Extensions](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md) | Local authoritative documentation inspected for packaging, trust, and permissions. | Does not certify third-party skills/packages. |
| [pi-fovea README](https://github.com/monotykamary/pi-fovea/blob/main/README.md), [manifest](https://github.com/monotykamary/pi-fovea/blob/main/package.json), [benchmark source](https://github.com/monotykamary/pi-fovea/blob/main/scripts/bench.ts) | Live source plus local metadata inspected for capabilities, version, state, and narrow numeric claims. | Author/vendor documentation; no retained benchmark output or independent architecture ground truth. |
| [Codebase Design](https://github.com/mattpocock/skills/blob/main/skills/engineering/codebase-design/SKILL.md) and [Design It Twice](https://github.com/mattpocock/skills/blob/main/skills/engineering/codebase-design/DESIGN-IT-TWICE.md) | Configured directly compatible skill material inspected for design vocabulary/process. | Heuristic instruction, not measured efficacy. |
| [Domain Modeling](https://github.com/mattpocock/skills/blob/main/skills/engineering/domain-modeling/SKILL.md) and [ADR format](https://github.com/mattpocock/skills/blob/main/skills/engineering/domain-modeling/ADR-FORMAT.md) | Configured directly compatible material inspected for glossary/ADR discipline. | Records choices, does not validate them. |
