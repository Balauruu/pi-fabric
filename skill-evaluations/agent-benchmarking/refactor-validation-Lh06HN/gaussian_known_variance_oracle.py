"""Independent known-variance GLS/BLUP oracle on the frozen crossed datasets."""
import json
from pathlib import Path
import sys
sys.path.insert(0, '/home/balauru/.pi-profiles/fabric/skills/agent-benchmarking/tests')
from test_model_calibration import generated_request
import numpy as np
from scipy.stats import norm, binomtest
BASE = Path(__file__).resolve().parent
records = [json.loads(line) for line in (BASE/'gaussian-calibration-v1.jsonl').read_text().splitlines()]
cases = [r for r in records if r.get('kind') == 'crossed-independent-components' and 'replicate' in r]
assert len(cases) == 400
covered = 0; zscores = []; ratios = []; failure_codes = {}; reported_covered = usable = 0
for case in cases:
    request, truth = generated_request('crossed-independent-components', case['seed'])
    assert abs(truth - case['truth']) < 1e-12
    rows = {r['attemptId']: r for r in request['dataset']['rows']}
    labels = request['dataset']['labels']
    tasks = sorted({r['taskId'] for r in rows.values()})
    outputs = sorted(rows)
    graders = sorted({r['graderId'] for r in labels})
    x = np.array([rows[g['attemptId']]['conditionId'] == 'candidate' for g in labels], dtype=float)
    X = np.column_stack([np.ones(len(labels)), x])
    Ztask = np.array([[rows[g['attemptId']]['taskId'] == t for t in tasks] for g in labels], dtype=float)
    Zgrader = np.array([[g['graderId'] == t for t in graders] for g in labels], dtype=float)
    Zoutput = np.array([[g['attemptId'] == t for t in outputs] for g in labels], dtype=float)
    Z = np.column_stack([Ztask, Ztask * x[:, None], Zgrader, Zoutput])
    gv = np.concatenate([np.ones(len(tasks)), np.full(len(tasks), .36), np.full(len(graders), .36), np.full(len(outputs), .35**2)])
    y = np.array([g['labels'][0]['score'] for g in labels])
    w = np.arange(1., len(tasks) + 1); w /= w.sum()
    l = np.concatenate([np.zeros(len(tasks)), w, np.zeros(len(graders) + len(outputs))])
    V = (Z * gv) @ Z.T + .3**2 * np.eye(len(y))
    zgl = Z @ (gv * l)
    solved = np.linalg.solve(V, np.column_stack([X, y, zgl]))
    ViX, Viy, Vizgl = solved[:, :2], solved[:, 2], solved[:, 3]
    Cbeta = np.linalg.inv(X.T @ ViX)
    beta = Cbeta @ X.T @ Viy
    estimate = float(beta[1] + zgl @ (Viy - ViX @ beta))
    k = np.array([0., 1.]) - X.T @ Vizgl
    variance = float(np.dot(l * gv, l) - zgl @ Vizgl + k @ Cbeta @ k)
    se = np.sqrt(variance); z = (estimate - truth) / se
    zscores.append(float(z)); covered += int(abs(z) <= norm.ppf(.975))
    c = case['contrast']
    if c:
        usable += 1; reported_covered += int(case['covered'])
        ratios.append(c['standardError'] / se)
    else:
        for d in case['failures']:
            if d.get('severity') == 'error': failure_codes[d['code']] = failure_codes.get(d['code'], 0) + 1
ci = binomtest(covered, len(cases)).proportion_ci(.95, method='exact')
print(json.dumps(dict(cases=len(cases), oracleCovered=covered, oracleCoverage=covered/len(cases),
    oracleExact95Interval=[float(ci.low), float(ci.high)], oracleZMean=float(np.mean(zscores)),
    oracleZSecondMoment=float(np.mean(np.square(zscores))),
    pluginUsable=usable, pluginCoveredAmongUsable=reported_covered,
    pluginConditionalCoverage=reported_covered/usable,
    meanPluginToOracleSE=float(np.mean(ratios)), medianPluginToOracleSE=float(np.median(ratios)),
    fitFailureCodes=failure_codes, productionFitsRerun=0,
    conclusion='Oracle uses the true DGP variances, not an implementable replacement interval; existing plug-in calibration remains red.'), allow_nan=False))
