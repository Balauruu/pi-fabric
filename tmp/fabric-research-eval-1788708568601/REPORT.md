# Fabric research implementation evaluation

## Scope and order

1. Implemented research contracts, material-claim ledger, evidence statuses and return validation.
2. Added conditional methodology gates, counterevidence, contradiction dispositions, independence/count rules and contract-based stopping.
3. Added scaled reporting, recommendation conditions and gap-specific resolving evaluations.

Changed only the main skill and two new references under skills/fabric-research. The existing last30days adapter is byte-for-byte unchanged. The pre-existing worker tool-grant policy, retrieval-verification rule and frontmatter are preserved. acceptance.json maps the requested practices to checked anchors; semantic review covered all three final files.

## Static and loading checks

- Installed Pi skill loader discovers fabric-research with zero diagnostics.
- disable-model-invocation remains true and the skill is omitted from automatic prompt exposure. This is a loader probe, not a live TUI command-invocation test.
- All four Markdown files are reachable; every relative link resolves.
- git diff --check passed.
- The standalone skill validator still rejects exactly the two pre-existing sibling-skill links in references/last30days.md. The links are valid installed dependencies, but the standalone validator requires self-contained skills. The integration-aware check verifies these exact exceptions and their targets; no new diagnostics were introduced.

## Behavioral evidence

Fixed synthetic evidence was tested in fresh baseline and candidate worker contexts, grouped into six evidence cases and six operational cases. Same model, effort, tools and fixture prompts were used. Workers read their assigned skill and applicable local references; all exercises were offline and no web retrieval, last30days execution or nested agents were launched.

An independent reviewer graded anonymized A/B outputs against declared criteria. It initially passed all candidate cases, but Main found that the rubric missed citation omissions in five evidence answers. A final-answer citation instruction had been weakened during restructuring. It was restored explicitly and all six evidence cases were rerun in a fresh context. Required supplied URLs were mechanically present in all six final answers; Main checked their substantive answers against the original criteria.

Three held-out cases exercised temporal contradictions with unknown matrix cells, counterevidence/research-contract planning, and independent stream assignments. Their returned plans and answers covered the intended branches. Six earlier operational cases were not rerun after the citation-only correction because they have no changed operational instruction; they remain screening evidence for those branches, not end-to-end runtime tests.

Final inspected set: 15 distinct offline cases (six evidence, six operations, three held-out). Outputs: evidence-final.json, candidate-operations.json, heldout-final.json. Citation checks: citation-checks.json. Original reviewer output: review.md. The original review is historical, not an unqualified final verdict: it missed citations and its criticism of the baseline's zero-regression-margin assumption is interpretively ambiguous given the fixture's strict per-task correctness requirement. No numerical quality uplift or statistical significance is claimed.

## Limits and stop reason

These are single-sample, grouped response/plan probes. They do not establish live retrieval reliability, exact runtime launch counts, real failure recovery, engine execution, invocation via the interactive slash command, or robustness across repeated paraphrases. Static loading and link checks are real execution checks. No dependencies were installed or runtime/provider configuration changed.

Stopped after the observed citation regression was corrected, affected cases and held-out branches passed inspection, and requested guidance plus existing user changes were mechanically accounted for. Evaluation artifacts remain outside the skill directory.
