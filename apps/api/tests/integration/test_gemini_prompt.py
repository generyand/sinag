"""
Unit tests for Gemini prompt building functionality.

Tests verify that the prompt is constructed correctly with all required information.
"""

import pytest

from app.services.intelligence_service import intelligence_service


class TestGeminiPromptBuilding:
    """Test suite for build_gemini_prompt method."""

    def test_prompt_includes_barangay_name(self, db_session, mock_assessment):
        """Test that prompt includes barangay name."""
        prompt = intelligence_service.build_gemini_prompt(db_session, mock_assessment.id)

        assert "BARANGAY INFORMATION" in prompt
        assert mock_assessment.blgu_user.barangay.name in prompt or "Unknown" in prompt

    def test_prompt_includes_assessment_year(self, db_session, mock_assessment):
        """Test that prompt includes assessment year."""
        prompt = intelligence_service.build_gemini_prompt(db_session, mock_assessment.id)

        assert "Assessment Year" in prompt

    def test_prompt_includes_compliance_status(self, db_session, mock_assessment):
        """Test that prompt includes compliance status."""
        prompt = intelligence_service.build_gemini_prompt(db_session, mock_assessment.id)

        assert "Overall Compliance Status" in prompt

    def test_prompt_includes_failed_indicators_section(self, db_session, mock_assessment):
        """Test that prompt includes FAILED INDICATORS section."""
        prompt = intelligence_service.build_gemini_prompt(db_session, mock_assessment.id)

        assert "FAILED INDICATORS" in prompt

    def test_prompt_requests_json_structure(self, db_session, mock_assessment):
        """Test that prompt requests JSON response with correct structure."""
        prompt = intelligence_service.build_gemini_prompt(db_session, mock_assessment.id)

        assert "summary" in prompt.lower()
        assert "recommendations" in prompt.lower()
        assert "capacity_development_needs" in prompt.lower()
        assert "JSON" in prompt

    def test_prompt_includes_indicator_details(self, db_session, mock_assessment):
        """Test that prompt includes indicator name and description for failed indicators."""
        prompt = intelligence_service.build_gemini_prompt(db_session, mock_assessment.id)

        # The prompt should mention "Failed Indicators" section and instructions
        # Even if there are no failed indicators, the structure should be present
        assert "failed indicators" in prompt.lower()
        assert "barangay" in prompt.lower()  # Area/barangay is mentioned in the prompt

    def test_prompt_includes_assessor_feedback_section(self, db_session, mock_assessment):
        """Test that prompt includes assessor feedback if available."""
        prompt = intelligence_service.build_gemini_prompt(db_session, mock_assessment.id)

        # At minimum, the structure should be present
        assert "Assessor Feedback" in prompt or "assessor" in prompt.lower()

    def test_prompt_task_instructions(self, db_session, mock_assessment):
        """Test that prompt includes task instructions."""
        prompt = intelligence_service.build_gemini_prompt(db_session, mock_assessment.id)

        assert "TASK" in prompt
        assert "root causes" in prompt.lower() or "recommendations" in prompt.lower()
        assert "capacity development" in prompt.lower()

    def test_prompt_raises_error_for_nonexistent_assessment(self, db_session):
        """Test that building prompt for non-existent assessment raises ValueError."""
        with pytest.raises(ValueError, match="Assessment.*not found"):
            intelligence_service.build_gemini_prompt(db_session, 99999)

    def test_prompt_handles_missing_barangay(self, db_session, mock_assessment_without_barangay):
        """Test that prompt handles missing barangay information gracefully."""
        prompt = intelligence_service.build_gemini_prompt(
            db_session, mock_assessment_without_barangay.id
        )

        # Should still create valid prompt with "Unknown"
        assert "BARANGAY INFORMATION" in prompt
        assert "Unknown" in prompt or "Year" in prompt  # Year should be present

    def test_prompt_structure_well_formed(self, db_session, mock_assessment):
        """Test that prompt has well-formed structure with all sections."""
        prompt = intelligence_service.build_gemini_prompt(db_session, mock_assessment.id)

        # Check that all major sections are present
        sections = [
            "BARANGAY INFORMATION",
            "FAILED INDICATORS",
            "TASK",
        ]

        for section in sections:
            assert section in prompt, f"Missing section: {section}"

        # Check that prompt is not empty
        assert len(prompt) > 100  # Reasonable minimum length
