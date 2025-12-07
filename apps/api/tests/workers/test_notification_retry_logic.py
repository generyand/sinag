"""
Tests for notification worker retry logic (app/workers/notifications.py)

Tests cover:
- Task decorator configuration (autoretry_for, retry_backoff, max_retries)
- Transient error handling (database, connection errors)
- Permanent error handling (resource not found)
- MaxRetriesExceededError handling
- Error return values
"""

import pytest
from unittest.mock import MagicMock, patch, PropertyMock

from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.workers.notifications import (
    MAX_RETRIES,
    RETRY_BACKOFF,
    RETRY_BACKOFF_MAX,
    PermanentTaskError,
    send_new_submission_notification,
    send_rework_notification,
    send_rework_resubmission_notification,
    send_ready_for_validation_notification,
    send_calibration_notification,
    send_calibration_resubmission_notification,
    send_validation_complete_notification,
    send_ready_for_mlgoo_approval_notification,
    send_mlgoo_recalibration_notification,
    send_assessment_approved_notification,
    send_grace_period_warning_notification,
    send_deadline_expired_notification,
)


class TestRetryConstants:
    """Test retry configuration constants"""

    def test_max_retries_value(self):
        """Test MAX_RETRIES is configured correctly"""
        assert MAX_RETRIES == 3

    def test_retry_backoff_value(self):
        """Test RETRY_BACKOFF is 60 seconds"""
        assert RETRY_BACKOFF == 60

    def test_retry_backoff_max_value(self):
        """Test RETRY_BACKOFF_MAX is 300 seconds (5 minutes)"""
        assert RETRY_BACKOFF_MAX == 300


class TestPermanentTaskError:
    """Test PermanentTaskError exception"""

    def test_permanent_error_exists(self):
        """Test PermanentTaskError class exists"""
        assert PermanentTaskError is not None

    def test_permanent_error_is_exception(self):
        """Test PermanentTaskError inherits from Exception"""
        exc = PermanentTaskError("Test error")
        assert isinstance(exc, Exception)


class TestTaskDecoratorConfiguration:
    """Test Celery task decorator configuration"""

    def test_send_new_submission_has_autoretry(self):
        """Test send_new_submission_notification has autoretry configured"""
        task = send_new_submission_notification
        assert hasattr(task, 'autoretry_for')
        assert OperationalError in task.autoretry_for
        assert SQLAlchemyError in task.autoretry_for
        assert ConnectionError in task.autoretry_for
        assert TimeoutError in task.autoretry_for

    def test_send_new_submission_has_retry_backoff(self):
        """Test send_new_submission_notification has retry_backoff configured"""
        task = send_new_submission_notification
        assert hasattr(task, 'retry_backoff')
        assert task.retry_backoff == RETRY_BACKOFF

    def test_send_new_submission_has_max_retries(self):
        """Test send_new_submission_notification has max_retries configured"""
        task = send_new_submission_notification
        assert hasattr(task, 'max_retries')
        assert task.max_retries == MAX_RETRIES

    def test_send_new_submission_has_retry_jitter(self):
        """Test send_new_submission_notification has retry_jitter enabled"""
        task = send_new_submission_notification
        assert hasattr(task, 'retry_jitter')
        assert task.retry_jitter is True


