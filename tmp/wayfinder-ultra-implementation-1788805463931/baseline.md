## Supported ticket types

Under **“Ticket Types”**, every ticket is HITL or AFK:

- **Research (AFK):** external/local-resource investigation, resolved by a `/research` subagent.
- **Prototype (HITL):** rough artifact for human reaction; links the prototype as an asset.
- **Grilling (HITL):** live conversation using `/grilling` and `/domain-modeling`.
- **Task (HITL or AFK):** prerequisite manual work that unblocks a later decision. It is “the one type that *does* rather than decides” and is “resolved when the work is done.”

HITL tickets require actual human participation: “A HITL ticket only resolves through that live exchange; the agent never stands in for the human’s side.”

## Claim and completion rules

- Claiming: **“assigning it to the dev driving the map, first, before any work.”**
- Claim identity: **“That assignee is the claim: an open, unassigned ticket is unclaimed.”**
- Frontier: open, unblocked, unclaimed child tickets.
- Unblocked: **“when every ticket blocking it is closed.”**
- Session limit: **“never resolve more than one ticket per session”**, except research tickets.
- Resolution requires, under **“Work through the map”**:
  1. Post the answer as a resolution comment.
  2. Close the issue.
  3. Append a context pointer to **Decisions so far**.
  4. Update newly exposed tickets, dependencies, and fog.
- Map completion: the map is done when **“nothing [is] left to decide”** and the route is clear with no tickets remaining.
- Mis-scoped tickets are closed and linked under **Out of scope**, not **Decisions so far**.

## Contracts not defined

- **Separate implementation, design, verification, and release result contracts:** No. Only the four ticket types above exist. Wayfinder is planning by default, with `task` as the narrow execution exception.
- **Failing-verification closure versus passing-release dependency:** No. There are no verification/release outcomes. Dependency readiness depends only on blockers being **closed**, not on pass/fail status.
- **Revision-bound evidence:** No. It mentions linked assets, resolution comments, context pointers, and research branches, but requires no commit SHA, immutable revision, or evidence-to-revision binding.
- **Same-account concurrent claims:** No. Assignment is the sole claim mechanism. It says concurrent sessions should skip assigned tickets and anticipates concurrent tracker edits, but defines no distinct lease/session identity or protection when multiple sessions use the same assignee account.