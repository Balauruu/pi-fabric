# T3 fixed evaluation corpus input

## Phase-only task

Using **only the frozen primary evidence files listed below**, produce a decision-grade guide to evaluation, repeat-run reliability, recoverable tool failures, evaluator validity, and security boundaries for tool-using agents. This is a phase-only evidence test: do not search, fetch, inspect candidates, alter configuration, install dependencies, or use sources outside this corpus.

Address:

- What each included publication actually evaluates, under what environment, agent/model, metric, comparator, sample, and conditions.
- What its reported measurements do and do not establish about reliability or security.
- How measurement evidence differs from proposed operational controls.
- A source-bound decision table and a smallest resolving evaluation for a deployment-specific, permission-bounded agent.

Do not treat benchmark results, evaluator results, or proposed controls as a proof of production security. Preserve source versions and qualifiers. Do not infer missing values. Keep AgentProp-Bench (S5) distinct from the evaluator-validity audit (S3). Preserve AgentDojo's unresolved prose/table conflicts and ToolBench-X's v1 diagnostic versus v2 main-benchmark scope distinction.

## Frozen primary evidence

1. `sources/tau-bench-2406.12045.md`
2. `sources/toolbench-x-2606.25819v1.md`
3. `sources/evaluator-validity-audit-2607.02577.md`
4. `sources/agentdojo-2406.13352v3.md`
5. `sources/agentprop-bench-2604.16706.md`

## Frozen correction records

- `AUDIT-v2.md`
- `CORRECTIONS.md`
