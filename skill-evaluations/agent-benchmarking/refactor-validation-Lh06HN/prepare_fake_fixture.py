"""Non-scoring branch fixture: only dispatch is fake, all production helpers run."""
import json
from pathlib import Path
import sys
ROOT = Path('/home/balauru/.pi-profiles/fabric/skills/agent-benchmarking')
sys.path.insert(0, str(ROOT/'scripts'))
from run import run
BASE = Path(__file__).resolve().parent
source = ROOT/'tests/fixtures/refactor/minimal-deterministic/spec.json'
spec = json.loads(source.read_text())
spec['experimentId'] = 'fresh-context-file-only-validation'
path = BASE/'spec.json'
if path.exists():
    raise SystemExit('Refuse to overwrite prepared validation input')
path.write_text(json.dumps(spec, indent=2)+'\n')
class FakeDispatch:
    fresh_invocation = True
    configured_call_ceiling = 100
    usable_call_ceiling = 100
    def __init__(self): self.count = 0
    def __call__(self, request):
        self.count += 1
        return {'id':f'validation-fake-{self.count}', 'status':'completed', 'text':'5' if '2 and 3' in request['prompt'] else 'BLUE', 'model':'fixture-model', 'usage':{'input':1,'output':1,'cacheRead':0,'cacheWrite':0,'cost':0}, 'logFile':None}
dispatch = FakeDispatch()
result = run({'specPath':str(path),'outputDirectory':str(BASE/'complete-run')},dispatch=dispatch)
(BASE/'fixture-result.json').write_text(json.dumps({'fakeCalls':dispatch.count,'liveCalls':0,'result':result},indent=2)+'\n')
print(json.dumps({'fakeCalls':dispatch.count,'liveCalls':0,'result':result}))
