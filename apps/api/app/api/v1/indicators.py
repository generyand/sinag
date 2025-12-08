# 📊 Indicator API Endpoints
# CRUD operations for indicator management with versioning support

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api import deps
from app.db.models.user import User
from app.schemas.calculation_schema import CalculationSchema
from app.schemas.form_schema import FormSchema
from app.schemas.indicator import (
    FormSchemaResponse,
    IndicatorCreate,
    IndicatorHistoryResponse,
    IndicatorResponse,
    IndicatorTreeResponse,
    IndicatorUpdate,
    SimplifiedIndicatorResponse,
)
from app.services.form_schema_validator import generate_validation_errors
from app.services.indicator_service import indicator_service
from app.services.intelligence_service import intelligence_service

router = APIRouter(tags=["indicators"])


@router.post(
    "/",
    response_model=IndicatorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new indicator",
)
def create_indicator(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_mlgoo_dilg),
    indicator_in: IndicatorCreate,
) -> IndicatorResponse:
    """
    Create a new indicator with version 1.

    **Permissions**: MLGOO_DILG only

    **Request Body**:
    - name: Indicator name (min 3 characters)
    - description: Optional description
    - governance_area_id: ID of governance area
    - parent_id: Optional parent indicator ID (for hierarchical structure)
    - is_active: Active status (default: True)
    - is_profiling_only: Profiling-only flag (default: False)
    - is_auto_calculable: Auto-calculable Pass/Fail flag (default: False)
    - form_schema: Optional form schema (JSON)
    - calculation_schema: Optional calculation schema (JSON)
    - remark_schema: Optional remark schema (JSON)
    - technical_notes_text: Optional technical notes

    **Returns**: Created indicator with version 1
    """
    indicator = indicator_service.create_indicator(
        db=db,
        data=indicator_in.model_dump(),
        user_id=current_user.id,
    )
    return indicator


@router.get(
    "/",
    response_model=list[IndicatorResponse],
    summary="List all indicators",
)
def list_indicators(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    governance_area_id: int | None = Query(None, description="Filter by governance area"),
    is_active: bool | None = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max records to return"),
) -> list[IndicatorResponse]:
    """
    List indicators with optional filtering.

    **Permissions**: All authenticated users

    **Query Parameters**:
    - governance_area_id: Filter by governance area (optional)
    - is_active: Filter by active status (optional)
    - skip: Pagination offset (default: 0)
    - limit: Max records (default: 100, max: 1000)

    **Returns**: List of indicators matching filters
    """
    indicators = indicator_service.list_indicators(
        db=db,
        governance_area_id=governance_area_id,
        is_active=is_active,
        skip=skip,
        limit=limit,
    )
    return indicators


@router.post(
    "/validate-form-schema",
    status_code=status.HTTP_200_OK,
    summary="Validate a form schema",
)
def validate_form_schema(
    *,
    current_user: User = Depends(deps.require_mlgoo_dilg),
    form_schema: FormSchema,
) -> dict:
    """
    Validate a form schema without saving it.

    **Permissions**: MLGOO_DILG only

    **Request Body**:
    - form_schema: FormSchema object with fields to validate

    **Returns**:
    - `{"valid": true}` if the schema is valid
    - `{"valid": false, "errors": [...]}` if validation fails with detailed error messages

    **Validation Checks**:
    - Field IDs are unique
    - No circular references in conditional logic
    - Conditional MOV references point to existing fields
    - Checkbox/Radio fields have at least one option
    - Fields list is not empty

    **Status Codes**:
    - 200: Schema is valid
    - 400: Schema is invalid (returns error details)
    - 401: Unauthorized (not authenticated)
    - 403: Forbidden (not MLGOO_DILG role)
    """
    # Generate validation errors
    errors = generate_validation_errors(form_schema)

    if errors:
        # Return 400 with detailed errors
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "valid": False,
                "errors": errors,
            },
        )

    return {"valid": True}


