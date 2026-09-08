# Arbor current-implementation QA runbook

## 1. Scope and execution status

This is a test specification, not an execution report. **No tests, installation, inference, browser sessions, downloads, or fault injections were executed while writing it. All new result rows begin NOT-RUN.** Repository inspection and document validation are not product QA passes.

Repository inspected: `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor`.

Baseline observed: merge commit `b9a24a5` on `arbor/refactor-pr0-pr1`, merging `origin/main` (`a983108`). The inspected working tree also contains pre-existing edits to Arbor's package manifest, lockfile, consumer installation guide and package-contract test. Preserve these changes. The suite targets **working-tree bytes**, not just the merge commit.

### Findings that affect the oracle

| ID | Finding | QA consequence |
| --- | --- | --- |
| F01 | Current manifest and consumer guide declare Fabric `>=0.83.0`. Development dependency and inspected local dependency metadata are Fabric `0.83.0`, Pi `0.85.1`. Node requirement is `>=24`, runtime tsx is `4.23.13`. | Declared compatibility is not tested compatibility. Record resolved versions separately for source and clean-installed runs. No version is newly validated by this runbook. |
| F02 | The acceptance ledger and cutover evidence report passes at the earlier published PR13 snapshot. The user reports that subsequent integration validation timed out. | Keep historical claims attributed to their snapshot. The later timeout is **not passed**. Its exact lane, exit/signal and artifacts are unavailable in this investigation. Record the reported timeout and request its evidence before diagnosing it. |
| F03 | The retained PR13 audit compares peer/dev/runtime dependencies and lockfile bytes to `b509ae7`. That baseline's Fabric peer is `>=0.83.0 <0.84.0`, unlike the inspected tree. It also requires fixed historical counts and unchanged production/native fixture bytes. | An unchanged audit is expected to reject the peer/lockfile drift if it reaches those assertions. This is a statically identified gate conflict, not an observed test failure. Run and report the real audit separately. Do not revert the peer range, edit assertions, manufacture logs, or call product regressions absent solely from this conflict. |
| F04 | The public skill says explicit selected untracked files are required for non-Git material. `Workspace` instead walks all nonignored files in a non-Git root. The existing non-Git test captures with `selectedUntracked:[]`. | T28-N records the contradiction. Until resolved, treat the whole disposable non-Git root as capturable. Do not test selection with private or valuable files. A passing existing test does not establish the documented selection guarantee. |
| F05 | `/arbor validate` is present in command mappings, final-validation UI selection and tests, but omitted from the main consumer command list and the parser's unknown-command help. Doctor still refers to historical PR12 presentation evidence. Non-Git observation mode has an obsolete “until PR5” diagnostic although material capture exists. | Include final validation and observation-mode refusal in QA. Record misleading/omitted documentation as defects, not absent features. Doctor's prose is not a current test report. |
| F06 | Native pack/browser fixtures exercise actual Pi/Fabric using deterministic local inference. Several installed fixtures explicitly pin Fabric `0.83.0`. The browser comparison helper excludes SHM while dedicated cold-storage tests verify stricter byte/inventory preservation. | Do not generalize source-version results to installed variants or live-browser comparisons to cold WAL/SHM guarantees. Real-model quality, arbitrary dependency replacement and scientific benchmark validity remain outside the proof. |

Exclude retired v1 admission/protocol/driver/authorization/certification/Phase 7, writable Web, emitted runtime/build workflow, CLI attachment, legacy readers and migration bridges. Negative rejection tests do not reintroduce these features. The retained substrate diagnostics and exact-pair PR4 example are **current**, not retired. Do not scan, import, migrate or clean historical user runs.

### Acceptance ledger for this suite

| ID | Deliverable/check |
| --- | --- |
| A01 | Every inventoried current feature maps to executable cases in section 3, including all public actions and commands. |
| A02 | Every case inherits explicit isolation, evidence, pass/fail and cleanup rules, with additional case-specific inputs and oracles. |
| A03 | Offline smoke, complete automated regression, manual gaps and optional dependencies are separated. |
| A04 | Merge, working-tree drift, declared/resolved/tested versions, audit conflict and previous timeout remain visible. |
| A05 | Results distinguish PASSED, FAILED, BLOCKED, SKIPPED and NOT-RUN. No execution result is inferred from this document. |

## 2. Evidence map and oracle rules

The paths below are the inspected source locations. In executable snippets, `APP` is the **absolute disposable copy** of this package. Source references are navigation evidence, not claims that a test passed.

| ID | Authoritative evidence |
| --- | --- |
| S01 | `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/package.json` and `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/src/package.ts`: scripts, source exports, peers, assets and registrations. |
| S02 | `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/docs/consumer-installation.md:5–104` and `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/docs/research-configuration.md`: intended commands, policy, configuration and limits. |
| S03 | `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/src/extension.ts:40–70`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/src/managed/setup.ts`: trusted setup, diagnostics and ordinary Pi submission. |
| S04 | `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/src/research/contracts.ts:45–78`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/src/research/commands.ts`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/docs/pr3-action-manifest.json`: closed schemas, action effects and command composition. |
| S05 | `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/src/research/spec.ts` and `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/src/research/ResearchService.ts:252–291`: precedence, saved identity, capture, observation and evaluator startup. |
| S06 | `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/research/store.test.ts:216–235`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/research/service.test.ts:31–73`: exact manifest parity, identity, refusal, export gaps and frozen defaults. |
| S07 | `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/src/material/Workspace.ts:40–115`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/material/pr5-workspace.test.ts:15–117`: dirty Git, capture bounds, non-Git and unsupported states. |
| S08 | `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/material/pr5-journey.test.ts` and `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/material/pr8-source-apply.test.ts:19–75`: incumbent acceptance, waves, reconciliation, review, apply/undo. |
| S09 | `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/src/evaluators/measurement.ts:5–28`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/evaluators/pr4.test.ts`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/research/pr9-contracts.test.ts`: measurement, frozen bindings and split separation. |
| S10 | `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/research/pr10-grounding.test.ts`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/research/pr10-delayed.test.ts`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/research/pr10-experience.test.ts`: grounding/lesson provenance and delayed results. |
| S11 | `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/examples/README.md`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/src/presets/schemas.ts`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/research/pr11-presets.test.ts:13–89`: all packs, prepared-command adapter, limits and preparation semantics. |
| S12 | `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/src/presentation/PiPresentation.ts:75–149`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/src/presentation/ReadOnlyServer.ts`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/src/cli/read-only.ts`: selectors, routes and strict CLI reads. |
| S13 | `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/research/pr12-storage.test.ts:13–42`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/research/pr12-presentation.test.ts`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/research/pr12-repairs.test.ts`: cold read safety, revision fences and presentation closure. |
| S14 | `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/managed/owner-lifetime.test.ts`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/integration/pr12-lifetime-host.test.ts`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/AGENTS.md`: passive guard, partial activation and bounded lifetime scope. |
| S15 | `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/fixtures/pr6-host.ts`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/package/pr1-source-install-e2e.test.ts`: isolated host/profile, offline installs and exact exit checks. |
| S16 | `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/integration/pr7-parallel-host.test.ts`: four waves, three warmed waves, real overlap and 80% timing oracle. |
| S17 | `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/integration/pr12-presentation-host.test.ts:22–68`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/web/read-only/index.html`: actual browser assertions, artifact parity and visual controls. |
| S18 | `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/acceptance-ledger.md`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/docs/pr13-cutover-evidence.md`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/tests/research/pr13-audit.ts:9–24`: historical publication claims and current audit assumptions. |
| S19 | `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/skills/fabric-arbor/SKILL.md`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/docs/role-maintenance.md`, `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/examples/pr4-agent-improvement/README.md`: user procedures, three internal roles, eleven dispositions, exact-pair oracle. |

Use documentation and public contracts to establish intended behavior, then source and assertions to identify what is implemented and tested. When they disagree, retain both observations and file a discrepancy. A passing simulated engine does not establish owning-Pi permissions, native settlement, installation, or browser behavior. A passing native fixture does not establish real-model research quality. An actor proposal, command submission, queued receipt, native completion, valid measurement, measured keep and source write are different observations.

## 3. Feature-to-test coverage matrix

Each F-row is a feature family. Every named T/M case is specified below. Parameterized variants must get separate result rows. “Mapped” does not mean all combinations or platforms have been tested.

