"""Fixed-DGP Bernoulli calibration, not a replacement for the original red gate.

Explicit CLI only. Init freezes all cases before generating outcomes. Run consumes
only the next unattempted prefix; assignment without result blocks, never retries.
Do not resume after changing the generator, model implementation or protocol.
"""
import argparse
import fcntl
import json
import math
from pathlib import Path
import time

from test_analysis_models import (SCIENTIFIC_DIAGNOSTICS, analysis_models,
                                  method, request, scientific_rows)

REPLICATES = 400
ROOT_SEED = 202609052
MINIMUM = .95 - 3 * math.sqrt(.95 * .05 / REPLICATES)


def selected(seed):
    m = method('bayesian-bernoulli', seed=seed,
               random_effects=['task-intercept', 'task-condition'],
               priors={**SCIENTIFIC_DIAGNOSTICS, 'tune':1500,
                       'priorPredictiveDraws':200, 'targetAccept':.95,
                       'maxTreeDepth':10, 'interceptMean':0., 'interceptScale':2.5,
                       'conditionMean':0., 'conditionScale':1.5,
                       'taskScale':1., 'taskConditionScale':1.,
                       'sensitivity':[{'id':'skeptical','conditionScale':.8},
                                      {'id':'diffuse','conditionScale':2.5}]})
    m.update(draws=2000, chains=4, intervalProbability=.95)
    return m


def protocol():
    import numpy as np
    streams = np.random.SeedSequence(ROOT_SEED).spawn(2)
    seeds = [stream.spawn(REPLICATES) for stream in streams]
    cases = []
    for index in range(REPLICATES):
        for design, effect, stream in [('effect',.9,0), ('null',0.,1)]:
            data, sampler = seeds[stream][index].spawn(2)
            cases.append(dict(id=f'{len(cases):04d}', design=design, effect=effect,
                              dataSeed=int(data.generate_state(1)[0]),
                              samplerSeed=int(sampler.generate_state(1)[0])))
    return dict(schemaVersion=1, rootSeed=ROOT_SEED, replicatesPerDesign=REPLICATES,
                purpose='Supplementary fixed-DGP calibration; original failed gates remain binding.',
                generator=dict(function='test_analysis_models.scientific_rows',likelihood='bernoulli',
                               tasks=20,repetitionsPerCondition=40,interceptSD=.55,slopeSD=.45,
                               taskWeights='normalized 1..20',centering='zero finite-task rate difference before effect'),
                methodTemplate=selected(0), nominalCoverage=.95, minimumCoverage=MINIMUM,
                maximumFailedFraction=.025, minimumRecoveryFraction=MINIMUM,
                recovery=dict(absoluteErrorMaximum=.07,intervalWidthMaximumExclusive=.20),
                maximumNullFalsePositiveFraction=1-MINIMUM,
                failuresCountAsNoncoverageAndNonrecovery=True,
                nullFailuresCountAsFalsePositives=True, retries=0,
                posteriorDrawPersistence=False, cases=cases)


def write_new(path, value):
    with path.open('x', encoding='utf-8') as handle:
        json.dump(value, handle, allow_nan=False, sort_keys=True)
        handle.write('\n')


def initialize(directory):
    p = protocol()  # Seeds/settings only: no outcomes or fitting.
    directory.mkdir(parents=True, exist_ok=False)
    write_new(directory/'protocol.json', p)
    (directory/'cases').mkdir()
    return dict(status='predeclared',planned=len(p['cases']),directory=str(directory))


def classify(record):
    r = record['result']; model = r.get('model') or {}
    c = model.get('outcomeScaleContrast') or {}
    diagnostics = {d['code']:d for d in r.get('diagnostics',[])}
    codes = ['RANK_NORMALIZED_SPLIT_RHAT','EFFECTIVE_SAMPLE_SIZE',
             'MONTE_CARLO_STANDARD_ERROR','DIVERGENCES']
    coords = diagnostics.get('PARAMETER_COORDINATE_DIAGNOSTICS',{}).get('coordinates',[])
    usable = r.get('status') == 'complete' and model.get('inferenceUsable') is True
    usable = usable and all(diagnostics.get(code,{}).get('passed') is True for code in codes)
    usable = usable and bool(coords) and any(x.get('variable') == 'outcome_scale_contrast' for x in coords)
    usable = usable and all(x.get('samplesFinite') is True and
        all(isinstance(x.get(k),(int,float)) and math.isfinite(x[k])
            for k in ['rhat','bulk','tail','mcse','relativeMcse']) for x in coords)
    try:
        low, high = c['interval']; estimate = c['estimate']
        usable = usable and all(math.isfinite(v) for v in [low,high,estimate]) and low < high
    except (KeyError,TypeError,ValueError):
        usable = False
    if not usable:
        return dict(failed=True,covered=False,recovered=False,
                    falsePositive=record['case']['design'] == 'null',error=None)
    truth = record['truth']
    return dict(failed=False,covered=low <= truth <= high,
                recovered=abs(estimate-truth) <= .07 and high-low < .20,
                falsePositive=record['case']['design'] == 'null' and not (low <= 0 <= high),error=estimate-truth)


