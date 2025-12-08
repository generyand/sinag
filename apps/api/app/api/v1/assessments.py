# 📋 Assessments API Routes
# Endpoints for assessment management and assessment data

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api import deps
from app.db.enums import AssessmentStatus, UserRole
from app.db.models.assessment import MOV as MOVModel
from app.db.models.assessment import Assessment, FeedbackComment
from app.db.models.user import User
from app.schemas.assessment import (
    MOV,
    AnswerResponse,
    AssessmentDashboardResponse,
    AssessmentResponse,
    AssessmentResponseCreate,
    AssessmentResponseUpdate,
    AssessmentSubmissionValidation,
    CalibrationSummaryResponse,
    CompletenessValidationResponse,
    GetAnswersResponse,
    IncompleteIndicatorDetail,
    MOVCreate,
    RequestReworkRequest,
    RequestReworkResponse,
    ResubmitAssessmentResponse,
    ReworkSummaryResponse,
    SaveAnswersRequest,
    SaveAnswersResponse,
    SubmissionStatusResponse,
    SubmitAssessmentResponse,
)
from app.services.assessment_service import assessment_service
from app.services.submission_validation_service import submission_validation_service

router = APIRouter()


async def get_current_blgu_user(
    current_user: User = Depends(deps.get_current_active_user),
) -> User:
    """
    Get the current authenticated BLGU user.

    Restricts access to users with BLGU_USER role.

    Args:
        current_user: Current active user from get_current_active_user dependency

    Returns:
        User: Current BLGU user

    Raises:
        HTTPException: If user doesn't have BLGU privileges
    """
    if current_user.role.value != UserRole.BLGU_USER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. BLGU user access required.",
        )
    return current_user


@router.get("/dashboard", response_model=AssessmentDashboardResponse, tags=["assessments"])
async def get_assessment_dashboard(
    year: int | None = Query(
        None,
        description="Assessment year. If not provided, uses the active year.",
        ge=2020,
        le=2100,
    ),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_current_blgu_user),
):
    """
    Get dashboard data for the logged-in BLGU user's assessment.

    Returns dashboard-specific data optimized for overview and progress tracking:
    - Progress statistics (completed/total indicators)
    - Governance area progress summaries
    - Performance metrics (responses requiring rework, with feedback, with MOVs)
    - Recent feedback summaries
    - Assessment status and metadata

    This endpoint automatically creates an assessment if one doesn't exist
    for the BLGU user (for the active year only).

    **Query Parameters:**
    - year: Optional assessment year. If not provided, uses the active year.
    """
    try:
        dashboard_data = assessment_service.get_assessment_dashboard_data(
            db, getattr(current_user, "id"), assessment_year=year
        )

        if not dashboard_data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve dashboard data",
            )

        return dashboard_data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving dashboard data: {str(e)}",
        ) from e


@router.get("/my-assessment", response_model=dict[str, Any], tags=["assessments"])
async def get_my_assessment(
    year: int | None = Query(
        None,
        description="Assessment year to retrieve. If not provided, returns the active year's assessment.",
        ge=2020,
        le=2100,
    ),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_current_blgu_user),
):
    """
    Get the complete assessment data for the logged-in BLGU user.

    Returns the full assessment data including:
    - Assessment status and metadata
    - All governance areas with their indicators
    - Form schemas for each indicator
    - Existing response data for each indicator
    - MOVs (Means of Verification) for each response
    - Feedback comments from assessors

    This endpoint automatically creates an assessment if one doesn't exist
    for the BLGU user (for the active year).

    **Query Parameters:**
    - year: Optional assessment year. If not provided, uses the active year.
    """
    try:
        # Pass year parameter to service (to be added)
        assessment_data = assessment_service.get_assessment_for_blgu_with_full_data(
            db, getattr(current_user, "id"), assessment_year=year
        )

        if not assessment_data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve assessment data",
            )

        return assessment_data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving assessment data: {str(e)}",
        ) from e


@router.get("/responses/{response_id}", response_model=AssessmentResponse, tags=["assessments"])
async def get_assessment_response(
    response_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_current_blgu_user),
):
    """
    Get a specific assessment response by ID.

    Returns the assessment response with all related data including:
    - Response data (JSON)
    - Completion status
    - MOVs (Means of Verification)
    - Feedback comments
    """
    response = assessment_service.get_assessment_response(db, response_id)

    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment response not found",
        )

    # Verify that the response belongs to the current user's assessment
    assessment = assessment_service.get_assessment_for_blgu(db, getattr(current_user, "id"))
    if assessment is None or response.assessment_id != assessment.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Response does not belong to your assessment",
        )

    return response


@router.put("/responses/{response_id}", response_model=AssessmentResponse, tags=["assessments"])
async def update_assessment_response(
    response_id: int,
    response_update: AssessmentResponseUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_current_blgu_user),
):
    """
    Update an assessment response with validation.

    Updates the response data and validates it against the indicator's form schema.
    The response data must conform to the JSON schema defined in the indicator's
    form_schema field.

    Business Rules:
    - Only responses belonging to the current user's assessment can be updated
    - Response data is validated against the indicator's form schema
    - Completion status is automatically updated based on response data
    """
    # First verify the response belongs to the current user
    response = assessment_service.get_assessment_response(db, response_id)
    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment response not found",
        )

    # Verify ownership
    assessment = assessment_service.get_assessment_for_blgu(db, getattr(current_user, "id"))
    if assessment is None or response.assessment_id != assessment.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Response does not belong to your assessment",
        )

    # Check if assessment is in a state that allows updates
    if assessment.status not in [
        assessment.status.DRAFT,
        assessment.status.NEEDS_REWORK,
    ]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update response. Assessment status is {assessment.status.value}",
        )

    try:
        updated_response = assessment_service.update_assessment_response(
            db, response_id, response_update
        )

        if not updated_response:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assessment response not found",
            )

        return updated_response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating response: {str(e)}",
        ) from e


@router.post("/responses", response_model=AssessmentResponse, tags=["assessments"])
async def create_assessment_response(
    response_create: AssessmentResponseCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_current_blgu_user),
):
    """
    Create a new assessment response.

    Creates a new response for a specific indicator in the user's assessment.
    The response data is validated against the indicator's form schema.
    """
    # Verify the assessment belongs to the current user
    assessment = assessment_service.get_assessment_for_blgu(db, getattr(current_user, "id"))
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found for current user",
        )

    # Verify the response is for the user's assessment
    if response_create.assessment_id != assessment.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create response for different assessment",
        )

    try:
        return assessment_service.create_assessment_response(db, response_create)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating response: {str(e)}",
        ) from e


