# Tracker operations and migration

## Establish the backend

At first use, identify the repository and selected tracker from explicit user/project configuration. Record backend, canonical map/ticket locations, identity scheme, artifact roots, and writer/claim policy. Inspect the available tool schema and repository conventions; do not assume GitHub CLI, a setup skill, or a third-party extension exists.

For an external tracker, verify operations for create/read/update/query, membership, dependency links, claims, revisions/conditional writes, pagination, and size/child limits. Use native relationships for visibility where available, with explicit result predicates in the ticket. Unsupported semantics require a documented fallback or a blocker, not invented commands.

If no tracker is selected, use repository-local Markdown as below. If no repository/root is identified, ask for its location before writing. An inspect-only invocation never creates fallback files.

GitHub Issues is not Git storage. A clone does not export issue history. Keep durable ADRs/designs in the repo under existing conventions; store pointers in tickets. For a small decision without an ADR, the ticket resolution is canonical and must remain exportable.

## Local Markdown fallback

Use the existing project convention if present; otherwise propose/create this root for the authorized map task:

```text
docs/wayfinder/<map-slug>/
  map.md
  tickets/<stable-id>.md
  resolutions/<stable-id>/<resolution-id>.md
  index/<page-id>.md                 # only when the index needs paging
```

Create directories lazily. Confirm the chosen slug is unused; never overwrite an existing map or adopt an unmarked directory silently. Paths resolve beneath the verified repository root; reject traversal and unexpected symlinks escaping it. Stable IDs are immutable within the map; under the single writer, choose the next unused `T0001`-style ID by listing existing tickets, not by counting them. Resolution IDs are likewise unique per ticket. Store relative named links and backlinks to `map.md` on tickets and resolutions. Discover membership by reading all ticket headers, not solely the map's display index.

Metadata and sections follow the templates; serialize fields consistently as Markdown, without pretending that a custom parser is installed. `requires`, lifecycle, result and claims are explicit fields read by the agent. Query by bounded listing/search and relevant file reads, widening until the map's membership is covered when computing whole-map completion. Partial enumeration cannot establish completion.

Local fallback is **single writer per map**. Establish a known coordinator/session before changes. If another session may be writing and coordination is unavailable, stop mutations until a single writer is agreed. A claim field, assignment, readback, Git branch, or Git commit is not an atomic lock. Independent workers may produce disjoint artifacts, but only the coordinator publishes shared ticket/map state. Do not implement a pretend lock by writing a file and rereading it.

Use exact-anchor edits from a fresh snapshot and read back affected files. If content changed, re-read and reconcile rather than overwrite. This detects some conflicts; it does not upgrade the fallback to transactional multi-writer storage. Git commits are optional and follow the user's existing authorization, not automatic skill behavior.

## Claims and concurrency

Record human owner and unique executor/session identity separately, with claimed time and handoff status. External trackers may support a verified conditional claim/lease or a real lock; use it only after establishing its guarantees. Otherwise apply the same single-writer/coordinator policy. Two sessions using the same developer assignment cannot distinguish ownership by assignment alone.

Re-read ownership before effects and completion. Claim expiry or disappearance does not by itself prove a worker stopped; reconcile with its owner before reassignment. Explicit handoff records the old/new executor and unfinished work. If a claim conflicts, stop the affected work and coordinate, not race.

## Mutation and recovery protocol

No cross-file or cross-service atomicity is assumed. Publish in recoverable steps:

1. Refresh the ticket/map, dependencies, subject revision, permissions, and ownership. Determine the intended transition and unique resolution/operation identity. Read existing results before creating a new one.
2. Persist durable evidence/artifacts first, at stable locations. Write the resolution with acceptance and approval evidence. Read it back and verify full content and links.
3. Update the ticket's current resolution pointer, outcome, disposition, and lifecycle only after the resolution is durable. Read back and compare intended fields. If approval is outstanding, use Review, not completed closure.
4. Reconcile dependent predicates and update the compact index from durable membership/resolution records. Verify the map write. If this fails, report index repair pending; do not lose or replay the already recorded resolution.
5. Release the claim when safe and confirmed. Report partial publication accurately.

On timeout, reset, or uncertain response, query actual state by stable identity before retrying. Reuse the operation/resolution identity to avoid duplicate records. Never blindly replay a purchase, deployment, message, merge, or other non-idempotent effect. If the external effect cannot be reconciled, stop and report unknown outcome. Record successful effects separately from failed tracker publication so recovery does not repeat them.

## Bounded index and capacity

The map stores brief linked summaries, not full reports or the only membership list. Verify backend limits and measurement units from current authoritative documentation or inspected capabilities before depending on them; do not hardcode an incident report as universal platform behavior. If a required limit is unknown and growth threatens it, stop the growing write and establish a safe capacity policy first.

Define a conservative map/index budget below verified limits, with headroom for edits. Before each write measure the fully assembled content with the backend's documented units. If the budget would be exceeded, preserve older index entries in bounded linked pages or a repository-owned index, then keep a compact directory on the map. Page the directory too if needed. Read back archives before shortening the display index.

Every ticket/resolution retains a map backlink and a durable membership/export path independent of child relationships and the map body. Do not detach or delete historical tickets just to evade a child cap. Use supported container membership only after checking nesting and enumeration semantics; otherwise use an explicit exported membership index. Comments are not assumed unlimited overflow storage.

To rebuild: enumerate canonical membership completely, load current and historical resolution pointers as needed, reconcile dangling links/duplicates, then regenerate bounded display pages. An incomplete query/export is a blocker to claiming complete reconstruction. External export format/location must be agreed for the project; do not claim Git alone backs up issues.

## Opt-in migration

Trying Ultra does not authorize changing an existing Wayfinder map. Offer a separate new map or a scoped conversion proposal. Leave the original skill directory untouched in either case.

After explicit conversion approval:

1. Snapshot/export the original map metadata and relationships to the agreed durable location; verify the snapshot before editing.
2. Preserve stable identities, links, history, and closed tickets' original types/results. Record `workflow: wayfinder-ultra`, `schema: 1`, mode, approval evidence and conversion record on the converted map; make clear which historical records retain legacy semantics.
3. Inspect every open ticket's actual required result. Suggested mappings: research -> investigation; prototype -> experiment with method prototype; grilling -> decision with method grilling; task -> enabler only if prerequisite-only. A delivery task is implementation/release, not enabler.
4. Add missing acceptance, authority, outcome predicates, and subject references. Do not infer an accepted outcome merely from a legacy closed issue. A dependent Ultra ticket needs explicit evidence review of legacy resolution applicability.
5. Rebuild dependencies and frontier under the new rules; resolve cycles, unknown authority and missing evidence before work. Record unresolved conversions rather than claiming migration complete.

Migration and planning-to-delivery are separate approvals. Neither retroactively authorizes implementation or deployment.
