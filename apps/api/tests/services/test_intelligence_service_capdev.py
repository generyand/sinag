"""
Unit tests for IntelligenceService CapDev methods.

Tests the CapDev (Capacity Development) functionality including:
- build_capdev_prompt() - Prompt construction from assessment data
- generate_capdev_insights() - Gemini API integration for insights
- generate_default_language_capdev_insights() - Multi-language generation
- get_capdev_insights_with_caching() - Caching logic
"""

import json
import uuid
from datetime import datetime
from unittest.mock import MagicMock, Mock, patch

import pytest
from app.core.config import settings
from app.db.enums import AssessmentStatus, ValidationStatus
from app.db.models.assessment import Assessment, AssessmentResponse, FeedbackComment
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from app.db.enums import AreaType, UserRole
from app.services.intelligence_service import (
    DEFAULT_LANGUAGES,
    LANGUAGE_INSTRUCTIONS,
    intelligence_service,
)
from passlib.context import CryptContext
from sqlalchemy.orm import Session

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def test_governance_area(db_session: Session):
    """Create a test governance area"""
    unique_id = uuid.uuid4().hex[:8]
    area = GovernanceArea(
        name=f"Financial Administration {unique_id}",
        code=f"F{unique_id[:1].upper()}",
        area_type=AreaType.CORE,
    )
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)
    return area


@pytest.fixture
def test_indicator(db_session: Session, test_governance_area: GovernanceArea):
    """Create a test indicator"""
    indicator = Indicator(
        name=f"Test Indicator {uuid.uuid4().hex[:8]}",
        description="Test indicator for CapDev testing",
        governance_area_id=test_governance_area.id,
        indicator_code="1.1",
        form_schema={"type": "object"},
    )
    db_session.add(indicator)
    db_session.commit()
    db_session.refresh(indicator)
    return indicator


