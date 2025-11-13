# 📊 Indicator API Endpoints
# CRUD operations for indicator management with versioning support

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api import deps
from app.db.models.user import User
from app.schemas.indicator import (
    BulkCreateError,
    BulkIndicatorCreate,
    BulkIndicatorResponse,
    FormSchemaResponse,
    IndicatorCreate,
    IndicatorDraftCreate,
    IndicatorDraftDeltaUpdate,
    IndicatorDraftResponse,
    IndicatorDraftSummary,
    IndicatorDraftUpdate,
    IndicatorHistoryResponse,
    IndicatorResponse,
    IndicatorUpdate,
    ReorderRequest,
)
from app.schemas.form_schema import FormSchema
from app.schemas.calculation_schema import CalculationSchema
from app.services.indicator_service import indicator_service
from app.services.indicator_draft_service import indicator_draft_service
from app.services.form_schema_validator import generate_validation_errors
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
    response_model=List[IndicatorResponse],
    summary="List all indicators",
)
def list_indicators(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    governance_area_id: Optional[int] = Query(None, description="Filter by governance area"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max records to return"),
) -> List[IndicatorResponse]:
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
    response_model=List[IndicatorHistoryResponse],
    summary="Get indicator version history",
)
def get_indicator_history(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    indicator_id: int,
) -> List[IndicatorHistoryResponse]:
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
    from app.db.enums import UserRole

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
    from app.schemas.indicator import FormSchemaMetadata

    return FormSchemaResponse(
        indicator_id=indicator.id,
        form_schema=indicator.form_schema or {},
        metadata=FormSchemaMetadata(
            title=indicator.name,
            description=indicator.description,
            governance_area_name=indicator.governance_area.name if indicator.governance_area else None,
        )
    )


# =============================================================================
# Tree Operations Endpoints (Phase 6: Hierarchical Indicator Management)
# =============================================================================


@router.get(
    "/tree/{governance_area_id}",
    response_model=List[dict],
    summary="Get indicator tree structure",
)
def get_indicator_tree(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    governance_area_id: int,
) -> List[dict]:
    """
    Get hierarchical tree structure of indicators for a governance area.

    **Permissions**: All authenticated users

    **Path Parameters**:
    - governance_area_id: Governance area ID

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

    **Raises**:
    - 404: Governance area not found
    """
    tree = indicator_service.get_indicator_tree(
        db=db,
        governance_area_id=governance_area_id,
    )

    return tree


@router.post(
    "/recalculate-codes/{governance_area_id}",
    response_model=List[IndicatorResponse],
    summary="Recalculate indicator codes",
)
def recalculate_indicator_codes(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_mlgoo_dilg),
    governance_area_id: int,
) -> List[IndicatorResponse]:
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
# Bulk Operations Endpoints (Phase 6: Hierarchical Indicator Creation)
# =============================================================================


@router.post(
    "/bulk",
    response_model=BulkIndicatorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create multiple indicators in bulk",
)
def bulk_create_indicators(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_mlgoo_dilg),
    bulk_data: BulkIndicatorCreate,
) -> BulkIndicatorResponse:
    """
    Create multiple indicators in bulk with proper dependency ordering.

    **Permissions**: MLGOO_DILG only

    **Request Body**:
    - governance_area_id: Governance area ID for all indicators
    - indicators: List of indicators with temp_id, parent_temp_id, order, and standard indicator fields

    **Returns**: BulkIndicatorResponse with created indicators, temp_id_mapping, and errors

    **Features**:
    - Automatic topological sorting to ensure parents are created before children
    - Transaction rollback if any errors occur
    - Temp ID to real ID mapping for frontend

    **Raises**:
    - 404: Governance area not found
    - 400: Circular dependencies detected
    - 500: Bulk creation failed
    """
    created_indicators, temp_id_mapping, errors = indicator_service.bulk_create_indicators(
        db=db,
        governance_area_id=bulk_data.governance_area_id,
        indicators_data=[ind.model_dump() for ind in bulk_data.indicators],
        user_id=current_user.id,
    )

    return BulkIndicatorResponse(
        created=created_indicators,
        temp_id_mapping=temp_id_mapping,
        errors=errors,
    )


