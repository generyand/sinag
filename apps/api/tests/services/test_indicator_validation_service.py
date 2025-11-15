"""
Tests for Indicator Validation Service

Tests tree structure validation, cycle detection, parent-child relationships,
indicator code format, sort order, schema completeness, and weight sum validation.
"""

import pytest
from app.services.indicator_validation_service import (
    indicator_validation_service,
    ValidationResult,
    SchemaValidationResult,
    WeightValidationResult,
)


class TestCircularReferenceDetection:
    """Test circular reference detection in indicator trees."""

    def test_no_circular_references(self):
        """Valid tree structure with no cycles."""
        indicators = [
            {"id": "1", "parent_id": None, "indicator_code": "1"},
            {"id": "2", "parent_id": "1", "indicator_code": "1.1"},
            {"id": "3", "parent_id": "1", "indicator_code": "1.2"},
            {"id": "4", "parent_id": "2", "indicator_code": "1.1.1"},
        ]

        errors = indicator_validation_service.check_circular_references(indicators)
        assert len(errors) == 0

    def test_simple_circular_reference(self):
        """Detect simple A -> B -> A cycle."""
        indicators = [
            {"id": "1", "parent_id": "2", "indicator_code": "1"},
            {"id": "2", "parent_id": "1", "indicator_code": "2"},
        ]

        errors = indicator_validation_service.check_circular_references(indicators)
        assert len(errors) == 1
        assert "Circular reference detected" in errors[0]
        assert "1" in errors[0] and "2" in errors[0]

    def test_three_node_cycle(self):
        """Detect A -> B -> C -> A cycle."""
        indicators = [
            {"id": "1", "parent_id": "3", "indicator_code": "1"},
            {"id": "2", "parent_id": "1", "indicator_code": "2"},
            {"id": "3", "parent_id": "2", "indicator_code": "3"},
        ]

        errors = indicator_validation_service.check_circular_references(indicators)
        assert len(errors) == 1
        assert "Circular reference detected" in errors[0]

    def test_self_referencing_indicator(self):
        """Detect indicator referencing itself."""
        indicators = [
            {"id": "1", "parent_id": "1", "indicator_code": "1"},
        ]

        errors = indicator_validation_service.check_circular_references(indicators)
        assert len(errors) == 1
        assert "Circular reference detected" in errors[0]

    def test_multiple_independent_cycles(self):
        """Detect multiple separate cycles in the tree."""
        indicators = [
            # Cycle 1: A -> B -> A
            {"id": "1", "parent_id": "2", "indicator_code": "1"},
            {"id": "2", "parent_id": "1", "indicator_code": "2"},
            # Cycle 2: C -> D -> C
            {"id": "3", "parent_id": "4", "indicator_code": "3"},
            {"id": "4", "parent_id": "3", "indicator_code": "4"},
        ]

        errors = indicator_validation_service.check_circular_references(indicators)
        # Should detect both cycles
        assert len(errors) == 2


class TestParentChildRelationships:
    """Test parent-child relationship validation."""

    def test_valid_relationships(self):
        """All parent_ids reference existing indicators."""
        indicators = [
            {"id": "1", "parent_id": None, "indicator_code": "1"},
            {"id": "2", "parent_id": "1", "indicator_code": "1.1"},
            {"id": "3", "parent_id": "1", "indicator_code": "1.2"},
        ]

        errors = indicator_validation_service.validate_parent_child_relationships(indicators)
        assert len(errors) == 0

    def test_non_existent_parent(self):
        """Detect reference to non-existent parent."""
        indicators = [
            {"id": "1", "parent_id": None, "indicator_code": "1"},
            {"id": "2", "parent_id": "999", "indicator_code": "1.1"},
        ]

        errors = indicator_validation_service.validate_parent_child_relationships(indicators)
        assert len(errors) == 1
        assert "non-existent parent ID: 999" in errors[0]
        assert "1.1" in errors[0]

    def test_multiple_invalid_parents(self):
        """Detect multiple invalid parent references."""
        indicators = [
            {"id": "1", "parent_id": None, "indicator_code": "1"},
            {"id": "2", "parent_id": "999", "indicator_code": "1.1"},
            {"id": "3", "parent_id": "888", "indicator_code": "1.2"},
        ]

        errors = indicator_validation_service.validate_parent_child_relationships(indicators)
        assert len(errors) == 2