@router.post("/submit", response_model=AssessmentSubmissionValidation, tags=["assessments"])
async def submit_current_user_assessment(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_current_blgu_user),
):
    """
    Submit the assessment for review.

    Runs a preliminary compliance check before submission:
    - Ensures no "YES" answers exist without corresponding MOVs (Means of Verification)
    - Updates assessment status to "Submitted for Review"
    - Sets submission timestamp

    Returns validation results with any errors or warnings.
    """
    assessment = assessment_service.get_assessment_for_blgu(db, getattr(current_user, "id"))
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found for current user",
        )

    try:
        validation_result = assessment_service.submit_assessment(db, assessment.id)
        if not getattr(validation_result, "is_valid", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=("Submission failed: YES answers without MOV detected."),
            )
        return validation_result

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error submitting assessment: {str(e)}",
        ) from e


# NOTE: Old duplicate submit endpoint removed (was at line 339-357)
# Epic 5.0 submit_assessment endpoint is the correct one (now at line ~1070)


@router.post("/responses/{response_id}/movs", response_model=MOV, tags=["assessments"])
async def upload_mov(
    response_id: int,
    mov_create: MOVCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_current_blgu_user),
):
    """
    Upload a MOV (Means of Verification) file for an assessment response.

    Creates a record of the uploaded file in the database. The actual file
    upload to Supabase Storage should be handled by the frontend before
    calling this endpoint.
    """
    # Verify the response belongs to the current user
    response = assessment_service.get_assessment_response(db, response_id)
    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment response not found",
        )

    assessment = assessment_service.get_assessment_for_blgu(db, getattr(current_user, "id"))
    if assessment is None or response.assessment_id != assessment.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Response does not belong to your assessment",
        )

    # Verify the MOV is for the correct response
    if mov_create.response_id != response_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MOV response_id does not match URL parameter",
        )

    try:
        return assessment_service.create_mov(db, mov_create)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating MOV: {str(e)}",
        ) from e


@router.delete("/movs/{mov_id}", response_model=dict[str, str], tags=["assessments"])
async def delete_mov(
    mov_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_current_blgu_user),
):
    """
    Delete a MOV (Means of Verification) file.

    Removes the MOV record from the database. The actual file deletion
    from Supabase Storage should be handled separately.
    """
    # First get the MOV to verify ownership
    mov = db.query(MOVModel).filter(MOVModel.id == mov_id).first()
    if mov is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MOV not found")

    # Verify the MOV belongs to the current user's assessment
    response = assessment_service.get_assessment_response(db, mov.response_id)
    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment response not found",
        )

    assessment = assessment_service.get_assessment_for_blgu(db, getattr(current_user, "id"))
    if assessment is None or response.assessment_id != assessment.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. MOV does not belong to your assessment",
        )

    try:
        success = assessment_service.delete_mov(db, mov_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MOV not found")

        return {"message": "MOV deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting MOV: {str(e)}",
        ) from e


async def get_current_admin_user(
    current_user: User = Depends(deps.get_current_active_user),
) -> User:
    """
    Get the current authenticated admin/MLGOO user.

    Restricts access to users with MLGOO_DILG role.

    Args:
        current_user: Current active user from get_current_active_user dependency

    Returns:
        User: Current admin/MLGOO user

    Raises:
        HTTPException: If user doesn't have admin privileges
    """
    if current_user.role.value != UserRole.MLGOO_DILG.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Admin/MLGOO access required.",
        )
    return current_user


@router.get("/list", response_model=list[dict[str, Any]], tags=["assessments"])
async def get_all_validated_assessments(
    assessment_status: AssessmentStatus | None = Query(
        None, description="Filter by assessment status (returns all if not specified)"
    ),
    year: int | None = Query(
        None,
        description="Filter by assessment year (e.g., 2024, 2025). Defaults to active year.",
        ge=2020,
        le=2100,
    ),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get all assessments with compliance status (optionally filtered by status and year).

    Returns a list of assessments with their compliance status,
    area results, and barangay information. Used for MLGOO reports dashboard.

    Args:
        assessment_status: Optional filter by assessment status (shows all if not provided)
        year: Optional filter by assessment year (defaults to active year)
        db: Database session
        current_user: Current admin/MLGOO user

    Returns:
        List of assessment dictionaries with compliance data
    """
    try:
        assessments = assessment_service.get_all_validated_assessments(
            db, status=assessment_status, assessment_year=year
        )
        return assessments
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving assessments: {str(e)}",
        ) from e


@router.post(
    "/{id}/generate-insights",
    response_model=dict[str, Any],
    status_code=status.HTTP_202_ACCEPTED,
    tags=["assessments"],
)
async def generate_insights(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Generate AI-powered insights for a validated assessment.

    This endpoint dispatches a background Celery task to generate AI insights
    using the Gemini API. The task runs asynchronously and results are stored
    in the ai_recommendations field.

    **Business Rules:**
    - Only works for assessments with VALIDATED status
    - Returns 202 Accepted immediately (asynchronous processing)
    - Task includes automatic retry logic (max 3 attempts with exponential backoff)
    - Results are cached to avoid duplicate API calls

    **Response:**
    - Immediately returns 202 Accepted with task information
    - Frontend should poll assessment endpoint to check for ai_recommendations field

    Args:
        id: Assessment ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        dict: Task dispatch confirmation
    """
    from app.db.models import Assessment
    from app.workers.intelligence_worker import generate_insights_task

    # Verify assessment exists
    assessment = db.query(Assessment).filter(Assessment.id == id).first()

    if not assessment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")

    # Verify assessment is validated (required for insights)
    if assessment.status != AssessmentStatus.VALIDATED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Assessment must be validated to generate insights. Current status: {assessment.status.value}",
        )

    # Check if insights already exist (cached)
    if assessment.ai_recommendations:
        return {
            "message": "AI insights already generated",
            "assessment_id": id,
            "insights_cached": True,
            "status": "completed",
        }

    # Dispatch Celery task for background processing
    task = generate_insights_task.delay(id)

    return {
        "message": "AI insight generation started",
        "assessment_id": id,
        "task_id": task.id,
        "status": "processing",
    }


