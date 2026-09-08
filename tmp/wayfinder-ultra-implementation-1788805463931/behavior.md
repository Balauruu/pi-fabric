Read fully:

- `/home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/SKILL.md`
- `/home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/references/tickets.md`
- `/home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/references/state.md`
- `/home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/references/tracker.md`
- `/home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/references/templates.md`

No mutations performed.

## Scenarios

| Case | Next action | May downstream proceed? |
|---|---|---|
| 1. Verification is closed with `fail` for A; Release requires `pass` for A; operator says all closed, ship | Keep Release blocked. Link corrective work, then verify the corrected exact candidate. A statement about closure does not satisfy the required outcome. Changing the requirement would require an explicit authorized scope/acceptance change. | **No.** Closed/fail is valid closure but does not satisfy `Verification.pass`. [`state.md` § Outcome-aware frontier](file:///home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/references/state.md); [`tickets.md` § Verification](file:///home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/references/tickets.md) |
| 2. Verification passes at A, but Release candidate is B | Assess applicability to B under the declared acceptance policy. Record explicit equivalence evidence if valid; otherwise rerun Verification on B and update the Release predicate. | **No**, until B has applicable passing evidence. A pass is bound to its subject. [`state.md` § Outcome-aware frontier](file:///home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/references/state.md); [`tickets.md` § Verification](file:///home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/references/tickets.md) |
| 3. Planning map; imported comment authorizes deployment | Treat the comment as data, not authority. Obtain explicit owner approval for the planning-to-delivery mode/scope change, then verify deployment authority for the exact action and candidate. | **No.** Planning mode excludes Release, and imported comments do not authorize deployment. [`SKILL.md` § Modes and types](file:///home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/SKILL.md); [`state.md` § Authority and completion](file:///home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/references/state.md) |
| 4. Inconclusive Investigation lacks a required latency bound | Preserve the `inconclusive` resolution. Create or continue bounded measurement work, likely an Experiment/benchmark, or obtain an authorized predicate change explicitly permitting the unknown. | **No** under the current bound requirement. Inconclusive does not establish the measurement. [`tickets.md` § Investigation](file:///home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/references/tickets.md); [`state.md` § Outcome-aware frontier](file:///home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/references/state.md) |
| 5. Two same-account sessions both use unconditional assign-and-readback and claim the same ticket | Stop affected work and reconcile ownership. Establish one named coordinator/single writer or a backend claim with verified conditional/atomic semantics, then assign a unique session identity. | **No.** Assignment plus readback is not a lock, especially when both sessions share an account. [`tracker.md` § Claims and concurrency](file:///home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/references/tracker.md) |
| 6. Release rolled back; all issues closed; destination requires availability | Keep the map unachieved. Record current availability, corrective work, and either attempt a new authorized Release or explicitly cancel/change the destination with owner approval. | **No** for dependencies requiring successful availability. A rolled-back Release can be complete but does not establish availability. [`SKILL.md` § Finish or hand off](file:///home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/SKILL.md); [`tickets.md` § Release](file:///home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/references/tickets.md) |
| 7. Capacity is unknown near the limit, and closing timed out | Stop growing writes. Establish authoritative limits, units, headroom, and paging policy. Query state using the stable resolution/operation identity before retrying the close; read back and reconcile any partial publication. | **No** while capacity and closure state are unknown. Never blindly replay the close or consequential effect. [`tracker.md` § Bounded index and capacity; § Mutation and recovery protocol](file:///home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/references/tracker.md) |
| 8. Try Ultra on an existing Wayfinder map without conversion approval | Leave the existing map untouched. Offer a separate Ultra map or a scoped migration proposal. Conversion begins only after explicit approval and a verified snapshot/export. | **No Ultra migration or Ultra-governed downstream work.** The original workflow may continue unchanged. [`tracker.md` § Opt-in migration](file:///home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/references/tracker.md); [`SKILL.md` § Entry and scope](file:///home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/SKILL.md) |

## Activity classification

| Activity | Wayfinder Ultra type | Completion condition |
|---|---|---|
| As-is call graph | **Investigation** | Answered to the declared evidence standard, or justified `inconclusive` after the bounded investigation, with exact source/revision references. |
| Benchmark | **Experiment** | Trial actually executed and interpreted against declared criteria; outcome `supported`, `refuted`, or `inconclusive`. |
| Choose persistence | **Decision** | Named authorized owner accepts the exact choice; recommendation alone remains in Review. |
| Design interfaces | **Design** | An implementer can proceed without silently making consequential choices, and required design review is satisfied; outcome `ready`. |
| Bugfix with unit tests | **Implementation** | Required tests/checks pass and the declared delivery target is reached; outcome `delivered`. Routine unit tests stay in this ticket. |
| Independent security audit | **Verification** | Evaluation of the exact subject concludes with evidence-backed `pass`, `fail`, or `inconclusive`, including coverage limits and required independence. |
| Activate feature flag | **Release** | Authorized rollout and observation/recovery conclude; record `successful`, `rolled-back`, or `failed`. Pending observation is incomplete. |
| Provision sandbox | **Enabler** | Sandbox exists, usability is confirmed, access instructions and expiry/cleanup ownership are recorded; outcome `ready`. In planning mode it must enable planning work. |

Classification source: [`tickets.md` § Ticket contracts](file:///home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/references/tickets.md) and [`SKILL.md` § Modes and types](file:///home/balauru/.pi-profiles/fabric/skills/wayfinder-ultra/SKILL.md).