class TestIndicatorCodeFormat:
    """Test indicator code format validation."""

    def test_valid_code_formats(self):
        """Valid indicator codes pass validation."""
        indicators = [
            {"id": "1", "indicator_code": "1"},
            {"id": "2", "indicator_code": "1.1"},
            {"id": "3", "indicator_code": "1.1.1"},
            {"id": "4", "indicator_code": "2.3.4.5"},
        ]

        errors, warnings = indicator_validation_service.validate_indicator_codes(indicators)
        assert len(errors) == 0
        assert len(warnings) == 0

    def test_invalid_code_formats(self):
        """Invalid indicator codes fail validation."""
        indicators = [
            {"id": "1", "indicator_code": "1."},  # Trailing dot
            {"id": "2", "indicator_code": "A.1"},  # Letter instead of number
            {"id": "3", "indicator_code": "1.a"},  # Letter in second position
            {"id": "4", "indicator_code": ""},     # Empty code (should be warning)
        ]

        errors, warnings = indicator_validation_service.validate_indicator_codes(indicators)
        assert len(errors) == 3  # Three format errors
        assert len(warnings) == 1  # One missing code warning

    def test_duplicate_codes(self):
        """Duplicate indicator codes fail validation."""
        indicators = [
            {"id": "1", "indicator_code": "1.1"},
            {"id": "2", "indicator_code": "1.1"},  # Duplicate
            {"id": "3", "indicator_code": "1.2"},
        ]

        errors, warnings = indicator_validation_service.validate_indicator_codes(indicators)
        assert len(errors) == 1
        assert "Duplicate indicator code: 1.1" in errors[0]

    def test_missing_code_warning(self):
        """Missing indicator codes generate warnings."""
        indicators = [
            {"id": "1", "indicator_code": "1"},
            {"id": "2"},  # No indicator_code field
            {"id": "3", "indicator_code": None},  # Explicit None
        ]

        errors, warnings = indicator_validation_service.validate_indicator_codes(indicators)
        assert len(errors) == 0
        assert len(warnings) == 2


class TestSortOrderValidation:
    """Test sort order validation for sibling groups."""

    def test_valid_sort_order(self):
        """Sequential sort order starting from 0."""
        indicators = [
            {"id": "1", "parent_id": None, "indicator_code": "1", "sort_order": 0},
            {"id": "2", "parent_id": None, "indicator_code": "2", "sort_order": 1},
            {"id": "3", "parent_id": "1", "indicator_code": "1.1", "sort_order": 0},
            {"id": "4", "parent_id": "1", "indicator_code": "1.2", "sort_order": 1},
        ]

        errors = indicator_validation_service.validate_sort_order(indicators)
        assert len(errors) == 0

    def test_invalid_sort_order_gap(self):
        """Detect gaps in sort order."""
        indicators = [
            {"id": "1", "parent_id": None, "indicator_code": "1", "sort_order": 0},
            {"id": "2", "parent_id": None, "indicator_code": "2", "sort_order": 2},  # Gap!
        ]

        errors = indicator_validation_service.validate_sort_order(indicators)
        assert len(errors) == 1
        assert "expected 1" in errors[0]
        assert "2" in errors[0]  # Code "2"

    def test_invalid_sort_order_not_starting_at_zero(self):
        """Detect sort order not starting at 0."""
        indicators = [
            {"id": "1", "parent_id": None, "indicator_code": "1", "sort_order": 1},
            {"id": "2", "parent_id": None, "indicator_code": "2", "sort_order": 2},
        ]

        errors = indicator_validation_service.validate_sort_order(indicators)
        assert len(errors) == 2  # Both have wrong order

    def test_multiple_sibling_groups(self):
        """Validate sort order across multiple parent groups."""
        indicators = [
            # Root level: OK
            {"id": "1", "parent_id": None, "indicator_code": "1", "sort_order": 0},
            {"id": "2", "parent_id": None, "indicator_code": "2", "sort_order": 1},
            # Children of 1: OK
            {"id": "3", "parent_id": "1", "indicator_code": "1.1", "sort_order": 0},
            {"id": "4", "parent_id": "1", "indicator_code": "1.2", "sort_order": 1},
            # Children of 2: BAD (gap)
            {"id": "5", "parent_id": "2", "indicator_code": "2.1", "sort_order": 0},
            {"id": "6", "parent_id": "2", "indicator_code": "2.2", "sort_order": 2},  # Gap!
        ]

        errors = indicator_validation_service.validate_sort_order(indicators)
        assert len(errors) == 1
        assert "2.2" in errors[0]


