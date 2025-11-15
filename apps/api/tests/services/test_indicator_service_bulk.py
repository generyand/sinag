"""
🧪 Indicator Service Bulk Operations Tests
Tests for Phase 6: Hierarchical Indicator Creation

Tests:
- Bulk creation with topological sorting
- Reordering with circular reference detection
- Tree structure validation
"""

import pytest
from fastapi import HTTPException

from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from app.db.enums import UserRole
from app.services.indicator_service import indicator_service
from app.core.security import get_password_hash


@pytest.fixture
def test_user(db_session):
    """Create a test MLGOO_DILG user."""
    user = User(
        email="test@example.com",
        name="Test User",
        hashed_password=get_password_hash("password"),
        role=UserRole.MLGOO_DILG,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_governance_area(db_session):
    """Create a test governance area."""
    from app.db.enums import AreaType
    area = GovernanceArea(
        id=1,
        name="Test Governance Area",
        area_type=AreaType.CORE
    )
    db_session.add(area)
    db_session.commit()
    db_session.refresh(area)
    return area


class TestTopologicalSorting:
    """Tests for topological sorting of indicators."""

    def test_simple_parent_child_order(self, db_session, test_governance_area, test_user):
        """Test that parents are created before children."""
        indicators_data = [
            {
                "temp_id": "child",
                "parent_temp_id": "parent",
                "order": 1,
                "name": "Child Indicator",
                "governance_area_id": 1,
            },
            {
                "temp_id": "parent",
                "parent_temp_id": None,
                "order": 1,
                "name": "Parent Indicator",
                "governance_area_id": 1,
            },
        ]

        sorted_indicators = indicator_service._topological_sort_indicators(indicators_data)

        # Parent should be first
        assert sorted_indicators[0]["temp_id"] == "parent"
        assert sorted_indicators[1]["temp_id"] == "child"

    def test_three_level_hierarchy(self, db_session, test_governance_area, test_user):
        """Test sorting with grandparent -> parent -> child."""
        indicators_data = [
            {
                "temp_id": "grandchild",
                "parent_temp_id": "child",
                "order": 1,
                "name": "Grandchild",
                "governance_area_id": 1,
            },
            {
                "temp_id": "parent",
                "parent_temp_id": None,
                "order": 1,
                "name": "Parent",
                "governance_area_id": 1,
            },
            {
                "temp_id": "child",
                "parent_temp_id": "parent",
                "order": 1,
                "name": "Child",
                "governance_area_id": 1,
            },
        ]

        sorted_indicators = indicator_service._topological_sort_indicators(indicators_data)

        # Should be in dependency order
        assert sorted_indicators[0]["temp_id"] == "parent"
        assert sorted_indicators[1]["temp_id"] == "child"
        assert sorted_indicators[2]["temp_id"] == "grandchild"

    def test_circular_dependency_detection(self, db_session):
        """Test that circular dependencies are detected."""
        indicators_data = [
            {
                "temp_id": "a",
                "parent_temp_id": "b",
                "order": 1,
                "name": "A",
                "governance_area_id": 1,
            },
            {
                "temp_id": "b",
                "parent_temp_id": "a",
                "order": 1,
                "name": "B",
                "governance_area_id": 1,
            },
        ]

        with pytest.raises(ValueError, match="Circular dependency"):
            indicator_service._topological_sort_indicators(indicators_data)

    def test_missing_parent_reference(self, db_session):
        """Test that missing parent references are caught."""
        indicators_data = [
            {
                "temp_id": "child",
                "parent_temp_id": "nonexistent",
                "order": 1,
                "name": "Child",
                "governance_area_id": 1,
            },
        ]

        with pytest.raises(ValueError, match="Parent temp_id nonexistent not found"):
            indicator_service._topological_sort_indicators(indicators_data)


class TestBulkCreation:
    """Tests for bulk indicator creation."""

    def test_bulk_create_simple_hierarchy(self, db_session, test_governance_area, test_user):
        """Test creating a simple parent-child hierarchy."""
        indicators_data = [
            {
                "temp_id": "parent-1",
                "parent_temp_id": None,
                "order": 1,
                "name": "Parent Indicator",
                "description": "Parent description",
                "is_active": True,
                "is_auto_calculable": False,
                "is_profiling_only": False,
            },
            {
                "temp_id": "child-1",
                "parent_temp_id": "parent-1",
                "order": 1,
                "name": "Child Indicator",
                "description": "Child description",
                "is_active": True,
                "is_auto_calculable": False,
                "is_profiling_only": False,
            },
        ]

        created, temp_id_mapping, errors = indicator_service.bulk_create_indicators(
            db=db_session,
            governance_area_id=test_governance_area.id,
            indicators_data=indicators_data,
            user_id=test_user.id,
        )

        # Check results
        assert len(created) == 2
        assert len(errors) == 0
        assert "parent-1" in temp_id_mapping
        assert "child-1" in temp_id_mapping

        # Verify parent relationship
        parent = db_session.query(Indicator).filter(
            Indicator.id == temp_id_mapping["parent-1"]
        ).first()
        child = db_session.query(Indicator).filter(
            Indicator.id == temp_id_mapping["child-1"]
        ).first()

        assert parent is not None
        assert child is not None
        assert child.parent_id == parent.id
        assert parent.parent_id is None

    def test_bulk_create_with_invalid_governance_area(self, db_session, test_user):
        """Test that invalid governance area is rejected."""
        indicators_data = [
            {
                "temp_id": "test-1",
                "parent_temp_id": None,
                "order": 1,
                "name": "Test Indicator",
            },
        ]

        with pytest.raises(HTTPException) as exc_info:
            indicator_service.bulk_create_indicators(
                db=db_session,
                governance_area_id=9999,  # Invalid ID
                indicators_data=indicators_data,
                user_id=test_user.id,
            )

        assert exc_info.value.status_code == 404
        assert "Governance area" in str(exc_info.value.detail)

    def test_bulk_create_rollback_on_error(self, db_session, test_governance_area, test_user):
        """Test that transaction is rolled back if any indicator fails."""
        # Note: Service layer doesn't validate field lengths (that's done at API/Pydantic layer)
        # This test verifies that if we manually cause a database error, rollback works
        # For now, we'll test with circular dependency which DOES fail at service layer

        indicators_data = [
            {
                "temp_id": "a",
                "parent_temp_id": "b",  # Circular: a -> b -> a
                "order": 1,
                "name": "Indicator A",
                "is_active": True,
                "is_auto_calculable": False,
                "is_profiling_only": False,
            },
            {
                "temp_id": "b",
                "parent_temp_id": "a",  # Circular: b -> a -> b
                "order": 1,
                "name": "Indicator B",
                "is_active": True,
                "is_auto_calculable": False,
                "is_profiling_only": False,
            },
        ]

        # Should raise HTTPException due to circular dependency (ValueError is caught and converted)
        with pytest.raises(HTTPException) as exc_info:
            indicator_service.bulk_create_indicators(
                db=db_session,
                governance_area_id=test_governance_area.id,
                indicators_data=indicators_data,
                user_id=test_user.id,
            )

        assert exc_info.value.status_code == 500
        assert "Circular dependency" in str(exc_info.value.detail)

        # Verify nothing was created (transaction rolled back)
        count = db_session.query(Indicator).count()
        assert count == 0

    def test_bulk_create_with_multiple_children(self, db_session, test_governance_area, test_user):
        """Test creating one parent with multiple children."""
        indicators_data = [
            {
                "temp_id": "parent",
                "parent_temp_id": None,
                "order": 1,
                "name": "Parent Indicator",
                "is_active": True,
                "is_auto_calculable": False,
                "is_profiling_only": False,
            },
            {
                "temp_id": "child-1",
                "parent_temp_id": "parent",
                "order": 1,
                "name": "Child Indicator 1",
                "is_active": True,
                "is_auto_calculable": False,
                "is_profiling_only": False,
            },
            {
                "temp_id": "child-2",
                "parent_temp_id": "parent",
                "order": 2,
                "name": "Child Indicator 2",
                "is_active": True,
                "is_auto_calculable": False,
                "is_profiling_only": False,
            },
        ]

        created, temp_id_mapping, errors = indicator_service.bulk_create_indicators(
            db=db_session,
            governance_area_id=test_governance_area.id,
            indicators_data=indicators_data,
            user_id=test_user.id,
        )

        assert len(created) == 3
        assert len(errors) == 0

        # Verify both children have same parent
        parent_id = temp_id_mapping["parent"]
        child1 = db_session.query(Indicator).filter(
            Indicator.id == temp_id_mapping["child-1"]
        ).first()
        child2 = db_session.query(Indicator).filter(
            Indicator.id == temp_id_mapping["child-2"]
        ).first()

        assert child1.parent_id == parent_id
        assert child2.parent_id == parent_id


class TestReordering:
    """Tests for indicator reordering."""

    def test_reorder_simple_update(self, db_session, test_governance_area, test_user):
        """Test basic reordering without circular references."""
        # Create test indicators first
        ind1 = Indicator(
            name="Indicator 1",
            governance_area_id=test_governance_area.id,
            is_active=True,
        )
        ind2 = Indicator(
            name="Indicator 2",
            governance_area_id=test_governance_area.id,
            is_active=True,
        )
        db_session.add_all([ind1, ind2])
        db_session.commit()
        db_session.refresh(ind1)
        db_session.refresh(ind2)

        # Reorder: make ind2 a child of ind1
        reorder_data = [
            {"id": ind1.id, "parent_id": None},
            {"id": ind2.id, "parent_id": ind1.id},
        ]

        updated = indicator_service.reorder_indicators(
            db=db_session,
            reorder_data=reorder_data,
            user_id=test_user.id,
        )

        assert len(updated) == 2

        # Verify the relationship
        db_session.refresh(ind2)
        assert ind2.parent_id == ind1.id

    def test_reorder_detect_circular_reference(self, db_session, test_governance_area, test_user):
        """Test that circular references are detected during reorder."""
        # Create test indicators
        ind1 = Indicator(
            name="Indicator 1",
            governance_area_id=test_governance_area.id,
            is_active=True,
        )
        ind2 = Indicator(
            name="Indicator 2",
            governance_area_id=test_governance_area.id,
            is_active=True,
        )
        db_session.add_all([ind1, ind2])
        db_session.commit()
        db_session.refresh(ind1)
        db_session.refresh(ind2)

        # Try to create circular reference: ind1 -> ind2 -> ind1
        reorder_data = [
            {"id": ind1.id, "parent_id": ind2.id},
            {"id": ind2.id, "parent_id": ind1.id},
        ]

        with pytest.raises(HTTPException) as exc_info:
            indicator_service.reorder_indicators(
                db=db_session,
                reorder_data=reorder_data,
                user_id=test_user.id,
            )

        assert exc_info.value.status_code == 500
        assert "Circular reference" in str(exc_info.value.detail)


class TestTreeValidation:
    """Tests for tree structure validation."""

    def test_validate_tree_with_circular_reference(self, db_session, test_governance_area):
        """Test validation catches circular references."""
        indicators_data = [
            {
                "temp_id": "a",
                "parent_temp_id": "b",
                "name": "Indicator A",
            },
            {
                "temp_id": "b",
                "parent_temp_id": "a",
                "name": "Indicator B",
            },
        ]

        errors = indicator_service.validate_tree_structure(
            db=db_session,
            governance_area_id=test_governance_area.id,
            indicators_data=indicators_data,
        )

        assert len(errors) > 0
        assert any("Circular" in err for err in errors)

    def test_validate_tree_valid_structure(self, db_session, test_governance_area):
        """Test validation passes for valid tree."""
        indicators_data = [
            {
                "temp_id": "parent",
                "parent_temp_id": None,
                "name": "Parent Indicator",
            },
            {
                "temp_id": "child",
                "parent_temp_id": "parent",
                "name": "Child Indicator",
            },
        ]

        errors = indicator_service.validate_tree_structure(
            db=db_session,
            governance_area_id=test_governance_area.id,
            indicators_data=indicators_data,
        )

        assert len(errors) == 0


# ============================================================================
# Tree Operations Tests (Phase 6: Story 2.2)
# ============================================================================


def test_get_indicator_tree_returns_hierarchical_structure(
    db_session, test_governance_area, test_user
):
    """Test get_indicator_tree returns properly nested tree structure."""
    # Create hierarchical indicators
    root = indicator_service.create_indicator(
        db=db_session,
        data={
            "name": "Root Indicator",
            "governance_area_id": test_governance_area.id,
            "sort_order": 0,
        },
        user_id=test_user.id,
    )

    child1 = indicator_service.create_indicator(
        db=db_session,
        data={
            "name": "Child 1",
            "governance_area_id": test_governance_area.id,
            "parent_id": root.id,
            "sort_order": 0,
        },
        user_id=test_user.id,
    )

    child2 = indicator_service.create_indicator(
        db=db_session,
        data={
            "name": "Child 2",
            "governance_area_id": test_governance_area.id,
            "parent_id": root.id,
            "sort_order": 1,
        },
        user_id=test_user.id,
    )

    grandchild = indicator_service.create_indicator(
        db=db_session,
        data={
            "name": "Grandchild",
            "governance_area_id": test_governance_area.id,
            "parent_id": child1.id,
            "sort_order": 0,
        },
        user_id=test_user.id,
    )

    # Get tree structure
    tree = indicator_service.get_indicator_tree(
        db=db_session,
        governance_area_id=test_governance_area.id,
    )

    # Verify structure
    assert len(tree) == 1  # One root node
    root_node = tree[0]
    assert root_node["id"] == root.id
    assert root_node["name"] == "Root Indicator"
    assert len(root_node["children"]) == 2  # Two children

    # Verify children are properly nested
    child1_node = root_node["children"][0]
    assert child1_node["id"] == child1.id
    assert len(child1_node["children"]) == 1  # One grandchild

    grandchild_node = child1_node["children"][0]
    assert grandchild_node["id"] == grandchild.id
    assert len(grandchild_node["children"]) == 0  # No children


def test_get_indicator_tree_includes_all_metadata(
    db_session, test_governance_area, test_user
):
    """Test get_indicator_tree includes all indicator metadata."""
    indicator = indicator_service.create_indicator(
        db=db_session,
        data={
            "name": "Test Indicator",
            "description": "Test description",
            "governance_area_id": test_governance_area.id,
            "is_auto_calculable": True,
            "is_profiling_only": False,
            "form_schema": {"type": "object", "properties": {}},
        },
        user_id=test_user.id,
    )

    tree = indicator_service.get_indicator_tree(
        db=db_session,
        governance_area_id=test_governance_area.id,
    )

    node = tree[0]
    assert node["id"] == indicator.id
    assert node["name"] == "Test Indicator"
    assert node["description"] == "Test description"
    assert node["is_auto_calculable"] is True
    assert node["is_profiling_only"] is False
    assert node["form_schema"] == {"type": "object", "properties": {}}
    assert node["version"] == 1


def test_get_indicator_tree_filters_by_governance_area(
    db_session, test_user
):
    """Test get_indicator_tree only returns indicators for specified governance area."""
    from app.db.enums import AreaType

    # Create two governance areas
    area1 = GovernanceArea(
        id=1,
        name="Area 1",
        area_type=AreaType.CORE
    )
    area2 = GovernanceArea(
        id=2,
        name="Area 2",
        area_type=AreaType.CORE
    )
    db_session.add(area1)
    db_session.add(area2)
    db_session.commit()

    # Create indicators in each area
    indicator_service.create_indicator(
        db=db_session,
        data={"name": "Area 1 Indicator", "governance_area_id": 1},
        user_id=test_user.id,
    )
    indicator_service.create_indicator(
        db=db_session,
        data={"name": "Area 2 Indicator", "governance_area_id": 2},
        user_id=test_user.id,
    )

    # Get tree for area 1
    tree1 = indicator_service.get_indicator_tree(db=db_session, governance_area_id=1)
    assert len(tree1) == 1
    assert tree1[0]["name"] == "Area 1 Indicator"

    # Get tree for area 2
    tree2 = indicator_service.get_indicator_tree(db=db_session, governance_area_id=2)
    assert len(tree2) == 1
    assert tree2[0]["name"] == "Area 2 Indicator"


def test_recalculate_codes_assigns_sequential_codes(
    db_session, test_governance_area, test_user
):
    """Test recalculate_codes assigns sequential codes based on sort_order."""
    # Create indicators
    root1 = indicator_service.create_indicator(
        db=db_session,
        data={
            "name": "Root 1",
            "governance_area_id": test_governance_area.id,
            "sort_order": 0,
        },
        user_id=test_user.id,
    )

    root2 = indicator_service.create_indicator(
        db=db_session,
        data={
            "name": "Root 2",
            "governance_area_id": test_governance_area.id,
            "sort_order": 1,
        },
        user_id=test_user.id,
    )

    child1_1 = indicator_service.create_indicator(
        db=db_session,
        data={
            "name": "Child 1.1",
            "governance_area_id": test_governance_area.id,
            "parent_id": root1.id,
            "sort_order": 0,
        },
        user_id=test_user.id,
    )

    child1_2 = indicator_service.create_indicator(
        db=db_session,
        data={
            "name": "Child 1.2",
            "governance_area_id": test_governance_area.id,
            "parent_id": root1.id,
            "sort_order": 1,
        },
        user_id=test_user.id,
    )

    # Recalculate codes
    updated = indicator_service.recalculate_codes(
        db=db_session,
        governance_area_id=test_governance_area.id,
        user_id=test_user.id,
    )

    # Refresh from DB
    db_session.refresh(root1)
    db_session.refresh(root2)
    db_session.refresh(child1_1)
    db_session.refresh(child1_2)

    # Verify codes
    assert root1.indicator_code == "1"
    assert root2.indicator_code == "2"
    assert child1_1.indicator_code == "1.1"
    assert child1_2.indicator_code == "1.2"


def test_recalculate_codes_handles_deep_nesting(
    db_session, test_governance_area, test_user
):
    """Test recalculate_codes handles deeply nested indicators."""
    # Create 4-level hierarchy
    level1 = indicator_service.create_indicator(
        db=db_session,
        data={
            "name": "Level 1",
            "governance_area_id": test_governance_area.id,
            "sort_order": 0,
        },
        user_id=test_user.id,
    )

    level2 = indicator_service.create_indicator(
        db=db_session,
        data={
            "name": "Level 2",
            "governance_area_id": test_governance_area.id,
            "parent_id": level1.id,
            "sort_order": 0,
        },
        user_id=test_user.id,
    )

    level3 = indicator_service.create_indicator(
        db=db_session,
        data={
            "name": "Level 3",
            "governance_area_id": test_governance_area.id,
            "parent_id": level2.id,
            "sort_order": 0,
        },
        user_id=test_user.id,
    )

    level4 = indicator_service.create_indicator(
        db=db_session,
        data={
            "name": "Level 4",
            "governance_area_id": test_governance_area.id,
            "parent_id": level3.id,
            "sort_order": 0,
        },
        user_id=test_user.id,
    )

    # Recalculate codes
    indicator_service.recalculate_codes(
        db=db_session,
        governance_area_id=test_governance_area.id,
        user_id=test_user.id,
    )

    # Refresh from DB
    db_session.refresh(level1)
    db_session.refresh(level2)
    db_session.refresh(level3)
    db_session.refresh(level4)

    # Verify codes
    assert level1.indicator_code == "1"
    assert level2.indicator_code == "1.1"
    assert level3.indicator_code == "1.1.1"
    assert level4.indicator_code == "1.1.1.1"


def test_recalculate_codes_respects_sort_order(
    db_session, test_governance_area, test_user
):
    """Test recalculate_codes respects sort_order for numbering."""
    # Create indicators with specific sort_order
    root = indicator_service.create_indicator(
        db=db_session,
        data={
            "name": "Root",
            "governance_area_id": test_governance_area.id,
            "sort_order": 0,
        },
        user_id=test_user.id,
    )

    # Create children in reverse order
    child_b = indicator_service.create_indicator(
        db=db_session,
        data={
            "name": "Child B",
            "governance_area_id": test_governance_area.id,
            "parent_id": root.id,
            "sort_order": 2,  # Higher sort_order
        },
        user_id=test_user.id,
    )

    child_a = indicator_service.create_indicator(
        db=db_session,
        data={
            "name": "Child A",
            "governance_area_id": test_governance_area.id,
            "parent_id": root.id,
            "sort_order": 0,  # Lower sort_order
        },
        user_id=test_user.id,
    )

    child_c = indicator_service.create_indicator(
        db=db_session,
        data={
            "name": "Child C",
            "governance_area_id": test_governance_area.id,
            "parent_id": root.id,
            "sort_order": 5,  # Even higher sort_order
        },
        user_id=test_user.id,
    )

    # Recalculate codes
    indicator_service.recalculate_codes(
        db=db_session,
        governance_area_id=test_governance_area.id,
        user_id=test_user.id,
    )

    # Refresh from DB
    db_session.refresh(child_a)
    db_session.refresh(child_b)
    db_session.refresh(child_c)

    # Verify codes are assigned based on sort_order, not creation order
    assert child_a.indicator_code == "1.1"  # sort_order: 0
    assert child_b.indicator_code == "1.2"  # sort_order: 2
    assert child_c.indicator_code == "1.3"  # sort_order: 5