@router.post(
    "/{assessment_id}/answers",
    response_model=SaveAnswersResponse,
    status_code=status.HTTP_200_OK,
    tags=["assessments"],
)
async def save_assessment_answers(
    assessment_id: int,
    request_body: SaveAnswersRequest,
    indicator_id: int = Query(..., description="ID of the indicator"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> SaveAnswersResponse:
    """
    Save form responses for an assessment.

    **Permissions**:
    - BLGU users can save answers for their own assessments
    - Assessors can save answers (for table validation)

    **Path Parameters**:
    - assessment_id: ID of the assessment

    **Query Parameters**:
    - indicator_id: ID of the indicator

    **Request Body**:
    ```json
    {
      "responses": [
        {"field_id": "field1", "value": "text response"},
        {"field_id": "field2", "value": 42},
        {"field_id": "field3", "value": ["option1", "option2"]}
      ]
    }
    ```

    **Field Type Validation**:
    - text/textarea: value must be string
    - number: value must be numeric (int or float)
    - date: value must be ISO date string
    - select/radio: value must be string matching one of the field's option IDs
    - checkbox: value must be array of strings matching the field's option IDs

    **Returns**: Confirmation with count of saved fields

    **Raises**:
    - 400: Assessment is locked for editing
    - 403: User not authorized to modify this assessment
    - 404: Assessment or indicator not found
    - 422: Field validation errors (field not found, type mismatch, invalid option)
    """
    from app.db.models import Assessment
    from app.db.models.governance_area import Indicator

    # Retrieve assessment
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with ID {assessment_id} not found",
        )

    # Permission check: BLGU users can only save their own assessments
    # Assessors can save for any assessment (for table validation)
    if current_user.role == UserRole.BLGU_USER:
        if assessment.blgu_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to modify this assessment",
            )
    # Assessors and other roles are allowed

    # Status check: Only DRAFT or NEEDS_REWORK assessments can be edited
    locked_statuses = [
        AssessmentStatus.SUBMITTED_FOR_REVIEW,
        AssessmentStatus.VALIDATED,
    ]
    if assessment.status in locked_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Assessment is locked for editing. Current status: {assessment.status.value}",
        )

    # Retrieve indicator and form_schema for validation
    indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()

    if not indicator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Indicator with ID {indicator_id} not found",
        )

    # Parse form_schema to extract field definitions
    form_schema = indicator.form_schema or {}

    # Extract field definitions from form_schema
    fields = form_schema.get("fields", [])
    field_map = {field.get("field_id", field.get("id")): field for field in fields}

    # Extract field responses from request body
    field_responses = request_body.responses

    # Validate each field response
    validation_errors = []

    for response in field_responses:
        field_id = response.field_id
        value = response.value

        # Check if field_id exists in form_schema
        if field_id not in field_map:
            validation_errors.append(
                {
                    "field_id": field_id,
                    "error": f"Field '{field_id}' not found in form schema",
                }
            )
            continue

        field_definition = field_map[field_id]
        field_type = field_definition.get("type")

        # Validate value type matches field type
        if field_type == "text" or field_type == "textarea":
            if not isinstance(value, str):
                validation_errors.append(
                    {
                        "field_id": field_id,
                        "error": f"Field '{field_id}' expects string value, got {type(value).__name__}",
                    }
                )

        elif field_type == "number":
            if not isinstance(value, (int, float)):
                validation_errors.append(
                    {
                        "field_id": field_id,
                        "error": f"Field '{field_id}' expects numeric value, got {type(value).__name__}",
                    }
                )

        elif field_type == "date":
            if not isinstance(value, str):
                validation_errors.append(
                    {
                        "field_id": field_id,
                        "error": f"Field '{field_id}' expects date string (ISO format), got {type(value).__name__}",
                    }
                )
            # Note: Additional date format validation can be added here

        elif field_type == "select" or field_type == "radio":
            # For select/radio, value should be a string matching one of the options
            if not isinstance(value, str):
                validation_errors.append(
                    {
                        "field_id": field_id,
                        "error": f"Field '{field_id}' expects string value (option ID), got {type(value).__name__}",
                    }
                )
            else:
                # Validate that selected option exists
                options = field_definition.get("options", [])
                option_ids = [opt.get("id") for opt in options]
                if value not in option_ids:
                    validation_errors.append(
                        {
                            "field_id": field_id,
                            "error": f"Field '{field_id}' has invalid option '{value}'. Valid options: {option_ids}",
                        }
                    )

        elif field_type == "checkbox":
            # For checkbox, value should be an array of option IDs
            if not isinstance(value, list):
                validation_errors.append(
                    {
                        "field_id": field_id,
                        "error": f"Field '{field_id}' expects array of option IDs, got {type(value).__name__}",
                    }
                )
            else:
                # Validate that all selected options exist
                options = field_definition.get("options", [])
                option_ids = [opt.get("id") for opt in options]
                for selected_option in value:
                    if selected_option not in option_ids:
                        validation_errors.append(
                            {
                                "field_id": field_id,
                                "error": f"Field '{field_id}' has invalid option '{selected_option}'. Valid options: {option_ids}",
                            }
                        )

    # If validation errors found, raise 422
    if validation_errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Field validation failed", "errors": validation_errors},
        )

    # Upsert assessment_response record
    from app.db.models.assessment import AssessmentResponse

    # Check if assessment_response already exists for this assessment + indicator
    existing_response = (
        db.query(AssessmentResponse)
        .filter(
            AssessmentResponse.assessment_id == assessment_id,
            AssessmentResponse.indicator_id == indicator_id,
        )
        .first()
    )

    # Build response_data dictionary from field responses
    response_data = {response.field_id: response.value for response in field_responses}

    if existing_response:
        # Update existing record
        existing_response.response_data = response_data
        existing_response.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_response)
    else:
        # Create new record
        new_response = AssessmentResponse(
            assessment_id=assessment_id,
            indicator_id=indicator_id,
            response_data=response_data,
            is_completed=False,  # Will be set to True when all required fields are filled
            requires_rework=False,
        )
        db.add(new_response)
        db.commit()
        db.refresh(new_response)

    return SaveAnswersResponse(
        message="Responses saved successfully",
        assessment_id=assessment_id,
        indicator_id=indicator_id,
        saved_count=len(field_responses),
    )


@router.get(
    "/{assessment_id}/answers",
    response_model=GetAnswersResponse,
    status_code=status.HTTP_200_OK,
    tags=["assessments"],
)
async def get_assessment_answers(
    assessment_id: int,
    indicator_id: int = Query(..., description="ID of the indicator"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> GetAnswersResponse:
    """
    Retrieve saved form responses for a specific indicator in an assessment.

    **Permissions**:
    - BLGU users can retrieve answers for their own assessments
    - Assessors can retrieve answers for any assessment

    **Path Parameters**:
    - assessment_id: ID of the assessment

    **Query Parameters**:
    - indicator_id: ID of the indicator

    **Returns**:
    ```json
    {
      "assessment_id": 1,
      "indicator_id": 5,
      "responses": [
        {"field_id": "field1", "value": "text response"},
        {"field_id": "field2", "value": 42}
      ],
      "created_at": "2025-01-08T12:00:00",
      "updated_at": "2025-01-08T12:30:00"
    }
    ```

    Returns empty array if no responses saved yet.

    **Raises**:
    - 403: User not authorized to view this assessment
    - 404: Assessment not found
    """
    from app.db.models import Assessment

    # Retrieve assessment
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with ID {assessment_id} not found",
        )

    # Permission check: BLGU users can only view their own assessments
    # Assessors can view any assessment
    if current_user.role == UserRole.BLGU_USER:
        if assessment.blgu_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view this assessment",
            )
    # Assessors and other roles are allowed

    # Query assessment_response for this assessment + indicator
    from app.db.models.assessment import AssessmentResponse

    assessment_response = (
        db.query(AssessmentResponse)
        .filter(
            AssessmentResponse.assessment_id == assessment_id,
            AssessmentResponse.indicator_id == indicator_id,
        )
        .first()
    )

    # If no response exists yet, return empty array
    if not assessment_response or not assessment_response.response_data:
        return GetAnswersResponse(
            assessment_id=assessment_id, indicator_id=indicator_id, responses=[]
        )

    # Extract field responses from response_data (stored as dict)
    # Format: {"field_id": value, ...} -> [{"field_id": ..., "value": ...}, ...]
    field_responses = [
        AnswerResponse(field_id=field_id, value=value)
        for field_id, value in assessment_response.response_data.items()
    ]

    return GetAnswersResponse(
        assessment_id=assessment_id,
        indicator_id=indicator_id,
        responses=field_responses,
        created_at=assessment_response.created_at.isoformat() + "Z",
        updated_at=assessment_response.updated_at.isoformat() + "Z",
    )


