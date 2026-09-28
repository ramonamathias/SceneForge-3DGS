import asyncio
from datetime import datetime, timezone
from pathlib import Path
from .models import Job
from .database import SessionLocal, ProjectRecord

jobs: dict[str, Job] = {}
queues: dict[str, asyncio.Queue] = {}


def create_job(job_id: str, user_id: str | None = None) -> Job:
    job = Job(id=job_id, user_id=user_id)
    jobs[job_id] = job
    queues[job_id] = asyncio.Queue()
    return job


def get_job(job_id: str) -> Job | None:
    return jobs.get(job_id)


def sync_job_to_db(job: Job):
    try:
        db = SessionLocal()
        record = db.query(ProjectRecord).filter(ProjectRecord.id == job.id).first()
        if record:
            record.status = job.status
            record.updated_at = datetime.now(timezone.utc)
            if job.error:
                record.error = str(job.error)

            details = job.details or {}
            if "frames" in details:
                record.frames_count = int(details["frames"])
            if "registered_images" in details:
                record.registered_images = int(details["registered_images"])
            if "sparse_points" in details:
                record.sparse_points = int(details["sparse_points"])
            if "iteration" in details:
                record.iteration = int(details["iteration"])
            if "model" in details:
                record.model_path = str(details["model"])
                # Check for ply file
                model_dir = Path(details["model"])
                it = details.get("iteration", record.iteration or 30000)
                ply = model_dir / "point_cloud" / f"iteration_{it}" / "point_cloud.ply"
                if ply.exists():
                    record.ply_path = str(ply)
            if "dataset" in details:
                record.dataset_path = str(details["dataset"])

            db.commit()
        db.close()
    except Exception as exc:
        print(f"[DB Sync Warning] Failed to update project record {job.id}: {exc}")


async def publish(job: Job):
    sync_job_to_db(job)
    if job.id in queues:
        await queues[job.id].put(job)


async def stream(job_id: str):
    if job_id not in queues:
        return
    q = queues[job_id]
    while True:
        item = await q.get()
        yield item
        if item.status in {"COMPLETE", "FAILED"}:
            break
