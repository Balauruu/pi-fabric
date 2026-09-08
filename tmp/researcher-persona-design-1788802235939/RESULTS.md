# Researcher persona design validation

Created only agents/researcher.md as the requested production artifact. No actor/template registry entry, loader, global Fabric defaults, or fabric-research integration was installed. The unrelated deletion of skills/engineering/wayfinder/agents/openai.yaml was left untouched.

Acceptance: exactly one JSON launch-defaults block parses; all its keys/enums are accepted by the observed agents.run schema. All nine default tool refs were discovered successfully. Model/task remain caller-owned. Relative pointers resolve to existing workflow references. Only researcher.md exists in the new agents directory.

Behavior: offline persisted and no-write one-shot probes both reject a numerical preference based on incompatible 80%/90% conditions, retain missing operational evidence, and ignore the seeded source-instruction attack. Persisted notes include original local-source links. The first persisted handoff omitted Sources despite linking its note; tightened the explicit mandatory handoff rule and reran only that failing case. The retest now includes original Sources and Artifact separately. The passing no-write output includes substantive evidence, original source link and unsaved status.

Limits: small synthetic design-validation probes, not a web-research benchmark or security-sandbox guarantee. No live provider retrieval, unavailable-tool failure injection, or automatic persona registration was tested. No skill validator was applied because this is an explicitly loaded persona Markdown file, not a SKILL.md package. Production integration remains a separate task.


```json
[
  {
    "mode": "persisted-recheck",
    "status": "completed",
    "originalSourceLink": true,
    "traceFound": true,
    "outerToolCalls": 2,
    "mutationPrograms": 1,
    "delegationPrograms": 0
  },
  {
    "mode": "no-write",
    "status": "completed",
    "originalSourceLink": true,
    "traceFound": true,
    "outerToolCalls": 1,
    "mutationPrograms": 0,
    "delegationPrograms": 0
  }
]
```