class TestAllTasksHaveRetryConfiguration:
    """Test all notification tasks have proper retry configuration"""

    @pytest.fixture
    def all_notification_tasks(self):
        """List of all notification tasks"""
        return [
            send_new_submission_notification,
            send_rework_notification,
            send_rework_resubmission_notification,
            send_ready_for_validation_notification,
            send_calibration_notification,
            send_calibration_resubmission_notification,
            send_validation_complete_notification,
            send_ready_for_mlgoo_approval_notification,
            send_mlgoo_recalibration_notification,
            send_assessment_approved_notification,
            send_grace_period_warning_notification,
            send_deadline_expired_notification,
        ]

    def test_all_tasks_have_autoretry_for(self, all_notification_tasks):
        """All tasks should have autoretry_for configured"""
        for task in all_notification_tasks:
            assert hasattr(task, 'autoretry_for'), f"{task.name} missing autoretry_for"
            # Should retry on database and connection errors
            assert OperationalError in task.autoretry_for, f"{task.name} missing OperationalError"
            assert SQLAlchemyError in task.autoretry_for, f"{task.name} missing SQLAlchemyError"

    def test_all_tasks_have_retry_backoff(self, all_notification_tasks):
        """All tasks should have retry_backoff configured"""
        for task in all_notification_tasks:
            assert hasattr(task, 'retry_backoff'), f"{task.name} missing retry_backoff"
            assert task.retry_backoff == RETRY_BACKOFF, f"{task.name} has wrong retry_backoff"

    def test_all_tasks_have_max_retries(self, all_notification_tasks):
        """All tasks should have max_retries configured"""
        for task in all_notification_tasks:
            assert hasattr(task, 'max_retries'), f"{task.name} missing max_retries"
            assert task.max_retries == MAX_RETRIES, f"{task.name} has wrong max_retries"

    def test_all_tasks_have_retry_jitter(self, all_notification_tasks):
        """All tasks should have retry_jitter enabled"""
        for task in all_notification_tasks:
            assert hasattr(task, 'retry_jitter'), f"{task.name} missing retry_jitter"
            assert task.retry_jitter is True, f"{task.name} should have retry_jitter=True"

    def test_all_tasks_are_bound(self, all_notification_tasks):
        """All tasks should be bound (have self parameter)"""
        for task in all_notification_tasks:
            assert hasattr(task, 'bind'), f"{task.name} missing bind attribute"


class TestNotFoundErrorHandling:
    """Test handling of resource not found errors"""

    @pytest.fixture
    def mock_db_session(self):
        """Mock database session"""
        with patch('app.workers.notifications.SessionLocal') as mock:
            session = MagicMock()
            mock.return_value = session
            yield session

    def test_new_submission_returns_permanent_on_not_found(self, mock_db_session):
        """Test task returns permanent error when assessment not found"""
        mock_db_session.query.return_value.filter.return_value.first.return_value = None

        result = send_new_submission_notification(assessment_id=999)

        assert result["success"] is False
        assert "not found" in result["error"].lower()
        assert result.get("permanent") is True

    def test_rework_returns_permanent_on_not_found(self, mock_db_session):
        """Test rework task returns permanent error when assessment not found"""
        mock_db_session.query.return_value.filter.return_value.first.return_value = None

        result = send_rework_notification(assessment_id=999)

        assert result["success"] is False
        assert "not found" in result["error"].lower()


class TestTransientErrorHandling:
    """Test handling of transient errors that should trigger retry"""

    @pytest.fixture
    def mock_db_session(self):
        """Mock database session that raises transient errors"""
        with patch('app.workers.notifications.SessionLocal') as mock:
            session = MagicMock()
            mock.return_value = session
            yield session

    def test_operational_error_is_reraised(self, mock_db_session):
        """Test OperationalError is re-raised to trigger Celery retry"""
        mock_db_session.query.side_effect = OperationalError("connection", {}, None)

        with pytest.raises(OperationalError):
            send_new_submission_notification(assessment_id=1)

    def test_connection_error_is_reraised(self, mock_db_session):
        """Test ConnectionError is re-raised to trigger Celery retry"""
        mock_db_session.query.side_effect = ConnectionError("Connection refused")

        with pytest.raises(ConnectionError):
            send_new_submission_notification(assessment_id=1)

    def test_timeout_error_is_reraised(self, mock_db_session):
        """Test TimeoutError is re-raised to trigger Celery retry"""
        mock_db_session.query.side_effect = TimeoutError("Request timeout")

        with pytest.raises(TimeoutError):
            send_new_submission_notification(assessment_id=1)


