import json, os, shutil
from pathlib import Path
p = os.getpid()
rows = []
keys = {'PI_CODING_AGENT_DIR', 'PI_FABRIC_PI_BINARY', 'PI_FABRIC_NODE_BINARY', 'LOCALTERM'}
for _ in range(8):
    if p <= 1: break
    try:
        status = Path(f'/proc/{p}/status').read_text()
        env = dict(x.split('=', 1) for x in Path(f'/proc/{p}/environ').read_text().split('\0') if '=' in x)
        row = {'pid': p, 'name': status.splitlines()[0], 'env': {k: env[k] for k in keys if k in env}}
        if 'pi' in row['name'].lower() or 'node' in row['name'].lower():
            binary = env.get('PI_FABRIC_PI_BINARY') or shutil.which('pi', path=env.get('PATH', ''))
            row['resolvedPi'] = str(Path(binary).resolve()) if binary else None
        rows.append(row)
        p = int(next(x.split()[1] for x in status.splitlines() if x.startswith('PPid:')))
    except PermissionError:
        rows.append({'pid': p, 'access': 'unavailable'}); break
print(json.dumps(rows, indent=2))