| Feature | Current surface / workflow | Cases | Evidence |
| --- | --- | --- | --- |
| F07 | Source package install, no build, exports `.`, `./extension`, `./assets`, runtime tsx, bin, asset discovery | T01, T14, T24, T26, T29, M01 | S01, S15 |
| F08 | One public skill, three internal frozen roles, conditional references, eleven upstream dispositions | T01, T04, T14, T19, M05 | S01, S19 |
| F09 | Trusted setup, inherited/unrelated config preservation, duplicate/conflicting/disabled entry, passive registration | T01, T02, T15, M01 | S02, S03 |
| F10 | Doctor, availability/assets, missing Fabric/agents/mesh/model/schema capability, permission diagnostics | T02, T15, T16, M01, M04 | S03 |
| F11 | Built-in < preset < profile < project < override, per-field origins, preset:null, bounded closed data | T03, T04, T05, T27, M02 | S04, S05, S11 |
| F12 | Bare intake confirmation, expectedSpecId drift refusal, exact model/tool identities | T03, T13, T25, M02 | S05, S06, S12 |
| F13 | Explicit JSON start, observation `inspect`, configuration-only `deferred`, duplicate start and frozen reopen | T03, T16, M02 | S04, S05 |
| F14 | `evaluate` frozen committed pair, command/agent-suite/provider, separate subject/judge | T05, T17, M06 | S05, S09, S19 |
| F15 | `material` dirty capture and explicit propose/dispatch/collect/evaluate/keep, separate source root | T06, T07, T18, M03 | S07, S08 |
| F16 | Autonomous `research`, persistent proposal-only actor, owner-only dispatch/collect, native refs and no self-grading | T02, T07, T19, T24, M03 | S04, S08, S15 |
| F17 | Code/instruction/skill/workflow/configuration/recipe/data/other material kinds, protected inputs, selected untracked | T04, T06, T24, T27, T28, M03 | S04, S07, S11 |
| F18 | Dirty bytes, index/refs/stash/custom refs/sibling worktree, binary/mode/link/deletion/newline path preservation | T06, T09, T18, T21, M07 | S07, S08 |
| F19 | Empty/oversized/changed capture, ignored/unresolved/sparse/submodule/special/escaping inputs refuse | T06, T28, M03 | S07 |
| F20 | Exact decimal min/max, relative/absolute gain, negative/zero/tie/noise and current-incumbent acceptance | T05, T07, T10, T27, M06 | S08, S09 |
| F21 | Failed exit/check/timeout/output/units/native status cannot score; retries/checks/judges independently charged | T05, T17, T22, M06 | S09 |
| F22 | Optional finite evaluator catalog, descriptor/schema/risk/effect binding, missing provider isolation, no mutable request poisoning | T05, T17, M06 | S09 |
| F23 | Development/held-out/final separation, adaptive reuse cap, explicit `/arbor validate`, final replay and stale selection veto | T07, T10, T22, M06 | S04, S08, S09 |
| F24 | Tree directions/hypotheses, parent/depth/child eligibility, explore/exploit, ranking, prune/continue/stop, convergence | T08, T19, T20, M03 | S04, S08, S16 |
| F25 | Serial/parallel waves, atomic whole-wave reservations, fixed parent, serial measurement, combined-material reevaluation and Git CAS | T07, T08, T20 | S08, S16 |
| F26 | Attempts/evaluator/active-time/artifact admission, post-await recheck, no sibling credit borrowing; observational tokens/costs | T05, T07, T08, T10, T12, T27, M03 | S05, S08, S09 |
| F27 | Pause/steer/cancel while background work is active, explicit resume, bound agent intent plus single-use execute claim | T07, T09, T19, T21, T25, M04 | S04, S08, S17 |
| F28 | Auto/Direction/Review/Collaborative modes, real owning-Pi review, timeout/dismiss/reject/stale dialog, no approval flag | T03, T07, T09, T21, T25, M04 | S02, S06, S08 |
| F29 | Keep/discard latest settled attempt, revision-pinned selection, current incumbent not source apply | T07, T13, T21, M04, M07 | S08, S12 |
| F30 | Continue-partial/restart-parent, explicit same-hypothesis summary, new charged attempt and separate resume | T03, T07, T21, M05 | S04, S08 |
| F31 | Known native completion recovery, unknown/lost/malformed/mesh-shaped handles block without redispatch, terminal monotonicity | T02, T03, T05, T07, T17, T21, T22, M05 | S06, S08, S09, S14 |
| F32 | Saved roles/spec/material/native owner; quiescent append-only revise-roles, missing/colliding role assets | T04, T07, T19, T21, M05 | S08, S19 |
| F33 | Exact source apply/undo, separate write permission/dialog, original command identity, pre/postimages, conflict preservation | T09, T21, M07 | S02, S08 |
| F34 | All-postimage source recovery/adoption, newer incumbent and cancelled-terminal recovery, mixed/preimage/newer mode refusal | T09, T21, M07 | S08 |
| F35 | Optional/required/off grounding, finite definition-time catalogs, bounded native literature and retained visited text | T11, T23, T27, M08 | S10 |
| F36 | Exact source/run/revision/digest/native provenance, snippet/forgery/stale source rejection, interrupted grounding no replay | T11, T12, T23, M08 | S10 |
| F37 | Same-project lessons, negative/contrary/duplicate findings, hypotheses-to-retest, no held-out leakage | T07, T12, T23, M08 | S10 |
| F38 | Proposal/action/outcome trajectories, delayed original revision/incumbent attribution, not transcripts or grades | T07, T12, T23, M08, M09 | S08, S10 |
| F39 | Code/agent/recipe scaffolds, selected agent held-out, new canonical destination, unvalidated preparation only | T04, T24, M03 | S11 |
| F40 | Local upstream-command prepared-input adapter, pinned declared provenance, exact bytes/executable flag, bounded definitions | T04, T24, M03 | S11 |
| F41 | JSON/report/trajectory exports, baseline-relative delta, cumulative artifact budget, conflicting/identical retries and receipt gaps | T03, T07, T12, T13, T25, M09 | S06, S08, S13 |
| F42 | Pi dashboard/show/report/candidate diff, unique live default, ambiguous/older/unknown run, text/format collision, store scope | T13, T25, M02, M09 | S12, S13 |
| F43 | Read-only CLI help/version/availability/assets/asset, file/JSONL/root reads and transactional state reads | T01, T04, T13, T25, T29, M09 | S12 |
| F44 | Loopback browser tree/evidence/diff/log refs/replay/artifacts, GET-only routes, query allowlist, no mutation or generation | T13, T25, M09, M10 | S12, S17 |
| F45 | SSE/refresh, exact revision/parent diffs, stale response fencing, transport failure and listener lifetime | T13, T25, M10 | S13, S17 |
| F46 | Lazy storage, cold missing/current/legacy/WAL/hot-journal reads, no sidecar changes, close on refusal, owner-only recovery | T03, T13, T14, M09 | S06, S13 |
| F47 | Root application and whole-Pi reload, lease/guard admission, held native calls, partial activation/failure and eventual storage close | T02, T15, T25, M05, M10 | S14 |
| F48 | Native Fabric topology/full logs/chat/control remain Fabric-owned, Arbor shows references only | T15, T19, T25, M09 | S12, S17, S19 |
| F49 | Current substrateStart/substrateInspect/substrateCancel diagnostics cannot become product research controls | T02, T15, T16 | S02, S04 |
| F50 | Post-merge install/version matrix, actual installed identity, retained cutover audit, no historical pass reuse | T01, T14, T24, T25, T26, M01 | S01, S15, S18 |

### Public-interface closure checklist

T03 checks manifest parity against registrations and closed nested schemas. T14 checks the passive application, exact native requirements and package cutover. For effective runtime discovery use T15/T25, not the static JSON alone.

| Public refs (all 21 ordinary refs) | Execution coverage |
| --- | --- |
| `arbor.start`, `arbor.inspect`, `arbor.control`, `arbor.export` | T03, T16, T19, T25 |
| `arbor.propose`, `arbor.dispatch`, `arbor.collect`, `arbor.evaluate`, `arbor.distill`, `arbor.decide` | T03, T07, T17–T20, T23 |
| `arbor.runResearch`, `arbor.resumeAttempt`, `arbor.reviseRoles` | T07, T19, T21, T25 |
| `arbor.review`, `arbor.apply`, `arbor.undoApply` | T09, T21, T25 |
| `arbor.lessons`, `arbor.scaffold` | T12, T23, T24 |
| `arbor.substrateStart`, `arbor.substrateInspect`, `arbor.substrateCancel` | T02, T15 |
| Additional scoped capability `arbor_lifetime.lease` | T02, T14, T25. Acquisition-only `{}` → `null`, agent risk, scoped ordered resource `arbor:owner:lifetime`. Do not manually acquire it. |

Registered command is `/arbor`, with presentation/setup subcommands, not 25 separate Pi registrations. Checklist: bare dashboard; setup; doctor; availability; assets; scaffold; start; show; browser; pause; steer; resume; cancel; review; keep; discard; validate; continue-partial; restart-parent; revise-roles; export json/report/trajectory; apply; undo-apply; lessons. All appear in F07–F50. CLI `help`, `--help`, `-h`, `--version`, `-V` are in T29. Public package symbols and every packaged asset ID are checked by T01/T14/T29. Internal roles are not registered skills. The ten owner requirements are `agents.self`, `agents.members`, `agents.status`, `agents.create`, `agents.ask`, `agents.spawn`, `agents.wait`, `agents.stop`, `agents.remove`, `schema.status`.

## 4. Safety, prerequisites and isolated workspace

### Required prerequisites

| ID | Requirement / missing-prerequisite disposition |
| --- | --- |
| P01 | Operator explicitly chooses to execute this suite. Run as a normal user, never root. Bash, Git, tar, coreutils and Node 24+ with `node:sqlite` are needed. Do not install into system Python. |
| P02 | Disposable disk capacity for a repository clone, dependencies, multiple installed fixtures and retained native artifacts. Determine capacity before regression. No fixed runtime/disk promise is made. |
| P03 | Locked npm packages available in a disposable cache or explicitly authorized network installation. `--offline` cache misses are BLOCKED dependencies, not permission to download. Never symlink Arbor's existing runtime or dependency tree into the test copy. |
| P04 | Native lanes need process spawning and localhost sockets. Fixtures supply local deterministic model servers and dummy local keys. They do not need paid inference, real credentials, remote datasets or external services. OS policy prohibiting localhost makes these lanes BLOCKED. |
| P05 | Browser lanes need the declared Playwright Chromium binary and OS libraries. Missing binary/library is BLOCKED. Browser acquisition is a separate optional download, never silently triggered. |
| P06 | Manual inference cases require an operator-provisioned free local/native-child-compatible model and its exact provider/model identity in the isolated profile. A model available only through a Main extension is insufficient. Without it, use deterministic native lanes and mark manual inference cases BLOCKED. No fallback to a paid default. |
| P07 | Optional external-provider/source acceptance requires exact public descriptors/hashes, approved risk/effect policy and any explicitly provisioned service. Built-in/local cases must remain runnable without these. No real source catalog is required for T11/T17/T23. |

### Create a disposable working-tree snapshot

**These are instructions for a future authorized run. Do not run them in the original package directory.** Git operations below create/check out only a disposable clone. They do not commit or push product changes. This copy retains Git history for the legacy-preservation audit and overlays current Arbor bytes, including uncommitted peer changes. Do not copy existing runtime databases, keys or evidence.

```bash
set -o pipefail
ORIGIN=/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor
SOURCE="$ORIGIN/pi-fabric-arbor"
mkdir -p /home/balauru/.pi-profiles/fabric/.runtime
QA=$(mktemp -d /home/balauru/.pi-profiles/fabric/.runtime/arbor-qa.XXXXXXXX)
NODE=$(command -v node)
NODE=$(readlink -f "$NODE")
BASE=$(git -C "$ORIGIN" rev-parse HEAD)
mkdir -p "$QA/evidence" "$QA/home" "$QA/profile" "$QA/tmp" "$QA/cache"
printf '%s\n' "$QA" > "$QA/QA-ROOT"
git -C "$ORIGIN" status --short > "$QA/evidence/original-status.txt"
git -C "$ORIGIN" log -5 --oneline > "$QA/evidence/baseline-log.txt"
git -C "$ORIGIN" diff --binary -- pi-fabric-arbor > "$QA/evidence/working-tree.patch"
git clone --no-hardlinks --no-checkout "$ORIGIN" "$QA/repo"
git -C "$QA/repo" checkout --detach "$BASE"
# Preserve the committed copy for comparison, overlay the inspected working tree.
mv "$QA/repo/pi-fabric-arbor" "$QA/committed-arbor"
mkdir "$QA/repo/pi-fabric-arbor"
tar -C "$SOURCE" --exclude='./node_modules' --exclude='./.runtime' --exclude='./.git' -cf - . \
  | tar -C "$QA/repo/pi-fabric-arbor" -xf -
APP="$QA/repo/pi-fabric-arbor"
# Start a clean shell. No inherited provider credentials, Pi settings or Git hooks.
env -i QA="$QA" APP="$APP" NODE="$NODE" \
  PATH="$(dirname "$NODE"):/usr/local/bin:/usr/bin:/bin" \
  HOME="$QA/home" TMPDIR="$QA/tmp" XDG_CONFIG_HOME="$QA/home/.config" \
  XDG_CACHE_HOME="$QA/home/.cache" XDG_DATA_HOME="$QA/home/.local/share" \
  PI_CODING_AGENT_DIR="$QA/profile" PI_OFFLINE=1 PI_SKIP_VERSION_CHECK=1 \
  npm_config_cache="$QA/cache" npm_config_offline=true \
  GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_OPTIONAL_LOCKS=0 \
  LC_ALL=C.UTF-8 TERM="${TERM:-xterm-256color}" \
  bash --noprofile --norc
```

Continue in that clean shell:

```bash
cd "$APP"
"$NODE" --version
"$NODE" -e 'if (+process.versions.node.split(".")[0] < 24) process.exit(1); require("node:sqlite")'
git --version
npm --version
# Default is deliberately offline. Populate this disposable cache only by an
# explicitly approved package acquisition, or a copy of npm content-cache bytes
# from an operator-selected cache. Do not copy .npmrc, auth.json or real profiles.
npm ci --ignore-scripts --offline --no-audit --no-fund
"$NODE" --input-type=module -e '
import {readFileSync} from "node:fs";
for (const p of ["package.json", "node_modules/pi-fabric/package.json", "node_modules/@earendil-works/pi-coding-agent/package.json", "node_modules/tsx/package.json", "node_modules/playwright/package.json"]) {
 const j=JSON.parse(readFileSync(p)); console.log(JSON.stringify({path:p,name:j.name,version:j.version,peers:j.peerDependencies}));
}' > "$QA/evidence/resolved-versions.jsonl"
sha256sum "$APP/package.json" "$APP/package-lock.json" > "$QA/evidence/package-hashes.txt"
git -C "$QA/repo" status --short > "$QA/evidence/copied-status.txt"
```

