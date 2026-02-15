# 🔒 Admin API Routes
# Administrative endpoints for MLGOO-DILG users (audit logs, system configuration)

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_mlgoo_dilg
from app.core.year_resolver import get_year_resolver
from app.db.models.user import User
from app.schemas.admin import (
    AdminSuccessResponse,
    AssessmentCycleCreate,
    AssessmentCycleResponse,
    AssessmentCycleUpdate,
    AuditLogListResponse,
    AuditLogResponse,
    AutoSubmitDetail,
    AutoSubmitResponse,
    BarangayDeadlineStatusResponse,
    DeadlineOverrideCreate,
    DeadlineOverrideListResponse,
    DeadlineOverrideResponse,
    DeadlineStatusListResponse,
    PhaseStatusResponse,
)
from app.services.audit_service import audit_service
from app.services.deadline_service import deadline_service

router = APIRouter()


# ============================================================================
# Audit Log Endpoints
# ============================================================================


@router.get(
    "/audit-logs",
    response_model=AuditLogListResponse,
    tags=["admin"],
    summary="Get audit logs with filtering",
    description="Retrieve audit logs with optional filtering by user, entity type, action, and date range. Requires MLGOO_DILG role.",
)
async def get_audit_logs(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records to return"),
    user_id: int | None = Query(None, description="Filter by user ID"),
    entity_type: str | None = Query(
        None, description="Filter by entity type (e.g., 'indicator', 'bbi')"
    ),
    entity_id: int | None = Query(None, description="Filter by entity ID"),
    action: str | None = Query(
        None, description="Filter by action (e.g., 'create', 'update', 'delete')"
    ),
    start_date: datetime | None = Query(None, description="Filter from date (inclusive)"),
    end_date: datetime | None = Query(None, description="Filter to date (inclusive)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Get audit logs with optional filtering and pagination.

    **Authentication:** Requires MLGOO_DILG role.

    **Filters:**
    - `user_id`: Filter by the user who performed the action
    - `entity_type`: Filter by type of entity (indicator, bbi, deadline_override, etc.)
    - `entity_id`: Filter by specific entity ID
    - `action`: Filter by action type (create, update, delete, deactivate)
    - `start_date`: Filter from this date (inclusive)
    - `end_date`: Filter to this date (inclusive)

    **Returns:**
    - Paginated list of audit logs with user details
    - Total count of matching records
    """
    audit_logs, total = audit_service.get_audit_logs(
        db=db,
        skip=skip,
        limit=limit,
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        start_date=start_date,
        end_date=end_date,
    )

    # Enrich audit logs with user information
    enriched_logs = []
    for log in audit_logs:
        log_dict = {
            "id": log.id,
            "user_id": log.user_id,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "action": log.action,
            "changes": log.changes,
            "ip_address": log.ip_address,
            "created_at": log.created_at,
            "user_email": log.user.email if log.user else None,
            "user_name": log.user.name if log.user else None,
        }
        enriched_logs.append(AuditLogResponse(**log_dict))

    return AuditLogListResponse(items=enriched_logs, total=total, skip=skip, limit=limit)


@router.get(
    "/audit-logs/{log_id}",
    response_model=AuditLogResponse,
    tags=["admin"],
    summary="Get a single audit log by ID",
    description="Retrieve details of a specific audit log entry. Requires MLGOO_DILG role.",
)
async def get_audit_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Get a single audit log entry by ID.

    **Authentication:** Requires MLGOO_DILG role.

    **Returns:**
    - Audit log details with user information
    """
    from fastapi import HTTPException, status

    log = audit_service.get_audit_log_by_id(db, log_id)
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audit log with ID {log_id} not found",
        )

    return AuditLogResponse(
        id=log.id,
        user_id=log.user_id,
        entity_type=log.entity_type,
        entity_id=log.entity_id,
        action=log.action,
        changes=log.changes,
        ip_address=log.ip_address,
        created_at=log.created_at,
        user_email=log.user.email if log.user else None,
        user_name=log.user.name if log.user else None,
    )


@router.get(
    "/audit-logs/entity/{entity_type}/{entity_id}",
    response_model=list[AuditLogResponse],
    tags=["admin"],
    summary="Get audit history for a specific entity",
    description="Retrieve complete audit history for a specific entity (e.g., all changes to a particular indicator). Requires MLGOO_DILG role.",
)
async def get_entity_audit_history(
    entity_type: str,
    entity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Get the complete audit history for a specific entity.

    **Authentication:** Requires MLGOO_DILG role.

    **Parameters:**
    - `entity_type`: Type of entity (e.g., "indicator", "bbi", "deadline_override")
    - `entity_id`: ID of the entity

    **Returns:**
    - List of all audit log entries for the entity, ordered by most recent first
    """
    logs = audit_service.get_entity_history(db, entity_type, entity_id)

    enriched_logs = []
    for log in logs:
        enriched_logs.append(
            AuditLogResponse(
                id=log.id,
                user_id=log.user_id,
                entity_type=log.entity_type,
                entity_id=log.entity_id,
                action=log.action,
                changes=log.changes,
                ip_address=log.ip_address,
                created_at=log.created_at,
                user_email=log.user.email if log.user else None,
                user_name=log.user.name if log.user else None,
            )
        )

    return enriched_logs


@router.get(
    "/audit-logs/export",
    tags=["admin"],
    summary="Export audit logs to CSV",
    description="Export filtered audit logs to CSV format. Requires MLGOO_DILG role.",
)
async def export_audit_logs_csv(
    user_id: int | None = Query(None),
    entity_type: str | None = Query(None),
    entity_id: int | None = Query(None),
    action: str | None = Query(None),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Export audit logs to CSV with optional filtering.

    **Authentication:** Requires MLGOO_DILG role.

    **Returns:**
    - CSV file with audit log data
    """
    import csv
    import io

    from fastapi.responses import StreamingResponse

    # Get all matching audit logs (no pagination limit for export)
    audit_logs, _ = audit_service.get_audit_logs(
        db=db,
        skip=0,
        limit=10000,  # High limit for export
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        start_date=start_date,
        end_date=end_date,
    )

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow(
        [
            "ID",
            "Timestamp",
            "User ID",
            "User Email",
            "User Name",
            "Entity Type",
            "Entity ID",
            "Action",
            "IP Address",
            "Changes",
        ]
    )

    # Write data rows
    for log in audit_logs:
        writer.writerow(
            [
                log.id,
                log.created_at.isoformat() + "Z",
                log.user_id,
                log.user.email if log.user else "",
                log.user.name if log.user else "",
                log.entity_type,
                log.entity_id or "",
                log.action,
                log.ip_address or "",
                str(log.changes) if log.changes else "",
            ]
        )

    # Create response with CSV data
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=audit_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        },
    )


