#!/usr/bin/env python3
"""
🧪 Celery Task Test Script
Test script to verify Celery tasks are working correctly

Usage:
    python test_celery_tasks.py
"""

import os
import sys
import time

# Add the app directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def test_celery_tasks():
    """Test the Celery notification tasks."""
    try:
        from app.workers.notifications import (
            send_rework_notification,
            send_validation_complete_notification,
        )

        print("🔄 Testing Celery notification tasks...")

        # Test rework notification task
        print("\n📧 Testing rework notification task...")
        task = send_rework_notification.delay(1)  # Using assessment ID 1 for testing
        print(f"Task queued with ID: {task.id}")

        # Wait a moment for the task to complete
        time.sleep(2)

        # Check task result
        if task.ready():
            result = task.result
            print(f"Task result: {result}")
        else:
            print("Task is still running...")

        # Test validation complete notification task
        print("\n✅ Testing validation complete notification task...")
        task2 = send_validation_complete_notification.delay(1)  # Using assessment ID 1 for testing
        print(f"Task queued with ID: {task2.id}")

        # Wait a moment for the task to complete
        time.sleep(2)

        # Check task result
        if task2.ready():
            result = task2.result
            print(f"Task result: {result}")
        else:
            print("Task is still running...")

        print("\n✅ Celery task testing completed!")

    except Exception as e:
        print(f"❌ Error testing Celery tasks: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    test_celery_tasks()