class TestTreeStructureValidation:
    """Test comprehensive tree structure validation."""

    def test_valid_tree_structure(self):
        """Complete valid tree passes all validations."""
        indicators = [
            {"id": "1", "parent_id": None, "indicator_code": "1", "sort_order": 0},
            {"id": "2", "parent_id": None, "indicator_code": "2", "sort_order": 1},
            {"id": "3", "parent_id": "1", "indicator_code": "1.1", "sort_order": 0},
            {"id": "4", "parent_id": "1", "indicator_code": "1.2", "sort_order": 1},
        ]

        result = indicator_validation_service.validate_tree_structure(indicators)
        assert result.is_valid is True
        assert len(result.errors) == 0
        assert len(result.warnings) == 0

    def test_multiple_errors(self):
        """Tree with multiple errors detected."""
        indicators = [
            {"id": "1", "parent_id": "2", "indicator_code": "1.", "sort_order": 1},  # Circular, bad code, bad sort
            {"id": "2", "parent_id": "1", "indicator_code": "2", "sort_order": 0},
            {"id": "3", "parent_id": "999", "indicator_code": "3", "sort_order": 0},  # Bad parent
        ]

        result = indicator_validation_service.validate_tree_structure(indicators)
        assert result.is_valid is False
        assert len(result.errors) > 0  # Should have multiple errors


class TestSchemaValidation:
    """Test schema completeness validation."""

    def test_valid_form_schema(self):
        """Valid form schema passes validation."""
        indicator = {
            "form_schema": {
                "fields": [
                    {"field_id": "field1", "label": "Field 1", "field_type": "text"},
                    {"field_id": "field2", "label": "Field 2", "field_type": "number"},
                ]
            }
        }

        errors = indicator_validation_service.validate_form_schema(indicator.get("form_schema"))
        assert len(errors) == 0

    def test_missing_field_labels(self):
        """Detect missing field labels."""
        indicator = {
            "form_schema": {
                "fields": [
                    {"field_id": "field1", "field_type": "text"},  # Missing label
                    {"field_id": "field2", "label": "Field 2", "field_type": "number"},
                ]
            }
        }

        errors = indicator_validation_service.validate_form_schema(indicator.get("form_schema"))
        assert len(errors) == 1
        assert "field1" in errors[0]
        assert "missing label" in errors[0]

    def test_file_upload_missing_allowed_types(self):
        """Detect file upload fields missing allowed_file_types."""
        indicator = {
            "form_schema": {
                "fields": [
                    {"field_id": "upload1", "label": "Upload", "field_type": "file_upload"},
                ]
            }
        }

        errors = indicator_validation_service.validate_form_schema(indicator.get("form_schema"))
        assert len(errors) == 1
        assert "upload1" in errors[0]
        assert "allowed_file_types" in errors[0]

    def test_valid_mov_checklist(self):
        """Valid MOV checklist passes validation."""
        indicator = {
            "mov_checklist_items": {
                "items": [
                    {"id": "item1", "label": "Item 1", "type": "checkbox"},
                    {"id": "group1", "label": "Group 1", "type": "group", "children": [
                        {"id": "child1", "label": "Child 1", "type": "checkbox"}
                    ]},
                ]
            }
        }

        errors = indicator_validation_service.validate_mov_checklist(
            indicator.get("mov_checklist_items")
        )
        assert len(errors) == 0

    def test_mov_group_without_children(self):
        """Detect MOV group without children."""
        indicator = {
            "mov_checklist_items": {
                "items": [
                    {"id": "group1", "label": "Group 1", "type": "group", "children": []},
                ]
            }
        }

        errors = indicator_validation_service.validate_mov_checklist(
            indicator.get("mov_checklist_items")
        )
        assert len(errors) == 1
        assert "group1" in errors[0]
        assert "no children" in errors[0]

    def test_calculation_schema_invalid_field_reference(self):
        """Detect calculation rules referencing non-existent fields."""
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
                            {"field_id": "field1"},  # OK
                            {"field_id": "field999"},  # Does not exist
                        ]
                    }
                ]
            }
        }

        errors = indicator_validation_service.validate_calculation_schema(
            indicator.get("calculation_schema"),
            indicator.get("form_schema")
        )
        assert len(errors) == 1
        assert "field999" in errors[0]

    def test_remark_schema_invalid_variable(self):
        """Detect remark templates with invalid variables."""
        indicator = {
            "form_schema": {
                "fields": [
                    {"field_id": "field1", "label": "Field 1", "field_type": "text"},
                ]
            },
            "remark_schema": {
                "conditional_remarks": [
                    {"template": "Score: {{ score }}, Field: {{ form.field1 }}"},  # OK
                    {"template": "Invalid: {{ unknown_var }}"},  # Invalid
                ]
            }
        }

        errors = indicator_validation_service.validate_remark_schema(
            indicator.get("remark_schema"),
            indicator.get("form_schema")
        )
        assert len(errors) == 1
        assert "unknown_var" in errors[0]

    def test_complete_schema_validation(self):
        """Test complete schema validation result."""
        indicator = {
            "form_schema": {
                "fields": [
                    {"field_id": "field1", "label": "Field 1", "field_type": "text"},
                ]
            },
            "mov_checklist_items": {
                "items": [
                    {"id": "item1", "label": "Item 1", "type": "checkbox"},
                ]
            },
            "calculation_schema": {
                "condition_groups": [
                    {"rules": [{"field_id": "field1"}]}
                ]
            },
            "remark_schema": {
                "conditional_remarks": [
                    {"template": "Score: {{ score }}"}
                ]
            }
        }

        result = indicator_validation_service.validate_schemas(indicator)
        assert result.is_valid is True
        assert len(result.errors) == 0