@router.post(
    "/{assessment_id}/validate-completeness",
    response_model=CompletenessValidationResponse,
    status_code=status.HTTP_200_OK,
    tags=["assessments"],
)
async def validate_assessment_completeness(
    assessment_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> CompletenessValidationResponse:
    """
    Validate completeness of all indicators in an assessment.

    Checks if all required fields are filled for all indicators.
    Does NOT expose compliance status (Pass/Fail) - only completeness.

    **Permissions**: All authenticated users

    **Path Parameters**:
    - assessment_id: ID of the assessment

    **Returns**:
    ```json
    {
      "is_complete": false,
      "total_indicators": 10,
      "complete_indicators": 7,
      "incomplete_indicators": 3,
      "incomplete_details": [
        {
          "indicator_id": 5,
          "indicator_title": "Financial Management",
          "missing_required_fields": ["field1", "field2"]
        }
      ]
    }
    ```

    **Raises**:
    - 404: Assessment not found
    """
    from sqlalchemy.orm import joinedload

    from app.db.models import Assessment
    from app.db.models.assessment import AssessmentResponse
    from app.db.models.governance_area import Indicator

    # Retrieve assessment
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with ID {assessment_id} not found",
        )

    # Retrieve all active indicators, sorted by governance area, sort_order, and indicator_code
    indicators = (
        db.query(Indicator)
        .filter(Indicator.is_active == True)
        .options(joinedload(Indicator.governance_area))
        .order_by(Indicator.governance_area_id, Indicator.sort_order, Indicator.indicator_code)
        .all()
    )

    # Retrieve all assessment_responses for this assessment
    assessment_responses = (
        db.query(AssessmentResponse).filter(AssessmentResponse.assessment_id == assessment_id).all()
    )

    # Create a map of indicator_id -> assessment_response for easy lookup
    response_map = {resp.indicator_id: resp for resp in assessment_responses}

    # Validate completeness for each indicator using the service
    from app.services.completeness_validation_service import (
        CompletenessValidationService,
    )

    completeness_service = CompletenessValidationService()

    # Collect validation results for each indicator
    indicator_results = []

    for indicator in indicators:
        # Get the assessment response for this indicator (if it exists)
        assessment_response = response_map.get(indicator.id)

        # Get response_data and movs
        response_data = assessment_response.response_data if assessment_response else None
        uploaded_movs = assessment_response.movs if assessment_response else []

        # Validate completeness
        validation_result = completeness_service.validate_completeness(
            form_schema=indicator.form_schema,
            response_data=response_data,
            uploaded_movs=uploaded_movs,
        )

        indicator_results.append(
            {
                "indicator": indicator,
                "is_complete": validation_result["is_complete"],
                "missing_fields": validation_result["missing_fields"],
            }
        )

    # Aggregate completeness results across all indicators
    complete_count = sum(1 for r in indicator_results if r["is_complete"])
    incomplete_count = sum(1 for r in indicator_results if not r["is_complete"])

    # Build list of incomplete indicators with missing field details
    incomplete_details = []
    for result in indicator_results:
        if not result["is_complete"]:
            incomplete_details.append(
                IncompleteIndicatorDetail(
                    indicator_id=result["indicator"].id,
                    indicator_title=result["indicator"].name,
                    missing_required_fields=[
                        field["field_id"] for field in result["missing_fields"]
                    ],
                )
            )

    # Determine overall completeness
    is_complete = incomplete_count == 0

    # Return CompletenessValidationResponse
    return CompletenessValidationResponse(
        is_complete=is_complete,
        total_indicators=len(indicators),
        complete_indicators=complete_count,
        incomplete_indicators=incomplete_count,
        incomplete_details=incomplete_details,
    )


# ============================================================================
# Epic 5.0: Submission & Rework Workflow Endpoints
# ============================================================================


@router.post(
    "/{assessment_id}/submit",
    response_model=SubmitAssessmentResponse,
    tags=["assessments"],
    status_code=status.HTTP_200_OK,
)
def submit_assessment(
    assessment_id: int,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db),
) -> SubmitAssessmentResponse:
    """
    Submit an assessment for assessor review (Story 5.5).

    This endpoint allows a BLGU user to submit their completed assessment.
    The assessment must pass validation (all indicators complete, all MOVs uploaded)
    before submission is allowed.

    Authorization:
        - BLGU_USER role required
        - User must own the assessment (assessment.blgu_user_id == user.id)

    Workflow:
        1. Validate user authorization
        2. Validate assessment completeness using SubmissionValidationService
        3. If valid, update status to SUBMITTED and set submitted_at timestamp
        4. Lock assessment for editing (is_locked property becomes True)
        5. Return success response

    Args:
        assessment_id: ID of the assessment to submit
        current_user: Current authenticated user
        db: Database session

    Returns:
        SubmitAssessmentResponse with success status and timestamp

    Raises:
        HTTPException 403: User not authorized to submit this assessment
        HTTPException 400: Assessment validation failed (incomplete or missing MOVs)
        HTTPException 404: Assessment not found
    """
    # Authorization check: must be BLGU_USER
    if current_user.role != UserRole.BLGU_USER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only BLGU users can submit assessments",
        )

    # Load the assessment
    assessment = db.query(Assessment).filter_by(id=assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )

    # Check ownership: user must own this assessment
    if assessment.blgu_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only submit your own assessments",
        )

    # Validate assessment completeness using SubmissionValidationService
    validation_result = submission_validation_service.validate_submission(
        assessment_id=assessment_id, db=db
    )

    if not validation_result.is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": validation_result.error_message,
                "incomplete_indicators": validation_result.incomplete_indicators,
                "missing_movs": validation_result.missing_movs,
            },
        )

    # Update assessment status to SUBMITTED
    assessment.status = AssessmentStatus.SUBMITTED
    assessment.submitted_at = datetime.utcnow()
    db.commit()
    db.refresh(assessment)

    # TODO (Story 5.19): Send notification to assigned assessor

    return SubmitAssessmentResponse(
        success=True,
        message="Assessment submitted successfully",
        assessment_id=assessment.id,
        submitted_at=assessment.submitted_at,
    )


