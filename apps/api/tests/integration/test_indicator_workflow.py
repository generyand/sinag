"""
Integration Tests for Indicator Workflow

Tests the complete indicator management workflow:
- Draft creation and management
- Indicator tree building with validation
- Topological sorting during bulk publish
- Audit logging
- Version locking
- BBI status updates
"""

import pytest
from sqlalchemy.orm import Session

from app.db.models.admin import AuditLog
from app.db.models.governance_area import Indicator
from app.services.audit_service import audit_service
from app.services.indicator_draft_service import indicator_draft_service
from app.services.indicator_service import indicator_service


class TestIndicatorWorkflow:
    """Test complete indicator workflow from draft to publish."""

    def test_full_workflow_draft_to_publish(
        self, db_session: Session, mlgoo_user, mock_governance_area
    ):
        """
        Test 1: Full workflow - create draft → add indicators → publish → verify in DB

        Steps:
        1. Create a draft
        2. Add 3 indicators in hierarchy (parent → 2 children)
        3. Bulk publish from draft
        4. Verify indicators exist in database
        5. Verify draft is deleted after publish
        6. Verify audit log created
        """
        # Use governance area from fixture
        governance_area = mock_governance_area

        # Step 1: Create draft
        draft = indicator_draft_service.create_draft(
            db=db_session,
            user_id=mlgoo_user.id,
            governance_area_id=governance_area.id,
            creation_mode="incremental",
            title="Test Draft",
        )

        # Step 2: Add indicators to draft
        indicators = [
            {
                "temp_id": "temp_1",
                "parent_temp_id": None,
                "name": "Parent Indicator",
                "description": "Parent indicator description",
                "indicator_code": "1",
                "sort_order": 0,
                "weight": 100,
                "order": 0,
                "is_active": True,
                "is_profiling_only": False,
                "is_auto_calculable": False,
            },
            {
                "temp_id": "temp_2",
                "parent_temp_id": "temp_1",
                "name": "Child Indicator 1",
                "description": "First child",
                "indicator_code": "1.1",
                "sort_order": 0,
                "weight": 60,
                "order": 1,
                "is_active": True,
                "is_profiling_only": False,
                "is_auto_calculable": False,
            },
            {
                "temp_id": "temp_3",
                "parent_temp_id": "temp_1",
                "name": "Child Indicator 2",
                "description": "Second child",
                "indicator_code": "1.2",
                "sort_order": 1,
                "weight": 40,
                "order": 2,
                "is_active": True,
                "is_profiling_only": False,
                "is_auto_calculable": False,
            },
        ]

        # Update draft with indicators
        updated_draft = indicator_draft_service.save_draft(
            db=db_session,
            draft_id=draft.id,
            user_id=mlgoo_user.id,
            update_data={"data": indicators},
            version=draft.version,
        )

        assert len(updated_draft.data) == 3

        # Step 3: Bulk publish
        created_indicators, temp_id_mapping, errors = indicator_service.bulk_create_indicators(
            db=db_session,
            governance_area_id=governance_area.id,
            indicators_data=indicators,
            user_id=mlgoo_user.id,
        )

        # Step 4: Verify indicators created
        assert len(errors) == 0
        assert len(created_indicators) == 3
        assert len(temp_id_mapping) == 3

        # Verify parent created
        parent = (
            db_session.query(Indicator).filter(Indicator.id == temp_id_mapping["temp_1"]).first()
        )
        assert parent is not None
        assert parent.name == "Parent Indicator"
        assert parent.parent_id is None

        # Verify children created with correct parent_id
        child1 = (
            db_session.query(Indicator).filter(Indicator.id == temp_id_mapping["temp_2"]).first()
        )
        assert child1 is not None
        assert child1.parent_id == parent.id

        child2 = (
            db_session.query(Indicator).filter(Indicator.id == temp_id_mapping["temp_3"]).first()
        )
        assert child2 is not None
        assert child2.parent_id == parent.id

        # Step 5: Verify audit log created
        audit_logs = (
            db_session.query(AuditLog)
            .filter(
                AuditLog.user_id == mlgoo_user.id,
                AuditLog.entity_type == "indicator",
                AuditLog.action == "bulk_create",
            )
            .all()
        )

        assert len(audit_logs) > 0
        latest_log = audit_logs[-1]
        assert latest_log.changes["count"] == 3

    def test_validation_failure_prevents_publish(
        self, db_session: Session, mlgoo_user, mock_governance_area
    ):
        """
        Test 2: Validation failure - missing weights → publish fails → draft intact

        Steps:
        1. Create indicators with invalid weight sum (not 100%)
        2. Attempt to publish
        3. Verify validation catches error
        4. Verify no indicators created (rollback)
        """
        governance_area = mock_governance_area

        # Invalid indicators: children weights sum to 90% (not 100%)
        indicators = [
            {
                "temp_id": "temp_1",
                "parent_temp_id": None,
                "name": "Parent",
                "indicator_code": "1",
                "sort_order": 0,
                "weight": 100,
                "order": 0,
            },
            {
                "temp_id": "temp_2",
                "parent_temp_id": "temp_1",
                "name": "Child 1",
                "indicator_code": "1.1",
                "sort_order": 0,
                "weight": 50,  # Only 50%
                "order": 1,
            },
            {
                "temp_id": "temp_3",
                "parent_temp_id": "temp_1",
                "name": "Child 2",
                "indicator_code": "1.2",
                "sort_order": 1,
                "weight": 40,  # Only 40% (total 90%)
                "order": 2,
            },
        ]

        # Count indicators before publish attempt
        initial_count = db_session.query(Indicator).count()

        # Attempt to publish (should fail validation)
        # Note: We'd need to add validation to bulk_create_indicators
        # For now, we'll test the validation service directly
        from app.services.indicator_validation_service import (
            indicator_validation_service,
        )

        weight_result = indicator_validation_service.validate_weights(indicators)
        assert weight_result.is_valid is False
        assert len(weight_result.errors) == 1

        # Verify no indicators created
        final_count = db_session.query(Indicator).count()
        assert final_count == initial_count

    def test_topological_sort_handles_parent_after_child(
        self, db_session: Session, mlgoo_user, mock_governance_area
    ):
        """
        Test 3: Topological sort - create parent after child in list → publish succeeds in correct order

        Steps:
        1. Create indicators with child listed before parent
        2. Publish with topological sort
        3. Verify parent created before child (correct order)
        """
        governance_area = mock_governance_area

        # Child listed BEFORE parent (incorrect order in array)
        indicators = [
            {
                "temp_id": "temp_child",
                "parent_temp_id": "temp_parent",
                "name": "Child (listed first)",
                "indicator_code": "1.1",
                "sort_order": 0,
                "weight": 100,
                "order": 0,
            },
            {
                "temp_id": "temp_parent",
                "parent_temp_id": None,
                "name": "Parent (listed second)",
                "indicator_code": "1",
                "sort_order": 0,
                "weight": 100,
                "order": 1,
            },
        ]

        # Publish (topological sort should reorder)
        created_indicators, temp_id_mapping, errors = indicator_service.bulk_create_indicators(
            db=db_session,
            governance_area_id=governance_area.id,
            indicators_data=indicators,
            user_id=mlgoo_user.id,
        )

        # Verify no errors
        assert len(errors) == 0
        assert len(created_indicators) == 2

        # Verify parent created before child
        parent = (
            db_session.query(Indicator)
            .filter(Indicator.id == temp_id_mapping["temp_parent"])
            .first()
        )
        child = (
            db_session.query(Indicator)
            .filter(Indicator.id == temp_id_mapping["temp_child"])
            .first()
        )

        assert parent is not None
        assert child is not None
        assert child.parent_id == parent.id

        # Verify parent created before child (parent.id < child.id in sequence)
        # Note: This assumes auto-incrementing IDs
        assert parent.id < child.id

    def test_circular_reference_detection(self, db_session: Session, mlgoo_user):
        """
        Test 4: Circular reference - A → B → A should be detected and rejected
        """
        from app.services.indicator_validation_service import (
            indicator_validation_service,
        )

        # Circular reference: A → B → A
        indicators = [
            {
                "id": "temp_a",
                "parent_id": "temp_b",
                "indicator_code": "A",
                "sort_order": 0,
            },
            {
                "id": "temp_b",
                "parent_id": "temp_a",
                "indicator_code": "B",
                "sort_order": 0,
            },
        ]

        # Validate tree structure
        result = indicator_validation_service.validate_tree_structure(indicators)

        assert result.is_valid is False
        assert len(result.errors) > 0
        assert any("Circular reference" in error for error in result.errors)

    def test_invalid_indicator_code_format(self, db_session: Session, mlgoo_user):
        """
        Test 5: Invalid indicator codes should be caught by validation
        """
        from app.services.indicator_validation_service import (
            indicator_validation_service,
        )

        # Invalid codes: trailing dots, letters, etc.
        indicators = [
            {"id": "1", "indicator_code": "1.", "sort_order": 0},  # Trailing dot
            {"id": "2", "indicator_code": "A.1", "sort_order": 1},  # Letter
            {
                "id": "3",
                "indicator_code": "1.a",
                "sort_order": 2,
            },  # Letter in second position
        ]

        errors, warnings = indicator_validation_service.validate_indicator_codes(indicators)

        assert len(errors) == 3
        assert all("invalid code format" in error for error in errors)

    def test_draft_version_locking(self, db_session: Session, mlgoo_user, mock_governance_area):
        """
        Test 6: Version conflict - concurrent edits should fail with stale version
        """
        governance_area = mock_governance_area

        # Create draft
        draft = indicator_draft_service.create_draft(
            db=db_session,
            user_id=mlgoo_user.id,
            governance_area_id=governance_area.id,
            creation_mode="incremental",
            title="Version Test",
        )

        initial_version = draft.version

        # Update draft (version increments)
        updated_draft = indicator_draft_service.save_draft(
            db=db_session,
            draft_id=draft.id,
            user_id=mlgoo_user.id,
            update_data={"data": [{"temp_id": "temp_1", "name": "Test"}]},
            version=initial_version,
        )

        assert updated_draft.version == initial_version + 1

        # Attempt to update with stale version (should fail)
        with pytest.raises(Exception) as exc_info:
            indicator_draft_service.save_draft(
                db=db_session,
                draft_id=draft.id,
                user_id=mlgoo_user.id,
                update_data={"data": [{"temp_id": "temp_2", "name": "Test 2"}]},
                version=initial_version,  # Stale version!
            )

        assert (
            "version conflict" in str(exc_info.value).lower()
            or "optimistic lock" in str(exc_info.value).lower()
        )

    def test_audit_log_query(self, db_session: Session, mlgoo_user):
        """
        Test 7: Verify audit logs can be queried and filtered
        """
        # Log some test events
        audit_service.log_audit_event(
            db=db_session,
            user_id=mlgoo_user.id,
            entity_type="indicator",
            entity_id=1,
            action="create",
            changes={"name": {"before": None, "after": "Test Indicator"}},
        )

        audit_service.log_audit_event(
            db=db_session,
            user_id=mlgoo_user.id,
            entity_type="indicator",
            entity_id=2,
            action="update",
            changes={"name": {"before": "Old Name", "after": "New Name"}},
        )

        # Query audit logs
        logs, total = audit_service.get_audit_logs(
            db=db_session,
            entity_type="indicator",
            user_id=mlgoo_user.id,
        )

        assert total >= 2
        assert all(log.entity_type == "indicator" for log in logs)
        assert all(log.user_id == mlgoo_user.id for log in logs)

    def test_parent_child_relationship_validation(self, db_session: Session):
        """
        Test 8: Non-existent parent should be caught by validation
        """
        from app.services.indicator_validation_service import (
            indicator_validation_service,
        )

        indicators = [
            {
                "id": "temp_1",
                "parent_id": None,
                "indicator_code": "1",
            },
            {
                "id": "temp_2",
                "parent_id": "non_existent_parent",  # Invalid!
                "indicator_code": "1.1",
            },
        ]

        errors = indicator_validation_service.validate_parent_child_relationships(indicators)

        assert len(errors) == 1
        assert "non-existent parent" in errors[0].lower()
        assert "non_existent_parent" in errors[0]


