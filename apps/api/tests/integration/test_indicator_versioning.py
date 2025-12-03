"""
Integration tests for indicator versioning workflow.

Tests the complete versioning workflow from creation to schema updates,
verifying that version history is properly maintained and that assessment
responses maintain correct version references.
"""

import pytest
from sqlalchemy.orm import Session

from app.db.models.governance_area import Indicator, IndicatorHistory
from app.db.models.user import User
from app.services.indicator_service import indicator_service


@pytest.fixture
def test_user(db_session: Session) -> User:
    """Create a test user for versioning tests."""
    user = User(
        email="test_versioning@example.com",
        name="Versioning Test User",
        hashed_password="hashed",
        role="MLGOO_DILG",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_complete_versioning_workflow(
    db_session: Session,
    governance_area,
    test_user: User
):
    """
    Test complete workflow: create indicator → update schema → verify new version created.

    Workflow:
    1. Create indicator with version 1
    2. Update metadata only (no version change)
    3. Update form_schema (version increments to 2)
    4. Update calculation_schema (version increments to 3)
    5. Verify indicators_history contains versions 1 and 2
    6. Verify current indicators table contains version 3
    """
    # Step 1: Create indicator with version 1
    indicator_data = {
        "name": "Test Versioning Indicator",
        "description": "Initial description",
        "governance_area_id": governance_area.id,
        "is_active": True,
        "is_auto_calculable": False,
        "is_profiling_only": False,
        "form_schema": {
            "fields": [
                {
                    "field_id": "field1",
                    "field_type": "text_input",
                    "label": "Field 1",
                    "required": True
                }
            ]
        },
        "calculation_schema": None,
        "remark_schema": None,
    }

    indicator = indicator_service.create_indicator(
        db=db_session,
        data=indicator_data,
        user_id=test_user.id
    )

    assert indicator.version == 1
    assert indicator.name == "Test Versioning Indicator"
    # Just check that form_schema has the right structure
    assert "fields" in indicator.form_schema
    assert len(indicator.form_schema["fields"]) == 1
    assert indicator.form_schema["fields"][0]["field_id"] == "field1"
    assert indicator.form_schema["fields"][0]["field_type"] == "text_input"

    indicator_id = indicator.id

    # Step 2: Update metadata only (no version change)
    metadata_update = {
        "name": "Updated Name",
        "description": "Updated description",
    }

    indicator = indicator_service.update_indicator(
        db=db_session,
        indicator_id=indicator_id,
        data=metadata_update,
        user_id=test_user.id
    )

    assert indicator.version == 1  # Version should NOT change
    assert indicator.name == "Updated Name"
    assert indicator.description == "Updated description"

    # Verify no history entries yet (metadata changes don't create history)
    history = indicator_service.get_indicator_history(db_session, indicator_id)
    assert len(history) == 0

    # Step 3: Update form_schema (version increments to 2)
    schema_update_1 = {
        "form_schema": {
            "fields": [
                {
                    "field_id": "field1",
                    "field_type": "text_input",
                    "label": "Field 1",
                    "required": True
                },
                {
                    "field_id": "field2",
                    "field_type": "number_input",
                    "label": "Field 2",
                    "required": False
                }
            ]
        }
    }

    indicator = indicator_service.update_indicator(
        db=db_session,
        indicator_id=indicator_id,
        data=schema_update_1,
        user_id=test_user.id
    )

    assert indicator.version == 2  # Version should increment
    # Check form_schema structure
    assert len(indicator.form_schema["fields"]) == 2
    assert indicator.form_schema["fields"][0]["field_id"] == "field1"
    assert indicator.form_schema["fields"][1]["field_id"] == "field2"

    # Verify indicators_history contains version 1
    history = indicator_service.get_indicator_history(db_session, indicator_id)
    assert len(history) == 1
    assert history[0].version == 1
    assert history[0].name == "Updated Name"
    assert history[0].form_schema["fields"][0]["field_id"] == "field1"
    assert history[0].archived_by == test_user.id
    assert history[0].archived_at is not None

    # Step 4: Update calculation_schema (version increments to 3)
    schema_update_2 = {
        "calculation_schema": {
            "condition_groups": [
                {
                    "operator": "AND",
                    "rules": [
                        {
                            "rule_type": "MATCH_VALUE",
                            "field_id": "field1",
                            "operator": "!=",
                            "expected_value": ""
                        }
                    ]
                }
            ],
            "output_status_on_pass": "PASS"
        }
    }

    indicator = indicator_service.update_indicator(
        db=db_session,
        indicator_id=indicator_id,
        data=schema_update_2,
        user_id=test_user.id
    )

    assert indicator.version == 3  # Version should increment again
    # Just verify calculation_schema has condition_groups
    assert "condition_groups" in indicator.calculation_schema

    # Step 5: Verify indicators_history contains versions 1 and 2
    history = indicator_service.get_indicator_history(db_session, indicator_id)
    assert len(history) == 2

    # History should be ordered by version DESC (newest first)
    assert history[0].version == 2
    assert history[1].version == 1

    # Verify version 2 has the updated form_schema
    assert len(history[0].form_schema["fields"]) == 2
    assert history[0].form_schema["fields"][0]["field_id"] == "field1"
    assert history[0].form_schema["fields"][1]["field_id"] == "field2"
    assert history[0].calculation_schema is None

    # Step 6: Verify current indicators table contains version 3
    current_indicator = indicator_service.get_indicator(db_session, indicator_id)
    assert current_indicator.version == 3
    assert "condition_groups" in current_indicator.calculation_schema


def test_version_history_preserves_all_fields(
    db_session: Session,
    governance_area,
    test_user: User
):
    """
    Test that version history preserves all indicator fields correctly.
    """
    # Create indicator with all fields populated
    indicator_data = {
        "name": "Full Field Indicator",
        "description": "Full description",
        "governance_area_id": governance_area.id,
        "is_active": True,
        "is_auto_calculable": True,
        "is_profiling_only": False,
        "form_schema": {
            "fields": [
                {
                    "field_id": "test_field",
                    "field_type": "text_input",
                    "label": "Test Field",
                    "required": True
                }
            ]
        },
        "calculation_schema": {
            "condition_groups": [
                {
                    "operator": "OR",
                    "rules": [
                        {
                            "rule_type": "MATCH_VALUE",
                            "field_id": "test_field",
                            "operator": "!=",
                            "expected_value": ""
                        }
                    ]
                }
            ],
            "output_status_on_pass": "PASS"
        },
        "remark_schema": {"type": "string"},
        "technical_notes_text": "Original technical notes",
    }

    indicator = indicator_service.create_indicator(
        db=db_session,
        data=indicator_data,
        user_id=test_user.id
    )

    indicator_id = indicator.id

    # Update schema to trigger versioning
    schema_update = {
        "form_schema": {
            "fields": [
                {
                    "field_id": "test_field",
                    "field_type": "text_input",
                    "label": "Test Field",
                    "required": True
                },
                {
                    "field_id": "new_field",
                    "field_type": "number_input",
                    "label": "New Field",
                    "required": False
                }
            ]
        }
    }

    indicator_service.update_indicator(
        db=db_session,
        indicator_id=indicator_id,
        data=schema_update,
        user_id=test_user.id
    )

    # Verify history preserves all original fields
    history = indicator_service.get_indicator_history(db_session, indicator_id)
    assert len(history) == 1

    archived_version = history[0]
    assert archived_version.version == 1
    assert archived_version.name == "Full Field Indicator"
    assert archived_version.description == "Full description"
    assert archived_version.governance_area_id == governance_area.id
    assert archived_version.is_active is True
    assert archived_version.is_auto_calculable is True
    assert archived_version.is_profiling_only is False
    assert archived_version.form_schema["fields"][0]["field_id"] == "test_field"
    assert "condition_groups" in archived_version.calculation_schema
    assert archived_version.remark_schema == {"type": "string"}
    assert archived_version.technical_notes_text == "Original technical notes"
    assert archived_version.archived_by == test_user.id


def test_multiple_schema_changes_in_sequence(
    db_session: Session,
    governance_area,
    test_user: User
):
    """
    Test that multiple schema changes create correct version history.
    """
    # Create indicator
    indicator_data = {
        "name": "Multi-Version Indicator",
        "governance_area_id": governance_area.id,
        "form_schema": {
            "fields": [
                {
                    "field_id": "version",
                    "field_type": "number_input",
                    "label": "Version",
                    "required": True,
                    "default_value": 1
                }
            ]
        },
    }

    indicator = indicator_service.create_indicator(
        db=db_session,
        data=indicator_data,
        user_id=test_user.id
    )

    indicator_id = indicator.id

    # Make 5 schema changes
    for i in range(2, 7):
        update = {
            "form_schema": {
                "fields": [
                    {
                        "field_id": "version",
                        "field_type": "number_input",
                        "label": "Version",
                        "required": True,
                        "default_value": i
                    }
                ]
            }
        }
        indicator_service.update_indicator(
            db=db_session,
            indicator_id=indicator_id,
            data=update,
            user_id=test_user.id
        )

    # Verify current version is 6
    current = indicator_service.get_indicator(db_session, indicator_id)
    assert current.version == 6
    assert current.form_schema["fields"][0]["default_value"] == 6

    # Verify history has versions 1-5
    history = indicator_service.get_indicator_history(db_session, indicator_id)
    assert len(history) == 5

    # Verify versions are in descending order
    for idx, archived in enumerate(history):
        expected_version = 5 - idx  # 5, 4, 3, 2, 1
        assert archived.version == expected_version
        assert archived.form_schema["fields"][0]["default_value"] == expected_version


def test_version_uniqueness_constraint(
    db_session: Session,
    governance_area,
    test_user: User
):
    """
    Test that the unique constraint on (indicator_id, version) is enforced.
    """
    from sqlalchemy.exc import IntegrityError

    # Create indicator
    indicator_data = {
        "name": "Uniqueness Test Indicator",
        "governance_area_id": governance_area.id,
        "form_schema": {
            "fields": [
                {
                    "field_id": "initial",
                    "field_type": "radio_button",
                    "label": "Initial",
                    "required": True,
                    "options": [
                        {"label": "Yes", "value": "yes"},
                        {"label": "No", "value": "no"}
                    ]
                }
            ]
        },
    }

    indicator = indicator_service.create_indicator(
        db=db_session,
        data=indicator_data,
        user_id=test_user.id
    )

    # Update to create version history
    indicator_service.update_indicator(
        db=db_session,
        indicator_id=indicator.id,
        data={
            "form_schema": {
                "fields": [
                    {
                        "field_id": "updated",
                        "field_type": "radio_button",
                        "label": "Updated",
                        "required": True,
                        "options": [
                            {"label": "Option 1", "value": "opt1"},
                            {"label": "Option 2", "value": "opt2"}
                        ]
                    }
                ]
            }
        },
        user_id=test_user.id
    )

    # Try to manually insert duplicate version (should fail)
    duplicate_history = IndicatorHistory(
        indicator_id=indicator.id,
        version=1,  # Duplicate version
        name="Duplicate",
        governance_area_id=governance_area.id,
        is_active=True,
        is_auto_calculable=False,
        is_profiling_only=False,
        archived_by=test_user.id,
    )

    db_session.add(duplicate_history)

    with pytest.raises(IntegrityError):
        db_session.commit()

    db_session.rollback()


def test_archived_by_user_relationship(
    db_session: Session,
    governance_area,
    test_user: User
):
    """
    Test that the archived_by relationship correctly links to the user who triggered versioning.
    """
    # Create indicator
    indicator_data = {
        "name": "User Relationship Test",
        "governance_area_id": governance_area.id,
        "form_schema": {
            "fields": [
                {
                    "field_id": "initial",
                    "field_type": "radio_button",
                    "label": "Initial",
                    "required": True,
                    "options": [
                        {"label": "Yes", "value": "yes"},
                        {"label": "No", "value": "no"}
                    ]
                }
            ]
        },
    }

    indicator = indicator_service.create_indicator(
        db=db_session,
        data=indicator_data,
        user_id=test_user.id
    )

    # Update to create history
    indicator_service.update_indicator(
        db=db_session,
        indicator_id=indicator.id,
        data={
            "form_schema": {
                "fields": [
                    {
                        "field_id": "updated",
                        "field_type": "radio_button",
                        "label": "Updated",
                        "required": True,
                        "options": [
                            {"label": "Option 1", "value": "opt1"},
                            {"label": "Option 2", "value": "opt2"}
                        ]
                    }
                ]
            }
        },
        user_id=test_user.id
    )

    # Get history
    history = indicator_service.get_indicator_history(db_session, indicator.id)
    assert len(history) == 1

    # Verify archived_by user relationship
    archived_version = history[0]
    assert archived_version.archived_by == test_user.id

    # If the relationship is properly set up, we should be able to access the user
    # Note: This depends on the relationship being defined in the model
    if hasattr(archived_version, 'archived_by_user'):
        assert archived_version.archived_by_user.id == test_user.id
        assert archived_version.archived_by_user.email == test_user.email
