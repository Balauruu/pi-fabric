---
name: fabric-arbor
description: Inspect the source-loaded pi-fabric-arbor package and explain its current availability. Use for Arbor package installation, setup diagnostics, or asset checks; scored research remains unavailable.
---

# Fabric Arbor

Check actual availability before proposing execution. PR2 provides managed native execution, not scored research or the later full research interface.

1. Use `/arbor availability` and `/arbor doctor` inside Pi. Distinguish installed/configured/enabled from observed runtime capability and tested behavior.
2. For authorized setup in a trusted project, use `/arbor setup`, then `/reload` and doctor. Setup preserves unrelated policy and starts no research; report blockers rather than changing host policy implicitly.
3. List package resources with `/arbor assets` or `pi-fabric-arbor assets`. CLI reads/replay/existing-artifact retrieval never attach to a live owner or generate an export.
4. Explain the bounded owner-only provider and remaining limitations using [actions](references/actions.md). Do not substitute legacy v1 actions/certificates or treat native completion as a measured win.

Internal [coordinator](roles/coordinator.md), [executor](roles/executor.md), and [literature](roles/literature.md) assets are packaged, not additional registered skills or operational role bundles. [Research strategy](references/research-strategy.md) and [evidence interpretation](references/evidence-interpretation.md) remain inputs to later explicit role assembly, not currently executed procedures.
