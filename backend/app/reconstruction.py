import asyncio
import os
import shutil
import struct
import subprocess
from pathlib import Path

import cv2

from .config import JOBS, SETTINGS, resolve_config_path
from .job_store import publish
from .models import Job


class ReconstructionError(RuntimeError):
    pass


# ============================================================
# PROCESS RUNNER
# ============================================================

def run_process(
    command: list[str],
    cwd: Path | None = None,
    log_file: Path | None = None,
):
    creationflags = (
        subprocess.CREATE_NO_WINDOW
        if os.name == "nt"
        else 0
    )

    if log_file:
        log_file.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

    proc = subprocess.Popen(
        command,
        cwd=str(cwd) if cwd else None,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        creationflags=creationflags,
        bufsize=1,
    )

    lines = []

    for line in proc.stdout or []:
        line = line.rstrip()

        if not line:
            continue

        lines.append(line)

        if log_file:
            with log_file.open(
                "a",
                encoding="utf-8",
            ) as f:
                f.write(line + "\n")

    code = proc.wait()

    return code, lines


# ============================================================
# FRAME EXTRACTION
# ============================================================

def frame_extract(
    video: Path,
    frames_dir: Path,
    cfg: dict,
):
    if frames_dir.exists():
        shutil.rmtree(frames_dir)

    frames_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    cap = cv2.VideoCapture(
        str(video)
    )

    if not cap.isOpened():
        raise ReconstructionError(
            "Frame Extraction failed: "
            "could not open the uploaded video."
        )

    fps = cap.get(
        cv2.CAP_PROP_FPS
    ) or 30.0

    frame_count = int(
        cap.get(
            cv2.CAP_PROP_FRAME_COUNT
        ) or 0
    )

    if frame_count <= 0:
        cap.release()

        raise ReconstructionError(
            "Frame Extraction failed: "
            "the video contains no readable frames."
        )

    duration = (
        frame_count / fps
        if fps > 0
        else 0.0
    )

    target_fps = float(
        cfg.get(
            "target_fps",
            5,
        )
    )

    max_frames = int(
        cfg.get(
            "max_frames",
            180,
        )
    )

    resize_max = int(
        cfg.get(
            "resize_max_dimension",
            1400,
        )
    )

    quality = int(
        cfg.get(
            "jpeg_quality",
            95,
        )
    )

    step = max(
        1,
        round(fps / target_fps),
    )

    saved = 0
    index = 0

    while saved < max_frames:

        ok, frame = cap.read()

        if not ok:
            break

        if index % step == 0:

            h, w = frame.shape[:2]

            largest_dimension = max(
                h,
                w,
            )

            scale = min(
                1.0,
                resize_max / largest_dimension,
            )

            if scale < 1.0:

                new_w = max(
                    1,
                    round(w * scale),
                )

                new_h = max(
                    1,
                    round(h * scale),
                )

                frame = cv2.resize(
                    frame,
                    (
                        new_w,
                        new_h,
                    ),
                    interpolation=cv2.INTER_AREA,
                )

            output = (
                frames_dir
                / f"frame_{saved:05d}.jpg"
            )

            success = cv2.imwrite(
                str(output),
                frame,
                [
                    cv2.IMWRITE_JPEG_QUALITY,
                    quality,
                ],
            )

            if not success:
                cap.release()

                raise ReconstructionError(
                    "Frame Extraction failed: "
                    f"could not write {output.name}."
                )

            saved += 1

        index += 1

    cap.release()

    if saved < 20:
        raise ReconstructionError(
            f"Frame Extraction failed: "
            f"only {saved} frames were extracted. "
            "Use a longer video with slower camera movement."
        )

    return {
        "frames": saved,
        "source_fps": round(
            fps,
            2,
        ),
        "duration_seconds": round(
            duration,
            2,
        ),
        "sampled_fps": target_fps,
        "resolution_limit": resize_max,
    }


# ============================================================
# COLMAP BINARY MODEL COUNTERS
# ============================================================

def _read_colmap_binary_count(
    path: Path,
):
    """
    Read the first uint64 from a COLMAP binary model file.

    images.bin   -> registered image count
    points3D.bin -> sparse point count
    """

    if not path.exists():
        return 0

    try:

        with path.open(
            "rb"
        ) as f:
            raw = f.read(8)

        if len(raw) != 8:
            return 0

        return int(
            struct.unpack(
                "<Q",
                raw,
            )[0]
        )

    except Exception:
        return 0


