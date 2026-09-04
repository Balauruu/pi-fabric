# ADR 0002: Domain, evaluator, and numeric authority

Status: Accepted through the locally certified Phase 5 held-out seam

## Decision

The normalized terms in `src/domain/types.ts` are package vocabulary. Legal run, exploration, hypothesis, attempt, effect, gate, promotion, authorization, report, and cleanup edges are explicit tables in `src/domain/state-machines.ts`; all undeclared pairs are illegal.

Canonical values are JSON strings parsed directly to `(coefficient, scale)` integers. Binary floating point is never used for scoring. Trial values are quantized with round-half-to-even, stored in signed integer quantum units, and aggregated by exact single or odd-count median selection. Spread equality passes tolerance. Maximize/minimize comparison normalizes direction and includes equality at the minimum-improvement boundary.

Only an `Evaluator` implementation creates `EvaluationCertificateV1`. Strict protocol parsing accepts one bounded, single-line JSON record and validates closed schema plus run, contract, epoch, OID, evaluator, parser, split, metric, and unit identity. Worker-reported values are retained separately as informational claims.

Changing any evaluation-policy input produces a new epoch digest. The foundation uses the full immutable contract digest as its epoch digest; future contract evolution must preserve the explicit epoch field set from the authoritative plan.

## Rejection policy

Malformed decimals, multiple records, numeric JSON values, identity mismatch, unknown fields, nondeterministic spread, and incompatible baselines do not produce valid ranking evidence. Fixture certificates have `trust: fixture` and cannot support production promotion.

## Phase 3 implementation

`ConfinedProcessEvaluator` invokes only an already-certified containment adapter. It rejects noncanonical aggregation counts, structured-output bounds above 1 MiB, timeout, cancellation, oversize, malformed/multiple JSONL, unknown fields/artifacts, identity mismatch, digest conflict, nondeterministic spread, and incompatible exact bindings. Logs are path-redacted and retained under a 1 MiB aggregate bound; artifact references are digest-only and deduplicated under a 512-record bound.

## Phase 5 held-out implementation

`HeldOutIsolationAdapter` rejects held-out work unless the active B8 certificate digest, canonical input digest, evaluator split, data root, and optional credential root all match. Worker execution never receives held-out paths or capabilities. Held-out baseline and candidate certificates bind the exact detached merge OID and identical evaluator version, parser, configuration, environment, executable, seed sequence, trial order/count, aggregation, quantum, tolerance, containment policy/certificate, held-out certificate, and strict protocol. Protected-manifest identity must also match. Absence or mismatch disables promotion before Git mutation. This retained local evidence is independent of the separately retained current-host B1 model/runtime compatibility evidence.