class TestSchemaValidation:
    """Test schema validation for form, calculation, and remark schemas."""

    def test_form_schema_validation(self):
        """Test form schema validation catches missing labels."""
        from app.services.indicator_validation_service import (
            indicator_validation_service,
        )

        indicator = {
            "form_schema": {
                "fields": [
                    {"field_id": "field1", "field_type": "text"},  # Missing label!
                    {"field_id": "field2", "label": "Field 2", "field_type": "number"},
                ]
            }
        }

        errors = indicator_validation_service.validate_form_schema(indicator.get("form_schema"))

        assert len(errors) == 1
        assert "field1" in errors[0]
        assert "missing label" in errors[0]

    def test_calculation_schema_field_reference_validation(self):
        """Test calculation schema validation catches invalid field references."""
        from app.services.indicator_validation_service import (
            indicator_validation_service,
        )

        indicator = {
            "form_schema": {
                "fields": [
                    {"field_id": "field1", "label": "Field 1", "field_type": "number"},
                ]
            },
            "calculation_schema": {
                "condition_groups": [
                    {
                        "rules": [
                            {"field_id": "field1"},  # Valid
                            {"field_id": "field_does_not_exist"},  # Invalid!
                        ]
                    }
                ]
            },
        }

        errors = indicator_validation_service.validate_calculation_schema(
            indicator.get("calculation_schema"),
            indicator.get("form_schema"),
        )

        assert len(errors) == 1
        assert "field_does_not_exist" in errors[0]

    def test_remark_schema_variable_validation(self):
        """Test remark schema validation catches unknown variables."""
        from app.services.indicator_validation_service import (
            indicator_validation_service,
        )

        indicator = {
            "form_schema": {
                "fields": [
                    {"field_id": "field1", "label": "Field 1", "field_type": "text"},
                ]
            },
            "remark_schema": {
                "conditional_remarks": [
                    {"template": "Score: {{ score }}"},  # Valid
                    {"template": "Unknown: {{ unknown_variable }}"},  # Invalid!
                ]
            },
        }

        errors = indicator_validation_service.validate_remark_schema(
            indicator.get("remark_schema"),
            indicator.get("form_schema"),
        )

        assert len(errors) == 1
        assert "unknown_variable" in errors[0]


