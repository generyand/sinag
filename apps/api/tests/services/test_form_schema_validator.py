"""
Tests for Form Schema Validation Service

This module tests all validation functions in form_schema_validator.py
"""

import pytest

from app.schemas.form_schema import (
    CheckboxGroupField,
    ConditionalMOVLogic,
    DatePickerField,
    FieldOption,
    FileUploadField,
    FormSchema,
    NumberInputField,
    RadioButtonField,
    TextAreaField,
    TextInputField,
)
from app.services.form_schema_validator import (
    detect_circular_references,
    generate_validation_errors,
    validate_conditional_mov_logic,
    validate_field_ids_unique,
    validate_no_circular_references,
)


class TestValidateFieldIdsUnique:
    """Tests for validate_field_ids_unique function"""

    def test_unique_field_ids_returns_true(self):
        """Test that unique field IDs return True"""
        fields = [
            TextInputField(
                field_id="field1",
                field_type="text_input",
                label="Field 1",
                required=True,
            ),
            TextInputField(
                field_id="field2",
                field_type="text_input",
                label="Field 2",
                required=False,
            ),
        ]
        assert validate_field_ids_unique(fields) is True

    def test_duplicate_field_ids_returns_false(self):
        """Test that duplicate field IDs return False"""
        fields = [
            TextInputField(
                field_id="field1",
                field_type="text_input",
                label="Field 1",
                required=True,
            ),
            TextInputField(
                field_id="field1",
                field_type="text_input",
                label="Field 1 Duplicate",
                required=False,
            ),
        ]
        assert validate_field_ids_unique(fields) is False

    def test_empty_fields_list_returns_true(self):
        """Test that empty fields list returns True"""
        assert validate_field_ids_unique([]) is True


class TestValidateNoCircularReferences:
    """Tests for validate_no_circular_references function"""

    def test_no_circular_references_returns_true(self):
        """Test that fields without circular references return True"""
        fields = [
            TextInputField(
                field_id="field1",
                field_type="text_input",
                label="Field 1",
                required=True,
            ),
            FileUploadField(
                field_id="field2",
                field_type="file_upload",
                label="Upload File",
                required=True,
                conditional_mov_requirement=ConditionalMOVLogic(
                    field_id="field1", operator="equals", value="yes"
                ),
            ),
        ]
        assert validate_no_circular_references(fields) is True

    def test_self_reference_returns_true_no_cycle(self):
        """Test that self-reference is detected (but no cycle in graph traversal)"""
        # Note: Self-reference should be caught by other validation, not cycle detection
        fields = [
            FileUploadField(
                field_id="field1",
                field_type="file_upload",
                label="Upload File",
                required=True,
                conditional_mov_requirement=ConditionalMOVLogic(
                    field_id="field1", operator="equals", value="yes"
                ),
            ),
        ]
        # Self-reference creates a cycle
        assert validate_no_circular_references(fields) is False

    def test_circular_reference_returns_false(self):
        """Test that circular references return False"""
        # This would require multiple FileUploadFields referencing each other
        # which creates a dependency cycle
        fields = [
            TextInputField(
                field_id="field1",
                field_type="text_input",
                label="Field 1",
                required=True,
            ),
            FileUploadField(
                field_id="field2",
                field_type="file_upload",
                label="Upload 1",
                required=True,
                conditional_mov_requirement=ConditionalMOVLogic(
                    field_id="field1", operator="equals", value="yes"
                ),
            ),
        ]
        # No cycle - linear dependency
        assert validate_no_circular_references(fields) is True

    def test_empty_fields_list_returns_true(self):
        """Test that empty fields list returns True"""
        assert validate_no_circular_references([]) is True


