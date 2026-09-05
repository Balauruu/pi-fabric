#!/usr/bin/env python3
"""Task-specific fixture execution through both real lifecycle entry paths.

Commands run in attempts/<id>/workspace. BENCHMARK_{TASK_ID,CONDITION_ID,
ATTEMPT_ID,WORKSPACE,INPUT_PATHS} are available to the declared shell commands.
No model calls, generic environment manager, or protection manifests.
"""
from __future__ import annotations
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from test_run import ROOT, load_fixture_spec, write_spec, request_for, production_seams
import lifecycle_store as lifecycle
import run as runner


class TaskStateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='.tmp-task-state-', dir=ROOT / 'tests')
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.spec = load_fixture_spec()
        self.spec['design']['concurrency']['max'] = 4
        (self.base / 'code.py').write_text('INITIAL\n')
        for task in self.spec['tasks']:
            task['inputPaths'] = ['code.py']
        self.spec['taskState'] = {
            'setupCommand': 'printf setup > phases; printf dirty > counter',
            'resetCommand': 'printf " reset" >> phases; printf clean > counter',
            'verifyCommand': 'test "$(cat counter)" = clean && test "$(cat code.py)" = INITIAL && printf " verify" >> phases',
        }
        self.run_dir = self.base / 'run'

    def request(self):
        return request_for(write_spec(self.base, self.spec), self.run_dir)

    def response(self, request):
        return {'status': 'completed', 'text': '5' if 'sum of 2' in request['prompt'] else 'BLUE'}

    def test_accepted_task_state_executes_and_resets_each_condition(self):
        seen = []
        def dispatch(request):
            workspace = Path(request['settings']['cwd'])
            self.assertEqual((workspace / 'code.py').read_text(), 'INITIAL\n')
            self.assertEqual((workspace / 'counter').read_text(), 'clean')
            self.assertEqual((workspace / 'phases').read_text(), 'setup reset verify')
            self.assertNotIn(str(self.run_dir / 'inputs'), request['prompt'])
            self.assertIn(str(workspace / 'code.py'), request['prompt'])
            (workspace / 'code.py').write_text('CONTAMINATED')
            (workspace / 'counter').write_text('CONTAMINATED')
            seen.append(workspace)
            return self.response(request)
        request = self.request()
        with production_seams():
            result = runner.run(request, dispatch=dispatch)
            self.assertEqual(result['status'], 'complete', result)
            self.assertEqual(runner.run(request, dispatch=mock.Mock(spec=[], side_effect=AssertionError('replay')))['status'], 'complete')
        self.assertEqual(len(seen), 4)
        self.assertEqual(len(set(seen)), 4)
        self.assertEqual((self.run_dir / 'inputs/code.py').read_text(), 'INITIAL\n')
        records = sorted(self.run_dir.glob('attempts/*/task-state.json'))
        self.assertEqual(len(records), 4)
        for record in records:
            evidence = json.loads(record.read_text())
            self.assertEqual(evidence['status'], 'ready')
            self.assertEqual([s['stage'] for s in evidence['stages']], ['setup', 'reset', 'verify'])
            self.assertTrue(all(s['exitCode'] == 0 for s in evidence['stages']))

    def test_input_files_are_not_shared_even_without_commands(self):
        del self.spec['taskState']
        seen = []
        def dispatch(request):
            path = Path(next(line[2:] for line in request['prompt'].splitlines() if line.startswith('- ')))
            self.assertEqual(path.read_text(), 'INITIAL\n')
            self.assertNotEqual(path, self.run_dir / 'inputs/code.py')
            path.write_text('CONTAMINATED')
            seen.append(path)
            return self.response(request)
        with production_seams():
            result = runner.run(self.request(), dispatch=dispatch)
        self.assertEqual(result['status'], 'complete', result)
        self.assertEqual(len(set(seen)), 4)

    def test_failed_setup_reset_or_verify_invalidates_without_dispatch_or_replay(self):
        for stage in ['setup', 'reset', 'verify']:
            with self.subTest(stage=stage):
                self.run_dir = self.base / stage
                original = dict(self.spec['taskState'])
                self.spec['taskState'][stage + 'Command'] = 'printf broken >&2; exit 7'
                request = self.request()
                dispatch = mock.Mock(spec=[], side_effect=AssertionError('must not dispatch'))
                with production_seams():
                    result = runner.run(request, dispatch=dispatch)
                    self.assertEqual(result['status'], 'failed', result)
                    again = runner.run(request, dispatch=dispatch)
                    self.assertEqual(again['status'], 'failed', again)
                dispatch.assert_not_called()
                terminals = list(self.run_dir.glob('attempts/*/terminal.json'))
                self.assertEqual(len(terminals), 1)
                terminal = json.loads(terminals[0].read_text())
                self.assertEqual(terminal['status'], 'infrastructure-failure')
                self.assertEqual(terminal['failure']['code'], 'TASK_STATE_' + stage.upper() + '_FAILED')
                evidence = json.loads(terminals[0].with_name('task-state.json').read_text())
                self.assertEqual(evidence['stages'][-1]['exitCode'], 7)
                self.assertEqual(evidence['stages'][-1]['stderr'], 'broken')
                self.spec['taskState'] = original

    def test_fixed_bridge_prepares_one_stateful_job_before_dispatch_in_schedule_order(self):
        request = self.request()
        token = None
        seen = []
        with production_seams():
            for _ in range(5):
                admitted = runner.internal_admit(request, token=token, requested_call_ceiling=4,
                    configured_call_ceiling=4, usable_call_ceiling=4, fresh_invocation=False)
                token = admitted['invocationToken']
                if not admitted['jobs']:
                    self.assertEqual(admitted['public']['status'], 'complete', admitted)
                    break
                self.assertEqual(len(admitted['jobs']), 1, 'resettable shared state must not overlap conditions')
                job = admitted['jobs'][0]
                cwd = Path(job['request']['settings']['cwd'])
                self.assertEqual((cwd / 'counter').read_text(), 'clean')
                seen.append(job['workId'])
                (cwd / 'code.py').write_text('CONTAMINATED')
                result_path = self.base / 'native.json'
                result_path.write_text(json.dumps({'native': self.response(job['request'])}))
                published = runner.internal_publish_result(spec_path=Path(request['specPath']),
                    run_dir=self.run_dir, token=token, attempt_id=job['workId'], result_path=result_path)
                self.assertEqual(published['public']['status'], 'checkpoint', published)
        schedule = json.loads((self.run_dir / 'schedule.json').read_text())
        self.assertEqual(seen, [row['attemptId'] for row in schedule['rows']])

    def test_nullable_setup_reset_still_runs_readiness_check(self):
        self.spec['taskState'] = {'setupCommand': None, 'resetCommand': None,
            'verifyCommand': 'test "$(cat code.py)" = INITIAL && printf ready > checked'}
        seen = []
        def dispatch(request):
            workspace = Path(request['settings']['cwd'])
            self.assertEqual((workspace / 'checked').read_text(), 'ready')
            seen.append(workspace)
            return self.response(request)
        with production_seams():
            result = runner.run(self.request(), dispatch=dispatch)
        self.assertEqual(result['counts']['failed'], 0, result)
        self.assertEqual(len(seen), 4)

    def test_task_command_timeout_is_explicit_and_not_dispatched(self):
        self.spec['stoppingAndBudgets']['maxWallTimeSeconds'] = .1
        self.spec['taskState']['setupCommand'] = 'sleep 30'
        dispatch = mock.Mock(spec=[])
        with production_seams():
            result = runner.run(self.request(), dispatch=dispatch)
        self.assertEqual(result['status'], 'failed', result)
        dispatch.assert_not_called()
        evidence = json.loads(next(self.run_dir.glob('attempts/*/task-state.json')).read_text())
        self.assertTrue(evidence['stages'][0]['timedOut'])
        self.assertNotEqual(evidence['stages'][0]['exitCode'], 0)

    def test_auto_workspace_cwd_must_be_supported_before_assignment(self):
        schema = {'type': 'object', 'properties': {'task': {'type': 'string'},
            'runner': {'enum': ['pi']}, 'model': {'type': 'string'}, 'tools': {'type': 'array'}},
            'required': ['task'], 'additionalProperties': False}
        with production_seams():
            result = runner.internal_admit(self.request(), token=None, requested_call_ceiling=2,
                configured_call_ceiling=2, usable_call_ceiling=2, fresh_invocation=False,
                capabilities={'agentsRun': True, 'nativeResult': True, 'requestSchema': schema})
        self.assertEqual(result['public']['status'], 'unsupported', result)
        self.assertFalse(self.run_dir.exists())

    def test_unimplemented_noninterleaved_dispatch_is_rejected(self):
        self.spec['design']['concurrency']['interleaveConditions'] = False
        dispatch = mock.Mock(spec=[])
        with production_seams():
            result = runner.run(self.request(), dispatch=dispatch)
        self.assertEqual(result['status'], 'unsupported', result)
        self.assertEqual(result['errors'][0]['code'], 'UNSUPPORTED_NONINTERLEAVED_DISPATCH')
        dispatch.assert_not_called()
        self.assertFalse(self.run_dir.exists())

    def test_conflicting_workspace_options_rejected_before_assignment(self):
        for settings in [{'cwd': str(self.base)}, {'worktree': True}, {'temperature': .1}]:
            with self.subTest(settings=settings):
                self.spec['conditions'][1]['settings'] = settings
                dispatch = mock.Mock(spec=[])
                with production_seams():
                    result = runner.run(self.request(), dispatch=dispatch)
                self.assertEqual(result['status'], 'unsupported', result)
                dispatch.assert_not_called()
                self.assertFalse(self.run_dir.exists())

    def test_unimplemented_mechanism_evidence_is_not_silently_accepted(self):
        self.spec['mechanismObservation'] = {'name': 'delegation', 'evidence': 'Observe dispatch, child return and parent consumption', 'requiredForConditionIds': ['candidate']}
        dispatch = mock.Mock(spec=[])
        with production_seams():
            result = runner.run(self.request(), dispatch=dispatch)
        self.assertEqual(result['status'], 'unsupported', result)
        self.assertEqual(result['errors'][0]['code'], 'UNSUPPORTED_MECHANISM_OBSERVATION')
        dispatch.assert_not_called()
        self.assertFalse(self.run_dir.exists())

    def test_recursive_fixture_uses_absolute_paths_and_omits_cwd(self):
        for condition in self.spec['conditions']:
            condition['settings']['recursive'] = True
        def dispatch(request):
            self.assertNotIn('cwd', request['settings'])
            path = Path(next(line[2:] for line in request['prompt'].splitlines() if line.startswith('- ')))
            self.assertEqual(path.read_text(), 'INITIAL\n')
            self.assertEqual((path.parent / 'phases').read_text(), 'setup reset verify')
            return self.response(request)
        probe = mock.Mock(spec=[], side_effect=dispatch)
        with production_seams():
            result = runner.run(self.request(), dispatch=probe)
        self.assertEqual(result['status'], 'complete', result)
        self.assertEqual(result['counts']['failed'], 0, result)
        self.assertEqual(probe.call_count, 4)


