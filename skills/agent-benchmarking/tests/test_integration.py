"""Production lifecycle seams; only agent dispatch is synthetic."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

from test_run import ROOT, load_fixture_spec, write_spec, request_for, CountingDispatch
import lifecycle_store as store
import run as runner


def judgment_spec(root, precedence='resolver'):
    spec = load_fixture_spec()
    for c in spec['conditions']:
        c['settings'] = {}
    (root / 'calibration.json').write_text('{"example":"CALIBRATION_SENTINEL","label":"correct"}')
    spec['grading'].update(method='model', deterministic=None,
        judgment=dict(runner='pi', model='fixture-model', graderIds=['j1','j2'],
            rubric='Grade output.', calibrationInputPaths=['calibration.json'],
            labelSet=['incorrect','correct'], repetitions=1, retainUncertainty=True),
        adjudication=dict(enabled=True, trigger='declared-disagreement', resolverIds=['r1'],
            maxCalls=4, precedence=precedence))
    spec['stoppingAndBudgets']['maxDirectCalls'] = 16
    return spec


def grade_row(stage, grader, label, criterion='outcome'):
    return dict(gradeId=f'grade-{stage}-{grader}', attemptId='a-1', stage=stage,
        graderId=grader, graderRepetition=1, status='abstained' if label=='abstain' else 'valid',
        labels=[dict(criterionId=criterion, label=label, score={'correct':1,'incorrect':0}.get(label))])


class IntegrationTests(unittest.TestCase):
    def test_live_task_fixture_with_real_helpers_and_synthetic_coding_dispatch(self):
        from test_task_state import write_live_fixture
        import subprocess
        import sys
        with tempfile.TemporaryDirectory(dir=ROOT/'tests') as tmp:
            request = write_live_fixture(Path(tmp) / 'live', 'fixture-model')
            seen = []
            def dispatch(req):
                workspace = Path(req['settings']['cwd'])
                self.assertEqual((workspace / 'code.py').read_text(), 'def add(a, b): return a - b\n')
                self.assertEqual((workspace / 'fixture-phases').read_text(), 'setup reset verify')
                (workspace / 'code.py').write_text('def add(a, b): return a + b\n')
                expression = 'add(4, 3)' if 'add(4, 3)' in req['prompt'] else 'add(2, 3)'
                text = subprocess.check_output([sys.executable, '-B', '-c', f'from code import add; print({expression})'], cwd=workspace, text=True)
                seen.append(workspace)
                return {'status': 'completed', 'text': text}
            result = runner.run(request, dispatch=dispatch)
            self.assertEqual(result['status'], 'complete', result)
            self.assertEqual(result['counts']['failed'], 0, result)
            self.assertEqual(len(set(seen)), 4)
            self.assertEqual((Path(request['outputDirectory']) / 'inputs/code.py').read_text(), 'def add(a, b): return a - b\n')
            self.assertTrue(any('maxWallTimeSeconds' in item and 'does not cancel' in item for item in result['limitations']))
            self.assertTrue(any('timeoutMs' in item and 'floor' in item for item in result['limitations']))

    def test_resolution_precedence_missing_and_per_criterion(self):
        with tempfile.TemporaryDirectory(dir=ROOT/'tests') as tmp:
            spec = judgment_spec(Path(tmp))
            grades = [grade_row('judge','j1','correct'), grade_row('judge','j2','incorrect'),
                      grade_row('adjudicate','r1','correct')]
            outcomes = store._outcomes_for_terminal(spec, 'succeeded', grades)
            self.assertEqual(1, outcomes[0]['value'])
            spec['grading']['adjudication']['precedence'] = 'retain-disagreement'
            self.assertIsNone(store._outcomes_for_terminal(spec, 'succeeded', grades)[0]['value'])
            missing = [grade_row('judge','j1','correct')]
            self.assertIsNone(store._outcomes_for_terminal(spec, 'succeeded', missing)[0]['value'])
            spec['analysis']['metrics'][0]['source'] = 'grade.score:style'
            for row in grades:
                row['labels'].append(dict(criterionId='style',label='incorrect',score=0))
            self.assertEqual(0, store._outcomes_for_terminal(spec, 'succeeded', grades)[0]['value'])
            spec['analysis']['metrics'][0]['source']='grade.score'
            spec['grading']['adjudication']['precedence']='majority'
            spec['grading']['judgment']['graderIds'].append('j3')
            majority=[grade_row('judge','j1','incorrect'),grade_row('judge','j2','incorrect'),grade_row('judge','j3','correct'),grade_row('adjudicate','r1','correct')]
            self.assertEqual(0,store._outcomes_for_terminal(spec,'succeeded',majority)[0]['value'])
            majority[1]=grade_row('judge','j2','abstain')
            self.assertIsNone(store._outcomes_for_terminal(spec,'succeeded',majority)[0]['value'])
            self.assertEqual('abstain',majority[1]['labels'][0]['label'])

    def test_calibration_and_raw_labels_through_real_grading(self):
        with tempfile.TemporaryDirectory(dir=ROOT/'tests') as tmp:
            root=Path(tmp); spec=judgment_spec(root); counts={}
            def response(req,index):
                prompt=req['prompt']
                if 'Return exactly one JSON object' not in prompt:
                    return dict(status='completed',text='5',logFile=None)
                self.assertIn('CALIBRATION_SENTINEL',prompt)
                self.assertNotIn('fixture-model',prompt)
                blind=prompt.split('"blindedItemId":"')[1].split('"')[0]
                n=counts.get(blind,0); counts[blind]=n+1
                label='incorrect' if n==1 else 'correct'
                return dict(status='completed',text=json.dumps(dict(labels=[dict(criterionId='outcome',label=label,uncertainty=.1,rationale='test')])))
            run_dir=root/'run'; dispatch=CountingDispatch(response)
            result=runner.run(request_for(write_spec(root,spec),run_dir),dispatch=dispatch)
            self.assertEqual('complete',result['status'],result)
            self.assertEqual(16,len(dispatch.calls))
            terminals=[json.loads(p.read_text()) for p in (run_dir/'attempts').glob('*/terminal.json')]
            self.assertTrue(all(t['outcomes'][0]['value']==1 for t in terminals),terminals)
            self.assertEqual(12,len(list((run_dir/'grading').glob('grade-*.json'))))

    def test_effective_schema_rejection_precedes_assignment(self):
        with tempfile.TemporaryDirectory(dir=ROOT/'tests') as tmp:
            root=Path(tmp); spec=load_fixture_spec()
            for c in spec['conditions']: c['settings']={'thinking':'low'}
            schema=dict(type='object',properties=dict(task=dict(type='string'),runner=dict(enum=['pi']),
                model=dict(type='string'),tools=dict(type='array'),thinking=dict(enum=['high'])),required=['task'],additionalProperties=False)
            result=runner.internal_admit(request_for(write_spec(root,spec),root/'run'), token=None,
                requested_call_ceiling=2, configured_call_ceiling=2,usable_call_ceiling=2,fresh_invocation=False,
                capabilities={'agentsRun':True,'nativeResult':True,'requestSchema':schema})
            self.assertEqual('unsupported',result['public']['status'],result)
            self.assertFalse(list((root/'run').glob('attempts/*/assignment.json')))

    def test_real_crossed_bayesian_fits_and_interrupted_finalization(self):
        # Frozen compact MCMC budgets exercise integration, not posterior certification.
        from test_run import Crash
        import numpy as np
        with tempfile.TemporaryDirectory(dir=ROOT/'tests') as tmp:
            root=Path(tmp); spec=judgment_spec(root)
            spec['tasks']=[{**copy.deepcopy(spec['tasks'][0]),'id':f't{i}','prompt':f'task {i}'} for i in range(4)]
            spec['analysis']['sequential']['maxTasks']=4
            spec['analysis']['sequential']['looks'][0]['completeTasks']=4
            spec['stoppingAndBudgets'].update(maxTasks=4,maxDirectCalls=32,maxWallTimeSeconds=120)
            spec['grading']['adjudication']['maxCalls']=8
            spec['analysis']['models']=[dict(id=name,method=name,likelihood=likelihood,
                metricId='accepted',contrastId='candidate-v-control',
                fixedEffects=['intercept','condition'],randomEffects=['task-intercept','grader-intercept'],
                priors=dict(tune=60,priorPredictiveDraws=20,rhatMax=20,essBulkMin=1,essTailMin=1,
                    mcseRelativeMax=100,maxDivergences=999),sampler='nuts',intervalProbability=.9,
                draws=60,chains=2,seed=41) for name,likelihood in [('bayesian-gaussian','gaussian'),('bayesian-bernoulli','bernoulli')]]
            def response(req,index):
                prompt=req['prompt']
                if 'Return exactly one JSON object' not in prompt:
                    return dict(status='completed',text=str(index%2))
                evidence=json.loads(prompt.split('\nINPUT\n')[1].split('\nCALIBRATION')[0])
                label='correct' if evidence['evidence']['output']=='1' else 'incorrect'
                return dict(status='completed',text=json.dumps(dict(labels=[dict(criterionId='outcome',label=label,uncertainty=.1,rationale='test')])))
            run_dir=root/'run'; req=request_for(write_spec(root,spec),run_dir); dispatch=CountingDispatch(response)
            original=store._publish_json
            def interrupt(path,value):
                if path.name=='analysis.json': raise Crash('posterior/result saved, final analysis not published')
                return original(path,value)
            with mock.patch.object(store,'_publish_json',side_effect=interrupt):
                with self.assertRaises(Crash): runner.run(req,dispatch=dispatch)
            self.assertEqual(24,len(dispatch.calls))
            artifacts={p:p.read_bytes() for p in (run_dir/'models').rglob('*') if p.is_file()}
            self.assertEqual(2,len(list((run_dir/'models').glob('*/result.json'))))
            for p in (run_dir/'models').glob('*/*-posterior.npz'):
                with np.load(p) as arrays:
                    self.assertTrue(any(v.shape[:2]==(2,60) for v in arrays.values()))
            for p in (run_dir/'models').glob('*/result.json'):
                fitted=json.loads(p.read_text()); self.assertEqual('complete',fitted['status'],fitted)
                self.assertEqual(json.loads((run_dir/'paired-analysis.json').read_text()),fitted['pairedResult'])
                self.assertEqual('accepted',fitted['selection']['metricId'])
                self.assertTrue(fitted['artifacts'])
                # Evidence that individual crossed labels, not four averaged task scores, reached the fit.
                self.assertIn('j1',p.with_name(p.parent.name+'-coordinates.json').read_text())
            with mock.patch.object(store,'_analyze_model',side_effect=AssertionError('fit replay')):
                result=runner.run(req,dispatch=dispatch)
                self.assertEqual('complete',result['status'],result)
            self.assertEqual(24,len(dispatch.calls))
            self.assertEqual(artifacts,{p:p.read_bytes() for p in artifacts})

    def test_private_pairwise_map_saved_outside_grader_request(self):
        with tempfile.TemporaryDirectory(dir=ROOT/'tests') as tmp:
            root=Path(tmp); spec=judgment_spec(root)
            context=store.initialize_or_resume(store.materialize_spec(write_spec(root,spec)),root/'run')
            row=context.schedule['rows'][0]
            assignment=store.prepare_assignment(context,row)
            assignment['criterionEvidence']={'presentations':[
                {'output':'first','conditionId':'SECRET_CONTROL'},
                {'output':'second','conditionId':'SECRET_CANDIDATE'}]}
            item={'assignment':assignment,'result':{'status':'completed','text':'unused'},'existingLabels':[]}
            with mock.patch.object(store,'_successful_measurement_items',return_value=[item]):
                jobs=store._load_or_plan_grade_jobs(context,store.inspect_records(context),'judge')
            self.assertEqual(2,len(jobs))
            for job in jobs:
                reverse=json.loads((root/'run'/'grading'/'private-maps'/f"{job['jobId']}.json").read_text())
                self.assertEqual({'SECRET_CONTROL','SECRET_CANDIDATE'},{r['private']['conditionId'] for r in reverse})
                self.assertNotIn('SECRET_',json.dumps(job['request']))
                for r in reverse:
                    public=next(p for p in job['projection']['evidence']['presentations'] if p['position']==r['position'])
                    self.assertEqual(assignment['criterionEvidence']['presentations'][r['sourceIndex']]['output'],public['output'])
                store._validate_grade_job(job,'judge')

    def test_orphan_posterior_settles_failed_without_refit_or_overwrite(self):
        with tempfile.TemporaryDirectory(dir=ROOT/'tests') as tmp:
            root=Path(tmp); spec=load_fixture_spec()
            method=dict(id='interrupted',method='bayesian-gaussian',priors={})
            directory=root/'models'/'interrupted';directory.mkdir(parents=True)
            (directory/'started.json').write_text('{}')
            (directory/'interrupted-posterior.npz').write_bytes(b'preserved partial posterior')
            context=store.RunContext(run_dir=root,spec=spec,schedule={})
            with mock.patch.object(store,'_analyze_model',side_effect=AssertionError('must not refit')):
                result=store._saved_or_fit_model(context,method,{'schemaVersion':1,'rows':[]},[],{'raw':'paired'})
                self.assertEqual('failed',result['status'])
                self.assertEqual('MODEL_FIT_INTERRUPTED',result['diagnostics'][0]['code'])
                self.assertEqual(result,store._saved_or_fit_model(context,method,{},[],{}))
            self.assertEqual(b'preserved partial posterior',(directory/'interrupted-posterior.npz').read_bytes())

    def test_unknown_guest_budget_refuses_without_assignment(self):
        with tempfile.TemporaryDirectory(dir=ROOT/'tests') as tmp:
            root=Path(tmp);spec=load_fixture_spec()
            for c in spec['conditions']:c['settings']={}
            result=runner.internal_admit(request_for(write_spec(root,spec),root/'run'),token=None,
                requested_call_ceiling=100,configured_call_ceiling=0,usable_call_ceiling=None,fresh_invocation=False)
            self.assertEqual('unsupported',result['public']['status'])
            self.assertEqual('UNKNOWN_REMAINING_INVOCATION_BUDGET',result['public']['errors'][0]['code'])
            self.assertFalse((root/'run').exists())

    def test_condition_content_native_error_and_wall_admission(self):
        with tempfile.TemporaryDirectory(dir=ROOT/'tests') as tmp:
            root=Path(tmp);spec=load_fixture_spec()
            (root/'condition.txt').write_text('CONDITION_CONTENT_SENTINEL')
            for c in spec['conditions']: c['settings']={'timeoutMs':1};c['instructionPaths']=['condition.txt']
            req=request_for(write_spec(root,spec),root/'run')
            admission=runner.internal_admit(req,token=None,requested_call_ceiling=4,configured_call_ceiling=4,usable_call_ceiling=4,fresh_invocation=False)
            self.assertIn('CONDITION_CONTENT_SENTINEL',admission['jobs'][0]['request']['instructions'])
            token=admission['invocationToken']
            # Keep the native error/log bytes, not a source attestation or claimed timeout enforcement.
            context=runner._bridge_context(Path(req['specPath']),Path(req['outputDirectory']))
            job=admission['jobs'][0];log=root/'native.jsonl';log.write_text('{"error":"native timeout"}\n')
            record=store.make_result_record(job['workId'],native=dict(status='timed_out',error='native timeout',logFile=str(log),thinking='high'))
            store.publish_result(context,job['workId'],record)
            assignment=json.loads((root/'run'/'attempts'/job['workId']/'assignment.json').read_text())
            store.derive_terminal(context,job['workId'],assignment,record)
            self.assertEqual('archived',record['nativeLog']['status'])
            self.assertEqual('high',record['nativeResult']['thinking'])
            with mock.patch.object(runner.lifecycle,'datetime',wraps=store.datetime) as clock:
                from datetime import datetime,timezone,timedelta
                clock.now.return_value=datetime.now(timezone.utc)+timedelta(seconds=1000)
                ended=runner.internal_admit(req,token=token,requested_call_ceiling=4,configured_call_ceiling=4,usable_call_ceiling=4,fresh_invocation=False)
            self.assertEqual('checkpoint',ended['public']['status'],ended)
            self.assertFalse(ended['jobs'])
            self.assertEqual(1,len(list((root/'run').glob('attempts/*/assignment.json'))))

if __name__=='__main__': unittest.main()