@router.post(
    "/{assessment_id}/request-rework",
    response_model=RequestReworkResponse,
    tags=["assessments"],
    status_code=status.HTTP_200_OK,
)
def request_rework(
    assessment_id: int,
    request_data: RequestReworkRequest,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db),
) -> RequestReworkResponse:
    """
    Request rework on a submitted assessment (Story 5.6).

    This endpoint allows an assessor/validator to request changes to a BLGU submission.
    Only one rework cycle is allowed per assessment (enforced by rework_count check).

    Authorization:
        - ASSESSOR, VALIDATOR, or MLGOO_DILG role required
        - BLGU_USER role is forbidden

    Business Rules:
        - Assessment must be in SUBMITTED status
        - rework_count must be less than 1 (only one rework cycle allowed)
        - Comments are required (min 10 characters)

    Workflow:
        1. Validate user authorization (role check)
        2. Load assessment and check status is SUBMITTED
        3. Check rework_count < 1
        4. Update status to REWORK
        5. Increment rework_count
        6. Record rework_requested_by, rework_requested_at, rework_comments
        7. Unlock assessment for BLGU editing (is_locked becomes False)
        8. Return success response

    Args:
        assessment_id: ID of the assessment to request rework on
        request_data: Request body containing rework comments
        current_user: Current authenticated user
        db: Database session

    Returns:
        RequestReworkResponse with success status and rework details

    Raises:
        HTTPException 403: User not authorized (must be assessor/validator)
        HTTPException 400: Invalid status or rework limit reached
        HTTPException 404: Assessment not found
    """
    # Authorization check: must be ASSESSOR, VALIDATOR, or MLGOO_DILG
    allowed_roles = [UserRole.ASSESSOR, UserRole.VALIDATOR, UserRole.MLGOO_DILG]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only assessors and validators can request rework",
        )

    # Load the assessment
    assessment = db.query(Assessment).filter_by(id=assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )

    # Check assessment status is SUBMITTED
    if assessment.status != AssessmentStatus.SUBMITTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Assessment must be in SUBMITTED status to request rework. Current status: {assessment.status.value}",
        )

    # Check rework limit using model property
    if not assessment.can_request_rework:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rework limit reached. Only one rework cycle is allowed per assessment.",
        )

    # Validate comments (already validated by Pydantic, but double-check)
    comments = request_data.comments.strip()
    if len(comments) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rework comments must be at least 10 characters long",
        )

    # Update assessment to REWORK status
    assessment.status = AssessmentStatus.REWORK
    assessment.rework_count += 1
    assessment.rework_requested_by = current_user.id
    assessment.rework_requested_at = datetime.utcnow()
    assessment.rework_comments = comments

    # CRITICAL: Reset is_completed for indicators WITH feedback (comments or MOV annotations)
    # This ensures the dashboard shows correct completion count during rework
    from app.db.models.assessment import MOVAnnotation

    # Get all MOV annotations grouped by indicator
    mov_file_ids = [mf.id for mf in assessment.mov_files]
    annotations_by_indicator: dict[int, list] = {}

    if mov_file_ids:
        all_annotations = (
            db.query(MOVAnnotation).filter(MOVAnnotation.mov_file_id.in_(mov_file_ids)).all()
        )
        for annotation in all_annotations:
            mov_file = next(
                (mf for mf in assessment.mov_files if mf.id == annotation.mov_file_id),
                None,
            )
            if mov_file:
                indicator_id = mov_file.indicator_id
                if indicator_id not in annotations_by_indicator:
                    annotations_by_indicator[indicator_id] = []
                annotations_by_indicator[indicator_id].append(annotation)

    # Reset is_completed for responses with feedback
    for response in assessment.responses:
        # Check for public feedback comments (non-internal, validation type)
        has_public_comments = any(
            fc.comment_type == "validation" and not fc.is_internal_note and fc.comment
            for fc in response.feedback_comments
        )

        # Check for MOV annotations on this indicator
        has_mov_annotations = (
            response.indicator_id in annotations_by_indicator
            and len(annotations_by_indicator[response.indicator_id]) > 0
        )

        # Reset completion for indicators with feedback
        if has_public_comments or has_mov_annotations:
            response.requires_rework = True
            response.is_completed = False

            # Clear validation status and assessor checklist data
            response.validation_status = None
            if response.response_data:
                response.response_data = {
                    k: v
                    for k, v in response.response_data.items()
                    if not k.startswith("assessor_val_")
                }

    db.commit()
    db.refresh(assessment)

    # TODO (Story 5.19): Send notification to BLGU user with rework comments

    return RequestReworkResponse(
        success=True,
        message="Rework requested successfully",
        assessment_id=assessment.id,
        rework_count=assessment.rework_count,
        rework_requested_at=assessment.rework_requested_at,
    )


@router.post(
    "/{assessment_id}/resubmit",
    response_model=ResubmitAssessmentResponse,
    tags=["assessments"],
    status_code=status.HTTP_200_OK,
)
def resubmit_assessment(
    assessment_id: int,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db),
) -> ResubmitAssessmentResponse:
    """
    Resubmit an assessment after completing rework (Story 5.7).

    This endpoint allows a BLGU user to resubmit their assessment after
    addressing the assessor's rework comments. The assessment must be in
    REWORK status and pass validation again.

    Authorization:
        - BLGU_USER role required
        - User must own the assessment

    Business Rules:
        - Assessment must be in REWORK status
        - Assessment must pass validation (completeness + MOVs)
        - No further rework is allowed after resubmission (rework_count = 1)

    Workflow:
        1. Validate user authorization
        2. Check assessment status is REWORK
        3. Validate completeness using SubmissionValidationService
        4. Update status back to SUBMITTED
        5. Update submitted_at timestamp
        6. Lock assessment again (is_locked becomes True)
        7. Return success response

    Args:
        assessment_id: ID of the assessment to resubmit
        current_user: Current authenticated user
        db: Database session

    Returns:
        ResubmitAssessmentResponse with success status and rework count

    Raises:
        HTTPException 403: User not authorized
        HTTPException 400: Invalid status or validation failed
        HTTPException 404: Assessment not found
    """
    # Authorization check: must be BLGU_USER
    if current_user.role != UserRole.BLGU_USER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only BLGU users can resubmit assessments",
        )

    # Load the assessment
    assessment = db.query(Assessment).filter_by(id=assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )

    # Check ownership
    if assessment.blgu_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only resubmit your own assessments",
        )

    # Check assessment status is REWORK
    if assessment.status != AssessmentStatus.REWORK:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Assessment must be in REWORK status to resubmit. Current status: {assessment.status.value}",
        )

    # Check if this is an MLGOO RE-calibration (distinct from assessor rework)
    is_mlgoo_recalibration = assessment.is_mlgoo_recalibration

    # Validate assessment completeness again
    validation_result = submission_validation_service.validate_submission(
        assessment_id=assessment_id, db=db
    )

    if not validation_result.is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": validation_result.error_message,
                "incomplete_indicators": validation_result.incomplete_indicators,
                "missing_movs": validation_result.missing_movs,
            },
        )

    # MLGOO RE-calibration routes back to MLGOO approval
    # Regular assessor rework routes back to SUBMITTED (for assessor review)
    if is_mlgoo_recalibration:
        assessment.status = AssessmentStatus.AWAITING_MLGOO_APPROVAL
        # Clear MLGOO recalibration flags after resubmission
        assessment.is_mlgoo_recalibration = False
        # Keep mlgoo_recalibration_indicator_ids and comments for audit trail
        assessment.submitted_at = datetime.utcnow()
        import logging

        logging.getLogger(__name__).info(
            f"[MLGOO RECALIBRATION] Assessment {assessment_id} resubmitted - routing to AWAITING_MLGOO_APPROVAL"
        )
    else:
        assessment.status = AssessmentStatus.SUBMITTED
        assessment.submitted_at = datetime.utcnow()

    db.commit()
    db.refresh(assessment)

    # Send notification about resubmission
    if is_mlgoo_recalibration:
        # TODO: Send notification to MLGOO about recalibration resubmission
        import logging

        logging.getLogger(__name__).info(
            f"[MLGOO RECALIBRATION] Notification would be sent for assessment {assessment_id}"
        )
    else:
        # Send notification to assessors about resubmission (Notification #3)
        try:
            from app.workers.notifications import send_rework_resubmission_notification

            send_rework_resubmission_notification.delay(assessment_id)
        except Exception as e:
            import logging

            logging.getLogger(__name__).error(
                f"Failed to queue rework resubmission notification: {e}"
            )

    return ResubmitAssessmentResponse(
        success=True,
        message="Assessment resubmitted successfully",
        assessment_id=assessment.id,
        resubmitted_at=assessment.submitted_at,
        rework_count=assessment.rework_count,
    )


