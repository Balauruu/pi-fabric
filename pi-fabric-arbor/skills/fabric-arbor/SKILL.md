---
name: fabric-arbor
description: Inspect the source-loaded pi-fabric-arbor package and explain its current availability. Use for Arbor package installation or PR1 asset checks; research setup and execution are not available yet.
---

# Fabric Arbor

PR1 is a source-only packaging checkpoint. It does not provide a usable research coordinator, setup/doctor workflow, or v2 mutation operation.

## Available operations

1. Check the installed source facade with `/arbor availability` inside Pi or `pi-fabric-arbor availability` outside Pi.
2. List packaged resources with `/arbor assets` or `pi-fabric-arbor assets`.
3. Use the CLI only to inspect or replay an existing file, or retrieve an existing artifact. The CLI never attaches to a live owner and never generates an export.
4. Report `research: unavailable-until-pr2-plus` as a blocker rather than invoking legacy v1 actions or certificates.

See `<skill-dir>/references/actions.md` for the exact PR1 read-only CLI surface.

## Internal assets

`<skill-dir>/roles/coordinator.md`, `<skill-dir>/roles/executor.md`, and `<skill-dir>/roles/literature.md` are packaged internal role inputs for later PRs. They are not discovered skills, registered agents, or usable research commands in PR1.
