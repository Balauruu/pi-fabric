# PR10 grounding, lessons and trajectories evidence

Status: delayed review `fe53d9dcd3b04148b584cae3530c57f1` repairs narrowly verified. Earlier blanket acceptance/reviews below are historical and reopened, not current full acceptance. PR12 remains blocked by R2 strict journal admission and R3 lost held-spawn handle. No staging, commit or publication in this task.

## Delayed review repair checkpoint

Exact root/branch/HEAD verified: `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor`, `arbor/refactor-pr0-pr1`, `823f5490e86179391505710ff66e7bd580e8aa92`. Main alone edited. The original tracked diff and untracked hashes were saved before changes at `/tmp/arbor-pr10-before.patch`, `/tmp/arbor-pr10-before.status` and `/tmp/arbor-pr10-before-untracked.sha256`.

### Acceptance ledger

| Check | Current repair and source citation | Evidence |
| --- | --- | --- |
| F1 | `src/research/policy.ts:55-64` builds a development-only actor projection and recursively filters nested `insightIds`. Owner projection/export remains complete. | Red lesson **ID** `HELD_GRADE_SENTINEL`, not only body text. Green node/frontier, nested selection/fallback, allowed development-ID and retained owner-export assertions at `tests/material/pr5-journey.test.ts:128-145`. |
| F2 | `src/research/ResearchStore.ts:301-317,375-377,441-443,497-512` checks every exact ancestor/evidence-leaf reference before distill writes. Lesson provenance persists immutable run/source/revision/digest refs alongside IDs. Recall and new hypothesis lessonRef admission check the exact source artifact path/digest again. | Drift, deletion and symlink substitution block distill without changing the projection, omit stale cross-run recall and reject previously recalled refs. Evidence-bearing descendant is included, unrelated sibling excluded. Fresh-v2 only, no reader migration. |
| F3 | `src/research/Grounding.ts:23-34` reconstructs saved assignment for replay only. `src/managed/OwnerExecution.ts:471-505,527-533,552-554,578` verifies saved owner/component/generation lineage, batch/epoch/spec/material/OID/cwd, task, frozen role bundle/request/model and native completion digest. `src/managed/BindingStore.ts:56-66` retains immutable attribution. | Real completed native binding survives a SQLite final-ingestion failure, actual component reload and ordinary public control/execute resume. Both source/clean-installed replay the exact original completion with **zero additional search, fetch or literature spawn**. Ten corrupted/missing/unresolved binding cases per host stay blocked with unchanged effect counts, then restoring the exact saved binding allows replay. No lost-handle adoption or Fabric recovery workaround. |
| F4 | `src/research/GroundingContracts.ts:12-14` expresses nonwhitespace passage/claim/limitations in native JSON schema. `src/research/ResearchStore.ts:369` guards meaningful text before literal passage matching. | Correction to delayed finding: current owner `src/research/contracts.ts:31` already rejected whitespace with trim, including at HEAD. Owner rejection passed before edits. Native schema assertions reproduced red and now pass. Neither literal containment nor meaningful text proves causal/scientific quality. |
| F5 | `src/research/SourceCatalog.ts:5,19-32` uses detached recursively immutable entries/view and freezes the instance. Returned capability bindings cannot mutate the expected snapshot or catalog ID. Existing `bindRequest` remains intact. | Original/exposed nested entries, bindings, view data/resource arrays and returned capabilities cannot widen. Both search/fetch reply-alias poison tests preserve captured values/digests, while request mutations still reject before dispatch. |

### Executed gates

All logs and exit files below are under `.runtime/pr10-delayed/`.

