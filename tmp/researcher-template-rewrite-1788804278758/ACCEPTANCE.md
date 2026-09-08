# Agreed researcher-template rewrite

Scope: replace rejected agents/researcher.md with a short skills/fabric-research/researcher.md request template, integrate it into the skill, and remove agents only if empty. Do not reuse the rejected persona. Preserve other work and historical research runs.

Criteria:
- Template is short, web-research-specific and directly usable as request options for agents.run/spawn with a task placeholder.
- Exact tools: web_search, fetch_content, get_search_content, read. Model openai-codex/gpt-5.6-terra; thinking high; runner pi; extensions true; recursive false; no fixed cwd, write/edit/shell/browser/delegation.
- Researchers return full substantive Markdown with original-source links, support, qualifications, counterevidence, required-question coverage and gaps. No path-only handoff or whole-note code fence.
- Workflow loads the canonical template for research and gap repair, saves result.text verbatim inside the program, checks native status/read-back, and sends only compact control outward.
- Researchers never own file persistence. Notes are saved after results arrive; unavailable partial evidence stays an explicit gap. No-write mode skips workflow persistence without a different researcher template.
- Discovery/planning, verification, synthesis, validation, and optional last30days collection retain explicit role-specific permissions rather than silently expanding the researcher's allowlist.
- All references align; no stale incremental researcher-save/readback or fixed-profile-cwd instruction. Skill remains discoverable with valid relative pointers.

Baseline: current skill requires researchers to write/read back streams incrementally and return a short path/status handoff. User explicitly rejected the long agents/researcher.md design. Its body is not an input to the replacement.

Checks: discriminating static ownership/template checks; compile template against Fabric's guest types; actual bounded web-research return -> verbatim workflow persistence probe; direct failure/empty/partial/no-write persistence probes; independent bounded review. No entire broad research replay or engine-install test.
