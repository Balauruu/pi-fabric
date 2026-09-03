# Update References

Completion means reciprocal relative references are appended without duplication to mutable current PlanF3 plans, semantic records remain intact, lifecycle history is appended, and touched plans validate.

1. Resolve the target, related plans/documents, direction, and supplied metadata. A back reference is prior/dependency work; a forward reference builds on or extends this plan.
2. Validate every PlanF3 plan before mutation. Only documents satisfying both current contracts are mutable. Legacy, unmarked, and mixed documents may not be rewritten or retrofitted.
3. Append relative path plus short label to the correct metadata hook, replacing `None` on first append and skipping exact duplicates. Append requested commit/agent/session values by the same rule.
4. For each related **current PlanF3** plan, append the reciprocal opposite relationship. Plain documents and invalid/legacy PlanF3 documents may be referenced but are never mutated.
5. Preserve every semantic record, stable ID, dependency-derived wave/mode, ordering projection, File Impact delta, and Key metric. Append timestamp and available agent/session plus a concrete amendment to each touched current plan; lifecycle and amendment histories are append-only.
6. Run `node "$VALIDATOR" <touched-plan> [...]` and report touched files, reciprocal relative entries, duplicates skipped, immutable inputs, and validation output.
