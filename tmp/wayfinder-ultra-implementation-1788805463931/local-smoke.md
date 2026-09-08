Resolved **T0001** as `completed/answered`.

**Modified files**
- `docs/wayfinder/smoke/map.md`
- `docs/wayfinder/smoke/tickets/T0001.md`
- `docs/wayfinder/smoke/tickets/T0002.md`
- `docs/wayfinder/smoke/resolutions/T0001/R0001.md` (created)

**Evidence**
- `config.txt:1`: `report_max_rows=25000`
- SHA-256: `b8a54801012f59640214f0dd14a5df0a2c08cead9d2e154ada8af3a4e92eaba3`
- Resolution explicitly distinguishes configured value from runtime behavior.
- `config.txt` remained unchanged.
- T0001 claim was released by `local-smoke`.
- T0002 remains open, pending owner approval, and is now the frontier.
- Map remains open and not achieved.
- Map size: 1,988 bytes, below its 4,000-byte budget.

No writes occurred outside `docs/wayfinder/smoke`; no remote operations, commits, installs, or deployments were performed.