@router.post(
    "/reorder",
    response_model=List[IndicatorResponse],
    summary="Reorder indicators",
)
def reorder_indicators(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_mlgoo_dilg),
    reorder_data: ReorderRequest,
) -> List[IndicatorResponse]:
    """
    Reorder indicators by updating codes and parent_ids in batch.

    **Permissions**: MLGOO_DILG only

    **Request Body**:
    - indicators: List of indicator updates with id, code, parent_id

    **Returns**: List of updated indicators

    **Raises**:
    - 400: Circular references detected
    - 500: Reorder failed
    """
    updated_indicators = indicator_service.reorder_indicators(
        db=db,
        reorder_data=reorder_data.indicators,
        user_id=current_user.id,
    )

    return updated_indicators


# =============================================================================
# Indicator Draft Endpoints (Phase 6: Draft Auto-Save)
# =============================================================================


@router.post(
    "/drafts",
    response_model=IndicatorDraftResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new indicator draft",
)
def create_indicator_draft(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_mlgoo_dilg),
    draft_data: IndicatorDraftCreate,
) -> IndicatorDraftResponse:
    """
    Create a new indicator draft for the wizard workflow.

    **Permissions**: MLGOO_DILG only

    **Request Body**:
    - governance_area_id: Governance area ID
    - creation_mode: Creation mode ('incremental' or 'bulk_import')
    - title: Optional draft title
    - data: Optional initial draft data (list of indicator nodes)

    **Returns**: Created draft with UUID

    **Raises**:
    - 404: Governance area not found
    - 404: User not found
    """
    draft = indicator_draft_service.create_draft(
        db=db,
        user_id=current_user.id,
        governance_area_id=draft_data.governance_area_id,
        creation_mode=draft_data.creation_mode,
        title=draft_data.title,
        data=draft_data.data,
    )

    return draft


@router.get(
    "/drafts",
    response_model=List[IndicatorDraftSummary],
    summary="List user's indicator drafts",
)
def list_indicator_drafts(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_mlgoo_dilg),
    governance_area_id: Optional[int] = Query(None, description="Filter by governance area"),
    status: Optional[str] = Query(None, description="Filter by status"),
) -> List[IndicatorDraftSummary]:
    """
    List all drafts for the current user with optional filtering.

    **Permissions**: MLGOO_DILG only

    **Query Parameters**:
    - governance_area_id: Filter by governance area (optional)
    - status: Filter by status (optional)

    **Returns**: List of draft summaries ordered by last accessed (most recent first)
    """
    drafts = indicator_draft_service.get_user_drafts(
        db=db,
        user_id=current_user.id,
        governance_area_id=governance_area_id,
        status=status,
    )

    return drafts


@router.get(
    "/drafts/{draft_id}",
    response_model=IndicatorDraftResponse,
    summary="Get indicator draft by ID",
)
def get_indicator_draft(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_mlgoo_dilg),
    draft_id: UUID,
) -> IndicatorDraftResponse:
    """
    Load an indicator draft by ID.

    **Permissions**: MLGOO_DILG only (must own the draft)

    **Path Parameters**:
    - draft_id: Draft UUID

    **Returns**: Full draft data

    **Raises**:
    - 404: Draft not found
    - 403: Access denied (not draft owner)
    """
    draft = indicator_draft_service.load_draft(
        db=db,
        draft_id=draft_id,
        user_id=current_user.id,
    )

    return draft


@router.put(
    "/drafts/{draft_id}",
    response_model=IndicatorDraftResponse,
    summary="Update indicator draft",
)
def update_indicator_draft(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_mlgoo_dilg),
    draft_id: UUID,
    draft_update: IndicatorDraftUpdate,
) -> IndicatorDraftResponse:
    """
    Update an indicator draft with optimistic locking.

    **Permissions**: MLGOO_DILG only (must own the draft)

    **Path Parameters**:
    - draft_id: Draft UUID

    **Request Body**:
    - current_step: Current wizard step (optional)
    - status: Draft status (optional)
    - data: Draft indicator data (optional)
    - title: Draft title (optional)
    - version: Current version number (required for optimistic locking)

    **Returns**: Updated draft with incremented version

    **Features**:
    - Optimistic locking to prevent concurrent edit conflicts
    - Automatic lock acquisition
    - Lock expiration after 30 minutes

    **Raises**:
    - 404: Draft not found
    - 403: Access denied (not draft owner)
    - 409: Version conflict (draft was modified by another process)
    - 423: Draft locked by another user
    """
    update_data = draft_update.model_dump(exclude={"version"}, exclude_unset=True)

    draft = indicator_draft_service.save_draft(
        db=db,
        draft_id=draft_id,
        user_id=current_user.id,
        update_data=update_data,
        version=draft_update.version,
    )

    return draft


