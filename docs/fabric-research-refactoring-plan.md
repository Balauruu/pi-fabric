# Fabric research refactoring plan

Status: proposed plan only. No refactor implementation is authorized by saving this document.

This plan supersedes the earlier containment-oriented proposal. The target is the original Fabric-native research workflow with a concise no-browser instruction: no research runtime, special tools, or QA mode.

## 1. Accepted designs

| Design | Behavior | Recommendation |
|---|---|---|
| Prompt prohibition over broad tools | Keep normal tools available. The research skill instructs Main and workers not to use browser capabilities. | Default. Simplest and most Fabric-native. |
| Dedicated research startup preset | Load existing Fabric and web-access resources without BetterWright/browser guidance. No replacement tools or runtime. | Optional if browser guidance demonstrably interferes with research. |

Do not combine these into another enforcement framework.

The prompt-only design deliberately does not guarantee capability absence. Its success criterion is correct research behavior, not resistance to an agent deliberately bypassing instructions.

## 2. Target architecture

```text
fabric-research skill
  → ordinary fabric_exec workflow
      ├─ existing search/retrieval tools
      ├─ native parallel execution
      ├─ native agents.run workers
      └─ native results, budgets, progress and telemetry

Main
  → reconcile evidence
  → verify decisive claims
  → synthesize
```

### Main

Use the existing tools directly:

- `web_search`
- `fetch_content`
- `get_search_content`
- `source_check`

Keep ordinary computation, file access, discovery, and native Fabric orchestration available. No exact-code admission or gateway operations.

### Workers

Use native Fabric agents with ordinary tool grants, for example:

```ts
{
  runner: "pi",
  recursive: false,
  extensions: true,
  tools: [
    "web_search",
    "fetch_content",
    "get_search_content",
    "source_check"
  ],
  schema: reportSchema
}
```

`extensions: true` permits the existing extension tools to load. There is no SDK worker adapter, synthetic provider, custom model bridge, or child launcher.

Use real `agents.run`, `parallel`, `workflow.*`, native attempt budgets, and native result receipts. State native timeout and retrieval-limit semantics accurately rather than recreating the removed SDK limits.

## 3. The browser rule

One authoritative section in `skills/fabric-research/SKILL.md`, carried into worker assignments:

> Research uses search and content-retrieval tools, not browser automation. Do not invoke BetterWright, browser tools, or browser-backed fallbacks, including during verification and recovery. For `web_search`, use `workflow: "none"` to avoid opening the curator. If a source requires browser interaction, use another accessible source or report the evidence gap.

This addresses the verified curator default without introducing a replacement search tool.

No `/qa on`, `/qa off`, research latch, fork restriction, shell ban, or special research-exit command. BetterWright returns to its normal availability for testing and other explicitly requested browser tasks.

No research-specific credential or error-sanitization layer. Existing tools retain their normal authentication and error behavior.

## 4. Remove versus retain

### Remove completely

- `extensions/qa-browser/`, including:
  - QA activation controls.
  - Gateway and research host tools.
  - Byte pinning.
  - Custom retrieval implementations.
  - SDK workers and model bridging.
  - Session-history restrictions.
- Research tool names `research_search` and `research_fetch`.
- Tests whose purpose is preserving those mechanisms.
- Obsolete browser-control documentation.

### Retain

The useful research methodology:

- Direct versus multistream routing.
- Requirement ownership.
- Uncertainty-based assignments.
- Bounded parallelism and targeted recovery.
- Provenance, temporal validity, source independence, and comparability.
- Main-owned verification and synthesis.
- Honest partial coverage and native telemetry.

Keep one canonical workflow source. Do not create another framework around loading or executing it.

## 5. Migration order

1. **Restore normal package loading.** Remove this task's BetterWright `extensions: []` override from `settings.json`, preserving unrelated changes. Do not add new global resource restrictions.

2. **Restore the existing native workflow.** Update `skills/fabric-research/scripts/workflow-program.js` to use actual Fabric globals and native agents. Remove custom-runtime assumptions.

3. **Restore existing retrieval tools.** Replace custom tool names in the manifest and worker contracts. Specify `workflow: "none"` for research searches; do not change global provider or credential configuration.

4. **Simplify the skill and references.** Remove gateway, pinning, QA-mode, and containment instructions. Keep the concise browser prohibition and normal evidence/recovery workflow.

5. **Restore last30days.** Use a native worker and the installed engine directly, in its declared environment. Use documented no-browser options, including the separate Trustpilot browser opt-out when relevant. Allow necessary Bash and artifact writes. No constrained-runner prerequisite or custom host adapter.

6. **Delete qa-browser and obsolete tests/docs.** Preserve historical evidence artifacts as historical records, not active architectural requirements.

7. **Restart and validate normal resource loading.** Rollback restores only migration-owned changes, never the entire working tree.

The optional startup preset should be a later, independent choice. Parent startup flags must not be assumed to propagate into native children; verify that before advertising complete exposure exclusion.

Before implementation, reread the current files and configuration. Other sessions may have changed package declarations, settings, or related code since the review. Preserve unrelated and uncommitted changes, stay within `/home/balauru/.pi-profiles/fabric`, and do not modify installed dependencies.

## 6. Acceptance criteria

Validate behavior, not denial machinery:

- Direct research works without children.
- Multistream research uses native Fabric-managed agents.
- Search uses the actual configured provider/model.
- Retrieval and coordinator verification work through existing tools.
- Failed retrieval produces an alternative source or an evidence gap.
- Worker failures preserve successful siblings.
- Native budgets, progress, receipts, and telemetry remain authoritative.
- last30days runs without browser paths.
- Representative research transcripts contain zero browser invocations, without artificial denied-call/retry loops.
- BetterWright remains usable normally, without QA activation commands.

The simplification is substantial: delete the additional runtime, restore existing capabilities, and make browser avoidance a research instruction rather than a security architecture.
