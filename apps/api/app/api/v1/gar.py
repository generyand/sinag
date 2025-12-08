# GAR (Governance Assessment Report) API Routes
# Endpoints for generating and exporting GAR reports


from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api import deps
from app.db.models.user import User
from app.schemas.gar import GARAssessmentListResponse, GARResponse
from app.services.gar_service import gar_service

router = APIRouter()


@router.get(
    "/assessments",
    response_model=GARAssessmentListResponse,
    tags=["gar"],
)
async def get_gar_assessments(
    year: int | None = Query(
        None,
        description="Filter by assessment year (e.g., 2024, 2025). Defaults to active year.",
        ge=2020,
        le=2100,
    ),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Get list of assessments available for GAR generation.

    Returns completed and awaiting final validation assessments
    filtered by the specified assessment year.
    Only accessible by MLGOO_DILG users.
    """
    return gar_service.get_completed_assessments(db, assessment_year=year)


@router.get(
    "/{assessment_id}",
    response_model=GARResponse,
    tags=["gar"],
)
async def get_gar_report(
    assessment_id: int,
    governance_area_id: int | None = Query(
        None,
        description="Filter by governance area ID (1=Financial, 2=Disaster, etc.)",
    ),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Get GAR report data for a specific assessment.

    Returns full GAR data including indicators, checklist items,
    and validation results for the specified assessment.

    Use governance_area_id to filter to a specific area:
    - 1: Financial Administration and Sustainability
    - 2: Disaster Preparedness
    - 3: Safety, Peace and Order
    - 4: Social Protection and Sensitivity
    - 5: Business-Friendliness and Competitiveness
    - 6: Environmental Management

    Only accessible by MLGOO_DILG users.
    """
    try:
        return gar_service.get_gar_data(
            db=db,
            assessment_id=assessment_id,
            governance_area_id=governance_area_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get(
    "/{assessment_id}/export/excel",
    tags=["gar"],
)
async def export_gar_excel(
    assessment_id: int,
    governance_area_id: int | None = Query(
        None,
        description="Filter by governance area ID",
    ),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Export GAR report as Excel file.

    Generates an Excel file matching the official DILG GAR format
    with color-coded cells (green=met, yellow=considered, red=unmet).

    Only accessible by MLGOO_DILG users.
    """
    try:
        gar_data = gar_service.get_gar_data(
            db=db,
            assessment_id=assessment_id,
            governance_area_id=governance_area_id,
        )

        # Generate Excel file
        from app.services.gar_export_service import gar_export_service

        excel_buffer = gar_export_service.generate_excel(gar_data)

        # Create filename
        filename = f"GAR_{gar_data.barangay_name.replace(' ', '_')}_{assessment_id}.xlsx"

        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.get(
    "/{assessment_id}/export/pdf",
    tags=["gar"],
)
async def export_gar_pdf(
    assessment_id: int,
    governance_area_id: int | None = Query(
        None,
        description="Filter by governance area ID",
    ),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_admin_user),
):
    """
    Export GAR report as PDF file.

    Generates a PDF file matching the official DILG GAR format
    with color-coded cells (green=met, yellow=considered, red=unmet).

    Only accessible by MLGOO_DILG users.
    """
    try:
        gar_data = gar_service.get_gar_data(
            db=db,
            assessment_id=assessment_id,
            governance_area_id=governance_area_id,
        )

        # Generate PDF file
        from app.services.gar_export_service import gar_export_service

        pdf_buffer = gar_export_service.generate_pdf(gar_data)

        # Create filename
        filename = f"GAR_{gar_data.barangay_name.replace(' ', '_')}_{assessment_id}.pdf"

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
