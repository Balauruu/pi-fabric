# Fresh bounded static behavior recheck

**Result: FAIL - one ownership/path specification gap.** These are simulated branch tests only, not execution proof.

## Simulated branches

| Branch | Exact authority | Next phase | Static result |
| --- | --- | --- | --- |
| 1. Unclear decomposition | Main reads runtime/model inventory and writes only initial `RESEARCH.md` brief, in-progress `REPORT.md`, and `state.json`. Planner reads its brief/stream contract and permitted sources; writes only exclusive `RESEARCH.md` plan/index and `streams/discovery.md`; it never writes `state.json`, `REPORT.md`, or sibling streams. | Program validates the returned plan, reservations, safe paths, and downstream capacity, then launches research fan-out. | **PASS.** `SKILL.md:16,40,57`; `stream-contracts.md:11`. The initial Main write is explicitly before the subsequent ownership transfers. |
| 2. Substantive no-write research | Main reads runtime/model inventory and retains reservations in program memory. Discovery/research/verifier/synthesizer/validator read role inputs, permitted sources, and complete in-memory upstream evidence; **no role has filesystem write/edit authority or saved-path output**. | Validator returns in-memory acceptance/corrections; final validated report returns inline and Main relays it as unsaved. | **PASS.** `SKILL.md:51`; `stream-contracts.md:7`; `synthesis-and-reporting.md:7,102`; `runtime.md:31`. The no-write clauses are a scoped exception to persisted-document instructions, not a Main research handoff. |
| 3. Required model absent | Main reads `tools.models()` and compares `entry.key` exactly to `openai-codex/gpt-5.6-terra`; it must not use `.id` as the provider-qualified key. No worker is launched and no dossier/state artifact is required. | Return **delegation blocked** with the missing capability; do not substitute a model or conduct substantive Main-side research. | **PASS.** `runtime.md:24` contains the required `.key === "openai-codex/gpt-5.6-terra"` comparison and explicitly rejects `.id` inference/substitution. |
| 4. Verification sharded across workers | Each shard reads its assigned streams/supporting files and may write only its own verification note; it must not write `RESEARCH.md` or `state.json`. The reconciliation worker reads shard notes/dispositions and alone writes `RESEARCH.md`. Main reads no corpus. | Program dispatches only bounded repair/reverification for decision-changing gaps; otherwise synthesis. | **FAIL.** `SKILL.md:64` and `synthesis-and-reporting.md:11` require per-shard verification-note paths, but the ownership table/layout only defines researcher-owned `streams/<owned-question>.md` (`SKILL.md:45`) and no verification-note namespace/owner. Exact safe path, reservation, and writer authority therefore cannot be checked. |

## Action required

Define a dedicated, reserved verification-note namespace and ownership, for example `verification/<shard>.md` owned by its assigned verification shard, in the dossier layout and ownership table. Require the workflow to reserve/validate each path before launch, make the reconciliation worker read those notes, and preserve the existing no-write equivalent as in-memory shard outputs. This resolves the sharded branch without overloading researcher-owned streams.

## Cross-cutting checks

- **No Main corpus/repair/report leakage: PASS.** `SKILL.md:16,64,76` forbids Main discovery, corpus rereads, direct repair, report writing, and shard-corpus pullback; `synthesis-and-reporting.md:17,23,102` keeps repair dispatch, synthesis reads, and validation off Main.
- **In-memory handoffs: PASS.** The no-write rules explicitly require substantive worker-to-worker evidence within the program and prohibit outer saved-path fiction (`stream-contracts.md:7`; `synthesis-and-reporting.md:7`).
- **Hard-sandbox claim: PASS.** No false host-enforcement guarantee is made: `runtime.md:20` says tool allowlists/cwd are not filesystem sandboxes and document ownership is prompt policy; `stream-contracts.md:28` repeats that an allowlist is not filesystem isolation.
