# Validation

Use this acceptance plan for the distributable package. Schemas and scripts own executable semantics. Fixtures are indexed by the [fixture catalog](../validation/fixtures/fixture-catalog.json) and runtime development cases by the [synthetic canary catalog](../validation/fixtures/canary/synthetic-catalog.json).

## Receipt policy

Generated receipts, model outputs, Fabric traces, native logs, and oversized captures must not be written under this skill. For every validation run, choose a new revisioned external directory:

```sh
ROOT=/home/balauru/.pi-profiles/fabric/skills/agent-benchmarking
RUN_ROOT=/home/balauru/.pi-profiles/fabric/skill-evaluations/agent-benchmarking/<run-id>
test ! -e "$RUN_ROOT"
cd "$ROOT"
```

Set `<run-id>` before execution. Never reuse or overwrite it. For a run that includes runtime canaries, invoke the fixed production harness first because it creates `RUN_ROOT` atomically. For a deterministic-only run, create `RUN_ROOT` before redirecting static outputs. Historical receipts moved to `skill-evaluations/agent-benchmarking/legacy-2026-09-02/validation/receipts`; the immutable move record is the [migration receipt](evidence/migration-cleanup.md). Runtime canaries are non-scoring, use only isolated development fixtures, and never read, repair, run, or modify an existing scored packet.

## Static acceptance

```sh
mkdir -p "$RUN_ROOT"

python -B -m unittest discover -s tests -p 'test_*.py' -v \
  > "$RUN_ROOT/deterministic-tests.txt" 2>&1

python -B scripts/validate_contracts.py --all-schemas \
  > "$RUN_ROOT/contract-validation.txt"

{
  python -B scripts/build_benchmark_bundle.py --check
  for path in scripts/*.py; do python -B "$path" --help; done
  python -B - <<'PY'
from pathlib import Path
for path in sorted([*Path('scripts').glob('*.py'), *Path('tests').glob('*.py')]):
    compile(path.read_bytes(), str(path), 'exec')
PY
  node scripts/typecheck_fabric_guest.mjs \
    --workflow workflows/benchmark.ts \
    --fabric-root /home/balauru/.pi-profiles/fabric/npm/node_modules/pi-fabric
  node scripts/typecheck_fabric_guest.mjs \
    --workflow workflows/runtime_canaries.ts \
    --fabric-root /home/balauru/.pi-profiles/fabric/npm/node_modules/pi-fabric
} > "$RUN_ROOT/static-entry-smoke.txt" 2>&1

python -B /home/balauru/.pi-profiles/fabric/skills/ultra-skill-creator/scripts/validate_skill.py "$ROOT" \
  > "$RUN_ROOT/skill-validator.txt"
```

The deterministic suite must exercise every cataloged known-good, known-bad, isolated-defect, boundary, malformed, and adversarial case. Static checks do not replace generated Fabric guest declarations.

## Exact fixed-runner canary

In an authorized Pi session with the pinned Fabric version loaded, pass the exact UTF-8 bytes of [the fixed runner](../workflows/benchmark.ts) as the `fabric_exec` program. Do not wrap, retype, patch, or replace it. Supply the [non-scoring audit request](../validation/fixtures/canary/workflow-request.json) through `strings.request`.

Write the tool response, type-check result, request bytes/digest, trace/details, phase output, and zero-agent-call assertion under `$RUN_ROOT/fabric-audit/`. A TypeScript diagnostic must occur before any `agents.run` call.

## Runtime capability canaries

Before a consequential route, canary the exact installed runner, transport, provider window, and request path. Preserve hashed source evidence under `$RUN_ROOT/runtime-canaries/`. Required cases are the directly linked runtime request fixtures in `SKILL.md`, covering:

- exact condition loading;
- recursive child dispatch, ownership, delivery, and parent consumption;
- fresh process/session and declared mutable-state reset;
- schedule byte identity and parser round-trip;
- assignment/start/terminal publication;
- blind-map allowlist and private-map isolation;
- primary-source grading;
- requested/resolved/observed identity;
- direct/subtree token and cost attribution;
- interrupted-wave deterministic resume;
- false-complete refusal;
- actual prelaunch failure and bounded settlement.

