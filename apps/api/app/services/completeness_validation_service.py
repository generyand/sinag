"""
Completeness Validation Service

This service validates that assessment responses have all required fields filled out.
It's used by BLGU users to ensure their submissions are complete before submitting
for review, and by the system to prevent incomplete submissions.

The service distinguishes between:
- Completeness: All required fields have values (BLGU responsibility)
- Compliance: Values meet Pass/Fail criteria (Assessor/system responsibility)

Usage:
    from app.services.completeness_validation_service import completeness_validation_service

    result = completeness_validation_service.validate_completeness(
        form_schema=indicator.form_schema,
        response_data=assessment_response.response_data,
        uploaded_movs=assessment_response.movs
    )

    if not result["is_complete"]:
        print(f"Missing fields: {result['missing_fields']}")
"""

from typing import Dict, Any, List, Optional
from app.schemas.form_schema import (
    FormSchema,
    FormField,
    FileUploadField,
    ConditionalMOVLogic,
)
import logging

logger = logging.getLogger(__name__)


class CompletenessValidationError(Exception):
    """Custom exception for completeness validation errors"""
    pass


class CompletenessValidationService:
    """
    Service for validating completeness of assessment responses.

    This service checks that all required fields in a form schema have been
    filled out by the BLGU user. It also handles conditional MOV requirements
    for file upload fields.
    """

    def __init__(self):
        """Initialize the completeness validation service"""
        self.logger = logging.getLogger(__name__)

    def validate_completeness(
        self,
        form_schema: Optional[Dict[str, Any]],
        response_data: Optional[Dict[str, Any]],
        uploaded_movs: Optional[List[Any]] = None
    ) -> Dict[str, Any]:
        """
        Validate that all required fields have been filled out.

        Args:
            form_schema: The form schema dict defining field requirements
            response_data: The assessment response data dict
            uploaded_movs: Optional list of uploaded MOV objects

        Returns:
            Dict with validation results:
            {
                "is_complete": bool,
                "missing_fields": [{"field_id": str, "label": str, "reason": str}, ...],
                "required_field_count": int,
                "filled_field_count": int
            }

        Raises:
            CompletenessValidationError: If the form schema is invalid
        """
        # Handle null/missing inputs
        if not form_schema:
            self.logger.warning("No form schema provided")
            return {
                "is_complete": True,
                "missing_fields": [],
                "required_field_count": 0,
                "filled_field_count": 0
            }

        if response_data is None:
            response_data = {}

        if uploaded_movs is None:
            uploaded_movs = []

        try:
            # Check if this is a legacy JSON Schema format (Epic 1.0/2.0)
            # These have 'type', 'properties', etc. but no 'fields' or 'sections'
            if 'type' in form_schema and 'fields' not in form_schema and 'sections' not in form_schema:
                # Legacy format - skip validation, return complete
                self.logger.info("Legacy JSON Schema format detected, skipping completeness validation")
                return {
                    "is_complete": True,
                    "missing_fields": [],
                    "required_field_count": 0,
                    "filled_field_count": 0
                }

            # Handle both Epic 3.0 (sections-based) and Epic 4.0 (fields-based) schemas
            if 'sections' in form_schema and 'fields' not in form_schema:
                # Epic 3.0 format - convert sections to fields
                fields = []
                for section in form_schema.get('sections', []):
                    fields.extend(section.get('fields', []))
                form_schema = {**form_schema, 'fields': fields}

            # Parse and validate the form schema using Pydantic
            schema_obj = FormSchema(**form_schema)

            # Get all required fields
            required_fields = self._get_required_fields(schema_obj, response_data)

            # Check each required field
            missing_fields = []
            for field in required_fields:
                if not self._is_field_filled(field, response_data, uploaded_movs):
                    missing_fields.append({
                        "field_id": field.field_id,
                        "label": field.label,
                        "reason": self._get_missing_reason(field, response_data, uploaded_movs)
                    })

            # Calculate statistics
            required_count = len(required_fields)
            filled_count = required_count - len(missing_fields)

            return {
                "is_complete": len(missing_fields) == 0,
                "missing_fields": missing_fields,
                "required_field_count": required_count,
                "filled_field_count": filled_count
            }

        except Exception as e:
            self.logger.error(f"Error validating completeness: {str(e)}", exc_info=True)
            raise CompletenessValidationError(f"Failed to validate completeness: {str(e)}")

    def _get_required_fields(
        self,
        form_schema: FormSchema,
        response_data: Dict[str, Any]
    ) -> List[FormField]:
        """
        Get all required fields from the form schema.

        This includes:
        - Fields with required=True
        - File upload fields with conditional MOV requirements that are triggered

        Args:
            form_schema: The parsed form schema
            response_data: The assessment response data

        Returns:
            List of required FormField objects
        """
        required_fields = []

        for field in form_schema.fields:
            # Check if field is explicitly required
            if field.required:
                required_fields.append(field)
            # Check if file upload field has conditional MOV requirement
            elif isinstance(field, FileUploadField) and field.conditional_mov_requirement:
                if self._is_conditional_mov_required(field.conditional_mov_requirement, response_data):
                    required_fields.append(field)

        return required_fields

    def _is_conditional_mov_required(
        self,
        conditional_logic: ConditionalMOVLogic,
        response_data: Dict[str, Any]
    ) -> bool:
        """
        Evaluate conditional MOV logic to determine if MOV is required.

        Args:
            conditional_logic: The conditional MOV logic to evaluate
            response_data: The assessment response data

        Returns:
            True if the conditional logic is satisfied and MOV is required, False otherwise
        """
        # Get the referenced field value
        referenced_value = response_data.get(conditional_logic.field_id)

        if referenced_value is None:
            return False

        # Evaluate based on operator
        if conditional_logic.operator == "equals":
            return referenced_value == conditional_logic.value
        elif conditional_logic.operator == "not_equals":
            return referenced_value != conditional_logic.value
        else:
            self.logger.warning(f"Unknown conditional operator: {conditional_logic.operator}")
            return False

    def _is_field_filled(
        self,
        field: FormField,
        response_data: Dict[str, Any],
        uploaded_movs: List[Any]
    ) -> bool:
        """
        Check if a field has been filled out.

        Args:
            field: The form field to check
            response_data: The assessment response data
            uploaded_movs: List of uploaded MOV objects

        Returns:
            True if the field is filled, False otherwise
        """
        field_value = response_data.get(field.field_id)

        # For file upload fields, check MOVs instead of response_data
        if isinstance(field, FileUploadField):
            # A file upload field is filled if there are uploaded MOVs with matching field_id
            # Count MOVs that belong to this specific field
            field_movs = [
                mov for mov in uploaded_movs
                if hasattr(mov, 'field_id') and mov.field_id == field.field_id
            ]
            return len(field_movs) > 0

        # Handle different data types
        if field_value is None:
            return False

        # Empty string
        if isinstance(field_value, str) and field_value.strip() == "":
            return False

        # Empty list (for checkbox groups)
        if isinstance(field_value, list) and len(field_value) == 0:
            return False

        # Empty dict
        if isinstance(field_value, dict) and len(field_value) == 0:
            return False

        # Zero for number fields is considered filled (it's a valid value)
        if isinstance(field_value, (int, float)):
            return True

        # Boolean False is considered filled (it's a valid value)
        if isinstance(field_value, bool):
            return True

        # Any other non-empty value
        return True

    def _get_missing_reason(
        self,
        field: FormField,
        response_data: Dict[str, Any],
        uploaded_movs: List[Any]
    ) -> str:
        """
        Get a human-readable reason why a field is missing.

        Args:
            field: The form field that is missing
            response_data: The assessment response data
            uploaded_movs: List of uploaded MOV objects

        Returns:
            String describing why the field is missing
        """
        field_value = response_data.get(field.field_id)

        if isinstance(field, FileUploadField):
            if field.conditional_mov_requirement:
                return "Conditionally required file upload is missing"
            else:
                return "Required file upload is missing"

        if field_value is None:
            return "Field has no value"

        if isinstance(field_value, str) and field_value.strip() == "":
            return "Field is empty"

        if isinstance(field_value, list) and len(field_value) == 0:
            return "No options selected"

        if isinstance(field_value, dict) and len(field_value) == 0:
            return "No data provided"

        return "Field is incomplete"

    def get_completion_percentage(
        self,
        form_schema: Optional[Dict[str, Any]],
        response_data: Optional[Dict[str, Any]],
        uploaded_movs: Optional[List[Any]] = None
    ) -> float:
        """
        Calculate the percentage of required fields that have been filled.

        Args:
            form_schema: The form schema dict defining field requirements
            response_data: The assessment response data dict
            uploaded_movs: Optional list of uploaded MOV objects

        Returns:
            Float between 0.0 and 100.0 representing completion percentage
        """
        result = self.validate_completeness(form_schema, response_data, uploaded_movs)

        if result["required_field_count"] == 0:
            return 100.0

        percentage = (result["filled_field_count"] / result["required_field_count"]) * 100
        return round(percentage, 2)

    def get_missing_field_labels(
        self,
        form_schema: Optional[Dict[str, Any]],
        response_data: Optional[Dict[str, Any]],
        uploaded_movs: Optional[List[Any]] = None
    ) -> List[str]:
        """
        Get a list of labels for missing required fields.

        This is useful for displaying user-friendly error messages.

        Args:
            form_schema: The form schema dict defining field requirements
            response_data: The assessment response data dict
            uploaded_movs: Optional list of uploaded MOV objects

        Returns:
            List of field labels (strings) that are missing
        """
        result = self.validate_completeness(form_schema, response_data, uploaded_movs)
        return [field["label"] for field in result["missing_fields"]]


# Singleton instance for use across the application
completeness_validation_service = CompletenessValidationService()
