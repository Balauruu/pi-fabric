# Current fabric-research acceptance checks

Run exactly:

```sh
cd /home/balauru/.pi-profiles/fabric
PI_CODING_AGENT_DIR=/home/balauru/.pi-profiles/fabric node --test skill-evaluations/fabric-research-refactor/contract.test.mjs
```

Uses Node and the already installed Pi SDK/Fabric packages under `npm/node_modules`. No installs, model calls, network requests, child agents, engine runs or generated artifacts are needed.

## Executable structural checks

`contract.test.mjs` reads the **current** skill source and checks:

- Public Pi loading: one explicit/user-only `fabric-research` skill, omitted from the model's skill prompt, with no target diagnostics or duplicate in the profile's skill catalog. Unrelated catalog diagnostics do not fail this test.
- Skill-owned inline Markdown links exist, including the last30days integration and its installed dependencies. Linked external skill documentation is not recursively audited; URL reachability and fragment anchors are not checked.
- The actual TS example passes installed `typeCheckFabricCode` with `guestTypeDeclarations(true)`. Its emitted JavaScript executes in a Node VM against a mock search, forwards the query with `workflow: "none"`, supplies no provider/auth overrides, and uses no child or other host APIs.
- The removed program/references are absent; skill-owned files contain no executable source, known legacy temporal identifiers or lexically mandatory manifest/receipt contract. These are targeted regression guards, not a general Markdown parser or proof about every possible wording.

## Native engine options and export

```sh
PYTHONDONTWRITEBYTECODE=1 skills/last30days/.venv/bin/python -B skill-evaluations/fabric-research-refactor/last30days_options_test.py
PYTHONDONTWRITEBYTECODE=1 skills/last30days/.venv/bin/python -B -m pytest -q -p no:cacheprovider skills/last30days/tests/test_agent_export.py
```

The first checks native parser defaults and explicit quick/deep, days/as-of and cookie opt-out options. The second runs the installed engine's existing export/source-outcome tests. Neither launches live retrieval or creates a research adapter.

## Limits and live acceptance

Fabric's checker uses its native permissive declarations and diagnostic filtering, not strict `tsc` or a live extension schema. The VM is a test fixture, not Fabric's native executor or a security boundary. Loader checks do not exercise interactive slash commands or prove child profile inheritance.

[scenarios.md](scenarios.md) contains reusable fresh behavioral prompts. Recorded smoke variants, their coverage and unrun variants are documented in [the refactor validation](../../docs/fabric-research-refactor/validation.md). Grade actual tool calls, worker traces, engine outputs and final answers. Passing structural tests cannot establish native scheduling, budgets, browser avoidance, provider availability or research quality. Missing live capabilities are blockers, not passes.

There is intentionally no canonical research program or reusable research runner. Historical tests under `skill-evaluations/fabric-research-native` and the archived pre-refactor tests are **not acceptance of the current skill** and are not imported or run here. No byte ceilings, exact-prose assertions or old timestamp validators are used.
