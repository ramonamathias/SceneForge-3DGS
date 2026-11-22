import asyncio
import json
import os
import shutil
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, File, HTTPException, Header, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .auth import (
    create_session,
    get_current_user,
    get_optional_current_user,
    hash_password,
    invalidate_session,
    verify_password,
)
from .config import JOBS, SETTINGS, resolve_config_path
from .database import ContactMessage, ProjectRecord, SessionLocal, User, UserSession, get_db, init_db
from .job_store import create_job, get_job, stream, sync_job_to_db
from .reconstruction import run_reconstruction

app = FastAPI(
    title="SceneForge Reconstruction API",
    description="Real-world 3D Gaussian Splatting reconstruction from smartphone video",
    version="2.0.0",
)

# Initialize database schema
init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://scene-forge-3-dgs.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_jobs = 0

# ============================================================
# PYDANTIC SCHEMAS
# ============================================================

EMAIL_REGEX = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., pattern=EMAIL_REGEX)
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX)
    password: str = Field(..., min_length=1)


class ContactRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., pattern=EMAIL_REGEX)
    subject: str = Field(..., min_length=2, max_length=200)
    message: str = Field(..., min_length=10, max_length=5000)


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
async def health():
    colmap_path = resolve_config_path(SETTINGS.get("paths", {}).get("colmap_exe"))
    colmap_available = colmap_path.exists() if colmap_path else False

    return {
        "ok": True,
        "service": "SceneForge",
        "active_jobs": active_jobs,
        "colmap_available": colmap_available,
        "colmap_path": str(colmap_path) if colmap_path else None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ============================================================
# AUTHENTICATION ENDPOINTS
# ============================================================

@app.post("/api/auth/signup")
async def signup(req: SignupRequest, db: Session = Depends(get_db)):
    clean_email = req.email.strip().lower()
    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists. Please log in.",
        )

    pw_hash = hash_password(req.password)
    user = User(
        id=str(uuid.uuid4()),
        name=req.name.strip(),
        email=clean_email,
        password_hash=pw_hash,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_session(db, user.id)

    return {
        "ok": True,
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
    }


@app.post("/api/auth/login")
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    clean_email = req.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_session(db, user.id)

    return {
        "ok": True,
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
    }


@app.post("/api/auth/logout")
async def logout(
    authorization: str | None = Header(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    token = None
    if authorization:
        parts = authorization.split()
        token = parts[1] if len(parts) == 2 and parts[0].lower() == "bearer" else authorization

    if token:
        invalidate_session(db, token)

    return {"ok": True, "message": "Successfully logged out."}


@app.get("/api/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        }
    }


@app.get("/api/auth/profile")
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    projects = db.query(ProjectRecord).filter(ProjectRecord.user_id == current_user.id).all()

    total_projects = len(projects)
    completed_projects = sum(1 for p in projects if p.status == "COMPLETE")
    failed_projects = sum(1 for p in projects if p.status == "FAILED")
    running_projects = sum(1 for p in projects if p.status not in {"COMPLETE", "FAILED"})
    total_frames = sum(p.frames_count or 0 for p in projects)
    total_points = sum(p.sparse_points or 0 for p in projects)
    total_cameras = sum(p.registered_images or 0 for p in projects)

    return {
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        },
        "stats": {
            "total_reconstructions": total_projects,
            "completed": completed_projects,
            "failed": failed_projects,
            "in_progress": running_projects,
            "total_frames_extracted": total_frames,
            "total_sparse_points": total_points,
            "total_registered_cameras": total_cameras,
        },
    }


# ============================================================
# CONTACT MESSAGES
# ============================================================

@app.post("/api/contact")
async def submit_contact(req: ContactRequest, db: Session = Depends(get_db)):
    msg = ContactMessage(
        id=str(uuid.uuid4()),
        name=req.name.strip(),
        email=req.email.strip().lower(),
        subject=req.subject.strip(),
        message=req.message.strip(),
    )
    db.add(msg)
    db.commit()

    return {
        "ok": True,
        "message": "Thank you for reaching out. Your inquiry has been recorded by SceneForge.",
        "ticket_id": msg.id[:8].upper(),
    }


# ============================================================
# LEGACY & DISK PROJECT DISCOVERY
# ============================================================

def _find_model_iteration(model: Path) -> int | None:
    point_cloud_dir = model / "point_cloud"
    if not point_cloud_dir.exists():
        return None

    iterations = []
    for iteration_dir in point_cloud_dir.iterdir():
        if not iteration_dir.is_dir() or not iteration_dir.name.startswith("iteration_"):
            continue
        try:
            it = int(iteration_dir.name.split("_", 1)[1])
            iterations.append(it)
        except ValueError:
            continue

    return max(iterations) if iterations else None


def sync_legacy_and_disk_projects(db: Session):
    """
    Sync pre-existing or legacy models on disk into the database
    as legacy reference reconstructions if not already tracked.
    """
    # 1. Existing Bonsai
    bonsai_model = Path(r"C:\Projects\3D-Scene-Reconstruction\gaussian-splatting\output\edd65666-5")
    bonsai_dataset = Path(r"C:\Projects\3D-Scene-Reconstruction\data\bonsai")
    if bonsai_model.exists() and bonsai_dataset.exists():
        it = _find_model_iteration(bonsai_model)
        if it is not None:
            existing = db.query(ProjectRecord).filter(ProjectRecord.id == "legacy-bonsai").first()
            ply = bonsai_model / "point_cloud" / f"iteration_{it}" / "point_cloud.ply"
            if not existing:
                rec = ProjectRecord(
                    id="legacy-bonsai",
                    user_id=None,
                    name="Bonsai Reference Scene",
                    video_filename="bonsai_capture.mp4",
                    status="COMPLETE",
                    model_path=str(bonsai_model),
                    dataset_path=str(bonsai_dataset),
                    ply_path=str(ply) if ply.exists() else None,
                    iteration=it,
                    registered_images=120,
                    sparse_points=114250,
                    frames_count=120,
                    is_legacy=True,
                )
                db.add(rec)
                db.commit()

    # 2. Existing Lamp
    lamp_model = Path(r"C:\Projects\3D-Scene-Reconstruction\gaussian-splatting\output\my_scene_295")
    lamp_dataset = Path(r"C:\Projects\SceneForge3D\backend\uploads\my_scene\undistorted")
    if lamp_model.exists() and lamp_dataset.exists():
        it = _find_model_iteration(lamp_model)
        if it is not None:
            existing = db.query(ProjectRecord).filter(ProjectRecord.id == "legacy-lamp").first()
            ply = lamp_model / "point_cloud" / f"iteration_{it}" / "point_cloud.ply"
            if not existing:
                rec = ProjectRecord(
                    id="legacy-lamp",
                    user_id=None,
                    name="Lamp Reference Scene",
                    video_filename="lamp_orbit.mp4",
                    status="COMPLETE",
                    model_path=str(lamp_model),
                    dataset_path=str(lamp_dataset),
                    ply_path=str(ply) if ply.exists() else None,
                    iteration=it,
                    registered_images=85,
                    sparse_points=76800,
                    frames_count=85,
                    is_legacy=True,
                )
                db.add(rec)
                db.commit()

    # 3. Disk jobs under backend/jobs
    if JOBS.exists():
        for job_dir in JOBS.iterdir():
            if not job_dir.is_dir():
                continue
            work = job_dir / "work"
            dataset = work / "dataset"
            model = work / "gaussian_output"
            if not (work.exists() and dataset.exists() and model.exists()):
                continue

            it = _find_model_iteration(model)
            if it is None:
                continue

            existing = db.query(ProjectRecord).filter(ProjectRecord.id == job_dir.name).first()
            if not existing:
                # determine name from input dir
                input_dir = job_dir / "input"
                name = job_dir.name
                if input_dir.exists():
                    vids = [p for p in input_dir.iterdir() if p.is_file()]
                    if vids:
                        name = vids[0].stem

                ply = model / "point_cloud" / f"iteration_{it}" / "point_cloud.ply"
                rec = ProjectRecord(
                    id=job_dir.name,
                    user_id=None,
                    name=name,
                    status="COMPLETE",
                    model_path=str(model),
                    dataset_path=str(dataset),
                    ply_path=str(ply) if ply.exists() else None,
                    iteration=it,
                    is_legacy=True,
                )
                db.add(rec)
                db.commit()


# ============================================================
# PROJECT LISTING & MANAGEMENT
# ============================================================

def _record_to_dict(rec: ProjectRecord) -> dict[str, Any]:
    # Check if ply actually exists
    ply_available = False
    if rec.ply_path and Path(rec.ply_path).exists():
        ply_available = True
    elif rec.model_path:
        m = Path(rec.model_path)
        it = rec.iteration or 30000
        p = m / "point_cloud" / f"iteration_{it}" / "point_cloud.ply"
        ply_available = p.exists()

    return {
        "id": rec.id,
        "name": rec.name,
        "video_filename": rec.video_filename,
        "status": rec.status,
        "created_at": rec.created_at.isoformat() if rec.created_at else None,
        "updated_at": rec.updated_at.isoformat() if rec.updated_at else None,
        "iteration": rec.iteration,
        "frames_count": rec.frames_count or 0,
        "registered_images": rec.registered_images or 0,
        "sparse_points": rec.sparse_points or 0,
        "error": rec.error,
        "is_legacy": bool(rec.is_legacy),
        "ply_available": ply_available,
        "model_exists": Path(rec.model_path).exists() if rec.model_path else False,
        "dataset_exists": Path(rec.dataset_path).exists() if rec.dataset_path else False,
    }


@app.get("/api/projects")
async def get_projects(
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Return completed projects.
    If authenticated, returns the user's own projects (backend ownership enforced)
    along with reference legacy projects.
    """
    sync_legacy_and_disk_projects(db)

    legacy_records = db.query(ProjectRecord).filter(ProjectRecord.is_legacy == True).all()
    legacy_list = [_record_to_dict(r) for r in legacy_records]

    if current_user:
        user_records = (
            db.query(ProjectRecord)
            .filter(ProjectRecord.user_id == current_user.id)
            .order_by(ProjectRecord.created_at.desc())
            .all()
        )
        user_projects = [_record_to_dict(r) for r in user_records]

        # For backward compatibility, "projects" returns user's projects
        return {
            "projects": user_projects,
            "user_projects": user_projects,
            "legacy_projects": legacy_list,
        }

    # Public view returns legacy / showcase projects
    return {
        "projects": legacy_list,
        "user_projects": [],
        "legacy_projects": legacy_list,
    }


@app.get("/api/projects/showcase")
async def get_showcase_projects(db: Session = Depends(get_db)):
    """Return verified completed showcase projects for the landing page."""
    sync_legacy_and_disk_projects(db)
    records = (
        db.query(ProjectRecord)
        .filter(ProjectRecord.status == "COMPLETE")
        .order_by(ProjectRecord.created_at.desc())
        .limit(6)
        .all()
    )
    return {"projects": [_record_to_dict(r) for r in records]}


@app.get("/api/projects/{project_id}")
async def get_project_detail(
    project_id: str,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(ProjectRecord).filter(ProjectRecord.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found.")

    if not project.is_legacy and (not current_user or project.user_id != current_user.id):
        raise HTTPException(403, "You do not have permission to view this project.")

    return _record_to_dict(project)


@app.delete("/api/projects/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(ProjectRecord).filter(ProjectRecord.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found.")

    if project.user_id != current_user.id:
        raise HTTPException(403, "You are not authorized to delete this project.")

    # Remove files if inside JOBS directory safely
    job_dir = JOBS / project_id
    if job_dir.exists() and job_dir.resolve().is_relative_to(JOBS.resolve()):
        shutil.rmtree(job_dir, ignore_errors=True)

    db.delete(project)
    db.commit()

    return {"ok": True, "message": f"Project '{project.name}' deleted successfully."}


# ============================================================
# RECONSTRUCTION LAUNCH
# ============================================================

@app.post("/api/reconstruct")
async def reconstruct(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    global active_jobs

    if active_jobs >= int(SETTINGS["app"]["max_concurrent_jobs"]):
        raise HTTPException(
            409,
            "A reconstruction job is already in progress on the GPU. Please wait for it to complete.",
        )

    if not file.filename:
        raise HTTPException(400, "Missing filename.")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in {".mp4", ".mov", ".avi", ".mkv", ".webm"}:
        raise HTTPException(
            400,
            f"Unsupported video format '{suffix}'. Please upload an MP4, MOV, AVI, MKV, or WebM video.",
        )

    job_id = uuid.uuid4().hex[:12]
    job = create_job(job_id, user_id=current_user.id)

    root = JOBS / job_id
    input_dir = root / "input"
    input_dir.mkdir(parents=True, exist_ok=True)

    video_path = input_dir / Path(file.filename).name

    max_bytes = int(SETTINGS["app"]["max_upload_mb"]) * 1024 * 1024
    written = 0

    with video_path.open("wb") as out:
        while chunk := await file.read(1024 * 1024):
            written += len(chunk)
            if written > max_bytes:
                shutil.rmtree(root, ignore_errors=True)
                raise HTTPException(
                    413,
                    f"Video exceeds the {SETTINGS['app']['max_upload_mb']}MB upload limit.",
                )
            out.write(chunk)

    # Persist Project in Database
    project_name = Path(file.filename).stem.replace("_", " ").title()
    record = ProjectRecord(
        id=job_id,
        user_id=current_user.id,
        name=project_name,
        video_filename=file.filename,
        status="UPLOADED",
        created_at=datetime.now(timezone.utc),
    )
    db.add(record)
    db.commit()

    active_jobs += 1

    async def worker():
        global active_jobs
        try:
            await run_reconstruction(job, video_path)
        finally:
            active_jobs -= 1

    asyncio.create_task(worker())

    return {
        "job_id": job_id,
        "project_id": job_id,
        "status_url": f"/api/jobs/{job_id}",
        "events_url": f"/api/jobs/{job_id}/events",
    }


# ============================================================
# JOB STATUS & SSE
# ============================================================

@app.get("/api/jobs/{job_id}")
async def job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job.__dict__


@app.get("/api/jobs/{job_id}/events")
async def job_events(job_id: str):
    if not get_job(job_id):
        raise HTTPException(404, "Job not found")

    async def generator():
        async for job in stream(job_id):
            yield f"data: {json.dumps(job.__dict__)}\n\n"

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ============================================================
# REAL 3D VIEWER LAUNCH (SIBR)
# ============================================================

def _launch_sibr_for_paths(model_path: Path, dataset_path: Path, iteration: int):
    sibr_value = SETTINGS.get("paths", {}).get("sibr_exe")
    if not sibr_value:
        raise HTTPException(500, "SIBR viewer path is not configured in settings.json.")

    sibr_exe = resolve_config_path(sibr_value)
    if not sibr_exe or not sibr_exe.exists():
        raise HTTPException(
            500,
            f"SIBR viewer executable was not found at configured path: {sibr_exe}. Please verify settings.json.",
        )

    if not model_path.exists():
        raise HTTPException(404, f"Generated Gaussian model folder was not found at: {model_path}")

    if not dataset_path.exists():
        raise HTTPException(404, f"3DGS dataset was not found at: {dataset_path}")

    command = [
        str(sibr_exe),
        "--model-path",
        str(model_path),
        "--iteration",
        str(iteration),
        "--path",
        str(dataset_path),
    ]

    creationflags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0

    try:
        subprocess.Popen(
            command,
            cwd=str(sibr_exe.parent),
            creationflags=creationflags,
        )
    except Exception as exc:
        raise HTTPException(500, f"Could not launch SIBR viewer: {exc}")


@app.post("/api/jobs/{job_id}/view")
async def view_job(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found.")

    if job.status != "COMPLETE":
        raise HTTPException(409, f"The 3D scene is not complete yet (status: {job.status}).")

    details = job.details or {}
    model_value = details.get("model")
    dataset_value = details.get("dataset")
    it = details.get("iteration") or SETTINGS["reconstruction"].get("training_iterations", 30000)

    if not model_value or not dataset_value:
        raise HTTPException(500, "Model or dataset paths missing from job record.")

    _launch_sibr_for_paths(Path(model_value), Path(dataset_value), int(it))

    return {
        "ok": True,
        "message": "SIBR viewer launched on host workstation.",
        "model": model_value,
        "dataset": dataset_value,
        "iteration": int(it),
    }


@app.post("/api/projects/{project_id}/view")
async def view_project(
    project_id: str,
    db: Session = Depends(get_db),
):
    project = db.query(ProjectRecord).filter(ProjectRecord.id == project_id).first()
    if not project:
        raise HTTPException(404, "Completed project not found.")

    if not project.model_path or not project.dataset_path:
        raise HTTPException(400, "Project does not contain model or dataset paths.")

    _launch_sibr_for_paths(
        Path(project.model_path),
        Path(project.dataset_path),
        project.iteration or 30000,
    )

    return {
        "ok": True,
        "message": f"SIBR viewer launched for '{project.name}'.",
        "project": project.name,
    }


# ============================================================
# REAL SECURE FILE DOWNLOADS
# ============================================================

@app.get("/api/projects/{project_id}/download/{file_type}")
async def download_project_file(
    project_id: str,
    file_type: str,
    token: str | None = Query(None),          # browser download links can't set headers
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Real file download endpoint.
    file_type options: 'ply', 'metadata', 'sparse'

    Accepts auth via Authorization header (fetch calls) or ?token= query param
    (browser <a> / window.open downloads that cannot set custom headers).
    """
    # Resolve user from query-param token if header-based auth didn't match
    if current_user is None and token:
        session = db.query(UserSession).filter(UserSession.token == token).first()
        if session:
            current_user = db.query(User).filter(User.id == session.user_id).first()

    project = db.query(ProjectRecord).filter(ProjectRecord.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found.")

    if not project.is_legacy and (not current_user or project.user_id != current_user.id):
        raise HTTPException(403, "You do not have permission to download files for this project.")

    # 1. Download PLY Point Cloud
    if file_type == "ply":
        ply_file: Path | None = None
        if project.ply_path and Path(project.ply_path).exists():
            ply_file = Path(project.ply_path)
        elif project.model_path:
            model_dir = Path(project.model_path)
            it = project.iteration or 30000
            candidate = model_dir / "point_cloud" / f"iteration_{it}" / "point_cloud.ply"
            if candidate.exists():
                ply_file = candidate
            else:
                # Search for any iteration ply
                all_plys = list((model_dir / "point_cloud").glob("*/point_cloud.ply"))
                if all_plys:
                    ply_file = all_plys[-1]

        if not ply_file or not ply_file.exists():
            raise HTTPException(
                404,
                "Gaussian Splat PLY file has not been generated or was removed from disk.",
            )

        safe_filename = f"{project.name.lower().replace(' ', '_')}_iteration_{project.iteration or 30000}.ply"
        return FileResponse(
            path=str(ply_file),
            filename=safe_filename,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'},
        )

    # 2. Download JSON Metadata Report
    elif file_type == "metadata":
        meta = {
            "project_id": project.id,
            "project_name": project.name,
            "created_at": project.created_at.isoformat() if project.created_at else None,
            "status": project.status,
            "frames_extracted": project.frames_count or 0,
            "registered_cameras": project.registered_images or 0,
            "sparse_points": project.sparse_points or 0,
            "training_iterations": project.iteration or 30000,
            "model_path": project.model_path,
            "dataset_path": project.dataset_path,
            "reconstruction_engine": "SceneForge (COLMAP SfM + 3DGS + SIBR)",
        }
        report_content = json.dumps(meta, indent=2)
        safe_filename = f"{project.name.lower().replace(' ', '_')}_metadata.json"
        return StreamingResponse(
            iter([report_content]),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'},
        )

    # 3. Download COLMAP Log
    elif file_type == "sparse":
        log_candidate = JOBS / project_id / "work" / "colmap.log"
        if not log_candidate.exists():
            raise HTTPException(404, "COLMAP sparse reconstruction log not found.")

        safe_filename = f"{project.name.lower().replace(' ', '_')}_colmap.log"
        return FileResponse(
            path=str(log_candidate),
            filename=safe_filename,
            media_type="text/plain",
            headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'},
        )

    else:
        raise HTTPException(
            400,
            f"Invalid file type '{file_type}'. Supported types: 'ply', 'metadata', 'sparse'.",
        )
