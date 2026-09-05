# Global User Guidance

## Environment and Safety

- Host: CachyOS, based on Arch Linux. Shell commands run through Bash.
- `/usr/bin/python` is system-managed. Never install packages into it with `pip` or `sudo pip`; use the project's declared environment.
- Preserve user-authored and uncommitted changes. Do not discard or overwrite them unless explicitly requested.


## Pi Profile Isolation

- `/home/balauru/.pi-profiles/fabric` is the only Pi profile in scope.
- Treat `/home/balauru/.pi/agent` as blacklisted. Never touch it.

## Fabric-First Execution

- In full-code mode, use `fabric_exec` as the model's tool-execution path. Use `pi.*` inside it for Pi core tools.
- Route captured extension tools through `extensions.*`, MCP tools through `mcp.*`, and stable Fabric providers through their documented first-class proxies. Reserve `tools.call()` for discovered or computed refs.
- For unfamiliar capabilities, use `tools.list`, `tools.search`, and `tools.describe`; read the effective input schema and never guess an API.
- Batch independent, bounded operations in one program with `Promise.all`; keep dependent and conditional steps sequential. Do not parallelize conflicting effects.
- Return compact evidence, decisions, and failures. Keep unused intermediate results inside the program; use `display.name` and `display.description` to state the objective.

## Working Method

- Convert requests into concrete acceptance checks and trace the relevant execution path before editing.
- Search before reading: use bounded `pi.grep`/`pi.find` and targeted `pi.read` ranges. Reserve whole-file reads for small files needed in full or documentation that explicitly requires complete reading. Avoid bulk-reading dependencies, generated artifacts, caches, or evaluation histories.
- Implement requested changes end to end, then run the smallest targeted tests and direct behavioral probes that cover the acceptance checks.
- Distinguish observed, configured, enabled, installed, and currently available behavior. Flag conflicting or uncertain evidence instead of inventing policy.
- For time-sensitive or external claims, verify with available web tools, prefer primary sources, and cite links.

## Supporting Capabilities
- Use pi-fovea for token-efficient surveys of unfamiliar or large repositories, symbol tracing, and change-impact analysis. Treat its graph as navigation evidence. A narrow text search is sufficient for simple lookups; source reads and project checks remain authoritative.

## Documentation

- Keep durable agent guidance in scoped `AGENTS.md` files, human explanations in README files, and specialized procedures in skills. Avoid duplicated manuals and transient versions, models, runtime state, or capability inventories.
- When authorized work changes durable conventions, commands, or architecture, update the authoritative documentation in the same task.

## Communication

- Be direct and concise. Show file paths clearly; distinguish observations, inferences, proposals, and unknowns. Flag conflicting evidence rather than inventing policy.
- Use tables and diagrams when materially clearer. Avoid em dashes; use a hyphen or rewrite.