@router.post(
    "/{assessment_id}/submit-for-calibration",
    response_model=ResubmitAssessmentResponse,
    tags=["assessments"],
    status_code=status.HTTP_200_OK,
)
def submit_for_calibration_review(
    assessment_id: int,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db),
) -> ResubmitAssessmentResponse:
    """
    Submit assessment for calibration review (Phase 2 Validator workflow).

    This endpoint is used when a Validator has sent the assessment back for
    calibration (is_calibration_rework=True). Instead of going to SUBMITTED
    (which routes to Assessor), it goes directly to AWAITING_FINAL_VALIDATION
    (which routes back to the Validator).

    The key difference from regular resubmit:
    - Regular resubmit: REWORK -> SUBMITTED -> goes to Assessor
    - Calibration submit: REWORK -> AWAITING_FINAL_VALIDATION -> goes to Validator

    Authorization:
        - BLGU_USER role required
        - User must own the assessment
        - Assessment must have is_calibration_rework=True

    Business Rules:
        - Assessment must be in REWORK status
        - Assessment must have is_calibration_rework=True (set by Validator)
        - Only indicators marked requires_rework need to be re-uploaded
        - After submission, is_calibration_rework is cleared

    Args:
        assessment_id: ID of the assessment to submit for calibration review
        current_user: Current authenticated user
        db: Database session

    Returns:
        ResubmitAssessmentResponse with success status

    Raises:
        HTTPException 403: User not authorized or not calibration mode
        HTTPException 400: Invalid status or validation failed
        HTTPException 404: Assessment not found
    """
    # Authorization check: must be BLGU_USER
    if current_user.role != UserRole.BLGU_USER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only BLGU users can submit for calibration review",
        )

    # Load the assessment
    assessment = db.query(Assessment).filter_by(id=assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )

    # Check ownership
    if assessment.blgu_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only submit your own assessments",
        )

    # Check assessment status is REWORK
    if assessment.status != AssessmentStatus.REWORK:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Assessment must be in REWORK status. Current status: {assessment.status.value}",
        )

    # CRITICAL: Check that this is a calibration rework (from Validator)
    if not assessment.is_calibration_rework:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This assessment was not sent for calibration. Use the regular 'resubmit' endpoint instead.",
        )

    # Validate only the indicators that were marked for calibration
    # Get all responses that have requires_rework=True
    rework_responses = [r for r in assessment.responses if r.requires_rework]

    if not rework_responses:
        # No indicators need rework - this shouldn't happen normally
        # but just in case, allow the submission
        pass
    else:
        # Validate only the rework indicators using completeness check
        from app.db.models.assessment import MOVAnnotation, MOVFile
        from app.services.completeness_validation_service import (
            completeness_validation_service,
        )

        # Get calibration timestamp for filtering MOVs (same logic as storage_service)
        calibration_requested_at = (
            assessment.calibration_requested_at or assessment.rework_requested_at
        )

        incomplete_indicators = []
        for response in rework_responses:
            # Get indicator's form schema
            indicator = response.indicator
            if not indicator:
                continue

            form_schema = indicator.form_schema

            # Get MOVs for this indicator - MUST filter out soft-deleted files
            # Query directly to ensure we get fresh data and proper filtering
            indicator_movs = (
                db.query(MOVFile)
                .filter(
                    MOVFile.assessment_id == assessment_id,
                    MOVFile.indicator_id == response.indicator_id,
                    MOVFile.deleted_at.is_(None),
                )
                .all()
            )

            # Apply timestamp filtering only if indicator has feedback
            # This matches the logic in storage_service.py for consistency
            if calibration_requested_at and indicator_movs:
                # Check for feedback comments (non-internal)
                feedback_count = (
                    db.query(FeedbackComment)
                    .filter(
                        FeedbackComment.response_id == response.id,
                        FeedbackComment.is_internal_note == False,
                    )
                    .count()
                )

                # Check for MOV annotations
                annotation_count = (
                    db.query(MOVAnnotation)
                    .join(MOVFile)
                    .filter(
                        MOVFile.assessment_id == assessment_id,
                        MOVFile.indicator_id == response.indicator_id,
                    )
                    .count()
                )

                has_feedback = feedback_count > 0 or annotation_count > 0

                # Only filter MOVs by timestamp if indicator has assessor feedback
                # Indicators without feedback keep their old files (old files still valid)
                if has_feedback:
                    indicator_movs = [
                        mf
                        for mf in indicator_movs
                        if mf.uploaded_at and mf.uploaded_at >= calibration_requested_at
                    ]

            # Validate using the completeness service
            validation = completeness_validation_service.validate_completeness(
                form_schema=form_schema,
                response_data=response.response_data,
                uploaded_movs=indicator_movs,
            )

            if not validation.get("is_complete", False):
                incomplete_indicators.append(
                    {
                        "indicator_id": response.indicator_id,
                        "indicator_name": indicator.name,
                        "missing_fields": validation.get("missing_fields", []),
                    }
                )

        if incomplete_indicators:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": f"{len(incomplete_indicators)} indicator(s) still incomplete",
                    "incomplete_indicators": incomplete_indicators,
                },
            )

    # Update assessment status to AWAITING_FINAL_VALIDATION (goes to Validator, not Assessor)
    assessment.status = AssessmentStatus.AWAITING_FINAL_VALIDATION
    assessment.submitted_at = datetime.utcnow()

    # PARALLEL CALIBRATION: Mark all pending calibrations as approved
    # This signals that BLGU has addressed all calibration requests
    pending_calibrations = assessment.pending_calibrations or []
    validator_ids_to_notify = []

    if pending_calibrations:
        from sqlalchemy.orm.attributes import flag_modified

        updated_calibrations = []
        for pc in pending_calibrations:
            # Mark as approved
            pc["approved"] = True
            pc["approved_at"] = datetime.now(UTC).isoformat()
            updated_calibrations.append(pc)

            # Collect validator IDs to notify
            validator_id = pc.get("validator_id")
            if validator_id and validator_id not in validator_ids_to_notify:
                validator_ids_to_notify.append(validator_id)

        assessment.pending_calibrations = updated_calibrations
        # CRITICAL: Flag the JSON column as modified so SQLAlchemy detects the change
        flag_modified(assessment, "pending_calibrations")

    # Clear calibration flags after successful submission
    assessment.is_calibration_rework = False
    # Keep calibration_validator_id for backward compatibility

    # Clear requires_rework AND validation_status on the indicators that were calibrated
    # IMPORTANT: Clear validation_status so the Validator can re-review these indicators
    # Without this, the queue logic will skip the assessment (thinking validator already completed)
    # Also clear response_data (validator's checklist) so they can re-validate from scratch
    for response in rework_responses:
        response.requires_rework = False
        response.validation_status = None  # Reset so Validator can re-validate
        response.response_data = {}  # Reset validator's checklist so they can re-verify

    # CRITICAL: Delete old feedback comments for calibrated responses
    # When BLGU resubmits for calibration, validator's old comments should be cleared
    # so they can provide fresh feedback on the new submission
    rework_response_ids = [r.id for r in rework_responses]
    if rework_response_ids:
        db.query(FeedbackComment).filter(
            FeedbackComment.response_id.in_(rework_response_ids)
        ).delete(synchronize_session="fetch")

    # Store legacy validator_id before clearing (we need it for notification)
    legacy_validator_id = assessment.calibration_validator_id

    db.commit()
    db.refresh(assessment)

    # PARALLEL CALIBRATION: Notify ALL validators who requested calibration
    notification_count = 0
    if validator_ids_to_notify:
        try:
            from app.workers.notifications import (
                send_calibration_resubmission_notification,
            )

            for vid in validator_ids_to_notify:
                send_calibration_resubmission_notification.delay(assessment_id, vid)
                notification_count += 1
        except Exception as e:
            import logging

            logging.getLogger(__name__).error(
                f"Failed to queue calibration resubmission notification: {e}"
            )
    elif legacy_validator_id:
        # Fallback for legacy single-validator calibration
        try:
            from app.workers.notifications import (
                send_calibration_resubmission_notification,
            )

            send_calibration_resubmission_notification.delay(assessment_id, legacy_validator_id)
            notification_count = 1
        except Exception as e:
            import logging

            logging.getLogger(__name__).error(
                f"Failed to queue calibration resubmission notification: {e}"
            )

    # Build message based on number of validators notified
    if notification_count > 1:
        message = f"Assessment submitted for calibration review. {notification_count} validators will be notified."
    else:
        message = (
            "Assessment submitted for calibration review. It will be reviewed by the Validator."
        )

    return ResubmitAssessmentResponse(
        success=True,
        message=message,
        assessment_id=assessment.id,
        resubmitted_at=assessment.submitted_at,
        rework_count=assessment.rework_count,
    )


