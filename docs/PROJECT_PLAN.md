# SceneForge Fresh — locked workflow

1. User selects video.
2. UI confirms **Video Uploaded**.
3. Backend smart-samples frames and reports **Extracting Frames**.
4. UI confirms **Frames Extracted**.
5. Backend runs COLMAP automatically and reports camera reconstruction.
6. Backend validates registered images and sparse points before training.
7. Backend starts the known-working 3DGS trainer and reports the training stage.
8. Backend prepares the trained model.
9. Backend launches SIBR automatically when configured.
10. UI reports **Reconstruction Complete**.

Laptop protection is a first-class requirement: one job at a time, capped frame count, capped image dimension, early COLMAP quality checks, and conservative 30k-iteration baseline.

## What is deliberately not hard-coded

The exact Gaussian Splatting trainer and SIBR viewer executable are not invented here. Their paths and command-line arguments vary by the installation/build. The project therefore reads them from `config/settings.json` so we can plug in the exact versions that previously produced the bonsai/lamp result instead of replacing them with an untested implementation.
