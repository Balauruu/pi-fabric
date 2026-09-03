# Global User Guidance

## Environment

- Host: CachyOS, based on Arch Linux.
- Pi's shell tool runs Bash.
- `/usr/bin/python` is system-managed. Never install packages into it with `pip` or `sudo pip`; use the project's declared environment.

## Pi Profile Isolation

- `/home/balauru/.pi-profiles/fabric` is the only Pi profile in scope.
- Treat `/home/balauru/.pi/agent` as blacklisted. Never touch it.
`
## Working Agreement

- Preserve user-authored and uncommitted changes. Do not discard or overwrite them unless explicitly requested.
- For time-sensitive or external claims, verify with available web tools, prefer primary sources, and cite links.

## Project Documentation

- Keep agent-facing directory guidance in scoped `AGENTS.md` files and human-facing explanations in README files.
- When a task changes durable project conventions, commands, or architecture, update the authoritative project documentation in the same task.
- Keep project `AGENTS.md` files concise. Do not add transistent information.

## Communication

- Be direct and concise.
- Use tables or diagrams only when they make the information materially clearer.
- Avoid em dashes; use a hyphen or rewrite the sentence.