def _count_images_txt(
    path: Path,
):
    if not path.exists():
        return 0

    count = 0

    try:

        lines = path.read_text(
            encoding="utf-8",
            errors="ignore",
        ).splitlines()

        for line in lines:

            if not line:
                continue

            if line.startswith("#"):
                continue

            parts = line.split()

            if len(parts) < 10:
                continue

            try:
                int(parts[0])
                int(parts[8])
                count += 1

            except ValueError:
                continue

    except Exception:
        return 0

    return count


def _count_points_txt(
    path: Path,
):
    if not path.exists():
        return 0

    count = 0

    try:

        lines = path.read_text(
            encoding="utf-8",
            errors="ignore",
        ).splitlines()

        for line in lines:

            if not line:
                continue

            if line.startswith("#"):
                continue

            parts = line.split()

            if len(parts) < 8:
                continue

            try:
                int(parts[0])
                count += 1

            except ValueError:
                continue

    except Exception:
        return 0

    return count


def count_colmap_model(
    model_dir: Path,
):
    """
    Count registered COLMAP cameras/images and sparse points.

    Binary files are preferred because COLMAP normally produces:

        cameras.bin
        images.bin
        points3D.bin
    """

    images_bin = (
        model_dir
        / "images.bin"
    )

    points_bin = (
        model_dir
        / "points3D.bin"
    )

    images_txt = (
        model_dir
        / "images.txt"
    )

    points_txt = (
        model_dir
        / "points3D.txt"
    )

    registered_images = (
        _read_colmap_binary_count(
            images_bin
        )
    )

    sparse_points = (
        _read_colmap_binary_count(
            points_bin
        )
    )

    if registered_images == 0:

        registered_images = (
            _count_images_txt(
                images_txt
            )
        )

    if sparse_points == 0:

        sparse_points = (
            _count_points_txt(
                points_txt
            )
        )

    return (
        registered_images,
        sparse_points,
    )


# ============================================================
# COLMAP PIPELINE
# ============================================================

def colmap_pipeline(
    frames: Path,
    colmap: Path,
    work: Path,
    cfg: dict,
):
    """
    COLMAP pipeline for video reconstruction.

    Important:
    - SIFT runs on CPU because COLMAP CUDA SIFT failed previously.
    - Sequential matching is used for video.
    - OPENCV camera model is forced because the installed
      Gaussian Splatting implementation does not support
      SIMPLE_RADIAL.
    """

    database = (
        work
        / "database.db"
    )

    sparse = (
        work
        / "sparse"
    )

    log = (
        work
        / "colmap.log"
    )

    # Remove old database/model from this job if present.
    if database.exists():
        database.unlink()

    if sparse.exists():
        shutil.rmtree(
            sparse
        )

    sparse.mkdir(
        parents=True,
        exist_ok=True,
    )

    max_image_size = int(
        cfg.get(
            "colmap_max_image_size",
            1600,
        )
    )

    max_sift_features = int(
        cfg.get(
            "max_sift_features",
            8192,
        )
    )

    sequential_overlap = int(
        cfg.get(
            "sequential_overlap",
            10,
        )
    )

    # ========================================================
    # 1. FEATURE EXTRACTION
    # ========================================================

    feature_command = [
        str(colmap),

        "feature_extractor",

        "--database_path",
        str(database),

        "--image_path",
        str(frames),

        # All frames are from the same physical camera.
        "--ImageReader.single_camera",
        "1",

        # IMPORTANT:
        # Force a camera model supported by the existing
        # Gaussian Splatting implementation.
        "--ImageReader.camera_model",
        "OPENCV",

        # CPU COLMAP for stability.
        "--FeatureExtraction.use_gpu",
        "0",

        "--FeatureExtraction.max_image_size",
        str(max_image_size),

        "--SiftExtraction.max_num_features",
        str(max_sift_features),
    ]

    code, lines = run_process(
        feature_command,
        log_file=log,
    )

    if code != 0:

        tail = "\n".join(
            lines[-25:]
        )

        raise ReconstructionError(
            "COLMAP Feature Extraction failed.\n\n"
            f"{tail}"
        )

    # ========================================================
    # 2. SEQUENTIAL MATCHING
    # ========================================================

    matching_command = [
        str(colmap),

        "sequential_matcher",

        "--database_path",
        str(database),

        # CPU matching.
        "--FeatureMatching.use_gpu",
        "0",

        # Video frames are temporally ordered.
        "--SequentialMatching.overlap",
        str(sequential_overlap),
    ]

    code, lines = run_process(
        matching_command,
        log_file=log,
    )

    if code != 0:

        tail = "\n".join(
            lines[-25:]
        )

        raise ReconstructionError(
            "COLMAP Feature Matching failed.\n\n"
            f"{tail}"
        )

    # ========================================================
    # 3. CAMERA MAPPING
    # ========================================================

    mapper_command = [
        str(colmap),

        "mapper",

        "--database_path",
        str(database),

        "--image_path",
        str(frames),

        "--output_path",
        str(sparse),
    ]

    code, lines = run_process(
        mapper_command,
        log_file=log,
    )

    if code != 0:

        tail = "\n".join(
            lines[-25:]
        )

        raise ReconstructionError(
            "COLMAP Camera Mapping failed.\n\n"
            f"{tail}"
        )

    # ========================================================
    # FIND SPARSE MODELS
    # ========================================================

    models = []

    if sparse.exists():

        models = [
            p
            for p in sparse.iterdir()
            if p.is_dir()
        ]

    if not models:

        raise ReconstructionError(
            "Camera Reconstruction failed: "
            "COLMAP produced no sparse model."
        )

    # ========================================================
    # SELECT BEST MODEL
    # ========================================================

    candidates = []

    for model in models:

        registered, points = (
            count_colmap_model(
                model
            )
        )

        candidates.append(
            (
                registered,
                points,
                model,
            )
        )

    candidates.sort(
        key=lambda item: (
            item[0],
            item[1],
        ),
        reverse=True,
    )

    registered, points, model = (
        candidates[0]
    )

    min_registered = int(
        cfg.get(
            "min_registered_images",
            20,
        )
    )

    min_points = int(
        cfg.get(
            "min_sparse_points",
            1000,
        )
    )

    # ========================================================
    # VALIDATE COLMAP RESULT
    # ========================================================

    if registered < min_registered:

        raise ReconstructionError(
            "Camera Reconstruction failed: "
            f"COLMAP registered {registered} cameras, "
            f"but at least {min_registered} are required."
        )

    if points < min_points:

        raise ReconstructionError(
            "Camera Reconstruction failed: "
            f"COLMAP produced only {points:,} sparse points, "
            f"but at least {min_points:,} are required."
        )

    required_files = [
        "cameras.bin",
        "images.bin",
        "points3D.bin",
    ]

    missing = [
        name
        for name in required_files
        if not (
            model / name
        ).exists()
    ]

    if missing:

        raise ReconstructionError(
            "Camera Reconstruction failed: "
            "COLMAP model is missing "
            + ", ".join(missing)
        )

    return model, {
        "registered_images": registered,
        "sparse_points": points,
        "model_path": str(model),
    }


