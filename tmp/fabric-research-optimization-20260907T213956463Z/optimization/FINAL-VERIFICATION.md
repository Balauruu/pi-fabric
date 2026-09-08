# Final read-only verification

## Verdict

**NOT READY for a stronger completion claim.** Installed-package integrity is **PASS**. The five rejected candidates are a verified local controller streak, but the record does **not** establish five independent incumbent-relative no-regression failures. A representative direct no-write/exact-count walkthrough was not rerun in this verification. No production file was edited.

## Scope and method

- Shell preflight confirmed `pwd` and the exact profile root `/home/balauru/.pi-profiles/fabric`; target root is `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z`.
- Read the installed six-file package, rev-04 comparison package, `OPTIMIZATION-LOOP.json`, reviews 001–005, final live/recheck evidence, Pi `skills.md`, and the complete authoring/evaluation guidance. No delegation, profile/config/install change, or candidate optimization was performed.
- The installed/requested model policy is `openai-codex/gpt-5.6-terra`, `medium`; iteration-005 native receipts record that exact model/thinking, extensions enabled, and `recursive: false`.

## Installed integrity — PASS

| Check | Result | Evidence |
| --- | --- | --- |
| Six active files byte-equal rev-04 | PASS | `cmp` clean for all six. SHA-256 pairs are identical: `SKILL.md` `b5ea0b…b4c8`; `researcher.md` `558e7e…809f`; `runtime.md` `c45fac…d6c8`; `stream-contracts.md` `6c919e…3874`; `synthesis-and-reporting.md` `11287a…06f7`; `last30days.md` `f73aa3…8420`. |
| Frontmatter and loader semantics | PASS, documented scope | `SKILL.md` declares `name: fabric-research`, nonempty description, and `disable-model-invocation: true`. Pi `docs/skills.md` documents that this setting hides the skill from the system prompt and requires manual `/skill:name` use. The documented CLI exposes no skill-discovery/loader inspection API, so no stronger runtime-loader assertion was available without starting a separate Pi session. |
| Local references | PASS | Seven relative links resolve, zero missing. |
| Report topology and outcome paths | PASS | `RESEARCH.md` is sole authoritative report, synthesizer-only. `REPORT.md` occurs only as an explicit prohibition/diagnostic non-substitute. No `Sol` policy found. `High/medium/low` occurs only as optional confidence shorthand, not a gate or policy. |
| Source/evidence limits | PASS | Explicit source-quality, quantity, origin-coverage, access/budget, uncertainty, comparability and transfer limits are present in `references/synthesis-and-reporting.md` and `references/last30days.md`. |
| Canonical/ownership contracts | PASS | Runtime's full-field equality requires ID, exact question, ordered inclusions, report contribution and decision context, with duplicate rejection. Direct test accepted canonical data and rejected changed `decisionContext` and duplicate IDs. Serialized `state.json`, pre-reserved single-owner paths, partial preservation, no-write in-memory handling, and task-wide exact-count/allowance rules are explicit. |

## Direct readback regression evidence

Real `pi.read` was used, not simulated.

| Case | Result |
| --- | --- |
| >50 KB dense multi-line file | PASS: 95,400 bytes/900 newline-terminated lines. First page reports lines 1–483 of 901 and continuation offset 484. The offset-484 page completes. Existing unchanged rev-04 fingerprint reports exact 422,100-character reconstruction over nine continuations. |
| Exact 800-line boundary | PASS: first page returns `1 more lines` at offset 801; actual offset-801 read is the final empty physical line. Existing rev-04 probe records exact equality, 7,092 chars. |
| Unicode and no trailing newline | PASS: `終-1` through `終-800` page then actual offset-801 returns `終-801` with no newline. Existing rev-04 probe records equality. |
| Trailing blanks | PASS: actual output is `first\nsecond\n\n\n`. |
| Literal marker text | PASS: actual marker-shaped source line is returned as data with no continuation interpretation. |
| >50 KB one physical line | PASS as an explicit blocker: actual `pi.read` returns the 58.6 KB line-limit message, not data. The installed contract requires honest persistence failure. |

The pre-existing rev-04 probe fingerprint is `candidates/rev-04/checks-readback-probes.json`; the installed hashes above prove this unchanged path is the installed path.

**Not directly rerun:** a full representative workflow no-write/exact-count launch-accounting walkthrough. Existing mechanical checks record `noWrite: true` and static/accounting checks, but that is lower-level evidence, not a fresh end-to-end walkthrough.

## Stopping evidence integrity

- `OPTIMIZATION-LOOP.json` contains exactly five entries, each `accepted: false`, `parity: false`, with streak values 1 through 5 and `practices: null`. This verifies the observed local five-rejection stopping rule only.
- Iterations 001–003 were real Terra-medium changed-path tests and were rejected, but their own reviews chiefly compare to legacy/best and label T2 incomplete/non-fresh. They do **not** independently establish incumbent-relative no-regression failure.
- Iteration 004 is independently recovered after the controller-event crash. Saved tests/reports and `acceptance-recovered.json` establish a real rejection. Its concrete incumbent-relative regressions are T2 loss of repair-versus-independent-restart evidence and T3 loss of source-bound ToolBench/ToolEval, NIST, and release-control material. The crash itself is not counted.
- Iteration 005 has completed Terra-medium receipts, source adjudication, and independent rechecks. T1 improved and was accepted. T2 lacks the incumbent's equal-budget independent-restart control. T3 remains rejected for InjecAgent model/metric context and WebArena 170-template human-comparator context. These are incumbent-relative factual/actionability regressions and independently prevent replacement.
- The matched quality gate remains **FALSE**: T1 and T3 failed matched parity, while T2 passed only with reuse/scope limits. No later accepted candidate changed that. No matched speed or additional-practices phase was run because the quality-first gate remained unmet.

The configured named `source_check` tool was also invoked against the WebArena claim. It returned `unclear`, not confirmation. This does not overturn the recorded primary-source adjudication, but it is an independent current lookup limitation and is not counted as supporting evidence.

## Evidence paths

- Installed package: `/home/balauru/.pi-profiles/fabric/skills/fabric-research/`
- Candidate baseline: `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/candidates/rev-04/`
- Loop: `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/OPTIMIZATION-LOOP.json`
- Matched gate: `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/quality-gate/20260908T/MATCHED-QUALITY.md`
- Fourth recovery: `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/optimization/iteration-004/acceptance-recovered.json`
- Fifth review/rechecks: `/home/balauru/.pi-profiles/fabric/tmp/fabric-research-optimization-20260907T213956463Z/optimization/iteration-005/acceptance-review.md` and `live/T{1,2,3}/support/final-validation-recheck.md`

## Failed or not-ready checks

1. **NOT VERIFIED:** five independent incumbent-relative no-regression failures. Evidence supports the observed five rejected candidates, not that stronger interpretation.
2. **NOT EXECUTED:** a fresh representative no-write/exact-count workflow walkthrough.
3. **NOT VERIFIED as executable compilation:** TypeScript compiler is unavailable (`tsc` not found). The runtime canonical helper and real pagination behavior were directly exercised, but the request-template configuration literal was not separately compiled.
4. **NOT CLAIMED:** full requested quality, universal optimization ceiling, matched speed improvement, or additional-practices outcome.