@router.post(
    "/validate-calculation-schema",
    status_code=status.HTTP_200_OK,
    summary="Validate a calculation schema",
)
def validate_calculation_schema(
    *,
    current_user: User = Depends(deps.require_mlgoo_dilg),
    calculation_schema: CalculationSchema,
) -> dict:
    """
    Validate a calculation schema without saving it.

    **Permissions**: MLGOO_DILG only

    **Request Body**:
    - calculation_schema: CalculationSchema object with condition groups and rules

    **Returns**:
    - `{"valid": true}` if the schema is valid
    - `{"valid": false, "errors": [...]}` if validation fails

    **Validation Checks**:
    - All rule types are valid and properly structured
    - Field references are present (basic structure validation)
    - Nested conditions are properly formed
    - Operators are valid for each rule type

    **Status Codes**:
    - 200: Schema is valid
    - 400: Schema is invalid (returns error details)
    - 401: Unauthorized (not authenticated)
    - 403: Forbidden (not MLGOO_DILG role)

    **Note**: This endpoint only validates the schema structure.
    To test the schema with actual data, use the `/test-calculation` endpoint.
    """
    # Pydantic validation already happened during request parsing
    # If we got here, the schema structure is valid
    return {
        "valid": True,
        "message": "Calculation schema structure is valid",
    }


@router.post(
    "/test-calculation",
    status_code=status.HTTP_200_OK,
    summary="Test a calculation schema with sample data",
)
def test_calculation(
    *,
    current_user: User = Depends(deps.require_mlgoo_dilg),
    calculation_schema: CalculationSchema,
    assessment_data: dict,
) -> dict:
    """
    Test a calculation schema with sample assessment data.

    **Permissions**: MLGOO_DILG only

    **Request Body**:
    - calculation_schema: CalculationSchema to evaluate
    - assessment_data: Dictionary of field_id -> value pairs
      Example: {"completion_rate": 85, "required_documents": ["doc1", "doc2", "doc3"]}

    **Returns**:
    ```json
    {
      "result": "Pass" | "Fail",
      "evaluation_result": true | false,
      "explanation": "Detailed explanation of evaluation",
      "output_status_on_pass": "Pass",
      "output_status_on_fail": "Fail"
    }
    ```

    **Status Codes**:
    - 200: Calculation completed successfully
    - 400: Invalid schema or data (e.g., field not found, type mismatch)
    - 401: Unauthorized (not authenticated)
    - 403: Forbidden (not MLGOO_DILG role)

    **Error Examples**:
    - Field not found: `{"detail": "Field 'completion_rate' not found in assessment data. Available fields: ['other_field']"}`
    - Type mismatch: `{"detail": "Field 'count' expected list for checkbox count, got str"}`

    **Example Usage**:
    ```json
    {
      "calculation_schema": {
        "condition_groups": [
          {
            "operator": "AND",
            "rules": [
              {
                "rule_type": "PERCENTAGE_THRESHOLD",
                "field_id": "completion_rate",
                "operator": ">=",
                "threshold": 75.0
              }
            ]
          }
        ],
        "output_status_on_pass": "Pass",
        "output_status_on_fail": "Fail"
      },
      "assessment_data": {
        "completion_rate": 85
      }
    }
    ```
    """
    try:
        # Evaluate the calculation schema
        evaluation_result = intelligence_service.evaluate_calculation_schema(
            calculation_schema=calculation_schema,
            assessment_data=assessment_data,
        )

        # Determine output status based on evaluation result
        if evaluation_result:
            result_status = calculation_schema.output_status_on_pass
            explanation = "All condition groups evaluated to true"
        else:
            result_status = calculation_schema.output_status_on_fail
            explanation = "One or more condition groups evaluated to false"

        return {
            "result": result_status,
            "evaluation_result": evaluation_result,
            "explanation": explanation,
            "output_status_on_pass": calculation_schema.output_status_on_pass,
            "output_status_on_fail": calculation_schema.output_status_on_fail,
        }

    except ValueError as e:
        # Handle validation errors (e.g., field not found, type mismatch)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        # Handle unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Calculation evaluation failed: {str(e)}",
        )