# ============================================================
# PREPARE GAUSSIAN SPLATTING DATASET
# ============================================================

def prepare_gaussian_dataset(
    frames: Path,
    colmap_model: Path,
    work: Path,
):
    """
    Create:

    dataset/
        images/
        sparse/
            0/
                cameras.bin
                images.bin
                points3D.bin
                rigs.bin
                frames.bin
    """

    dataset = (
        work
        / "dataset"
    )

    if dataset.exists():
        shutil.rmtree(
            dataset
        )

    dataset_images = (
        dataset
        / "images"
    )

    dataset_sparse = (
        dataset
        / "sparse"
        / "0"
    )

    dataset_images.mkdir(
        parents=True,
        exist_ok=True,
    )

    dataset_sparse.mkdir(
        parents=True,
        exist_ok=True,
    )

    # ========================================================
    # COPY COLMAP MODEL
    # ========================================================

    model_files = [
        "cameras.bin",
        "images.bin",
        "points3D.bin",
        "rigs.bin",
        "frames.bin",
        "cameras.txt",
        "images.txt",
        "points3D.txt",
    ]

    for name in model_files:

        source = (
            colmap_model
            / name
        )

        if not source.exists():
            continue

        destination = (
            dataset_sparse
            / name
        )

        shutil.copy2(
            source,
            destination,
        )

    required = [
        "cameras.bin",
        "images.bin",
        "points3D.bin",
    ]

    missing = [
        name
        for name in required
        if not (
            dataset_sparse / name
        ).exists()
    ]

    if missing:

        raise ReconstructionError(
            "Dataset preparation failed: "
            "missing COLMAP files: "
            + ", ".join(missing)
        )

    # ========================================================
    # LINK/COPY EXTRACTED IMAGES
    # ========================================================

    image_count = 0

    for image in frames.glob(
        "*.jpg"
    ):

        destination = (
            dataset_images
            / image.name
        )

        try:

            # Avoid duplicating image data.
            os.link(
                image,
                destination,
            )

        except OSError:

            shutil.copy2(
                image,
                destination,
            )

        image_count += 1

    if image_count == 0:

        raise ReconstructionError(
            "Dataset preparation failed: "
            "no extracted images were found."
        )

    return dataset


