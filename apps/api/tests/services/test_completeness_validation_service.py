"""
Tests for Completeness Validation Service

Tests the completeness validation service's ability to check if all required
fields in a form schema have been filled out by BLGU users.

Covers:
- Required field detection
- Different field types (text, number, checkbox, radio, file upload)
- Conditional MOV requirements for file uploads
- Missing field reporting with detailed reasons
- Completion percentage calculation
"""

from app.services.completeness_validation_service import (
    completeness_validation_service,
)


class TestCompletenessValidationService:
    """Test suite for CompletenessValidationService"""

    def test_all_required_fields_filled(self):
        """Test validation when all required fields are filled"""
        form_schema = {
            "fields": [
                {
                    "field_id": "project_name",
                    "field_type": "text_input",
                    "label": "Project Name",
                    "required": True,
                },
                {
                    "field_id": "project_type",
                    "field_type": "radio_button",
                    "label": "Project Type",
                    "required": True,
                    "options": [
                        {"label": "Type A", "value": "type_a"},
                        {"label": "Type B", "value": "type_b"},
                    ],
                },
            ]
        }

        response_data = {
            "project_name": "Community Health Initiative",
            "project_type": "type_a",
        }

        result = completeness_validation_service.validate_completeness(form_schema, response_data)

        assert result["is_complete"] is True
        assert len(result["missing_fields"]) == 0
        assert result["required_field_count"] == 2
        assert result["filled_field_count"] == 2

    def test_missing_required_text_field(self):
        """Test validation when required text field is missing"""
        form_schema = {
            "fields": [
                {
                    "field_id": "project_name",
                    "field_type": "text_input",
                    "label": "Project Name",
                    "required": True,
                },
                {
                    "field_id": "description",
                    "field_type": "text_area",
                    "label": "Description",
                    "required": False,
                },
            ]
        }

        response_data = {
            "description": "Optional description"
            # project_name is missing
        }

        result = completeness_validation_service.validate_completeness(form_schema, response_data)

        assert result["is_complete"] is False
        assert len(result["missing_fields"]) == 1
        assert result["missing_fields"][0]["field_id"] == "project_name"
        assert result["missing_fields"][0]["label"] == "Project Name"
        assert result["required_field_count"] == 1
        assert result["filled_field_count"] == 0

    def test_empty_string_considered_missing(self):
        """Test that empty string is considered missing"""
        form_schema = {
            "fields": [
                {
                    "field_id": "project_name",
                    "field_type": "text_input",
                    "label": "Project Name",
                    "required": True,
                }
            ]
        }

        response_data = {
            "project_name": ""  # Empty string
        }

        result = completeness_validation_service.validate_completeness(form_schema, response_data)

        assert result["is_complete"] is False
        assert len(result["missing_fields"]) == 1

    def test_whitespace_only_considered_missing(self):
        """Test that whitespace-only string is considered missing"""
        form_schema = {
            "fields": [
                {
                    "field_id": "project_name",
                    "field_type": "text_input",
                    "label": "Project Name",
                    "required": True,
                }
            ]
        }

        response_data = {
            "project_name": "   "  # Whitespace only
        }

        result = completeness_validation_service.validate_completeness(form_schema, response_data)

        assert result["is_complete"] is False
        assert len(result["missing_fields"]) == 1

    def test_zero_value_considered_filled(self):
        """Test that zero value for number field is considered filled"""
        form_schema = {
            "fields": [
                {
                    "field_id": "completion_rate",
                    "field_type": "number_input",
                    "label": "Completion Rate",
                    "required": True,
                }
            ]
        }

        response_data = {
            "completion_rate": 0  # Zero is valid
        }

        result = completeness_validation_service.validate_completeness(form_schema, response_data)

        assert result["is_complete"] is True
        assert len(result["missing_fields"]) == 0

    def test_false_boolean_considered_filled(self):
        """Test that False boolean value is considered filled"""
        form_schema = {
            "fields": [
                {
                    "field_id": "is_approved",
                    "field_type": "checkbox_group",
                    "label": "Is Approved",
                    "required": True,
                    "options": [{"label": "Yes", "value": "yes"}],
                }
            ]
        }

        response_data = {
            "is_approved": False  # False is valid
        }

        result = completeness_validation_service.validate_completeness(form_schema, response_data)

        assert result["is_complete"] is True

    def test_empty_list_considered_missing(self):
        """Test that empty list for checkbox group is considered missing"""
        form_schema = {
            "fields": [
                {
                    "field_id": "selected_options",
                    "field_type": "checkbox_group",
                    "label": "Selected Options",
                    "required": True,
                    "options": [
                        {"label": "Option 1", "value": "opt1"},
                        {"label": "Option 2", "value": "opt2"},
                    ],
                }
            ]
        }

        response_data = {
            "selected_options": []  # Empty list
        }

        result = completeness_validation_service.validate_completeness(form_schema, response_data)

        assert result["is_complete"] is False
        assert len(result["missing_fields"]) == 1

    def test_non_empty_list_considered_filled(self):
        """Test that non-empty list for checkbox group is considered filled"""
        form_schema = {
            "fields": [
                {
                    "field_id": "selected_options",
                    "field_type": "checkbox_group",
                    "label": "Selected Options",
                    "required": True,
                    "options": [
                        {"label": "Option 1", "value": "opt1"},
                        {"label": "Option 2", "value": "opt2"},
                    ],
                }
            ]
        }

        response_data = {"selected_options": ["opt1"]}

        result = completeness_validation_service.validate_completeness(form_schema, response_data)

        assert result["is_complete"] is True

    def test_file_upload_with_movs(self):
        """Test file upload field with uploaded MOVs"""
        form_schema = {
            "fields": [
                {
                    "field_id": "document_upload",
                    "field_type": "file_upload",
                    "label": "Upload Document",
                    "required": True,
                }
            ]
        }

        response_data = {}
        uploaded_movs = [{"id": 1, "filename": "document.pdf"}]

        result = completeness_validation_service.validate_completeness(
            form_schema, response_data, uploaded_movs
        )

        assert result["is_complete"] is True

    def test_file_upload_without_movs(self):
        """Test required file upload field without MOVs"""
        form_schema = {
            "fields": [
                {
                    "field_id": "document_upload",
                    "field_type": "file_upload",
                    "label": "Upload Document",
                    "required": True,
                }
            ]
        }

        response_data = {}
        uploaded_movs = []

        result = completeness_validation_service.validate_completeness(
            form_schema, response_data, uploaded_movs
        )

        assert result["is_complete"] is False
        assert len(result["missing_fields"]) == 1
        assert "file upload" in result["missing_fields"][0]["reason"].lower()

    def test_conditional_mov_requirement_triggered(self):
        """Test conditional MOV requirement when condition is met"""
        form_schema = {
            "fields": [
                {
                    "field_id": "has_documents",
                    "field_type": "radio_button",
                    "label": "Do you have documents?",
                    "required": True,
                    "options": [
                        {"label": "Yes", "value": "yes"},
                        {"label": "No", "value": "no"},
                    ],
                },
                {
                    "field_id": "document_upload",
                    "field_type": "file_upload",
                    "label": "Upload Documents",
                    "required": False,
                    "conditional_mov_requirement": {
                        "field_id": "has_documents",
                        "operator": "equals",
                        "value": "yes",
                    },
                },
            ]
        }

        response_data = {"has_documents": "yes"}
        uploaded_movs = []

        result = completeness_validation_service.validate_completeness(
            form_schema, response_data, uploaded_movs
        )

        # Should be incomplete because conditional MOV is required but not uploaded
        assert result["is_complete"] is False
        assert len(result["missing_fields"]) == 1
        assert result["missing_fields"][0]["field_id"] == "document_upload"

    def test_conditional_mov_requirement_not_triggered(self):
        """Test conditional MOV requirement when condition is not met"""
        form_schema = {
            "fields": [
                {
                    "field_id": "has_documents",
                    "field_type": "radio_button",
                    "label": "Do you have documents?",
                    "required": True,
                    "options": [
                        {"label": "Yes", "value": "yes"},
                        {"label": "No", "value": "no"},
                    ],
                },
                {
                    "field_id": "document_upload",
                    "field_type": "file_upload",
                    "label": "Upload Documents",
                    "required": False,
                    "conditional_mov_requirement": {
                        "field_id": "has_documents",
                        "operator": "equals",
                        "value": "yes",
                    },
                },
            ]
        }

        response_data = {"has_documents": "no"}
        uploaded_movs = []

        result = completeness_validation_service.validate_completeness(
            form_schema, response_data, uploaded_movs
        )

        # Should be complete because conditional MOV is not required
        assert result["is_complete"] is True

    def test_multiple_missing_fields(self):
        """Test with multiple missing required fields"""
        form_schema = {
            "fields": [
                {
                    "field_id": "field1",
                    "field_type": "text_input",
                    "label": "Field 1",
                    "required": True,
                },
                {
                    "field_id": "field2",
                    "field_type": "text_input",
                    "label": "Field 2",
                    "required": True,
                },
                {
                    "field_id": "field3",
                    "field_type": "text_input",
                    "label": "Field 3",
                    "required": True,
                },
            ]
        }

        response_data = {"field2": "Value 2"}

        result = completeness_validation_service.validate_completeness(form_schema, response_data)

        assert result["is_complete"] is False
        assert len(result["missing_fields"]) == 2
        assert result["required_field_count"] == 3
        assert result["filled_field_count"] == 1

        missing_field_ids = [f["field_id"] for f in result["missing_fields"]]
        assert "field1" in missing_field_ids
        assert "field3" in missing_field_ids

    def test_get_completion_percentage_full(self):
        """Test completion percentage when all fields filled"""
        form_schema = {
            "fields": [
                {
                    "field_id": "field1",
                    "field_type": "text_input",
                    "label": "Field 1",
                    "required": True,
                },
                {
                    "field_id": "field2",
                    "field_type": "text_input",
                    "label": "Field 2",
                    "required": True,
                },
            ]
        }

        response_data = {"field1": "Value 1", "field2": "Value 2"}

        percentage = completeness_validation_service.get_completion_percentage(
            form_schema, response_data
        )

        assert percentage == 100.0

    def test_get_completion_percentage_partial(self):
        """Test completion percentage with partial completion"""
        form_schema = {
            "fields": [
                {
                    "field_id": "field1",
                    "field_type": "text_input",
                    "label": "Field 1",
                    "required": True,
                },
                {
                    "field_id": "field2",
                    "field_type": "text_input",
                    "label": "Field 2",
                    "required": True,
                },
                {
                    "field_id": "field3",
                    "field_type": "text_input",
                    "label": "Field 3",
                    "required": True,
                },
                {
                    "field_id": "field4",
                    "field_type": "text_input",
                    "label": "Field 4",
                    "required": True,
                },
            ]
        }

        response_data = {"field1": "Value 1", "field2": "Value 2"}

        percentage = completeness_validation_service.get_completion_percentage(
            form_schema, response_data
        )

        assert percentage == 50.0

    def test_get_missing_field_labels(self):
        """Test getting list of missing field labels"""
        form_schema = {
            "fields": [
                {
                    "field_id": "field1",
                    "field_type": "text_input",
                    "label": "Project Name",
                    "required": True,
                },
                {
                    "field_id": "field2",
                    "field_type": "text_input",
                    "label": "Project Description",
                    "required": True,
                },
            ]
        }

        response_data = {}

        labels = completeness_validation_service.get_missing_field_labels(
            form_schema, response_data
        )

        assert len(labels) == 2
        assert "Project Name" in labels
        assert "Project Description" in labels

    def test_no_required_fields(self):
        """Test form with no required fields"""
        form_schema = {
            "fields": [
                {
                    "field_id": "field1",
                    "field_type": "text_input",
                    "label": "Optional Field",
                    "required": False,
                }
            ]
        }

        response_data = {}

        result = completeness_validation_service.validate_completeness(form_schema, response_data)

        assert result["is_complete"] is True
        assert result["required_field_count"] == 0

    def test_null_form_schema(self):
        """Test with null form schema"""
        result = completeness_validation_service.validate_completeness(None, {"field": "value"})

        assert result["is_complete"] is True
        assert result["required_field_count"] == 0

    def test_null_response_data(self):
        """Test with null response data"""
        form_schema = {
            "fields": [
                {
                    "field_id": "field1",
                    "field_type": "text_input",
                    "label": "Required Field",
                    "required": True,
                }
            ]
        }

        result = completeness_validation_service.validate_completeness(form_schema, None)

        assert result["is_complete"] is False
        assert len(result["missing_fields"]) == 1