@router.get(
    "/{indicator_id}",
    response_model=IndicatorResponse,
    summary="Get indicator by ID",
)
def get_indicator(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    indicator_id: int,
) -> IndicatorResponse:
    """
    Get a specific indicator by ID.

    **Permissions**: All authenticated users

    **Path Parameters**:
    - indicator_id: ID of the indicator

    **Returns**: Indicator details including current version

    **Raises**:
    - 404: Indicator not found
    """
    indicator = indicator_service.get_indicator(db=db, indicator_id=indicator_id)
    if not indicator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Indicator with ID {indicator_id} not found",
        )
    return indicator


@router.put(
    "/{indicator_id}",
    response_model=IndicatorResponse,
    summary="Update an indicator",
)
def update_indicator(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_mlgoo_dilg),
    indicator_id: int,
    indicator_in: IndicatorUpdate,
) -> IndicatorResponse:
    """
    Update an indicator.

    **Permissions**: MLGOO_DILG only

    **Path Parameters**:
    - indicator_id: ID of the indicator to update

    **Request Body**: All fields optional for partial updates
    - name: Indicator name (min 3 characters)
    - description: Description
    - governance_area_id: ID of governance area
    - parent_id: Parent indicator ID
    - is_active: Active status
    - is_profiling_only: Profiling-only flag
    - is_auto_calculable: Auto-calculable Pass/Fail flag
    - form_schema: Form schema (JSON)
    - calculation_schema: Calculation schema (JSON)
    - remark_schema: Remark schema (JSON)
    - technical_notes_text: Technical notes

    **Versioning Logic**:
    - If any schema field (form_schema, calculation_schema, remark_schema) changes,
      the current version is archived to indicators_history and version is incremented
    - Metadata changes (name, description, etc.) do not trigger versioning

    **Returns**: Updated indicator

    **Raises**:
    - 404: Indicator not found
    - 400: Circular parent reference detected
    - 400: Invalid governance_area_id
    """
    # Filter out None values for partial updates
    update_data = indicator_in.model_dump(exclude_unset=True)

    indicator = indicator_service.update_indicator(
        db=db,
        indicator_id=indicator_id,
        data=update_data,
        user_id=current_user.id,
    )
    return indicator


@router.delete(
    "/{indicator_id}",
    response_model=IndicatorResponse,
    summary="Deactivate an indicator",
)
def deactivate_indicator(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_mlgoo_dilg),
    indicator_id: int,
) -> IndicatorResponse:
    """
    Deactivate an indicator (soft delete).

    **Permissions**: MLGOO_DILG only

    **Path Parameters**:
    - indicator_id: ID of the indicator to deactivate

    **Returns**: Deactivated indicator (is_active=False)

    **Raises**:
    - 404: Indicator not found
    - 400: Cannot deactivate indicator with active child indicators
    """
    indicator = indicator_service.deactivate_indicator(
        db=db,
        indicator_id=indicator_id,
        user_id=current_user.id,
    )
    return indicator


@router.get(
    "/{indicator_id}/history",
    response_model=list[IndicatorHistoryResponse],
    summary="Get indicator version history",
)
def get_indicator_history(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    indicator_id: int,
) -> list[IndicatorHistoryResponse]:
    """
    Get version history for an indicator.

    **Permissions**: All authenticated users

    **Path Parameters**:
    - indicator_id: ID of the indicator

    **Returns**: List of archived versions ordered by version DESC (newest first)

    **Raises**:
    - 404: Indicator not found
    """
    history = indicator_service.get_indicator_history(
        db=db,
        indicator_id=indicator_id,
    )
    return history


