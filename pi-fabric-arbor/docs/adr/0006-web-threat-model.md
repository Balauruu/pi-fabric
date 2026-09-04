# ADR 0006: Web threat model and durable intent boundary

Status: Schema and application boundary accepted; server certification blocked by B9

## Decision

Browser input is a closed `WebIntentV1`, submitted with server-issued session and idempotency key after CSRF and Origin validation. Submission only appends an inbox record. A matching duplicate is immutable; stale intent is retained as `REJECTED_STALE`. Only the admitted driver may claim an intent, and only while the reducer reports a yield. Promotion and rollback requests remain requests.

All read projections are bounded and reconstructed from SQLite events. Cursor sequence is durable; reconnect reads after the last sequence and never treats browser state as authority. Compare, Metrics, Resources, Report, and Contract projections share the same application query path as headless clients.

Projection and report code redact secret-shaped tokens, sensitive fields, raw Unix and Windows host paths, and file URIs. Artifact access uses opaque IDs, digest verification, bounded reads, and symlink rejection.

## Required server controls not yet certified

A shipping server must bind only loopback, use one-time fragment bootstrap, `HttpOnly` and `SameSite=Strict` cookies, per-mutation CSRF, exact Host/Origin checks, strict CSP, `nosniff`, no third parties, bounded body/rate/stream/page/diff/log limits, immutable assets, text-only untrusted output, catch-up/reset semantics, and browser/console/network/screenshot leakage tests. `serve` exits unavailable until that implementation and B9 evidence exist.
