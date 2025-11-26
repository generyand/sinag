# 🔄 Celery Background Tasks

This document explains how to set up and run Celery workers for background task processing in the SINAG API.

## 📋 Overview

Celery is used for handling background tasks such as:
- **Rework Notifications**: Sending notifications to BLGU users when assessments need rework
- **Validation Complete Notifications**: Sending notifications when assessments are finalized
- **SGLGB Classification**: Processing video files for leadership assessment (future)

## 🚀 Quick Start

### 1. Start Redis Server

Celery requires Redis as a message broker. Make sure Redis is running:

```bash
# On Ubuntu/Debian
sudo systemctl start redis-server

# On macOS with Homebrew
brew services start redis

# On Windows
redis-server
```

### 2. Start Celery Worker

```bash
# Navigate to the API directory
cd apps/api

# Start a Celery worker
celery -A app.core.celery_app worker --loglevel=info

# Or use the worker script
python celery_worker.py
```

### 3. Start Celery Worker with Specific Queues

```bash
# Start worker for notifications only
celery -A app.core.celery_app worker --loglevel=info --queues=notifications

# Start worker for classification only
celery -A app.core.celery_app worker --loglevel=info --queues=classification

# Start worker for all queues
celery -A app.core.celery_app worker --loglevel=info --queues=notifications,classification
```

## 🔧 Configuration

### Environment Variables

Make sure these environment variables are set in your `.env` file:

```env
# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Redis Configuration (if different from Celery)
REDIS_URL=redis://localhost:6379/0
```

### Celery App Configuration

The Celery app is configured in `app/core/celery_app.py` with:
- **Broker**: Redis for message queuing
- **Result Backend**: Redis for storing task results
- **Task Serialization**: JSON format
- **Time Limits**: 30 minutes hard limit, 25 minutes soft limit
- **Queue Routing**: Separate queues for different task types

## 📊 Monitoring

### Celery Flower (Optional)

Flower is a web-based tool for monitoring Celery clusters:

```bash
# Install Flower
pip install flower

# Start Flower
celery -A app.core.celery_app flower
```

Then visit `http://localhost:5555` to monitor your Celery workers.

### Command Line Monitoring

```bash
# Check active workers
celery -A app.core.celery_app inspect active

# Check registered tasks
celery -A app.core.celery_app inspect registered

# Check worker stats
celery -A app.core.celery_app inspect stats
```

## 🧪 Testing

### Test Celery Tasks

Run the test script to verify tasks are working:

```bash
cd apps/api
python test_celery_tasks.py
```

### Manual Task Testing

```bash
# Start Python shell
cd apps/api
python -c "
from app.workers.notifications import send_rework_notification
task = send_rework_notification.delay(1)
print(f'Task ID: {task.id}')
print(f'Task ready: {task.ready()}')
"
```

## 🏗️ Development

### Auto-reload Worker

For development, start the worker with auto-reload:

```bash
celery -A app.core.celery_app worker --loglevel=info --reload
```

### Debug Mode

Enable debug logging:

```bash
celery -A app.core.celery_app worker --loglevel=debug
```

## 🚨 Troubleshooting

### Common Issues

1. **Redis Connection Error**
   ```
   Error: Unable to connect to Redis
   ```
   - Make sure Redis is running: `redis-cli ping`
   - Check Redis URL in environment variables

2. **Task Not Executing**
   ```
   Task is queued but not executing
   ```
   - Check if Celery worker is running
   - Verify task is in the correct queue
   - Check worker logs for errors

3. **Import Errors**
   ```
   ModuleNotFoundError: No module named 'app'
   ```
   - Make sure you're running from the correct directory
   - Check Python path configuration

### Logs

Check Celery worker logs for detailed error information:

```bash
# Worker logs will show task execution details
celery -A app.core.celery_app worker --loglevel=info
```

## 📝 Task Definitions

### Available Tasks

1. **`notifications.send_rework_notification`**
   - Sends notification when assessment needs rework
   - Queue: `notifications`
   - Parameters: `assessment_id` (int)

2. **`notifications.send_validation_complete_notification`**
   - Sends notification when assessment is finalized
   - Queue: `notifications`
   - Parameters: `assessment_id` (int)

### Adding New Tasks

To add new Celery tasks:

1. Create the task function in `app/workers/`
2. Decorate with `@celery_app.task`
3. Add to the `include` list in `celery_app.py`
4. Update queue routing if needed

Example:
```python
@celery_app.task(bind=True, name="notifications.new_task")
def new_task(self, param1, param2):
    # Task implementation
    return {"success": True}
```

## 🔄 Production Deployment

### Supervisor Configuration

For production, use Supervisor to manage Celery workers:

```ini
[program:celery-worker]
command=/path/to/venv/bin/celery -A app.core.celery_app worker --loglevel=info
directory=/path/to/apps/api
user=www-data
numprocs=1
stdout_logfile=/var/log/celery/worker.log
stderr_logfile=/var/log/celery/worker.log
autostart=true
autorestart=true
startsecs=10
stopwaitsecs=600
killasgroup=true
priority=998
```

### Docker Configuration

For Docker deployment, add Celery worker service:

```yaml
services:
  celery-worker:
    build: .
    command: celery -A app.core.celery_app worker --loglevel=info
    volumes:
      - .:/app
    depends_on:
      - redis
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/0
```