class TestWeightValidation:
    """Test weight sum validation for sibling groups."""

    def test_valid_weights_sum_to_100(self):
        """Weights exactly sum to 100%."""
        indicators = [
            {"id": "1", "parent_id": None, "indicator_code": "1", "weight": 60},
            {"id": "2", "parent_id": None, "indicator_code": "2", "weight": 40},
        ]

        result = indicator_validation_service.validate_weights(indicators)
        assert result.is_valid is True
        assert len(result.errors) == 0

    def test_valid_weights_with_tolerance(self):
        """Weights within tolerance (99.9-100.1) pass."""
        indicators = [
            {"id": "1", "parent_id": None, "indicator_code": "1", "weight": 33.33},
            {"id": "2", "parent_id": None, "indicator_code": "2", "weight": 33.33},
            {"id": "3", "parent_id": None, "indicator_code": "3", "weight": 33.34},
        ]

        result = indicator_validation_service.validate_weights(indicators)
        assert result.is_valid is True

    def test_invalid_weights_too_low(self):
        """Weights sum to less than 99.9%."""
        indicators = [
            {"id": "1", "parent_id": None, "indicator_code": "1", "weight": 50},
            {"id": "2", "parent_id": None, "indicator_code": "2", "weight": 40},
        ]

        result = indicator_validation_service.validate_weights(indicators)
        assert result.is_valid is False
        assert len(result.errors) == 1
        assert "90%" in list(result.errors.values())[0]

    def test_invalid_weights_too_high(self):
        """Weights sum to more than 100.1%."""
        indicators = [
            {"id": "1", "parent_id": None, "indicator_code": "1", "weight": 60},
            {"id": "2", "parent_id": None, "indicator_code": "2", "weight": 50},
        ]

        result = indicator_validation_service.validate_weights(indicators)
        assert result.is_valid is False
        assert "110%" in list(result.errors.values())[0]

    def test_multiple_parent_groups_mixed_validity(self):
        """Some parent groups valid, others invalid."""
        indicators = [
            # Root level: Valid (100%)
            {"id": "1", "parent_id": None, "indicator_code": "1", "weight": 70},
            {"id": "2", "parent_id": None, "indicator_code": "2", "weight": 30},
            # Children of 1: Invalid (90%)
            {"id": "3", "parent_id": "1", "indicator_code": "1.1", "weight": 50},
            {"id": "4", "parent_id": "1", "indicator_code": "1.2", "weight": 40},
        ]

        result = indicator_validation_service.validate_weights(indicators)
        assert result.is_valid is False
        assert len(result.errors) == 1
        assert "1" in result.errors  # parent_id "1" has errors
