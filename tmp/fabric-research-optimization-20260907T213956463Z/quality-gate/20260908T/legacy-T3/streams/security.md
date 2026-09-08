# R3 operational evaluation note

## Research status

Blocked: the explicitly authorized `extensions.web_search` binding is not registered in this controller. Invocation returned `Unknown Fabric action: extensions.web_search`. I did not use ungranted browser, shell, MCP, local findings, reports, or reviews.

No external source was inspectable, so this note does not claim source-backed measurements, standards compliance, or security proof.

## Deployment decision table

| Condition observed locally | Failure signal | Decision | Control |
|---|---|---|---|
| Tool call exceeds authority | Target, argument, or scope differs from approved policy | Block | Typed allowlist, least-privilege credentials, argument validation |
| Untrusted tool/web content affects action selection | Model follows retrieved instruction or exposes secrets | Block and quarantine | Treat external content as data, isolate credentials, require policy decision outside model context |
| Task completion is unverifiable | No independently checkable artifact or tool-state confirmation | Escalate | Require deterministic postcondition checks |
| Repeated retries or loops | Call count, cost, elapsed time, or identical-error threshold exceeded | Stop | Per-task budgets, idempotency keys, circuit breaker |
| High-impact action is proposed | Delete, publish, purchase, permission, or data-exfiltration action | Require approval | Human confirmation bound to rendered action parameters |
| Evaluation performance regresses | Holdout success, policy-violation rate, or recovery rate crosses release threshold | Do not promote | Versioned holdout gate and rollback |

## Concrete failure signals

- Tool target is outside the declared allowlist.
- Tool arguments fail schema, tenancy, ownership, or authorization checks.
- A retrieved page, document, or tool response contains instructions that change the agent’s policy or credential handling.
- The agent cannot produce a machine-checkable completion artifact.
- A tool result conflicts with expected state, or a retry would repeat a non-idempotent action.
- Step, time, token, cost, or error budgets are exceeded.
- The agent requests an action above its delegated impact level.

## Smallest resolving evaluation

Run a fixed, versioned holdout of 30–50 representative tasks in an isolated environment:

1. Include normal tasks, malformed tool outputs, unavailable tools, ambiguous requests, prompt-injection-bearing retrieved content, and authorization-boundary attempts.
2. Freeze model, prompt, tool schemas, policy, credentials, and evaluator before execution.
3. Measure task success by deterministic postcondition, unauthorized-action attempts, injection-following rate, recovery after tool failure, duplicate side effects, and budget exhaustion.
4. Compare the release candidate against the current deployed configuration under identical tasks and tools.
5. Promote only if task success does not regress and every security-boundary violation is zero. Treat this as evidence for this harness and task distribution only, not proof of security.

## Limitations, counterevidence, coverage, and gaps

- A holdout measures only its tasks, tools, policies, evaluator, and attack set.
- Zero observed violations does not establish security against unrepresented prompt injections, tool implementations, credential paths, or human-approval failures.
- Task-success averages can conceal catastrophic low-frequency failures. Report counts and severity, not only means.
- No original external sources or inspected passages are retained because the permitted search binding was unavailable.

## Retained-source appendix

None. External research could not be performed through the only authorized transport.