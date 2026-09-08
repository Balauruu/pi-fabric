# PR13 hard cutover

Status: **hard-cutover gates, mechanical audit and independent final follow-up review PASS; published as `d5e6da673ec3ecff4b1d528fa61393a63a68a49c` with exact origin equality verified.** PR12 was published at `b509ae7ccb1db2da02272d9eb9d304267c59119f`, verified equal to origin before this work.

## Acceptance checks

- A18: fresh source install and actual Pi reload need no legacy history, certificate, bridge, emitted directory or migration. Legacy-shaped fixture databases refuse reads and owner preparation without byte/inventory changes.
- A19: delete package-owned v1 source, old launchers, certification fixtures, Phase 7/build helpers, writable browser and obsolete tests/docs. Preserve dependencies and actual user/runtime artifacts. Audit all reachable imports, package files, scripts and current browser assets.
- A22: unchanged 21 ordinary refs plus one acquisition-only scoped lifetime capability, native10, one configured application, one public skill, three internal roles and eleven documented skill dispositions.
- A30: all 43 accepted production modules stay byte-identical; source/clean-installed browser and all three example packs pass. Only current source-loaded code/assets ship.

## Useful retained contracts

The old 92-test v1 lane is retired, not maintained as a compatibility runtime. Fixed-scale arithmetic/parser cases now use current `measurement`; stash/custom-ref/sibling-worktree observations now exercise `Workspace`; export-file/receipt gaps now exercise `ResearchService`. Existing v2 tests retain exact comparison, dirty source, CAS recovery, transaction contention, duplicate native ingestion, unknown cleanup, policy/review and read-only artifacts. No signed fingerprint, half-even v1 quantizer, authorization protocol or report-before-cleanup requirement is reintroduced.

The tracked-only deletion manifest and old Git blob identities are retained under `.runtime/pr13-gates/deletion-plan.json`. Untracked runtime data, keys and artifacts are not deletion candidates. Historical milestone evidence remains repository-only and explicitly refers to its historical source snapshot; it is not a current execution/release gate.

## Post-review completion

All retained native paths were reexecuted against the cutover: PR2–PR10 **8/20/21/9/21/5/42/13/4**, plus PR11 nine and PR12 thirty-five, **187 total**. Their fresh `native-pr2` through `native-pr10` logs/exits are mandatory in the audit, not pre-cutover fallback evidence. A12 ran in isolation: **2038/3597 ms = 56.66%**, all warmed parallel waves overlap, with unchanged workloads and 80% oracle. Native integration/fixture bytes are checked against the published PR12 base.

The first independent review supported runtime deletion but required repairing broken consumer links and restoring useful configuration details. [Current research configuration](research-configuration.md) now ships material setup, research controls/budgets, exact grounding catalog/schema requirements and evaluator/preset guidance. The stable example-guide grounding anchor is restored. The audit validates every local Markdown target and anchor in current packed and actual installed docs, with a negative regression for missing files/anchors and existing-but-unshipped history. Earlier review findings remain at `.runtime/pr13-gates/initial-review.md`.

## Independent final review

Initial review `151a092cfa994545ba38417dee7d9752` supported the runtime cutover and required the documentation repair described above. Follow-up reviewer `0442aec9f0434f98b6870d275a9fc107` returned **PASS, no remaining required fixes** after checking the restored meaningful configuration guidance, source/installed local-link and anchor checks, exact packaged bytes and all required fresh native exits. Retained verdicts: `.runtime/pr13-gates/initial-review.md` and `final-review.md`. These are read-only source/evidence reviews, not additional test runs. Final documentation-only status edits are followed by another exact clean-package/audit check.

## Reproduce the complete gate

From the development checkout, after installing declared dependencies and the browser used by the native tests, retain each natural exit. Do not run another test workload during A12:

```sh
set -e
mkdir -p .runtime/pr13-gates
run_gate() {
  if npm run "$1" > ".runtime/pr13-gates/$2.log" 2>&1; then result=0; else result=$?; fi
  printf '%s\n' "$result" > ".runtime/pr13-gates/$2.exit"
  return "$result"
}
run_gate check normal
run_gate test:pr13 targeted
run_gate test:pr7:e2e native-pr7
for pr in 2 3 4 5 6 8 9 10; do
  run_gate "test:pr${pr}:e2e" "native-pr${pr}"
done
run_gate test:pr13:e2e native
run_gate test:source:package package-final
run_gate audit:pr13 audit
```

`test:pr13:e2e` is the PR12 browser/lifetime plus PR11 pack lane; the complete audit separately requires every preceding native lane above. Development Git comparisons prove cutover preservation, not installed-runtime prerequisites.

## Executed current gates

All test groups completed naturally with zero failures, cancellations, skips or todos. Logs and explicit exit files are under `.runtime/pr13-gates/`.

| Command | Result | Evidence prefix |
| --- | --- | --- |
| `npm run check` | **308/308**, groups 9/36/121/48/94; both no-emit typechecks | `normal` |
| `npm run test:pr13` | **9/9** | `targeted` |
| `npm run test:pr13:e2e` | **35/35** full source/installed browser/lifetime plus **9/9** source/installed example packs | `native` |
| Final `npm run test:source:package` | **9/9**, including actual isolated Pi source reload | `package-final`, `install.json` |
| `npm run audit:pr13` | **PASS** | `audit`, `audit.json` |

The final package lane was rerun after removing stale commands from the shipped ledger. Its complete previous contents were copied to repository-only `docs/milestone-ledger-history.md`; all 13 historical milestone evidence documents remain with explicit historical labels. No evidence was erased simply for naming old scripts. The audit distinguishes current source/installed instructions from repository-only history.

The audit proves **284 tracked deletions**, **43 unchanged production modules**, **82 packed files**, unchanged dependencies/lockfile, 21 ordinary refs plus one scoped capability, ten native requirements, one public skill, three roles, eleven upstream dispositions and all three example packs. It resolves every production import and registered test script, checks removed architecture/build/browser paths, rereads the actual passive clean install and matches all current source/asset bytes in the native installed root. Current source-only normal coverage is 299 retained v2 tests plus nine new cutover/ported-contract/documentation cases, not the obsolete 92-test legacy runtime. Targeted/package counts overlap normal coverage.

The mechanical test was recorded red before deletion (`before-deletion.log`/`.exit`). A final audit caught an old historical command in the shipped ledger; preserving that ledger separately and publishing current-only instructions repaired the packaging defect. Existing v2 production modules needed no changes.

**Limits:** deterministic local experiments, not paid/scientific benchmark validation. Approved root-application/whole-Pi lifetime limits remain; no universal owner-only or dependency/provider-replacement theorem. Every retained PR2–PR10 native lane and unchanged A12 were rerun after deletion. The fresh A12 ratio is 2038/3597 ms (56.66%), with actual overlap and unchanged workload/80% oracle. Test-only tracked certification payloads are removed as specified; actual ignored runtime data, keys and artifacts are untouched. Applicable attribution text and unrelated dependency defaults remain. Independent final follow-up review PASS is recorded above. PR13 publication at `d5e6da673ec3ecff4b1d528fa61393a63a68a49c` was subsequently observed through ordinary push and exact remote equality.
