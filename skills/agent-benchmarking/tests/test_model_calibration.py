"""Prespecified repeated-sampling checks for finite-task Gaussian predictions.

This is a slow scientific validation, not a per-benchmark prerequisite. Every
failed fit counts as noncoverage; results are never survivor-filtered. The two
DGPs match the supported covariance families. No model-agent calls occur.
"""
import json
import math
import os
from pathlib import Path
import time
import unittest
import warnings

from test_analysis_models import analysis_models, method, request

REPLICATES = 400
ROOT_SEED = 202609051
COVERAGE = .95
MINIMUM_COVERAGE = COVERAGE - 3 * math.sqrt(COVERAGE * (1 - COVERAGE) / REPLICATES)
MAX_FAILED_FRACTION = .025


def generated_request(kind, seed):
    import numpy as np
    rng = np.random.default_rng(seed)
    crossed = kind == 'crossed-independent-components'
    n_tasks = 10 if crossed else 20
    repetitions = 2 if crossed else 8
    tasks = [f'task-{i:02d}' for i in range(n_tasks)]
    weights = np.arange(1., n_tasks + 1); weights /= weights.sum()
    covariance = [[1., 0.], [0., .36]] if crossed else [[1., .18], [.18, .36]]
    latent = rng.multivariate_normal([0., 0.], covariance, n_tasks)
    graders = rng.normal(0., .6, 4) if crossed else []
    rows, labels = [], []
    for i, task in enumerate(tasks):
        for x, condition in enumerate(['control', 'candidate']):
            mu = -.2 + latent[i, 0] + x * (.7 + latent[i, 1])
            for repetition in range(repetitions):
                attempt = f'{task}-{condition}-{repetition}'
                row = dict(attemptId=attempt, taskId=task, conditionId=condition, outcomes=[])
                rows.append(row)
                if crossed:
                    output = rng.normal(0., .35)
                    for j, grader in enumerate(graders):
                        value = mu + output + grader + rng.normal(0., .3)
                        labels.append(dict(gradeId=f'{attempt}-g{j}', attemptId=attempt,
                            graderId=f'grader-{j}', status='valid',
                            labels=[dict(criterionId='quality', score=float(value), status='valid')]))
                else:
                    row['outcomes'] = [dict(metricId='quality', status='observed', value=float(mu + rng.normal(0., .45)))]
    selected = method('gaussian-mixedlm', seed=seed,
        random_effects=['task-intercept', 'task-condition'] + (['grader-intercept'] if crossed else []))
    selected['intervalProbability'] = COVERAGE
    q = request(selected, rows, tasks, **({'labels': labels} if crossed else {}))
    q['pairedResult']['contrast'].update(scope='finite-task-set',
        estimand='task-weighted-mean-difference', taskWeighting='saved', metricSummary='mean')
    truth = float(weights @ (.7 + latent[:, 1]))
    return q, truth


class GaussianCoverageCalibration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import numpy as np
        from scipy.stats import binomtest
        cls.results = {}
        output = os.environ.get('BENCHMARK_MODEL_CALIBRATION_OUTPUT')
        protocol = dict(kind='protocol', replicatesPerDesign=REPLICATES, rootSeed=ROOT_SEED,
                        nominalCoverage=COVERAGE, minimumCoverage=MINIMUM_COVERAGE,
                        maxFailedFraction=MAX_FAILED_FRACTION, failedFitsCountAsNoncoverage=True)
        # Explicit recovery of a test-reporter interruption only. This is not a
        # way to validate changed model code from old fits: normal runs are fresh.
        resume = os.environ.get('BENCHMARK_MODEL_CALIBRATION_RESUME') == '1'
        cached = {}
        if resume:
            if not output:
                raise ValueError('reporter recovery requires its original evidence file')
            with Path(output).open(encoding='utf-8') as saved:
                if json.loads(next(saved)) != protocol:
                    raise ValueError('calibration protocol changed; do not reuse these fits')
                for line in saved:
                    record = json.loads(line)
                    if 'replicate' in record:
                        key = record['kind'], record['replicate']
                        if key in cached: raise ValueError('duplicate saved replicate')
                        cached[key] = record
        handle = Path(output).open('a' if resume else 'x', encoding='utf-8') if output else None
        def emit(value):
            line = json.dumps(value, allow_nan=False)
            if handle:
                handle.write(line + '\n'); handle.flush()
        if not resume:
            emit(protocol)
        try:
            streams = np.random.SeedSequence(ROOT_SEED).spawn(2)
            for kind, stream in zip(['correlated-task-effects', 'crossed-independent-components'], streams):
                start = time.monotonic(); covered = failed = reused = 0; errors = []; widths = []
                for index, child in enumerate(stream.spawn(REPLICATES)):
                    seed = int(child.generate_state(1)[0])
                    q, truth = generated_request(kind, seed)
                    previous = cached.get((kind, index))
                    if previous is not None:
                        if previous['seed'] != seed or abs(previous['truth'] - truth) > 1e-12:
                            raise ValueError('saved replicate differs from the frozen generator')
                        reused += 1
                        result = dict(status=previous['status'],
                                      model={'outcomeScaleContrast': previous['contrast']},
                                      diagnostics=previous['failures'])
                    else:
                        with warnings.catch_warnings():
                            warnings.simplefilter('ignore')  # Failure diagnostics are retained below.
                            result = analysis_models.analysis_models(q)
                    c = (result.get('model') or {}).get('outcomeScaleContrast')
                    usable = result['status'] == 'complete' and c is not None
                    if usable:
                        low, high = c['interval']
                        hit = low <= truth <= high
                        covered += int(hit); errors.append(c['estimate'] - truth); widths.append(high - low)
                    else:
                        failed += 1; hit = False
                    if previous is None:
                        emit(dict(kind=kind, replicate=index, seed=seed, truth=truth, status=result['status'],
                                  covered=bool(hit), contrast=c,
                                  failures=result['diagnostics'] if not usable else []))
                interval = binomtest(covered, REPLICATES).proportion_ci(.95, method='exact')
                row = dict(design=kind, replicates=REPLICATES, covered=covered, failed=failed,
                    coverage=covered / REPLICATES,
                    monteCarloSE=math.sqrt((covered / REPLICATES) * (1 - covered / REPLICATES) / REPLICATES),
                    exact95Interval=[float(interval.low), float(interval.high)],
                    reusedSavedReplicates=reused,
                    meanErrorAmongUsableFits=float(np.mean(errors)) if errors else None,
                    meanIntervalWidth=float(np.mean(widths)) if widths else None,
                    elapsedSeconds=time.monotonic() - start)
                cls.results[kind] = row; emit(dict(kind='summary', **row))
                print('GAUSSIAN_COVERAGE ' + json.dumps(row), flush=True)
        finally:
            if handle: handle.close()

    def check_design(self, kind):
        r = self.results[kind]
        self.assertGreaterEqual(r['coverage'], MINIMUM_COVERAGE, r)
        self.assertLessEqual(r['failed'] / REPLICATES, MAX_FAILED_FRACTION, r)

    def test_correlated_task_effects(self):
        self.check_design('correlated-task-effects')

    def test_crossed_independent_components(self):
        self.check_design('crossed-independent-components')


if __name__ == '__main__':
    unittest.main()
