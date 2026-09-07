# Researcher template rewrite: results

## Implemented

- Added skills/fabric-research/researcher.md: 42 lines, one typed agents.run/spawn request, one task placeholder, required model/high thinking/Pi/extensions/nonrecursive flags, and exactly web_search/fetch_content/get_search_content/read. No fixed cwd, write/edit/shell/browser/delegation grant, offline persona branch or runtime manual.
- Removed the rejected agents/researcher.md and then the empty agents directory. Its contents were not reused.
- Integrated the canonical request into research and gap-repair dispatch. Workflow code now owns stream destinations and saves returned Markdown verbatim, checking read-back equality and recording native/persistence status separately.
- Updated all four references for full-note returns, return-time persistence, empty/failed/partial handling, no-write mode and distinct planner/verifier/report/collector permissions. Planner authority is explicitly only RESEARCH.md; workflow alone writes discovery streams.
- Preserved original-source links and substantive evidence requirements. Existing unrelated changes and historical research runs were not modified.

## Checks

- Baseline contract check fails because the old skill lacks the canonical request and uses researcher-side persistence.
- Candidate request/options, task placeholder, brevity, ownership and all relative links pass check.mjs. The request shape also type-checked in the actual Fabric invocation.
- The exact persistence fragment extracted from runtime.md passes seven isolated mocked cases: success with verbatim whitespace preservation, failed result with useful text, empty success, empty failure, no-write, write failure, and read-back mismatch. No case leaks note text through its compact receipt or upgrades native status.
- Live web probe d8da3ff40de94fa18f3220af298d736c used the canonical task instructions and four-tool request. It fetched RFC 7538 using extensions.fetch_content, returned a 4,028-character substantive Markdown note with original RFC links, methods/qualifications, counterevidence and Q1/Q2 coverage, and workflow code saved/read back identical text. Actual agent trace shows no file-writing, shell, browser or delegation calls. See web-note.md, web-probe-state.json and web-trace-evidence.json.
- Independent review 6e2a627dc1af49dc854f7f86198f46df passed all boundaries except ambiguous planner write wording. Split that sentence into explicit planner-only RESEARCH authority and workflow-only discovery-stream persistence; added assertions for both.
- Standalone skill validator passes all six reachable files. Actual Pi loader finds one manual fabric-research skill with zero diagnostics; researcher.md is a supporting file, not a second skill. git diff --check passes; agents no longer exists.

## Limits

One bounded live web lookup and direct persistence-fragment tests, not a full replay of the prior broad research workflow or an exhaustive provider/engine evaluation. Last30days engine execution, process-crash recovery and full multi-stage no-write execution were not rerun. Return-only workers intentionally cannot guarantee incremental durable evidence before a result is available. Tool restrictions are not an OS filesystem sandbox.

## Repeat checks

From the profile root:

```sh
node tmp/researcher-template-rewrite-1788804278758/check.mjs skills/fabric-research
node tmp/researcher-template-rewrite-1788804278758/check-loader.mjs
python -B skills/ultra-skill-creator/scripts/validate_skill.py skills/fabric-research
git diff --check -- skills/fabric-research
```