| Gate | Observed result |
| --- | --- |
| G1 `red-all.log/.exit` | **1/13**, exit1. Twelve intended regression failures before product edits across the five findings. Whitespace failures are native schema assertions, not a claimed owner bypass. |
| G2 `native-red-boundary.log/.exit` | **0/2**, exit1. Source `command-RxInQR` and installed `command-1AKqGn` saved actual completed literature before ingestion fault, then remained `blocked` after reload/resume instead of `complete`. Earlier native attempts failed in fixture setup and are not reproduction proof. |
| G3 `targeted-pr10-final.log/.exit` | **29/29**, exit0. Final `npm run test:pr10`, including request/reply alias probes and preserved prior PR10 assertions. |
| G4 `native-green-first.log/.exit` | **4/4**, exit0. Full `npm run test:pr10:e2e`: source/clean-installed negative lesson reuse, actual proposal export, grounding and crash replay. |
| G5 `native-negative-final.log/.exit` | **2/2**, exit0. Strengthens the same two grounding cases with ten negative binding permutations per host, not two additional distinct gates. Latest crash roots: `.runtime/pr6-host/command-0Svp20` and `command-yydEWe`. Native/request/source identities and zero-extra-effect counts are in `native-crash.jsonl`. |
| G6 `native-pr9.log/.exit` | **13/13**, exit0. Impacted full actual held-out/final source/installed native gate, including exact completion replay and unknown-handle refusal. |
| G7 `targeted-complete.log/.exit` | Source/test typechecks pass, PR10 **27/27** before the two extra alias tests, evaluator **45/45**, material **93/93**. Final typechecks also pass in G8. |
| G8 `normal-final.log/.exit` | `npm run check` exits1. Package **5/5**, retained source **92/92**, managed **20/20**, research **115/116**. Only the unchanged strict PR12 journal switch fails. The chain stops there. The separately passing evaluator/material groups are not a falsely green normal run. |
| G9 `pr12-held-spawn.log/.exit` | **0/2**, exit1. Unchanged source/installed held-spawn reload assertions still observe active1 instead of0. R3 remains blocked, independently of PR10 completed-handle replay. |
| G10 public inventory/preservation | Generated manifest equals current source: **21 actions**, **10 native requirements**, one public skill, exact lesson sourceRefs and registered delayed source gate. Whitespace checks pass and staging is empty. |

Initial typecheck errors (missing canonical import, then unknown test projection fields) were repaired before final typechecks. No broad PR6/7/8/11 native rerun or milestone audit acceptance is inferred from these scoped gates.

### Independent review and preservation

Read-only reviewer `13623649ebcc41fab11180056caae771` found no blocking correctness issue and requested stronger nested-ID and negative replay coverage. Main added both. Final read-only reviewer `c8a48bfed549463186a6b61c393455ae` confirmed both gaps closed with no blocking findings or identified false-positive assertions. Reviewers did not edit or run tests. Main executed every reported gate.

`preservation.json` reconstructs the original mixed tracked files from the saved patch: **23 prior modified files are byte-identical**, seven intentionally shared PR10/PR12 paths changed, and **no original user-added tracked line is missing**. All **12 original untracked file hashes** still match. Fingerprint remains `67b8a1698745a922913187344be038b699ec2a62e6d49ebe0b7c3b1d05e504b7`. Existing CLI/web sources, PR12 blocker probes/checkpoint, package lock and retained artifacts were not edited. Source/index/refs preservation assertions remain active in native hosts.

Changed paths in this task, all under `pi-fabric-arbor/`: `src/research/{policy,ResearchStore,Experience,Grounding,GroundingContracts,SourceCatalog,contracts}.ts`, `src/managed/{OwnerExecution,BindingStore}.ts`, `tests/research/pr10-delayed.test.ts`, `tests/material/pr5-journey.test.ts`, `tests/integration/pr10-grounding-host.test.ts`, `package.json`, `docs/pr3-action-manifest.json`, this evidence file and `acceptance-ledger.md`. All changes remain unstaged. No generic Fabric API/private import, installed-runtime edit, original-checkout operation, paid research, dataset, benchmark skill, artifact cleanup, commit or publication was introduced.

