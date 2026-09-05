"""Audit only already-attempted calibration cases; no posterior fitting."""
from collections import defaultdict
import json
from pathlib import Path
import subprocess
import sys
BASE = Path(__file__).resolve().parent
SKILL = Path('/home/balauru/.pi-profiles/fabric/skills/agent-benchmarking')
RUN = BASE/'bernoulli-calibration-v1'
sys.path.insert(0,str(SKILL/'tests'))
from test_analysis_models import scientific_rows

def snapshot():
    return {str(p.relative_to(RUN)):(p.stat().st_mtime_ns,p.read_bytes() if p.is_file() else None) for p in RUN.rglob('*')}

before = snapshot()
completed = subprocess.run([sys.executable,'-B',str(SKILL/'tests/bernoulli_calibration.py'),'report',str(RUN)],capture_output=True,text=True,check=False)
assert completed.returncode in [0,1], completed.stderr
summary = json.loads(completed.stdout)
assert snapshot() == before, 'report mutated calibration records'
comparisons = []
for path in sorted((RUN/'cases').glob('*.result.json')):
    r = json.loads(path.read_text()); case = r['case']
    rows,tasks,truth = scientific_rows('bernoulli',case['effect'],case['dataSeed'])
    assert abs(truth-r['truth']) < 1e-12
    counts = defaultdict(float)
    for row in rows:
        counts[row['taskId'],row['conditionId']] += row['outcomes'][0]['value']
    raw = sum((i+1)/210*(counts[t,'candidate']-counts[t,'control'])/40 for i,t in enumerate(tasks))
    c = (r['result'].get('model') or {}).get('outcomeScaleContrast') or {}
    comparisons.append(dict(case=case['id'],design=case['design'],truth=truth,
        rawWeightedDifference=raw,independentBetaMean=raw*40/42,
        estimate=c.get('estimate'),interval=c.get('interval'),elapsedSeconds=r['elapsedSeconds']))
assert snapshot() == before
summary.update(readOnlyReportVerified=True,independentCellComparisons=comparisons,
               comparisonScope='Independent estimators on the same observed datasets, not independent datasets.')
(BASE/'bernoulli-calibration-v1-summary.json').write_text(json.dumps(summary,indent=2,allow_nan=False)+'\n')
print(json.dumps(dict(status=summary['status'],completed=summary['completed'],planned=summary['planned'],readOnlyReport=True,comparisons=comparisons)))