# ============================================================
# GAUSSIAN SPLATTING TRAINING
# ============================================================

def gaussian_train(
    dataset: Path,
    work: Path,
    gaussian_python: Path,
    train_script: Path,
    iterations: int,
    training_resolution: int,
):
    """
    Train using the existing known-good Gaussian Splatting
    Python environment.

    GPU:
        RTX 4050 CUDA

    COLMAP:
        CPU

    Gaussian Splatting:
        CUDA
    """

    output = (
        work
        / "gaussian_output"
    )

    if output.exists():
        shutil.rmtree(
            output
        )

    output.mkdir(
        parents=True,
        exist_ok=True,
    )

    log_file = (
        work
        / "gaussian.log"
    )

    command = [
        str(gaussian_python),

        str(train_script),

        "-s",
        str(dataset),

        "-m",
        str(output),

        "--iterations",
        str(iterations),

        # Use the proven training scale.
        "-r",
        str(training_resolution),

        # Use RTX 4050.
        "--data_device",
        "cuda",

        # Prevent the training process from opening
        # its own viewer.
        "--disable_viewer",

        "--test_iterations",
        str(iterations),

        "--save_iterations",
        str(iterations),
    ]

    code, lines = run_process(
        command,
        cwd=train_script.parent,
        log_file=log_file,
    )

    if code != 0:

        tail = "\n".join(
            lines[-30:]
        )

        raise ReconstructionError(
            "Gaussian Splatting training failed.\n\n"
            f"{tail}"
        )

    # ========================================================
    # VERIFY TRAINING OUTPUT
    # ========================================================

    point_cloud = (
        output
        / "point_cloud"
        / f"iteration_{iterations}"
        / "point_cloud.ply"
    )

    if not point_cloud.exists():

        raise ReconstructionError(
            "Gaussian Splatting finished, "
            "but point_cloud.ply was not created."
        )

    return output


# ============================================================
# SIBR
# ============================================================

def launch_sibr(
    model_output: Path,
    dataset: Path,
    sibr_exe: Path,
    iteration: int,
):
    """
    Automatically launch the existing SIBR viewer.
    """

    if not sibr_exe:

        return (
            False,
            "SIBR executable is not configured.",
        )

    if not sibr_exe.exists():

        return (
            False,
            f"SIBR executable was not found: {sibr_exe}",
        )

    command = [
        str(sibr_exe),

        "--model-path",
        str(model_output),

        "--iteration",
        str(iteration),

        "--path",
        str(dataset),
    ]

    creationflags = (
        subprocess.CREATE_NEW_PROCESS_GROUP
        if os.name == "nt"
        else 0
    )

    try:

        subprocess.Popen(
            command,
            creationflags=creationflags,
        )

    except Exception as exc:

        return (
            False,
            f"SIBR launch failed: {exc}",
        )

    return (
        True,
        "SIBR viewer launched automatically.",
    )


# ============================================================
# MAIN RECONSTRUCTION WORKFLOW
# ============================================================