## Verified baseline and phase log

Phase 1: exact root `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor`, branch `arbor/refactor-pr0-pr1`, clean HEAD `2cfc98c559bd357d8b75e8b44008f333ea0f5859` verified before edits. Root/app guidance and the entire authoritative `../docs/Arbor/deep-refactoring-plan.md` read in bounded ranges. Latest PR9 evidence records normal292, targeted17, native13 and full native PR6/7 21/5; these are retained prior gates, not PR10 reruns. Explicit Fovea discovery returned `Unknown Fabric action: extensions.fovea_focus`; source tracing is authoritative. Main is the exclusive app/plan editor.

## Acceptance checks

- A15 grounding: finite definition-time optional search/fetch catalog; missing tools block only required grounding. Actual native literature child uses fixed packaged instructions, explicit model/tools/result schema, bounded inspected evidence and no Arbor mutations or replacement research runtime.
- Inspections retain source URL/title, visited passage/access artifact, supported claim and immutable source/run/native/request provenance. Discovery snippets are never inspection evidence. Owner rejects forged/stale source bindings; grounded ideas remain hypotheses, not grades. No direction-specific search gate.
- A15 lessons: bounded within-run and fresh-v2 cross-run project retrieval; leaf/direction/project distillation with exact source/run/evidence/material provenance, limitations, applicability, negative/contrary outcomes and explainable deduplication. Recall is a hypothesis to retest, never score authority. No transcript mirror or memory authority.
- A15 trajectories: actual proposal/context reference, selected action, outcome, insight and exact material IDs. Owning Pi generates; existing CLI/browser retrieve without writes. No held-out ideation leakage or training pipeline claim.
- A25 roles: native completion, intended effective tools/bootstrap, source-linked result, frozen resume and same-path collision separation. One public skill; internal literature adaptation and all upstream dispositions; no novelty or fallback runtime implementation.
- Regression: unchanged retained/fingerprint tests, PR6 five-stage journeys, PR7 A12 controlled-wave gate, PR8 recovery and PR9 held-out behavior. Add red tests, run targeted/normal/native and impacted prior gates, mechanically audit refs, schemas, package and read-only paths.
- Publication: mandatory independent review and repairs, explicit reviewed-path staging only, full cached diff review, both whitespace checks, normal commit/push, exact HEAD/tracking/remote equality, draft PR #3 evidence comment. No publication unless sound.

## Phase 2: experience subset checkpoint (not PR10 acceptance)

Implemented `src/research/Experience.ts`, bounded read-only `arbor.lessons` and `/arbor lessons RUN QUERY`, provenance-bearing distillation and optional exact lesson references on new hypotheses, project-local v2 retrieval, native proposal/context-reference/action/outcome persistence in existing operation rows, and owning-Pi export inclusion. No new SQLite table, participant registry, transcript mirror or runtime dependency. Exact action inventory is now20 (17 research plus three substrate diagnostics); manifest regenerated and exact inventory tests updated, not weakened.

Executed evidence under `.runtime/pr10-gates/`:

- `experience-red.log`: three expected missing-method failures before implementation; `experience-green.log`:3/3 PASS, source typecheck PASS.
- `research-first.log`:48/49, exact inventory addition required updating the expected count; `research-green.log`:49/49 PASS. `managed-green.log`:20/20 PASS. `material-first.log`:84/84 PASS. `normal-first.log` stopped at the managed explicit inventory expectation after package5 and retained92 passed; this is NOT a complete normal gate.
- `native-experience-first.log`: unchanged PR6 source code and clean-installed instruction five-stage journeys2/2 PASS.
- `native-experience.log`: PR10 source/clean-installed native experience2/2 PASS. Real coordinator proposals, production owner/workspace/evaluator, four first-run lessons, second-run hypotheses carrying prior lesson references without grade adoption, exact proposal/context digests in owner exports, nonmutating public lesson/inspection and CLI existing-artifact reads. Exact roots recorded in `native-experience.jsonl`; native trace/stdout/stderr/exit artifacts retained at those roots.

