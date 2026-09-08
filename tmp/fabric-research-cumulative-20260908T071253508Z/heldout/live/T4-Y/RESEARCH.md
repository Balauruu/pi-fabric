# Pi architectural analysis and decision-making: decision-grade comparison

**Scope and date.** This is a research-only assessment as of **2026-09-07**. It distinguishes source specifications from this profile's observed state and from effectiveness claims. It ends here because neither primary workflow publishes an outcome study, and no installations, executions, configuration changes, tracker mutations, or browser automation were authorized.

## Executive decision

**Adopt a layered workflow, not either workflow as the architecture method.**

1. Use **Wayfinder** only when the destination or material decisions cannot be resolved in one session, or when multiple actors need a shared dependency-aware decision frontier.
2. Use the **Software Factory Playbook** for a review-sensitive, multi-file feature after the route is clear, with its four explicit human approval gates and vertical implementation slices.
3. Before approving Factory Gate 2, add repository evidence (`pi-fovea` as a navigation aid plus `codebase-scouting`) and architectural judgment (`codebase-design`, with `domain-modeling` where terminology or ownership is disputed). Record only durable, high-cost decisions as ADRs.
4. Do **not** add a third-party repo-explorer, generic architecture-review, or persistent-index package by default. Their published material is not evidence that they improve architectural decisions, and extensions/packages expand the full-system trust boundary.

This division avoids a category error: a graph is evidence-navigation, a ticket graph is work-state, a gate process is delivery control, and an ADR is a durable record. None establishes that an architectural choice is sound.

## What the two supplied workflows prescribe

### Software Factory Playbook: delivery governance after a feature route is chosen

