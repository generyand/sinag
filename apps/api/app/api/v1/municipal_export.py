# 📊 Municipal Export API Routes
# Endpoints for generating comprehensive municipal data exports

from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_mlgoo_dilg
from app.db.models.user import User
from app.schemas.municipal_export import (
    AvailableCycle,
    ExportDataType,
    ExportGenerateResponse,
    ExportOptionsResponse,
    ExportRequest,
    ExportSummary,
)
from app.services.municipal_export_service import municipal_export_service

router = APIRouter()


# ============================================================================
# Municipal Export Endpoints
# ============================================================================


@router.get(
    "/options",
    response_model=ExportOptionsResponse,
    tags=["municipal-export"],
    summary="Get available export options",
    description="Get available data types and cycles for export. Requires MLGOO_DILG role.",
)
async def get_export_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Get available export options including data types and cycles.

    **Authentication:** Requires MLGOO_DILG role.

    **Returns:**
    - List of available data types with descriptions
    - List of assessment cycles to choose from
    - Default cycle ID (active cycle)
    """
    data_types = municipal_export_service.get_export_data_types()
    cycles, default_cycle_id = municipal_export_service.get_available_cycles(db)

    return ExportOptionsResponse(
        data_types=[ExportDataType(**dt) for dt in data_types],
        cycles=[AvailableCycle(**c) for c in cycles],
        default_cycle_id=default_cycle_id,
    )


@router.post(
    "/generate",
    tags=["municipal-export"],
    summary="Generate municipal data export",
    description="Generate Excel export with selected data. Requires MLGOO_DILG role.",
)
async def generate_export(
    options: ExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Generate comprehensive municipal data export.

    **Authentication:** Requires MLGOO_DILG role.

    **Export Options:**
    - `cycle_id`: Filter by assessment cycle (optional)
    - `include_assessments`: Include assessment submissions (default: true)
    - `include_users`: Include BLGU users list (default: false)
    - `include_analytics`: Include compliance statistics (default: true)
    - `include_indicators`: Include indicator details (default: false)
    - `include_governance_areas`: Include governance area performance (default: true)

    **Returns:**
    - Excel file (.xlsx) with multiple sheets based on selected options
    """
    buffer, summary = municipal_export_service.generate_export(db, options)

    # Generate filename
    cycle_part = f"_{summary['cycle_year']}" if summary.get("cycle_year") else ""
    filename = f"municipal_export{cycle_part}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsx"

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post(
    "/preview",
    response_model=ExportGenerateResponse,
    tags=["municipal-export"],
    summary="Preview export summary",
    description="Get summary of what will be exported without generating the file. Requires MLGOO_DILG role.",
)
async def preview_export(
    options: ExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_mlgoo_dilg),
):
    """
    Preview what will be included in the export.

    **Authentication:** Requires MLGOO_DILG role.

    **Returns:**
    - Summary of data counts and included sections
    - Does NOT generate the actual file
    """
    from sqlalchemy import func

    from app.db.models.admin import AssessmentCycle
    from app.db.models.assessment import Assessment
    from app.db.models.barangay import Barangay

    cycle = None
    if options.cycle_id:
        cycle = db.query(AssessmentCycle).filter(AssessmentCycle.id == options.cycle_id).first()

    # Count barangays
    total_barangays = db.query(func.count(Barangay.id)).scalar() or 0

    # Count assessments
    assessment_query = db.query(func.count(Assessment.id))
    if cycle:
        assessment_query = assessment_query.filter(Assessment.assessment_year == cycle.year)
    total_assessments = assessment_query.scalar() or 0

    # Build included sections list
    included_sections = []
    if options.include_assessments:
        included_sections.append("Assessment Submissions")
    if options.include_analytics:
        included_sections.append("Analytics Summary")
    if options.include_governance_areas:
        included_sections.append("Governance Area Performance")
    if options.include_indicators:
        included_sections.append("Indicator Details")
    if options.include_users:
        included_sections.append("BLGU Users")

    return ExportGenerateResponse(
        success=True,
        message="Export preview generated successfully",
        summary=ExportSummary(
            generated_at=datetime.utcnow(),
            cycle_name=cycle.name if cycle else "All Cycles",
            cycle_year=cycle.year if cycle else None,
            total_barangays=total_barangays,
            total_assessments=total_assessments,
            included_sections=included_sections,
        ),
    )
