---
name: fabric-research
description: Research external questions, disputed comparisons, literature and published benchmarks, with source-backed synthesis and delegation where useful.
compatibility: Pi Fabric and installed web-access tools. Recent-discussion research optionally uses the installed last30days skill and its declared environment.
disable-model-invocation: true
---

# Research

Optimize time to a well-supported answer. Main owns the synthesis.

## Browser rule

Use search and content-retrieval tools, not browser automation or browser-backed recovery. Set `web_search`'s `workflow: "none"`; do not opt into browser-cookie fetching with `fetch_content.auth`. Use an accessible alternative or report the source gap. Carry this rule into every worker assignment.

## Shape the work to the question

Cover the user's actual questions, definitions, source needs and requested output. Keep relevant dates and versions in the task and source evidence. Use a checklist or comparison table when it prevents omissions, not for every lookup.

Start with direct retrieval when Main can efficiently resolve the question, even if it needs several sources. Delegate distinct uncertainties when parallel work or a different method earns its assignment and reconciliation cost. Give each worker the question, its scope, necessary context, useful known sources, and the Browser rule; ask for findings with supporting URLs and passages or locators, contradictions, and remaining gaps. Workers supply evidence, not the final cross-question recommendation.

Use as many useful workers as the task needs, accounting for native availability, provider throttling and explicit user budgets; reserve capacity for verification and synthesis. Parallelize independent retrieval and analysis; start dependent checks when their inputs arrive, without waiting for unrelated workers. Avoid repeated searches and transferring entire reports where a focused finding will do.

Configure every worker launched by this skill, including verification and last30days workers, with `runner: "pi"`, `model: "openai-codex/gpt-5.6-terra"`, `thinking: "high"`, and `extensions: true`. Pass these options explicitly to `agent` / `workflow.agent`, `agents.run`, and `agents.spawn` rather than inheriting model or thinking defaults. Before dispatch, confirm the exact model key in `tools.models()`; if unavailable, report the blocker rather than silently substituting a model. This policy does not change Main's model or global defaults.

Have each worker first verify its required actions through effective discovery; Main's tool access does not prove child access. Give workers only the tools their assignment needs, but do not treat an allowlist or prompt as proof of isolation. Prohibit unrelated mutations and further delegation unless explicitly assigned. Permit only necessary task-scoped artifacts, such as the last30days plan and output; do not authorize installs, configuration changes, or publishing.

In full-code mode, use `fabric_exec` for all execution, including direct retrieval: `pi.*` for core tools, `extensions.*` for confirmed captured actions, and first-class provider proxies for known actions. Reserve `tools.call({ ref, args })` for discovered or computed refs. Keep intermediate work in code and return compact evidence, decisions and failures.

For finite fan-out, use `agent` with `parallel` or `pipeline`. Pass thunks to `parallel`, not already-started promises; keep dependent stages ordered. Use `agents.spawn` when Main benefits from consuming or redirecting work between turns. Consume terminal notifications when enabled, or use `agents.wait` when the program needs the result; do not poll for completion. Labels and progress should help follow real work. Use a schema only when machine aggregation benefits from it. Workflow helpers return the schema value or final text; use `agents.run` when native status and usage envelopes are needed. Native budgets and results remain authoritative. Keep Pi and child state in `/home/balauru/.pi-profiles/fabric` via `PI_CODING_AGENT_DIR`; `cwd` does not select a profile.

## Find and check evidence

Use the existing `web_search`, `fetch_content`, `get_search_content`, and `source_check` tools with their configured providers; omit provider overrides. Before first use, discover the actions needed for this task with bounded `tools.search` or `tools.list`, then inspect their effective contracts with `tools.describe`. A tool visible outside Fabric is not necessarily registered as `extensions.<name>`. Discovery establishes availability, not working credentials or successful retrieval. If a required action is missing, use an available alternative that preserves the task and Browser rule, or report the capability gap; do not install tools or change configuration to repair it.

For substantive research, prefer `web_search.queries` with 2–4 distinct angles rather than synonymous repetitions; keep a single query for narrow lookups. Put query text and other awkward content in named `payloads` and use the matching `π` keys.

Check captured results' `isError` before treating them as evidence, and inspect tool-specific failure fields according to the discovered contract. Keep full retrieved results inside the program when useful; return only relevant claims, supporting URLs and passages or locators, contradictions, gaps, and retrieval handles such as `responseId` for later expansion. Use `get_search_content` with `findText` to locate support in stored content instead of repeatedly returning whole reports. Preserve decisive passages and table context when reducing output.

Prefer original, accessible sources suited to the claim: primary documentation for specifications, original papers for research, reproducible independent measurements for performance, and direct community posts for reported experience. Treat summaries and search answers as leads. For recent-discussion research, read the [last30days integration](references/last30days.md).

Check decisive and disputed claims against the supporting passage or table. Reuse already retrieved evidence when it contains that support; retrieve a lead when it does not. Missing administrative metadata does not invalidate useful evidence. A missing supporting source does limit what can be concluded.

Trace shared origins: syndicated stories, repeated benchmarks and separate workers citing one paper are not independent corroboration. Resolve material contradictions by inspecting methods, populations, definitions and source authority; keep genuine disagreement visible. Compare numbers only when tasks, versions, settings, samples, metrics and denominators support the comparison. Do not turn vendor claims or anecdotes into measurements, or average incompatible results.

## Close the evidence gap, then answer

For delegated batches, account for requested, dispatched and completed items with named gaps, and return `success`, `partial` or `failed` according to usable evidence and coverage. Catch ordinary failures per independent item so one rejection does not discard successful sibling results. Inspect native worker status/error fields when available; receiving text alone does not establish successful completion. Preserve successful work when a tool or worker fails. Inspect the actual failure and recover only the evidence still needed; do not rerun successful siblings or restart a whole batch solely because it is partial. Retry, change sources, delegate or stop according to the remaining gap and the likely value of more work within the user's budget. Stop when support is sufficient or further retrieval is unlikely to change the answer; report material unresolved gaps rather than manufacturing completeness.

Main synthesizes the answer with citations, separating sourced findings from inference and recommendation. Cover requested outputs, explain decision-changing disagreements and limitations, and keep recommendations within the evidence. When a choice remains unresolved, name the observation or smallest useful evaluation that would settle it.
