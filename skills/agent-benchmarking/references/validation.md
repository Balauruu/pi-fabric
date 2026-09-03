# Validation

Use this acceptance plan for the distributable package. Schemas and scripts own executable semantics. Fixtures are indexed by the [fixture catalog](../validation/fixtures/fixture-catalog.json) and runtime development cases by the [synthetic canary catalog](../validation/fixtures/canary/synthetic-catalog.json).

## Receipt policy

Generated receipts, model outputs, Fabric traces, native logs, and oversized captures must not be written under this skill. For every validation run, choose a new revisioned external directory:

```sh
ROOT=/home/balauru/.pi-profiles/fabric/skills/agent-benchmarking
RUN_ROOT=/home/balauru/.pi-profiles/fabric/skill-evaluations/agent-benchmarking/<run-id>
test ! -e "$RUN_ROOT"
mkdir -p "$RUN_ROOT"
cd "$ROOT"
```

Set `<run-id>` before execution. Never reuse or overwrite it. Historical receipts moved to `skill-evaluations/agent-benchmarking/legacy-2026-09-02/validation/receipts`; the immutable move record is the [migration receipt](evidence/migration-cleanup.md). Runtime canaries are non-scoring, use only isolated development fixtures, and never read, repair, run, or modify an existing scored packet.

## Static acceptance

```sh
python -B -m unittest discover -s tests -p 'test_helpers.py' -v \
  > "$RUN_ROOT/deterministic-tests.txt" 2>&1

python -B scripts/validate_contracts.py --all-schemas \
  > "$RUN_ROOT/contract-validation.txt"

{
  for path in scripts/*.py; do python -B "$path" --help; done
  python -B - <<'PY'
from pathlib import Path
for path in sorted([*Path('scripts').glob('*.py'), Path('tests/test_helpers.py')]):
    compile(path.read_bytes(), str(path), 'exec')
PY
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

A canary receipt cannot attest itself. `run_canaries.py` must derive each fact from named regular evidence files, verify byte lengths/digests and exact closed identities, and reject missing, duplicate, or extra entries:

```sh
python -B scripts/run_canaries.py \
  --fixture-root validation/fixtures/canary \
  --receipt-root "$RUN_ROOT/runtime-canaries/receipts" \
  > "$RUN_ROOT/runtime-canaries-summary.json"
```

Also record a capability matrix for runtime/package versions, effective agent-call cap, stage-selectable Analyze, recursive cwd behavior, native-log access, output bounds, and global descendant accounting. A missing required capability yields `unsupported`; do not author a bespoke workflow.

## Analyze stage regression

A production-shaped disposable packet must prove zero-call preparation within the first `judge` transaction, then bound `judge` call plans, bound `adjudicate` call plans, and `finalize`:

- every batch contains exact predeclared IDs and remains below the effective call cap with reserved headroom;
- recursive descendants consume global reservations;
- each assignment has one typed terminal and null/missing results cannot complete a batch;
- each checkpoint is last and binds input/output digests and active revisions;
- resume skips terminals and blocks assigned-without-terminal IDs;
- mechanism evidence exists for every terminal, including explicit invalid/missing projections;
- telemetry derivatives identify schema and transformer versions;
- revision planning records added/changed/removed paths against the prior seal;
- finalize is deterministic and adds zero model calls.

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