The [Software Factory Playbook](https://gist.githubusercontent.com/Maciejdziuba/88890d7e0eeefa5a8738bbe9fd5e20b8/raw/SKILL.md) requires four ordered gates, a document written to disk for each gate, and explicit user approval before proceeding. It prohibits implementation code before the Gate 4 slice plan is approved.

| Gate | Required judgment/artifact | Architectural value and limit |
|---|---|---|
| 1. Product | User problem, one numerical success measure, announcement, and throwaway plain-HTML mockups where applicable. Technical terms are prohibited. | Establishes product intent, not technical feasibility. |
| 2. Architecture | Read relevant code first, then document existing-system fit, endpoints, data/query outlines, main call flow, and external systems or environment-variable names. | Creates an implementation-facing architecture summary. It does not prescribe option evaluation, evidence quality, security analysis, migration/rollback, resilience, or operational acceptance criteria. |
| 3. Program design | Files and reasons, types/signatures without bodies, call stacks, planned test assertions, and least-confident decisions. | Forces implementation choices into review before code, but the uncertainty list has no evidence-acquisition or adjudication method. |
| 4. Vertical slices | Approved slice plan, then tracer bullet, happy path, and one independently testable later capability at a time. | Controls delivery and reviewability. A tracer bullet demonstrates wiring, not performance, security, migration safety, resilience, or production readiness. |

**State and authority.** It persists `00-status.md`, gate documents, mockups, and slice state under `docs/plans/<feature-slug>/`; a new session must read that folder and resume at the first unapproved gate or unchecked slice. A discovery that invalidates an approved earlier gate requires setting it back to in-progress and obtaining approval again. The human, not the agent, grants approval.

**Operational boundary.** The specification calls for writes to repository documentation and per-slice run/curl/browser verification. Those are prescribed actions, not demonstrated capabilities of the skill. It is appropriate for a real feature that changes several files or produces a review-hostile diff of roughly **100+ lines**; it explicitly excludes trivial edits, explicitly process-free work, throwaway code, and pure prototypes. The 100-line figure is an applicability heuristic, not an effectiveness threshold.

**Failure modes.** Fixed gates add overhead on small or fast-changing work. The required "prove it works" action has no metric, confidence interval, latency/cost budget, or specified acceptance threshold. Gate 2 can be confidently approved on incomplete evidence unless an evidence discipline is inserted.

### Wayfinder: multi-session decision-frontier management before implementation

[Wayfinder](https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/wayfinder/SKILL.md) is planning by default. It turns a loose, multi-session effort into a canonical tracker map and child **decision tickets**. A ticket resolves a decision, not an implementation slice; the map is complete when the route is clear. Execution is allowed only when the effort's Notes explicitly overrides this default.

Its method is to define the destination, map only the currently specifiable decision frontier, preserve dependent unknowns as fog of war, claim one unblocked ticket before working it, resolve it, record the answer on the ticket, close it, and add only a one-line linked gist to the map. It requires each ticket to fit one **100K-token agent session**. This is a sizing rule, not evidence of a model's context need, cost, latency, or decision quality.

| State | Documented meaning | Decision implication |
|---|---|---|
| Map issue | Canonical low-resolution index with Destination, Notes, Decisions so far, Not yet specified, and Out of scope. | Do not duplicate detailed decisions in the map. |
| Decision ticket | One sharp question, labelled research, prototype, grilling, or task. | Keeps a decision's rationale in one canonical record. |
| Frontier | Open, unblocked, unclaimed children. | Identifies available work, not correct architectural choices. |
| Fog of war | In-scope uncertainty that cannot yet be phrased sharply. | Prevents premature decomposition. |
| Claim | Assignment before work. | A coordination convention, vulnerable to stale or ignored assignments. |

**Permission and human boundary.** Wayfinder assumes a tracker-specific operations layer for creating issues, labels, child relationships, dependency edges, assignments, comments, closure, and frontier queries. Without it, the source says to use a local-Markdown tracker, but does not define that implementation. Research tickets are AFK and may use subagents. Prototype and grilling tickets are HITL: a human must speak for themselves, and an agent must not answer its own grilling questions. This is a hard authority boundary, not a convenience rule.

**Failure modes.** The ticket/dependency graph exposes availability and coordination state, not evidence, ownership, risk acceptance, or architecture quality. Vague destinations, ticket proliferation, or premature decomposition can turn uncertainty into administration. Parallel research adds synthesis and provenance burden, yet the source does not specify a conflict-resolution method, ADR format, architectural criteria, or correctness test for a closed decision.

### Complementarity and non-duplication

| Concern | Software Factory | Wayfinder | Recommended owner |
|---|---|---|---|
| Unit of work | Feature moving toward code | Decision under uncertainty | Keep distinct. |
| Primary state | Repository plan/status documents | Tracker map, tickets, dependencies, comments | Cross-link, do not copy. |
| Human control | Approval at each gate and slice boundary | HITL ticket resolution | Retain both when both workflows apply. |
| Architecture analysis | Gate 2 fit/data/flow and Gate 3 interfaces/tests | Question decomposition only | Evidence and explicit design judgment must be added. |
| Follow-through | Tracer bullet and vertical slices | Planning by default | Factory owns implementation delivery. |

Therefore, do not substitute Wayfinder for Factory Gate 2 or Factory documents for a shared decision frontier.

## Pi complements: capability, provenance, compatibility, and boundaries

### Recommended available stack

| Need | Complement | What the inspected source actually establishes | Observed/configured status in this profile | Non-duplication and boundary |
|---|---|---|---|---|
| Repository navigation and impact leads | `pi-fovea` | Its [local skill](/home/balauru/.pi-profiles/fabric/npm/node_modules/pi-fovea/skills/pi-fovea/SKILL.md) specifies `sketch`, `focus`, optional `dwell`, and `impact`, with source windows and likely obligations. Its local [manifest](/home/balauru/.pi-profiles/fabric/npm/node_modules/pi-fovea/package.json) declares version **0.22.1**, a Pi extension, skill resources, Node `>=20`, optional ast-grep, and broad `*` Pi peer dependencies. | **Observed installed and registered:** the active registry exposes `fovea_sketch`, `fovea_focus`, `fovea_dwell`, and `fovea_impact`. | Adds navigation and impact hypotheses before judgment. It is not architectural authority, a security assessment, a complete dependency proof, or final verification. |
| Evidence discipline | `codebase-scouting` | The [local skill](/home/balauru/.pi-profiles/fabric/skills/codebase-scouting/SKILL.md) prescribes bounded questions, decisive-citation rereading, and separation of facts, inference, and unknowns. | **Configured/available** as an active skill. Not executed in this assessment. | Supplies the missing evidence protocol, not a graph or a chosen design. |
| Architectural judgment | `codebase-design` | Its [local skill](/home/balauru/.pi-profiles/fabric/skills/engineering/codebase-design/SKILL.md) evaluates module depth, interface complexity, seams, leverage, locality, and testability; its [dependency guidance](/home/balauru/.pi-profiles/fabric/skills/engineering/codebase-design/DEEPENING.md) distinguishes in-process, local-substitutable, owned-remote, and true-external dependencies. | **Configured/available**. | Adds a concrete seam/interface comparison to Factory Gate 2–3. It cannot establish actual repository behavior without evidence. |
| Terms, ownership, and durable decisions | `domain-modeling` | The [local skill](/home/balauru/.pi-profiles/fabric/skills/engineering/domain-modeling/SKILL.md) challenges ambiguous vocabulary against scenarios and offers an ADR only when the decision is hard to reverse, surprising without context, and a real trade-off. The [format](/home/balauru/.pi-profiles/fabric/skills/engineering/domain-modeling/ADR-FORMAT.md) is a concise 1–3 sentence decision record with optional alternatives/consequences. | **Configured/available**. | Complements Wayfinder's required domain/grilling work and Factory's optional ADR. It neither validates implementation nor chooses an architecture unaided. |
| Human clarification/prototyping | `grilling` and `prototype` | Wayfinder explicitly directs grilling and domain-modeling for grilling tickets, and prototype work for prototype tickets. | **Configured/available** in the active skill registry. | Useful for human preference or behavioral uncertainty. Human reaction must be captured before treating a prototype as decision evidence. |

**Packaging and trust.** Pi's [skills documentation](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/skills.md) says it implements the Agent Skills standard leniently, permits a name different from the containing directory, and can load skills from global, trusted project, package, settings, or CLI locations. That supports SKILL.md portability at the loading/specification level, not equivalent invocation semantics, permissions, source safety, or runtime compatibility.

The [Pi extension documentation](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md) states that extensions run with full system permissions and can execute arbitrary code; project-local extensions load only after project trust. The [Pi package documentation](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md) says packages likewise have full-system access and advises source review. A versioned npm spec or git tag/commit constrains future movement, but does not prove compatibility, safety, maintenance responsiveness, or efficacy.

**Fovea's limited numerical evidence.** Its publisher README reports a route-signature heuristic tested on **eight cloned projects**: corpus junk below posterior approximately **0.27**, real route shapes above approximately **0.75**, with promotion at posterior >= **0.55**, at least **4** sites and **2** files. It also documents sketch output at roughly **256–1,024 tokens** and a **256–16,000-token** per-operation range. These are method/configuration figures and an internal category-separation observation. They are not a matched comparison against Factory, Wayfinder, or unassisted investigation; they report no architectural-decision accuracy, task completion, precision/recall across graph edges, cost, latency, uncertainty, or user outcome. Similar token budgets would not establish equal compute, cost, latency, or selection opportunity.

### Directly compatible third-party candidates: do not add by default

- [FirstPick Repo Explorer](https://github.com/Firstp1ck/pi-coding-agent-forge/tree/main/pi-skill-repo-explorer) overlaps materially with Fovea's mapping and scouting's evidence role. Its stated benchmark is deterministic fixture replay with modeled Bash events and required-fact coverage, explicitly not live stochastic LLM telemetry. No recovered published result establishes a real-world improvement in repository understanding or architectural decisions. It would add an executable-extension/Python-helper surface.
- [FirstPick Architecture Review](https://github.com/Firstp1ck/pi-coding-agent-forge/tree/main/pi-skill-architecture-review) is a generic boundary/coupling/layering checklist. Its published material does not exceed the selected evidence-plus-`codebase-design` judgment layer with a source-evidence protocol or comparative effectiveness evidence.
- [pi-codeontime-code-intelligence](https://pi.dev/packages/pi-codeontime-code-intelligence) is a catalog/configuration claim for persistent local indexing, review, and optional remote embedding. It adds SQLite/index/configuration state. Treat the catalog listing as discovery only, not a primary-source security, compatibility, popularity, or efficacy audit. Pilot it only if it beats the selected stack under the local evaluation below and its storage, remote-embedding, secret-handling, and trust behavior pass source review.

No package-download counts, stars, forks, catalog position, or discovery visibility is used as effectiveness evidence. Maintenance evidence is limited to published revision activity reported for the Playbook through 2026-08-04 and Wayfinder file changes through 2026-08-19; it supports ongoing editing, not correctness or benefit. The live mutable `main`/raw documents are not immutable cutoff snapshots. Pin an inspected commit before any adoption decision.

## Practical operating workflow

### 1. Evidence acquisition

1. State the decision, owner, constraints, approval authority, required observations, and whether the destination is already clear.
2. For a large unfamiliar repository, use Fovea `sketch`, then `focus` and `impact` only to locate candidate paths, dependents, and read windows. Skip its graph for a repository with only a few dozen files, as its own skill directs.
3. Use `codebase-scouting` to read the decisive source ranges. Record observed runtime path, interfaces, data ownership, tests, conventions, external dependencies, permissions, unknowns, and competing options. Label each item as observed fact, sourced assertion, inference, or unresolved.
4. Do not close a research ticket or approve Factory Gate 2 based solely on graph output, a package catalog, or an agent summary.

### 2. Architectural judgment

- **Clear, single-session route:** skip Wayfinder and start the applicable Factory gates.
- **Unclear/multi-session route:** create the Wayfinder map and only currently sharp decision tickets. Keep unformulated dependencies as fog. Claim before work and use HITL tickets where values or preferences are the evidence.
- Compare options through `codebase-design`: caller knowledge, interface depth, seam placement, leverage/locality, dependency category, observable seam tests, failure containment, reversibility, migration/rollback, security, operability, and cost. Use `domain-modeling` scenarios to resolve disputed terms and ownership.
- Record which evidence is decisive, rejected alternatives, assumptions, and an explicit invalidation trigger. A contradiction or changed assumption reopens the decision and, if relevant, Factory's prior gate.

### 3. Decision recording

- When Wayfinder applies, the detailed resolution lives in its ticket and the map retains only a one-line linked index entry.
- Put feature-specific approved fit, flow, interfaces, file plan, and test plan in Factory Gate 2/3 documents.
- Create a compact ADR only when all three `domain-modeling` conditions hold. Cross-link the ticket and plan rather than duplicating prose.
- Keep `CONTEXT.md` as domain vocabulary only, not an implementation plan.

### 4. Implementation follow-through

After Gate 4 approval, Factory slices are: tracer bullet with stated non-goals, one happy path, then one capability/error path/edge case/operational concern per slice. Define a falsifiable acceptance check before implementing every slice. Run the relevant repository test/CI command at the accepted seam, record the result in status, and ask for re-steering. Use Fovea impact output as a review/test lead, then verify it against the actual repository. Reopen the ADR and affected gate if verification changes a premise rather than silently altering intent to get green.

## Conditional adoption and local evaluation

**Adopt Factory** for normal, review-sensitive multi-file work when a human can approve gates and repository documentation writes are acceptable. **Add Wayfinder** only when the destination is unclear, material decisions have unknown dependencies, the work exceeds one session, several agents/people need a visible frontier, or research/access/prototypes block a decision. **Do not use Wayfinder** for a small route already clear in one session.

Run two paired local comparisons, pre-registering thresholds and analysis before starting. Do not pool incompatible tasks or label unequal resource conditions as matched.

| Evaluation | Population and pairing | Arms and resources held equal | Measures | Choice-changing rule |
|---|---|---|---|---|
| Workflow governance | 4–6 comparable real feature proposals exceeding Factory's multi-file/~100-line heuristic. Stratify into clear-destination/uncertain-implementation and unclear/cross-team cases. | Same frozen repository snapshot, proposal, model, tool and permission set, human reviewers, time limit, and scoring rubric. Compare current practice vs Factory alone for clear cases, and Factory alone vs Wayfinder→Factory for unclear cases. | Clear cases: post-Gate-2/3 reversals, reviewer-requested architecture changes, time to first working end-to-end slice, escaped acceptance failures, reviewer effort. Unclear cases: time to human-approved decision, reopened decisions, duplicate investigation, unresolved handoff blockers. | Retain Factory only if late reversals or review burden fall without unacceptable planning delay. Retain Wayfinder only if unresolved high-impact decisions or duplicated investigation fall without materially increasing elapsed decision time. |
| Evidence adjunct | Small repository, large unfamiliar single-language repository, cross-language/contract-heavy repository, and architecture-change tasks with human-created decisive-evidence sets. | Same task, snapshot, model, runtime budget, reviewers, and rubric: selected stack (`pi-fovea` + scouting + design) versus the same stack plus exactly one candidate package. | Evidence precision/recall, time and tokens to citation-complete packet, unsupported claims, missed affected tests/files, blinded rationale/ADR completeness, implementation pass rate, post-change regression rate. | Keep Fovea only if it improves completeness or time on repositories beyond context without raising unsupported claims. Add persistent indexing only if it beats the selected stack on the same tasks and passes source review of storage, remote embedding, secrets, and trust behavior. |

The pairs are comparable only along the resources actually held equal above. If one arm consumes different tokens, wall time, tool calls, researcher attention, or human decision latency, report that axis beside the outcome rather than claiming equal budget. Neither evaluation is evidence that a workflow is universally effective; it is a local adoption decision under specified conditions.

## Material limitations

1. Neither supplied workflow provides a study, benchmark, baseline, sample, effect size, cost, latency, uncertainty, null result, or outcome metric. They are workflow specifications, not measured efficacy.
2. Fovea's eight-project route-shape observation is not architectural-decision evidence and is publisher-provided, not independently reproduced here.
3. This profile's Fovea installation and registered tools were observed. Other local skills were observed as available specifications, not executed. No runtime compatibility, permission behavior, tracker integration, security review, or target-repository effectiveness probe was performed.
4. Third-party package pages/manifests establish published packaging intent at most. They do not establish safe execution, current Pi compatibility, adoption, popularity, or effectiveness.
5. Published raw/main URLs are mutable and the cutoff predates the retrieval environment's live metadata. Use a commit-pinned copy and source review before installing anything.

## Retained-source appendix

| Source | Type/date | Evidence retained | Important limitation |
|---|---|---|---|
| [Software Factory Playbook canonical raw SKILL.md](https://gist.githubusercontent.com/Maciejdziuba/88890d7e0eeefa5a8738bbe9fd5e20b8/raw/SKILL.md) and [gist](https://gist.github.com/Maciejdziuba/88890d7e0eeefa5a8738bbe9fd5e20b8) | Primary workflow specification. Revision history reported through 2026-08-04. | Four gates, disk state, human approvals, backtracking, vertical-slice rules, stated applicability. | No efficacy study or Pi-specific claim. Raw URL is mutable. |
| [Wayfinder canonical raw SKILL.md](https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/wayfinder/SKILL.md), [source page](https://github.com/mattpocock/skills/blob/main/skills/engineering/wayfinder/SKILL.md), and [file history](https://api.github.com/repos/mattpocock/skills/commits?path=skills/engineering/wayfinder/SKILL.md&per_page=30) | Primary workflow specification. File changes reported through 2026-08-19. | Planning default, map/ticket/frontier/fog state, HITL/AFK types, tracker assumptions. | No ADR/architecture-evaluation method or effectiveness evidence. `main` is mutable. |
| [Pi skills documentation](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/skills.md) | Primary product documentation, inspected locally and online. | Discovery locations, Agent Skills compatibility boundary, project trust. | Loading portability is not behavioral/security compatibility. |
| [Pi extensions documentation](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md) | Primary product documentation, inspected locally. | Full-system permission risk and trusted project-local loading. | Documentation does not audit a particular extension. |
| [Pi packages documentation](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md) | Primary product documentation, inspected locally and online. | Package resources, pinning mechanics, full-system access warning. | Pinning does not prove safety or compatibility. |
| [pi-fovea README](https://github.com/monotykamary/pi-fovea#readme), [manifest](https://github.com/monotykamary/pi-fovea/blob/main/package.json), [local skill](/home/balauru/.pi-profiles/fabric/npm/node_modules/pi-fovea/skills/pi-fovea/SKILL.md), and [local manifest](/home/balauru/.pi-profiles/fabric/npm/node_modules/pi-fovea/package.json) | Publisher documentation plus locally observed installed package. | Navigation method, stated coverage/limits, eight-project heuristic observation, declared package metadata, local 0.22.1 and registered tools. | Publisher claims and local registration are not independent effectiveness, security, or universal compatibility evidence. |
| [codebase-scouting local skill](/home/balauru/.pi-profiles/fabric/skills/codebase-scouting/SKILL.md), [codebase-design local skill](/home/balauru/.pi-profiles/fabric/skills/engineering/codebase-design/SKILL.md), [deepening guidance](/home/balauru/.pi-profiles/fabric/skills/engineering/codebase-design/DEEPENING.md), [domain-modeling local skill](/home/balauru/.pi-profiles/fabric/skills/engineering/domain-modeling/SKILL.md), [ADR format](/home/balauru/.pi-profiles/fabric/skills/engineering/domain-modeling/ADR-FORMAT.md) | Local configured skill specifications. | Evidence discipline, design lens, dependency categories, terminology/ADR gate. | Available/configured does not prove execution quality or target-repository fit. |
| [Repo Explorer source](https://github.com/Firstp1ck/pi-coding-agent-forge/tree/main/pi-skill-repo-explorer), [Architecture Review source](https://github.com/Firstp1ck/pi-coding-agent-forge/tree/main/pi-skill-architecture-review), [Code Intelligence catalog page](https://pi.dev/packages/pi-codeontime-code-intelligence) | Third-party published source/catalog discovery. | Candidate scope and reason for non-default stance. | Not installed, executed, security-reviewed, or shown effective; catalog is not an audit. |
