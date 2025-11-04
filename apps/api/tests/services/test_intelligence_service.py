"""
Integration tests for Gemini API service calls.

Tests the API integration with mocked Gemini API responses to verify:
- API call logic
- Response parsing
- Caching behavior
- Error handling
"""

import json
from unittest.mock import MagicMock, Mock, patch

import pytest
from app.core.config import settings
from app.services.intelligence_service import intelligence_service


class TestGeminiAPIIntegration:
    """Test suite for Gemini API integration."""

    @patch("app.services.intelligence_service.genai.configure")
    @patch("app.services.intelligence_service.genai.GenerativeModel")
    def test_call_gemini_api_success(
        self, mock_generative_model, mock_configure, db_session, mock_assessment
    ):
        """Test successful Gemini API call and response parsing."""
        # Mock the Gemini API response
        mock_response = Mock()
        mock_response.text = json.dumps(
            {
                "summary": "Test summary of compliance status",
                "recommendations": [
                    "Recommendation 1",
                    "Recommendation 2",
                ],
                "capacity_development_needs": [
                    "Need 1",
                    "Need 2",
                ],
            }
        )

        mock_model = MagicMock()
        mock_model.generate_content = MagicMock(return_value=mock_response)
        mock_generative_model.return_value = mock_model

        # Configure mock settings
        with patch.object(settings, "GEMINI_API_KEY", "test_api_key"):
            result = intelligence_service.call_gemini_api(
                db_session, mock_assessment.id
            )

        # Verify response structure
        assert "summary" in result
        assert "recommendations" in result
        assert "capacity_development_needs" in result
        assert isinstance(result["recommendations"], list)
        assert isinstance(result["capacity_development_needs"], list)

        # Verify API was called
        mock_model.generate_content.assert_called_once()

    @patch("app.services.intelligence_service.genai.configure")
    @patch("app.services.intelligence_service.genai.GenerativeModel")
    def test_call_gemini_api_parse_json_from_code_block(
        self, mock_generative_model, mock_configure, db_session, mock_assessment
    ):
        """Test parsing JSON from markdown code block response."""
        # Mock response with JSON in code blocks
        mock_response = Mock()
        mock_response.text = """Here's the analysis:

```json
{
  "summary": "Summary text",
  "recommendations": ["Rec 1"],
  "capacity_development_needs": ["Need 1"]
}
```"""

        mock_model = MagicMock()
        mock_model.generate_content = MagicMock(return_value=mock_response)
        mock_generative_model.return_value = mock_model

        with patch.object(settings, "GEMINI_API_KEY", "test_api_key"):
            result = intelligence_service.call_gemini_api(
                db_session, mock_assessment.id
            )

        assert result["summary"] == "Summary text"
        assert len(result["recommendations"]) == 1

    def test_call_gemini_api_missing_api_key(self, db_session, mock_assessment):
        """Test that missing API key raises ValueError."""
        with patch.object(settings, "GEMINI_API_KEY", None):
            with pytest.raises(ValueError, match="GEMINI_API_KEY not configured"):
                intelligence_service.call_gemini_api(db_session, mock_assessment.id)

    @patch("app.services.intelligence_service.genai.configure")
    @patch("app.services.intelligence_service.genai.GenerativeModel")
    def test_call_gemini_api_invalid_json_response(
        self, mock_generative_model, mock_configure, db_session, mock_assessment
    ):
        """Test handling of invalid JSON response from API."""
        mock_response = Mock()
        mock_response.text = "Invalid non-JSON response"

        mock_model = MagicMock()
        mock_model.generate_content = MagicMock(return_value=mock_response)
        mock_generative_model.return_value = mock_model

        with patch.object(settings, "GEMINI_API_KEY", "test_api_key"):
            with pytest.raises(Exception, match="Failed to parse"):
                intelligence_service.call_gemini_api(db_session, mock_assessment.id)

    @patch("app.services.intelligence_service.genai.configure")
    @patch("app.services.intelligence_service.genai.GenerativeModel")
    def test_call_gemini_api_missing_required_keys(
        self, mock_generative_model, mock_configure, db_session, mock_assessment
    ):
        """Test that missing required keys in response raises ValueError."""
        mock_response = Mock()
        mock_response.text = json.dumps(
            {
                "summary": "Test",
                # Missing recommendations and capacity_development_needs
            }
        )

        mock_model = MagicMock()
        mock_model.generate_content = MagicMock(return_value=mock_response)
        mock_generative_model.return_value = mock_model

        with patch.object(settings, "GEMINI_API_KEY", "test_api_key"):
            with pytest.raises(ValueError, match="missing required keys"):
                intelligence_service.call_gemini_api(db_session, mock_assessment.id)

    def test_get_insights_with_caching_returns_cached_data(
        self, db_session, mock_assessment
    ):
        """Test that get_insights_with_caching returns cached data if available."""
        # Set ai_recommendations on the assessment
        cached_insights = {
            "summary": "Cached summary",
            "recommendations": ["Cached rec"],
            "capacity_development_needs": ["Cached need"],
        }
        mock_assessment.ai_recommendations = cached_insights
        db_session.commit()

        # Call get_insights_with_caching
        result = intelligence_service.get_insights_with_caching(
            db_session, mock_assessment.id
        )

        # Should return cached data
        assert result == cached_insights
        assert result["summary"] == "Cached summary"

    @patch("app.services.intelligence_service.intelligence_service.call_gemini_api")
    def test_get_insights_with_caching_calls_api_when_not_cached(
        self, mock_call_api, db_session, mock_assessment
    ):
        """Test that get_insights_with_caching calls API when no cache exists."""
        # Mock API response
        mock_insights = {
            "summary": "API generated summary",
            "recommendations": ["API rec"],
            "capacity_development_needs": ["API need"],
        }
        mock_call_api.return_value = mock_insights

        # Ensure no cached data
        mock_assessment.ai_recommendations = None
        db_session.commit()

        # Call get_insights_with_caching
        result = intelligence_service.get_insights_with_caching(
            db_session, mock_assessment.id
        )

        # Verify API was called
        mock_call_api.assert_called_once_with(db_session, mock_assessment.id)

        # Verify result and that the result matches the mocked data
        assert result == mock_insights
        assert result["summary"] == "API generated summary"

        # Verify data was stored in database
        db_session.refresh(mock_assessment)
        assert mock_assessment.ai_recommendations is not None

    @patch("app.services.intelligence_service.intelligence_service.call_gemini_api")
    def test_get_insights_with_caching_saves_to_database(
        self, mock_call_api, db_session, mock_assessment
    ):
        """Test that get_insights_with_caching saves results to database."""
        # Mock API response
        mock_insights = {
            "summary": "Test summary",
            "recommendations": ["Test recommendation"],
            "capacity_development_needs": ["Test need"],
        }
        mock_call_api.return_value = mock_insights

        # Ensure no cached data
        mock_assessment.ai_recommendations = None
        db_session.commit()

        # Call get_insights_with_caching (result not needed for this test)
        _result = intelligence_service.get_insights_with_caching(
            db_session, mock_assessment.id
        )

        # Refresh assessment from database
        db_session.refresh(mock_assessment)

        # Verify data was saved
        assert mock_assessment.ai_recommendations == mock_insights
        saved_insights = mock_assessment.ai_recommendations
        assert saved_insights is not None
        assert saved_insights["summary"] == "Test summary"

    def test_get_insights_with_caching_raises_error_for_invalid_assessment_id(
        self, db_session
    ):
        """Test that get_insights_with_caching raises error for non-existent assessment."""
        with pytest.raises(ValueError, match="Assessment.*not found"):
            intelligence_service.get_insights_with_caching(db_session, 99999)

    @patch("app.services.intelligence_service.intelligence_service.call_gemini_api")
    def test_get_insights_with_caching_propagates_api_errors(
        self, mock_call_api, db_session, mock_assessment
    ):
        """Test that get_insights_with_caching propagates API errors."""
        # Mock API to raise error
        mock_call_api.side_effect = Exception("API Error")

        # Ensure no cached data
        mock_assessment.ai_recommendations = None
        db_session.commit()

        # Should raise the error
        with pytest.raises(Exception, match="API Error"):
            intelligence_service.get_insights_with_caching(
                db_session, mock_assessment.id
            )

    @patch("app.services.intelligence_service.genai.configure")
    @patch("app.services.intelligence_service.genai.GenerativeModel")
    def test_call_gemini_api_with_quota_error(
        self, mock_generative_model, mock_configure, db_session, mock_assessment
    ):
        """Test handling of API quota exceeded error."""
        mock_model = MagicMock()
        mock_model.generate_content = MagicMock(side_effect=Exception("quota exceeded"))
        mock_generative_model.return_value = mock_model

        with patch.object(settings, "GEMINI_API_KEY", "test_api_key"):
            with pytest.raises(Exception, match="quota exceeded"):
                intelligence_service.call_gemini_api(db_session, mock_assessment.id)

    @patch("app.services.intelligence_service.genai.configure")
    @patch("app.services.intelligence_service.genai.GenerativeModel")
    def test_call_gemini_api_with_empty_response(
        self, mock_generative_model, mock_configure, db_session, mock_assessment
    ):
        """Test handling of empty response from API."""
        mock_response = Mock()
        mock_response.text = None

        mock_model = MagicMock()
        mock_model.generate_content = MagicMock(return_value=mock_response)
        mock_generative_model.return_value = mock_model

        with patch.object(settings, "GEMINI_API_KEY", "test_api_key"):
            with pytest.raises(Exception, match="empty or invalid response"):
                intelligence_service.call_gemini_api(db_session, mock_assessment.id)
