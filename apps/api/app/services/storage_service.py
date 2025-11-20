# 📦 Storage Service
# Handles file uploads to Supabase Storage for MOV files

import logging
import re
import time
from datetime import datetime
from typing import Dict, Optional
from uuid import uuid4

from app.core.config import settings
from app.db.enums import AssessmentStatus
from app.db.models.assessment import Assessment, AssessmentResponse, MOVFile
from fastapi import UploadFile, HTTPException
from supabase import Client, create_client
from sqlalchemy.orm import Session

# Setup logging
logger = logging.getLogger(__name__)

# Initialize Supabase admin client with service-role key for server-side operations
_supabase_client: Optional[Client] = None


def _get_supabase_client() -> Client:
    """
    Get or initialize the Supabase admin client.

    Uses service-role key for server-side operations with full access.
    """
    global _supabase_client

    if _supabase_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError(
                "Supabase storage not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
            )

        try:
            _supabase_client = create_client(
                settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY
            )
            logger.info("Supabase storage client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase storage client: {str(e)}")
            raise

    return _supabase_client


class StorageService:
    """
    Service for handling file uploads to Supabase Storage.

    This service handles MOV (Means of Verification) file uploads
    to Supabase Storage using the service-role key for secure server-side operations.
    """

    # Bucket name for MOV files (Epic 4.0)
    MOV_FILES_BUCKET = "mov-files"

    def upload_mov(
        self, file: UploadFile, *, response_id: int, db: Session
    ) -> Dict[str, str | int]:
        """
        Upload a MOV file to Supabase Storage.

        Files are stored in the 'movs' bucket under the path:
        assessment-{assessment_id}/response-{response_id}/{filename}

        Args:
            file: The file to upload (FastAPI UploadFile)
            response_id: The ID of the assessment response this MOV belongs to
            db: Database session to query for assessment_id

        Returns:
            dict containing:
                - storage_path: The full storage path in Supabase
                - file_size: Size of the uploaded file in bytes
                - content_type: MIME type of the file
                - filename: The stored filename

        Raises:
            ValueError: If Supabase is not configured or response not found
            Exception: If upload fails
        """
        # Get the assessment response to determine assessment_id
        response = (
            db.query(AssessmentResponse)
            .filter(AssessmentResponse.id == response_id)
            .first()
        )

        if not response:
            raise ValueError(f"Assessment response {response_id} not found")

        assessment_id = response.assessment_id

        # Get Supabase client
        supabase = _get_supabase_client()

        # Sanitize filename to prevent path traversal and special characters
        sanitized_filename = (
            (file.filename or "uploaded_file")
            .replace("/", "_")
            .replace("\\", "_")
            .replace("..", "_")
        )
        # Add timestamp to ensure uniqueness
        timestamp = int(time.time() * 1000)  # milliseconds
        stored_filename = f"{timestamp}-{sanitized_filename}"

        # Construct storage path
        # Format: assessment-{assessment_id}/response-{response_id}/{filename}
        storage_path = f"assessment-{assessment_id}/response-{response_id}/{stored_filename}"

        # Read file contents
        file_contents = file.file.read()
        file_size = len(file_contents)

        # Upload to Supabase Storage
        try:
            result = supabase.storage.from_("movs").upload(
                path=storage_path,
                file=file_contents,
                file_options={"content-type": file.content_type or "application/octet-stream"},
            )

            # Check for errors (following pattern from assessment_service.py)
            # The supabase-py client raises on HTTP/storage network error, but check for errors in resp too
            if isinstance(result, dict) and result.get("error"):
                raise Exception(f"Supabase upload error: {result['error']}")

            logger.info(
                f"Successfully uploaded MOV file {stored_filename} for response {response_id} "
                f"to path {storage_path}"
            )

            return {
                "storage_path": storage_path,
                "file_size": file_size,
                "content_type": file.content_type or "application/octet-stream",
                "filename": stored_filename,
                "original_filename": file.filename or stored_filename,
            }

        except Exception as e:
            logger.error(
                f"Failed to upload MOV file {file.filename or 'unknown'} for response {response_id}: {str(e)}"
            )
            raise

    # ============================================================================
    # Story 4.5: Backend File Upload Service (Epic 4.0)
    # New methods for indicator-level MOV file uploads
    # ============================================================================

    def _generate_unique_filename(self, original_filename: str) -> str:
        """
        Generate a unique filename using UUID prefix.

        Sanitizes the original filename to remove unsafe characters and
        prepends a UUID to ensure uniqueness.

        Args:
            original_filename: The original file name from the upload

        Returns:
            str: Unique filename in format: {uuid}_{sanitized_filename}
        """
        # Sanitize filename: remove path separators and special characters
        # Keep only alphanumeric, dots, hyphens, and underscores
        sanitized = re.sub(r'[^\w\s.-]', '_', original_filename)
        sanitized = sanitized.replace('..', '_').replace('/', '_').replace('\\', '_')

        # Remove leading/trailing whitespace and dots
        sanitized = sanitized.strip().strip('.')

        # If sanitization resulted in empty string, use a default
        if not sanitized:
            sanitized = "file"

        # Generate unique filename with UUID prefix
        unique_filename = f"{uuid4()}_{sanitized}"

        return unique_filename

    def _get_storage_path(
        self, assessment_id: int, indicator_id: int, filename: str
    ) -> str:
        """
        Generate the storage path for a file in Supabase Storage.

        Path structure: {assessment_id}/{indicator_id}/{filename}

        Args:
            assessment_id: ID of the assessment
            indicator_id: ID of the indicator
            filename: The file name (should be unique)

        Returns:
            str: Storage path for the file
        """
        return f"{assessment_id}/{indicator_id}/{filename}"

    def upload_mov_file(
        self,
        db: Session,
        file: UploadFile,
        assessment_id: int,
        indicator_id: int,
        user_id: int,
        field_id: str | None = None,
    ) -> MOVFile:
        """
        Upload a MOV file to Supabase Storage and create database record.

        This method handles the complete file upload workflow:
        1. Generate unique filename
        2. Construct storage path
        3. Upload file to Supabase Storage
        4. Create MOVFile database record
        5. Handle errors and rollback on failure

        Args:
            db: Database session
            file: FastAPI UploadFile object
            assessment_id: ID of the assessment
            indicator_id: ID of the indicator
            user_id: ID of the user uploading the file

        Returns:
            MOVFile: The created MOVFile database record

        Raises:
            ValueError: If Supabase is not configured
            Exception: If upload fails or database operation fails
        """
        # Get Supabase client
        supabase = _get_supabase_client()

        # Preserve original filename for display
        original_filename = file.filename or "file"

        # Generate unique filename for storage (with UUID prefix)
        unique_filename = self._generate_unique_filename(original_filename)

        # Get storage path
        storage_path = self._get_storage_path(assessment_id, indicator_id, unique_filename)

        # Read file contents
        file_contents = file.file.read()
        file_size = len(file_contents)
        content_type = file.content_type or "application/octet-stream"

        # Upload to Supabase Storage
        try:
            result = supabase.storage.from_(self.MOV_FILES_BUCKET).upload(
                path=storage_path,
                file=file_contents,
                file_options={"content-type": content_type},
            )

            # Check for errors in response
            if isinstance(result, dict) and result.get("error"):
                raise Exception(f"Supabase upload error: {result['error']}")

            logger.info(
                f"Successfully uploaded MOV file {unique_filename} for "
                f"assessment {assessment_id}, indicator {indicator_id} to path {storage_path}"
            )

        except Exception as e:
            logger.error(
                f"Failed to upload MOV file {file.filename or 'unknown'} "
                f"for assessment {assessment_id}, indicator {indicator_id}: {str(e)}"
            )
            raise Exception(f"File upload to storage failed: {str(e)}")

        # Get file URL from Supabase
        try:
            # Get public URL for the file
            file_url_result = supabase.storage.from_(self.MOV_FILES_BUCKET).get_public_url(
                storage_path
            )
            file_url = file_url_result
        except Exception as e:
            logger.error(f"Failed to get public URL for {storage_path}: {str(e)}")
            # If we can't get the URL, try to delete the uploaded file
            try:
                supabase.storage.from_(self.MOV_FILES_BUCKET).remove([storage_path])
            except Exception:
                pass  # Ignore cleanup errors
            raise Exception(f"Failed to get file URL: {str(e)}")

        # Auto-delete old files for the same field (if field_id is provided)
        # This implements the rework workflow where uploading a new file replaces the old one
        if field_id:
            try:
                old_files = (
                    db.query(MOVFile)
                    .filter(
                        MOVFile.assessment_id == assessment_id,
                        MOVFile.indicator_id == indicator_id,
                        MOVFile.field_id == field_id,
                        MOVFile.deleted_at.is_(None),  # Only active files
                        MOVFile.uploaded_by == user_id,  # Only files uploaded by this user
                    )
                    .all()
                )

                if old_files:
                    for old_file in old_files:
                        # Soft delete the old file
                        old_file.deleted_at = datetime.utcnow()
                        logger.info(
                            f"Auto-deleted old MOV file {old_file.id} (field: {field_id}) "
                            f"to be replaced by new upload"
                        )
                    db.commit()
                    logger.info(
                        f"Auto-replaced {len(old_files)} old file(s) for field {field_id}"
                    )
            except Exception as e:
                logger.warning(
                    f"Failed to auto-delete old files for field {field_id}: {str(e)}. "
                    f"Continuing with upload..."
                )
                # Don't fail the upload if auto-delete fails
                db.rollback()

        # Create database record
        try:
            mov_file = self._save_mov_file_record(
                db=db,
                file_url=file_url,
                file_name=original_filename,  # Store clean filename for display
                file_type=content_type,
                file_size=file_size,
                assessment_id=assessment_id,
                indicator_id=indicator_id,
                user_id=user_id,
                field_id=field_id,
            )

            logger.info(
                f"Created MOVFile database record (ID: {mov_file.id}) for file {unique_filename}"
            )

            return mov_file

        except Exception as e:
            logger.error(
                f"Failed to create MOVFile database record for {unique_filename}: {str(e)}"
            )
            # Rollback: try to delete the uploaded file from Supabase
            try:
                supabase.storage.from_(self.MOV_FILES_BUCKET).remove([storage_path])
                logger.info(f"Rolled back: deleted file {storage_path} from storage")
            except Exception as cleanup_error:
                logger.error(
                    f"Failed to cleanup file {storage_path} after database error: {str(cleanup_error)}"
                )

            raise Exception(f"Database operation failed: {str(e)}")

    def _save_mov_file_record(
        self,
        db: Session,
        file_url: str,
        file_name: str,
        file_type: str,
        file_size: int,
        assessment_id: int,
        indicator_id: int,
        user_id: int,
        field_id: str | None = None,
    ) -> MOVFile:
        """
        Create and save a MOVFile database record.

        Args:
            db: Database session
            file_url: URL of the uploaded file in Supabase Storage
            file_name: Unique file name
            file_type: MIME type of the file
            file_size: Size of the file in bytes
            assessment_id: ID of the assessment
            indicator_id: ID of the indicator
            user_id: ID of the user who uploaded the file
            field_id: Optional field identifier for multi-field uploads

        Returns:
            MOVFile: The created and saved MOVFile instance

        Raises:
            Exception: If database operation fails
        """
        mov_file = MOVFile(
            assessment_id=assessment_id,
            indicator_id=indicator_id,
            uploaded_by=user_id,
            file_name=file_name,
            file_url=file_url,
            file_type=file_type,
            file_size=file_size,
            field_id=field_id,
            uploaded_at=datetime.utcnow(),
        )

        db.add(mov_file)
        db.commit()
        db.refresh(mov_file)

        # After uploading the file, recalculate is_completed for the response
        # This ensures progress tracking updates immediately
        self._update_response_completion_status(db, assessment_id, indicator_id)

        return mov_file

    def _update_response_completion_status(
        self, db: Session, assessment_id: int, indicator_id: int
    ) -> None:
        """
        Recalculate and update the is_completed status for an assessment response.

        This method is called after uploading or deleting a MOV file to ensure
        that the progress tracking reflects the current state of the response.

        Args:
            db: Database session
            assessment_id: ID of the assessment
            indicator_id: ID of the indicator

        The is_completed status is calculated based on:
        1. All required fields in form_schema have values in response_data
        2. All required MOV files have been uploaded (conditional based on answers)
        """
        try:
            from app.services.completeness_validation_service import completeness_validation_service
            from app.db.models.governance_area import Indicator

            # Get the assessment response for this indicator
            response = (
                db.query(AssessmentResponse)
                .filter(
                    AssessmentResponse.assessment_id == assessment_id,
                    AssessmentResponse.indicator_id == indicator_id,
                )
                .first()
            )

            if not response:
                # Auto-create response if it doesn't exist yet
                # This handles the case where files are uploaded before answering the form
                logger.info(
                    f"Creating AssessmentResponse for assessment {assessment_id}, "
                    f"indicator {indicator_id} (triggered by MOV upload)"
                )
                response = AssessmentResponse(
                    assessment_id=assessment_id,
                    indicator_id=indicator_id,
                    response_data={},
                    is_completed=False,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(response)
                db.commit()
                db.refresh(response)

            # Get the indicator to access form_schema
            indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
            if not indicator:
                logger.warning(f"Indicator {indicator_id} not found")
                return

            # Get all uploaded MOVs for this response (exclude soft-deleted files)
            uploaded_movs = (
                db.query(MOVFile)
                .filter(
                    MOVFile.assessment_id == assessment_id,
                    MOVFile.indicator_id == indicator_id,
                    MOVFile.deleted_at.is_(None),
                )
                .all()
            )

            # Validate completeness using the completeness validation service
            validation_result = completeness_validation_service.validate_completeness(
                form_schema=indicator.form_schema,
                response_data=response.response_data,
                uploaded_movs=uploaded_movs,
            )

            # Update is_completed based on validation result
            old_status = response.is_completed
            response.is_completed = validation_result["is_complete"]
            response.updated_at = datetime.utcnow()

            db.commit()

            logger.info(
                f"Updated is_completed for response (assessment={assessment_id}, "
                f"indicator={indicator_id}): {old_status} -> {response.is_completed}. "
                f"Validation: {validation_result['filled_field_count']}/{validation_result['required_field_count']} fields, "
                f"{len(uploaded_movs)} MOVs uploaded, missing: {validation_result.get('missing_fields', [])}"
            )

        except Exception as e:
            logger.error(
                f"Failed to update completion status for assessment {assessment_id}, "
                f"indicator {indicator_id}: {str(e)}"
            )
            # Don't raise - this is a non-critical operation
            # The file was already uploaded successfully

    # ============================================================================
    # Story 4.6: Backend File Deletion Service (Epic 4.0)
    # New methods for deleting MOV files
    # ============================================================================

    def _delete_file_from_storage(self, storage_path: str) -> bool:
        """
        Delete a file from Supabase Storage.

        Args:
            storage_path: The storage path of the file to delete

        Returns:
            bool: True if successful, False otherwise

        Raises:
            Exception: If deletion fails due to connection or permission issues
        """
        try:
            supabase = _get_supabase_client()
            result = supabase.storage.from_(self.MOV_FILES_BUCKET).remove([storage_path])

            # Check for errors in response
            if isinstance(result, dict) and result.get("error"):
                logger.error(f"Supabase deletion error for {storage_path}: {result['error']}")
                return False

            logger.info(f"Successfully deleted file from storage: {storage_path}")
            return True

        except Exception as e:
            logger.error(f"Failed to delete file from storage {storage_path}: {str(e)}")
            # Don't raise - file might not exist in storage, but we should still soft delete DB record
            return False

    def _check_delete_permission(
        self, db: Session, file_id: int, user_id: int
    ) -> tuple[bool, str | None]:
        """
        Check if a user has permission to delete a file.

        Permission rules:
        - User must be the uploader of the file
        - Assessment must be in DRAFT or NEEDS_REWORK status
        - Assessors cannot delete files (read-only access)

        Args:
            db: Database session
            file_id: ID of the MOVFile to delete
            user_id: ID of the user requesting deletion

        Returns:
            tuple[bool, str | None]: (has_permission, error_message)
                - (True, None) if allowed
                - (False, error_message) if not allowed
        """
        # Load the MOVFile from database
        mov_file = db.query(MOVFile).filter(MOVFile.id == file_id).first()

        if not mov_file:
            return False, f"File with ID {file_id} not found"

        # Check if file is already soft deleted
        if mov_file.deleted_at is not None:
            return False, "File has already been deleted"

        # Check if user is the uploader
        if mov_file.uploaded_by != user_id:
            return False, "You can only delete files you uploaded"

        # Load the assessment to check status
        assessment = (
            db.query(Assessment)
            .filter(Assessment.id == mov_file.assessment_id)
            .first()
        )

        if not assessment:
            return False, "Assessment not found"

        # Check assessment status - only allow deletion for DRAFT, REWORK, or NEEDS_REWORK
        allowed_statuses = [AssessmentStatus.DRAFT, AssessmentStatus.REWORK, AssessmentStatus.NEEDS_REWORK]
        if assessment.status not in allowed_statuses:
            return (
                False,
                f"Cannot delete files from {assessment.status} assessments. "
                f"Deletion is only allowed for Draft or Rework assessments.",
            )

        return True, None

    def delete_mov_file(self, db: Session, file_id: int, user_id: int) -> MOVFile:
        """
        Delete a MOV file from both Supabase Storage and database (soft delete).

        This method:
        1. Checks user permissions
        2. Deletes file from Supabase Storage
        3. Soft deletes database record (sets deleted_at timestamp)

        Args:
            db: Database session
            file_id: ID of the MOVFile to delete
            user_id: ID of the user requesting deletion

        Returns:
            MOVFile: The soft-deleted MOVFile instance

        Raises:
            HTTPException: If permission check fails or file not found
            Exception: If database operation fails
        """
        # Check permissions
        has_permission, error_message = self._check_delete_permission(
            db, file_id, user_id
        )

        if not has_permission:
            logger.warning(
                f"Permission denied: User {user_id} attempted to delete file {file_id}. "
                f"Reason: {error_message}"
            )
            raise HTTPException(status_code=403, detail=error_message)

        # Load the file
        mov_file = db.query(MOVFile).filter(MOVFile.id == file_id).first()

        if not mov_file:
            raise HTTPException(status_code=404, detail=f"File with ID {file_id} not found")

        # Extract storage path from file_url
        # file_url format: https://[project].supabase.co/storage/v1/object/public/mov-files/{storage_path}
        # We need to extract the path after 'mov-files/'
        storage_path = None
        try:
            url_parts = mov_file.file_url.split(f"/{self.MOV_FILES_BUCKET}/")
            if len(url_parts) == 2:
                storage_path = url_parts[1]
            else:
                # Fallback to old method if URL format is unexpected
                logger.warning(
                    f"Could not extract storage path from URL {mov_file.file_url}, "
                    f"using fallback method"
                )
                storage_path = self._get_storage_path(
                    mov_file.assessment_id, mov_file.indicator_id, mov_file.file_name
                )
        except Exception as e:
            logger.error(f"Error extracting storage path from URL: {str(e)}")
            # Fallback to old method
            storage_path = self._get_storage_path(
                mov_file.assessment_id, mov_file.indicator_id, mov_file.file_name
            )

        # Delete from Supabase Storage
        # Note: We don't fail if storage deletion fails - file might not exist
        deletion_success = self._delete_file_from_storage(storage_path)

        if not deletion_success:
            logger.warning(
                f"Storage deletion failed for {storage_path}, but continuing with soft delete"
            )

        # Soft delete database record
        try:
            mov_file.deleted_at = datetime.utcnow()
            db.commit()
            db.refresh(mov_file)

            logger.info(
                f"Successfully soft deleted MOVFile {file_id} by user {user_id}. "
                f"Storage deletion: {'success' if deletion_success else 'failed'}"
            )

            # After deleting the file, recalculate is_completed for the response
            # This ensures progress tracking updates immediately
            self._update_response_completion_status(
                db, mov_file.assessment_id, mov_file.indicator_id
            )

            return mov_file

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to soft delete MOVFile {file_id}: {str(e)}")
            raise Exception(f"Database operation failed: {str(e)}")


# Create a singleton instance
storage_service = StorageService()