# ============================================================================
# Assessment Cycle Management Endpoints
# ============================================================================


@router.post(
    "/cycles",
    response_model=AssessmentCycleResponse,
    tags=["admin"],
    summary="Create a new assessment cycle",
    description="Create a new assessment cycle with phase deadlines. Deactivates any existing active cycle. Requires MLGOO_DILG role.",
    status_code=201,
)
async def create_assessment_cycle(
    cycle_data: AssessmentCycleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Create a new assessment cycle.

    **Authentication:** Requires MLGOO_DILG role.

    **Validations:**
    - Deadlines must be in chronological order: phase1 < rework < phase2 < calibration
    - Automatically deactivates any existing active cycle

    **Returns:**
    - The newly created assessment cycle
    """
    from fastapi import HTTPException, status

    try:
        cycle = deadline_service.create_assessment_cycle(
            db=db,
            name=cycle_data.name,
            year=cycle_data.year,
            phase1_deadline=cycle_data.phase1_deadline,
            rework_deadline=cycle_data.rework_deadline,
            phase2_deadline=cycle_data.phase2_deadline,
            calibration_deadline=cycle_data.calibration_deadline,
        )
        return AssessmentCycleResponse.model_validate(cycle)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/cycles/active",
    response_model=AssessmentCycleResponse,
    tags=["admin"],
    summary="Get the active assessment cycle",
    description="Retrieve the currently active assessment cycle. Requires MLGOO_DILG role.",
)
async def get_active_cycle(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Get the currently active assessment cycle.

    **Authentication:** Requires MLGOO_DILG role.

    **Returns:**
    - The active assessment cycle, or 404 if no cycle is active
    """
    from fastapi import HTTPException, status

    cycle = deadline_service.get_active_cycle(db)
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active assessment cycle found",
        )

    return AssessmentCycleResponse.model_validate(cycle)