@router.get(
    "/{indicator_id}/form-schema",
    response_model=FormSchemaResponse,
    status_code=status.HTTP_200_OK,
    summary="Get form schema for an indicator",
)
def get_indicator_form_schema(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    indicator_id: int,
) -> FormSchemaResponse:
    """
    Get form schema for a specific indicator.

    **Permissions**: All authenticated users
    - BLGU users: Can access all indicators (all barangays complete all governance areas)
    - Assessors and validators: Can access all indicators

    **Path Parameters**:
    - indicator_id: ID of the indicator

    **Returns**: Form schema with metadata (title, description, governance area)

    **Raises**:
    - 404: Indicator not found
    """

    # Retrieve indicator with form_schema, calculation_schema, remark_schema
    indicator = indicator_service.get_indicator(db=db, indicator_id=indicator_id)

    if not indicator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Indicator with ID {indicator_id} not found",
        )

    # Permission check: BLGU users can access all indicators
    # (all barangays need to complete assessments for all governance areas)
    # Assessors/Validators/MLGOO_DILG can access all indicators
    # Current implementation: All authenticated users can access (verified by get_current_user dependency)

    # Extract form_schema and metadata
    # Note: Do NOT include calculation_schema or remark_schema (assessor-only fields)
    from app.core.year_resolver import get_year_resolver
    from app.schemas.indicator import FormSchemaMetadata

    # Apply year placeholder resolution
    try:
        year_resolver = get_year_resolver(db)
        resolved_name = year_resolver.resolve_string(indicator.name)
        resolved_description = year_resolver.resolve_string(indicator.description)
        resolved_form_schema = year_resolver.resolve_schema(indicator.form_schema)
    except ValueError:
        # If no active assessment year config, use raw values
        resolved_name = indicator.name
        resolved_description = indicator.description
        resolved_form_schema = indicator.form_schema

    return FormSchemaResponse(
        indicator_id=indicator.id,
        form_schema=resolved_form_schema or {},
        metadata=FormSchemaMetadata(
            title=resolved_name,
            description=resolved_description,
            governance_area_name=indicator.governance_area.name
            if indicator.governance_area
            else None,
        ),
    )


# =============================================================================
# Tree Operations Endpoints (Phase 6: Hierarchical Indicator Management)
# =============================================================================


@router.get(
    "/tree/{governance_area_id}",
    response_model=list[dict],
    summary="Get indicator tree structure",
)
def get_indicator_tree_by_governance_area(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    governance_area_id: int,
    year: int | None = None,
) -> list[dict]:
    """
    Get hierarchical tree structure of indicators for a governance area.

    **Permissions**: All authenticated users

    **Path Parameters**:
    - governance_area_id: Governance area ID

    **Query Parameters**:
    - year: Optional assessment year for placeholder resolution.
            If viewing a historical assessment, pass the assessment's year.
            If not provided, uses the currently active year.
            Example: year=2024 will resolve {CURRENT_YEAR} as "2024"

    **Returns**: List of root indicator nodes with nested children

    **Tree Structure**:
    ```json
    [
        {
            "id": 1,
            "name": "Root Indicator",
            "indicator_code": "1.1",
            "sort_order": 0,
            "selection_mode": "none",
            "parent_id": null,
            "children": [
                {
                    "id": 2,
                    "name": "Child Indicator",
                    "indicator_code": "1.1.1",
                    "sort_order": 0,
                    "parent_id": 1,
                    "children": []
                }
            ]
        }
    ]
    ```

    **Features**:
    - Hierarchical parent-child relationships
    - Automatic code generation (1.1, 1.1.1, etc.)
    - MOV checklist items included
    - Form, calculation, and remark schemas included
    - Dynamic year placeholder resolution ({CURRENT_YEAR}, {PREVIOUS_YEAR}, etc.)

    **Raises**:
    - 404: Governance area not found
    """
    tree = indicator_service.get_indicator_tree(
        db=db,
        governance_area_id=governance_area_id,
        assessment_year=year,
    )

    return tree


@router.post(
    "/recalculate-codes/{governance_area_id}",
    response_model=list[IndicatorResponse],
    summary="Recalculate indicator codes",
)
def recalculate_indicator_codes(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_mlgoo_dilg),
    governance_area_id: int,
) -> list[IndicatorResponse]:
    """
    Recalculate indicator codes for a governance area after reordering.

    Automatically generates hierarchical codes like "1.1", "1.1.1", "1.2"
    based on tree structure and sort_order.

    **Permissions**: MLGOO_DILG only

    **Path Parameters**:
    - governance_area_id: Governance area ID

    **Returns**: List of updated indicators with new codes

    **Code Generation Logic**:
    - Root nodes: "1", "2", "3", ...
    - First-level children: "1.1", "1.2", "1.3", ...
    - Second-level children: "1.1.1", "1.1.2", ...
    - Sort order determines numbering within siblings

    **Example**:
    Before reorder:
    - Indicator A (code: "1.1", sort_order: 1)
    - Indicator B (code: "1.2", sort_order: 0)

    After recalculate (sorted by sort_order):
    - Indicator B (code: "1.1", sort_order: 0)
    - Indicator A (code: "1.2", sort_order: 1)

    **Raises**:
    - 404: Governance area not found
    """
    updated_indicators = indicator_service.recalculate_codes(
        db=db,
        governance_area_id=governance_area_id,
        user_id=current_user.id,
    )

    return updated_indicators


