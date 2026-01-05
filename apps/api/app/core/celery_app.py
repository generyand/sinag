# 🔄 Celery Application Configuration
# Celery app setup for background task processing

from celery import Celery  # type: ignore
from celery.schedules import crontab  # type: ignore

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
        "app.workers.deadline_worker",
    ],
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Manila",  # Philippine timezone for scheduled tasks
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Configure task routing
celery_app.conf.task_routes = {
    "notifications.*": {"queue": "notifications"},
    "classification.*": {"queue": "classification"},
    "intelligence.*": {"queue": "intelligence"},
    "deadline.*": {"queue": "deadline"},
}

# Configure Celery Beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    # Daily deadline reminder check (8 AM Philippine time)
    "check-deadline-reminders-daily": {
        "task": "deadline.process_deadline_reminders",
        "schedule": crontab(hour=8, minute=0),
    },
    # Hourly auto-submit check for expired deadlines
    "check-auto-submit-hourly": {
        "task": "deadline.process_auto_submit",
        "schedule": crontab(minute=0),  # Every hour at minute 0
    },
}

if __name__ == "__main__":
    celery_app.start()
