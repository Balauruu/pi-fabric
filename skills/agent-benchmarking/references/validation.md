# Validation

Run checks from the skill directory with the project-local environment:

```sh
cd /home/balauru/.pi-profiles/fabric/skills/agent-benchmarking
.venv/bin/python -m pip check
# Full local suite after cross-cutting changes:
.venv/bin/python -B -m unittest discover -s tests -p 'test_*.py'
node tests/test_fixed_guest.mjs
node tests/test_skill_loading.mjs

# For a narrow edit, run only its owning test module first, for example:
PYTHONPATH=tests .venv/bin/python -B -m unittest test_legacy_report
```

These are focused behavioral tests, not source-identity or release certification. They cover strict caller/spec contracts, file-only lifecycle and reporting, create-only publication, conservative resume, bounded continuation, objective and blinded grading, native measurement semantics, assignment-matched randomization, bootstrap, decisions, multiplicity, finite looks, missingness/reliability/sensitivity, frequentist and Bayesian model paths, lazy backend behavior, and the exact fixed guest.

For a local no-build smoke, execute `workflows/benchmark.ts` directly in a Fabric invocation with a disposable absolute fixture spec/run directory. Confirm that the returned native agent result has the selected behavior before treating a runtime capability as available. Capability admission does not inspect Pi or Fabric version labels.

## Frozen scientific calibration

`tests/test_model_calibration.py` separates repeated Gaussian operating-characteristic checks from a single posterior recovery example. Its two designs use 400 frozen replicates each and explicit Monte Carlo tolerances. Failed fits remain in the denominator. Run that expensive selected check without rerunning unchanged MCMC fits:

```sh
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 \
PYTHONPATH=tests \
.venv/bin/python -B -m unittest test_model_calibration
```

Preserve failed draws, original seeds and criteria. A known-variance oracle diagnoses conditional prediction independently; it does not validate plug-in variance estimation. Good posterior diagnostics do not guarantee that every individual 95% interval contains the generating value. Any protocol correction needs explicit justification, not a favorable rerun.

## Bernoulli multi-dataset calibration

`tests/bernoulli_calibration.py` is an explicit, expensive calibration command, not an automatically collected MCMC test. `test_bernoulli_calibration.py` exercises its deterministic failure/continuation contracts without fitting.

```sh
PYTHONPATH=tests .venv/bin/python -B -m unittest test_bernoulli_calibration
# Choose a NEW directory; init freezes all seeds/settings before outcome generation.
CAL=/absolute/new-calibration
.venv/bin/python -B tests/bernoulli_calibration.py init "$CAL"
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 \
.venv/bin/python -B tests/bernoulli_calibration.py run "$CAL" --max-new-fits 2
.venv/bin/python -B tests/bernoulli_calibration.py report "$CAL"
```

The frozen study has 400 effect and 400 null datasets, each using four chains with 1500 tuning and 2000 retained draws. The initial bounded batch is two fits, not the full study. Continuation uses only the next unattempted prefix; an interrupted assignment blocks instead of refitting. Never change seeds, fitting settings, generator/model code or criteria while resuming. Full returned analysis/diagnostics are saved; posterior arrays are not persisted for this study.

Failures remain in coverage/recovery denominators and conservatively count as null false positives. Partial studies cannot pass. This supplementary calibration does not replace or close the original failed recovery/coverage gates. See the [predeclared plan](../../../skill-evaluations/agent-benchmarking/refactor-validation-Lh06HN/bernoulli-calibration-plan.md).

## Review rules

- Validate malformed, boundary, known-good, known-bad, isolated-defect, interruption, and duplicate cases through production validators.
- Use independent hand calculations or exhaustive small supports for statistical references.
- Seed Monte Carlo and report Monte Carlo uncertainty; do not use simulation to excuse a mismatched assignment law.
- Measure model import, fit, diagnostics, posterior persistence, and resource footprint with the actually selected project-local backend.
- Snapshot a run directory before and after `report`; bytes and entries must be identical.
- Verify historical run directories remain unchanged and only `SKILL.md` advertises the current fixed guest.
- Never count an `unsupported` response as implementation evidence for a planned method.
- For fresh-context skill tests, verify the actual native `read` path and report command, not just the final answer. Use the authorized active profile; a session that loads another profile's skill is invalid evidence. Keep positive, implicit, near-miss, run/resume, and read-only report cases separate.
- Preserve independent adversarial reproductions when a passing suite misses a defect. Add red-capable regressions before repairing decisions, allocation support, uncertainty, diagnostics, or selected-option wiring.

The acceptance ledger and method matrix in [README.md](../README.md) are the human-readable evidence index.