@pytest.fixture
def mlgoo_approved_assessment(db_session: Session):
    """Create a MLGOO-approved assessment with responses"""
    # Create barangay
    barangay = Barangay(name=f"Test Barangay {uuid.uuid4().hex[:8]}")
    db_session.add(barangay)
    db_session.commit()

    # Create BLGU user
    user = User(
        email=f"blgu_{uuid.uuid4().hex[:8]}@example.com",
        name="Test BLGU User",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.BLGU_USER,
        barangay_id=barangay.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    # Create assessment
    assessment = Assessment(
        blgu_user_id=user.id,
        status=AssessmentStatus.COMPLETED,
        mlgoo_approved_by=1,
        mlgoo_approved_at=datetime(2024, 1, 1, 12, 0, 0),
        area_results={
            "Financial Administration": "Passed",
            "Disaster Preparedness": "Failed",
        },
    )
    db_session.add(assessment)
    db_session.commit()
    db_session.refresh(assessment)
    return assessment


@pytest.fixture
def assessment_with_responses(
    db_session: Session,
    mlgoo_approved_assessment: Assessment,
    test_indicator: Indicator,
):
    """Create assessment with indicator responses and feedback"""
    # Create passing response
    passing_response = AssessmentResponse(
        assessment_id=mlgoo_approved_assessment.id,
        indicator_id=test_indicator.id,
        response_data={"field1": "value1"},
        validation_status=ValidationStatus.PASS,
    )
    db_session.add(passing_response)

    # Create failing response
    failing_response = AssessmentResponse(
        assessment_id=mlgoo_approved_assessment.id,
        indicator_id=test_indicator.id,
        response_data={"field2": "value2"},
        validation_status=ValidationStatus.FAIL,
    )
    db_session.add(failing_response)
    db_session.commit()

    # Add feedback comment to failing response
    # Need to create an assessor user for the feedback comment
    assessor = User(
        email=f"assessor_{uuid.uuid4().hex[:8]}@example.com",
        name="Test Assessor",
        hashed_password=pwd_context.hash("password123"),
        role=UserRole.ASSESSOR,
        is_active=True,
    )
    db_session.add(assessor)
    db_session.commit()

    comment = FeedbackComment(
        response_id=failing_response.id,
        assessor_id=assessor.id,
        comment="Missing required documentation",
        is_internal_note=False,
    )
    db_session.add(comment)
    db_session.commit()

    return mlgoo_approved_assessment


# ============================================================================
# build_capdev_prompt() Tests
# ============================================================================


def test_build_capdev_prompt_success(
    db_session: Session, assessment_with_responses: Assessment
):
    """Test successful prompt building with assessment data"""
    prompt = intelligence_service.build_capdev_prompt(
        db_session, assessment_with_responses.id, language="ceb"
    )

    # Verify prompt contains key sections
    assert "BARANGAY INFORMATION:" in prompt
    assert "AREA-LEVEL RESULTS:" in prompt
    assert "DETAILED AREA ANALYSIS:" in prompt
    assert "TASK:" in prompt
    assert "GUIDELINES:" in prompt

    # Verify language instruction is included
    assert LANGUAGE_INSTRUCTIONS["ceb"] in prompt

    # Verify barangay name is included
    assert "Test Barangay" in prompt

    # Verify area results are included
    assert "Financial Administration" in prompt
    assert "Passed" in prompt


def test_build_capdev_prompt_english_language(
    db_session: Session, assessment_with_responses: Assessment
):
    """Test prompt building with English language"""
    prompt = intelligence_service.build_capdev_prompt(
        db_session, assessment_with_responses.id, language="en"
    )

    # Verify English instruction is included
    assert LANGUAGE_INSTRUCTIONS["en"] in prompt


def test_build_capdev_prompt_filipino_language(
    db_session: Session, assessment_with_responses: Assessment
):
    """Test prompt building with Filipino language"""
    prompt = intelligence_service.build_capdev_prompt(
        db_session, assessment_with_responses.id, language="fil"
    )

    # Verify Filipino instruction is included
    assert LANGUAGE_INSTRUCTIONS["fil"] in prompt


def test_build_capdev_prompt_assessment_not_found(db_session: Session):
    """Test that ValueError is raised for non-existent assessment"""
    with pytest.raises(ValueError, match="Assessment.*not found"):
        intelligence_service.build_capdev_prompt(db_session, 99999, language="ceb")


def test_build_capdev_prompt_not_mlgoo_approved(
    db_session: Session, mlgoo_approved_assessment: Assessment
):
    """Test that ValueError is raised if assessment not MLGOO approved"""
    # Clear the approval
    mlgoo_approved_assessment.mlgoo_approved_at = None
    db_session.commit()

    with pytest.raises(ValueError, match="has not been approved by MLGOO"):
        intelligence_service.build_capdev_prompt(
            db_session, mlgoo_approved_assessment.id, language="ceb"
        )


def test_build_capdev_prompt_includes_failed_indicator_details(
    db_session: Session, assessment_with_responses: Assessment
):
    """Test that prompt includes details about failed indicators"""
    prompt = intelligence_service.build_capdev_prompt(
        db_session, assessment_with_responses.id, language="ceb"
    )

    # Should include failed indicator section
    assert "Failed Indicators:" in prompt


def test_build_capdev_prompt_includes_assessor_feedback(
    db_session: Session, assessment_with_responses: Assessment
):
    """Test that prompt includes assessor feedback"""
    prompt = intelligence_service.build_capdev_prompt(
        db_session, assessment_with_responses.id, language="ceb"
    )

    # Should include feedback section
    assert "Key Assessor Feedback:" in prompt or "assessor_feedback" in prompt.lower()


def test_build_capdev_prompt_includes_json_structure(
    db_session: Session, assessment_with_responses: Assessment
):
    """Test that prompt specifies the expected JSON structure"""
    prompt = intelligence_service.build_capdev_prompt(
        db_session, assessment_with_responses.id, language="ceb"
    )

    # Verify JSON structure is specified
    assert '"summary":' in prompt
    assert '"governance_weaknesses":' in prompt
    assert '"recommendations":' in prompt
    assert '"capacity_development_needs":' in prompt
    assert '"suggested_interventions":' in prompt
    assert '"priority_actions":' in prompt


def test_build_capdev_prompt_year_extraction(
    db_session: Session, assessment_with_responses: Assessment
):
    """Test that assessment year is correctly extracted"""
    prompt = intelligence_service.build_capdev_prompt(
        db_session, assessment_with_responses.id, language="ceb"
    )

    # Should include the year from mlgoo_approved_at
    assert "2024" in prompt


# ============================================================================
# generate_capdev_insights() Tests
# ============================================================================


@patch("app.services.intelligence_service.genai.configure")
@patch("app.services.intelligence_service.genai.GenerativeModel")
def test_generate_capdev_insights_success(
    mock_generative_model,
    mock_configure,
    db_session: Session,
    assessment_with_responses: Assessment,
):
    """Test successful CapDev insights generation"""
    # Mock Gemini API response
    mock_response = Mock()
    mock_response.text = json.dumps({
        "summary": "Test summary of governance",
        "governance_weaknesses": ["Weakness 1", "Weakness 2"],
        "recommendations": ["Recommendation 1", "Recommendation 2"],
        "capacity_development_needs": [
            {
                "category": "Training",
                "description": "Accounting training",
                "affected_indicators": ["Indicator 1"],
                "suggested_providers": ["DILG"],
            }
        ],
        "suggested_interventions": [
            {
                "title": "Financial Training",
                "description": "2-day workshop",
                "governance_area": "Financial Administration",
                "priority": "Immediate",
                "estimated_duration": "2 days",
                "resource_requirements": "Venue, trainer",
            }
        ],
        "priority_actions": [
            "Action 1",
            "Action 2",
            "Action 3",
            "Action 4",
            "Action 5",
        ],
    })

    mock_model = MagicMock()
    mock_model.generate_content = MagicMock(return_value=mock_response)
    mock_generative_model.return_value = mock_model

    with patch.object(settings, "GEMINI_API_KEY", "test_api_key"):
        result = intelligence_service.generate_capdev_insights(
            db_session, assessment_with_responses.id, language="ceb"
        )

    # Verify response structure
    assert "summary" in result
    assert "governance_weaknesses" in result
    assert "recommendations" in result
    assert "capacity_development_needs" in result
    assert "suggested_interventions" in result
    assert "priority_actions" in result

    # Verify metadata was added
    assert "generated_at" in result
    assert "language" in result
    assert result["language"] == "ceb"
    assert "assessment_id" in result


@patch("app.services.intelligence_service.genai.configure")
@patch("app.services.intelligence_service.genai.GenerativeModel")
def test_generate_capdev_insights_parse_json_code_block(
    mock_generative_model,
    mock_configure,
    db_session: Session,
    assessment_with_responses: Assessment,
):
    """Test parsing JSON from markdown code block"""
    # Mock response with JSON in code blocks
    mock_response = Mock()
    mock_response.text = """Here's the analysis:

```json
{
  "summary": "Summary text",
  "governance_weaknesses": ["Weakness 1"],
  "recommendations": ["Rec 1"],
  "capacity_development_needs": [],
  "suggested_interventions": [],
  "priority_actions": ["Action 1", "Action 2", "Action 3", "Action 4", "Action 5"]
}
```"""

    mock_model = MagicMock()
    mock_model.generate_content = MagicMock(return_value=mock_response)
    mock_generative_model.return_value = mock_model

    with patch.object(settings, "GEMINI_API_KEY", "test_api_key"):
        result = intelligence_service.generate_capdev_insights(
            db_session, assessment_with_responses.id, language="ceb"
        )

    assert result["summary"] == "Summary text"


def test_generate_capdev_insights_missing_api_key(
    db_session: Session, assessment_with_responses: Assessment
):
    """Test that ValueError is raised when API key is missing"""
    with patch.object(settings, "GEMINI_API_KEY", None):
        with pytest.raises(ValueError, match="GEMINI_API_KEY not configured"):
            intelligence_service.generate_capdev_insights(
                db_session, assessment_with_responses.id, language="ceb"
            )


@patch("app.services.intelligence_service.genai.configure")
@patch("app.services.intelligence_service.genai.GenerativeModel")
def test_generate_capdev_insights_invalid_json_response(
    mock_generative_model,
    mock_configure,
    db_session: Session,
    assessment_with_responses: Assessment,
):
    """Test handling of invalid JSON response"""
    mock_response = Mock()
    mock_response.text = "Invalid non-JSON response"

    mock_model = MagicMock()
    mock_model.generate_content = MagicMock(return_value=mock_response)
    mock_generative_model.return_value = mock_model

    with patch.object(settings, "GEMINI_API_KEY", "test_api_key"):
        with pytest.raises(Exception, match="Failed to parse.*JSON"):
            intelligence_service.generate_capdev_insights(
                db_session, assessment_with_responses.id, language="ceb"
            )


@patch("app.services.intelligence_service.genai.configure")
@patch("app.services.intelligence_service.genai.GenerativeModel")
def test_generate_capdev_insights_missing_required_keys(
    mock_generative_model,
    mock_configure,
    db_session: Session,
    assessment_with_responses: Assessment,
):
    """Test that ValueError is raised when response missing required keys"""
    mock_response = Mock()
    mock_response.text = json.dumps({
        "summary": "Test",
        # Missing other required keys
    })

    mock_model = MagicMock()
    mock_model.generate_content = MagicMock(return_value=mock_response)
    mock_generative_model.return_value = mock_model

    with patch.object(settings, "GEMINI_API_KEY", "test_api_key"):
        with pytest.raises(ValueError, match="missing required keys"):
            intelligence_service.generate_capdev_insights(
                db_session, assessment_with_responses.id, language="ceb"
            )


@patch("app.services.intelligence_service.genai.configure")
@patch("app.services.intelligence_service.genai.GenerativeModel")
def test_generate_capdev_insights_empty_response(
    mock_generative_model,
    mock_configure,
    db_session: Session,
    assessment_with_responses: Assessment,
):
    """Test handling of empty API response"""
    mock_response = Mock()
    mock_response.text = None

    mock_model = MagicMock()
    mock_model.generate_content = MagicMock(return_value=mock_response)
    mock_generative_model.return_value = mock_model

    with patch.object(settings, "GEMINI_API_KEY", "test_api_key"):
        with pytest.raises(Exception, match="empty or invalid response"):
            intelligence_service.generate_capdev_insights(
                db_session, assessment_with_responses.id, language="ceb"
            )


@patch("app.services.intelligence_service.genai.configure")
@patch("app.services.intelligence_service.genai.GenerativeModel")
def test_generate_capdev_insights_quota_exceeded(
    mock_generative_model,
    mock_configure,
    db_session: Session,
    assessment_with_responses: Assessment,
):
    """Test handling of API quota exceeded error"""
    mock_model = MagicMock()
    mock_model.generate_content = MagicMock(
        side_effect=Exception("quota exceeded")
    )
    mock_generative_model.return_value = mock_model

    with patch.object(settings, "GEMINI_API_KEY", "test_api_key"):
        with pytest.raises(Exception, match="quota exceeded"):
            intelligence_service.generate_capdev_insights(
                db_session, assessment_with_responses.id, language="ceb"
            )


# ============================================================================
# generate_default_language_capdev_insights() Tests
# ============================================================================


@patch("app.services.intelligence_service.intelligence_service.generate_capdev_insights")
def test_generate_default_language_capdev_insights_success(
    mock_generate_capdev,
    db_session: Session,
    assessment_with_responses: Assessment,
):
    """Test generating insights in default languages"""
    # Mock the generate_capdev_insights to return different data per language
    def mock_generate(db, assessment_id, language):
        return {
            "summary": f"Summary in {language}",
            "governance_weaknesses": [],
            "recommendations": [],
            "capacity_development_needs": [],
            "suggested_interventions": [],
            "priority_actions": [],
        }

    mock_generate_capdev.side_effect = mock_generate

    result = intelligence_service.generate_default_language_capdev_insights(
        db_session, assessment_with_responses.id
    )

    # Verify insights were generated for default languages
    assert "ceb" in result
    assert "en" in result
    assert len(result) == 2

    # Verify each language has correct data
    assert result["ceb"]["summary"] == "Summary in ceb"
    assert result["en"]["summary"] == "Summary in en"


@patch("app.services.intelligence_service.intelligence_service.generate_capdev_insights")
def test_generate_default_language_capdev_insights_partial_failure(
    mock_generate_capdev,
    db_session: Session,
    assessment_with_responses: Assessment,
):
    """Test that partial failure doesn't stop other languages"""

    def mock_generate(db, assessment_id, language):
        if language == "ceb":
            raise Exception("API error for Bisaya")
        return {
            "summary": f"Summary in {language}",
            "governance_weaknesses": [],
            "recommendations": [],
            "capacity_development_needs": [],
            "suggested_interventions": [],
            "priority_actions": [],
        }

    mock_generate_capdev.side_effect = mock_generate

    result = intelligence_service.generate_default_language_capdev_insights(
        db_session, assessment_with_responses.id
    )

    # Should still have English even though Bisaya failed
    assert "en" in result
    # Bisaya might not be in result if it failed
    # The implementation continues on error


def test_generate_default_language_capdev_insights_constants():
    """Test that DEFAULT_LANGUAGES constant is correct"""
    assert DEFAULT_LANGUAGES == ["ceb", "en"]
    assert len(DEFAULT_LANGUAGES) == 2


# ============================================================================
# get_capdev_insights_with_caching() Tests
# ============================================================================


def test_get_capdev_insights_with_caching_returns_cached_data(
    db_session: Session, assessment_with_responses: Assessment
):
    """Test that cached data is returned without calling API"""
    # Set cached insights
    cached_insights = {
        "ceb": {
            "summary": "Cached Bisaya summary",
            "governance_weaknesses": [],
            "recommendations": [],
            "capacity_development_needs": [],
            "suggested_interventions": [],
            "priority_actions": [],
        }
    }
    assessment_with_responses.capdev_insights = cached_insights
    db_session.commit()

    result = intelligence_service.get_capdev_insights_with_caching(
        db_session, assessment_with_responses.id, language="ceb"
    )

    # Should return cached data
    assert result["summary"] == "Cached Bisaya summary"


@patch("app.services.intelligence_service.intelligence_service.generate_capdev_insights")
def test_get_capdev_insights_with_caching_generates_if_not_cached(
    mock_generate_capdev,
    db_session: Session,
    assessment_with_responses: Assessment,
):
    """Test that insights are generated if not cached"""
    # Mock API response
    mock_insights = {
        "summary": "Generated summary",
        "governance_weaknesses": [],
        "recommendations": [],
        "capacity_development_needs": [],
        "suggested_interventions": [],
        "priority_actions": [],
    }
    mock_generate_capdev.return_value = mock_insights

    # Ensure no cached data
    assessment_with_responses.capdev_insights = None
    db_session.commit()

    result = intelligence_service.get_capdev_insights_with_caching(
        db_session, assessment_with_responses.id, language="ceb"
    )

    # Verify API was called
    mock_generate_capdev.assert_called_once_with(
        db_session, assessment_with_responses.id, "ceb"
    )

    # Verify result matches
    assert result == mock_insights

    # Verify data was stored in database
    db_session.refresh(assessment_with_responses)
    assert assessment_with_responses.capdev_insights is not None
    assert "ceb" in assessment_with_responses.capdev_insights
    assert assessment_with_responses.capdev_insights_status == "completed"


@patch("app.services.intelligence_service.intelligence_service.generate_capdev_insights")
def test_get_capdev_insights_with_caching_stores_multiple_languages(
    mock_generate_capdev,
    db_session: Session,
    assessment_with_responses: Assessment,
):
    """Test that multiple languages are stored separately"""
    # Set up existing Bisaya insights
    assessment_with_responses.capdev_insights = {
        "ceb": {"summary": "Bisaya summary"}
    }
    db_session.commit()

    # Mock English generation
    mock_insights = {"summary": "English summary"}
    mock_generate_capdev.return_value = mock_insights

    # Request English
    result = intelligence_service.get_capdev_insights_with_caching(
        db_session, assessment_with_responses.id, language="en"
    )

    # Verify both languages are stored
    db_session.refresh(assessment_with_responses)
    assert "ceb" in assessment_with_responses.capdev_insights
    assert "en" in assessment_with_responses.capdev_insights
    assert assessment_with_responses.capdev_insights["ceb"]["summary"] == "Bisaya summary"
    assert assessment_with_responses.capdev_insights["en"]["summary"] == "English summary"


def test_get_capdev_insights_with_caching_assessment_not_found(
    db_session: Session,
):
    """Test that ValueError is raised for non-existent assessment"""
    with pytest.raises(ValueError, match="Assessment.*not found"):
        intelligence_service.get_capdev_insights_with_caching(
            db_session, 99999, language="ceb"
        )


def test_get_capdev_insights_with_caching_not_mlgoo_approved(
    db_session: Session, assessment_with_responses: Assessment
):
    """Test that ValueError is raised if not MLGOO approved"""
    # Clear approval
    assessment_with_responses.mlgoo_approved_at = None
    db_session.commit()

    with pytest.raises(ValueError, match="has not been approved by MLGOO"):
        intelligence_service.get_capdev_insights_with_caching(
            db_session, assessment_with_responses.id, language="ceb"
        )


@patch("app.services.intelligence_service.intelligence_service.generate_capdev_insights")
def test_get_capdev_insights_with_caching_updates_timestamp(
    mock_generate_capdev,
    db_session: Session,
    assessment_with_responses: Assessment,
):
    """Test that generated_at timestamp is updated"""
    mock_insights = {
        "summary": "Test summary",
        "governance_weaknesses": [],
        "recommendations": [],
        "capacity_development_needs": [],
        "suggested_interventions": [],
        "priority_actions": [],
    }
    mock_generate_capdev.return_value = mock_insights

    # Clear cached data
    assessment_with_responses.capdev_insights = None
    assessment_with_responses.capdev_insights_generated_at = None
    db_session.commit()

    intelligence_service.get_capdev_insights_with_caching(
        db_session, assessment_with_responses.id, language="ceb"
    )

    # Verify timestamp was set
    db_session.refresh(assessment_with_responses)
    assert assessment_with_responses.capdev_insights_generated_at is not None


# ============================================================================
# Language Instruction Tests
# ============================================================================


def test_language_instructions_all_languages_present():
    """Test that language instructions exist for all supported languages"""
    assert "ceb" in LANGUAGE_INSTRUCTIONS
    assert "en" in LANGUAGE_INSTRUCTIONS
    assert "fil" in LANGUAGE_INSTRUCTIONS


def test_language_instructions_non_empty():
    """Test that language instructions are not empty"""
    for lang, instruction in LANGUAGE_INSTRUCTIONS.items():
        assert len(instruction) > 0, f"Language instruction for '{lang}' is empty"


def test_language_instructions_contain_keywords():
    """Test that language instructions contain appropriate keywords"""
    # Bisaya instructions
    assert (
        "Binisaya" in LANGUAGE_INSTRUCTIONS["ceb"]
        or "Cebuano" in LANGUAGE_INSTRUCTIONS["ceb"]
    )

    # Filipino instructions
    assert (
        "Tagalog" in LANGUAGE_INSTRUCTIONS["fil"]
        or "Filipino" in LANGUAGE_INSTRUCTIONS["fil"]
    )

    # English instructions
    assert "English" in LANGUAGE_INSTRUCTIONS["en"]


# ============================================================================
# Integration Tests
# ============================================================================


@patch("app.services.intelligence_service.genai.configure")
@patch("app.services.intelligence_service.genai.GenerativeModel")
def test_full_capdev_workflow_with_caching(
    mock_generative_model,
    mock_configure,
    db_session: Session,
    assessment_with_responses: Assessment,
):
    """Test complete workflow: generate -> cache -> retrieve cached"""
    # Mock Gemini response
    mock_response = Mock()
    mock_response.text = json.dumps({
        "summary": "Complete summary",
        "governance_weaknesses": ["Weakness 1"],
        "recommendations": ["Rec 1"],
        "capacity_development_needs": [],
        "suggested_interventions": [],
        "priority_actions": ["Action 1", "Action 2", "Action 3", "Action 4", "Action 5"],
    })

    mock_model = MagicMock()
    mock_model.generate_content = MagicMock(return_value=mock_response)
    mock_generative_model.return_value = mock_model

    with patch.object(settings, "GEMINI_API_KEY", "test_api_key"):
        # First call - should generate
        result1 = intelligence_service.get_capdev_insights_with_caching(
            db_session, assessment_with_responses.id, language="ceb"
        )

        # Second call - should use cache
        result2 = intelligence_service.get_capdev_insights_with_caching(
            db_session, assessment_with_responses.id, language="ceb"
        )

    # API should only be called once
    assert mock_model.generate_content.call_count == 1

    # Both results should match
    assert result1 == result2
