# Audit and reporting

## Historical saved reports

Use the stdlib-only [historical reader](../scripts/inspect_legacy_report.py) for an existing old `decision-report.json` or Markdown report:

```sh
python -I -S -B scripts/inspect_legacy_report.py /absolute/old-run/analysis/analysis-v1/outputs/decision-report.json
```

This prints the saved document unchanged. It does not migrate formats, regrade, recompute statistics, resume paid work, or write any files. Select the actual saved report path; older layouts may differ. If no report was published, inspect individual old records read-only rather than inventing a migrated result.

## Current reports

Files in the run directory are authoritative. `checkpoint.json` is only a cache. Reporting reconstructs counts and completion from the saved spec, schedule, create-only attempt records, frozen grade plans, individual grade records, analysis, and telemetry.

The report operation is strictly read-only: no dispatch, capability/backend probe, deterministic repair, lock removal, package install, index creation, or file publication. It can inspect partial runs without numerical or model libraries. An ambiguous assigned attempt or grade job is reported as blocked with its ID and is never replayed.

A final report separates:

- operational completion from scientific decision;
- first attempts from retry-policy and pass-at-k summaries;
- measured calls from grading calls;
- observed zero from unavailable usage;
- finite-task conclusions from population claims;
- raw from multiplicity-adjusted results;
- superiority from practical superiority and non-inferiority;
- primary results from missingness, grader, model, and sensitivity analyses.

Include effect estimates, intervals, p-values when valid, practical margins, failure/intercurrent-event counts, worst-task regressions, telemetry limitations, diagnostics, and the smallest useful follow-up. `complete` requires exact record reconciliation and published reports, but it does not force an adoption conclusion. Unsupported or failed selected analysis remains a non-success scientific state rather than being relabeled complete.