def write_live_fixture(directory: Path, model: str) -> dict:
    """Main-only four-call coding probe, generated from the public spec fixture.

    Generate with --write-live-fixture ABSOLUTE_DIRECTORY --model PROVIDER/ID.
    This writes only local fixture files and prints the unchanged public request.
    Execute exact workflows/benchmark.ts source with payloads.request equal to
    that JSON. This helper NEVER launches models or manufactures budget evidence.
    """
    directory = directory.resolve()
    profile = ROOT.parents[1]
    if not directory.is_relative_to(profile):
        raise ValueError('live fixture must stay in the active Fabric profile')
    directory.mkdir(parents=True, exist_ok=False)
    spec = load_fixture_spec()
    spec['experimentId'] = 'task-state-live-probe'
    spec['question']['samplingFrame'] = 'Two coding boundary cases for transport validation only.'
    expected = {}
    for task, a, answer in zip(spec['tasks'], [2, 4], ['5', '7'], strict=True):
        task['id'] = f'add-{a}-and-3'
        task['prompt'] = ('In the task workspace, fix code.py so add(a, b) returns a + b, not a - b. '
            f'Read the initial file, edit it, run Python to check add({a}, 3), and return only {answer}. '
            'Do not change anything outside the task workspace.')
        task['inputPaths'] = ['code.py']
        task['outcomeDefinition'] = f'Trimmed response is {answer}; workspace and command logs retain transport evidence.'
        expected[task['id']] = answer
    spec['grading']['deterministic']['expectedByTask'] = expected
    # Retain the two-task analysis (including leave-one-task-out), rather than
    # selecting an impossible method for a one-task probe or relaxing checks.
    spec['stoppingAndBudgets'].update(maxTasks=2, maxDirectCalls=4, maxWallTimeSeconds=120)
    for condition in spec['conditions']:
        condition.update(model=model, tools=['read', 'write', 'bash'], settings={'extensions': False, 'transport': 'process'})
    spec['taskState'] = {
        'setupCommand': 'printf setup > fixture-phases',
        'resetCommand': 'printf " reset" >> fixture-phases; cp code.py initial-code.py',
        'verifyCommand': 'test "$(cat code.py)" = "def add(a, b): return a - b" && cmp code.py initial-code.py && printf " verify" >> fixture-phases',
    }
    (directory / 'code.py').write_text('def add(a, b): return a - b\n')
    return request_for(write_spec(directory, spec), directory / 'run')


if __name__ == '__main__':
    import sys
    if '--write-live-fixture' in sys.argv:
        import argparse
        parser = argparse.ArgumentParser()
        parser.add_argument('--write-live-fixture', type=Path, required=True)
        parser.add_argument('--model', required=True)
        args = parser.parse_args()
        print(json.dumps(write_live_fixture(args.write_live_fixture, args.model)))
    else:
        unittest.main()
