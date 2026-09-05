"""Model target handoff regressions. Numerical fits have their own model tests."""
import copy
from pathlib import Path
import tempfile
import unittest
from unittest import mock

from test_run import load_fixture_spec, write_spec, request_for, CountingDispatch
import lifecycle_store as store
import run as runner
import analysis_models


def selected_method():
    return dict(id='target-model', method='gaussian-mixedlm', likelihood='gaussian',
                fixedEffects=['intercept', 'condition'], randomEffects=['task-intercept'],
                priors={}, sampler='not-applicable', intervalProbability=.95,
                draws=0, chains=0, seed=37)


class ModelTargetTests(unittest.TestCase):
    def test_equal_weights_and_target_metadata_reach_model_seam(self):
        spec = load_fixture_spec()
        spec['tasks'][1]['weight'] = 9
        contrast = spec['analysis']['contrasts'][0]
        contrast['taskWeighting'] = 'equal'
        spec['analysis']['models'] = [selected_method()]
        captured = []
        def model(request):
            captured.append(copy.deepcopy(request))
            return dict(schemaVersion=1, status='complete', pairedResult=request['pairedResult'],
                        model={}, diagnostics=[], artifacts=[], limitations=[])
        with tempfile.TemporaryDirectory() as tmp, mock.patch.object(store, '_analyze_model', side_effect=model):
            root = Path(tmp)
            result = runner.run(request_for(write_spec(root, spec), root/'run'),
                                dispatch=CountingDispatch({'status':'completed', 'text':'5'}))
        self.assertEqual(result['status'], 'complete', result)
        self.assertEqual(len(captured), 1)
        target = captured[0]['pairedResult']
        self.assertEqual(target['taskWeights'], {t['id']:1.0 for t in spec['tasks']})
        self.assertEqual(target['scope'], spec['question']['scope'])
        self.assertEqual(target['estimand'], contrast['estimand'])
        self.assertEqual(target['taskWeighting'], 'equal')
        self.assertEqual(target['metricSummary'], 'binary-rate')
        self.assertIsNone(target['metricQuantile'])

    def test_failed_model_preserves_admitted_attempt_counts(self):
        spec = load_fixture_spec()
        spec['analysis']['models'] = [selected_method()]
        failed = dict(schemaVersion=1, status='failed', pairedResult={}, model={},
                      diagnostics=[dict(code='MODEL_TEST_ERROR', message='deliberate fit failure')],
                      artifacts=[], limitations=['deliberate fit failure'])
        with tempfile.TemporaryDirectory() as tmp, mock.patch.object(store, '_analyze_model', return_value=failed):
            root = Path(tmp); dispatch = CountingDispatch({'status':'completed', 'text':'5'})
            result = runner.run(request_for(write_spec(root, spec), root/'run'), dispatch=dispatch)
            self.assertEqual(result['status'], 'failed', result)
            self.assertEqual(len(dispatch.calls), 4)
            self.assertEqual(result['counts']['planned'], 4)
            self.assertEqual(result['counts']['assigned'], 4)
            self.assertEqual(result['counts']['terminal'], 4)
            inspected = runner.report({'outputDirectory':str(root/'run'), 'format':'json'})
            self.assertEqual(result['counts'], inspected['counts'])

    def test_saved_weights_are_not_changed_by_equal_weighting_fix(self):
        spec = load_fixture_spec()
        spec['tasks'][1]['weight'] = 9
        target = store._model_selection(spec, selected_method())
        self.assertEqual(target['taskWeights'], {t['id']:t['weight'] for t in spec['tasks']})

    def test_unsupported_targets_refuse_before_dispatch(self):
        for kind in ['population', 'transformed-mean', 'median', 'quantile']:
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as tmp:
                spec = load_fixture_spec()
                spec['analysis']['models'] = [selected_method()]
                if kind == 'population':
                    spec['question']['scope'] = 'task-population'
                else:
                    spec['analysis']['metrics'][0]['summary'] = kind
                    if kind == 'quantile':
                        spec['analysis']['metrics'][0]['quantile'] = .75
                    if kind == 'transformed-mean':
                        spec['analysis']['contrasts'][0]['estimand'] = 'task-weighted-transformed-difference'
                root = Path(tmp); dispatch = CountingDispatch()
                result = runner.run(request_for(write_spec(root, spec), root/'run'), dispatch=dispatch)
                self.assertEqual(result['status'], 'unsupported', result)
                self.assertEqual(dispatch.calls, [])
                self.assertFalse(list((root/'run').glob('attempts/*/assignment.json')))
                self.assertTrue(any(e['code'].startswith('UNSUPPORTED_MODEL_TARGET') for e in result['errors']), result)

    def test_unimplemented_transform_never_becomes_a_raw_mean(self):
        import statistical_core
        with self.assertRaisesRegex(ValueError, 'transformation'):
            statistical_core.summarize([1., 9.], 'transformed-mean', None)
        spec = load_fixture_spec()
        spec['analysis']['metrics'][0]['summary'] = 'transformed-mean'
        spec['analysis']['contrasts'][0]['estimand'] = 'task-weighted-transformed-difference'
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); dispatch = CountingDispatch()
            result = runner.run(request_for(write_spec(root, spec), root/'run'), dispatch=dispatch)
            self.assertEqual(result['status'], 'unsupported', result)
            self.assertEqual(dispatch.calls, [])
            self.assertTrue(any(e['code'] == 'UNSUPPORTED_METRIC_TRANSFORM' for e in result['errors']))

    def test_direct_model_target_refusal_precedes_backend_or_data_preparation(self):
        for metadata in [dict(scope='task-population'), dict(metricSummary='transformed-mean'),
                         dict(estimand='task-weighted-transformed-difference'), dict(metricSummary='median')]:
            with self.subTest(metadata=metadata), mock.patch.object(analysis_models, '_prepare_data', side_effect=AssertionError('target was not checked')):
                result = analysis_models.analysis_models(dict(schemaVersion=1, method=selected_method(),
                    dataset={'schemaVersion':1, 'rows':[]}, pairedResult=metadata))
                self.assertEqual(result['status'], 'unsupported', result)
                self.assertTrue(result['diagnostics'][0]['code'].startswith('UNSUPPORTED_MODEL_TARGET'))


if __name__ == '__main__':
    unittest.main()
