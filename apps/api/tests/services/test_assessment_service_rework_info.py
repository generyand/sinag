"""
Tests for the _get_area_rework_info method in AssessmentService.

This method extracts rework information from area_submission_status
and returns formatted data for the MLGOO submissions list.
"""

from unittest.mock import MagicMock

from app.services.assessment_service import assessment_service


class TestGetAreaReworkInfo:
    """Test suite for _get_area_rework_info method."""

    def test_returns_empty_list_when_area_submission_status_is_none(self):
        """Should return empty list when area_submission_status is None."""
        db = MagicMock()

        result = assessment_service._get_area_rework_info(db, None)

        assert result == []

    def test_returns_empty_list_when_area_submission_status_is_empty(self):
        """Should return empty list when area_submission_status is empty dict."""
        db = MagicMock()

        result = assessment_service._get_area_rework_info(db, {})

        assert result == []

    def test_returns_empty_list_when_no_areas_in_rework_status(self):
        """Should return empty list when no areas are in rework status."""
        db = MagicMock()
        area_status = {
            "1": {"status": "approved", "assessor_id": 1},
            "2": {"status": "submitted", "assessor_id": 2},
            "3": {"status": "in_review", "assessor_id": 3},
        }

        result = assessment_service._get_area_rework_info(db, area_status)

        assert result == []

    def test_returns_rework_info_for_single_area(self):
        """Should return rework info when one area is in rework status."""
        db = MagicMock()

        # Mock the User query
        mock_user = MagicMock()
        mock_user.id = 123
        mock_user.name = "Test Assessor"
        db.query.return_value.filter.return_value.all.return_value = [mock_user]

        area_status = {
            "1": {
                "status": "rework",
                "assessor_id": 123,
                "rework_requested_at": "2024-01-15T10:00:00",
                "rework_comments": "Please fix the MOV",
            },
            "2": {"status": "approved", "assessor_id": 456},
        }

        result = assessment_service._get_area_rework_info(db, area_status)

        assert len(result) == 1
        assert result[0]["governance_area_id"] == 1
        assert result[0]["governance_area_name"] == "Financial Administration"
        assert result[0]["assessor_id"] == 123
        assert result[0]["assessor_name"] == "Test Assessor"
        assert result[0]["rework_requested_at"] == "2024-01-15T10:00:00"
        assert result[0]["rework_comments"] == "Please fix the MOV"

    def test_returns_rework_info_for_multiple_areas(self):
        """Should return rework info for multiple areas in rework status."""
        db = MagicMock()

        # Mock the User query with two assessors
        mock_user1 = MagicMock()
        mock_user1.id = 123
        mock_user1.name = "Assessor One"
        mock_user2 = MagicMock()
        mock_user2.id = 456
        mock_user2.name = "Assessor Two"
        db.query.return_value.filter.return_value.all.return_value = [
            mock_user1,
            mock_user2,
        ]

        area_status = {
            "1": {"status": "rework", "assessor_id": 123},
            "2": {"status": "approved", "assessor_id": 789},
            "3": {"status": "rework", "assessor_id": 456},
        }

        result = assessment_service._get_area_rework_info(db, area_status)

        assert len(result) == 2

        # Check first rework area
        area_1 = next((r for r in result if r["governance_area_id"] == 1), None)
        assert area_1 is not None
        assert area_1["governance_area_name"] == "Financial Administration"
        assert area_1["assessor_name"] == "Assessor One"

        # Check second rework area
        area_3 = next((r for r in result if r["governance_area_id"] == 3), None)
        assert area_3 is not None
        assert area_3["governance_area_name"] == "Peace and Order"
        assert area_3["assessor_name"] == "Assessor Two"

    def test_handles_missing_assessor_id(self):
        """Should handle areas in rework status without assessor_id."""
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = []

        area_status = {
            "1": {"status": "rework"},  # No assessor_id
        }

        result = assessment_service._get_area_rework_info(db, area_status)

        assert len(result) == 1
        assert result[0]["assessor_id"] is None
        assert result[0]["assessor_name"] == "Unknown Assessor"

    def test_handles_unknown_assessor_id(self):
        """Should show 'Unknown Assessor' when assessor not found in database."""
        db = MagicMock()
        # Return empty list - assessor not found
        db.query.return_value.filter.return_value.all.return_value = []

        area_status = {
            "1": {"status": "rework", "assessor_id": 999},
        }

        result = assessment_service._get_area_rework_info(db, area_status)

        assert len(result) == 1
        assert result[0]["assessor_id"] == 999
        assert result[0]["assessor_name"] == "Unknown Assessor"

    def test_handles_malformed_area_data(self):
        """Should handle non-dict area data gracefully."""
        db = MagicMock()

        area_status = {
            "1": "invalid_string_data",  # Not a dict
            "2": {"status": "rework", "assessor_id": 123},
            "3": None,  # None value
            "4": 42,  # Integer value
        }

        # Mock the User query
        mock_user = MagicMock()
        mock_user.id = 123
        mock_user.name = "Test Assessor"
        db.query.return_value.filter.return_value.all.return_value = [mock_user]

        result = assessment_service._get_area_rework_info(db, area_status)

        # Should only return the valid rework area
        assert len(result) == 1
        assert result[0]["governance_area_id"] == 2

    def test_maps_all_governance_area_names_correctly(self):
        """Should map all 6 governance area IDs to correct names."""
        db = MagicMock()

        expected_names = {
            "1": "Financial Administration",
            "2": "Disaster Preparedness",
            "3": "Peace and Order",
            "4": "Social Protection",
            "5": "Business-Friendliness",
            "6": "Environmental Management",
        }

        # Create rework status for all areas
        area_status = {str(i): {"status": "rework", "assessor_id": i} for i in range(1, 7)}

        # Mock users for all assessor IDs
        mock_users = []
        for i in range(1, 7):
            mock_user = MagicMock()
            mock_user.id = i
            mock_user.name = f"Assessor {i}"
            mock_users.append(mock_user)
        db.query.return_value.filter.return_value.all.return_value = mock_users

        result = assessment_service._get_area_rework_info(db, area_status)

        assert len(result) == 6
        for item in result:
            area_id_str = str(item["governance_area_id"])
            assert item["governance_area_name"] == expected_names[area_id_str]

    def test_handles_unknown_area_id(self):
        """Should handle unknown area IDs gracefully."""
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = []

        area_status = {
            "99": {"status": "rework", "assessor_id": 1},  # Invalid area ID
        }

        result = assessment_service._get_area_rework_info(db, area_status)

        assert len(result) == 1
        assert result[0]["governance_area_id"] == 99
        assert result[0]["governance_area_name"] == "Area 99"  # Fallback name

    def test_optional_fields_can_be_none(self):
        """Should handle optional fields being None or missing."""
        db = MagicMock()

        mock_user = MagicMock()
        mock_user.id = 123
        mock_user.name = "Test Assessor"
        db.query.return_value.filter.return_value.all.return_value = [mock_user]

        area_status = {
            "1": {
                "status": "rework",
                "assessor_id": 123,
                # rework_requested_at and rework_comments are missing
            },
        }

        result = assessment_service._get_area_rework_info(db, area_status)

        assert len(result) == 1
        assert result[0]["rework_requested_at"] is None
        assert result[0]["rework_comments"] is None
