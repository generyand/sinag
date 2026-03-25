"""
MOV File Management API Endpoints (Epic 4.0)

Provides endpoints for uploading, listing, and deleting MOV (Means of Verification) files.
"""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.api import deps
from app.db.enums import AssessmentStatus, UserRole
from app.db.models.assessment import (
    MOV_UPLOAD_ORIGIN_BLGU,
    MOV_UPLOAD_ORIGIN_VALIDATOR,
    Assessment,
    MOVFile,
)
from app.db.models.governance_area import Indicator
from app.db.models.user import User
from app.schemas.assessment import MOVFileListResponse, MOVFileResponse, SignedUrlResponse
from app.services.assessment_lock_service import assessment_lock_service
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
    field_id: str | None = Form(None),
    field_label: str | None = Form(None),
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
    indicator_code: str | None = None
    if field_label:
        indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
        if indicator and indicator.indicator_code:
            indicator_code = indicator.indicator_code

    assessment: Assessment | None = None
    if current_user.role in (UserRole.BLGU_USER, UserRole.VALIDATOR):
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment {assessment_id} not found",
            )

    if current_user.role == UserRole.BLGU_USER:
        assert assessment is not None
        if assessment.blgu_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only upload files to your own assessment",
            )
        assessment_lock_service.ensure_blgu_write_allowed(
            db, assessment, action="upload or replace MOV files"
        )
        upload_origin = MOV_UPLOAD_ORIGIN_BLGU
    elif current_user.role == UserRole.VALIDATOR:
        assert assessment is not None
        if assessment.status != AssessmentStatus.SUBMITTED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Validators can only upload MOV files for submitted assessments",
            )
        upload_origin = MOV_UPLOAD_ORIGIN_VALIDATOR
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to upload MOV files through this endpoint",
        )

    # Upload file to storage and create database record
    try:
        mov_file = storage_service.upload_mov_file(
            db=db,
            file=file,
            assessment_id=assessment_id,
            indicator_id=indicator_id,
            user_id=current_user.id,
            upload_origin=upload_origin,
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


@router.get(
    "/files/{file_id}/signed-url",
    response_model=SignedUrlResponse,
    status_code=status.HTTP_200_OK,
    tags=["movs"],
    summary="Get a signed URL for a MOV file",
    description="""
    Generate a time-limited signed URL for secure access to a MOV file.

    - **Permission check**: Validates user has access to the file
    - **Time-limited**: URL expires after 1 hour by default
    - **Secure**: Only authenticated users can generate URLs

    Returns a signed URL that can be used to access the file directly.
    """,
)
def get_signed_url(
    file_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> SignedUrlResponse:
    """
    Get a signed URL for accessing a MOV file.

    Args:
        file_id: ID of the MOV file
        db: Database session
        current_user: Currently authenticated user

    Returns:
        SignedUrlResponse with signed_url field

    Raises:
        HTTPException 403: Permission denied
        HTTPException 404: File not found
        HTTPException 500: Failed to generate signed URL
    """
    import logging

    logger = logging.getLogger(__name__)

    try:
        signed_url = storage_service.get_signed_url_for_file(
            db=db,
            file_id=file_id,
            user_id=current_user.id,
            expires_in=3600,  # 1 hour
        )

        return SignedUrlResponse(signed_url=signed_url)

    except HTTPException:
        # Re-raise HTTPExceptions from the service (403, 404)
        raise

    except Exception as e:
        # Log the full error server-side but return a generic message to clients
        logger.error(f"Failed to generate signed URL for file {file_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate signed URL. Please try again.",
        )


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


@router.post(
    "/files/{file_id}/rotate",
    response_model=MOVFileResponse,
    status_code=status.HTTP_200_OK,
    tags=["movs"],
    summary="Rotate an image file 90 degrees clockwise",
    description="""
    Rotate an image file permanently by 90 degrees clockwise.

    - **Permission check**: Only the uploader (BLGU user) can rotate their own files
    - **Status restriction**: Only allowed for DRAFT or NEEDS_REWORK assessments
    - **File type**: Only supports image files (JPEG, PNG)
    - **Permanent**: Replaces the original file in storage with the rotated version

    Returns the updated file metadata with new file size.
    """,
)
def rotate_mov_file(
    file_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> MOVFileResponse:
    """
    Rotate an image file 90 degrees clockwise (permanent operation).

    Args:
        file_id: ID of the MOV file to rotate
        db: Database session
        current_user: Currently authenticated user

    Returns:
        MOVFileResponse with updated file metadata

    Raises:
        HTTPException 400: File is not an image or unsupported image type
        HTTPException 403: Permission denied (not uploader, wrong status)
        HTTPException 404: File not found
        HTTPException 500: Rotation failed
    """
    try:
        rotated_file = storage_service.rotate_image_file(
            db=db,
            file_id=file_id,
            user_id=current_user.id,
        )

        return MOVFileResponse.model_validate(rotated_file)

    except HTTPException:
        # Re-raise HTTPExceptions from the service (400, 403, 404, 500)
        raise

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rotate image: {str(e)}",
        )
