from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

@dataclass
class Job:
    id: str
    status: str = "QUEUED"
    message: str = "Waiting to start"
    progress: float = 0.0
    details: dict[str, Any] = field(default_factory=dict)
    error: str | None = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    user_id: str | None = None

    def update(self, status: str, message: str, progress: float | None = None, **details):
        self.status = status
        self.message = message
        if progress is not None:
            self.progress = max(0.0, min(100.0, progress))
        self.details.update(details)
        self.updated_at = datetime.now(timezone.utc).isoformat()
