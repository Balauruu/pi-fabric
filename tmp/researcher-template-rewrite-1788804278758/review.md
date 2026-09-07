**Contradiction**

- `SKILL.md:63` grants the planner write authority for `streams/discovery.md`, but `SKILL.md:51` reserves every `streams/*` document to workflow code only. It also conflicts with `references/stream-contracts.md:49`, which permits planner writes only to `RESEARCH.md` and requires discovery notes to return for workflow persistence. Remove planner write authority for the stream; reserve it workflow-only and persist the returned note there.

**Boundary checks**

| Boundary | Status |
|---|---|
| `researcher.md` web-only request, exact model/thinking/Pi/extensions/recursive/tools settings, no cwd/write/edit | PASS |
| Research and gap repair use the canonical template | PASS |
| Full returned research Markdown is persisted in-program; corpus stays out of Main | PASS |
| Separate planner, verifier, synthesizer, validator, and optional collector responsibilities | FAIL |
| Web researchers neither save/read files nor return path-only handoffs | PASS |
| No-write behavior is in-memory and honest | PASS |
| Native failures with useful text and empty results are handled honestly | PASS |
| Storage failures are surfaced without false saved paths | PASS |
| Interruptions and unrecoverable work are handled honestly | PASS |