# =============================================================================
# Hard-Coded Indicator Endpoints (Simplified Approach)
# =============================================================================


@router.get(
    "/code/{indicator_code}",
    response_model=SimplifiedIndicatorResponse,
    status_code=status.HTTP_200_OK,
    summary="Get indicator by code (hard-coded indicators)",
    tags=["indicators", "hard-coded"],
)
def get_indicator_by_code(
    *,
    db: Session = Depends(deps.get_db),
    indicator_code: str,
) -> SimplifiedIndicatorResponse:
    """
    Get a single indicator by its code (e.g., "1.1", "1.1.1", "2.3").

    This endpoint is for hard-coded SGLGB indicators that are defined in Python
    and seeded into the database.

    **Path Parameters**:
    - indicator_code: Indicator code (e.g., "1.1", "1.1.1")

    **Returns**: Indicator with checklist items (if sub-indicator) or children (if parent)

    **Raises**:
    - 404: Indicator not found

    **Example**:
    ```
    GET /api/v1/indicators/code/1.1.1
    ```
    """
    from sqlalchemy.orm import joinedload

    from app.db.models.governance_area import Indicator

    # Query indicator with relationships
    indicator = (
        db.query(Indicator)
        .filter(Indicator.indicator_code == indicator_code, Indicator.is_active == True)
        .options(
            joinedload(Indicator.governance_area),
            joinedload(Indicator.checklist_items),
            joinedload(Indicator.children).joinedload(Indicator.checklist_items),
        )
        .first()
    )

    if not indicator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Indicator with code '{indicator_code}' not found",
        )

    return indicator


@router.get(
    "/code/{indicator_code}/tree",
    response_model=IndicatorTreeResponse,
    status_code=status.HTTP_200_OK,
    summary="Get full indicator tree by code",
    tags=["indicators", "hard-coded"],
)
def get_indicator_tree(
    *,
    db: Session = Depends(deps.get_db),
    indicator_code: str,
) -> IndicatorTreeResponse:
    """
    Get a full indicator tree (parent with all children and checklist items).

    This endpoint returns the complete hierarchy for a parent indicator
    (e.g., "1.1" returns 1.1 with children 1.1.1, 1.1.2, and all checklist items).

    **Path Parameters**:
    - indicator_code: Parent indicator code (e.g., "1.1", "2.3")

    **Returns**: Complete indicator tree with all children and checklist items

    **Raises**:
    - 404: Indicator not found
    - 400: Indicator is not a parent (has no children)

    **Example**:
    ```
    GET /api/v1/indicators/code/1.1/tree
    ```

    Returns indicator 1.1 with:
    - 1.1.1 (with 7 checklist items)
    - 1.1.2 (with 1 checklist item)
    """
    from sqlalchemy.orm import joinedload

    from app.db.models.governance_area import Indicator

    # Query parent indicator with all relationships
    indicator = (
        db.query(Indicator)
        .filter(
            Indicator.indicator_code == indicator_code,
            Indicator.is_active == True,
            Indicator.parent_id == None,  # Only parent indicators
        )
        .options(
            joinedload(Indicator.governance_area),
            joinedload(Indicator.children).joinedload(Indicator.checklist_items),
            joinedload(Indicator.children).joinedload(Indicator.governance_area),
        )
        .first()
    )

    if not indicator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parent indicator with code '{indicator_code}' not found",
        )

    if not indicator.children:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Indicator '{indicator_code}' has no children. Use /code/{indicator_code} instead.",
        )

    return indicator
