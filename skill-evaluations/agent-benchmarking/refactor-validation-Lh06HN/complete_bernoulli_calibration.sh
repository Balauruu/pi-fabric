#!/usr/bin/env bash
set -u
cd /home/balauru/.pi-profiles/fabric/skills/agent-benchmarking || exit 2
BASE=/home/balauru/.pi-profiles/fabric/skill-evaluations/agent-benchmarking/refactor-validation-Lh06HN
export OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1
# One bounded continuation. No retry loop and no changes to the frozen plan.
timeout --signal=TERM 16h .venv/bin/python -B tests/bernoulli_calibration.py run "$BASE/bernoulli-calibration-v1" --max-new-fits 798
status=$?
printf '{"exitCode":%d,"finishedEpochSeconds":%s}\n' "$status" "$(date +%s)" > "$BASE/bernoulli-calibration-v1-completion.json"
# This is read-only with respect to the study, including when its verdict is red.
.venv/bin/python -B "$BASE/audit_bernoulli_calibration.py"
exit "$status"
