# SceneForge Fresh

A clean Windows-first video-to-3D reconstruction application designed around the previously successful COLMAP + 3D Gaussian Splatting + SIBR workflow.

## User workflow

Upload video → Video Uploaded → Extracting Frames → COLMAP Camera Reconstruction → Gaussian Training → Preparing SIBR → View 3D Scene.

The user does not type COLMAP/3DGS/SIBR commands.

## Important

This project is intentionally separated from the old SceneForge repository. The reconstruction engine is configurable because the exact CUDA/PyTorch/3DGS build depends on the laptop GPU and the already-tested local 3DGS/SIBR installation.

Before the first real reconstruction, set paths in `config/settings.json` and run the environment check.

## Start backend

```powershell
cd backend
py -3.11 -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Start frontend

```powershell
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite.

## Configure external tools

Edit `config/settings.json`:

- `colmap_exe`: COLMAP executable
- `gaussian_train_script`: the known-working 3DGS `train.py`
- `gaussian_python`: Python executable/environment used by the 3DGS installation
- `sibr_exe`: SIBR viewer executable
- `sibr_args`: arguments accepted by the installed SIBR viewer

The backend validates these paths before starting an expensive job.

## Safety / laptop protection

The default profile deliberately uses conservative settings:

- frame sampling instead of extracting every video frame
- maximum frame count
- maximum image dimension
- minimum COLMAP registered-image threshold
- minimum sparse-point threshold
- one reconstruction job at a time
- automatic cleanup of temporary work directories after completion/failure (configurable)

Do not increase these limits until the baseline bonsai/lamp test is successful.
