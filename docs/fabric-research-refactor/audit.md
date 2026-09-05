# fabric-research refactor audit

## Decision

Delete the canonical program, not just its constants. Use direct native research when efficient, including multisource work. Use task-shaped Fabric programs or agents when independent work earns its coordination cost. Main owns the answer. No reusable research executable earned preservation: retrieval, agent delivery, per-item failure handling and evidence judgment need no custom runtime interface.

Direction checked against installed Fabric sources:

- `npm/node_modules/pi-fabric/docs/skills.md`: core-first, user-opt-in, one owner per meaning, branch references, sentence-level no-op test. Preserve `disable-model-invocation: true`.
- `npm/node_modules/pi-fabric/skills/fabric-exec/SKILL.md` and `references/agents.md`: first-class proxies, native results, optional schemas, output bounds, native lifecycle and budgets. Capabilities, not a research manifest specification.
- `npm/node_modules/pi-fabric/skills/fabric-workflow/SKILL.md`: code-held task control flow, conditional schemas and partial-work preservation. Its illustrative inventory/batch numbers are not native research limits to copy.
- `npm/node_modules/pi-fabric/skills/fabric-spec/SKILL.md:12–14`: audit outcomes, not orchestration; Main may use children, phases or direct edits. Its supervision ledger is not imported into research.

Native agent availability, concurrency, attempts/tokens, timeouts, transport bounds, schema validation and provider throttling remain authoritative. No native defaults are copied into research policy. User dates, source requirements, outputs and budgets remain task inputs. The last30days engine's native date/window and source-status fields are not skill-owned temporal machinery.

## Baseline and invocation path

`before.tar.gz` preserves the exact uncommitted five-file skill and two source-coupled test/probe files. `pre-existing-changes.patch` preserves the user's pre-task diff. Citations below refer to that snapshot, not Git HEAD. The migration plan remains untouched history.

- Main/direct: read SKILL, get clock, compile requirements/route, retrieve, classify time, build claim ledger, verify, emit exact-order receipt. The live baseline additionally read execution and synthesis references and made a separate ledger/receipt tool call.
- Main/parallel: fully read all references and program, write manifest/full contracts, eval JS; discover tools and reread/extract Markdown headings; wait for initial fan-out, possibly retry one item, account receipts, then apply Main's ledgers/gates.
- Standard worker: browser rule, shared clock, requirements/source classes, retrieval/stagnation caps, custom schema and contract. Produce provenance, enums, arrays and stop reason as well as evidence.
- last30days worker: additionally read manual/JSON reference, scope migration-directory artifacts, plan/run engine, save outputs/supplements, convert to common envelope. Main rereads artifacts and native traces.

## Inventory

Equivalent repeated instructions are grouped. `source-audit.txt` contains the complete line-backed instruction, abstraction, field, artifact and numeric inventories from independent read-only audits. Its proposals are not authority: recommendations to retain a universal results barrier, compulsory native receipts, shared cutoff, or universal containment preflight were rejected.

