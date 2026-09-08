# Tool-Agent Evaluation, Reliability, and Security Boundaries

## Decision

**Do not make a deployment reliability or security claim from the available evidence.** No primary evaluation or standard was inspected, so no source-bound benchmark values, environments, models, comparators, or outcomes are available.

A local release gate is still actionable: evaluate the exact deployed configuration in an isolated, production-equivalent harness and block promotion on any critical boundary violation.

## Evidence status

| Requirement | Status |
|---|---|
| Primary evaluation measurements | Unavailable |
| Exact benchmark environment, agent/model, comparator, and outcomes | Unavailable |
| Inspected standards | Unavailable |
| Counterevidence and transfer constraints | Methodological limits only, not source-verified |
| Deployment controls | Operational recommendations, not evidence of security |

The legacy streams report that their authorized web transports were unavailable. No benchmark result or standard-compliance claim should be inferred.

## What an evaluation can establish

A sandbox benchmark can establish performance only for its fixed task distribution, tool schemas, state model, scoring, and evaluated configuration. A simulated safety test establishes behavior only against its simulator and tested attack distribution. It does **not** prove security.

Do not transfer results beyond the intersection of:

- task distribution
- tool interface and version
- delegated authority and credentials
- threat model and attack set
- failure semantics
- evaluator and scoring method

## Counterevidence and evaluation limits

| Limit | Consequence |
|---|---|
| Finite tasks and schemas | Success can fail to transfer to changed tools, parameter meanings, or sparse documentation. |
| Simulator gap | Emulators may omit latency, partial failure, stale state, rate limits, identity boundaries, and hidden side effects. |
| Evaluator coupling | LLM judges or emulated environments may share the evaluated model’s blind spots. |
| Incomplete attack coverage | Passing known indirect-prompt-injection templates does not cover novel payloads, poisoned content, confused-deputy behavior, cross-tool exfiltration, or compromised tools. |
| Success-only aggregation | Mean completion can conceal unsafe retries, excessive permissions, irreversible actions, and reset-dependent recovery. |
| Contamination risk | Public tasks, trajectories, or documentation may overlap with training data or prompt libraries. |
| Invalid human comparison | Human baselines require matched time, interface, tools, retry budget, instructions, and authority. |

## Deployment decision table

| Local condition | Failure signal | Decision | Control |
|---|---|---|---|
| Tool call exceeds delegation | Target, argument, scope, tenant, or ownership differs from policy | Block | Typed allowlist, argument validation, least-privilege credentials |
| Untrusted content changes behavior | Retrieved content causes policy changes or secret exposure | Block and quarantine | Treat external content as data, isolate credentials, enforce policy outside model context |
| Completion is not verifiable | No machine-checkable artifact or confirmed tool state | Escalate | Deterministic postcondition checks |
| Retry loop or duplicate risk | Repeated identical error, non-idempotent retry, or budget exhaustion | Stop | Idempotency keys, circuit breaker, step/time/cost limits |
| High-impact action | Delete, publish, purchase, permission, or data-export action | Require approval | Human confirmation bound to rendered action parameters |
| Release regression | Holdout success, recovery, or violation rate crosses threshold | Do not promote | Versioned holdout gate and rollback |

## Smallest resolving evaluation

Run a fixed, versioned **30–50 task** private holdout in an isolated environment with production-equivalent permissions and reversible fixtures.

1. Include normal workflows, ambiguous requests, malformed or unavailable tools, stale state, denied authorization, prompt-injection-bearing content, and authorization-boundary attempts.
2. Freeze model, prompt, tool schemas, policy, credentials, evaluator, time budget, and retry budget.
3. Compare the release candidate with the current deployed configuration under identical tasks and tools.
4. Score separately:
   - deterministic task-success postcondition
   - unauthorized-action attempts
   - injection-following rate
   - secret-disclosure attempts
   - recovery after tool failure
   - duplicate side effects
   - unsafe retries
   - step, time, token, and cost budget exhaustion
5. Require non-regressing task success and **zero critical security-boundary violations**. Report counts, severity, confidence intervals, and failure traces, not only an average.

This establishes evidence only for that harness, task distribution, configuration, and attack set. Zero observed violations is not proof of security.

## Actionable operating rules

- Delegate only the minimum authority required for each task.
- Validate tool target, arguments, tenant, ownership, and authorization independently of model output.
- Keep credentials and policy decisions outside untrusted retrieved or tool-returned content.
- Require deterministic confirmation before declaring completion.
- Stop automatically on non-idempotent retry risk or exhausted budgets.
- Bind human approval to the exact rendered action and parameters.
- Gate releases on a private versioned holdout and retain failure traces for rollback decisions.

## Original-source leads, not inspected evidence

These URLs were identified in the legacy stream but were not inspected. They must not be treated as retained evidence or as support for any measurement above:

- AgentDojo: https://arxiv.org/abs/2406.13352
- ToolEmu: https://arxiv.org/abs/2309.15817
- WebArena: https://arxiv.org/abs/2307.13854
- OSWorld: https://arxiv.org/abs/2404.07972
- GAIA: https://arxiv.org/abs/2311.12983
- AgentBench: https://arxiv.org/abs/2308.03688

## Retained-source appendix

**None.** No external primary source was inspected or retained in the authorized legacy streams.