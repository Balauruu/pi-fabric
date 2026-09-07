# Research workflow revision results

## Changes

Updated only the five files under skills/fabric-research. Preserved the prior architecture-decision research run and pre-existing working-tree changes. Baseline skill copy, fixtures, checks and evaluation evidence are outside the installed skill in this directory.

- Main now frames/preflights/builds a single code-held workflow, rather than performing the investigation beside workers.
- Research, independent verification, bounded repair/reverification, synthesis and independent report validation are worker phases.
- Evidence requirements moved to the worker-owned stream contract; methodological gates remain intact.
- state.json is the sole workflow-owned execution ledger. RESEARCH ownership transfers by phase. Optional verification shards have reserved support/verification paths and one reconciler.
- No-write mode has explicit in-program role handoffs. Unavailable delegation and exhausted limits do not route substantive research back to Main.
- Final validator must produce the full bounded outcome contract, including actual conclusion, citations, per-question dispositions and limitations. Main relays this without reading the corpus.

## Criterion evidence

| Criterion | Result and evidence |
| --- | --- |
| C1 Main orchestration boundary | Observed in fixture run a47e66ab790d4abb82fcd9d871ba7b0d: actual-main-calls.json shows one program for Research -> Verify evidence -> Synthesize report -> Validate report. Main did not read REPORT or streams. Required user-supplied fixture reads occurred in preflight, but only byte lengths returned to Main. Later structure-notification reads were unrelated evaluator files, not research corpus. |
| C2 Phase execution | Five successful native launches in runs/research-workflow-fixture-1788800274493/state.json: two researchers, verifier, synthesizer, validator. Research waits were concurrent. No evidence repair was exercised because the authorized synthetic corpus was complete; a bounded report-correction branch existed but was not taken. Discovery and sharding remain static/simulated checks, not runtime proof. |
| C3 Evidence and compact outcome | Actual REPORT rejects the 90% vs 80% ranking because tasks, languages, models and attempts differ. It preserves operational unknowns and source support. Initial smoke output omitted conclusion/flattened coverage despite saved report quality, so acceptance was not claimed for that boundary. Tightened final schema/forwarding requirement; fresh terminal recovery dde932f97a2b432ba25a70fe8abde2ee then returned actual conclusion and Q1-Q4 qualified/Q5 blocked. check-outcome.mjs passes on terminal-outcome.json. |
| C4 Ownership/recovery | Five distinct native IDs and serialized state with phase ownership observed. Terminal regression resumed only validation with one worker, without rerunning research/synthesis. Indeterminate-launch and crash recovery are simulated/static only. Ownership is explicitly prompt policy, not a host-enforced filesystem sandbox. |
| C5 Blocked/partial behavior | Static contract and fresh simulated model-absent/exact-count branches pass. No injected live outage or budget-exhaustion test was run. Model catalog directly verified tools.models() exposes provider, id and key; clarified exact .key comparison after reviewer incorrectly inferred it was absent from short .id values. |
| C6 Narrow/no-write | Fresh simulated branches pass after moving no-write overrides before file operations in all role references. Narrow lookup remains direct; substantive no-write stays delegated. No live no-write or last30days engine execution was run. |
| C7 Registration/references | Standalone validator passes: all five files reachable. Actual Pi loadSkillsFromDir loads fabric-research with zero diagnostics; disableModelInvocation=true and formatSkillsForPrompt excludes it. Exact manual registration preserved. Static ownership and link checks pass; git diff --check passes. |

## Review-driven corrections

Independent review 6e821a082a134c488ed538e5af69b690 identified planner/no-write contradictions. Corrected explicit planner RESEARCH authority and reserved discovery stream, added first-class storage-mode rules, clarified model key field and best-effort write boundary. Fresh review 0f59fb3d8ee145dab35b69f5e67d53fd passed those branches and identified an optional verification-shard namespace omission; added explicit support/verification/<shard>.md ownership and reservation. The final handoff defect was found by inspecting the actual executed outer return, not by report existence or worker status.

## Reproducible checks

From /home/balauru/.pi-profiles/fabric:

```sh
python -B skills/ultra-skill-creator/scripts/validate_skill.py skills/fabric-research
node tmp/research-workflow-revision-1788799764350/check-pi-loader.mjs
node tmp/research-workflow-revision-1788799764350/check-contract.mjs skills/fabric-research
node tmp/research-workflow-revision-1788799764350/check-outcome.mjs tmp/research-workflow-revision-1788799764350/terminal-outcome.json
git diff --check -- skills/fabric-research
```

The contract check against baseline/fabric-research is intentionally red on the Main-heavy ownership rules while retaining its valid manual registration, links and evidence gates.

## Limits and stop reason

Original broad web research was not replayed. This is one bounded fixture-backed end-to-end smoke run plus a targeted one-worker terminal regression and static/simulated edge checks, not a repeated performance benchmark or proof of every runtime branch. No claim that Main can never compact: the change removes routine source-corpus ingestion from Main by contract and demonstrated phase ownership. A attempted memory compaction query resolved zero eligible sessions for the native process identifier, so it is not evidence of zero compactions. Stop: requested ownership rewrite is implemented, observed handoff regression repaired, targeted runtime and static checks pass, and unexecuted edge cases are explicitly scoped.
