# 👥 User Service
# Business logic for user management operations

from typing import List, Optional

from app.core.security import get_password_hash, verify_password
from app.db.enums import UserRole
from app.db.models.user import User
from app.db.models.governance_area import GovernanceArea
from app.db.models.barangay import Barangay
from app.schemas.user import UserAdminCreate, UserAdminUpdate, UserCreate, UserUpdate
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session


class UserService:
    """Service class for user management operations.

    This service handles all user-related business logic following the SINAG
    RBAC model with five distinct roles: MLGOO_DILG, VALIDATOR, ASSESSOR, BLGU_USER,
    and KATUPARAN_CENTER_USER.

    **Role-Based Field Requirements**:
    - VALIDATOR: Requires validator_area_id (governance area assignment)
    - BLGU_USER: Requires barangay_id (barangay assignment)
    - ASSESSOR/MLGOO_DILG/KATUPARAN_CENTER_USER: No assignments required (system-wide or aggregated access)

    **Business Rules**:
    - Email addresses must be unique across all users
    - Validators can only be assigned to one governance area
    - BLGU users can only be assigned to one barangay
    - Password changes clear the must_change_password flag
    - Admin functions require elevated privileges

    See Also:
        - apps/api/app/db/models/user.py: User model definition
        - apps/api/app/db/enums.py: UserRole enum
        - CLAUDE.md: Complete RBAC documentation
    """

    def get_user_by_id(self, db: Session, user_id: int) -> Optional[User]:
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

    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
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
        search: Optional[str] = None,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> tuple[List[User], int]:
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

        **Role-Based Field Logic** (auto-enforced):
        - **VALIDATOR**: Requires validator_area_id, clears barangay_id
        - **BLGU_USER**: Requires barangay_id, clears validator_area_id
        - **ASSESSOR/MLGOO_DILG/KATUPARAN_CENTER_USER**: Clears both validator_area_id and barangay_id

        **Business Rules**:
        - Email must be unique across all users
        - Validator must have governance area assignment
        - BLGU user must have barangay assignment
        - Password is securely hashed before storage
        - System-wide roles (ASSESSOR, MLGOO_DILG) have no area restrictions

        Args:
            db: Active database session for the transaction
            user_create: Admin creation schema with role, validator_area_id, barangay_id, password

        Returns:
            Created User instance with role-appropriate field assignments

        Raises:
            HTTPException 400: If email already exists
            HTTPException 400: If VALIDATOR role without validator_area_id
            HTTPException 400: If BLGU_USER role without barangay_id

        Example:
            >>> # Create a VALIDATOR assigned to governance area 3
            >>> from app.schemas.user import UserAdminCreate
            >>> from app.db.enums import UserRole
            >>> validator_data = UserAdminCreate(
            ...     email="validator@dilg.gov.ph",
            ...     name="Maria Santos",
            ...     role=UserRole.VALIDATOR,
            ...     validator_area_id=3,  # Safety, Peace and Order
            ...     password="SecurePassword123!"
            ... )
            >>> validator = user_service.create_user_admin(db, validator_data)
            >>> print(f"{validator.role}: Area {validator.validator_area_id}")
            VALIDATOR: Area 3

        See Also:
            - update_user_admin(): Admin endpoint for updating user role assignments
            - CLAUDE.md: Complete RBAC role definitions
        """
        if self.get_user_by_email(db, user_create.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Business logic for role-specific fields
        if user_create.role == UserRole.VALIDATOR:
            # VALIDATOR role requires validator_area_id
            if not user_create.validator_area_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Governance area is required for Validator role.",
                )
            # Verify governance area exists
            governance_area = db.query(GovernanceArea).filter(
                GovernanceArea.id == user_create.validator_area_id
            ).first()
            if not governance_area:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Governance area with ID {user_create.validator_area_id} does not exist.",
                )
            # Ensure barangay_id is null for validators
            user_create.barangay_id = None
        elif user_create.role == UserRole.BLGU_USER:
            # BLGU_USER role requires barangay_id
            if not user_create.barangay_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Barangay is required for BLGU User role.",
                )
            # Verify barangay exists
            barangay = db.query(Barangay).filter(
                Barangay.id == user_create.barangay_id
            ).first()
            if not barangay:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Barangay with ID {user_create.barangay_id} does not exist.",
                )
            # Ensure validator_area_id is null for BLGU users
            user_create.validator_area_id = None
        elif user_create.role in (
            UserRole.ASSESSOR,
            UserRole.MLGOO_DILG,
            UserRole.KATUPARAN_CENTER_USER,
        ):
            # ASSESSOR, MLGOO_DILG, and external user roles should not have any assignments
            user_create.validator_area_id = None
            user_create.barangay_id = None

        db_user = User(
            **user_create.model_dump(exclude={"password"}),
            hashed_password=get_password_hash(user_create.password),
        )

        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    def update_user(
        self, db: Session, user_id: int, user_update: UserUpdate
    ) -> Optional[User]:
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
    ) -> Optional[User]:
        """Update user information with admin privileges (can update all fields)."""
        db_user = self.get_user_by_id(db, user_id)
        if not db_user:
            return None

        update_data = user_update.model_dump(exclude_unset=True)

        # Business logic for role-specific fields
        role = update_data.get("role", db_user.role)

        if role == UserRole.VALIDATOR:
            # VALIDATOR role requires validator_area_id
            validator_area_id = update_data.get("validator_area_id", db_user.validator_area_id)
            if not validator_area_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Governance area is required for Validator role.",
                )
            # Verify governance area exists if it's being updated
            if "validator_area_id" in update_data and update_data["validator_area_id"]:
                governance_area = db.query(GovernanceArea).filter(
                    GovernanceArea.id == update_data["validator_area_id"]
                ).first()
                if not governance_area:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Governance area with ID {update_data['validator_area_id']} does not exist.",
                    )
            # Ensure barangay_id is set to null if role is changed to Validator
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
                barangay = db.query(Barangay).filter(
                    Barangay.id == update_data["barangay_id"]
                ).first()
                if not barangay:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Barangay with ID {update_data['barangay_id']} does not exist.",
                    )
            # Ensure validator_area_id is set to null for BLGU users
            update_data["validator_area_id"] = None
        elif role in (
            UserRole.ASSESSOR,
            UserRole.MLGOO_DILG,
            UserRole.KATUPARAN_CENTER_USER,
        ):
            # ASSESSOR, MLGOO_DILG, and external user roles should not have any assignments
            update_data["validator_area_id"] = None
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

    def deactivate_user(self, db: Session, user_id: int) -> Optional[User]:
        """Deactivate a user (soft delete)."""
        db_user = self.get_user_by_id(db, user_id)
        if not db_user:
            return None

        setattr(db_user, "is_active", False)
        db.commit()
        db.refresh(db_user)
        return db_user

    def activate_user(self, db: Session, user_id: int) -> Optional[User]:
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

    def reset_password(
        self, db: Session, user_id: int, new_password: str
    ) -> Optional[User]:
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


# Create service instance
user_service = UserService()
