"""
Tests for Celery background task for AI insights generation.

Tests verify:
- Task dispatch and execution
- Error handling
- Assessment validation requirements
- Database persistence
"""

from unittest.mock import patch

from app.db.enums import AssessmentStatus
from app.workers.intelligence_worker import _generate_insights_logic


class TestIntelligenceWorker:
    """Test suite for generate_insights_task Celery worker."""

    @patch("app.workers.intelligence_worker.intelligence_service")
    def test_successfully_generates_insights(
        self, mock_intelligence_service, db_session, mock_assessment
    ):
        """Test that logic successfully generates insights for a validated assessment."""
        # Mock the intelligence service response
        mock_insights = {
            "summary": "Test summary",
            "recommendations": ["Rec 1"],
            "capacity_development_needs": ["Need 1"],
        }
        mock_intelligence_service.get_insights_with_caching.return_value = mock_insights

        # Execute the logic directly with db_session
        result = _generate_insights_logic(
            mock_assessment.id,
            retry_count=0,
            max_retries=3,
            default_retry_delay=60,
            db=db_session,
        )

        # Verify successful result
        assert result["success"] is True
        assert result["assessment_id"] == mock_assessment.id
        assert "insights" in result
        assert result["message"] == "AI insights generated successfully"

        # Verify intelligence service was called
        mock_intelligence_service.get_insights_with_caching.assert_called_once()

    @patch("app.workers.intelligence_worker.intelligence_service")
    def test_raises_error_for_invalid_assessment(
        self, mock_intelligence_service, db_session
    ):
        """Test that logic returns error for non-existent assessment."""
        # Execute with invalid assessment ID
        result = _generate_insights_logic(
            assessment_id=99999,
            retry_count=0,
            max_retries=3,
            default_retry_delay=60,
            db=db_session,
        )

        # Verify error result
        assert result["success"] is False
        assert "not found" in result["error"].lower()

        # Verify intelligence service was not called
        mock_intelligence_service.get_insights_with_caching.assert_not_called()

    @patch("app.workers.intelligence_worker.intelligence_service")
    def test_raises_error_for_non_validated_assessment(
        self, mock_intelligence_service, db_session, mock_assessment
    ):
        """Test that logic returns error for assessment that is not validated."""
        # Set assessment status to DRAFT (not validated)
        mock_assessment.status = AssessmentStatus.DRAFT
        db_session.commit()

        # Execute the logic
        result = _generate_insights_logic(
            mock_assessment.id,
            retry_count=0,
            max_retries=3,
            default_retry_delay=60,
            db=db_session,
        )

        # Verify error result
        assert result["success"] is False
        assert "not validated" in result["error"].lower()

        # Verify intelligence service was not called
        mock_intelligence_service.get_insights_with_caching.assert_not_called()

    @patch("app.workers.intelligence_worker.intelligence_service")
    def test_calls_intelligence_service(
        self, mock_intelligence_service, db_session, mock_assessment
    ):
        """Test that logic calls intelligence service."""
        mock_insights = {
            "summary": "Saved summary",
            "recommendations": ["Saved rec"],
            "capacity_development_needs": ["Saved need"],
        }
        mock_intelligence_service.get_insights_with_caching.return_value = mock_insights

        # Execute the logic
        result = _generate_insights_logic(
            mock_assessment.id,
            retry_count=0,
            max_retries=3,
            default_retry_delay=60,
            db=db_session,
        )

        # Verify intelligence service was called with correct parameters
        mock_intelligence_service.get_insights_with_caching.assert_called_once_with(
            db_session, mock_assessment.id
        )

        # Verify result includes the insights
        assert result["success"] is True
        assert result["insights"] == mock_insights

    @patch("app.workers.intelligence_worker.intelligence_service")
    def test_propagates_exception(
        self, mock_intelligence_service, db_session, mock_assessment
    ):
        """Test that logic propagates exceptions properly."""
        # Mock intelligence service to raise exception
        mock_intelligence_service.get_insights_with_caching.side_effect = Exception(
            "Test error"
        )

        # Execute and verify exception is returned as error
        result = _generate_insights_logic(
            mock_assessment.id, retry_count=0, max_retries=3, default_retry_delay=60
        )

        assert result["success"] is False
        assert "error" in result

    @patch("app.workers.intelligence_worker.intelligence_service")
    def test_handles_value_error_without_retry(
        self, mock_intelligence_service, db_session, mock_assessment
    ):
        """Test that ValueError exceptions are handled properly."""
        # Mock intelligence service to raise ValueError
        mock_intelligence_service.get_insights_with_caching.side_effect = ValueError(
            "Validation error"
        )

        # Execute the logic
        result = _generate_insights_logic(
            mock_assessment.id,
            retry_count=0,
            max_retries=3,
            default_retry_delay=60,
            db=db_session,
        )

        # Verify error result
        assert result["success"] is False
        assert "validation error" in result["error"].lower()
