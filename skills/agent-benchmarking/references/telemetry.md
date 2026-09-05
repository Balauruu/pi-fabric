# Telemetry

Preserve the complete JSON-compatible native Fabric result for every measured, retry, judge, and adjudicator call. Measurement is a projection of that native evidence, not a trust decision based on model prose or requested settings.

## Identity and settings

Keep requested condition settings separate from fields actually returned by the runtime/provider. Retain returned runner/model/session/settings fields when present. Contradictory aliases are a limitation or invalid measurement, never silently resolved. Missing observed identity stays unknown.

## Tokens, cost, and time

Represent each field as observed numeric zero, observed positive value, or unavailable. Keep input, output, cache-read, cache-write, reasoning, and total tokens distinct. Direct and inclusive usage are alternatives and must not be added. Provider-reported cost stays separate from any local estimate, with currency and rate basis stated.

Use runtime/provider timestamps and duration fields only when their semantics are known. Do not reconstruct precise execution time from file modification time. Makespan, per-attempt latency, and throughput are different summaries.

## Recursive ownership

A child has at most one declared parent/owner. Report parent-direct, parent-inclusive, child-direct, and unknown-scope usage separately. Compute a unique subtree total only when direct semantics and ownership are complete. Never add inclusive parent usage to child usage. Recursive descendant observation is not enforcement of a hard tree call cap.

## Roles and failures

Aggregate measured, retry, judge, adjudicator, and optional smoke roles separately before any overall total. Grade traffic cannot be hidden inside measured efficiency. Failed, cancelled, timed-out, and malformed native returns remain in denominators with unavailable metrics rather than fabricated zeros.

When `logFile` is an available absolute local file, the lifecycle streams an immutable copy next to the work record and records relative path and byte count. Missing, non-absolute, unreadable, or conflicting logs remain explicitly unavailable. No source attestation, software fingerprint, or runtime-version admission is required.
