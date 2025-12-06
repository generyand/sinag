"""
MOV File Management API Endpoints (Epic 4.0)

Provides endpoints for uploading, listing, and deleting MOV (Means of Verification) files.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.api import deps
from app.db.enums import UserRole
from app.db.models.assessment import MOVFile
from app.db.models.governance_area import Indicator
from app.db.models.user import User
from app.schemas.assessment import MOVFileListResponse, MOVFileResponse
from app.services.file_validation_service import file_validation_service
from app.services.storage_service import storage_service

router = APIRouter()


@router.post(
    "/assessments/{assessment_id}/indicators/{indicator_id}/upload",
    response_model=MOVFileResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["movs"],
    summary="Upload MOV file for an indicator",
    description="""
    Upload a MOV (Means of Verification) file for a specific indicator in an assessment.

    - **Validates** file type (PDF, DOCX, XLSX, JPG, PNG, MP4)
    - **Validates** file size (max 50MB)
    - **Validates** file content security
    - **Uploads** file to Supabase Storage
    - **Creates** database record with metadata

    Returns the uploaded file metadata including URL, size, and upload timestamp.
    """,
)
def upload_mov_file(
    assessment_id: int,
    indicator_id: int,
    file: UploadFile = File(...),
    field_id: Optional[str] = Form(None),
    field_label: Optional[str] = Form(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> MOVFileResponse:
    """
    Upload a MOV file for an indicator.

    Args:
        assessment_id: ID of the assessment
        indicator_id: ID of the indicator
        file: The file to upload (multipart/form-data)
        field_id: Optional field identifier for multi-field uploads
        field_label: Optional field label for generating display filename
        db: Database session
        current_user: Currently authenticated user

    Returns:
        MOVFileResponse with file metadata

    Raises:
        HTTPException 400: File validation failed
        HTTPException 500: Upload or database operation failed
    """
    # Validate the file
    validation_result = file_validation_service.validate_file(file)

    if not validation_result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": validation_result.error_message,
                "error_code": validation_result.error_code,
            },
        )

    # Look up indicator code for display filename generation
    indicator_code: Optional[str] = None
    if field_label:
        indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
        if indicator and indicator.indicator_code:
            indicator_code = indicator.indicator_code

    # Upload file to storage and create database record
    try:
        mov_file = storage_service.upload_mov_file(
            db=db,
            file=file,
            assessment_id=assessment_id,
            indicator_id=indicator_id,
            user_id=current_user.id,
            field_id=field_id,
            indicator_code=indicator_code,
            field_label=field_label,
        )

        return MOVFileResponse.model_validate(mov_file)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}",
        )


@router.get(
    "/assessments/{assessment_id}/indicators/{indicator_id}/files",
    response_model=MOVFileListResponse,
    status_code=status.HTTP_200_OK,
    tags=["movs"],
    summary="List MOV files for an indicator",
    description="""
    Retrieve all MOV (Means of Verification) files for a specific indicator in an assessment.

    - **Permission-based filtering**: BLGU users see only their own files, Assessors/Validators see all files
    - **Excludes soft-deleted files**: Only active files are returned
    - **Ordered by upload time**: Most recent files first

    Returns a list of file metadata including URL, size, type, and uploader information.
    """,
)
def list_mov_files(
    assessment_id: int,
    indicator_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> MOVFileListResponse:
    """
    List all MOV files for an indicator.

    Args:
        assessment_id: ID of the assessment
        indicator_id: ID of the indicator
        db: Database session
        current_user: Currently authenticated user

    Returns:
        MOVFileListResponse with list of files

    Permission Rules:
        - BLGU_USER: Can only see files they uploaded
        - ASSESSOR, VALIDATOR, MLGOO_DILG: Can see all files for the indicator
    """
    # Build base query
    query = (
        db.query(MOVFile)
        .filter(
            MOVFile.assessment_id == assessment_id,
            MOVFile.indicator_id == indicator_id,
            MOVFile.deleted_at.is_(None),  # Exclude soft-deleted files
        )
        .options(joinedload(MOVFile.uploader))  # Eager load uploader relationship
    )

    # Apply permission-based filtering
    if current_user.role == UserRole.BLGU_USER:
        # BLGU users can only see their own files
        query = query.filter(MOVFile.uploaded_by == current_user.id)

    # Order by most recent first
    query = query.order_by(MOVFile.uploaded_at.desc())

    # Execute query
    files = query.all()

    # Convert to response schema
    file_responses = [MOVFileResponse.model_validate(f) for f in files]

    return MOVFileListResponse(files=file_responses)


@router.delete(
    "/files/{file_id}",
    response_model=MOVFileResponse,
    status_code=status.HTTP_200_OK,
    tags=["movs"],
    summary="Delete a MOV file",
    description="""
    Delete a MOV (Means of Verification) file from both storage and database.

    - **Performs soft delete**: Sets deleted_at timestamp instead of removing record
    - **Permission check**: Only the uploader can delete their own files
    - **Status restriction**: Only allowed for DRAFT or NEEDS_REWORK assessments
    - **Storage cleanup**: Removes file from Supabase Storage

    Returns the deleted file metadata with updated deleted_at timestamp.
    """,
)
def delete_mov_file(
    file_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> MOVFileResponse:
    """
    Delete a MOV file (soft delete).

    Args:
        file_id: ID of the MOV file to delete
        db: Database session
        current_user: Currently authenticated user

    Returns:
        MOVFileResponse with deleted file metadata

    Raises:
        HTTPException 403: Permission denied (not uploader, wrong status, already deleted)
        HTTPException 404: File not found
        HTTPException 500: Deletion failed
    """
    try:
        deleted_file = storage_service.delete_mov_file(
            db=db,
            file_id=file_id,
            user_id=current_user.id,
        )

        return MOVFileResponse.model_validate(deleted_file)

    except HTTPException:
        # Re-raise HTTPExceptions from the service (403, 404)
        raise

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete file: {str(e)}",
        )
