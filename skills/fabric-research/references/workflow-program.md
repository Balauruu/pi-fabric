# Canonical Fabric workflow program

Use this program only after Main has chosen the Fabric route and built the manifest described in `SKILL.md`. The machine schema owns delivery validity and mechanical candidate-usability accounting. The stream contract owns requested evidence semantics, and final synthesis owns verified usability and truth.

The executable body is stored in `../scripts/workflow-program.js` as eval-safe JavaScript so this short launcher remains reliable under model context and tool-output limits. Copy this launcher exactly into one `fabric_exec` call and provide `strings.task` plus `strings.program`. Do not improvise, transpile, or partially copy the body.

```ts
const source = await pi.read({ path: "/home/balauru/.pi-profiles/fabric/skills/fabric-research/scripts/workflow-program.js" });
return await eval(source);
```

## Program guarantees and limits

- Branch count and the optional single retry are mechanically bounded by the manifest and outer `agentBudget`.
- The runtime clock is generated once in the executor and copied to every child prompt and receipt.
- Direct `agents.run` receipts expose child identity, usage, tool calls, duration, status, and error text.
- The minimal schema preserves valid delivery when optional provenance is absent. Such rows remain incomplete and cannot satisfy a decisive claim without Main verification.
- Pi Fabric 0.75.0 cannot stop a child exactly when it crosses `maxRetrievalSteps`; compliance is checked after settlement and disclosed as post-hoc.
- The program cannot observe parent-session usage or total cost including Main. Those fields remain `unavailable` until an outer runtime or evaluation harness joins them.
- The program does not call worker evidence true. `candidateRequirementIds` means only that a structurally valid row has candidate provenance. Main must still verify temporal fit, source appropriateness, and passage entailment.
