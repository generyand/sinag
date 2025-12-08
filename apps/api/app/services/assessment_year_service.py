# 📅 Assessment Year Service
# Service layer for managing unified assessment year configurations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.year_resolver import YearPlaceholderResolver
from app.db.enums import UserRole
from app.db.models.system import AssessmentYear
from app.db.models.user import User
from app.schemas.assessment_year import (
    AccessibleYearsResponse,
    ActivateYearResponse,
    AssessmentYearCreate,
    AssessmentYearListResponse,
    AssessmentYearResponse,
    AssessmentYearUpdate,
    PublishYearResponse,
)


class AssessmentYearService:
    """
    Service for managing unified assessment year configurations.

    This service handles:
    - Creating and managing assessment year records
    - Activating/deactivating years (only one active at a time)
    - Publishing years for external visibility (Katuparan Center)
    - Role-based year access filtering
    - Year placeholder resolution
    """

    # =========================================================================
    # Query Methods
    # =========================================================================

    def get_active_year(self, db: Session) -> AssessmentYear | None:
        """
        Get the currently active assessment year.

        Returns:
            Active AssessmentYear or None if none is active
        """
        return db.query(AssessmentYear).filter(AssessmentYear.is_active == True).first()

    def get_active_year_number(self, db: Session) -> int:
        """
        Get the current active assessment year number.

        Returns:
            Current assessment year (e.g., 2025)

        Raises:
            ValueError: If no active year exists
        """
        year_record = self.get_active_year(db)
        if not year_record:
            raise ValueError(
                "No active assessment year found. Please configure and activate an assessment year."
            )
        return year_record.year

    def get_year_by_number(self, db: Session, year: int) -> AssessmentYear | None:
        """
        Get an assessment year record by year number.

        Args:
            db: Database session
            year: Year number (e.g., 2025)

        Returns:
            AssessmentYear or None
        """
        return db.query(AssessmentYear).filter(AssessmentYear.year == year).first()

    def get_year_by_id(self, db: Session, year_id: int) -> AssessmentYear | None:
        """
        Get an assessment year record by ID.

        Args:
            db: Database session
            year_id: Year record ID

        Returns:
            AssessmentYear or None
        """
        return db.query(AssessmentYear).filter(AssessmentYear.id == year_id).first()

    def get_all_years(self, db: Session, include_unpublished: bool = False) -> list[AssessmentYear]:
        """
        Get all assessment year configurations.

        Args:
            db: Database session
            include_unpublished: Whether to include unpublished years

        Returns:
            List of AssessmentYear records, ordered by year descending
        """
        query = db.query(AssessmentYear)
        if not include_unpublished:
            query = query.filter(AssessmentYear.is_published == True)
        return query.order_by(AssessmentYear.year.desc()).all()

    def list_years(
        self, db: Session, include_unpublished: bool = True
    ) -> AssessmentYearListResponse:
        """
        Get all years as a list response with active year info.

        Args:
            db: Database session
            include_unpublished: Whether to include unpublished years

        Returns:
            AssessmentYearListResponse with years and active year
        """
        years = self.get_all_years(db, include_unpublished=include_unpublished)
        active_year = self.get_active_year(db)

        return AssessmentYearListResponse(
            years=[AssessmentYearResponse.model_validate(y) for y in years],
            active_year=active_year.year if active_year else None,
        )

    # =========================================================================
    # Role-Based Access Methods
    # =========================================================================

    def get_accessible_years(self, db: Session, user: User) -> AccessibleYearsResponse:
        """
        Get years accessible to a user based on their role.

        Access Rules:
        - MLGOO_DILG: All years (published and unpublished)
        - KATUPARAN_CENTER_USER: All published years
        - BLGU_USER: All years they have assessments for
        - ASSESSOR/VALIDATOR: Current active year only

        Args:
            db: Database session
            user: User requesting access

        Returns:
            AccessibleYearsResponse with years and role info
        """
        active_year = self.get_active_year(db)
        active_year_num = active_year.year if active_year else None

        if user.role == UserRole.MLGOO_DILG:
            # MLGOO sees all years
            years = self.get_all_years(db, include_unpublished=True)
            return AccessibleYearsResponse(
                years=[y.year for y in years],
                active_year=active_year_num,
                role=user.role.value,
            )

        elif user.role == UserRole.KATUPARAN_CENTER_USER:
            # Katuparan Center sees all published years
            years = self.get_all_years(db, include_unpublished=False)
            return AccessibleYearsResponse(
                years=[y.year for y in years],
                active_year=active_year_num if active_year and active_year.is_published else None,
                role=user.role.value,
            )

        elif user.role == UserRole.BLGU_USER:
            # BLGU users see all years they have assessments for
            from app.db.models.assessment import Assessment

            user_years = (
                db.query(Assessment.assessment_year)
                .filter(Assessment.blgu_user_id == user.id)
                .distinct()
                .all()
            )
            years_list = sorted([y[0] for y in user_years], reverse=True)
            return AccessibleYearsResponse(
                years=years_list,
                active_year=active_year_num if active_year_num in years_list else None,
                role=user.role.value,
            )

        else:
            # ASSESSOR/VALIDATOR: current active year only
            if active_year_num:
                return AccessibleYearsResponse(
                    years=[active_year_num],
                    active_year=active_year_num,
                    role=user.role.value,
                )
            return AccessibleYearsResponse(
                years=[],
                active_year=None,
                role=user.role.value,
            )

    def can_user_access_year(self, db: Session, user: User, year: int) -> bool:
        """
        Check if a user can access a specific year.

        Args:
            db: Database session
            user: User requesting access
            year: Year to check access for

        Returns:
            True if user can access the year
        """
        accessible = self.get_accessible_years(db, user)
        return year in accessible.years

    # =========================================================================
    # CRUD Methods
    # =========================================================================

    def create_year(
        self,
        db: Session,
        data: AssessmentYearCreate,
        created_by_id: int | None = None,
    ) -> AssessmentYear:
        """
        Create a new assessment year configuration.

        Args:
            db: Database session
            data: Year creation data
            created_by_id: User ID creating the year

        Returns:
            Created AssessmentYear

        Raises:
            ValueError: If year already exists
        """
        existing = self.get_year_by_number(db, data.year)
        if existing:
            raise ValueError(
                f"Assessment year {data.year} already exists. Use update methods instead."
            )

        year_record = AssessmentYear(
            year=data.year,
            assessment_period_start=data.assessment_period_start,
            assessment_period_end=data.assessment_period_end,
            phase1_deadline=data.phase1_deadline,
            rework_deadline=data.rework_deadline,
            phase2_deadline=data.phase2_deadline,
            calibration_deadline=data.calibration_deadline,
            description=data.description,
            is_active=False,
            is_published=False,
        )

        db.add(year_record)
        db.commit()
        db.refresh(year_record)
        return year_record

    def update_year(
        self,
        db: Session,
        year: int,
        data: AssessmentYearUpdate,
    ) -> AssessmentYear:
        """
        Update an existing assessment year configuration.

        Args:
            db: Database session
            year: Year number to update
            data: Update data

        Returns:
            Updated AssessmentYear

        Raises:
            ValueError: If year not found
        """
        year_record = self.get_year_by_number(db, year)
        if not year_record:
            raise ValueError(f"Assessment year {year} not found.")

        # Update fields if provided
        if data.assessment_period_start is not None:
            year_record.assessment_period_start = data.assessment_period_start
        if data.assessment_period_end is not None:
            year_record.assessment_period_end = data.assessment_period_end
        if data.phase1_deadline is not None:
            year_record.phase1_deadline = data.phase1_deadline
        if data.rework_deadline is not None:
            year_record.rework_deadline = data.rework_deadline
        if data.phase2_deadline is not None:
            year_record.phase2_deadline = data.phase2_deadline
        if data.calibration_deadline is not None:
            year_record.calibration_deadline = data.calibration_deadline
        if data.description is not None:
            year_record.description = data.description

        db.commit()
        db.refresh(year_record)
        return year_record

    def delete_year(self, db: Session, year: int) -> bool:
        """
        Delete an assessment year.

        Only allowed if:
        - Year is not active
        - No assessments are linked to this year

        Args:
            db: Database session
            year: Year number to delete

        Returns:
            True if deleted

        Raises:
            ValueError: If year not found or cannot be deleted
        """
        year_record = self.get_year_by_number(db, year)
        if not year_record:
            raise ValueError(f"Assessment year {year} not found.")

        if year_record.is_active:
            raise ValueError(f"Cannot delete active year {year}. Deactivate it first.")

        # Check for linked assessments
        from app.db.models.assessment import Assessment

        assessment_count = db.query(Assessment).filter(Assessment.assessment_year == year).count()
        if assessment_count > 0:
            raise ValueError(
                f"Cannot delete year {year}. "
                f"{assessment_count} assessments are linked to this year."
            )

        db.delete(year_record)
        db.commit()
        return True

    # =========================================================================
    # Activation Methods
    # =========================================================================

    def activate_year(
        self,
        db: Session,
        year: int,
        activated_by_id: int,
        create_bulk_assessments: bool = True,
    ) -> ActivateYearResponse:
        """
        Activate an assessment year.

        This will:
        1. Deactivate the currently active year (if any)
        2. Activate the specified year
        3. Optionally trigger bulk assessment creation for BLGU users

        Uses row-level locking (SELECT FOR UPDATE) to prevent race conditions
        when multiple requests try to activate years simultaneously.

        Args:
            db: Database session
            year: Year number to activate
            activated_by_id: User ID activating the year
            create_bulk_assessments: Whether to create assessments for all BLGUs

        Returns:
            ActivateYearResponse with activation details

        Raises:
            ValueError: If year not found
        """
        # Lock the target year record to prevent concurrent modifications
        year_record = (
            db.query(AssessmentYear).filter(AssessmentYear.year == year).with_for_update().first()
        )
        if not year_record:
            raise ValueError(f"Assessment year {year} not found.")

        previous_active_year: int | None = None
        assessments_created: int | None = None

        # Lock and deactivate current active year (if different)
        current_active = (
            db.query(AssessmentYear)
            .filter(AssessmentYear.is_active == True, AssessmentYear.year != year)
            .with_for_update()
            .first()
        )
        if current_active:
            previous_active_year = current_active.year
            current_active.is_active = False
            current_active.deactivated_at = datetime.now(UTC)
            current_active.deactivated_by_id = activated_by_id

        # Activate the new year
        year_record.is_active = True
        year_record.activated_at = datetime.now(UTC)
        year_record.activated_by_id = activated_by_id

        db.commit()
        db.refresh(year_record)

        # Optionally create bulk assessments via Celery task
        if create_bulk_assessments:
            from app.workers.assessment_year_worker import (
                create_bulk_assessments as bulk_task,
            )

            # Trigger async task
            bulk_task.delay(year)
            # Note: assessments_created will be None as it's async
            # The actual count can be retrieved later via task result

        return ActivateYearResponse(
            success=True,
            message=f"Assessment year {year} has been activated.",
            year=year,
            activated_at=year_record.activated_at,
            previous_active_year=previous_active_year,
            assessments_created=assessments_created,
        )

    def deactivate_year(
        self,
        db: Session,
        year: int,
        deactivated_by_id: int,
    ) -> AssessmentYear:
        """
        Deactivate an assessment year.

        Args:
            db: Database session
            year: Year number to deactivate
            deactivated_by_id: User ID deactivating the year

        Returns:
            Deactivated AssessmentYear

        Raises:
            ValueError: If year not found or not active
        """
        year_record = self.get_year_by_number(db, year)
        if not year_record:
            raise ValueError(f"Assessment year {year} not found.")

        if not year_record.is_active:
            raise ValueError(f"Assessment year {year} is not active.")

        year_record.is_active = False
        year_record.deactivated_at = datetime.now(UTC)
        year_record.deactivated_by_id = deactivated_by_id

        db.commit()
        db.refresh(year_record)
        return year_record

    # =========================================================================
    # Publication Methods
    # =========================================================================

    def publish_year(
        self,
        db: Session,
        year: int,
    ) -> PublishYearResponse:
        """
        Publish an assessment year for external visibility.

        Published years are visible to Katuparan Center users.

        Args:
            db: Database session
            year: Year number to publish

        Returns:
            PublishYearResponse

        Raises:
            ValueError: If year not found
        """
        year_record = self.get_year_by_number(db, year)
        if not year_record:
            raise ValueError(f"Assessment year {year} not found.")

        year_record.is_published = True
        db.commit()
        db.refresh(year_record)

        return PublishYearResponse(
            success=True,
            message=f"Assessment year {year} has been published.",
            year=year,
            is_published=True,
        )

    def unpublish_year(
        self,
        db: Session,
        year: int,
    ) -> PublishYearResponse:
        """
        Unpublish an assessment year.

        Args:
            db: Database session
            year: Year number to unpublish

        Returns:
            PublishYearResponse

        Raises:
            ValueError: If year not found
        """
        year_record = self.get_year_by_number(db, year)
        if not year_record:
            raise ValueError(f"Assessment year {year} not found.")

        year_record.is_published = False
        db.commit()
        db.refresh(year_record)

        return PublishYearResponse(
            success=True,
            message=f"Assessment year {year} has been unpublished.",
            year=year,
            is_published=False,
        )

    # =========================================================================
    # Utility Methods
    # =========================================================================

    def get_year_resolver(self, db: Session, year: int | None = None) -> YearPlaceholderResolver:
        """
        Get a YearPlaceholderResolver for a specific year.

        Args:
            db: Database session
            year: Specific year to use (defaults to active year)

        Returns:
            Configured YearPlaceholderResolver

        Raises:
            ValueError: If no active year and no year specified
        """
        if year is None:
            year = self.get_active_year_number(db)
        return YearPlaceholderResolver(year)

    def is_within_assessment_period(
        self,
        db: Session,
        year: int | None = None,
        check_time: datetime | None = None,
    ) -> bool:
        """
        Check if the current time is within the assessment period.

        Args:
            db: Database session
            year: Year to check (defaults to active year)
            check_time: Time to check (defaults to now)

        Returns:
            True if within assessment period
        """
        if year is None:
            year_record = self.get_active_year(db)
        else:
            year_record = self.get_year_by_number(db, year)

        if not year_record:
            return False

        if check_time is None:
            check_time = datetime.now(UTC)

        return (
            year_record.assessment_period_start <= check_time
            and check_time <= year_record.assessment_period_end
        )

    def get_current_phase(
        self,
        db: Session,
        year: int | None = None,
        check_time: datetime | None = None,
    ) -> str:
        """
        Get the current assessment phase based on deadlines.

        Args:
            db: Database session
            year: Year to check (defaults to active year)
            check_time: Time to check (defaults to now)

        Returns:
            Phase name: "pre_assessment", "phase1", "rework", "phase2",
                       "calibration", "completed", or "unknown"
        """
        if year is None:
            year_record = self.get_active_year(db)
        else:
            year_record = self.get_year_by_number(db, year)

        if not year_record:
            return "unknown"

        if check_time is None:
            check_time = datetime.now(UTC)

        # Before assessment period
        if check_time < year_record.assessment_period_start:
            return "pre_assessment"

        # After assessment period
        if check_time > year_record.assessment_period_end:
            return "completed"

        # Check deadlines in order
        if year_record.phase1_deadline and check_time <= year_record.phase1_deadline:
            return "phase1"

        if year_record.rework_deadline and check_time <= year_record.rework_deadline:
            return "rework"

        if year_record.phase2_deadline and check_time <= year_record.phase2_deadline:
            return "phase2"

        if year_record.calibration_deadline and check_time <= year_record.calibration_deadline:
            return "calibration"

        return "completed"


# Service instance
assessment_year_service = AssessmentYearService()
