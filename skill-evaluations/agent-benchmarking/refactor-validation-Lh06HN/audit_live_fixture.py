"""Read-only live-fixture audit; writes evidence only outside the run directory."""
import ast
import base64
import json
from pathlib import Path
import sys
BASE = Path(__file__).resolve().parent
RUN = BASE/'live-process/run'
sys.path.insert(0, '/home/balauru/.pi-profiles/fabric/skills/agent-benchmarking/scripts')
from run import report

def snapshot():
    return {str(p.relative_to(RUN)): {'mtimeNs':p.stat().st_mtime_ns,
            'bytes':base64.b64encode(p.read_bytes()).decode() if p.is_file() else None}
            for p in sorted(RUN.rglob('*'))}

mode = sys.argv[1]
if mode == 'snapshot':
    public = report({'outputDirectory':str(RUN), 'format':'json'})
    assert public['status'] == 'complete' and public['scientificDecision'] == 'inconclusive'
    assert public['counts'] == dict(planned=4,assigned=4,terminal=4,failed=0,unresolved=0,pending=0)
    records = []
    for directory in sorted((RUN/'attempts').iterdir()):
        result = json.loads((directory/'result.json').read_text())
        native = result['nativeResult']
        state = json.loads((directory/'task-state.json').read_text())
        assert native['transport'] == 'process' and result['dispatchStatus'] == 'completed'
        assert Path(native['cwd']) == directory/'workspace'
        assert state['status'] == 'ready'
        assert [s['stage'] for s in state['stages']] == ['setup','reset','verify']
        assert all(s['exitCode'] == 0 and not s['timedOut'] for s in state['stages'])
        assert result['nativeLog']['status'] == 'archived' and result['nativeLog']['bytes'] > 0
        source = (directory/'workspace/code.py').read_text()
        tree = ast.parse(source)
        # Restrict this tiny diagnostic before executing the retained task file.
        allowed = (ast.Module,ast.FunctionDef,ast.arguments,ast.arg,ast.Return,ast.BinOp,ast.Add,ast.Name,ast.Load,ast.Expr,ast.Constant)
        assert all(isinstance(node, allowed) for node in ast.walk(tree)), source
        namespace = {'__builtins__':{}}
        exec(compile(tree, '<retained-code>', 'exec'), namespace)
        assert namespace['add'](2,3) == 5 and namespace['add'](4,3) == 7
        assert (directory/'workspace/initial-code.py').read_text() == 'def add(a, b): return a - b\n'
        records.append(dict(attempt=directory.name,nativeId=native['id'],transport=native['transport'],
            model=native['model'],output=native['text'],toolCalls=native['toolCalls'],
            rawNativeCost=native['usage'].get('cost'),archivedLogBytes=result['nativeLog']['bytes'],
            taskPreparation='passed',finalState='passed'))
    assert len({r['nativeId'] for r in records}) == 4
    assert (RUN/'inputs/code.py').read_text() == 'def add(a, b): return a - b\n'
    assert not (RUN/'.run.lock').exists()
    with (BASE/'pre-completed-resume-snapshot.json').open('x') as handle:
        json.dump(snapshot(),handle,sort_keys=True)
    evidence = dict(publicResult=public,attempts=records,liveMeasuredCalls=4,
                    completedResumeChecked=False,hostAgentBudgetPerInvocation=1)
    (BASE/'live-audit.json').write_text(json.dumps(evidence,indent=2)+'\n')
    print(json.dumps({'status':'passed','liveMeasuredCalls':4,'taskStateChecks':4,'finalStateChecks':4,'decision':public['scientificDecision']}))
elif mode == 'verify':
    before = json.loads((BASE/'pre-completed-resume-snapshot.json').read_text())
    assert snapshot() == before, 'completed resume changed run entries, bytes or mtimes'
    public = report({'outputDirectory':str(RUN), 'format':'json'})
    assert snapshot() == before, 'read-only report changed run entries, bytes or mtimes'
    evidence = json.loads((BASE/'live-audit.json').read_text())
    assert public == evidence['publicResult']
    evidence.update(completedResumeChecked=True,runBytesAndEntriesUnchanged=True,
                    readOnlyReportChecked=True,additionalMeasuredCalls=0)
    (BASE/'live-audit.json').write_text(json.dumps(evidence,indent=2)+'\n')
    print(json.dumps({'status':'passed','completedResume':'unchanged','report':'read-only','additionalMeasuredCalls':0}))
else:
    raise SystemExit('mode must be snapshot or verify')