Stop on preflight failure. The copied status must retain the intended manifest/lockfile/test/doc changes. A clean HEAD-only copy is not equivalent. Record Node's resolved executable/version and architecture, OS/kernel, Git/npm, Pi/Fabric/tsx/Playwright, installation variant, commit, working-tree patch and hashes. Review the copy for unexpected ignored files before executing it.

If installation from an empty cache is authorized, use `npm ci --ignore-scripts --offline=false --no-audit --no-fund` **only in this disposable APP** and retain the install log. Subsequent installed fixtures use offline installation and the same isolated cache. Absence of registry/cache packages remains a prerequisite failure. Never use `--force` or `--legacy-peer-deps` to hide incompatibility.

If a browser download is separately authorized:

```bash
PLAYWRIGHT_BROWSERS_PATH="$APP/.runtime/pr12-browsers" \
  "$APP/node_modules/.bin/playwright" install chromium
```

An existing authorized Playwright cache may instead be copied into that exact disposable browser directory. Do not use an arbitrary Chrome version as proof of the declared browser lane. Do not change the hard-coded `test:pr12:e2e` browser path or install host libraries automatically.

### Common execution and evidence contract

All T-cases inherit P01–P03, clean `APP`, the relevant P04/P05 prerequisites, and this contract:

1. **A06 — Fresh identity:** each run uses this new QA root. Tests create distinct temporary projects/state. Repeated attempts use a new QA root or preserve the entire earlier log/artifact set first. Never attach a new owner to a real run.
2. **A07 — Logging:** run the exact command from `APP`. Capture stdout, stderr, full test names, counts, exits, signals, duration, native fixture paths and assertions. A filtered-out test is not passed. Link each parameterized subcase to its actual test name.
3. **A08 — Pass:** all selected assertions complete, expected checks are actually reached, outer and required child processes exit successfully, and case-specific observable/evidence checks hold. No skipped/cancelled/todo/unexecuted subcase may inherit a pass.
4. **A09 — Failure:** wrong value, unauthorized effect, lost data, stale promotion, missing mandatory evidence, assertion failure or a test's own timeout is FAILED. A proven missing environment prerequisite is BLOCKED. Operator interruption is SKIPPED with partial evidence retained. Unknown timeout cause remains nonpassing, not silently BLOCKED as “slow machine”.
5. **A10 — Cleanup:** let fixture teardown close stores/servers and settle exact owned work. Preserve generated fixtures/evidence until reviewed. Do not clean `APP/.runtime` between gates or delete an uncertain worker's workspace. Section 10 is the only final cleanup procedure.

Define capture helpers once. The helper prints an exit but never changes it into a pass. Distinct labels prevent log overwrite.

```bash
qa_run() {
  local label=$1; shift
  local out="$QA/evidence/$label"
  test ! -e "$out.log" || { printf 'Existing evidence: %s\n' "$out" >&2; return 98; }
  printf '%q ' "$@" > "$out.command"; printf '\n' >> "$out.command"
  date -u +%FT%TZ > "$out.started"
  "$@" > "$out.log" 2>&1
  local rc=$?
  printf '%s\n' "$rc" > "$out.exit"
  date -u +%FT%TZ > "$out.finished"
  printf '%s exit=%s log=%s\n' "$label" "$rc" "$out.log"
  return "$rc"
}
qa_test() {
  local label=$1; shift
  qa_run "$label" "$NODE" --import tsx --test --test-concurrency=1 "$@"
}
```

Do not run an unattended multi-hour blanket timeout and then count partial output as success. Native test files have their own deadlines, some up to 780 seconds for A12. Budget the entire retained suite as a long session. Do not shorten deadlines or relax assertions. On a stall, preserve live/exit diagnostics and exact owned PIDs before any termination. Never `pkill node`, `killall pi` or kill unrelated Pi sessions.

## 5. Quick smoke path

### Offline, no inference/browser smoke

After installation preflight, execute:

```bash
qa_run SMOKE-cli "$NODE" "$APP/bin/pi-fabric-arbor.mjs" availability
qa_test SMOKE-contract "$APP/tests/package/pr1-package-contract.test.ts"
qa_test SMOKE-metric "$APP/tests/evaluators/measurement.test.ts" "$APP/tests/material/pr5-acceptance.test.ts"
qa_test SMOKE-read "$APP/tests/research/pr12-presentation.test.ts"
```

Expected: source-loaded/read-only availability, current peer/package contract, exact numeric refusal/acceptance, transactional projection and GET-only read-server assertions. These tests may create disposable SQLite/Git fixtures and loopback read servers. They do not establish native research. Inspect each log, not only the final exit. Run T29 for a direct shell-level read/refusal smoke and M01 for a no-inference visual installation check.

### Optional native smoke

Requires offline package cache and localhost native-model fixture support. No paid model is used:

```bash
qa_test SMOKE-native --test-name-pattern='PR11 source code owner scaffold actual baseline candidate measured keep' \
  "$APP/tests/integration/pr11-examples-host.test.ts"
```

Expected: that exact named case is present and runs, preparation is unvalidated, actual baseline and candidate are independently evaluated, a measured keep occurs, source/index/refs remain unchanged, and the Pi subprocess exits zero. This is one source variant, not installed/browser/held-out/lifetime acceptance. If no matching test executes, the smoke is NOT-RUN/invalid selection, not PASSED.

## 6. Existing automated case catalog

Commands use `qa_test` or `qa_run` above. Each T-card is a parameterized suite of the named test file(s). Use the log's full subtest names as result IDs beneath the T-ID. Where files overlap, link one actual execution to all applicable coverage rows rather than inflating unique test counts. Running the full gates in section 7 covers these same current source/native tests.