A canary receipt cannot attest itself. In an authorized Pi session with the installed Fabric runtime loaded, execute the exact UTF-8 bytes of the checked-in [production harness](../workflows/runtime_canaries.ts) as the `fabric_exec` program. Do not wrap or amend it. Supply these `fabric_exec` arguments, where `code` is the byte-for-byte file content rather than the placeholder shown here:

```json
{
  "code": "<exact UTF-8 bytes of workflows/runtime_canaries.ts>",
  "payloads": {
    "request": "{\"schema_version\":1,\"run_root\":\"/home/balauru/.pi-profiles/fabric/skill-evaluations/agent-benchmarking/<run-id>\"}"
  },
  "agentBudget": 16,
  "timeoutMs": 3600000
}
```

Model output is never a runtime attestation. Blind isolation is derived from the archived exact agent request, the exact three-field public key set, absence of private fields/values, and zero tool access. Fresh parent isolation is derived from distinct returned agent, session, process/log, and cwd identities plus the actual bytes of a uniquely named sentinel in each workspace and absence of the sibling sentinel path. Ambiguous model booleans do not participate in either decision.

The `<run-id>` path must not exist. The harness creates it, invokes the public `agents.run` interface for every directly linked `*.request.json` fixture, validates each returned `logFile`, streams the raw JSONL through `deep_stage.py archive`, scans only the archived bytes locally, and runs deterministic projection through `generate_canary_receipts.py`. It never transports a full log through `agents.log` or a bounded Fabric result. Its production CLI rejects fake adapters; `tests/fake_canary_adapter.py` is injectable only with the explicit test flag. A missing result, unsupported returned path, absent runtime event, or unproved derived fact stops generation without a passed receipt. The intentional startup-failure case is the sole missing-log exception: the harness publishes the failed terminal plus `{"valid":false,"reason":"prelaunch failure produced no log","evidence":[]}`, records the returned path as confirmed absent, and continues without retrying that run. The harness never invokes or substitutes for `runBenchmarkStage`. If a harness invocation stops after an agent settled but before its capture committed, rerun the same exact checked-in harness with `resume: true` and `recovered_runs`, naming the settled agent ID from the failed tool receipt. Existing `capture.json` cases are skipped and never retried; recovery uses `agents.status`, validates the exact fixed task and returned `/tmp/pi-fabric-runs-*` path, then archives those original bytes through the same artifact-store route. Example request:

```json
{"schema_version":1,"run_root":"/home/balauru/.pi-profiles/fabric/skill-evaluations/agent-benchmarking/<run-id>","resume":true,"recovered_runs":[{"canary_id":"mechanism-nested","purpose":"parent-1","agent_id":"<settled-id>"}]}
```

After the Fabric call returns `status: passed`, independently validate the generated directory:

```sh
python -B scripts/run_canaries.py \
  --fixture-root validation/fixtures/canary \
  --receipt-root "$RUN_ROOT/runtime-canaries/receipts" \
  > "$RUN_ROOT/runtime-canaries-summary.json"
```

Every receipt has `non_scoring: true` and `scored_attempt_ids: []`. Captures, results, events, logs, evidence, and receipts stay under the new external run root. Also record a capability matrix for runtime/package versions, effective agent-call cap, stage-selectable Analyze, recursive cwd behavior, native-log access, output bounds, and global descendant accounting. A missing required capability yields `unsupported`; do not author a bespoke workflow.

## Analyze stage regression

A production-shaped disposable packet must run the exact fixed deep runner through an explicit zero-call `prepare`, then bound `judge` call plans, bound `adjudicate` call plans, and `finalize`:

- every batch contains exact predeclared IDs and remains below the effective call cap with reserved headroom;
- recursive descendants consume global reservations;
- each assignment has one typed terminal and null/missing results cannot complete a batch;
- each checkpoint is last and binds input/output digests and active revisions;
- resume skips terminals and blocks assigned-without-terminal IDs;
- mechanism evidence exists for every terminal, including explicit invalid/missing projections;
- telemetry derivatives identify schema and transformer versions;
- revision planning records added/changed/removed paths against the prior seal;
- finalize is deterministic and adds zero model calls.

