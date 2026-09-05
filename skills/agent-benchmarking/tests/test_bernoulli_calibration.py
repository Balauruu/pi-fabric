import copy
import json
from pathlib import Path
import tempfile
import unittest

import bernoulli_calibration as calibration


class BernoulliCalibrationContract(unittest.TestCase):
    def test_frozen_independent_streams_and_strict_settings(self):
        p = calibration.protocol()
        self.assertEqual(p,calibration.protocol())
        self.assertEqual(len(p['cases']),800)
        self.assertEqual([c['design'] for c in p['cases'][:4]],['effect','null']*2)
        seeds = [c[k] for c in p['cases'] for k in ['dataSeed','samplerSeed']]
        self.assertEqual(len(seeds),len(set(seeds)))
        self.assertNotIn(202603,seeds)
        self.assertEqual(p['methodTemplate']['chains'],4)
        self.assertEqual(p['methodTemplate']['draws'],2000)
        self.assertEqual(p['methodTemplate']['priors']['tune'],1500)
        self.assertAlmostEqual(p['minimumCoverage'],.917308257923445,places=12)

    def test_failures_and_pending_never_pass(self):
        p = calibration.protocol()
        records = [dict(case=c,truth=0.,result={'status':'failed'}) for c in p['cases']]
        s = calibration.summarize(records,p)
        self.assertEqual(s['status'],'failed')
        for row in s['designs']:
            self.assertEqual(row['failed'],400)
            self.assertEqual(row['covered'],0)
        self.assertEqual(calibration.summarize(records[:2],p)['status'],'incomplete')
        with self.assertRaises(ValueError):
            calibration.summarize(records+[records[0]],p)

    def test_frozen_coverage_boundary_is_red_capable(self):
        p = calibration.protocol()
        codes = ['RANK_NORMALIZED_SPLIT_RHAT','EFFECTIVE_SAMPLE_SIZE','MONTE_CARLO_STANDARD_ERROR','DIVERGENCES']
        coords = dict(variable='outcome_scale_contrast',samplesFinite=True,rhat=1.,bulk=500.,tail=500.,mcse=.001,relativeMcse=.01)
        diagnostics = [dict(code=c,passed=True) for c in codes] + [dict(code='PARAMETER_COORDINATE_DIAGNOSTICS',coordinates=[coords])]
        records = []
        for i, case in enumerate(p['cases']):
            covered = i//2 < 367
            records.append(dict(case=case,truth=0.,result=dict(status='complete',diagnostics=diagnostics,
                model=dict(inferenceUsable=True,outcomeScaleContrast=dict(
                    estimate=0. if covered else .06,interval=[-.05,.05] if covered else [.01,.11])))))
        self.assertEqual(calibration.summarize(records,p)['status'],'passed')
        records[0] = copy.deepcopy(records[0])
        records[0]['result']['model']['outcomeScaleContrast']['interval'] = [.01,.11]
        self.assertEqual(calibration.summarize(records,p)['status'],'failed')

    def test_batch_calls_only_next_prefix_and_retains_failure(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)/'calibration'
            calibration.initialize(d)
            calls = []
            def fail(q):
                calls.append(q)
                raise RuntimeError('injected fit failure')
            first = calibration.run_batch(d,1,fit=fail)
            before = (d/'cases/0000.result.json').read_bytes()
            second = calibration.run_batch(d,1,fit=fail)
            self.assertEqual([first['completed'],second['completed']],[1,2])
            self.assertEqual(len(calls),2)
            self.assertEqual((d/'cases/0000.result.json').read_bytes(),before)
            self.assertEqual(calls[0]['pairedResult']['contrast']['scope'],'finite-task-set')
            self.assertEqual(calls[0]['method']['seed'],calibration.protocol()['cases'][0]['samplerSeed'])
            calibration.write_new(d/'cases/0002.assignment.json',calibration.protocol()['cases'][2])
            with self.assertRaisesRegex(ValueError,'ambiguous'):
                calibration.run_batch(d,1,fit=fail)
            self.assertEqual(len(calls),2)

    def test_missing_or_nonfinite_diagnostics_cannot_count_as_coverage(self):
        r = dict(case={'design':'effect'},truth=.2,result=dict(status='complete',model={
            'inferenceUsable':True,'outcomeScaleContrast':{'estimate':.2,'interval':[.15,.25]}},diagnostics=[]))
        self.assertTrue(calibration.classify(r)['failed'])
        codes = ['RANK_NORMALIZED_SPLIT_RHAT','EFFECTIVE_SAMPLE_SIZE','MONTE_CARLO_STANDARD_ERROR','DIVERGENCES']
        r['result']['diagnostics'] = [dict(code=c,passed=True) for c in codes]
        coord = dict(variable='outcome_scale_contrast',samplesFinite=True,rhat=1.,bulk=500.,tail=500.,mcse=.001,relativeMcse=.01)
        r['result']['diagnostics'].append(dict(code='PARAMETER_COORDINATE_DIAGNOSTICS',coordinates=[coord]))
        self.assertTrue(calibration.classify(r)['covered'])
        coord['tail'] = float('nan')
        self.assertTrue(calibration.classify(r)['failed'])


if __name__ == '__main__':
    unittest.main()