@router.get(
    "/{assessment_id}/submission-status",
    response_model=SubmissionStatusResponse,
    tags=["assessments"],
    status_code=status.HTTP_200_OK,
)
def get_submission_status(
    assessment_id: int,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db),
) -> SubmissionStatusResponse:
    """
    Get the submission status of an assessment (Story 5.8).

    This endpoint provides comprehensive information about an assessment's submission state,
    including:
    - Current status (DRAFT, SUBMITTED, IN_REVIEW, REWORK, COMPLETED)
    - Whether the assessment is locked for editing
    - Rework information (count, comments, timestamp, requester)
    - Validation results (completeness check)

    This allows BLGU users to:
    - Check what needs to be completed before submission
    - View rework feedback from assessors
    - Understand current assessment state

    This allows Assessors to:
    - Check assessment status before taking action
    - View validation details

    Authorization:
    - BLGU_USER: Can only check their own assessments
    - ASSESSOR/VALIDATOR/MLGOO_DILG: Can check any assessment

    Args:
        assessment_id: The ID of the assessment to check
        current_user: Current authenticated user
        db: Database session

    Returns:
        SubmissionStatusResponse with comprehensive status information

    Raises:
        HTTPException 404: Assessment not found
        HTTPException 403: BLGU user trying to access another barangay's assessment
    """
    # Load the assessment
    assessment = db.query(Assessment).filter_by(id=assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )

    # Authorization check
    # BLGU users can only check their own assessments
    if current_user.role == UserRole.BLGU_USER:
        if assessment.blgu_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only check the status of your own assessments",
            )

    # Assessors/Validators can check any assessment (no additional check needed)

    # Run validation check to get current completeness status
    validation_result = submission_validation_service.validate_submission(
        assessment_id=assessment_id, db=db
    )

    # Return comprehensive status response
    return SubmissionStatusResponse(
        assessment_id=assessment.id,
        status=assessment.status,
        is_locked=assessment.is_locked,
        rework_count=assessment.rework_count,
        rework_comments=assessment.rework_comments,
        rework_requested_at=assessment.rework_requested_at,
        rework_requested_by=assessment.rework_requested_by,
        validation_result=validation_result,
    )