Independent read-only native reviewer `3116cfc10aa44dad90802491beaa4acf` (`openai-codex/gpt-5.6-sol`) completed the explicitly bounded experience review. Four concrete findings: mixed-split decisions laundering held-out-derived lesson outcomes; duplicate trajectory finish after a later revision breaking replay; accumulated source provenance exceeding its public128 bound; decision/distill trajectories omitting evaluation/attempt links. `review-red.log`:2/6 with all four findings reproduced. Main repaired every finding: development-only decision derivation, frozen-outcome replay, transactional schema admission and exact evaluation/attempt/material outcome links. `review-green.log`:6/6 PASS; `review-typecheck.log`:test typecheck PASS. Native exact-lineage assertions were strengthened after those repairs and await rerun. Review is not whole PR10 acceptance and no publication is authorized by these partial counts.

Next: complete bounded definition-time optional search/fetch integration, authoritative visited-source records and checked grounded hypotheses, actual native literature bootstrap/tools/completion with saved role bundle/resume/collision proofs, source/installed deterministic grounding tests, stronger held-out/read noninterference/export checks, final whole independent review/repair and normal/native/regression/public/package audit. Complete README/AGENTS/ledger/plan updates only to executed scopes. No PR11 work, staging, commit, push or PR comment has occurred.

## Phase 3: completed grounding path, final review/gates in progress

Continued at the exact same root/branch/HEAD with all prior app/plan changes preserved. No dependency, physical lockfile, installed package, original-checkout or blacklisted-profile edits. Prior unfinished `GroundingContracts.ts`, `SourceCatalog.ts`, role/native-owner edits were traced and integrated rather than replaced.

Implemented definition-time `arbor.sources.json` loading, finite optional captured-context refs, frozen selected committed bindings in the resolved spec, one reserved bounded search/fetch batch in `Grounding.ts`, owner-captured actual fetched artifacts, native literature inspection and transactional verified passage facts. Exact source refs reject cross-run/revision/digest, unvisited IDs and changed artifacts; required hypotheses cannot omit inspected refs. Coordinator context, lessons and exported trajectories retain inspected source IDs separately from development grades. Native literature uses exact model/`read`/closed result, frozen role plus evidence procedure and immutable native/request provenance. Complete batches survive real owner reload/resume without redispatch; unresolved reservations never retry automatically. Retirement now has an explicit synchronous service callback guard across descriptor/provider awaits.

New retained tests: `tests/research/pr10-grounding.test.ts`, `tests/integration/pr10-grounding-host.test.ts`, and output-only `tests/fixtures/pr10-sources.ts`. The existing native HTTP model fixture adds only literature read/result outputs, not a fixture owner/driver. Real public `tools.catalog` supplies descriptor hashes in a separate native discovery host. Source and clean-installed hosts run the actual product extension/managed owner/coordinator/evaluators. No installed package edits occur. `src/research/schema.ts` breaks a source-loader initialization cycle while re-exporting the same schema vocabulary from `contracts.ts`.

Executed logs under `.runtime/pr10-gates/`:

- `grounding-red.log`:0/1, expected missing `reserveGrounding`; `unfinished-typecheck.log`: expected unfinished `literatureId` role-revision typing failure. Both fixed.
- `grounding-green.log`:1/1 visited-source admission regression PASS. `grounding-typecheck.log` and `grounding-test-typecheck.log`: source/test typing PASS after repairs.
- `native-grounding-first.log`: native source-loader cycle failed before any research, fixed by dependency-free schema vocabulary. `native-grounding-second.log`: source native1/1 PASS.
- `normal-grounding.log`: complete normal `npm run check` PASS303 (package5, retained92, managed20, research53, evaluator45, material88). Later targeted additions require final rerun.
- `native-pr10-full-first.log`: experience source/installed2/2 PASS with strengthened exact outcome assertions; grounding2/2 failed only at test result extraction after product completion because combined projections exceeded Fabric's bounded output. Corrected test to return only consumed facts, not raise budgets or weaken product assertions.
- `native-grounding-final.log`: source/clean-installed2/2 PASS. Actual selected source tools, owner artifact capture, native child `read` completion, closed result, source-linked proposals/lessons/trajectories, required missing capability before baseline, optional/local continuation, minimization, frozen owner reload/resume and no duplicate dispatch. Exact host roots/source/native/export IDs are in `native-grounding.jsonl`.
- `targeted-final.log`:13/13 PASS before adding explicit required-link/retirement regressions; `late-typecheck.log`: test typing PASS after those additions.
- `native-pr6.log` + `.exit`: unchanged full native21/21 PASS, exit0. `native-pr9.log` + `.exit`: full held-out/final native13/13 PASS, exit0. PR8 native and isolated PR7 A12 remain pending here.

Full independent native read-only reviewer `fe53d9dcd3b04148b584cae3530c57f1` (`openai-codex/gpt-5.6-sol`) is reviewing the entire PR10 diff, not just experience. Final findings/repairs and final normal/native/public/package review must be appended before acceptance/publication. No staging, commit, push or PR comment yet. PR #3 remains draft; PR11-PR13 are not started.

## Phase 4: independent repair and final scoped gate

Full read-only reviewer `fe53d9dcd3b04148b584cae3530c57f1` returned one code finding and stale-documentation findings, but its process **failed** on an oversized event. Its findings were useful, not successful review completion. Direction-level lessons could cite descendant evidence while dropping that descendant's inspected-source IDs. Main reproduced `[]` instead of the exact source ID in `direction-review-red.log`, then retained the target ancestry plus each exact evidence-bearing descendant ancestry, excluding unrelated siblings. Transactional provenance bounds and held-out filtering remain intact. `direction-review-green.log`:15/15 PASS, including mandatory source linkage and retirement-during-descriptor/no-retry regressions.

New independent native reviewer `04d5d60dbae443ddb4da68cb14fc8e57` (`openai-codex/gpt-5.6-terra`) **completed successfully**, read-only, with **no blocking findings** across the full grounding/experience/service/store/contracts/registration/roles/native-owner/test scope. It explicitly verified the descendant-source repair and sibling exclusion, source identity/passage guards, optional isolation, frozen capability/native provenance, and held-out/recall separation. It did not execute tests or claim containment/scientific correctness. Main remains exclusive editor.

Final executed gates, all logs under `.runtime/pr10-gates/`:

| Gate | Observed result |
|---|---|
| `npm run check`, `normal-final.log` |307 PASS: package5, retained92, managed20, research57, evaluator45, material88; source and test typechecks pass |
| `npm run test:pr10`, `direction-review-green.log` |15/15 PASS |
| `npm run test:pr10:e2e`, `native-pr10-final.log` + `.exit` |4/4 PASS, exit0: source/clean-installed experience and grounding |
| Explicit discarded-lesson second-run reuse, `native-negative-experience-final.log` + `.exit` |2/2 PASS, exit0; strengthens the same two experience cases, not two extra distinct cases |
| Unchanged full PR6 native, `native-pr6.log` + `.exit` |21/21 PASS, exit0 |
| Isolated unchanged PR7 native, `native-pr7.log` + `.exit` |5/5 PASS, exit0; no competing test lanes during A12 |
| Full PR8 native, `native-pr8.log` + `.exit` |42/42 PASS, exit0 |
| Full PR9 native, `native-pr9.log` + `.exit` |13/13 PASS, exit0 |