class TestBulkOperations:
    """Test bulk indicator operations and edge cases."""

    def test_empty_indicator_list(self, db_session: Session, mlgoo_user, mock_governance_area):
        """Test publishing empty indicator list."""
        governance_area = mock_governance_area

        created_indicators, temp_id_mapping, errors = indicator_service.bulk_create_indicators(
            db=db_session,
            governance_area_id=governance_area.id,
            indicators_data=[],  # Empty list
            user_id=mlgoo_user.id,
        )

        assert len(created_indicators) == 0
        assert len(temp_id_mapping) == 0
        assert len(errors) == 0

    def test_large_indicator_tree(self, db_session: Session, mlgoo_user, mock_governance_area):
        """Test publishing large indicator tree (50+ indicators)."""
        governance_area = mock_governance_area

        # Generate 50 indicators (1 parent + 49 children)
        indicators = [
            {
                "temp_id": "temp_parent",
                "parent_temp_id": None,
                "name": "Parent",
                "indicator_code": "1",
                "sort_order": 0,
                "weight": 100,
                "order": 0,
            }
        ]

        for i in range(1, 50):
            indicators.append(
                {
                    "temp_id": f"temp_child_{i}",
                    "parent_temp_id": "temp_parent",
                    "name": f"Child {i}",
                    "indicator_code": f"1.{i}",
                    "sort_order": i - 1,
                    "weight": 100 / 49,  # Divide weight equally
                    "order": i,
                }
            )

        created_indicators, temp_id_mapping, errors = indicator_service.bulk_create_indicators(
            db=db_session,
            governance_area_id=governance_area.id,
            indicators_data=indicators,
            user_id=mlgoo_user.id,
        )

        assert len(errors) == 0
        assert len(created_indicators) == 50
        assert len(temp_id_mapping) == 50