@router.get(
    "/{assessment_id}/rework-summary",
    response_model=ReworkSummaryResponse,
    tags=["assessments"],
)
async def get_rework_summary(
    assessment_id: int,
    language: str = Query(
        None,
        description="Language code for the summary: ceb (Bisaya), fil (Tagalog), en (English). Defaults to user's preferred language.",
    ),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_current_blgu_user),
) -> ReworkSummaryResponse:
    """
    Get AI-generated rework summary for an assessment in the specified language.

    This endpoint retrieves the comprehensive AI-generated summary of rework
    requirements for a BLGU user's assessment. The summary includes:
    - Overall summary of main issues
    - Per-indicator breakdowns with key issues and suggested actions
    - Priority actions to address first
    - Estimated time to complete all rework

    Supports multiple languages:
    - ceb: Bisaya (Cebuano) - Default
    - fil: Tagalog (Filipino)
    - en: English

    The summary is generated asynchronously when the assessor requests rework.
    Bisaya and English summaries are generated upfront; Tagalog is generated on-demand.

    Authorization:
        - BLGU users can only access summaries for their own assessments

    Args:
        assessment_id: ID of the assessment
        language: Language code (ceb, fil, en). Defaults to user's preferred_language.
        db: Database session
        current_user: Current authenticated BLGU user

    Returns:
        ReworkSummaryResponse with comprehensive rework guidance in the requested language

    Raises:
        HTTPException 404: Assessment not found or no rework summary available
        HTTPException 403: BLGU user trying to access another barangay's assessment
        HTTPException 400: Assessment is not in rework status
    """
    # Load the assessment
    assessment = db.query(Assessment).filter_by(id=assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )

    # Authorization check: BLGU users can only access their own assessments
    if assessment.blgu_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access rework summaries for your own assessments",
        )

    # Check if assessment is in rework status
    if assessment.status != AssessmentStatus.REWORK:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Assessment is not in rework status. Current status: {assessment.status.value}",
        )

    # Check if rework summary exists
    if not assessment.rework_summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rework summary is still being generated. Please try again in a few moments.",
        )

    # Determine target language (parameter > user preference > default)
    target_lang = language or current_user.preferred_language or "ceb"

    # Validate language code
    if target_lang not in ["ceb", "fil", "en"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid language code: {target_lang}. Use 'ceb', 'fil', or 'en'.",
        )

    # Handle the rework summary data structure
    summary_data = assessment.rework_summary

    # Check if it's the new multi-language format (keyed by language code)
    if isinstance(summary_data, dict) and target_lang in summary_data:
        return ReworkSummaryResponse(**summary_data[target_lang])

    # Check for legacy format (direct summary without language key)
    if isinstance(summary_data, dict) and "overall_summary" in summary_data:
        # Legacy format - return as-is (it's in English)
        if target_lang == "en":
            return ReworkSummaryResponse(**summary_data)
        # For other languages, we need to generate on-demand
        # Fall through to on-demand generation

    # Check if the requested language exists in multi-language format
    if isinstance(summary_data, dict):
        # Try to find any available language as fallback
        for fallback_lang in ["ceb", "en", "fil"]:
            if fallback_lang in summary_data:
                # Return available language with a note
                return ReworkSummaryResponse(**summary_data[fallback_lang])

    # If we get here, generate on-demand (for Tagalog or missing languages)
    from app.services.intelligence_service import intelligence_service

    try:
        new_summary = intelligence_service.generate_single_language_summary(
            db, assessment_id, target_lang
        )

        # Store the new language version
        if not isinstance(assessment.rework_summary, dict):
            assessment.rework_summary = {}
        assessment.rework_summary[target_lang] = new_summary
        db.commit()
        db.refresh(assessment)

        return ReworkSummaryResponse(**new_summary)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary in {target_lang}: {str(e)}",
        )


@router.get(
    "/{assessment_id}/calibration-summary",
    response_model=CalibrationSummaryResponse,
    tags=["assessments"],
)
async def get_calibration_summary(
    assessment_id: int,
    language: str = Query(
        None,
        description="Language code for the summary: ceb (Bisaya), fil (Tagalog), en (English). Defaults to user's preferred language.",
    ),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(get_current_blgu_user),
) -> CalibrationSummaryResponse:
    """
    Get AI-generated calibration summary for an assessment in the specified language.

    This endpoint retrieves the comprehensive AI-generated summary of calibration
    requirements for a BLGU user's assessment. Unlike rework summaries which cover
    all indicators, calibration summaries focus only on indicators in the validator's
    governance area that were marked as FAIL (Unmet).

    The summary includes:
    - Overall summary of main issues in the specific governance area
    - Per-indicator breakdowns with key issues and suggested actions
    - Priority actions to address first
    - Estimated time to complete calibration corrections

    Supports multiple languages:
    - ceb: Bisaya (Cebuano) - Default
    - fil: Tagalog (Filipino)
    - en: English

    The summary is generated asynchronously when the validator requests calibration.
    Bisaya and English summaries are generated upfront; Tagalog is generated on-demand.

    Authorization:
        - BLGU users can only access summaries for their own assessments

    Args:
        assessment_id: ID of the assessment
        language: Language code (ceb, fil, en). Defaults to user's preferred_language.
        db: Database session
        current_user: Current authenticated BLGU user

    Returns:
        CalibrationSummaryResponse with comprehensive calibration guidance in the requested language

    Raises:
        HTTPException 404: Assessment not found or no calibration summary available
        HTTPException 403: BLGU user trying to access another barangay's assessment
        HTTPException 400: Assessment is not in calibration/rework status or not a calibration
    """
    # Load the assessment
    assessment = db.query(Assessment).filter_by(id=assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )

    # Authorization check: BLGU users can only access their own assessments
    if assessment.blgu_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access calibration summaries for your own assessments",
        )

    # Check if assessment is in rework status with calibration flag
    if assessment.status != AssessmentStatus.REWORK:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Assessment is not in rework status. Current status: {assessment.status.value}",
        )

    if not assessment.is_calibration_rework:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This assessment is not a calibration. Use the rework-summary endpoint instead.",
        )

    # Check if calibration summary exists
    if not assessment.calibration_summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calibration summary is still being generated. Please try again in a few moments.",
        )

    # Determine target language (parameter > user preference > default)
    target_lang = language or current_user.preferred_language or "ceb"

    # Validate language code
    if target_lang not in ["ceb", "fil", "en"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid language code: {target_lang}. Use 'ceb', 'fil', or 'en'.",
        )

    # Handle the calibration summary data structure
    summary_data = assessment.calibration_summary

    # Check if it's the new multi-language format (keyed by language code)
    if isinstance(summary_data, dict) and target_lang in summary_data:
        return CalibrationSummaryResponse(**summary_data[target_lang])

    # Check for legacy format (direct summary without language key)
    if isinstance(summary_data, dict) and "overall_summary" in summary_data:
        # Legacy format - return as-is (it's in English)
        if target_lang == "en":
            return CalibrationSummaryResponse(**summary_data)
        # For other languages, we need to generate on-demand
        # Fall through to on-demand generation

    # Check if the requested language exists in multi-language format
    if isinstance(summary_data, dict):
        # Try to find any available language as fallback
        for fallback_lang in ["ceb", "en", "fil"]:
            if fallback_lang in summary_data:
                # Return available language with a note
                return CalibrationSummaryResponse(**summary_data[fallback_lang])

    # If we get here, generate on-demand (for Tagalog or missing languages)
    from app.services.intelligence_service import intelligence_service

    # Get the governance area ID from the calibration data
    governance_area_id = None

    # First, try to get from the validator relationship
    if assessment.calibration_validator:
        governance_area_id = assessment.calibration_validator.validator_area_id

    # If not found, try to get from stored summary
    if not governance_area_id and isinstance(summary_data, dict):
        for lang_data in summary_data.values():
            if isinstance(lang_data, dict) and "governance_area_id" in lang_data:
                governance_area_id = lang_data["governance_area_id"]
                break

    if not governance_area_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not determine governance area for calibration summary generation",
        )

    try:
        new_summary = intelligence_service.generate_single_language_calibration_summary(
            db, assessment_id, governance_area_id, target_lang
        )

        # Store the new language version
        if not isinstance(assessment.calibration_summary, dict):
            assessment.calibration_summary = {}
        assessment.calibration_summary[target_lang] = new_summary
        db.commit()
        db.refresh(assessment)

        return CalibrationSummaryResponse(**new_summary)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate calibration summary in {target_lang}: {str(e)}",
        )
