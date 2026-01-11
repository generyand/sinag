# 👥 User Service
# Business logic for user management operations

import logging
import re
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from supabase import Client, create_client

from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.db.enums import UserRole
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea
from app.db.models.user import User
from app.schemas.user import UserAdminCreate, UserAdminUpdate, UserCreate, UserUpdate

# Setup logging
logger = logging.getLogger(__name__)

# Supabase client for logo storage
_supabase_logo_client: Client | None = None


def _get_supabase_client() -> Client:
    """Get or initialize the Supabase client for logo storage."""
    global _supabase_logo_client

    if _supabase_logo_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError(
                "Supabase storage not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
            )

        try:
            _supabase_logo_client = create_client(
                settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY
            )
            logger.info("Supabase logo storage client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase logo storage client: {str(e)}")
            raise

    return _supabase_logo_client


class UserService:
    """Service class for user management operations.

    This service handles all user-related business logic following the SINAG
    RBAC model with five distinct roles: MLGOO_DILG, VALIDATOR, ASSESSOR, BLGU_USER,
    and KATUPARAN_CENTER_USER.

    **Role-Based Field Requirements** (after workflow restructuring):
    - ASSESSOR: Requires assessor_area_id (governance area assignment)
    - BLGU_USER: Requires barangay_id (barangay assignment)
    - VALIDATOR/MLGOO_DILG/KATUPARAN_CENTER_USER: No assignments required (system-wide access)

    **Business Rules**:
    - Email addresses must be unique across all users
    - Assessors can only be assigned to one governance area
    - BLGU users can only be assigned to one barangay
    - Password changes clear the must_change_password flag
    - Admin functions require elevated privileges

    See Also:
        - apps/api/app/db/models/user.py: User model definition
        - apps/api/app/db/enums.py: UserRole enum
        - CLAUDE.md: Complete RBAC documentation
    """

    def get_user_by_id(self, db: Session, user_id: int) -> User | None:
        """Get a user by their ID.

        Args:
            db: Active database session for the query
            user_id: Primary key of the user to retrieve

        Returns:
            User instance if found, None otherwise

        Example:
            >>> user = user_service.get_user_by_id(db, user_id=42)
            >>> print(user.email if user else "Not found")
            "example@dilg.gov.ph"
        """
        return db.query(User).filter(User.id == user_id).first()

    def get_user_by_email(self, db: Session, email: str) -> User | None:
        """Get a user by their email address.

        Used for authentication lookups and email uniqueness validation.
        Email comparison is case-insensitive via database collation.

        Args:
            db: Active database session for the query
            email: Email address to search for (case-insensitive)

        Returns:
            User instance if found, None otherwise

        Example:
            >>> user = user_service.get_user_by_email(db, "validator@dilg.gov.ph")
            >>> print(user.role if user else "Not found")
            "VALIDATOR"
        """
        return db.query(User).filter(User.email == email).first()

    def get_users(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        search: str | None = None,
        role: str | None = None,
        is_active: bool | None = None,
    ) -> tuple[list[User], int]:
        """Get a paginated list of users with optional filtering.

        Supports filtering by search term (name/email), role, and active status.
        Results are paginated for performance with large user datasets.

        Args:
            db: Active database session for the query
            skip: Number of records to skip for pagination (default: 0)
            limit: Maximum number of records to return (default: 100)
            search: Optional search term to filter by name or email (case-insensitive)
            role: Optional role filter (MLGOO_DILG, VALIDATOR, ASSESSOR, BLGU_USER, KATUPARAN_CENTER_USER)
            is_active: Optional active status filter (True/False/None for all)

        Returns:
            Tuple of (list of User instances, total count before pagination)

        Example:
            >>> users, total = user_service.get_users(
            ...     db, skip=0, limit=20, role="VALIDATOR", is_active=True
            ... )
            >>> print(f"Found {total} validators, showing first {len(users)}")
            Found 15 validators, showing first 15
        """
        query = db.query(User)

        # Apply filters
        if search:
            query = query.filter(
                (User.name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
            )

        if role:
            query = query.filter(User.role == role)

        if is_active is not None:
            query = query.filter(User.is_active == is_active)

        # Get total count before pagination
        total = query.count()

        # Apply pagination
        users = query.offset(skip).limit(limit).all()

        return users, total

    def create_user(self, db: Session, user_create: UserCreate) -> User:
        """Create a new user with default BLGU_USER role.

        This is the standard user creation endpoint for non-admin users.
        Always assigns the BLGU_USER role regardless of input to enforce security.

        **Business Rules**:
        - Role is always set to BLGU_USER (input role is ignored)
        - Barangay assignment is required via barangay_id
        - Password is securely hashed before storage
        - Email must be unique (enforced by database constraint)

        Args:
            db: Active database session for the transaction
            user_create: User creation schema with email, name, phone, barangay_id, password

        Returns:
            Created User instance with hashed password and default role

        Raises:
            IntegrityError: If email already exists (caught at database level)

        Example:
            >>> from app.schemas.user import UserCreate
            >>> user_data = UserCreate(
            ...     email="barangay@example.com",
            ...     name="Juan Dela Cruz",
            ...     phone_number="+639171234567",
            ...     barangay_id=42,
            ...     password="SecurePassword123!"
            ... )
            >>> user = user_service.create_user(db, user_data)
            >>> print(user.role)
            BLGU_USER

        See Also:
            - create_user_admin(): Admin endpoint for creating users with any role
        """
        # This function is simplified as regular users can't choose complex roles.
        db_user = User(
            email=user_create.email,
            name=user_create.name,
            phone_number=user_create.phone_number,
            role=UserRole.BLGU_USER,  # Enforce default role
            barangay_id=user_create.barangay_id,
            hashed_password=get_password_hash(user_create.password),
        )

        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    def create_user_admin(self, db: Session, user_create: UserAdminCreate) -> User:
        """Create a new user with admin privileges allowing all role assignments.

        This endpoint allows MLGOO_DILG admins to create users with any role and
        enforces role-specific field requirements automatically.

        **Role-Based Field Logic** (auto-enforced, after workflow restructuring):
        - **ASSESSOR**: Requires assessor_area_id (area-specific), clears barangay_id
        - **BLGU_USER**: Requires barangay_id, clears assessor_area_id
        - **VALIDATOR/MLGOO_DILG/KATUPARAN_CENTER_USER**: Clears both assessor_area_id and barangay_id (system-wide)

        **Business Rules**:
        - Email must be unique across all users
        - Assessor must have governance area assignment
        - BLGU user must have barangay assignment
        - Password is securely hashed before storage
        - System-wide roles (VALIDATOR, MLGOO_DILG) have no area restrictions

        Args:
            db: Active database session for the transaction
            user_create: Admin creation schema with role, assessor_area_id, barangay_id, password

        Returns:
            Created User instance with role-appropriate field assignments

        Raises:
            HTTPException 400: If email already exists
            HTTPException 400: If ASSESSOR role without assessor_area_id
            HTTPException 400: If BLGU_USER role without barangay_id

        Example:
            >>> # Create an ASSESSOR assigned to governance area 3
            >>> from app.schemas.user import UserAdminCreate
            >>> from app.db.enums import UserRole
            >>> assessor_data = UserAdminCreate(
            ...     email="assessor@dilg.gov.ph",
            ...     name="Maria Santos",
            ...     role=UserRole.ASSESSOR,
            ...     assessor_area_id=3,  # Safety, Peace and Order
            ...     password="SecurePassword123!"
            ... )
            >>> assessor = user_service.create_user_admin(db, assessor_data)
            >>> print(f"{assessor.role}: Area {assessor.assessor_area_id}")
            ASSESSOR: Area 3

        See Also:
            - update_user_admin(): Admin endpoint for updating user role assignments
            - CLAUDE.md: Complete RBAC role definitions
        """
        if self.get_user_by_email(db, user_create.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Business logic for role-specific fields (after workflow restructuring)
        if user_create.role == UserRole.ASSESSOR:
            # ASSESSOR role requires assessor_area_id (area-specific after restructuring)
            if not user_create.assessor_area_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Governance area is required for Assessor role.",
                )
            # Verify governance area exists
            governance_area = (
                db.query(GovernanceArea)
                .filter(GovernanceArea.id == user_create.assessor_area_id)
                .first()
            )
            if not governance_area:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Governance area with ID {user_create.assessor_area_id} does not exist.",
                )
            # Ensure barangay_id is null for assessors
            user_create.barangay_id = None
        elif user_create.role == UserRole.BLGU_USER:
            # BLGU_USER role requires barangay_id
            if not user_create.barangay_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Barangay is required for BLGU User role.",
                )
            # Verify barangay exists
            barangay = db.query(Barangay).filter(Barangay.id == user_create.barangay_id).first()
            if not barangay:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Barangay with ID {user_create.barangay_id} does not exist.",
                )
            # Ensure assessor_area_id is null for BLGU users
            user_create.assessor_area_id = None
        elif user_create.role in (
            UserRole.VALIDATOR,
            UserRole.MLGOO_DILG,
            UserRole.KATUPARAN_CENTER_USER,
        ):
            # VALIDATOR (now system-wide), MLGOO_DILG, and external user roles should not have any assignments
            user_create.assessor_area_id = None
            user_create.barangay_id = None

        db_user = User(
            **user_create.model_dump(exclude={"password"}),
            hashed_password=get_password_hash(user_create.password),
        )

        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    def update_user(self, db: Session, user_id: int, user_update: UserUpdate) -> User | None:
        """Update user information (regular user update)."""
        db_user = self.get_user_by_id(db, user_id)
        if not db_user:
            return None

        # Check email uniqueness if email is being updated
        if user_update.email and user_update.email != db_user.email:
            if self.get_user_by_email(db, user_update.email):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered",
                )

        # Update fields that are provided
        update_data = user_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_user, field, value)

        db.commit()
        db.refresh(db_user)
        return db_user

    def update_user_admin(
        self, db: Session, user_id: int, user_update: UserAdminUpdate
    ) -> User | None:
        """Update user information with admin privileges (can update all fields)."""
        db_user = self.get_user_by_id(db, user_id)
        if not db_user:
            return None

        update_data = user_update.model_dump(exclude_unset=True)

        # Business logic for role-specific fields (after workflow restructuring)
        role = update_data.get("role", db_user.role)

        if role == UserRole.ASSESSOR:
            # ASSESSOR role requires assessor_area_id (area-specific after restructuring)
            assessor_area_id = update_data.get("assessor_area_id", db_user.assessor_area_id)
            if not assessor_area_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Governance area is required for Assessor role.",
                )
            # Verify governance area exists if it's being updated
            if "assessor_area_id" in update_data and update_data["assessor_area_id"]:
                governance_area = (
                    db.query(GovernanceArea)
                    .filter(GovernanceArea.id == update_data["assessor_area_id"])
                    .first()
                )
                if not governance_area:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Governance area with ID {update_data['assessor_area_id']} does not exist.",
                    )
            # Ensure barangay_id is set to null if role is changed to Assessor
            update_data["barangay_id"] = None
        elif role == UserRole.BLGU_USER:
            # BLGU_USER role requires barangay_id
            barangay_id = update_data.get("barangay_id", db_user.barangay_id)
            if not barangay_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Barangay is required for BLGU User role.",
                )
            # Verify barangay exists if it's being updated
            if "barangay_id" in update_data and update_data["barangay_id"]:
                barangay = (
                    db.query(Barangay).filter(Barangay.id == update_data["barangay_id"]).first()
                )
                if not barangay:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Barangay with ID {update_data['barangay_id']} does not exist.",
                    )
            # Ensure assessor_area_id is set to null for BLGU users
            update_data["assessor_area_id"] = None
        elif role in (
            UserRole.VALIDATOR,
            UserRole.MLGOO_DILG,
            UserRole.KATUPARAN_CENTER_USER,
        ):
            # VALIDATOR (now system-wide), MLGOO_DILG, and external user roles should not have any assignments
            update_data["assessor_area_id"] = None
            update_data["barangay_id"] = None

        # Check email uniqueness if email is being updated
        if "email" in update_data and update_data["email"] != db_user.email:
            if self.get_user_by_email(db, update_data["email"]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered",
                )

        for field, value in update_data.items():
            setattr(db_user, field, value)

        db.commit()
        db.refresh(db_user)
        return db_user

    def deactivate_user(self, db: Session, user_id: int) -> User | None:
        """Deactivate a user (soft delete)."""
        db_user = self.get_user_by_id(db, user_id)
        if not db_user:
            return None

        setattr(db_user, "is_active", False)
        db.commit()
        db.refresh(db_user)
        return db_user

    def activate_user(self, db: Session, user_id: int) -> User | None:
        """Activate a user."""
        db_user = self.get_user_by_id(db, user_id)
        if not db_user:
            return None

        setattr(db_user, "is_active", True)
        db.commit()
        db.refresh(db_user)
        return db_user

    def change_password(
        self, db: Session, user_id: int, current_password: str, new_password: str
    ) -> bool:
        """Change user password after verifying current password.

        Implements secure password change workflow with current password verification.
        Automatically clears the must_change_password flag upon successful change.

        **Business Rules**:
        - Current password must match existing hashed password
        - New password is securely hashed before storage
        - Clears must_change_password flag (allows normal login)
        - Does not enforce password complexity (handled at schema level)

        Args:
            db: Active database session for the transaction
            user_id: ID of the user changing their password
            current_password: Plain text current password for verification
            new_password: Plain text new password to be hashed and stored

        Returns:
            True if password change succeeded, False if user not found or current password incorrect

        Example:
            >>> success = user_service.change_password(
            ...     db, user_id=42,
            ...     current_password="OldPassword123!",
            ...     new_password="NewSecurePassword456!"
            ... )
            >>> print("Password changed" if success else "Failed: invalid current password")
            Password changed

        See Also:
            - reset_password(): Admin function to force password reset
            - app.core.security.verify_password(): Password verification function
        """
        db_user = self.get_user_by_id(db, user_id)
        if not db_user:
            return False

        # Verify current password
        if not verify_password(current_password, str(db_user.hashed_password)):
            return False

        # Update password
        setattr(db_user, "hashed_password", get_password_hash(new_password))
        setattr(db_user, "must_change_password", False)
        db.commit()
        return True

    def reset_password(self, db: Session, user_id: int, new_password: str) -> User | None:
        """Reset user password without current password verification (admin function).

        This is an admin-only function that bypasses current password verification.
        Sets the must_change_password flag to force user to change password on next login.

        **Business Rules**:
        - Does not require current password (admin override)
        - Sets must_change_password=True (forces password change on next login)
        - New password is securely hashed before storage
        - Only MLGOO_DILG admins should have access to this function

        Args:
            db: Active database session for the transaction
            user_id: ID of the user whose password is being reset
            new_password: Plain text temporary password to be hashed and stored

        Returns:
            Updated User instance with new password and must_change_password=True,
            or None if user not found

        Example:
            >>> user = user_service.reset_password(
            ...     db, user_id=42, new_password="TempPassword123!"
            ... )
            >>> print(f"Must change: {user.must_change_password}")
            Must change: True

        See Also:
            - change_password(): User-initiated password change with verification
        """
        db_user = self.get_user_by_id(db, user_id)
        if not db_user:
            return None

        setattr(db_user, "hashed_password", get_password_hash(new_password))
        setattr(db_user, "must_change_password", True)
        db.commit()
        db.refresh(db_user)
        return db_user

    def get_user_stats(self, db: Session) -> dict:
        """Get user statistics for admin dashboard.

        Aggregates user data for the MLGOO_DILG dashboard including
        user counts by status and role.

        Args:
            db: Active database session for the query

        Returns:
            Dictionary with user statistics:
            - total_users: Total number of users (active + inactive)
            - active_users: Number of active users
            - inactive_users: Number of inactive users
            - users_need_password_change: Active users with must_change_password=True
            - users_by_role: Dict mapping role name to count

        Example:
            >>> stats = user_service.get_user_stats(db)
            >>> print(f"Total: {stats['total_users']}, Active: {stats['active_users']}")
            Total: 150, Active: 142
            >>> print(f"Validators: {stats['users_by_role']['VALIDATOR']}")
            Validators: 18
        """
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active).count()
        inactive_users = total_users - active_users
        users_need_password_change = (
            db.query(User).filter(User.must_change_password, User.is_active).count()
        )

        # Users by role
        role_stats = db.query(User.role, func.count(User.id)).group_by(User.role).all()  # type: ignore

        return {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": inactive_users,
            "users_need_password_change": users_need_password_change,
            "users_by_role": {role: count for role, count in role_stats},
        }

    # ============================================================================
    # User Logo Upload/Delete Methods
    # ============================================================================

    # Storage bucket for user logos
    LOGO_BUCKET = "user-logos"

    # Allowed MIME types for logo uploads
    ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"]

    # Maximum file size for logos (5MB)
    MAX_LOGO_SIZE = 5 * 1024 * 1024

    # Magic bytes for image validation
    IMAGE_MAGIC_BYTES = {
        b"\xff\xd8\xff": "jpeg",  # JPEG
        b"\x89PNG\r\n\x1a\n": "png",  # PNG
        b"RIFF": "webp",  # WebP (starts with RIFF, followed by file size, then WEBP)
    }

    def _detect_image_type(self, file_contents: bytes) -> str | None:
        """
        Detect image type by checking magic bytes.

        Args:
            file_contents: The file contents as bytes

        Returns:
            str: Detected image type ('jpeg', 'png', 'webp') or None if not recognized
        """
        if len(file_contents) < 12:
            return None

        # Check JPEG magic bytes
        if file_contents[:3] == b"\xff\xd8\xff":
            return "jpeg"

        # Check PNG magic bytes
        if file_contents[:8] == b"\x89PNG\r\n\x1a\n":
            return "png"

        # Check WebP magic bytes (RIFF....WEBP)
        if file_contents[:4] == b"RIFF" and file_contents[8:12] == b"WEBP":
            return "webp"

        return None

    def _validate_logo_file(self, file: UploadFile, file_contents: bytes) -> None:
        """
        Validate logo file type and size.

        Args:
            file: The uploaded file
            file_contents: The file contents as bytes

        Raises:
            HTTPException 400: If file type or size is invalid
        """
        # Check file type via content-type header
        if file.content_type not in self.ALLOWED_LOGO_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Allowed types: JPEG, PNG, WebP.",
            )

        # SECURITY: Verify actual file content via magic bytes to prevent content-type spoofing
        detected_type = self._detect_image_type(file_contents)
        if detected_type is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File content does not match a valid image format.",
            )

        # Check file size
        if len(file_contents) > self.MAX_LOGO_SIZE:
            size_mb = len(file_contents) / (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds 5MB limit. Your file: {size_mb:.2f}MB",
            )

    def _generate_logo_filename(self, user_id: int, original_filename: str) -> str:
        """
        Generate a unique filename for the logo.

        Args:
            user_id: The user's ID
            original_filename: The original file name

        Returns:
            str: Unique filename in format: user_{user_id}/{uuid}_{sanitized_filename}
        """
        # Sanitize filename: remove path separators and special characters
        sanitized = re.sub(r"[^\w\s.-]", "_", original_filename)
        sanitized = sanitized.replace("..", "_").replace("/", "_").replace("\\", "_")
        sanitized = sanitized.strip().strip(".")

        if not sanitized:
            sanitized = "logo"

        # Generate unique filename with UUID prefix
        unique_filename = f"{uuid4()}_{sanitized}"

        return f"user_{user_id}/{unique_filename}"

    def upload_user_logo(self, db: Session, user_id: int, file: UploadFile) -> User:
        """
        Upload a profile logo for a user.

        This method:
        1. Validates the uploaded file (type, size)
        2. Deletes existing logo if present
        3. Uploads new logo to Supabase Storage
        4. Updates user record with logo URL

        Args:
            db: Database session
            user_id: ID of the user uploading the logo
            file: The uploaded file (FastAPI UploadFile)

        Returns:
            User: The updated user with new logo_url

        Raises:
            HTTPException 400: If file type/size is invalid
            HTTPException 404: If user not found
            HTTPException 500: If upload fails
        """
        # Get the user
        user = self.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # Read file contents
        file_contents = file.file.read()

        # Validate file
        self._validate_logo_file(file, file_contents)

        # Get Supabase client
        supabase = _get_supabase_client()

        # Delete existing logo if present
        if user.logo_url:
            try:
                # Extract storage path from URL
                # URL format: https://[project].supabase.co/storage/v1/object/public/user-logos/{path}
                if f"/{self.LOGO_BUCKET}/" in user.logo_url:
                    old_path = user.logo_url.split(f"/{self.LOGO_BUCKET}/")[1]
                    supabase.storage.from_(self.LOGO_BUCKET).remove([old_path])
                    logger.info(f"Deleted old logo for user {user_id}: {old_path}")
            except Exception as e:
                logger.warning(f"Failed to delete old logo for user {user_id}: {str(e)}")
                # Continue with upload even if deletion fails

        # Generate unique filename
        original_filename = file.filename or "logo"
        storage_path = self._generate_logo_filename(user_id, original_filename)

        # Upload to Supabase Storage
        try:
            result = supabase.storage.from_(self.LOGO_BUCKET).upload(
                path=storage_path,
                file=file_contents,
                file_options={
                    "content-type": file.content_type or "image/jpeg",
                    "upsert": "true",  # Must be string, not boolean
                },
            )

            # Check for errors
            if isinstance(result, dict) and result.get("error"):
                raise Exception(f"Supabase upload error: {result['error']}")

            # Get public URL
            logo_url = supabase.storage.from_(self.LOGO_BUCKET).get_public_url(storage_path)

            logger.info(f"Successfully uploaded logo for user {user_id}: {storage_path}")

        except Exception as e:
            logger.error(f"Failed to upload logo for user {user_id}: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload logo. Please try again later.",
            )

        # Update user record
        user.logo_url = logo_url
        user.logo_uploaded_at = datetime.now(UTC)
        db.commit()
        db.refresh(user)

        return user

    def delete_user_logo(self, db: Session, user_id: int) -> User:
        """
        Delete a user's profile logo.

        This method:
        1. Deletes the logo from Supabase Storage
        2. Clears the logo_url and logo_uploaded_at fields

        Args:
            db: Database session
            user_id: ID of the user whose logo should be deleted

        Returns:
            User: The updated user with cleared logo fields

        Raises:
            HTTPException 404: If user not found or has no logo
            HTTPException 500: If deletion fails
        """
        # Get the user
        user = self.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        if not user.logo_url:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User has no logo to delete",
            )

        # Get Supabase client
        supabase = _get_supabase_client()

        # Delete from Supabase Storage
        try:
            # Extract storage path from URL
            if f"/{self.LOGO_BUCKET}/" in user.logo_url:
                storage_path = user.logo_url.split(f"/{self.LOGO_BUCKET}/")[1]
                result = supabase.storage.from_(self.LOGO_BUCKET).remove([storage_path])

                # Check for errors
                if isinstance(result, list) and len(result) > 0:
                    # Check if any item has an error
                    for item in result:
                        if isinstance(item, dict) and item.get("error"):
                            logger.warning(
                                f"Error deleting logo file {storage_path}: {item['error']}"
                            )

                logger.info(f"Deleted logo for user {user_id}: {storage_path}")
            else:
                logger.warning(f"Could not extract storage path from URL: {user.logo_url}")

        except Exception as e:
            logger.error(f"Failed to delete logo from storage for user {user_id}: {str(e)}")
            # Continue to clear database record even if storage deletion fails

        # Clear user logo fields
        user.logo_url = None
        user.logo_uploaded_at = None
        db.commit()
        db.refresh(user)

        return user


# Create service instance
user_service = UserService()
