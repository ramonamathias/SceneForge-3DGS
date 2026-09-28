import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
settings = json.loads((ROOT / 'config' / 'settings.json').read_text())
print('SceneForge environment check')
for key, value in settings['paths'].items():
    if key.endswith('_exe') or key == 'gaussian_train_script' or key == 'gaussian_python':
        if not value:
            print(f'[MISSING CONFIG] {key}')
        else:
            p = Path(value)
            print(f'[{"OK" if p.exists() else "NOT FOUND"}] {key}: {p}')
