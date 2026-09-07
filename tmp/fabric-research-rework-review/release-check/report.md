# fabric-research targeted final release evaluation

## Verdict: PASS

Evaluated root: `/home/balauru/.pi-profiles/fabric/.worktrees/research-skill-rework`  
Branch: `research-skill-rework`  
Profile: `/home/balauru/.pi-profiles/fabric`

I read the fresh `SKILL.md` and all four supporting files. I did not access `/home/balauru/.pi/agent`, edit shipped files, launch workers, inject failures, install/configure anything, use browser/auth/provider overrides, commit, or push. All evaluator-created artifacts are under this `release-check/` directory.

## Evaluated source SHA-256

```text
7f1beb21a55f303dc5b6cb5886dea211f46f8356e0edbe0704373a20bd0ba01d  skills/fabric-research/SKILL.md
f4b21eb9647fc061b7ad8056c359e2ab0fd68911fad511b7431971e5af01705f  skills/fabric-research/references/last30days.md
f2a6e7a8792c02cadab860061970235fd74013636d55ae9b557bb4f1f7543572  skills/fabric-research/references/stream-contracts.md
1d2a0071b91d56d09158deacca39dc848d669ea46e5c51a2dac9962e523d47b0  skills/fabric-research/references/synthesis-and-reporting.md
a05bd80bc9f17cea029fa1de09e99656cbc4f07555c2b3467a887f4e99736e7e  skills/fabric-research/references/evidence.schema.json
```

## Checks passed

- **Static composition:** the standalone validator passed: `OK fabric-research: valid frontmatter, local links, and 5 reachable files`. The actual Pi loader found exactly `fabric-research`, `disableModelInvocation: true`, with no diagnostics. AJV compiled the current evidence schema.
- **All-stage helper composition:** the adapted temporary TypeScript checker compiled all seven fenced blocks with current dynamic contracts and prepended the exact shared helper to A, B, C, D, and E (blocks 2, 3, 5, 6, 7). Syntax and semantic diagnostics were empty.
- **Current capability contract:** the exact Terra key is available. Separate discovery found evaluator-granted `extensions.web_search`, `fetch_content`, `get_search_content`, and `source_check`; their current input contracts plus `agents.run` are retained in `current-contracts.json`. The earlier tool-unavailable finding was an omitted child allowlist grant, not a broken host configuration. Current C still grants `s.plan.requiredActions` and sends the corresponding `extensions.*` refs.
- **Fresh direct behavior:** the narrow shortcut fetched real SQLite WAL content successfully, response `mtqw19mew21xto`. Current A then passed with `profileOK`, `modelOK`, and no missing action; current B fetched the same primary source successfully, response `mtqw2oe9wsie2i`, and persisted a receipt. These calls used no browser, auth, or provider override. `workflow: "none"` remains the static web-search path; this narrow fetch has no web-search workflow field.
- **Small/sharded I/O:** fresh B wrote a 30-byte packet index and four fragments (three 8,000-byte fragments plus 6,758 bytes). Current helper round-tripped that actual 30,758-code-point receipt and an actual saved 25,723-code-point concurrency native envelope byte-for-byte and JSON-equivalently. Both reserialized as sharded packets.
- **No raw opaque/full-result returns in corrected stages:** B retains native `details`/text in its receipt and returns only a clipped excerpt/error. C returns a 20-item status page, clipped error, `hasUsage`, and the unmodified confirmed ID, while retaining native outcome/usage data in the ledger/packet. D returns 20-item candidate/flag pages with clipped display fields. E saves full execution, coverage, evidence, support, and citations in `synthesis-input.json`, then returns counts and bounded coverage/evidence/citation pages, with no `...result` spread. A returns selected effective input schemas, as A's documented inspection output, but no raw native envelope/details.
- **C ID/status preservation, static against real outcomes:** current C maps `id: o.id` without replacing it and returns `hasUsage` rather than opaque usage. The retained live statuses/IDs are `40ab07cb56ee491d8de2b707f273246f` and `e664e4475cc64057b8fba1e075912e88` (`completed`). No worker was launched for this check.
- **Natural-failure D replay:** against preserved actual native records, D retained the failed concurrency ID `1ff169b39bf643228d8567f23cda2e53` as `failed` and the successful backup ID `94479f3ee142442faca80b8e9b3a3cd6` as `completed`. It produced 7 candidates and 8 flags, including the native failure and `Unvalidated partial text`; it did not relabel the failed worker or discard its sibling.
- **Actual reviewed E replay:** using the copied `live-run-20260328-a-cde` ledger and review packet, E returned `success`: 2 confirmed launches, 0 indeterminate, 4 supported slots, and 7 citation-ready reviewed rows. Full evidence remains in the packet. This was a replay of saved evidence, not a new research run.
- **Policy/link/whitespace audit:** browser prohibition, no-fetch-auth, provider-override prohibition, exact worker policy, profile isolation, and conditional last30days boundary remain in the current files. Both absolute last30days targets exist. `git diff --check` passed globally. There are no existing unrelated whitespace errors to report.

## Limitations

- This is a focused correction check. It deliberately did not rerun the previously passing live research children, create a new natural failure, or make preference/blind-quality claims.
- Only the two required fresh SQLite fetches were live retrieval probes. The other three web actions were discovered/described, not provider-health tested.
- E's replay loaded the copied reviewed packet through the same current `loadJSON` helper before applying E's unchanged validation/accounting logic; the documented exact E body was independently type-checked with its named `review` payload. Static checks cannot prove a final ledger-write failure recovery or child prompt adherence.

## Remaining actionable defects

None found in the targeted output-projection/packet-I/O correction.

## Required pre-merge cleanup

Delete `tmp/fabric-research-rework-review/release-check/` and the earlier evaluator artifact directories before merge. Do not ship or commit any review output.