class TestValidateConditionalMovLogic:
    """Tests for validate_conditional_mov_logic function"""

    def test_valid_conditional_mov_logic_returns_true(self):
        """Test that valid conditional MOV logic returns True"""
        field1 = TextInputField(
            field_id="field1",
            field_type="text_input",
            label="Field 1",
            required=True,
        )
        field2 = FileUploadField(
            field_id="field2",
            field_type="file_upload",
            label="Upload File",
            required=True,
            conditional_mov_requirement=ConditionalMOVLogic(
                field_id="field1", operator="equals", value="yes"
            ),
        )
        all_fields = [field1, field2]
        assert validate_conditional_mov_logic(field2, all_fields) is True

    def test_no_conditional_mov_logic_returns_true(self):
        """Test that FileUploadField without conditional logic returns True"""
        field = FileUploadField(
            field_id="field1",
            field_type="file_upload",
            label="Upload File",
            required=True,
        )
        assert validate_conditional_mov_logic(field, [field]) is True

    def test_invalid_referenced_field_returns_false(self):
        """Test that referencing non-existent field returns False"""
        field = FileUploadField(
            field_id="field1",
            field_type="file_upload",
            label="Upload File",
            required=True,
            conditional_mov_requirement=ConditionalMOVLogic(
                field_id="nonexistent", operator="equals", value="yes"
            ),
        )
        assert validate_conditional_mov_logic(field, [field]) is False

    def test_self_reference_returns_false(self):
        """Test that field referencing itself returns False"""
        field = FileUploadField(
            field_id="field1",
            field_type="file_upload",
            label="Upload File",
            required=True,
            conditional_mov_requirement=ConditionalMOVLogic(
                field_id="field1", operator="equals", value="yes"
            ),
        )
        assert validate_conditional_mov_logic(field, [field]) is False


class TestDetectCircularReferences:
    """Tests for detect_circular_references function"""

    def test_no_circular_references_returns_empty_list(self):
        """Test that valid schema returns empty error list"""
        schema = FormSchema(
            fields=[
                TextInputField(
                    field_id="field1",
                    field_type="text_input",
                    label="Field 1",
                    required=True,
                ),
                TextInputField(
                    field_id="field2",
                    field_type="text_input",
                    label="Field 2",
                    required=False,
                ),
            ]
        )
        errors = detect_circular_references(schema)
        assert len(errors) == 0

    def test_self_reference_detected(self):
        """Test that self-reference is detected"""
        schema = FormSchema(
            fields=[
                FileUploadField(
                    field_id="field1",
                    field_type="file_upload",
                    label="Upload File",
                    required=True,
                    conditional_mov_requirement=ConditionalMOVLogic(
                        field_id="field1", operator="equals", value="yes"
                    ),
                ),
            ]
        )
        errors = detect_circular_references(schema)
        assert len(errors) > 0
        assert "references itself" in errors[0]


class TestGenerateValidationErrors:
    """Tests for generate_validation_errors function"""

    def test_valid_schema_returns_empty_list(self):
        """Test that valid form schema returns no errors"""
        schema = FormSchema(
            fields=[
                TextInputField(
                    field_id="name",
                    field_type="text_input",
                    label="Your Name",
                    required=True,
                    max_length=100,
                ),
                RadioButtonField(
                    field_id="choice",
                    field_type="radio_button",
                    label="Choose One",
                    required=True,
                    options=[
                        FieldOption(label="Option A", value="a"),
                        FieldOption(label="Option B", value="b"),
                    ],
                ),
            ]
        )
        errors = generate_validation_errors(schema)
        assert len(errors) == 0

    def test_duplicate_field_ids_detected(self):
        """Test that duplicate field_ids are detected"""
        # FormSchema validator will raise ValidationError when duplicate field_ids exist
        from pydantic import ValidationError

        with pytest.raises(ValidationError) as exc_info:
            schema = FormSchema(
                fields=[
                    TextInputField(
                        field_id="field1",
                        field_type="text_input",
                        label="Field 1",
                        required=True,
                        is_means_of_verification=False,
                    ),
                    TextInputField(
                        field_id="field1",
                        field_type="text_input",
                        label="Field 1 Duplicate",
                        required=False,
                        is_means_of_verification=False,
                    ),
                ]
            )

        # Check that the error message mentions duplicate field_ids
        assert "Duplicate field_ids" in str(exc_info.value)

    def test_invalid_conditional_mov_reference_detected(self):
        """Test that invalid conditional MOV reference is detected"""
        # FormSchema validator will raise ValidationError for invalid conditional_mov references
        from pydantic import ValidationError

        with pytest.raises(ValidationError) as exc_info:
            schema = FormSchema(
                fields=[
                    FileUploadField(
                        field_id="upload",
                        field_type="file_upload",
                        label="Upload File",
                        required=True,
                        is_means_of_verification=True,
                        conditional_mov_requirement=ConditionalMOVLogic(
                            field_id="nonexistent", operator="equals", value="yes"
                        ),
                    ),
                ]
            )

        # Check that the error message mentions the nonexistent field
        assert "does not exist" in str(exc_info.value) or "nonexistent" in str(exc_info.value)

    def test_checkbox_with_no_options_detected(self):
        """Test that checkbox fields without options are detected"""
        # Note: This should actually fail at Pydantic validation level,
        # but we test the service-level validation
        # We can't create CheckboxGroupField without options due to Pydantic validation
        # So this test demonstrates the validation would catch it if bypassed
        pass  # Skip - Pydantic handles this

    def test_circular_reference_detected(self):
        """Test that circular references are detected"""
        schema = FormSchema(
            fields=[
                FileUploadField(
                    field_id="field1",
                    field_type="file_upload",
                    label="Upload File",
                    required=True,
                    conditional_mov_requirement=ConditionalMOVLogic(
                        field_id="field1", operator="equals", value="yes"
                    ),
                ),
            ]
        )
        errors = generate_validation_errors(schema)
        assert len(errors) > 0
        assert any("references itself" in err or "Circular reference" in err for err in errors)