| ID | Exact command | Isolated fixture / required variants and observable pass oracle | Evidence beyond common log |
| --- | --- | --- | --- |
| T01 | `qa_run T01 npm run test:source:package` | Package metadata/asset contract plus real clean-packed installation and source reload. Require one Arbor command, one public skill, no role skills, source exports/no dist/build/prepack, assets present, passive unavailable start with no inference/database. Installed sentinel edit is confined to the disposable installed package. P04 and offline cache required even though no experiment inference is used. | Packed inventory, actual resolved installed versions, install root, RPC notifications and passive/source-reload assertions. |
| T02 | `qa_test T02 "$APP/tests/managed/owner.test.ts" "$APP/tests/managed/owner-lifetime.test.ts"` | Fresh fake public call seams. Check trusted idempotent setup and inherited policy preservation, missing capabilities, one passive actor, invalid proposals/models, held create/ask/spawn/wait cancellation, exact terminal stop matrix, original signal, every non-active guard state, partial provision and cached drain failure. Storage survives lease release until provider close. | Reached guard-state/hold/provision matrix and setup before/after assertions. Unit evidence only, not native settlement proof. |
| T03 | `qa_test T03 "$APP/tests/research/store.test.ts" "$APP/tests/research/service.test.ts"` | Fresh SQLite/current owner fixtures. Exact registrations/schema/risk/effect parity, frozen duplicate start, conflicting IDs/stale generations rollback, cross-process reservation races, terminal monotonicity, intrinsic owner checks, forged receipts/scores rejected, review races, export persistence gap and state-directory separation. | Each negative operation preserves projection; duplicate controls return prior receipts without recharging; one exported artifact after identical retry, conflict bytes retained. |
| T04 | `qa_test T04 "$APP/tests/research/pr6-roles.test.ts" "$APP/tests/research/pr11-presets.test.ts"` | Fresh copied roles, presets and all four preparation types. Verify frozen role integrity, candidate collision isolation, missing role refusal, all precedence layers/preset:null, exact origins/digests, concurrent destination claim, unsafe parent/overwrite refusal, 29→32 provenance bound, 33 prepared files refusal, 64 KiB serialized definition overflow before destination creation. | Saved bundle/source refs, preparation files and no inference/subprocess/download claims from scaffolding. Only preparation, not experiment validity. |
| T05 | `qa_test T05 "$APP/tests/evaluators/measurement.test.ts" "$APP/tests/evaluators/pr4.test.ts" "$APP/tests/material/pr5-acceptance.test.ts"` | Exact frozen Git pairs plus fake native/provider outputs and real local command runner. Cover ±large decimals, nine-place precision, ties, zero relative denominator, opposite directions, failed/stopped/timed_out/error/exit, missing/failed checks, ambiguous/missing/wrong-unit output, repeats/retries/judges and capacity, no-check limitations, malformed definitions, descriptor/schema/risk/effect mismatch, request/reply poisoning, delayed persistence and unknown handle. | Pair/attempt/invocation identity, separately charged check/judge/retry IDs, failed validity rather than scalar “win”. Exact gain rules are independent of rounded descriptive summaries. |
| T06 | `qa_test T06 "$APP/tests/material/pr5-workspace.test.ts"` | Disposable Git and non-Git material with staged/unstaged/untracked/ignored bytes, deleted tracked file left on disk, executable/symlink/binary/newline names, stash/custom refs and sibling worktree. Refuse unresolved merges, sparse/skip-worktree/assume-unchanged/submodule roots, transitive escapes/cycles, index/source races and nested owned state. Freeze cannot alter protected checks. | Before/after bytes, index, refs, modes/links and sibling/stash assertions. Non-Git has no newly initialized source Git. Apply F04 rather than interpreting this as selected-only capture proof. |
| T07 | `qa_test T07 "$APP/tests/material/pr5-journey.test.ts"` | Fresh owner/material/evaluator/store fixtures. Worker→settled freeze→exact evaluation→current-incumbent keep, changed combined material reevaluation, Git CAS/database gaps, exact-attempt links even for equal OIDs, noise/threshold vetoes, all resume/continuation/held-out/trajectory/wave/budget regressions in this file. | Persisted invocation/completion/evaluation/decision links, no duplicate native effects, no terminal reopen, exact intent replay, preserved unresolved artifacts. |
| T08 | `qa_test T08 "$APP/tests/research/pr6-loop.test.ts" "$APP/tests/research/pr7-tree.test.ts"` | Closed search config and synthetic factual projections. Verify depth/children/pruned-parent rejection, explicit explore/exploit slot/reason/fallback, exact rational ranking and deterministic ID ties, direction shift/no-gain/failure separation and reset after keep. Pair with T07/T20 for effect-level wave/budget proof. | Exact selected eligibility and stop reasons, not a claim that actor-turn or attempt limits promise progress. |
| T09 | `qa_run T09 npm run test:pr8` | Existing PR8 journey/source journal fixtures. Apply/undo preserve preexisting dirt and unrelated newer edits. Conflicting preimage/postimage/mode/symlink parent or mixed partial state refuses without blind overwrite. Review/permission/source approval remain separate. All-postimage adoption preserves original intent; preimage/mixed/newer states block. | Journal intent/identity/adoptions, source operation IDs, index/ref/byte/mode comparisons and retained patch. |
| T10 | `qa_run T10 npm run test:pr9` | Closed held-out/final definitions and exact-attempt material fixtures. Development nonimprovement never consumes validation; dev win + held-out loss vetoes keep/apply even after review; disjoint task content and frozen policy; cap adaptive reuse, reserve judges/checks, reject stale/same-OID borrowed evidence; final untouched until explicit selection, exact replay once. | Split tags, pair identities, validation counters, absence of held-out/final data/native IDs in ordinary actor context. |
| T11 | `qa_test T11 "$APP/tests/research/pr10-grounding.test.ts" "$APP/tests/research/pr10-delayed.test.ts" "$APP/tests/research/pr10-review-bounds.test.ts"` | Finite local descriptors/search/fetch and native-literature fixtures. Required missing capability cannot be bypassed, optional bindings do not widen, exact visited passage required, snippets/whitespace/forgery/stale/deleted/symlinked sources reject, overflow rollback, descriptor-await retirement has no dispatch, complete delayed results reused without redispatch. | Retained source text/access/inspection/request hashes and exact provenance. No real web or credential dependency. |
| T12 | `qa_test T12 "$APP/tests/research/pr10-experience.test.ts"` plus T07/T03 | Fresh same-project current-v2 lesson/trajectory fixtures. Preserve negative/contrary/duplicate findings and source evidence, reject borrowed/stale/mixed held-out refs; recall only hypothesis-to-retest. Delayed completion uses original operation revision/incumbent/receipt. Exports are derived artifacts, never evidence inputs. | Proposal context references, exact action/outcome links, lesson applicability/limitations/digest and unchanged read projection. |
| T13 | `qa_test T13 "$APP/tests/research/pr12-presentation.test.ts" "$APP/tests/research/pr12-repairs.test.ts" "$APP/tests/research/pr12-storage.test.ts"` | Fresh state, local read server, mocked UI and disposable storage child processes. Compare cold bytes/inventory, missing store, WAL/hot journal refusal and owner-only recovery, reader disposal/original errors, busy writer/pinned reader serialization. Check selector ambiguity/older IDs/latest continuation/revision fencing/store drift, query/method rejection, exact artifact bytes, late selection/response closure. P04 needed for read sockets/storage children. | Cold tests must include DB, WAL, SHM, journals and directory inventory. Live SHM coordination exclusion in other tests is not a waiver here. No hidden owner/keepalive or mutating read. |
| T14 | `qa_run T14 npm run test:pr13` | Mechanical current source-only structure, 21 ordinary + one scoped ref, roles/assets/docs and ported arithmetic/workspace/export gaps. Fresh version-0/1 legacy-shaped fixture DBs refuse both reader and owner preparation byte-for-byte, including sentinel key and inventory. | Reached cutover assertions and legacy fixture byte/inventory snapshots. Does not authorize scanning real legacy history. |
| T15 | `qa_run T15 npm run test:pr2:e2e` | Real Pi/Fabric substrate lifecycle with local fixture model. Diagnostic start/inspect/cancel, actual descriptor discovery/restrictions, exact native creates/asks/spawns/waits/stops, unavailable agents/models, root disposal and no live owned participants on proven settlement. | Native traces, actual child exit JSON, retained ambiguity on failed settlement. No participant-registry substitute. |
| T16 | `qa_run T16 npm run test:pr3:e2e` | Real observation/deferred research and public interface/configuration/permission fixtures. Observe unscored native work on Git, frozen config without execution in deferred mode, policy denial and ordinary command composition. Substrate routes cannot control product runs. | Saved source-reference-not-snapshot attribution, no fabricated candidate grades, actual exits and closed action receipts. |
| T17 | `qa_run T17 npm run test:pr4:e2e` | Real native command/subject/judge/provider evaluation, clean-installed PR4 prompt-pair loading, explicit execute denials, local optional provider descriptors, checks/failure/retry/deadline, persistence-before-ingest/reload and bounded provider replacement scenarios. | Actual material OIDs and task evidence, model/role separation, independent grade/validity, final native exits. Bounded provider scenario is not universal replacement safety. |
| T18 | `qa_run T18 npm run test:pr5:e2e` | Actual native material candidate editing/evaluation/keep/export over dirty disposable source and exact owned snapshots. Explicit material workflow, not autonomous policy supplied by Main. | Full native chain, measured decision and unchanged original material/index/refs before any separate apply. |
| T19 | `qa_run T19 npm run test:pr6:e2e` | Actual autonomous command and agent-suite journeys using immutable package roles, baseline then bounded candidates/lessons/decisions. Failed baseline/check/worker/budget/policy cases, actor cannot call Arbor mutations or self-grade, no Main research driver. | Native actor/worker/evaluator IDs and tools/bootstrap, saved stop reasons, no live owned work at successful exit, source-preservation checks. |
| T20 | `qa_run T20 npm run test:pr7:e2e` | Run alone, no competing QA workload. Actual serial and parallel eight-attempt workloads, four two-candidate waves, first warmup then three warmed waves, distinct worktrees/fixed parent, serialized evaluations, control/prune/budget repairs. | A12 JSON with three warmed waves in both modes, positive overlap for each warmed parallel wave and parallel/serial median ratio ≤0.8. Keep unchanged workload and oracle. Any timeout/incomplete wave is nonpassing, not a timing sample. |
| T21 | `qa_run T21 npm run test:pr8:e2e` | Actual four modes and genuine RPC review/dismissal/timeout, pause/steer/resume/revise roles, source apply/undo/conflicts, continuation/restart, same-owner recovery, nine controlled SIGKILL gaps and reload regressions. Only fixtures deliberately kill their own Pi. | Review/source UI receipts, journal/native/exit evidence, known-result no-redispatch, unknown/new-owner blocks, terminal source recovery preserves state and original target even after newer incumbent. |
| T22 | `qa_run T22 npm run test:pr9:e2e` | Actual source/installed validation, command and subject/judge paths, short/long deadlines, final-only public selection, development-winner/held-out-loser, exact same-owner completion recovery vs unknown handle. | Required checks/judges charged, untouched-final count, real review cannot override loss, saved native stop and child exits. |
| T23 | `qa_run T23 npm run test:pr10:e2e` | Actual source/clean-installed local public search/fetch, native literature with visited text and frozen resume, interrupted grounding and second-run experience reuse/trajectory generation. No external web service. | Source/native/request IDs and text artifacts, crash additional-search/fetch/spawn counts stay zero for uncertain replay, exact lesson/trajectory provenance and exits. |
| T24 | `qa_run T24 npm run test:pr11:e2e` | Actual source AND clean-installed code/agent/recipe owner scaffold→baseline→candidate→measured keep. Also serialized-definition overflow and write deny/ask preparation refusal. Code metric counts work, recipe synthetic accuracy, agent paired descriptive grading. | Preparation remains unvalidated label; run records establish measured keep. Source bytes unchanged. Installed Fabric version recorded, not inferred from source dependency. |
| T25 | `qa_run T25 npm run test:pr12:e2e` | P05 mandatory. Actual source/installed owning-Pi intake/no-ID controls/review/export plus production browser tree/evidence/diff/logs/replay/artifacts/SSE and stale responses. Application reload holds create/ask/spawn/wait/stop, whole-Pi reload holds ask/spawn, background work and agent/execute/write deny/ask after reload. | Screenshots and browser JSON, GET-only traffic, artifact/CLI/projection parity, real exit JSON and native settlement before disposal. Application/whole-Pi scope only. No inferred owner-only replacement safety. |
| T26 | `qa_run T26 npm run audit:pr13` | Only after section 7's exact fresh canonical gate logs, native artifacts, package-final install and Git base exist. Checks unchanged historical workloads/production/dependency bytes, pack/docs/installed identity and A12. | Actual audit exit/output. Expect F03 conflict if reached. Missing evidence is BLOCKED. A reached historical-identity assertion is FAILED gate with “baseline conflict”, not silently waived. |

### Additional direct probes (new suite instructions, not existing passing tests)

#### T27 — Closed-schema numeric boundaries, independent of inference

Prerequisites: installed source copy only. Fixture: in-memory configuration objects, no state. Save the following block as `"$APP/qa-T27.mjs"` in the disposable copy only. Its imported paths resolve from `APP`, not an installed global package.

```javascript
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {CONFIG_SCHEMA, START_SCHEMA, validate} = await import(pathToFileURL(process.env.APP+'/src/research/contracts.ts'));
const bounds = [
 ['search','concurrency',1,2], ['search','measurementConcurrency',1,1],
 ['search','maxDepth',1,10], ['search','maxChildren',1,10],
 ['search','maxActorTurns',1,128], ['search','exploreEvery',1,100],
 ['search','stopAfterNoGain',1,100], ['search','shiftAfterNoGain',1,100],
 ['search','stopAfterFailures',1,100], ['limits','attempts',1,100],
 ['limits','evaluatorCalls',1,10000], ['limits','activeMs',1000,86400000],
 ['limits','artifactBytes',1024,1073741824], ['evaluator','repeats',1,100],
 ['grounding','maxSources',1,4]
];
for (const [group,key,min,max] of bounds) {
 for (const value of [min,max]) validate(CONFIG_SCHEMA,{[group]:{[key]:value}});
 for (const value of [min-1,max+1,min+0.5,String(min),null])
  assert.throws(()=>validate(CONFIG_SCHEMA,{[group]:{[key]:value}}),`${group}.${key} ${value}`);
 console.log('boundary',group,key,min,max);
}
for (const kind of ['code','instructions','skill','workflow','configuration','recipe','data','other'])
 validate(CONFIG_SCHEMA,{material:{kind}});
for (const execution of ['inspect','deferred','evaluate','material','research']) validate(CONFIG_SCHEMA,{execution});
for (const mode of ['auto','direction','review','collaborative']) validate(CONFIG_SCHEMA,{search:{mode}});
for (const runId of ['a','a'.repeat(96)]) validate(START_SCHEMA,{runId});
for (const runId of ['', ' ', '../x', '-x', 'a'.repeat(97)]) assert.throws(()=>validate(START_SCHEMA,{runId}));
for (const bad of [{unknown:true},{search:{concurrency:3}},{material:{kind:'plugin'}},{execution:'attached'}])
 assert.throws(()=>validate(CONFIG_SCHEMA,bad));
assert.throws(()=>validate(START_SCHEMA,{runId:'x',approved:true}));
console.log('T27 assertions complete');
```

```bash
qa_run T27 "$NODE" --import tsx "$APP/qa-T27.mjs"
```

This uses the declared public tsx loader. Do not add the probe file to the original product or include it in claims of unchanged product bytes.

Pass: every explicitly enumerated minimum/maximum accepted and each invalid variant rejected. This establishes schema acceptance only. Spec resolution can further reject mismatched evaluator repeats/aggregation/model identity. It does not claim executing 100 attempts, a one-day run or a 1 GiB workload. Evidence: per-field rows plus zero exit. Cleanup: no fixtures, retain script/log.

#### T28 — Snapshot limits and non-Git scope discrepancy

Prerequisites: Git, normal filesystem, capacity for ~17 MiB payloads and 4097 tiny files. No inference. This direct internal seam probe supplements public/native tests, it does not replace them. Save as `"$APP/qa-T28.mjs"` **in the disposable copy only**:

```javascript
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readdir,readFile,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {Workspace} from './src/material/Workspace.ts';
const mode=process.argv[2];
assert.ok(['bytes-ok','bytes-over','files-ok','files-over','empty','selection'].includes(mode));
const root=await mkdtemp(join(process.env.QA+'/tmp/','capture-'));
const source=join(root,'source'); await mkdir(source);
if(mode.startsWith('bytes')) await writeFile(join(source,'payload'),Buffer.alloc(16*1024*1024+(mode==='bytes-over'?1:0),97));
if(mode.startsWith('files')) for(let i=0;i<(mode==='files-over'?4097:4096);i++) await writeFile(join(source,'f'+i),'x');
if(mode==='selection') { await writeFile(join(source,'selected'),'chosen synthetic bytes'); await writeFile(join(source,'not-selected'),'unselected synthetic bytes'); }
async function inventory(){const out=[];for(const name of (await readdir(source)).sort()){const p=join(source,name);out.push([name,(await lstat(p)).mode,createHash('sha256').update(await readFile(p)).digest('hex')]);}return out;}
const before=await inventory();
const request={root:source,mutablePaths:[],evaluationInputs:[],selectedUntracked:mode==='selection'?['selected']:[]};
let capture,error;
try{capture=await new Workspace(join(root,'owned')).capture(request);}catch(e){error=String(e);}
assert.deepEqual(await inventory(),before,'Source bytes/modes/inventory changed');
await assert.rejects(lstat(join(source,'.git')),/ENOENT/);
console.log(JSON.stringify({mode,root,files:capture?.files,error}));
if(['bytes-over','files-over','empty'].includes(mode)) {
 assert.ok(error && /bound|4096|Empty/.test(error)); assert.equal(capture,undefined);
} else {
 assert.equal(error,undefined);
 if(mode==='files-ok') assert.equal(capture.files.length,4096);
 if(mode==='selection') assert.deepEqual(capture.files,['selected'],'F04 documented selected-only expectation differs from current capture');
}
```

```bash
for mode in bytes-ok bytes-over files-ok files-over empty selection; do
  qa_run "T28-$mode" "$NODE" --import tsx "$APP/qa-T28.mjs" "$mode"
done
```

Pass criteria: 16 MiB and 4096 files accepted, +1 byte/file and empty capture refused, all source bytes/modes/inventory preserved and no source Git initialized. `T28-selection` deliberately asserts the documented selection expectation. Static inspection predicts it will fail under F04. Record observed captured names and that discrepancy, do not flip the assertion to bless current behavior. Failure may leave **owned** preparation artifacts, which are retained and are not source corruption. Evidence: independent logs for all six variants and retained fixture roots. Cleanup: common A10, no deletion while investigating.

#### T29 — Direct CLI read/refusal matrix

Prerequisites: source-loaded bin only, no live owner/model/browser. Fixtures entirely below `QA`. This shell probe captures exact exits, file inventory and content without relying on a fake CLI IO object:

```bash
mkdir "$QA/cli"
printf '{"sample":1}\n' > "$QA/cli/projection.json"
printf '{"n":1}\n\n{"n":2}\n' > "$QA/cli/events.jsonl"
printf '{"n":1}\nnot-json\n' > "$QA/cli/bad.jsonl"
printf 'raw-no-newline' > "$QA/cli/raw"
printf 'permission fixture\n' > "$QA/cli/denied"
chmod 600 "$QA/cli/denied"
ln -s raw "$QA/cli/link"
truncate -s 8388608 "$QA/cli/exact-8MiB"
truncate -s 8388609 "$QA/cli/over-8MiB"
CLI=("$NODE" "$APP/bin/pi-fabric-arbor.mjs")
find "$QA/cli" -printf '%P %y %m %l\n' | sort > "$QA/evidence/T29-before.inventory"
find "$QA/cli" -type f -exec sha256sum {} + | sort > "$QA/evidence/T29-before.hashes"
for verb in help --help -h --version -V availability assets; do qa_run "T29-$verb" "${CLI[@]}" "$verb"; done
qa_run T29-inspect "${CLI[@]}" inspect --file "$QA/cli/projection.json"
qa_run T29-replay "${CLI[@]}" replay --file "$QA/cli/events.jsonl"
qa_run T29-artifact "${CLI[@]}" artifact --root "$QA/cli" --path raw
qa_run T29-exact "${CLI[@]}" inspect --file "$QA/cli/exact-8MiB"
# Expected exit 2 for each of the following. Do not stop after the first refusal.
qa_run T29-bad-json "${CLI[@]}" replay --file "$QA/cli/bad.jsonl"
qa_run T29-symlink "${CLI[@]}" artifact --root "$QA/cli" --path link
qa_run T29-escape "${CLI[@]}" artifact --root "$QA/cli" --path ../QA-ROOT
qa_run T29-oversize "${CLI[@]}" inspect --file "$QA/cli/over-8MiB"
qa_run T29-missing "${CLI[@]}" inspect --state "$QA/absent-state" --run missing
qa_run T29-unknown "${CLI[@]}" inspect --file "$QA/cli/raw" --bogus x
qa_run T29-duplicate "${CLI[@]}" inspect --file "$QA/cli/raw" --file "$QA/cli/raw"
qa_run T29-mixed "${CLI[@]}" inspect --file "$QA/cli/raw" --state "$QA/absent-state" --run missing
qa_run T29-odd "${CLI[@]}" inspect --file
qa_run T29-unknown-asset "${CLI[@]}" asset not-an-asset
qa_run T29-extra-help "${CLI[@]}" help extra
# Run as a non-root user. Restore only this known fixture mode afterward.
chmod 000 "$QA/cli/denied"
qa_run T29-os-denied "${CLI[@]}" inspect --file "$QA/cli/denied"
chmod 600 "$QA/cli/denied"
for verb in setup scaffold prepare init create start runResearch resume pause cancel steer review keep discard validate continue-partial restart-parent revise-roles apply undo-apply export generate serve authorize certify cleanup; do
  for mode in plain attached offline; do
    args=(); test "$mode" = plain || args=(--mode "$mode")
    qa_run "T29-deny-$verb-$mode" "${CLI[@]}" "$verb" "${args[@]}"
  done
done
# Read every listed packaged asset, not just the public skill.
"${CLI[@]}" assets | while IFS=$'\t' read -r id path; do
  qa_run "T29-asset-$id" "${CLI[@]}" asset "$id"
done
find "$QA/cli" -printf '%P %y %m %l\n' | sort > "$QA/evidence/T29-after.inventory"
find "$QA/cli" -type f -exec sha256sum {} + | sort > "$QA/evidence/T29-after.hashes"
cmp "$QA/evidence/T29-before.inventory" "$QA/evidence/T29-after.inventory"
cmp "$QA/evidence/T29-before.hashes" "$QA/evidence/T29-after.hashes"
test ! -e "$QA/absent-state"
```

Expected: valid commands/each asset exit 0. Replay emits two normalized JSON lines, malformed replay names line 2. File/root artifact reads append a trailing newline if missing, so the `raw` output is `raw-no-newline\n`, not byte-identical no-newline retrieval. Registered state artifact retrieval is byte-preserving and is tested by T13/T25/M09. All listed invalid/mutation variants exit 2 with refusal/error text and no state/files changed. Empty/unknown input does not cause attachment or export generation. Inspect-file reads bytes, it is not a JSON validity or current-state claim. Record each expected-error subcase as PASSED only after checking **exit 2**, not because the helper returned nonzero. Cleanup: retain fixtures/logs until section 10.

## 7. Full regression execution path

### Complete retained gates, with fresh canonical evidence

Do not use previous `APP/.runtime` content. The fresh copy omitted it. Run A12 with no competing suite. These names are consumed literally by the retained audit:

```bash
cd "$APP"
mkdir -p "$APP/.runtime/pr13-gates"
run_gate() {
  local script=$1 name=$2 rc
  local prefix="$APP/.runtime/pr13-gates/$name"
  test ! -e "$prefix.log" || { printf 'Refusing evidence overwrite: %s\n' "$prefix" >&2; return 98; }
  printf '%s\n' "npm run $script" > "$prefix.command"
  date -u +%FT%TZ > "$prefix.started"
  npm run "$script" > "$prefix.log" 2>&1
  rc=$?
  printf '%s\n' "$rc" > "$prefix.exit"
  date -u +%FT%TZ > "$prefix.finished"
  printf '%s exit=%s\n' "$script" "$rc"
  return "$rc"
}
run_gate check normal
run_gate test:pr13 targeted
run_gate test:pr7:e2e native-pr7
for pr in 2 3 4 5 6 8 9 10; do run_gate "test:pr${pr}:e2e" "native-pr${pr}"; done
run_gate test:pr13:e2e native
run_gate test:source:package package-final
run_gate audit:pr13 audit
```

Review failures as they occur. The loop continues to collect independent lane evidence, it does **not** assert acceptance. Stop dependent/native work if a prerequisite or isolation guard fails. Do not rerun passing lanes unchanged just to get a clean-looking report. `test:pr13:e2e` is PR12 browser/lifetime plus PR11 examples, not all native coverage. `check` includes both no-emit typechecks and `npm test`, whose source groups include package/install, managed, research, evaluators and material. It is not a compile-only or no-process gate.

The old audit expects source counts `[9,36,121,48,94]`, targeted `[9]`, native `[35,9]`, package-final `[9]`, and PR2–PR10 `[8,20,21,9,21,5,42,13,4]`, in the exact log-summary format it parses. These are **audit assumptions**, not expected new passing results. Counts overlap across targeted lanes. A test-count/reporter/baseline mismatch must remain visible. Never rewrite counts or logs. Do not run the manifest generator against original files to “repair” equality during QA.

After retained gates, run T27, T28 and T29 in the disposable copy. Run M01–M10 for manual gaps. Their scripts/artifacts are QA additions, not changes authorized for product source. Run optional `qa_run PACK npm pack --ignore-scripts --json --pack-destination "$QA/evidence"` to retain a final tarball/inventory. It does not replace clean-installed execution.

### Compatibility matrix, not a range-wide promise

| Variant | Declared/configured status | Required evidence before PASSED |
| --- | --- | --- |
| Source locked baseline | Fabric 0.83.0, Pi 0.85.1 in current dev metadata | Full fresh source results, actual resolved modules and native exits. |
| Clean-installed baseline | Several test fixtures explicitly request Fabric 0.83.0 | Actual installed manifest/package hashes and installed lanes. Passing source alone is insufficient. |
| Operator-selected Fabric version >0.83.0 | Inside open-ended declared peer range | Separate disposable root, approved/cache-available exact version, resolved dependency tree, source/installed feature, native/browser/lifetime results at that version. |
| Fabric below 0.83.0 | Outside declared support | Optional isolated npm peer-resolution refusal check. No expectation of working research. |
| Other Node/Pi/OS/browser combinations | Node >=24, Pi peer `*`; no universal tested claim | Record exact combination and evidence. Unsupported OS capabilities can block cases. |

For a chosen additional source version, in a **new** disposable APP use `npm install --ignore-scripts --offline --no-audit --no-fund --save-dev --save-exact pi-fabric@EXACT_VERSION`, only after replacing `EXACT_VERSION` with the operator's selected cached version. This intentionally changes that test copy's manifest/lockfile. Preserve the compatibility patch and distinguish it from the baseline. It does not alter hard-coded `0.83.0` installed fixture requests, so those results still belong to 0.83.0. Do not label a mixed run as an installed test of the newer version. Use a separate manually installed exact-version Pi profile for M01–M10 or report installed-native matrix coverage BLOCKED pending a version-parameterized harness. Changing the product/harness is outside this QA-writing task.

A previous integration timeout must appear in the result history even if a later independent attempt passes. Record whether it was a test deadline, outer runner timeout, child signal, resource problem or still unknown. Historical PR13 passes and static compatibility declarations do not close it.

## 8. Manual fixture and user-executable cases

