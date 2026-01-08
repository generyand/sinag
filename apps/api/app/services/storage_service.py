# 📦 Storage Service
# Handles file uploads to Supabase Storage for MOV files

import logging
import re
import time
from datetime import datetime
from urllib.parse import unquote
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session
from supabase import Client, create_client

from app.core.config import settings
from app.db.enums import AssessmentStatus
from app.db.models.assessment import Assessment, AssessmentResponse, MOVFile

# Setup logging
logger = logging.getLogger(__name__)

# Initialize Supabase admin client with service-role key for server-side operations
_supabase_client: Client | None = None


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

    def _sanitize_display_filename(
        self,
        indicator_code: str,
        field_label: str,
        extension: str,
        sequence_number: int = 1,
    ) -> str:
        """
        Generate a sanitized display filename from indicator code and field label.

        The filename format is: "{indicator_code} {sanitized_label} ({n}).{extension}"
        Example: "6.1.3 At least one (1) copy of proof of training such as Certificate of Completion and-or Participation (1).pdf"

        Special character handling:
        - "/" → "-" (common in "and/or")
        - "\\" → "-"
        - ":" → " -" (colon often precedes a list)
        - "*", "?", '"', "<", ">", "|" → removed (Windows reserved chars)
        - Multiple spaces → single space
        - Trim leading/trailing spaces

        Args:
            indicator_code: The indicator code (e.g., "6.1.3")
            field_label: The upload field label
            extension: File extension without dot (e.g., "pdf")
            sequence_number: File sequence number for multiple files (default: 1)

        Returns:
            str: Sanitized display filename
        """
        # Sanitize the field label
        sanitized_label = field_label

        # Replace forward/backward slashes with dashes
        sanitized_label = sanitized_label.replace("/", "-").replace("\\", "-")

        # Replace colon with " -"
        sanitized_label = sanitized_label.replace(":", " -")

        # Remove Windows reserved characters
        for char in ["*", "?", '"', "<", ">", "|"]:
            sanitized_label = sanitized_label.replace(char, "")

        # Collapse multiple spaces into single space
        sanitized_label = re.sub(r"\s+", " ", sanitized_label)

        # Trim leading/trailing whitespace
        sanitized_label = sanitized_label.strip()

        # Construct the display filename with sequence number
        display_filename = f"{indicator_code} {sanitized_label} ({sequence_number}).{extension}"

        return display_filename

    def upload_mov(
        self, file: UploadFile, *, response_id: int, db: Session
    ) -> dict[str, str | int]:
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
        response = db.query(AssessmentResponse).filter(AssessmentResponse.id == response_id).first()

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
        sanitized = re.sub(r"[^\w\s.-]", "_", original_filename)
        sanitized = sanitized.replace("..", "_").replace("/", "_").replace("\\", "_")

        # Remove leading/trailing whitespace and dots
        sanitized = sanitized.strip().strip(".")

        # If sanitization resulted in empty string, use a default
        if not sanitized:
            sanitized = "file"

        # Generate unique filename with UUID prefix
        unique_filename = f"{uuid4()}_{sanitized}"

        return unique_filename

    def _get_storage_path(self, assessment_id: int, indicator_id: int, filename: str) -> str:
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
        indicator_code: str | None = None,
        field_label: str | None = None,
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
            field_id: Optional field identifier for multi-field uploads
            indicator_code: Optional indicator code (e.g., "6.1.3") for display filename
            field_label: Optional field label for display filename

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

        # Generate display filename from indicator code + field label if provided
        if indicator_code and field_label:
            # Extract file extension from original filename
            extension = original_filename.rsplit(".", 1)[-1] if "." in original_filename else "file"

            # Count existing files for this field to determine sequence number
            existing_count = (
                db.query(MOVFile)
                .filter(
                    MOVFile.assessment_id == assessment_id,
                    MOVFile.indicator_id == indicator_id,
                    MOVFile.field_id == field_id,
                    MOVFile.deleted_at.is_(None),
                )
                .count()
            )

            # Sequence number is existing count + 1
            sequence_number = existing_count + 1

            display_filename = self._sanitize_display_filename(
                indicator_code, field_label, extension, sequence_number
            )
        else:
            display_filename = original_filename

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

        # Note: Multiple files are allowed per field. Users can manually delete files if needed.
        # Old files from before rework are kept for history and shown with annotations.

        # Create database record
        try:
            mov_file = self._save_mov_file_record(
                db=db,
                file_url=file_url,
                file_name=display_filename,  # Store display filename (indicator code + field label)
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
        Update the completion status of an assessment response after file changes.

        IMPORTANT: Creates an AssessmentResponse if one doesn't exist yet.
        This ensures that progress is tracked immediately when MOV files are uploaded,
        even before the user opens/interacts with the indicator form.

        Delegates to AssessmentService to ensure consistent validation logic (Single Source of Truth).
        """
        from sqlalchemy.orm import joinedload

        from app.db.models.assessment import AssessmentResponse
        from app.db.models.governance_area import Indicator

        # Import internally to avoid circular dependency
        from app.services.assessment_service import AssessmentService

        try:
            response = (
                db.query(AssessmentResponse)
                .options(
                    joinedload(AssessmentResponse.indicator),
                    joinedload(AssessmentResponse.assessment),
                    joinedload(AssessmentResponse.movs),
                )
                .filter(
                    AssessmentResponse.assessment_id == assessment_id,
                    AssessmentResponse.indicator_id == indicator_id,
                )
                .first()
            )

            # CRITICAL FIX: Create AssessmentResponse if it doesn't exist
            # This ensures progress tracking works immediately after MOV upload
            if not response:
                logger.info(
                    f"Creating AssessmentResponse for assessment {assessment_id}, indicator {indicator_id}"
                )
                # Verify the indicator exists
                indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
                if not indicator:
                    logger.error(f"Indicator {indicator_id} not found")
                    return

                # Create a new response with empty response_data
                response = AssessmentResponse(
                    assessment_id=assessment_id,
                    indicator_id=indicator_id,
                    response_data={},  # Empty - will be filled when user interacts
                    is_completed=False,
                    requires_rework=False,
                )
                db.add(response)
                db.flush()  # Get the ID

                # Reload with relationships for recompute
                response = (
                    db.query(AssessmentResponse)
                    .options(
                        joinedload(AssessmentResponse.indicator),
                        joinedload(AssessmentResponse.assessment),
                        joinedload(AssessmentResponse.movs),
                    )
                    .filter(AssessmentResponse.id == response.id)
                    .first()
                )

            # Delegate to AssessmentService logic
            service = AssessmentService()
            is_completed = service.recompute_response_completion(response)

            # Save the updated status
            db.add(response)
            db.commit()

            logger.info(
                f"Updated completion status for assessment {assessment_id}, indicator {indicator_id}: {is_completed}"
            )

        except Exception as e:
            logger.error(
                f"Failed to update completion status for assessment {assessment_id}, "
                f"indicator {indicator_id}: {str(e)}"
            )
            import traceback

            logger.error(traceback.format_exc())
            # Don't raise, as file operation was successful

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
        assessment = db.query(Assessment).filter(Assessment.id == mov_file.assessment_id).first()

        if not assessment:
            return False, "Assessment not found"

        # Check assessment status - only allow deletion for DRAFT, REWORK, or NEEDS_REWORK
        allowed_statuses = [
            AssessmentStatus.DRAFT,
            AssessmentStatus.REWORK,
            AssessmentStatus.NEEDS_REWORK,
        ]
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
        has_permission, error_message = self._check_delete_permission(db, file_id, user_id)

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

    # ============================================================================
    # Story 4.x: Image Rotation Service
    # Allows BLGU users to permanently rotate uploaded images
    # ============================================================================

    def rotate_image_file(
        self, db: Session, file_id: int, user_id: int, degrees: int = 90
    ) -> MOVFile:
        """
        Rotate an image file in Supabase Storage permanently.

        This method:
        1. Checks user permissions (same rules as delete)
        2. Downloads the image from Supabase Storage
        3. Rotates it using ImageProcessingService
        4. Re-uploads to replace the original file
        5. Updates file_size in the database

        Args:
            db: Database session
            file_id: ID of the MOVFile to rotate
            user_id: ID of the user requesting rotation
            degrees: Rotation angle in degrees clockwise (default: 90)

        Returns:
            MOVFile: The updated MOVFile instance

        Raises:
            HTTPException 400: If file is not an image
            HTTPException 403: If permission check fails
            HTTPException 404: If file not found
            Exception: If rotation or upload fails
        """
        # Reuse permission check from delete (same rules apply)
        has_permission, error_message = self._check_delete_permission(db, file_id, user_id)

        if not has_permission:
            logger.warning(
                f"Permission denied: User {user_id} attempted to rotate file {file_id}. "
                f"Reason: {error_message}"
            )
            raise HTTPException(status_code=403, detail=error_message)

        # Load the file
        mov_file = db.query(MOVFile).filter(MOVFile.id == file_id).first()

        if not mov_file:
            raise HTTPException(status_code=404, detail=f"File with ID {file_id} not found")

        # Check if file is an image
        if not mov_file.file_type.startswith("image/"):
            raise HTTPException(
                status_code=400, detail="Only image files (JPEG, PNG) can be rotated"
            )

        # Validate content type is specifically supported
        if mov_file.file_type not in ("image/jpeg", "image/png"):
            raise HTTPException(
                status_code=400,
                detail=f"Rotation not supported for file type: {mov_file.file_type}. "
                f"Only JPEG and PNG images are supported.",
            )

        # Extract storage path from file_url (same logic as delete_mov_file)
        storage_path = None
        try:
            if f"/{self.MOV_FILES_BUCKET}/" in mov_file.file_url:
                encoded_path = mov_file.file_url.split(f"/{self.MOV_FILES_BUCKET}/")[1]
                storage_path = unquote(encoded_path).split("?")[0].lstrip("/")
            else:
                raise ValueError(f"Could not extract storage path from URL: {mov_file.file_url}")
        except Exception as e:
            logger.error(f"Error extracting storage path from URL {mov_file.file_url}: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Invalid file URL format: {mov_file.file_url}"
            )

        # Keep original bytes for rollback
        original_bytes = None
        original_deleted = False

        try:
            supabase = _get_supabase_client()

            # Step 1: Download the current image
            logger.info(f"Downloading image from storage: {storage_path}")
            download_result = supabase.storage.from_(self.MOV_FILES_BUCKET).download(storage_path)

            if not download_result:
                raise Exception("Failed to download file from storage")

            original_bytes = download_result

            # Step 2: Rotate the image
            from app.services.image_processing_service import image_processing_service

            rotated_bytes, was_rotated = image_processing_service.rotate_image(
                original_bytes, mov_file.file_type, degrees
            )

            if not was_rotated:
                raise Exception("Failed to rotate image")

            # Step 3: Delete the original file from storage
            logger.info(f"Deleting original file from storage: {storage_path}")
            supabase.storage.from_(self.MOV_FILES_BUCKET).remove([storage_path])
            original_deleted = True

            # Step 4: Re-upload the rotated image with the same path
            logger.info(f"Uploading rotated image to storage: {storage_path}")
            upload_result = supabase.storage.from_(self.MOV_FILES_BUCKET).upload(
                path=storage_path,
                file=rotated_bytes,
                file_options={"content-type": mov_file.file_type, "upsert": "true"},
            )

            if isinstance(upload_result, dict) and upload_result.get("error"):
                raise Exception(f"Supabase upload error: {upload_result['error']}")

            # Step 5: Update file_size in database (rotation might change size slightly)
            mov_file.file_size = len(rotated_bytes)
            db.commit()
            db.refresh(mov_file)

            logger.info(
                f"Successfully rotated image {file_id} by {degrees} degrees. "
                f"New size: {len(rotated_bytes)} bytes"
            )

            return mov_file

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to rotate image {file_id}: {str(e)}")

            # Rollback: If we deleted the original but failed to upload rotated version,
            # try to restore the original
            if original_bytes and original_deleted:
                try:
                    supabase = _get_supabase_client()
                    supabase.storage.from_(self.MOV_FILES_BUCKET).upload(
                        path=storage_path,
                        file=original_bytes,
                        file_options={"content-type": mov_file.file_type, "upsert": "true"},
                    )
                    logger.info(f"Rollback successful: restored original file {storage_path}")
                except Exception as rollback_error:
                    logger.error(
                        f"CRITICAL: Failed to restore original file {storage_path}: {rollback_error}. "
                        f"Manual recovery required!"
                    )

            raise HTTPException(status_code=500, detail=f"Image rotation failed: {str(e)}")

    # ============================================================================
    # Signed URL Generation for Secure File Access
    # ============================================================================

    def get_signed_url(self, file_url: str, expires_in: int = 3600) -> str:
        """
        Generate a signed URL for secure, time-limited access to a file.

        This method extracts the storage path from a file URL and generates
        a signed URL that expires after the specified duration.

        Args:
            file_url: The public file URL stored in the database
            expires_in: URL expiration time in seconds (default: 3600 = 1 hour)

        Returns:
            str: A signed URL that provides temporary access to the file

        Raises:
            ValueError: If the storage path cannot be extracted from the URL
            Exception: If signed URL generation fails
        """
        # Extract storage path from file_url
        # URL format: https://[project].supabase.co/storage/v1/object/public/mov-files/{path}
        storage_path = None
        try:
            # Try to extract path after bucket name
            if f"/{self.MOV_FILES_BUCKET}/" in file_url:
                encoded_path = file_url.split(f"/{self.MOV_FILES_BUCKET}/")[1]
                # Decode path, remove query params, and strip leading slashes
                storage_path = unquote(encoded_path).split("?")[0].lstrip("/")
            else:
                raise ValueError(f"Could not extract storage path from URL: {file_url}")
        except Exception as e:
            logger.error(f"Error extracting storage path from URL {file_url}: {str(e)}")
            raise ValueError(f"Invalid file URL format: {file_url}")

        # Get Supabase client and generate signed URL
        try:
            supabase = _get_supabase_client()

            # DEBUG LOGGING for file viewing issue
            logger.info(f"[SIGNED_URL_DEBUG] URL: {file_url}")
            logger.info(f"[SIGNED_URL_DEBUG] Extracted Storage Path: {storage_path}")

            result = supabase.storage.from_(self.MOV_FILES_BUCKET).create_signed_url(
                path=storage_path,
                expires_in=expires_in,
            )

            # Check for error response from Supabase
            if isinstance(result, dict):
                # Handle error responses
                if "error" in result:
                    error_msg = result.get("error", "Unknown error")
                    error_str = str(error_msg).lower()
                    if "not found" in error_str or "object not found" in error_str:
                        logger.warning(
                            f"File not found in storage: {storage_path}. "
                            f"The physical file may have been deleted."
                        )
                        raise FileNotFoundError(f"File not found in storage: {storage_path}")
                    raise Exception(f"Supabase error: {error_msg}")

                # Extract signed URL from successful response
                if "signedURL" in result:
                    signed_url = result["signedURL"]
                elif "signedUrl" in result:
                    signed_url = result["signedUrl"]
                else:
                    # Unexpected response format
                    logger.warning(f"Unexpected response format from create_signed_url: {result}")
                    raise Exception("Failed to extract signed URL from response")
            elif hasattr(result, "signed_url"):
                signed_url = result.signed_url
            else:
                # Handle different response formats from supabase-py
                signed_url = str(result)

            # Validate the signed URL is not empty or an error message
            if not signed_url or signed_url.startswith("Error"):
                raise Exception(f"Invalid signed URL received: {signed_url}")

            logger.debug(f"Generated signed URL for {storage_path}, expires in {expires_in}s")
            return signed_url

        except FileNotFoundError:
            # Re-raise FileNotFoundError to be handled by caller
            raise
        except Exception as e:
            error_str = str(e).lower()
            # Check if error indicates file not found
            if "not found" in error_str or "object not found" in error_str or "404" in error_str:
                logger.warning(f"File not found in storage: {storage_path}. Error: {str(e)}")
                raise FileNotFoundError(f"File not found in storage: {storage_path}")
            logger.error(f"Failed to generate signed URL for {storage_path}: {str(e)}")
            # Log the exception type and args to understand "illegal path" source
            logger.error(f"[SIGNED_URL_DEBUG] Exception Type: {type(e).__name__}, Args: {e.args}")
            raise Exception(f"Failed to generate signed URL: {str(e)}")

    def get_signed_url_for_file(
        self, db: Session, file_id: int, user_id: int, expires_in: int = 3600
    ) -> str:
        """
        Generate a signed URL for a MOV file with permission checking.

        This method verifies that the user has permission to access the file
        before generating a signed URL.

        Args:
            db: Database session
            file_id: ID of the MOV file
            user_id: ID of the requesting user
            expires_in: URL expiration time in seconds (default: 3600 = 1 hour)

        Returns:
            str: A signed URL that provides temporary access to the file

        Raises:
            HTTPException 404: If file not found
            HTTPException 403: If user doesn't have permission
            Exception: If signed URL generation fails
        """
        from app.db.models.assessment import Assessment
        from app.db.models.user import User

        # Load the MOV file
        mov_file = db.query(MOVFile).filter(MOVFile.id == file_id).first()

        if not mov_file:
            raise HTTPException(status_code=404, detail=f"File with ID {file_id} not found")

        if mov_file.deleted_at is not None:
            raise HTTPException(status_code=404, detail="File has been deleted")

        # Load the user to check role
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=403, detail="User not found")

        # Permission check based on user role
        from app.db.enums import UserRole
        from app.db.models.governance_area import Indicator

        # KATUPARAN_CENTER_USER should not access individual MOV files
        # They only have read-only access to aggregated analytics data
        if user.role == UserRole.KATUPARAN_CENTER_USER:
            raise HTTPException(
                status_code=403,
                detail="Katuparan Center users do not have access to individual MOV files",
            )

        # BLGU users can only access files from their own barangay's assessments
        if user.role == UserRole.BLGU_USER:
            assessment = (
                db.query(Assessment).filter(Assessment.id == mov_file.assessment_id).first()
            )
            if assessment:
                # Get the barangay_id through the assessment's blgu_user
                # Assessment doesn't have barangay_id directly - it's linked via blgu_user_id
                blgu_user = db.query(User).filter(User.id == assessment.blgu_user_id).first()
                if blgu_user and blgu_user.barangay_id != user.barangay_id:
                    raise HTTPException(
                        status_code=403, detail="You don't have permission to access this file"
                    )

        # VALIDATORs can only access files within their assigned governance area
        if user.role == UserRole.VALIDATOR and user.validator_area_id:
            indicator = db.query(Indicator).filter(Indicator.id == mov_file.indicator_id).first()
            if indicator and indicator.governance_area_id != user.validator_area_id:
                raise HTTPException(
                    status_code=403,
                    detail="You can only access files within your assigned governance area",
                )

        # ASSESSOR and MLGOO_DILG have access to all files (no additional restrictions)

        # Generate and return signed URL
        try:
            return self.get_signed_url(mov_file.file_url, expires_in)
        except FileNotFoundError:
            # File record exists in database but physical file is missing from storage
            logger.error(
                f"Physical file missing from storage for MOV file {file_id}. "
                f"URL: {mov_file.file_url}. The file may have been deleted from storage."
            )
            raise HTTPException(
                status_code=404,
                detail="File not found in storage. The physical file may have been deleted. "
                "Please re-upload the file.",
            )


# Create a singleton instance
storage_service = StorageService()
