# R2 research note: blocked by unavailable granted transport

**Coverage:** None. The only authorized web actions, `extensions.web_search`, `extensions.fetch_content`, and `extensions.get_search_content`, are not registered in this controller. Direct calls returned `Unknown Fabric action`.

**Consequences:** I cannot truthfully provide inspected passages, original URLs, quantitative counterevidence, or source-bound conclusions on leakage, evaluator reliability, or transfer limits without violating the assigned tool restriction.

**Gaps:** All R2 evidence slots remain unfilled: benchmark contamination, test/evaluator validity, run-to-run reliability, harness dependence, and production-transfer limits.

**Required remedy:** Register the three explicitly authorized `pi-web-access` actions in the direct-controller transport, then rerun this assignment.