Manual tests establish visual usability, real operator confirmation, policy messaging and workflow clarity that source assertions or scripted RPC selection do not prove. Timing-sensitive faults use deterministic T-cases rather than “kill it at roughly the right time”. Without a suitable local model, do M01's passive checks and T29, then mark inference-dependent manual cases BLOCKED. Do not improvise a paid provider.

### Isolated manual Pi fixture

Use a separate project/profile/state inside the same disposable QA root, not a previously completed native test's owner identity. Save these fresh files using Node. `APP`, `QA`, `NODE` must still be exported from section 4. These paths are all absolute at runtime.

```bash
mkdir -p "$QA/manual/project/.pi" "$QA/manual/profile" "$QA/manual/state" "$QA/manual/packs"
export PI_CODING_AGENT_DIR="$QA/manual/profile"
"$NODE" --input-type=module <<'JS'
import {writeFileSync} from 'node:fs';
const {QA,APP}=process.env;
writeFileSync(QA+'/manual/profile/settings.json',JSON.stringify({packages:[APP+'/node_modules/pi-fabric',APP]},null,2));
writeFileSync(QA+'/manual/project/.pi/fabric.json',JSON.stringify({
 configVersion:4,fullCodeMode:true,
 approvals:{read:'allow',write:'ask',execute:'ask',network:'deny',agent:'ask'},
 agents:{enabled:false},mesh:{enabled:false},schema:{mode:'off'},
 components:[]
},null,2));
JS
cd "$QA/manual/project"
"$APP/node_modules/.bin/pi" --offline --no-session
```

Do not launch with `--approve` for human permission-denial checks. Keep inherited credentials absent. Trust **only this disposable project** through Pi's normal trust UI when a case requests it. Initially agents/mesh are deliberately disabled and there is no executable model.

For M02–M10's research steps, provision a free local model using Pi's supported model configuration in **this isolated profile**, set exact coordinator/executor/subject identities, then enable agents and project mesh deliberately through Fabric settings. Set the Arbor component's `config.stateDirectory` to `QA/manual/state` after setup, with its absolute expanded path. Do not use this document's placeholder text as a model or literal path. Observe effective status after `/reload` and `/arbor doctor`. If startup reports missing requirements or schema incompatibility, record it and stop. Do not change security mode to hide a production blocker. Tests deliberately toggling unsupported schema must restore only the saved disposable config afterward.

For browser-only manual visual checks without inference, an alternative is an **already completed disposable T25 fixture's read-only data** opened by the existing local read-view tests. Do not resume it from a new Pi owner. Static screenshot review of that fixture is allowed but is not a live manual-workflow pass.

### Shared manual evidence and cleanup

Before each mutation, save `/arbor show --run RUN` facts (run/revision/state/incumbent), effective permission state and source fingerprint. Afterward save actual receipt, projection and source fingerprint. Screenshots must include the relevant selection/dialog/status without secrets. Console/network exports are local QA evidence. Dialog text typed into an “edits are not saved” view must not become an artifact or source change.

`RUN`, `ATTEMPT`, `DECISION`, `ORIGINAL_APPLY_COMMAND_ID` below mean **exact IDs read from that disposable run's projection/receipt**, never invented IDs. `--run RUN` is Pi command text, not shell environment expansion. Shell variables such as `RUN`/`STATE`/`URL` must be set explicitly from observed values before CLI/curl probes. Unknown IDs are used only where a negative test says so.

All M-cases inherit A06–A10. Cancel and await exact settlement for each newly created manual run before starting an independent fixture, except a case deliberately testing concurrency. Do not force cleanup when state is `cleanup_pending`/`interrupted`. Keep separate fresh runs for conflicting variants so a refused/terminal operation is not silently reset.

### M01 — Human installation, passive configuration and doctor

**Prerequisites:** P01–P03, fresh manual fixture. No inference required for passive checks.

**Steps and variants:**

1. Before trusting/configuring, run `/arbor availability`, `/arbor assets`, `/arbor doctor`. Try `/arbor setup` without project trust. Capture its refusal and unchanged config.
2. Trust only the disposable project. Run `/arbor setup`, inspect the project Fabric JSON, repeat setup and compare bytes. It must preserve agents=false, mesh=false, schema and unrelated settings while adding exactly one enabled `id:arbor, component:arbor` parent. No separately configured owner/drain and no research are created.
3. Set the new component's state directory to the absolute disposable manual state path. `/reload`, then `/arbor doctor`. With agents/mesh disabled, the UI must show blockers rather than imply successful inference. `/arbor start` must not silently launch a paid default.
4. For the installation UI variant, create another fresh isolated profile and run `"$APP/node_modules/.bin/pi" install "$APP"`, then `pi list`/`pi config` through that exact app-local binary. Enable Arbor and Fabric there. Inspect exactly one public skill and the source asset list. This is separate from automatic settings-file registration.
5. In independent fresh config copies test conflicting duplicate Arbor entries and malformed `components` using T02 for deterministic assertions. In the UI, run setup once per copy and verify readable conflict/no-overwrite behavior. An unsupported `schema.mode:enforce`/missing Fabric case should diagnose failure, not rewrite policy. Restore the saved disposable file before further steps.

**Pass:** ordinary configuration setup is idempotent and passive, unavailable remains unavailable, trust and configuration effects are explicit, installed/configured/enabled/observed/tested are not conflated. CLI availability's static metadata is not a health test. **Evidence:** command list, notifications, config before/after, passive filesystem inventory, no inference/run artifacts. **Cleanup:** exit the fresh Pi after verifying listener/owner status, retain the isolated profile. M02+ use only the deliberately enabled local-model profile.

### M02 — Intake, precedence and run selection

**Prerequisites:** M01 enabled local-model fixture, code scaffold from M03, no active work. Use fresh run IDs per variant.

**Steps:**

1. Read the code pack's generated `start.json`. Save its overrides as project `arbor.config.json` in the disposable project so bare intake has a valid material/evaluator. Use `grounding.mode:off` for this local case. Put `objective.minimumGain:"0.02"` in isolated profile defaults, `"0.03"` in project config, and explicit start override `"0.04"` in the JSON variant. Inspect resolved value/origin. Repeat with `preset:null` while a shadowed profile preset path is deliberately nonexistent. Resolution must not read that shadowed file.
2. Run bare `/arbor start`. Inspect missing-choice prompts and launch confirmation for root, mutable/protected files, checks/units/direction, exact model roles and budgets. Dismiss confirmation. No new run/capture/native work may start. Repeat, approve the confirmed local request and inspect its saved specification. Do not claim the initial acknowledgment means completion.
3. Configuration drift between preview and start is timing-sensitive. Execute the named T03 `PR12 confirmed intake identity rejects changed configuration before capture` case for deterministic failure evidence. Manually verify the drift error is actionable if reproduced, never silently accepted.
4. Start two fresh deferred runs with `/arbor start {"runId":"qa-one","overrides":{"execution":"deferred"}}` and the same request with `runId:"report"`. `/arbor` and no-ID controls must require disambiguation rather than choose by creation order. `/arbor show --run qa-one` selects exactly it. `/arbor show --run missing-qa-run` must refuse without falling back.
5. With qa-one selected, `/arbor export report` means report format, not run `report`. `/arbor steer report now` is ambiguous and must require `--run`. `/arbor steer --run qa-one report now` must store exactly that text. `/arbor lessons --run qa-one report` means the query `report`.
6. Duplicate the exact deferred start JSON: saved spec must be reused, not reread changed defaults. Change the same runId's start arguments: reject the conflict. Try malformed JSON, unknown `approved:true`, invalid execution, whitespace/97-character IDs and concurrency 0/3. Each must reject without hidden fallback. T27 covers exact schema boundaries.
7. Older than the 128-run picker and unique-live-owner selection use T13's bounded picker fixtures, not 129 paid/manual runs. Verify explicit older-ID reads and active/configured state-directory drift refusal in those logs.

**Pass:** exact selection, frozen origins/spec and launch confirmation behave as above. `deferred` does not infer or capture; `inspect` is unscored observation, **not** a passive CLI read and may invoke native agents on Git material. Non-Git observation refuses with saved spec and currently stale diagnostic wording (F05). **Evidence:** intake screenshots, IDs/revisions/origins, exact duplicate/conflict output. **Cleanup:** cancel deferred/new research runs using their exact IDs, retain config variants and projections.

### M03 — Packs, research loop, budgets and material scope

**Prerequisites:** M01 local-model/mesh enabled, exact available model IDs, ordinary write/agent/execute approval. Scaffolding alone does not use inference. `QA/manual/packs` is an existing canonical parent.

**Exact preparation:** construct a one-line JSON request in the shell, then paste its output after `/arbor scaffold` in owning Pi. Set `QA_MODEL` and `QA_SUBJECT` to operator-selected real local identities first.

```bash
export QA_MODEL='REPLACE_WITH_EXACT_LOCAL_PROVIDER/MODEL'
export QA_SUBJECT='REPLACE_WITH_EXACT_LOCAL_PROVIDER/MODEL'
"$NODE" -e 'console.log(JSON.stringify({pack:"code",destination:process.env.QA+"/manual/packs/code-1",environment:{node:process.env.NODE,coordinatorModel:process.env.QA_MODEL,executorModel:process.env.QA_MODEL,subjectModel:process.env.QA_SUBJECT},heldOut:false}))'
```

**Steps/variants:**

1. Approve only the ordinary scaffold write request. Verify `status:unvalidated`, files `preparation.json`, `preset.json`, `evaluation.json`, `start.json`, a separate material directory and no inference/source Git/download/install. Repeat same destination and try an existing empty directory, file, symlink and symlinked parent. They must not merge/overwrite. Unknown pack/extra `overwrite:true` refuses. T04/T24 establish concurrent claim, partial failure and post-await retirement deterministically.
2. Read all generated configuration. Paste **the exact generated start object** after `/arbor start` in the same owning project. Wait for saved baseline validity, candidate progress and settlement via `/arbor show --run RUN`. Owner, not Main, chooses/dispatches research operations. A baseline failure must block scored search. A kept candidate remains in owned material, not source.
3. Repeat with fresh destinations for agent and recipe. Agent `heldOut:true` is supported, code/recipe `heldOut:true` must reject. Agent quality summaries are paired/descriptive, recipe is synthetic/development-only and code measures input reads rather than wall-clock speed. A non-winning real model is a research outcome, not a suite failure unless the deterministic T24 oracle fails.
4. For the local upstream-command adapter, create only `QA/manual/prepared/benchmark.cjs` with `console.log('ARBOR_METRIC 10 ms')`, and supply `pack:"upstream-command"`, `heldOut:false`, fresh destination, same environment and `prepared:{root:ABSOLUTE_PREPARED_ROOT,files:["benchmark.cjs"],argv:[ABSOLUTE_NODE,"benchmark.cjs"],checks:[],unit:"ms",sourceUrl:"https://example.invalid/local-fixture",revision:"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}`. This is synthetic declared provenance, not an upstream authenticity claim. Inspect copied bytes/mode/digests, no source Git or network. Narrow mutable paths/add explicit protected checks before any research. No checks means limited validation. T04 covers traversal/duplicates/33 files/oversized JSON.
5. Clone the generated request into independent fresh runs with attempts=1, evaluatorCalls=1, activeMs=1000 and artifactBytes=1024, **one limit per run**. Require attributable admission/budget refusal when insufficient, no next effect after exhaustion and retained uncertainty for effects already in flight. Actor turns are per episode. Do not expect tiny budgets to produce a baseline or a keep. Use T07/T20 for atomic parallel reservations, stop/no-gain/pruning and exact active/artifact rechecks, not unrepeatable manual timing.
6. Code/agent material should capture preexisting synthetic dirt without changing index/refs, with protected checks immutable. T06/T28 cover special files, binary/link/mode/staged deletion and exact bounds. Do not add real unselected files to recipe/non-Git roots because of F04.

