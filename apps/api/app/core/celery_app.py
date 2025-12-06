# 🔄 Celery Application Configuration
# Celery app setup for background task processing

from celery import Celery  # type: ignore

from app.core.config import settings

# Create Celery app instance
celery_app = Celery(
    "sinag",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.notifications",
        "app.workers.sglgb_classifier",
        "app.workers.intelligence_worker",
    ],
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Optional: Configure task routing
celery_app.conf.task_routes = {
    "notifications.*": {"queue": "notifications"},
    "classification.*": {"queue": "classification"},
    "intelligence.*": {"queue": "intelligence"},
}

if __name__ == "__main__":
    celery_app.start()