@router.post(
    "/drafts/{draft_id}/delta",
    response_model=IndicatorDraftResponse,
    summary="Delta update indicator draft (only changed indicators)",
)
def delta_update_indicator_draft(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_mlgoo_dilg),
    draft_id: UUID,
    delta_update: IndicatorDraftDeltaUpdate,
) -> IndicatorDraftResponse:
    """
    Update indicator draft with delta-based save (only changed indicators).

    This endpoint provides ~95% payload reduction compared to full updates,
    improving save performance from 2-3s to <300ms.

    **Permissions**: MLGOO_DILG only (must own the draft)

    **Path Parameters**:
    - draft_id: Draft UUID

    **Request Body**:
    - changed_indicators: List of changed indicator dictionaries
    - changed_ids: List of temp_ids for changed indicators
    - version: Current version number (required for optimistic locking)
    - metadata: Optional metadata (current_step, status, title)

    **Returns**: Updated draft with incremented version

    **Features**:
    - Delta merge: Only updates changed indicators in existing tree
    - 95% payload reduction (600 KB → 15 KB typical)
    - 10x performance improvement (<300ms vs 2-3s)
    - Optimistic locking to prevent concurrent edit conflicts
    - Automatic lock acquisition
    - Lock expiration after 30 minutes

    **Raises**:
    - 404: Draft not found
    - 403: Access denied (not draft owner)
    - 409: Version conflict (draft was modified by another process)
    - 423: Draft locked by another user

    **Example**:
    ```json
    {
      "changed_indicators": [
        {"temp_id": "abc123", "name": "Updated Indicator", ...},
        {"temp_id": "def456", "name": "Another Update", ...}
      ],
      "changed_ids": ["abc123", "def456"],
      "version": 5,
      "metadata": {"current_step": 3}
    }
    ```
    """
    draft = indicator_draft_service.save_draft_delta(
        db=db,
        draft_id=draft_id,
        user_id=current_user.id,
        changed_indicators=delta_update.changed_indicators,
        changed_ids=delta_update.changed_ids,
        version=delta_update.version,
        metadata=delta_update.metadata,
    )

    return draft


@router.delete(
    "/drafts/{draft_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete indicator draft",
)
def delete_indicator_draft(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_mlgoo_dilg),
    draft_id: UUID,
) -> None:
    """
    Delete an indicator draft.

    **Permissions**: MLGOO_DILG only (must own the draft)

    **Path Parameters**:
    - draft_id: Draft UUID

    **Returns**: 204 No Content on success

    **Raises**:
    - 404: Draft not found
    - 403: Access denied (not draft owner)
    """
    indicator_draft_service.delete_draft(
        db=db,
        draft_id=draft_id,
        user_id=current_user.id,
    )


@router.post(
    "/drafts/{draft_id}/release-lock",
    response_model=IndicatorDraftResponse,
    summary="Release lock on indicator draft",
)
def release_draft_lock(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.require_mlgoo_dilg),
    draft_id: UUID,
) -> IndicatorDraftResponse:
    """
    Release lock on an indicator draft.

    **Permissions**: MLGOO_DILG only (must own the draft and hold the lock)

    **Path Parameters**:
    - draft_id: Draft UUID

    **Returns**: Draft with lock released

    **Raises**:
    - 404: Draft not found
    - 403: Access denied (not draft owner)
    - 400: Lock not held by you
    """
    draft = indicator_draft_service.release_lock(
        db=db,
        draft_id=draft_id,
        user_id=current_user.id,
    )

    return draft
