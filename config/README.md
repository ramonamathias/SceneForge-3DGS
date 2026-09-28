# Configuration

Edit `settings.json` after confirming the exact paths of your known-working 3DGS and SIBR installations.

Example Windows values:

```json
"colmap_exe": "C:/COLMAP/bin/colmap.exe",
"gaussian_python": "C:/path/to/your/3dgs/venv/Scripts/python.exe",
"gaussian_train_script": "C:/path/to/gaussian-splatting/train.py",
"sibr_exe": "C:/path/to/SIBR/SIBR_gaussianViewer_app.exe"
```

SIBR arguments depend on the specific SIBR viewer build, so do not guess them. Put the arguments that worked in your previously successful bonsai/lamp run into `sibr_args`, using `{model}` where the model path belongs.