A12 retains the same two-candidate reservation/collection boundary and one-second workload, three warmed waves per mode, actual positive parallel overlap and unchanged <=80% oracle. Observed serial median3525ms, parallel1970ms, ratio0.5588652482269504. Nodev26.7.0, Linux7.2.2-1-cachyos, i7-13620H/16 logical CPUs, measurement concurrency1. Timing artifacts remain at `.runtime/pr7-gates/a12.json`.

The source/installed negative reuse probe explicitly selects the earlier `discarded` lesson, carries its exact reference into the second-run hypothesis and proves no candidate evaluations/decisions or adopted grade. An initial fixture strengthening incorrectly required a negative before the first run had produced one; scoping that requirement to the second run repaired the fixture without product changes. Native actual proposal count21, first-run lessons4 and second-run recalled turns2 are retained per host in `native-experience.jsonl`.

Current `npm run audit:pr10` checks exact gate counts,20 public refs/10 owner requirements/one public skill, physical app-local dependencies and unchanged declarations/lock/fingerprint tests, full source package reachability, read-only CLI mutation denials, successful native host exits and bounded trace events, and exact A12 evidence. Initial audit ran before the last native exit existed and correctly refused; it is not a passing gate. Historical `audit:pr6`/`pr7` pin old milestone HEADs, `audit:pr8` pins19 actions, and `audit:pr9` pins unchanged roles. They reject authorized PR10 deltas and remain unchanged historical checks, not falsely reported as current passes. The PR10 audit carries forward their applicable invariants at this baseline.

Final native captured-collision rerun, current audit, final documentation/audit delta review, explicit cached-diff review and publication verification are recorded in the final closure below. No PR11 work, paid source/data acquisition, installed/original checkout modification, dependency/lock changes, new runtime/API/broker or additional public skill is part of this gate.

## Final closure and publication boundary

- `native-collision-grounding-final.log` + `.exit`: source/clean-installed2/2 PASS, exit0. The same-path `skills/fabric-arbor/roles/literature.md` is explicitly selected into the **actual owned material capture**, not merely left untracked in the source fixture. Exported capture coverage proves its presence, while actual native instruction/tool/read traces and saved role bindings prove optimizer separation. This strengthens the same two grounding cases, not two additional distinct cases.
- `audit-final.log` / `audit.json`: `npm run audit:pr10` PASS, normal307/targeted15/PR10 native4 with both strengthened2/2 reruns and prior native21/5/42/13;20 public actions,10 fixed native owner requirements, one public skill,34 reachable packaged modules,72 packed files, six latest successful native source/installed/discovery roots and maximum native fixture event47,295 bytes. Full source/test typechecks pass after the final test/audit additions. `git diff --check` passes.
- Independent final **publication-delta** reviewer `0d217717781945a1ba6aef2c3706fc12` (`openai-codex/gpt-5.6-terra`) completed successfully, read-only, with **no blocking findings**. It checked the current audit, explicit discarded-lesson second-run assertion, actual captured collision, final README/AGENTS/consumer/action/ledger/plan/evidence scope, and recorded gate counts. It did not rerun tests or redo the already-successful full product-code review. The preceding first delta spawn rejected its argument before launch; no review success is inferred from that failed call.
- Main owns the final explicit-path staging, complete bounded cached-diff review, whitespace checks and normal commit/push. Exact commit/tracking/remote equality and the PR #3 evidence-comment URL are publication-time observations, not preclaimed here. Runtime/native artifacts, user material/fingerprints, credentials, dependencies and lockfiles are excluded from staging. No force push, amend, extra public skill or PR11-PR13 work is authorized by this gate; PR #3 stays draft.

## Limits

Local deterministic fake providers may supply only actual native model/search/fetch outputs. Production owner, coordinator lifecycle and evaluator remain authoritative. No paid research, datasets, installed changes, new runtime/broker/private Fabric APIs, benchmark-skill copy/dependency, original checkout or blacklisted Pi profile operations are authorized.