@router.get(
    "/cycles",
    response_model=list[AssessmentCycleResponse],
    tags=["admin"],
    summary="List all assessment cycles",
    description="Retrieve all assessment cycles, ordered by year (most recent first). Requires MLGOO_DILG role.",
)
async def list_assessment_cycles(
    include_inactive: bool = Query(
        True,
        description="Whether to include inactive cycles",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    List all assessment cycles.

    **Authentication:** Requires MLGOO_DILG role.

    **Returns:**
    - List of all assessment cycles, ordered by year (most recent first)
    """
    cycles = deadline_service.list_cycles(db, include_inactive=include_inactive)
    return [AssessmentCycleResponse.model_validate(cycle) for cycle in cycles]


@router.put(
    "/cycles/{cycle_id}",
    response_model=AssessmentCycleResponse,
    tags=["admin"],
    summary="Update an assessment cycle",
    description="Update cycle metadata and deadlines. Deadline updates only allowed before cycle starts. Requires MLGOO_DILG role.",
)
async def update_assessment_cycle(
    cycle_id: int,
    cycle_data: AssessmentCycleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Update an existing assessment cycle.

    **Authentication:** Requires MLGOO_DILG role.

    **Restrictions:**
    - Deadline updates only allowed if cycle hasn't started yet (phase1_deadline is in the future)
    - Name and year can always be updated

    **Validations:**
    - If deadlines are updated, they must remain in chronological order

    **Returns:**
    - The updated assessment cycle
    """
    from fastapi import HTTPException, status

    try:
        cycle = deadline_service.update_cycle(
            db=db,
            cycle_id=cycle_id,
            name=cycle_data.name,
            year=cycle_data.year,
            phase1_deadline=cycle_data.phase1_deadline,
            rework_deadline=cycle_data.rework_deadline,
            phase2_deadline=cycle_data.phase2_deadline,
            calibration_deadline=cycle_data.calibration_deadline,
        )
        return AssessmentCycleResponse.model_validate(cycle)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# ============================================================================
# Deadline Status & Override Endpoints
# ============================================================================


@router.get(
    "/deadlines/status",
    response_model=DeadlineStatusListResponse,
    tags=["admin"],
    summary="Get deadline status for all barangays",
    description="Get submission status for all barangays across all phases (phase1, rework, phase2, calibration). Requires MLGOO_DILG role.",
)
async def get_deadline_status(
    cycle_id: int | None = Query(None, description="Filter by cycle ID (defaults to active cycle)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Get deadline status for all barangays across all assessment phases.

    **Authentication:** Requires MLGOO_DILG role.

    **Status Types:**
    - `submitted_on_time`: Submitted before deadline
    - `submitted_late`: Submitted after deadline but accepted
    - `pending`: Not submitted, deadline not yet passed
    - `overdue`: Not submitted, deadline passed

    **Returns:**
    - List of barangay deadline statuses with phase-by-phase breakdown
    - Total count of barangays
    """
    status_data = deadline_service.get_deadline_status(db, cycle_id)

    # Convert to response format
    items = []
    for status in status_data:
        # Convert nested phase dictionaries to PhaseStatusResponse objects
        barangay_status = BarangayDeadlineStatusResponse(
            barangay_id=status["barangay_id"],
            barangay_name=status["barangay_name"],
            cycle_id=status["cycle_id"],
            cycle_name=status["cycle_name"],
            phase1=PhaseStatusResponse(**status["phase1"]),
            rework=PhaseStatusResponse(**status["rework"]),
            phase2=PhaseStatusResponse(**status["phase2"]),
            calibration=PhaseStatusResponse(**status["calibration"]),
        )
        items.append(barangay_status)

    return DeadlineStatusListResponse(items=items, total=len(items))


@router.post(
    "/deadlines/override",
    response_model=DeadlineOverrideResponse,
    tags=["admin"],
    summary="Apply a deadline override",
    description="Extend a deadline for a specific barangay and indicator. Requires MLGOO_DILG role.",
    status_code=201,
)
async def apply_deadline_override(
    override_data: DeadlineOverrideCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Apply a deadline override for a specific barangay and indicator.

    **Authentication:** Requires MLGOO_DILG role.

    **Validations:**
    - New deadline must be in the future
    - Reason must be at least 10 characters (for audit purposes)
    - Cycle, barangay, and indicator must exist

    **Audit Trail:**
    - Records the MLGOO-DILG user who created the override
    - Captures original deadline, new deadline, and justification reason
    - Creates audit log entry

    **Returns:**
    - The created deadline override record
    """
    from fastapi import HTTPException, status

    try:
        override = deadline_service.apply_deadline_override(
            db=db,
            cycle_id=override_data.cycle_id,
            barangay_id=override_data.barangay_id,
            indicator_id=override_data.indicator_id,
            new_deadline=override_data.new_deadline,
            reason=override_data.reason,
            created_by_user_id=current_user.id,
        )

        # Build response with related entity details
        # Resolve year placeholders in indicator name
        try:
            year_resolver = get_year_resolver(db)
            indicator_name = (
                year_resolver.resolve_string(override.indicator.name) or override.indicator.name
            )
        except ValueError:
            indicator_name = override.indicator.name

        return DeadlineOverrideResponse(
            id=override.id,  # type: ignore[arg-type]
            cycle_id=override.cycle_id,  # type: ignore[arg-type]
            barangay_id=override.barangay_id,  # type: ignore[arg-type]
            indicator_id=override.indicator_id,  # type: ignore[arg-type]
            created_by=override.created_by,  # type: ignore[arg-type]
            original_deadline=override.original_deadline,  # type: ignore[arg-type]
            new_deadline=override.new_deadline,  # type: ignore[arg-type]
            reason=override.reason,  # type: ignore[arg-type]
            created_at=override.created_at,  # type: ignore[arg-type]
            cycle_name=override.cycle.name,
            barangay_name=override.barangay.name,
            indicator_name=indicator_name,
            creator_email=override.creator.email,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/deadlines/overrides",
    response_model=DeadlineOverrideListResponse,
    tags=["admin"],
    summary="List deadline overrides",
    description="Get all deadline overrides with optional filtering by cycle, barangay, or indicator. Requires MLGOO_DILG role.",
)
async def get_deadline_overrides(
    cycle_id: int | None = Query(None, description="Filter by cycle ID"),
    barangay_id: int | None = Query(None, description="Filter by barangay ID"),
    indicator_id: int | None = Query(None, description="Filter by indicator ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Get deadline overrides with optional filtering.

    **Authentication:** Requires MLGOO_DILG role.

    **Filters:**
    - `cycle_id`: Filter by assessment cycle
    - `barangay_id`: Filter by barangay
    - `indicator_id`: Filter by indicator

    **Returns:**
    - List of deadline override records (newest first)
    - Total count of matching overrides
    """
    overrides = deadline_service.get_deadline_overrides(
        db=db,
        cycle_id=cycle_id,
        barangay_id=barangay_id,
        indicator_id=indicator_id,
    )

    # Initialize year resolver for placeholder resolution
    try:
        year_resolver = get_year_resolver(db)
    except ValueError:
        year_resolver = None

    # Build response with related entity details
    items = []
    for override in overrides:
        # Resolve year placeholders in indicator name
        indicator_name = override.indicator.name
        if year_resolver:
            indicator_name = year_resolver.resolve_string(indicator_name) or indicator_name

        items.append(
            DeadlineOverrideResponse(
                id=override.id,  # type: ignore[arg-type]
                cycle_id=override.cycle_id,  # type: ignore[arg-type]
                barangay_id=override.barangay_id,  # type: ignore[arg-type]
                indicator_id=override.indicator_id,  # type: ignore[arg-type]
                created_by=override.created_by,  # type: ignore[arg-type]
                original_deadline=override.original_deadline,  # type: ignore[arg-type]
                new_deadline=override.new_deadline,  # type: ignore[arg-type]
                reason=override.reason,  # type: ignore[arg-type]
                created_at=override.created_at,  # type: ignore[arg-type]
                cycle_name=override.cycle.name,
                barangay_name=override.barangay.name,
                indicator_name=indicator_name,
                creator_email=override.creator.email,
            )
        )

    return DeadlineOverrideListResponse(items=items, total=len(items))


@router.get(
    "/deadlines/overrides/export",
    tags=["admin"],
    summary="Export deadline overrides to CSV",
    description="Export deadline override audit logs to CSV format. Requires MLGOO_DILG role.",
)
async def export_deadline_overrides_csv(
    cycle_id: int | None = Query(None, description="Filter by cycle ID"),
    barangay_id: int | None = Query(None, description="Filter by barangay ID"),
    indicator_id: int | None = Query(None, description="Filter by indicator ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Export deadline overrides to CSV with optional filtering.

    **Authentication:** Requires MLGOO_DILG role.

    **CSV Columns:**
    - Override ID
    - Cycle Name
    - Barangay Name
    - Indicator Name
    - Original Deadline
    - New Deadline
    - Extension Duration (Days)
    - Reason
    - Created By (email)
    - Created At

    **Returns:**
    - CSV file with deadline override data
    """
    from fastapi.responses import StreamingResponse

    csv_content = deadline_service.export_overrides_to_csv(
        db=db,
        cycle_id=cycle_id,
        barangay_id=barangay_id,
        indicator_id=indicator_id,
    )

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=deadline_overrides_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        },
    )


# ============================================================================
# Auto-Submit Endpoints
# ============================================================================


@router.post(
    "/trigger-auto-submit",
    response_model=AutoSubmitResponse,
    tags=["admin"],
    summary="Trigger auto-submit for overdue DRAFT assessments",
    description="Manually trigger auto-submit for all DRAFT assessments past the Phase 1 deadline. Useful when Celery is not running. Requires MLGOO_DILG role.",
)
async def trigger_auto_submit(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Manually trigger auto-submit for overdue DRAFT assessments.

    Finds all DRAFT assessments for the active year where the Phase 1 deadline
    has passed and auto-submits them (same logic as the Celery worker).

    **Authentication:** Requires MLGOO_DILG role.

    **Returns:**
    - Count and details of auto-submitted assessments
    """
    from datetime import UTC

    from fastapi import HTTPException, status
    from sqlalchemy import and_
    from sqlalchemy.orm import joinedload

    from app.db.enums import AssessmentStatus
    from app.db.models import Assessment
    from app.db.models.system import AssessmentYear
    from app.workers.deadline_worker import _auto_submit_assessment

    now = datetime.now(UTC)

    # Get the active assessment year
    active_year = db.query(AssessmentYear).filter(AssessmentYear.is_active == True).first()

    if not active_year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active assessment year found",
        )

    if not active_year.phase1_deadline:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No phase1_deadline set for year {active_year.year}",
        )

    phase1_deadline = active_year.phase1_deadline
    if phase1_deadline.tzinfo is None:
        phase1_deadline = phase1_deadline.replace(tzinfo=UTC)

    if now < phase1_deadline:
        return AutoSubmitResponse(auto_submitted_count=0, details=[])

    # Find all DRAFT assessments that haven't been auto-submitted
    draft_assessments = (
        db.query(Assessment)
        .options(joinedload(Assessment.blgu_user).joinedload(User.barangay))
        .filter(
            and_(
                Assessment.assessment_year == active_year.year,
                Assessment.status == AssessmentStatus.DRAFT,
                Assessment.auto_submitted_at.is_(None),
            )
        )
        .all()
    )

    details: list[AutoSubmitDetail] = []

    for assessment in draft_assessments:
        try:
            barangay_name = "Unknown Barangay"
            if assessment.blgu_user and assessment.blgu_user.barangay:
                barangay_name = assessment.blgu_user.barangay.name

            _auto_submit_assessment(db, assessment, now)
            db.flush()
            details.append(
                AutoSubmitDetail(assessment_id=assessment.id, barangay_name=barangay_name)
            )
        except Exception:
            # Skip failed assessments, continue with the rest
            continue

    db.commit()

    return AutoSubmitResponse(auto_submitted_count=len(details), details=details)


# ============================================================================
# System Configuration Endpoints (Placeholder for future expansion)
# ============================================================================


@router.get(
    "/system/status",
    response_model=AdminSuccessResponse,
    tags=["admin"],
    summary="Get admin system status",
    description="Get system status and configuration information for admin users. Requires MLGOO_DILG role.",
)
async def get_admin_system_status(
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Get system status and configuration information for admin users.

    **Authentication:** Requires MLGOO_DILG role.

    **Returns:**
    - System status and basic configuration info
    """
    return AdminSuccessResponse(
        success=True,
        message="Admin system status retrieved successfully",
        data={
            "admin_user": current_user.email,
            "role": current_user.role.value,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        },
    )
