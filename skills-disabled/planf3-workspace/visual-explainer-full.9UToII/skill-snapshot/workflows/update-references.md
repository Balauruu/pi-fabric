# Update References

Completion means every requested metadata/reference entry and reciprocal relationship is appended without duplication, every touched plan records the amendment, and all touched plans validate.

1. **Identify plans and entries** - Resolve and read the target plan, related plans or documents, and any metadata values supplied by `USER_PROMPT`.
2. **Determine direction** - A back reference points to work this plan builds on or depends on. A forward reference points to work that builds on or extends this plan.
3. **Preflight hooks** - Locate metadata through `data-planf3-meta`. If an older plan lacks a required hook, add that hook around the existing value without replacing unrelated markup.
4. **Append this plan's entries** - Add relative path plus short label to `data-planf3-meta="back-references"` or `"forward-references"`. Replace `None` on the first append and skip exact duplicates. Append any requested commit, agent, or session metadata using the same rule.
5. **Append reciprocal references** - For each related PlanF3 HTML plan, append the opposite relationship. Plain documents that do not implement the PlanF3 metadata contract are referenced but not rewritten.
6. **Record lifecycle metadata** - Append the current ISO timestamp to `modified` and current agent/session values when available on every PlanF3 plan touched.
7. **Append amendments** - Remove the Amendments empty state on first use and append a concrete entry at the bottom of each touched plan describing the metadata and references added.
8. **Validate and report** - Run `node "$VALIDATOR" <touched-plan> [...]` for every touched PlanF3 plan. Report each file and every entry added or skipped as a duplicate.
