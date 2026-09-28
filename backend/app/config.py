from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT / "config" / "settings.json"
BACKEND = ROOT / "backend"
JOBS = BACKEND / "jobs"

with CONFIG_PATH.open("r", encoding="utf-8") as f:
    SETTINGS = json.load(f)

for p in [JOBS]:
    p.mkdir(parents=True, exist_ok=True)


def resolve_config_path(value: str) -> Path | None:
    if not value:
        return None
    p = Path(value).expanduser()
    if p.exists():
        return p

    # Fallback search for colmap if the configured path doesn't exist
    if "colmap" in value.lower():
        candidates = [
            Path(r"C:\Users\seque\Downloads\colmap-x64-windows-nocuda\bin\colmap.exe"),
            Path(r"C:\COLMAP\bin\colmap.exe"),
            Path(r"C:\Program Files\COLMAP\colmap.exe"),
        ]
        which_colmap = shutil.which("colmap")
        if which_colmap:
            candidates.append(Path(which_colmap))

        for cand in candidates:
            if cand.exists():
                return cand

    return p