The maintained non-scoring release regression uses `scripts/build_p217_replay.py` and `scripts/run_p217_replay.mjs`. A full packet contains six measured terminals, one 96-call judge wave, 18 adjudication calls, and the exact frozen identities `judge-01@v1` through `judge-16@v1` plus `adjudicator-01@v1` through `adjudicator-03@v1`. The builder also creates and archives a deterministic log larger than 2 MiB through the production `deep_stage.py archive` path. The runner must report exactly 114 model calls and must never retry a measured, judge, or adjudication call.

```sh
PACKET="$RUN_ROOT/p2.17-replay"
python -B scripts/build_p217_replay.py --root "$PACKET"
node scripts/run_p217_replay.mjs \
  --workflow workflows/benchmark.ts \
  --request "$PACKET/replay/requests/prepare.json" \
  --fabric-root /home/balauru/.pi-profiles/fabric/npm/node_modules/pi-fabric \
  > "$PACKET/replay/host-receipt.json"
```

Pass all 19 `--expected-grader ID@VERSION` values to `scripts/final_integrity.py --package-only --packet-root "$PACKET" --require-graders` for the release gate. This independently requires the exact 114 sealed grade artifacts, strict reconciliation, a committed analysis transaction, the final published commit, all three delta seals, and the source-bound large-log archive.

Run `scripts/probe_deep_runner.mjs` against a fresh disposable packet for each scenario `blind-map-publication-failpoint`, `runtime-capability-tamper`, `protected-state-conflict`, `mechanism-totality`, `resume-finalize-modes`, and `analysis-interruption-matrix`. Consume each builder receipt’s declared `request_path`; build the matrix packet with `--pre-finalize-fixture`. The first three prove transactional map repair and zero-call prelaunch refusal; `mechanism-totality` uses `--execute-mechanism-fixture` to exercise every mechanism projection branch; `resume-finalize-modes` uses `--execute-resume-fixture` to expose `skip`, `run`, `refuse-replay`, and `deterministic-repair-only` through the fixed Execute runner with zero agent calls, then proves a production-shaped Analyze finalize commits with zero calls; the matrix interrupts after every Analyze publication step and proves deterministic repair without model calls. These probes and replay receipts remain non-scoring external validation artifacts.

If the bundled schema/runner cannot express stage selection or recursive attempt adaptation, this regression records `unsupported` and no grading starts.

## Protected-state gate

Capture protected and unrelated-state baselines before any runtime canary. Run final integrity into the external receipt root:

```sh
python -B scripts/final_integrity.py \
  --root . \
  --protected-baseline validation/fixtures/baselines/protected-packet.json \
  --project-baseline validation/fixtures/baselines/project-status.txt \
  > "$RUN_ROOT/final-integrity.json"
```

A protected mismatch is `blocked`, never cleaned to manufacture a pass. Concurrent unrelated changes are reported as `uncheckable` or `blocked` according to the frozen policy. Preserve exact deltas and distinguish target-owned, runtime-owned, unrelated, and unknown changes.

## Acceptance gate

Completion requires:

1. every schema and fixture class is classified correctly;
2. schedules, seals, write-once publication, blind maps, lifecycle, telemetry, paired analysis, and final integrity fail closed;
3. exact fixed-runner type-check and dry-run succeed with zero measured calls;
4. every required capability is supported and source-bound canaries pass;
5. Analyze stage and deterministic resume/finalize regressions pass within the effective call cap;
6. mechanism evidence is total and global call/token/cost accounting reconciles;
7. skill validation reports every support file directly reachable from `SKILL.md`;
8. protected state matches its baseline and cleanup affects only owned temporary paths.

Return `blocked`, `unsupported`, `inconclusive`, or `failed` for any unmet gate. State the exact blocker, preserved evidence, and smallest targeted follow-up. A deterministic pass proves encoded contracts only; a runtime canary proves only the pinned versions, request, runner, provider window, and fixture.
