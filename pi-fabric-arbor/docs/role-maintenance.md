# Arbor role maintenance

The public `skills/fabric-arbor/SKILL.md` is the only registered skill. Three role documents and two conditional procedures are package assets, resolved by `RoleBundle` before native requests and preserved outside candidate material. Updating a package does not rewrite a saved run bundle. Keep version sentinels, references and native bootstrap tests aligned. No profile-local benchmark dependency is permitted.

The authoritative architecture is the repository deep-refactoring plan, section 4.7. Maintain the packaged [coordinator](../skills/fabric-arbor/roles/coordinator.md), [executor](../skills/fabric-arbor/roles/executor.md), [literature](../skills/fabric-arbor/roles/literature.md), [research strategy](../skills/fabric-arbor/references/research-strategy.md) and [evidence interpretation](../skills/fabric-arbor/references/evidence-interpretation.md) together. This mapping adapts the eleven skills from [RUC-NLPIR/Arbor at the pinned revision](https://github.com/RUC-NLPIR/Arbor/tree/2f4e65410a5c21c9e55835a9a0d77ead21a64ffa):

| Upstream skill | Local disposition |
| --- | --- |
| arbor-research-agent | Merge into the public user guide |
| arbor-agent-setup-intake | Merge into public guide; validation/intake mechanics in Pi commands |
| arbor-agent-orchestrator | Merge strategy into coordinator; operational dispatch remains owner code |
| arbor-agent-coordinator | Merge into coordinator role |
| arbor-agent-ideate | Conditional research-strategy reference |
| arbor-agent-executor | Fixed-hypothesis executor role; owner freezes/evaluates |
| arbor-agent-search | Optional bounded literature role; no novelty subsystem |
| arbor-agent-merge-eval | No standalone skill; evidence interpretation plus deterministic evaluator/decision/workspace code |
| arbor-agent-resume-report | No standalone skill; native reconciliation plus factual source views/reports |
| arbor-agent-plugins-hitl-budget | Dissolve into presets, Fabric effect permission, owning-Pi research review and domain accounting |
| arbor-agent-tools | No skill/fallback state; exact provider schemas and actions reference |

Upstream `agents/openai.yaml` is UI metadata, not a native Fabric role API. Never invent `skills`/`role` spawn fields or copy upstream coordinator/storage. Native actor instructions and worker task bootstraps, explicit tools/models/result schemas, frozen bundle IDs and native invocation attribution remain authoritative.