**Pass:** preparation and research evidence remain distinct, effects obey permissions/bounds, no automatic source apply, labels match measurement scope. **Evidence:** scaffold request/result, four generated configs, before/after source fingerprints, native IDs/evaluations/stop reason, model identities. **Cleanup:** cancel/settle each run, retain its owned material. Never overwrite a partial scaffold, choose a new destination.

### M04 — Controls, review and policy denial

**Prerequisites:** independent local code research runs with Auto, Direction, Review and Collaborative modes. Actual pending choice/active native work required. If the chosen model never reaches the required state, mark that manual subcase BLOCKED and use deterministic T21/T25, not fabricated records.

**Steps:**

1. Start a bounded research run. Before completion, send `/arbor pause --run RUN`, `/arbor steer --run RUN Inspect the constraints first`, and inspect. Pause prevents new dispatch at admitted boundaries, it does not assert in-flight work stopped. The steer text is for the next ask. `/arbor resume --run RUN` must be a separate ordinary agent-policy intent and execute admission, not immediate action from an inert intent receipt.
2. `/arbor cancel --run RUN`, then inspect until exact settlement or explicit uncertainty. A queued cancel receipt is not terminal cleanup. Repeat cancel on settled cancelled work, then try pause/resume. It must not reopen a terminal material run.
3. For Direction/Collaborative require reviewed eligible direction before expansion. Review mode gates promotion. Auto must not show unnecessary research-choice dialogs. Collaborative continuation is explicit. On `/arbor review --run RUN`, dismiss, reject and approve in separate eligible runs. Only the genuine owning-Pi choice can approve. Permission approval is not research review; review approval is not a grade/source-write permission.
4. Open a review or keep picker, then change the run with a separate allowed control before responding. The old selection/dialog must be stale and refused. Deterministic concurrent variants are in T03/T07/T21. Keep/discard must select the latest settled attempt per hypothesis and preserve exact UI revision.
5. In a new fresh profile/project variant, set ordinary agent permission to deny (then ask and deny the prompt). Start/resume must not bypass it. Repeat with execute deny/ask for research/evaluation, then write deny/ask for scaffold/export/review/apply/undo/role revision. Explicitly deny the ask, do not leave it unanswered and infer denial. Native counts must show no forbidden effect after admission refusal. A run may have been frozen by agent-admitted start before execute denial, that is not an executed baseline.
6. Repeat resume denial after `/reload`. Captured component calls do not imply fresh per-native-call risk checks or instantaneous revocation of already-admitted work. T25 is the real host oracle for this boundary. Direct unadmitted execute resume and consumed/stale resume intent must refuse in T07.

**Pass:** observable state/receipt/permissions remain distinct, denied/dismissed/stale choice cannot mutate/promote, exact work eventually settles or remains honestly blocked. **Evidence:** actual permission prompt response, research dialog screenshot, before/after projection and native counts. **Cleanup:** restore only disposable saved policy, settle admitted work, retain unresolved artifacts and all denied receipts.

### M05 — Persistence, role revision, interruption and recovery

**Prerequisites:** paused/quiescent and pending-review local runs, plus T21/T25 deterministic fault lanes. Do not kill manual work at an approximate stage.

**Steps:**

1. Pause and await quiescence. Record spec identity, role bundle, models, source/incumbent, owner/native refs. Edit only disposable profile/project defaults and preset files. `/reload`, inspect, then explicit `/arbor resume --run RUN`. Saved run uses old spec/roles rather than new defaults. Unknown owner/handle must block without redispatch, not “adopt” a killed owner's run.
2. At quiescent pause, `/arbor revise-roles --run RUN`. Approve ordinary write policy. Require a new attributable package-resolved binding without rewriting old spec/evidence/invocations. Attempt during active/unresolved work and with stale revision: refuse. Missing/corrupted/candidate-colliding role bundle variants use T04/T07 so only disposable copied assets are damaged.
3. With a pending choice, reload root application through the actual public `components.reload({id:"arbor"})` operation under normal policy, or use whole-Pi `/reload` for that separate scope. Inspect first, then resume. Rebinding an eligible pending choice must return awaiting-review without approving/dispatching. Old dialogs must not approve. Fresh review and separately resumed research are required.
4. On an eligible settled partial attempt, `/arbor continue-partial --run RUN` and select it. Enter `Complete the same hypothesis using the retained partial material`. In a separate fresh fixture use `/arbor restart-parent --run RUN` and explicit same-hypothesis summary. Empty/dismissed summary does not dispatch. Both require a new attempt/native invocation and charge, never uncertain replay. Resume separately for research/evaluation.
5. Execute T21's same-owner known-completion, all nine SIGKILL gaps, unknown handle and terminal source recovery cases. Execute T25's root application held-call matrix and whole-Pi ask/spawn matrix. Inspect original error/cause, late handle and cleanup evidence, not just outer promises. A lost/malformed/mesh-shaped/mismatched result remains unresolved with artifacts/reservations retained.

**Pass:** persistence preserves identities, explicit supported recovery never duplicates uncertain work, terminal state is monotone and source preservation holds. Owner-only or arbitrary provider/dependency reload is not claimed supported by root reload results. **Evidence:** before/after spec/bundle hashes, exact invocations/receipts, child exits/signals, held-call/disposal order and no-live proof only when actually established. **Cleanup:** do not force/delete uncertainty; preserve fault fixtures for diagnosis.

### M06 — Evaluation, promotion and final validation interpretation

**Prerequisites:** local code/agent scaffold, plus T05/T07/T17/T22 fixtures for controlled wins/losses/faults. Optional real providers need P07.

**Steps:**

1. Inspect baseline/candidate development evaluation in Pi Evidence and browser Evidence. Verify exact snapshot/attempt/current-incumbent binding, native execution versus validity versus decision, required checks, units/direction, gain threshold and separately charged invocations. For command material, emitted evidence must have exactly one `ARBOR_METRIC DECIMAL UNIT` line and successful required checks/exit. Local fake fixtures provide deterministically wrong units/extra metric/failed exit/check/timeout/retry/judge cases.
2. `/arbor keep --run RUN` on a tied, invalid, inconclusive, old-incumbent or held-out-losing attempt must not create measured keep. Ordinary approval cannot override the deterministic acceptance oracle. Test exact/just-below threshold, zero/negative incumbent and both directions in T05/T07, not float calculations in a spreadsheet. Displayed repeat means are descriptive/truncated, exact acceptance remains authoritative.
3. Agent held-out run: verify disjoint development/held-out content, cap/adaptive-use accounting and no held-out tasks/results/native IDs in ordinary ideation/ranking/lessons. A development winner that loses held-out must remain vetoed after genuine review. No selected held-out means development-only, not transfer proof.
4. On an eligible final-only fixture, run `/arbor validate --run RUN` and select the exact candidate attempt. Or `/arbor validate RUN ATTEMPT` with the observed IDs. Require exact current valid development selection, untouched final use only once and explicit final evidence. Replaying the same programmatic request returns saved result without native relaunch. A new unrelated/old attempt cannot borrow it. T22 supplies deterministic fixtures, including deadlines and unknown completion.
5. Optional evaluator catalog: inspect effective public descriptors and exact `tools.catalog` hashes before configuring at most eight `{ref,descriptorHash}` entries in isolated `arbor.evaluators.json`. Missing selection must not disable built-ins. Incompatible schema/risk/effect or hash must block selected provider. Changed catalog requires quiescent full Pi `/reload` and new binding, not silent rebinding of saved measurements. T17 provides local-provider proof with no external service.

**Pass:** users can identify limitations and exact promotion evidence, final selection exists despite F05 help omission, no scalar/review/external artifact can launder a win. **Evidence:** selection screenshot, raw metrics/check/native IDs, split counters and decision reason. **Cleanup:** cancel/settle optional provider runs before catalog changes, retain frozen definitions and evidence. Never retry an unknown identity automatically.

### M07 — Safe source apply, undo and original-intent recovery

**Prerequisites:** a measured kept local code candidate with changed material, genuine owning session. If none is available, BLOCKED manual variant, not permission to edit the DB. T09/T21 supply deterministic changed candidates and source gaps.

**Fixture:** only disposable pack material. Before research, add a synthetic staged version and a different unstaged version of the mutable file in a **disposable Git fixture**, plus an unrelated file. Use T06's dirty fixtures for exact setup when pack material is non-Git. Capture source bytes, file modes/link targets, `GIT_OPTIONAL_LOCKS=0 git status --porcelain=v1 -z`, index hash and `git show-ref` in this fixture. Never initialize Git in real user material.

**Steps:**

1. After measured keep, verify original source/index/refs unchanged. Use `/arbor export --run RUN report`. Verify report delta is captured-baseline→incumbent, excluding preexisting staged/unstaged dirt. Candidate view instead uses recorded parent→candidate.
2. `/arbor apply --run RUN`, select the measured decision, deny ordinary write permission: no source dialog or writes. Repeat with permission allowed, dismiss the separate source dialog: no writes. Then approve `Apply exact source delta` in a fresh valid request. Capture original apply command ID and journal/pre/postimage identity. Source changes only affected paths, index/refs and unrelated newer edits stay intact.
3. `/arbor undo-apply --run RUN`, select the exact apply operation and approve the separate `Undo exact source delta` dialog. It restores captured dirty preimages, not HEAD, removes only exact owned additions and preserves unrelated newer edits. Explicit undo target is the **original apply command ID**, not the keep decision ID.
4. Separate fresh variants: edit an affected source byte before apply, edit an affected byte after apply before undo, change an affected mode, or insert a symlinked parent. Operation must conflict without writing earlier unaffected candidate paths or overwriting newer bytes. Export remains available. Do not delete the edit to manufacture a pass.
5. T21 deterministically interrupts after all writes but before journal/receipt. Same-owner nonterminal recovery first resumes to reconcile, then `/arbor apply RUN ORIGINAL_APPLY_COMMAND_ID` with a fresh policy/dialog adopts **the original** intent if all postimages match. For cancelled-terminal recovery, do not resume research, use original-intent recovery/undo directly. A newer owned incumbent does not change the original target displayed in the dialog. Preimage/mixed/newer byte/mode states block. No replayed writes or blind inverse.

**Pass:** exact journals and source receipts, fresh policy/dialog and per-path guards protect newer data, source state remains separate from owned incumbent and research state. **Evidence:** source fingerprints/index/refs before/after each variant, dialogs, original intent/adoption/undo IDs and retained patch. **Cleanup:** use only successful exact undo when its postimages are still unchanged. On conflict retain everything and stop, never `git reset --hard` or clean the fixture as “recovery”.

### M08 — Grounding, lessons and trajectories

**Prerequisites:** T23 local source/native-literature fixture, or P07 explicitly provisioned public search/fetch and an owning local model. Default manual case has no catalog.

**Steps:**