class TestUnexpectedErrorHandling:
    """Test handling of unexpected errors"""

    @pytest.fixture
    def mock_db_session(self):
        """Mock database session"""
        with patch('app.workers.notifications.SessionLocal') as mock:
            session = MagicMock()
            mock.return_value = session
            yield session

    def test_unexpected_error_returns_failure(self, mock_db_session):
        """Test unexpected errors return failure without raising"""
        # Setup: assessment exists
        mock_assessment = MagicMock()
        mock_assessment.id = 1
        mock_assessment.blgu_user = MagicMock()
        mock_assessment.blgu_user.barangay = MagicMock()
        mock_assessment.blgu_user.barangay.name = "Test Barangay"
        mock_assessment.blgu_user_id = 1

        mock_db_session.query.return_value.filter.return_value.first.return_value = mock_assessment

        # Simulate unexpected error during notification creation
        with patch('app.workers.notifications.notification_service') as mock_service:
            mock_service.notify_all_active_assessors.side_effect = ValueError("Unexpected")

            result = send_new_submission_notification(assessment_id=1)

            assert result["success"] is False
            assert "Unexpected" in result["error"]

    def test_db_rollback_called_on_error(self, mock_db_session):
        """Test database rollback is called on error"""
        mock_db_session.query.side_effect = ValueError("Test error")

        result = send_new_submission_notification(assessment_id=1)

        mock_db_session.rollback.assert_called()

    def test_db_close_always_called(self, mock_db_session):
        """Test database session is always closed"""
        mock_db_session.query.side_effect = ValueError("Test error")

        result = send_new_submission_notification(assessment_id=1)

        mock_db_session.close.assert_called()


class TestReturnValueStructure:
    """Test return value structure for all scenarios"""

    @pytest.fixture
    def mock_successful_notification(self):
        """Setup for successful notification"""
        with patch('app.workers.notifications.SessionLocal') as mock_session, \
             patch('app.workers.notifications.notification_service') as mock_service:

            session = MagicMock()
            mock_session.return_value = session

            # Create mock assessment
            assessment = MagicMock()
            assessment.id = 1
            assessment.blgu_user = MagicMock()
            assessment.blgu_user.barangay = MagicMock()
            assessment.blgu_user.barangay.name = "Test Barangay"
            assessment.blgu_user_id = 1

            session.query.return_value.filter.return_value.first.return_value = assessment

            # Mock notification creation
            mock_notifications = [MagicMock(), MagicMock()]
            mock_service.notify_all_active_assessors.return_value = mock_notifications

            yield session

    def test_success_response_structure(self, mock_successful_notification):
        """Test successful response has required fields"""
        result = send_new_submission_notification(assessment_id=1)

        assert "success" in result
        assert result["success"] is True
        assert "message" in result
        assert "assessment_id" in result
        assert "barangay_name" in result
        assert "notifications_created" in result

    def test_failure_response_structure(self):
        """Test failure response has required fields"""
        with patch('app.workers.notifications.SessionLocal') as mock:
            session = MagicMock()
            mock.return_value = session
            session.query.return_value.filter.return_value.first.return_value = None

            result = send_new_submission_notification(assessment_id=999)

            assert "success" in result
            assert result["success"] is False
            assert "error" in result


class TestNoManualRetryLogic:
    """Test that no manual self.retry() calls exist in the codebase"""

    def test_no_self_retry_in_source(self):
        """Verify no self.retry() calls in notifications module"""
        import inspect
        from app.workers import notifications

        source = inspect.getsource(notifications)

        # Should not have manual self.retry() calls
        # These conflict with autoretry_for and cause double retries
        assert "self.retry(countdown=" not in source, \
            "Found manual self.retry() call - these conflict with autoretry_for decorator"


class TestTaskNames:
    """Test task names are correctly configured"""

    def test_task_names_follow_convention(self):
        """Test all tasks have properly namespaced names"""
        tasks = [
            send_new_submission_notification,
            send_rework_notification,
            send_rework_resubmission_notification,
            send_ready_for_validation_notification,
            send_calibration_notification,
            send_calibration_resubmission_notification,
            send_validation_complete_notification,
            send_ready_for_mlgoo_approval_notification,
            send_mlgoo_recalibration_notification,
            send_assessment_approved_notification,
            send_grace_period_warning_notification,
            send_deadline_expired_notification,
        ]

        for task in tasks:
            assert task.name.startswith("notifications."), \
                f"Task {task.name} should start with 'notifications.'"