async def run_reconstruction(
    job: Job,
    video_path: Path,
):
    """
    Full automated pipeline:

        Video Uploaded
             ↓
        Extracting Frames
             ↓
        Frames Extracted
             ↓
        COLMAP Camera Reconstruction
             ↓
        Camera Reconstruction Complete
             ↓
        Preparing 3DGS Dataset
             ↓
        3DGS Dataset Ready
             ↓
        Gaussian Splatting Training
             ↓
        3D Model Generated
             ↓
        Preparing SIBR Viewer
             ↓
        Reconstruction Complete
    """

    root = (
        JOBS
        / job.id
    )

    work = (
        root
        / "work"
    )

    frames = (
        work
        / "frames"
    )

    root.mkdir(
        parents=True,
        exist_ok=True,
    )

    work.mkdir(
        parents=True,
        exist_ok=True,
    )

    cfg = SETTINGS[
        "reconstruction"
    ]

    paths = SETTINGS[
        "paths"
    ]

    try:

        # ====================================================
        # 1. VIDEO UPLOADED
        # ====================================================

        job.update(
            "UPLOADED",
            "Video uploaded successfully.",
            5,
            file=video_path.name,
        )

        await publish(job)

        # ====================================================
        # 2. FRAME EXTRACTION
        # ====================================================

        job.update(
            "EXTRACTING_FRAMES",
            "Extracting useful frames from the video...",
            10,
        )

        await publish(job)

        stats = await asyncio.to_thread(
            frame_extract,
            video_path,
            frames,
            cfg,
        )

        job.update(
            "FRAMES_EXTRACTED",
            "Frame extraction complete.",
            22,
            **stats,
        )

        await publish(job)

        # ====================================================
        # 3. COLMAP
        # ====================================================

        colmap = resolve_config_path(
            paths["colmap_exe"]
        )

        if not colmap:

            raise ReconstructionError(
                "Camera Reconstruction failed: "
                "COLMAP path is not configured."
            )

        if not colmap.exists():

            raise ReconstructionError(
                "Camera Reconstruction failed: "
                f"COLMAP executable was not found at {colmap}"
            )

        job.update(
            "COLMAP_RUNNING",
            "COLMAP is reconstructing camera poses and sparse geometry...",
            28,
        )

        await publish(job)

        model_dir, colmap_stats = (
            await asyncio.to_thread(
                colmap_pipeline,
                frames,
                colmap,
                work,
                cfg,
            )
        )

        job.update(
            "COLMAP_COMPLETE",
            "Camera reconstruction complete.",
            45,
            **colmap_stats,
        )

        await publish(job)

        # ====================================================
        # 4. PREPARE DATASET
        # ====================================================

        job.update(
            "PREPARING_DATASET",
            "Preparing the COLMAP reconstruction for Gaussian Splatting...",
            48,
        )

        await publish(job)

        dataset = await asyncio.to_thread(
            prepare_gaussian_dataset,
            frames,
            model_dir,
            work,
        )

        job.update(
            "DATASET_READY",
            "3D Gaussian training dataset is ready.",
            50,
            dataset=str(dataset),
        )

        await publish(job)

        # ====================================================
        # 5. GAUSSIAN SPLATTING
        # ====================================================

        gaussian_python = (
            resolve_config_path(
                paths["gaussian_python"]
            )
        )

        train_script = (
            resolve_config_path(
                paths["gaussian_train_script"]
            )
        )

        if not gaussian_python:

            raise ReconstructionError(
                "Gaussian Training failed: "
                "configured Python environment was not found."
            )

        if not gaussian_python.exists():

            raise ReconstructionError(
                "Gaussian Training failed: "
                f"Python environment was not found at {gaussian_python}"
            )

        if not train_script:

            raise ReconstructionError(
                "Gaussian Training failed: "
                "train.py path is not configured."
            )

        if not train_script.exists():

            raise ReconstructionError(
                "Gaussian Training failed: "
                f"train.py was not found at {train_script}"
            )

        iterations = int(
            cfg.get(
                "training_iterations",
                30000,
            )
        )

        training_resolution = int(
            cfg.get(
                "training_resolution",
                2,
            )
        )

        job.update(
            "GAUSSIAN_TRAINING",
            (
                "Training the 3D Gaussian scene "
                f"for {iterations:,} iterations..."
            ),
            52,
            iterations=iterations,
        )

        await publish(job)

        output = await asyncio.to_thread(
            gaussian_train,
            dataset,
            work,
            gaussian_python,
            train_script,
            iterations,
            training_resolution,
        )

        job.update(
            "GAUSSIAN_COMPLETE",
            "3D Gaussian model generated successfully.",
            88,
            output=str(output),
            iteration=iterations,
        )

        await publish(job)

        # ====================================================
        # 6. SIBR VIEWER
        # ====================================================

        job.update(
            "PREPARING_VIEWER",
            "Preparing the SIBR 3D viewer...",
            94,
        )

        await publish(job)

        sibr = resolve_config_path(
            paths["sibr_exe"]
        )

        launched = False

        viewer_message = (
            "SIBR viewer was not configured."
        )

        if cfg.get(
            "open_sibr_when_complete",
            True,
        ):

            launched, viewer_message = (
                launch_sibr(
                    output,
                    dataset,
                    sibr,
                    iterations,
                )
            )

        if not launched:

            raise ReconstructionError(
                "Viewer preparation failed: "
                f"{viewer_message}"
            )

        # ====================================================
        # 7. COMPLETE
        # ====================================================

        job.update(
            "COMPLETE",
            "Reconstruction complete. Your 3D scene is ready.",
            100,
            sibr_launched=True,
            viewer_message=viewer_message,
            model=str(output),
            dataset=str(dataset),
            iteration=iterations,
            registered_images=colmap_stats[
                "registered_images"
            ],
            sparse_points=colmap_stats[
                "sparse_points"
            ],
        )

        await publish(job)

    except Exception as exc:

        job.error = str(exc)

        job.update(
            "FAILED",
            str(exc),
            job.progress,
        )

        await publish(job)