1. Fresh runs with grounding off, optional/no catalog and required/no catalog. Off performs no grounding. Optional records unavailable literature without blocking unrelated local work. Required blocks before baseline, never invents a source. MaxSources 1/4 accepted, 0/5 invalid via T27.
2. For available grounding, inspect exact descriptors/hashes through normal public discovery and configure no more than four pairs in isolated `arbor.sources.json` before full Pi registration. Require read/network risk and none/commutative effects, closed search/fetch schemas. Use quiescent full `/reload`, then a new run with exact catalog/query/model. T23 creates equivalent local sources without internet.
3. Inspect retained fetched text and verbatim passages with source URL/title, access/inspection/native ID, run/revision/digest/request provenance. Search snippets alone must not appear as inspected facts. Failed/changed catalog, stale source files, whitespace-only/forged passages, mutated request/reply and interrupted batch no-retry are controlled T11/T23 variants. Preserve original artifacts on refusal.
4. Pause/reload/resume a completely grounded run after changing defaults/catalog source file: saved complete grounding is reused with no new search/fetch/literature call. Catalog maintenance cannot widen existing bindings. Interrupted unresolved work remains blocked without guessed retry.
5. `/arbor lessons --run RUN exact evaluation`. Inspect negative, contrary and duplicate results, applicability/limitations and exact source-run/lesson/revision/digest reference. Reuse in a fresh same-project run must mark hypothesis-to-retest, not inherit an old grade. Different project and historical-v1 lessons are not silently imported.
6. `/arbor export --run RUN trajectory`. Confirm actual proposal/action/outcome references and original operation revision/incumbent even when completion was delayed past a later keep. It is not a mirrored transcript and must not leak held-out/final evidence into ordinary learning. T07/T12/T23 provide delayed/provenance assertions.

**Pass:** missing capability is honest, literature/lessons remain attributed hypotheses and never scores, complete reuse and interrupted uncertainty do not redispatch. **Evidence:** descriptor hashes, saved visited text, exact recalled refs, query response/trajectory, native call counts. **Cleanup:** settle before any catalog maintenance, retain sources/lessons/exports and do not delete stale artifacts to force recall.

### M09 — Pi/CLI/browser projection and exports

**Prerequisites:** quiescent manual run with at least one frozen candidate and owner-generated artifact, source/installed variants where available, browser URL observed from `/arbor browser --run RUN`. P05 is not required for a normal human browser, but record that browser separately from Playwright.

**Steps:**

1. `/arbor show --run RUN`. Choose a candidate, verify exact revision, parent-to-candidate diff, attempt/evaluation/native log reference. Close the editor after typing a harmless local change into its displayed read-only text. Reopen: no saved edit. Choose `Report and uncertainty` and verify editing does not generate a report. Choose `Native Fabric topology`, then the exact suggested `/fabric log NATIVE_ID`. Full logs/topology remain Fabric-owned, not mirrored by Arbor.
2. `/arbor export --run RUN json`, then report and trajectory formats. Require owner write permission and saved artifact receipt/path/digest. Record revision before/after. T03/T07/T13 cover identical command retry, conflicting existing bytes, revision/abort/export-registration-budget and receipt-persistence gaps. A retained file without receipt is not export success.
3. Set shell `STATE` to the observed absolute manual state directory, `RUN` to its actual ID, and `ARTIFACT` to one registered ID. Read at quiescence:

```bash
qa_run M09-inspect "$NODE" "$APP/bin/pi-fabric-arbor.mjs" inspect --state "$STATE" --run "$RUN"
qa_run M09-replay "$NODE" "$APP/bin/pi-fabric-arbor.mjs" replay --state "$STATE" --run "$RUN"
qa_run M09-artifact "$NODE" "$APP/bin/pi-fabric-arbor.mjs" artifact --state "$STATE" --run "$RUN" --id "$ARTIFACT"
```

4. In browser compare run/revision/state/pending/incumbent, Evidence, Logs and Replay to the same saved CLI projection. Open candidate diff and existing artifacts. A retrieved artifact must match saved bytes/digest and not create a new export. Missing/tampered/symlinked artifact variants run only on copies via T13/T29, never corrupt the authoritative manual run for another case.
5. Stop the owning Pi normally and confirm browser listener closure. Repeat cold CLI reads against the same disposable state. Hash **all** state files and modes/inventory before/after, including WAL/SHM/journals if present. Missing state/run must not initialize DB. Legacy/WAL/hot-journal races use T13/T14's disposable injected fixtures, no SQLite editor against user data. Read refusal is acceptable where documented, recovery/migration on read is not.

**Pass:** equivalent transactional projections at equal revisions, exact parent diff versus baseline export, no saved read-editor edits, artifact retrieval never generates, native references aren't a second registry, cold reads preserve every byte/file. **Evidence:** Pi screenshots, CLI stdout/exit, raw registered artifact comparison, browser revision and cold fingerprints. **Cleanup:** retain exports/state. Removing a package does not remove user data. Use only the disposable root cleanup later.

### M10 — Browser usability, read-only endpoints and lifetime

**Prerequisites:** live quiescent manual run/browser from M09, local browser/devtools. Record URL from Pi output, do not guess a port. Set shell `URL` to that URL's loopback origin and `RUN` to the observed run. Optional curl is a prerequisite for the shell probes, otherwise use browser devtools or mark those manual subcases BLOCKED and retain T25 coverage.

**Steps:**

1. Open the URL. At 1280×960 and a narrow ~390px viewport/200% zoom, inspect `Research evidence`, Read-only badge, Research run selector, current baseline/incumbent and uncertainty. Navigate Tree, Evidence, Diff, Logs, Replay and existing artifacts. Tab through controls, use the skip link, Enter/Space, visible focus and scroll the exact diff. No control should be obscured, keyboard-inaccessible or falsely actionable. These are manual usability criteria, not claimed WCAG certification.
2. For pending review, UI says only owning Pi can answer and has no approve/reject/apply/start/export-generation form. Selector/buttons only navigate. Use the browser network panel: normal operations must use GET. Keep screenshots of tree/evidence/diff/pending and any console errors.
3. Verify negative HTTP behavior using only this disposable listener:

```bash
curl -sS -i "$URL/api/projection?run=$RUN"
curl -sS -i "$URL/api/replay?run=$RUN"
curl -sS -i "$URL/api/projection?run=$RUN&action=cancel"
curl -sS -i "$URL/api/projection?run=$RUN&run=$RUN"
curl -sS -i "$URL/api/artifact?run=$RUN&id=missing&generate=true"
curl -sS -i "$URL/api/start"
for method in POST PUT PATCH DELETE; do
  curl -sS -i -X "$method" "$URL/api/projection?run=$RUN"
done
# Bounded observation of an intentionally open stream. Curl exit 28 at 3s is
# expected ONLY for this probe, after an initial projection event is captured.
curl -sS -N --max-time 3 "$URL/api/events?run=$RUN"
```

4. Expected: projection/replay GET 200 for an existing readable run, mutation/duplicate/unknown effect query 405, absent effect route 404, every non-GET 405 with `Allow: GET`, events `text/event-stream` with initial projection. Invalid/missing exact diff revision or unavailable read returns 409, unknown run projection/replay/events 404. State/artifact hashes at quiescence must not change. These local negative requests do not authorize probing external hosts.
5. Unknown explicit run URL must show unavailable and no stale candidate tree, not fall back to another run. Switch two valid runs and candidates quickly, refresh twice, navigate away/back. Old responses must not overwrite latest selection/revision. Use T25's held real responses for reproducible race proof. SSE from an allowed owner steer updates revision and clears old diff/replay rather than silently retaining stale content.
6. With devtools offline or listener stopped, observe explicit read unavailable/disconnected state, not a false current-success view. Restore connectivity/start a new read listener via owning Pi and use `Refresh current revision`. Run/browser selection must not mutate research. T13/T25 provide deterministic late-error and transport-loss oracles.
7. Open browser twice in the same presentation context, then `/reload` and exit Pi in separate variants. Old listener and SSE must close, late picker/start/listener handles must not survive shutdown. Root application reload uses `components.reload({id:"arbor"})`, not internal owner target. Repeat T25 held native work for actual drain ordering, not merely a closed browser tab. Source/installed screenshots and exits are separate required evidence.

**Pass:** visible facts/actions are honest, UI is navigable at tested sizes, exact revision fencing holds, no browser mutation/generated export or hidden execution, session-owned listener closes. **Evidence:** screenshots per view/size/pending/error, console/network methods/statuses, saved SSE initial/revision events and old-port closure. **Cleanup:** exit owning Pi normally and verify exact owned work settlement before retiring browser/state. Do not delete data because the browser disconnected.

## 9. Coverage limits and decision rules

| ID | Limit / required disposition |
| --- | --- |
| R01 | Mapped feature families are not an exhaustive Cartesian product of model×OS×runtime×permission×failure timing. Record untested matrix cells, especially newer declared Fabric versions and installed variants. |
| R02 | Source assertion passes do not establish genuine operator UX, native lifecycle or policy. Native fixture passes do not establish actual research/scientific quality or external provider behavior. Keep evidence levels separate. |
| R03 | Whole-Pi held ask/spawn and root-application held create/ask/spawn/wait/stop are the declared tested lifetime scopes. Owner-only and arbitrary dependency/provider replacement remain unproven. Missing evidence is not a safety theorem. |
| R04 | Budgets are admission bounds. Time/artifacts can overshoot between boundaries, token/cost ceilings are observational and worktrees are trusted, not OS containment. Do not assert hard monetary, descendant or sandbox enforcement. |
| R05 | F03 audit conflict and F04 non-Git selection contradiction remain open until an authorized owner resolves them. This suite neither fixes behavior nor weakens safety expectations. |
| R06 | Browser download, external endpoints/datasets/GPU/Python environments/credentials and real models are optional explicit prerequisites. No skipped dependent case may inherit another fixture's pass. |

A full-regression conclusion must list F07–F50 rows with executed case links and outstanding variants. “All automated tests passed” cannot mean full QA passed if manual cases are blocked, the audit conflicted, installed evidence is absent, or an integration timed out. Use `/home/balauru/.pi-profiles/fabric/.worktrees/arbor-refactor/pi-fabric-arbor/docs/qa-results-template.md`. Do not replace the published acceptance ledger with an unexecuted runbook's expectations.

## 10. Safe cleanup

Default cleanup is **retain**. Tests intentionally leave fault/evidence roots. Do not clean automatically on failure.

1. **A11 — Settle:** cancel only recorded disposable runs from their owning Pi, await saved terminal settlement and native local-member evidence. If owner/handle is unknown or cleanup pending, retain material/reservations and investigate. Do not assume an outer timeout killed every child.
2. **A12 — Close:** exit exact disposable Pi/model/browser processes normally, close read listeners and SQLite connections, record exits. Inspect PIDs/command lines against paths below the exact QA root before any necessary termination. Never stop unrelated Pi/node processes.
3. **A13 — Preserve:** copy reviewed evidence/results to an operator-chosen local archive outside the deletion target. Confirm no secrets are included. Keep failed/interrupted artifacts until the responsible reviewer releases them.
4. **A14 — Remove only on a separate deliberate decision:** print and verify `QA`, its marker and contents. Do not use glob cleanup of Arbor profiles or worktrees. The command below is optional and must not run while any dependent process/uncertainty remains:

```bash
printf 'Disposable root proposed for removal: %s\n' "$QA"
case "$QA" in /home/balauru/.pi-profiles/fabric/.runtime/arbor-qa.*) ;; *) echo 'Unsafe root' >&2; exit 1;; esac
test -d "$QA" && test ! -L "$QA" && test "$(cat "$QA/QA-ROOT")" = "$QA" || exit 1
# Only after reviewing exact path, archived evidence and settled process inventory:
# rm -rf --one-file-system -- "$QA"
```

Never remove or modify the original working tree's runtime, historical DBs, user keys, reports, artifacts, stash, worktrees or existing profile settings. Package uninstall is not data cleanup authorization.
