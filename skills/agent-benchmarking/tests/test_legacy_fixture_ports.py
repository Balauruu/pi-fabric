"""Consume preserved legacy data through current interfaces, never the old runner."""
import ast
import copy
import json
from pathlib import Path
import subprocess
import unittest

from test_analysis_core import all_success_request
from test_randomization import configured_spec
import analyze_paired
import benchmark_lib as lib
import generate_schedule
import grade
import lifecycle_store

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT/'validation/fixtures'


def legacy(name):
    return lib.load_json(FIXTURES/name)


def paired_port(name):
    """Test-only field translation. Preserve observations, cells and task weights.

    Legacy policy flags are not current authorization for confirmatory claims.
    The new independent-block law and explicit finite-task target are declared
    here; this never reinterprets a historical run or exposes a runtime codec.
    """
    old = legacy(name)
    tasks = list(dict.fromkeys(r['task_id'] for r in old['records']))
    repetitions = max(r['repetition'] for r in old['records'])
    spec = configured_spec(method='independent-block-v1',tasks=len(tasks),repetitions=repetitions)
    spec['analysis']['bootstrap']['draws'] = old.get('bootstrap_draws',199)
    spec['analysis']['bootstrap']['confidenceLevel'] = old.get('confidence_level',.95)
    lookup = {(r['task_id'],r['condition_id'],r['repetition']):r['outcome'] for r in old['records']}
    def key(row):
        t = tasks[int(row['taskId'].split('-')[-1])-1]
        c = old['control'] if row['conditionId']=='condition-1' else old['candidate']
        return t,c,row['repetition']
    request = all_success_request(spec,lambda row,metric:lookup.get(key(row),0.))
    request['dataset']['rows'] = [r for r in request['dataset']['rows'] if key(r) in lookup]
    return request


class LegacyFixturePorts(unittest.TestCase):
    def test_all_33_assets_have_explicit_disposition(self):
        manifest = lib.load_json(ROOT/'tests/fixtures/legacy-disposition.json')
        entries = manifest['entries']
        self.assertEqual(len(entries),33)
        self.assertEqual(len({e['path'] for e in entries}),33)
        retired = {e['path'] for e in entries if e['disposition']=='retired-protection-only'}
        self.assertEqual(retired,{'baselines/project-status.txt','baselines/protected-packet.json','isolated-defect/stale-seal.json'})
        names = {n.name for n in ast.walk(ast.parse(Path(__file__).read_text())) if isinstance(n, ast.FunctionDef)}
        for e in entries:
            self.assertLessEqual(set(e['portedTests']), names)
            self.assertEqual((FIXTURES/e['path']).is_file(),e['disposition']=='restored',e)
        # This is cutover inspection, never benchmark admission or a seal gate.
        result = subprocess.run(['git','diff','--name-only','--diff-filter=D','--',str(FIXTURES)],cwd=ROOT,capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)
        deleted = {p.split('validation/fixtures/',1)[1] for p in result.stdout.splitlines()}
        self.assertLessEqual(deleted,retired)

    def test_original_malformed_bytes_reach_current_parser(self):
        for name in ['invalid.json','duplicate-key.json','invalid-utf8.json']:
            with self.subTest(name=name), self.assertRaises(lib.InputError):
                lib.load_json(FIXTURES/'malformed'/name)
        for name in ['blank-line.jsonl','crlf.jsonl']:
            with self.subTest(name=name), self.assertRaises(lib.InputError):
                lib.load_jsonl(FIXTURES/'malformed'/name)

    def test_paired_values_match_independent_hand_effects(self):
        for name, expected in [('paired-analysis.json',.2),('confirmatory-paired-analysis.json',.4)]:
            with self.subTest(name=name):
                result = analyze_paired.analyze_paired(paired_port('known-good/'+name))
                self.assertAlmostEqual(result['paired']['contrasts'][0]['effect'],expected)
                self.assertNotEqual(result['scientificDecision'],'adopt')

    def test_unequal_cells_fail_against_the_saved_complete_schedule(self):
        q = paired_port('known-bad/unequal-cells.json')
        self.assertEqual(len(q['dataset']['rows']),3)
        self.assertEqual(len(q['schedule']['rows']),4)
        with self.assertRaisesRegex(lib.ContractError,'omits scheduled'):
            analyze_paired.analyze_paired(q)

    def test_single_task_boundary_cannot_promote(self):
        result = analyze_paired.analyze_paired(paired_port('boundary/single-task-paired-analysis.json'))
        self.assertEqual(result['paired']['contrasts'][0]['effect'],0.)
        self.assertNotEqual(result['scientificDecision'],'adopt')

    def test_unknown_analysis_option_is_not_silently_dropped(self):
        old = legacy('known-bad/analysis-unknown-option.json')
        q = paired_port('known-bad/analysis-unknown-option.json')
        q['resolvedSpec']['analysis']['optimistic_promotion'] = old['optimistic_promotion']
        with self.assertRaises((lib.InputError,lib.ContractError)):
            analyze_paired.analyze_paired(q)

    def test_schedule_boundary_cases_use_current_generation(self):
        for case in legacy('boundary/schedule-boundaries.json')['cases']:
            with self.subTest(case=case['case_id']):
                spec = configured_spec(method='balanced-cyclic-v1',tasks=len(case['tasks']),
                                       conditions=len(case['conditions']),repetitions=case['repetitions'])
                spec['design']['concurrency']['max'] = case['workers']
                schedule = generate_schedule.generate_schedule({'schemaVersion':1,'resolvedSpec':spec})
                self.assertEqual(len(schedule['rows']),len(case['tasks'])*len(case['conditions'])*case['repetitions'])
                self.assertEqual(len({r['attemptId'] for r in schedule['rows']}),len(schedule['rows']))
                for task in spec['tasks']:
                    self.assertEqual({r['conditionId'] for r in schedule['rows'] if r['taskId']==task['id']},set(spec['design']['conditionOrder']))

    def test_old_stage_requests_are_data_not_current_runner_aliases(self):
        for name in ['known-good/workflow-request.json','known-bad/workflow-request-extra-property.json','canary/workflow-request.json']:
            with self.subTest(name=name),self.assertRaises(lifecycle_store.LifecycleError) as caught:
                lifecycle_store.validate_run_request(legacy(name))
            self.assertEqual(caught.exception.code,'INVALID_REQUEST')
        extra = legacy('known-bad/workflow-request-extra-property.json')['optimistic_complete']
        with self.assertRaises(lifecycle_store.LifecycleError):
            lifecycle_store.validate_run_request({'specPath':'/unused','outputDirectory':'/unused-output','optimistic_complete':extra})

    def test_condition_leakage_fixture_maps_to_actual_blind_projection(self):
        old = legacy('isolated-defect/grader-condition-leakage.json')
        self.assertIn('condition_id',old['public_grader_fields'])
        current = lib.load_json(ROOT/'tests/fixtures/grading/advanced-6-96-18.json')
        item = copy.deepcopy(current['items'][0])
        item['assignment']['criterionEvidence'] = {'criteria':['outcome'],'presentations':[
            {'output':'alpha','conditionId':'control','model':'private-a'},
            {'output':'beta','conditionId':'candidate','model':'private-b'}]}
        public,private,residual = grade.project_pairwise_judgment_input(current['gradingPlan'],item,blinded_item_id='ported-fixture')
        text = json.dumps(public)
        self.assertNotIn('conditionId',text)
        self.assertNotIn('private-a',text)
        self.assertTrue(any(r['private'].get('conditionId')=='candidate' for r in private))
        self.assertEqual(residual,[])


if __name__=='__main__':
    unittest.main()