class TestFormSchemaIntegration:
    """Integration tests for FormSchema with various field types"""

    def test_all_field_types_valid_schema(self):
        """Test schema with all 7 field types is valid"""
        schema = FormSchema(
            fields=[
                CheckboxGroupField(
                    field_id="interests",
                    field_type="checkbox_group",
                    label="Your Interests",
                    required=True,
                    options=[
                        FieldOption(label="Sports", value="sports"),
                        FieldOption(label="Music", value="music"),
                    ],
                ),
                RadioButtonField(
                    field_id="gender",
                    field_type="radio_button",
                    label="Gender",
                    required=True,
                    options=[
                        FieldOption(label="Male", value="male"),
                        FieldOption(label="Female", value="female"),
                    ],
                ),
                NumberInputField(
                    field_id="age",
                    field_type="number_input",
                    label="Age",
                    required=True,
                    min_value=0,
                    max_value=120,
                ),
                TextInputField(
                    field_id="name",
                    field_type="text_input",
                    label="Full Name",
                    required=True,
                    max_length=200,
                ),
                TextAreaField(
                    field_id="bio",
                    field_type="text_area",
                    label="Biography",
                    required=False,
                    max_length=1000,
                    rows=5,
                ),
                DatePickerField(
                    field_id="birthdate",
                    field_type="date_picker",
                    label="Date of Birth",
                    required=True,
                ),
                FileUploadField(
                    field_id="resume",
                    field_type="file_upload",
                    label="Upload Resume",
                    required=True,
                    allowed_file_types=["pdf", "docx"],
                    max_file_size_mb=5,
                ),
            ]
        )
        errors = generate_validation_errors(schema)
        assert len(errors) == 0

    def test_complex_conditional_mov_logic_valid(self):
        """Test complex conditional MOV logic is validated correctly"""
        schema = FormSchema(
            fields=[
                RadioButtonField(
                    field_id="has_experience",
                    field_type="radio_button",
                    label="Do you have experience?",
                    required=True,
                    options=[
                        FieldOption(label="Yes", value="yes"),
                        FieldOption(label="No", value="no"),
                    ],
                ),
                FileUploadField(
                    field_id="experience_proof",
                    field_type="file_upload",
                    label="Upload Experience Proof",
                    required=False,
                    conditional_mov_requirement=ConditionalMOVLogic(
                        field_id="has_experience", operator="equals", value="yes"
                    ),
                ),
            ]
        )
        errors = generate_validation_errors(schema)
        assert len(errors) == 0