def summarize(records, p):
    from scipy.stats import binomtest
    expected = {c['id']:c for c in p['cases']}
    ids = [r['case']['id'] for r in records]
    if len(set(ids)) != len(ids) or any(r['case'] != expected.get(r['case']['id']) for r in records):
        raise ValueError('duplicate, extra or changed calibration case')
    summaries = []
    for design in ['effect','null']:
        values = [classify(r) for r in records if r['case']['design'] == design]
        n = len(values); total = p['replicatesPerDesign']
        counts = {k:sum(int(v[k]) for v in values) for k in ['failed','covered','recovered','falsePositive']}
        errors = [v['error'] for v in values if v['error'] is not None]
        complete = n == total
        passed = complete and counts['covered']/total >= p['minimumCoverage'] and counts['failed']/total <= p['maximumFailedFraction'] and counts['recovered']/total >= p['minimumRecoveryFraction']
        if design == 'null':
            passed = passed and counts['falsePositive']/total <= p['maximumNullFalsePositiveFraction']
        ci = binomtest(counts['covered'],n).proportion_ci(.95,method='exact') if n else None
        summaries.append(dict(design=design,observed=n,planned=total,**counts,
            coverage=counts['covered']/n if n else None,
            exact95Interval=[ci.low,ci.high] if ci else None,
            meanErrorAmongUsableFits=sum(errors)/len(errors) if errors else None,
            verdict=('passed' if passed else 'failed') if complete else 'incomplete'))
    complete = len(records) == len(p['cases'])
    return dict(status=('passed' if all(s['verdict']=='passed' for s in summaries) else 'failed') if complete else 'incomplete',
                completed=len(records),planned=len(p['cases']),designs=summaries,
                originalAcceptanceGates='unchanged; supplementary calibration cannot close A07/A13')


def load(directory):
    p = json.loads((directory/'protocol.json').read_text())
    if p != protocol():
        raise ValueError('frozen protocol differs; do not reuse old fits for a changed protocol')
    records = []
    pending_seen = False
    for case in p['cases']:
        stem = directory/'cases'/case['id']
        assignment = stem.with_suffix('.assignment.json')
        result = stem.with_suffix('.result.json')
        if assignment.exists() and not result.exists():
            raise ValueError(f'ambiguous attempt {case["id"]}; never refit it')
        if result.exists():
            if pending_seen or not assignment.exists() or json.loads(assignment.read_text()) != case:
                raise ValueError('non-prefix or inconsistent calibration records')
            r = json.loads(result.read_text())
            if r['case'] != case:
                raise ValueError('result case differs from frozen assignment')
            records.append(r)
        else:
            pending_seen = True
    allowed = {f'{c["id"]}.{kind}.json' for c in p['cases'] for kind in ['assignment','result']}
    if any(f.name not in allowed for f in (directory/'cases').iterdir()):
        raise ValueError('unexpected calibration records')
    return p, records


def run_batch(directory, maximum, fit=None):
    if maximum < 1:
        raise ValueError('max-new-fits must be positive')
    fit = fit or analysis_models.analysis_models
    with (directory/'.calibration.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        p, records = load(directory)
        for case in p['cases'][len(records):len(records)+maximum]:
            stem = directory/'cases'/case['id']
            write_new(stem.with_suffix('.assignment.json'),case)
            rows,tasks,truth = scientific_rows('bernoulli',case['effect'],case['dataSeed'])
            q = request(selected(case['samplerSeed']),rows,tasks)
            q['pairedResult']['contrast'].update(scope='finite-task-set',
                estimand='task-weighted-mean-difference',taskWeighting='saved',metricSummary='mean')
            start = time.monotonic()
            try:
                result = fit(q)
            except Exception as error:
                result = dict(status='failed',model=None,diagnostics=[dict(code='CALIBRATION_FIT_EXCEPTION',message=str(error))])
            record = dict(case=case,truth=truth,result=result,elapsedSeconds=time.monotonic()-start)
            write_new(stem.with_suffix('.result.json'),record)
            records.append(record)
            print(json.dumps(dict(case=case['id'],design=case['design'],**classify(record))),flush=True)
        return summarize(records,p)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation',choices=['init','run','report'])
    parser.add_argument('directory',type=Path)
    parser.add_argument('--max-new-fits',type=int,default=2)
    args = parser.parse_args()
    if args.operation == 'init':
        value = initialize(args.directory)
    elif args.operation == 'run':
        value = run_batch(args.directory,args.max_new_fits)
    else:
        p, records = load(args.directory)
        value = summarize(records,p)
    print(json.dumps(value,allow_nan=False),flush=True)
    if value['status'] == 'failed':
        raise SystemExit(1)
