"""
Form Schema Pydantic Models

This module defines the Pydantic models for the dynamic form schema builder.
Each form field type has its own model with specific validation rules.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class FieldOption(BaseModel):
    """Option for checkbox/radio fields"""

    label: str = Field(
        ..., min_length=1, max_length=200, description="Display label for the option"
    )
    value: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Value stored when option is selected",
    )


class FormFieldBase(BaseModel):
    """Base model for all form fields with common attributes"""

    field_id: str = Field(
        ..., min_length=1, max_length=100, description="Unique identifier for the field"
    )
    field_type: str = Field(..., description="Discriminator field for field type")
    label: str = Field(..., min_length=1, max_length=500, description="Display label for the field")
    required: bool = Field(default=False, description="Whether the field is required")
    help_text: str | None = Field(None, max_length=1000, description="Help text shown to users")

    class Config:
        use_enum_values = True


class CheckboxGroupField(FormFieldBase):
    """Checkbox group field allowing multiple selections"""

    field_type: Literal["checkbox_group"] = "checkbox_group"
    options: list[FieldOption] = Field(..., min_length=1, description="List of checkbox options")
    conditional_mov_requirement: bool = Field(
        default=False,
        description="Whether MOV is conditionally required based on selections",
    )

    @field_validator("options")
    @classmethod
    def validate_options_not_empty(cls, v):
        if not v or len(v) == 0:
            raise ValueError("Checkbox group must have at least one option")
        return v

    @field_validator("options")
    @classmethod
    def validate_unique_values(cls, v):
        values = [opt.value for opt in v]
        if len(values) != len(set(values)):
            raise ValueError("Option values must be unique")
        return v


class RadioButtonField(FormFieldBase):
    """Radio button field allowing single selection"""

    field_type: Literal["radio_button"] = "radio_button"
    options: list[FieldOption] = Field(
        ..., min_length=1, description="List of radio button options"
    )

    @field_validator("options")
    @classmethod
    def validate_options_not_empty(cls, v):
        if not v or len(v) == 0:
            raise ValueError("Radio button field must have at least one option")
        return v

    @field_validator("options")
    @classmethod
    def validate_unique_values(cls, v):
        values = [opt.value for opt in v]
        if len(values) != len(set(values)):
            raise ValueError("Option values must be unique")
        return v


class NumberInputField(FormFieldBase):
    """Number input field with optional min/max validation"""

    field_type: Literal["number_input"] = "number_input"
    min_value: float | None = Field(None, description="Minimum allowed value")
    max_value: float | None = Field(None, description="Maximum allowed value")
    placeholder: str | None = Field(None, max_length=200, description="Placeholder text")
    default_value: float | None = Field(None, description="Default value")

    @field_validator("max_value")
    @classmethod
    def validate_min_max(cls, v, info):
        if v is not None and info.data.get("min_value") is not None:
            if v <= info.data["min_value"]:
                raise ValueError("max_value must be greater than min_value")
        return v


class TextInputField(FormFieldBase):
    """Single-line text input field"""

    field_type: Literal["text_input"] = "text_input"
    max_length: int | None = Field(None, ge=1, le=5000, description="Maximum character length")
    placeholder: str | None = Field(None, max_length=200, description="Placeholder text")
    default_value: str | None = Field(None, description="Default value")


class TextAreaField(FormFieldBase):
    """Multi-line text area field"""

    field_type: Literal["text_area"] = "text_area"
    max_length: int | None = Field(None, ge=1, le=10000, description="Maximum character length")
    rows: int | None = Field(3, ge=1, le=20, description="Number of visible rows")
    placeholder: str | None = Field(None, max_length=200, description="Placeholder text")


class DatePickerField(FormFieldBase):
    """Date picker field with optional date range validation"""

    field_type: Literal["date_picker"] = "date_picker"
    min_date: str | None = Field(None, description="Minimum allowed date (ISO format)")
    max_date: str | None = Field(None, description="Maximum allowed date (ISO format)")
    default_to_today: bool = Field(default=False, description="Whether to default to today's date")

    @field_validator("min_date", "max_date")
    @classmethod
    def validate_date_format(cls, v):
        if v is not None:
            # Basic ISO date format validation (YYYY-MM-DD)
            import re

            if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
                raise ValueError("Date must be in ISO format (YYYY-MM-DD)")
        return v


class ConditionalMOVLogic(BaseModel):
    """Conditional logic for MOV requirement in file upload fields"""

    field_id: str = Field(..., description="ID of the field to check")
    operator: Literal["equals", "not_equals"] = Field(..., description="Comparison operator")
    value: str = Field(..., description="Value to compare against")


class FileUploadField(FormFieldBase):
    """File upload field with conditional MOV requirement logic"""

    field_type: Literal["file_upload"] = "file_upload"
    allowed_file_types: list[str] | None = Field(
        None, description="Allowed file extensions (e.g., ['pdf', 'jpg', 'png'])"
    )
    max_file_size_mb: int | None = Field(
        None, ge=1, le=100, description="Maximum file size in megabytes"
    )
    conditional_mov_requirement: ConditionalMOVLogic | None = Field(
        None, description="Conditional logic for when MOV is required"
    )
    option_group: str | None = Field(
        None,
        description="Optional group identifier for OR-logic validation (e.g., 'option_a', 'option_b')",
    )
    completion_group: str | None = Field(
        None,
        description="Group identifier for SHARED_PLUS_OR_LOGIC completion tracking (e.g., 'shared', 'option_a', 'option_b'). Used separately from option_group to avoid accordion rendering.",
    )


class SectionHeaderField(FormFieldBase):
    """Section header field for visual organization (display-only, not validated)"""

    field_type: Literal["section_header"] = "section_header"
    description: str | None = Field(
        None, max_length=1000, description="Optional description for the section"
    )


class InfoTextField(FormFieldBase):
    """Info text field for displaying information like 'OR' separators (display-only, not validated)"""

    field_type: Literal["info_text"] = "info_text"
    description: str | None = Field(
        None, max_length=1000, description="Optional additional information"
    )


# Type alias for all field types using discriminated union
FormField = Annotated[
    CheckboxGroupField
    | RadioButtonField
    | NumberInputField
    | TextInputField
    | TextAreaField
    | DatePickerField
    | FileUploadField
    | SectionHeaderField
    | InfoTextField,
    Field(discriminator="field_type"),
]


class NoteItem(BaseModel):
    """Single note item with optional label prefix"""

    label: str | None = Field(
        None, max_length=50, description="Optional label prefix (e.g., 'a)', '1.')"
    )
    text: str = Field(..., min_length=1, max_length=1000, description="Note text content")


class FormNotes(BaseModel):
    """Notes section for the form with title and items"""

    title: str = Field(default="Note:", max_length=200, description="Title for the notes section")
    items: list[NoteItem] = Field(..., min_length=1, description="List of note items")


class FormSchema(BaseModel):
    """
    Root model for form schema containing a list of form fields.
    Validates field uniqueness and ensures proper schema structure.
    """

    fields: list[FormField] = Field(
        ..., min_length=1, description="List of form fields in the schema"
    )
    notes: FormNotes | None = Field(
        None, description="Optional notes section displayed above the form fields"
    )
    secondary_notes: FormNotes | None = Field(
        None, description="Optional secondary notes section displayed after form fields"
    )

    @field_validator("fields")
    @classmethod
    def validate_fields_not_empty(cls, v):
        """Ensure fields list is not empty"""
        if not v or len(v) == 0:
            raise ValueError("Form schema must have at least one field")
        return v

    @field_validator("fields")
    @classmethod
    def validate_field_ids_unique(cls, v):
        """Ensure all field_ids are unique within the schema"""
        field_ids = [field.field_id for field in v]
        duplicates = [fid for fid in field_ids if field_ids.count(fid) > 1]
        if duplicates:
            unique_duplicates = list(set(duplicates))
            raise ValueError(
                f"Duplicate field_ids found: {', '.join(unique_duplicates)}. "
                "All field_ids must be unique."
            )
        return v

    @field_validator("fields")
    @classmethod
    def validate_required_fields_present(cls, v):
        """Ensure at least one required field exists (recommended practice)"""
        # Note: This is a soft validation - having no required fields is technically valid
        # but may indicate a configuration issue
        has_required = any(field.required for field in v)
        if not has_required:
            # We'll allow it but could log a warning in production
            pass
        return v

    @model_validator(mode="after")
    def validate_conditional_mov_references(self):
        """
        Validate that conditional MOV logic references valid field_ids.
        This ensures FileUploadField conditional logic points to existing fields.
        """
        field_ids = {field.field_id for field in self.fields}

        for field in self.fields:
            # Check FileUploadField conditional MOV references
            if isinstance(field, FileUploadField) and field.conditional_mov_requirement:
                referenced_field_id = field.conditional_mov_requirement.field_id
                if referenced_field_id not in field_ids:
                    raise ValueError(
                        f"FileUploadField '{field.field_id}' references non-existent "
                        f"field_id '{referenced_field_id}' in conditional MOV logic"
                    )

        return self

    class Config:
        json_schema_extra = {
            "example": {
                "fields": [
                    {
                        "field_id": "project_name",
                        "field_type": "text_input",
                        "label": "Project Name",
                        "required": True,
                        "help_text": "Enter the name of your project",
                        "max_length": 200,
                        "placeholder": "e.g., Community Health Initiative",
                    },
                    {
                        "field_id": "project_type",
                        "field_type": "radio_button",
                        "label": "Project Type",
                        "required": True,
                        "options": [
                            {"label": "Infrastructure", "value": "infrastructure"},
                            {"label": "Social Services", "value": "social_services"},
                            {"label": "Environmental", "value": "environmental"},
                        ],
                    },
                ]
            }
        }
