# Establish the configured report limit

Workflow: wayfinder-ultra
Schema: 1
Label: wayfinder:map
ID: smoke
Mode: planning
Owner: fixture-owner
Status: open
Tracker: local Markdown under this fixture repository
Writer policy: sole authorized worker session local-smoke; Main waits for it before any writes
Artifact roots: docs/wayfinder/smoke/resolutions
Capacity policy: local Markdown; keep display index below 4000 UTF-8 bytes; page before exceeding; no remote provider

## Destination and acceptance
Establish the current configured report limit and obtain owner's accepted decision about whether it is sufficient. Map requires both answered T0001 and accepted T0002.

## Scope and exclusions
Read config.txt; no production implementation, deployment, remote calls, or edits to config.txt.

## Authority and execution
Owner authorizes autonomous investigation and fixture tracker writes. No decision approval delegated. Single writer local-smoke.

## Notes
All priorities equal. No concurrent fixture writers. Resolve one ticket only.

## Current view
Enumerate tickets/*.md and evaluate their requirements.

- Completed: [T0001 - Identify the configured report limit](tickets/T0001.md), answered as 25000 for the recorded config.txt content.
- Frontier: [T0002 - Decide whether the configured limit is sufficient](tickets/T0002.md), ready for collaborative owner choice; open and unclaimed.

## Decisions and artifacts index
- [T0001 resolution R0001 - configured value is 25000](resolutions/T0001/R0001.md), direct source evidence with config.txt content identity.

## Not yet specified
None.

## Risks and revisit triggers
Changes to config.txt invalidate findings; owner decides acceptable limit.

## Membership and recovery
Enumerate tickets/*.md; each ticket and resolution links back to this map. Resolutions live in resolutions/<ticket-id>/.

## Handoff or closure
Open and not achieved. T0001 is completed; T0002 and the fixture owner's accepted decision remain outstanding.