| Item and old source | Disposition and purpose of what remains |
|---|---|
| Identity, invocation, dependencies (SKILL:1–18) | Simplify description/compatibility; retain user-only discovery, existing tools and optional installed engine. |
| Browser/provider guidance, global disclaimers/history (SKILL:10–18; execution:35,48,58,78) | One browser rule carried to assignments, `workflow: "none"`, no cookie opt-in, configured providers. Delete architecture history/global repetition. Retain profile selection because cwd is not a profile. |
| Clock acquisition, ISO parser, cutoff, temporal enums, retrieval timestamps, timing receipts/gates (program:4–54,199–202,230–244,440–484; all references) | Remove entirely. Relevant user/source dates stay ordinary task evidence. Absent administrative metadata cannot make evidence ineligible. |
| One-source/stable direct-route eligibility and forced escalation (SKILL:35–68) | Replace with task-cost judgment; direct work can compare sources. |
| Route form, requirement/coverage/recovery/claim ledgers, IDs, ownership/status/final-location tracking (SKILL:24–44,80–118; synthesis:7–48) | Remove mandatory forms. Optional checklists/tables only when they prevent omissions. |
| Manifest: routeReason, time fields, requirements {id,text,required,evidenceStandard}, coordinatorRequirementIds, streams {id,label,kind,requirementIds,requiredSourceClasses,maxRetrievalSteps,contract}, webTools, concurrency, allowTargetedRetry, artifactDir (program:6–182) | Remove schema/validation. Task-specific question, scope, known evidence, tools and user budget go directly to native calls when needed. |
| Ranges 2–3 / 4–5 / 6–8; 1–8 streams, ≤4 concurrent, ≤1 current-field, ≤1 retry, 1–50 steps, two stagnant steps, 1–64 requirements, IDs r1–r999 (SKILL:74–120; program:56–153) | Remove all skill policies. Evidence need, expected value, native availability, throttling and user constraints determine work. No replacement batch/retry numbers. |
| Input/diagnostic limits: route/standard 500, requirement text 1000, stream ID 40, label 50, contract 12000, diagnostics 500/200, discovery 200; row pool 10/16 divided across workers, row max 8 (program:12,43–153,161,203–265,268–338) | Remove clipping, quotas and generic preflight. Native transport bounds remain; request relevant compact evidence. |
| Report: conclusion, evidence, artifacts, contradictions, gaps, stopReason; row IDs/claim/finding/url/status/confidence; provenance sourceType/locator/publication/effective/retrieval/method/origin/temporalStatus (program:208–265; contracts:6–97,199–214) | Delete schema. Ask for findings, supporting URLs/passages, contradictions/gaps and relevant method/origin. Optional task schemas only if aggregation benefits. |
| Report limits: conclusion 1200, row IDs 16, claim 400, finding 1600, URL/path 1000, sourceType 120, locator/origin 500, dates 100, method 800, artifacts 24, contradictions/gaps 8×800, five stop reasons (program:208–265) | Remove, including required empty arrays and fixed confidence/status labels. Keep epistemic distinctions in ordinary prose. |
| Truthy provenance eligibility, foreign-ID quarantine, candidate status, error-string taxonomy (program:188–202,304–334) | Remove. Judge claim support from evidence, not metadata shape or diagnostic substrings. Native failure facts inform recovery. |
| Outcomes/attempts/failures/requirementCandidates, completed-*/failed-* variants, usable/planned/terminal/structurally-valid/retry counts and ledgers (program:267–484; synthesis:5–37) | Remove custom interface. Preserve useful results, inspect actual failure, report consequential missing coverage. Worker count does not establish independence. |
| Receipt lineage/service duration/dispatch counts, usage/toolCalls aggregates, helper budget observation, capability table (program:304–316,427–484; execution:64–78; synthesis:182–196) | Remove aggregation and mandatory receipt. Native telemetry remains inspectable when relevant. Audit measurements are not a research feature. |
| Full-file workflow reads, eval, heading parsing, fixed phases, initial all-results barrier (execution:3,39–62; program:170–182,380–404) | Delete program/execution reference. Native task-shaped control flow allows checks as inputs arrive; progress is optional and follows real work. |
| Retry first sole owner only, no retry of usable worker missing another requirement (program:384–403) | Recover the material evidence gap; do not rerun successful siblings or whole work for one failure. |
| Long stream specializations, report/comparability/conflict/confidence templates and completion gates (contracts:99–181; synthesis:50–180,198–223) | Condense to suitable sources, decisive passages, original-origin deduplication, methods/populations/metrics, genuine contradictions and narrow recommendations. No report taxonomy. |
| last30days plan/environment/JSON/browser opt-outs (contracts:183–197) | Keep branch-specific differences; reference existing manual/export. Preserve requested days/as-of/depth or engine defaults. Inspect source_status and native engagement. Exclude browser-dependent sources/probes; use actual output. |
| Migration artifact root, single current-field, clock-derived --as-of, normal 300-second timeout, prescribed files/envelope conversion (contracts:183–197) | Remove. Use task-local Fabric-profile outputs when needed and separate concurrent paths. No mandatory supplements/artifact inventory/wrapper. |
| 13 source-coupled tests plus native typecheck | Archive originals, remove active obsolete files. Current-source checks cover loading/links/example; live probes cover behavior. Fixed historical evidence tests and fixtures remain unchanged, not current acceptance. |

## Remaining architecture

- `skills/fabric-research/SKILL.md`: question coverage, task-shaped work, evidence judgment, recovery and Main synthesis. One native search example, no wrapper.
- `skills/fabric-research/references/last30days.md`: optional integration differences. Existing engine docs own planning/options/JSON.
- `skill-evaluations/fabric-research-refactor/`: current-source checks, fresh scenarios and recorded smoke evidence, outside the runtime read path.

See `validation.md` for observed results, causal overhead evidence and unrun variants. `historical.sha256` checks unchanged historical evidence. Unrelated changes and other sessions' artifacts are outside scope. Dependencies and global provider configuration are not edited.
