# 📅 Assessment Year Configuration Service
# Service layer for managing assessment year configurations

from datetime import datetime

from sqlalchemy.orm import Session

from app.core.year_resolver import YearPlaceholderResolver
from app.db.models.governance_area import ChecklistItem, Indicator
from app.db.models.system import AssessmentIndicatorSnapshot, AssessmentYearConfig


class YearConfigService:
    """
    Service for managing assessment year configurations.

    This service handles:
    - Creating and activating assessment year configurations
    - Retrieving the current active configuration
    - Validating year transitions
    - Managing the annual rollover process
    """

    def get_active_config(self, db: Session) -> AssessmentYearConfig | None:
        """
        Get the currently active assessment year configuration.

        Args:
            db: Database session

        Returns:
            Active AssessmentYearConfig or None if none is active
        """
        return (
            db.query(AssessmentYearConfig)
            .filter(AssessmentYearConfig.is_active == True)
            .first()
        )

    def get_current_year(self, db: Session) -> int:
        """
        Get the current assessment year.

        Args:
            db: Database session

        Returns:
            Current assessment year (e.g., 2025)

        Raises:
            ValueError: If no active configuration exists
        """
        config = self.get_active_config(db)
        if not config:
            raise ValueError(
                "No active assessment year configuration found. "
                "Please configure the current assessment year."
            )
        return config.current_assessment_year

    def get_all_configs(self, db: Session) -> list[AssessmentYearConfig]:
        """
        Get all assessment year configurations (historical and current).

        Args:
            db: Database session

        Returns:
            List of all AssessmentYearConfig records, ordered by year descending
        """
        return (
            db.query(AssessmentYearConfig)
            .order_by(AssessmentYearConfig.current_assessment_year.desc())
            .all()
        )

    def create_year_config(
        self,
        db: Session,
        year: int,
        period_start: datetime,
        period_end: datetime,
        description: str | None = None,
        activate: bool = False,
        activated_by_id: int | None = None,
    ) -> AssessmentYearConfig:
        """
        Create a new assessment year configuration.

        Args:
            db: Database session
            year: Assessment year (e.g., 2025)
            period_start: Start of assessment period
            period_end: End of assessment period
            description: Optional description
            activate: Whether to activate this config immediately
            activated_by_id: User ID activating the config

        Returns:
            Created AssessmentYearConfig

        Raises:
            ValueError: If a configuration for this year already exists
        """
        # Check for existing config for this year
        existing = (
            db.query(AssessmentYearConfig)
            .filter(AssessmentYearConfig.current_assessment_year == year)
            .first()
        )

        if existing:
            raise ValueError(
                f"Assessment year configuration for {year} already exists. "
                "Use update or activate methods instead."
            )

        # Create new config
        config = AssessmentYearConfig(
            current_assessment_year=year,
            assessment_period_start=period_start,
            assessment_period_end=period_end,
            description=description,
            is_active=False,
        )

        db.add(config)
        db.flush()

        # Optionally activate
        if activate:
            self.activate_year_config(db, config.id, activated_by_id)

        db.commit()
        db.refresh(config)
        return config

    def activate_year_config(
        self,
        db: Session,
        config_id: int,
        activated_by_id: int | None = None,
    ) -> AssessmentYearConfig:
        """
        Activate a specific assessment year configuration.

        This will:
        1. Deactivate the currently active configuration (if any)
        2. Activate the specified configuration

        Args:
            db: Database session
            config_id: ID of the configuration to activate
            activated_by_id: User ID activating the config

        Returns:
            The activated AssessmentYearConfig

        Raises:
            ValueError: If configuration not found
        """
        # Get the config to activate
        config = (
            db.query(AssessmentYearConfig)
            .filter(AssessmentYearConfig.id == config_id)
            .first()
        )

        if not config:
            raise ValueError(f"Assessment year configuration with ID {config_id} not found.")

        # Deactivate current active config
        current_active = self.get_active_config(db)
        if current_active and current_active.id != config_id:
            current_active.is_active = False
            current_active.deactivated_at = datetime.utcnow()
            current_active.deactivated_by_id = activated_by_id

        # Activate new config
        config.is_active = True
        config.activated_at = datetime.utcnow()
        config.activated_by_id = activated_by_id

        db.commit()
        db.refresh(config)
        return config

    def update_year_config(
        self,
        db: Session,
        config_id: int,
        period_start: datetime | None = None,
        period_end: datetime | None = None,
        description: str | None = None,
    ) -> AssessmentYearConfig:
        """
        Update an existing assessment year configuration.

        Args:
            db: Database session
            config_id: ID of the configuration to update
            period_start: New period start (optional)
            period_end: New period end (optional)
            description: New description (optional)

        Returns:
            Updated AssessmentYearConfig

        Raises:
            ValueError: If configuration not found
        """
        config = (
            db.query(AssessmentYearConfig)
            .filter(AssessmentYearConfig.id == config_id)
            .first()
        )

        if not config:
            raise ValueError(f"Assessment year configuration with ID {config_id} not found.")

        if period_start is not None:
            config.assessment_period_start = period_start
        if period_end is not None:
            config.assessment_period_end = period_end
        if description is not None:
            config.description = description

        db.commit()
        db.refresh(config)
        return config

    def get_year_resolver(self, db: Session) -> YearPlaceholderResolver:
        """
        Get a YearPlaceholderResolver for the current assessment year.

        Args:
            db: Database session

        Returns:
            Configured YearPlaceholderResolver

        Raises:
            ValueError: If no active configuration exists
        """
        year = self.get_current_year(db)
        return YearPlaceholderResolver(year)


class IndicatorSnapshotService:
    """
    Service for creating and retrieving indicator snapshots.

    Indicator snapshots preserve the exact indicator definitions (with resolved
    year placeholders) at the time an assessment is submitted. This ensures
    historical assessments maintain data integrity even when indicators are
    modified or the assessment year changes.
    """

    def __init__(self, year_config_service: YearConfigService):
        self.year_config_service = year_config_service

    def create_snapshot_for_assessment(
        self,
        db: Session,
        assessment_id: int,
        indicator_ids: list[int],
        assessment_year: int | None = None,
    ) -> list[AssessmentIndicatorSnapshot]:
        """
        Create snapshots for all indicators in an assessment.

        This should be called when an assessment is SUBMITTED to preserve
        the exact indicator definitions at that point in time.

        Args:
            db: Database session
            assessment_id: ID of the assessment
            indicator_ids: List of indicator IDs to snapshot
            assessment_year: Specific year for resolution (uses active config if not provided)

        Returns:
            List of created AssessmentIndicatorSnapshot records
        """
        # Get the assessment year
        if assessment_year is None:
            assessment_year = self.year_config_service.get_current_year(db)

        # Create resolver
        resolver = YearPlaceholderResolver(assessment_year)

        # Get indicators with their checklist items
        indicators = (
            db.query(Indicator)
            .filter(Indicator.id.in_(indicator_ids))
            .all()
        )

        snapshots = []
        for indicator in indicators:
            # Get checklist items for this indicator
            checklist_items = (
                db.query(ChecklistItem)
                .filter(ChecklistItem.indicator_id == indicator.id)
                .order_by(ChecklistItem.display_order)
                .all()
            )

            # Convert checklist items to dictionaries
            checklist_items_dict = [
                {
                    "id": item.id,
                    "item_id": item.item_id,
                    "label": item.label,
                    "item_type": item.item_type,
                    "group_name": item.group_name,
                    "mov_description": item.mov_description,
                    "required": item.required,
                    "requires_document_count": item.requires_document_count,
                    "display_order": item.display_order,
                    "option_group": item.option_group,
                    "field_notes": item.field_notes,
                }
                for item in checklist_items
            ]

            # Create snapshot with resolved values
            snapshot = AssessmentIndicatorSnapshot(
                assessment_id=assessment_id,
                indicator_id=indicator.id,
                indicator_version=indicator.version,
                assessment_year=assessment_year,
                # Resolved indicator identity
                indicator_code=indicator.indicator_code,
                name=resolver.resolve_string(indicator.name) or indicator.name,
                description=resolver.resolve_string(indicator.description),
                # Indicator flags
                is_active=indicator.is_active,
                is_auto_calculable=indicator.is_auto_calculable,
                is_profiling_only=indicator.is_profiling_only,
                is_bbi=indicator.is_bbi,
                validation_rule=indicator.validation_rule,
                # Resolved schemas
                form_schema_resolved=resolver.resolve_schema(indicator.form_schema),
                calculation_schema_resolved=resolver.resolve_schema(indicator.calculation_schema),
                remark_schema_resolved=resolver.resolve_schema(indicator.remark_schema),
                technical_notes_resolved=resolver.resolve_string(indicator.technical_notes_text),
                # Resolved checklist items
                checklist_items_resolved=resolver.resolve_checklist_items(checklist_items_dict),
                # Hierarchy info
                governance_area_id=indicator.governance_area_id,
                parent_id=indicator.parent_id,
            )

            db.add(snapshot)
            snapshots.append(snapshot)

        db.flush()
        return snapshots

    def get_snapshots_for_assessment(
        self, db: Session, assessment_id: int
    ) -> list[AssessmentIndicatorSnapshot]:
        """
        Get all indicator snapshots for an assessment.

        Args:
            db: Database session
            assessment_id: ID of the assessment

        Returns:
            List of AssessmentIndicatorSnapshot records
        """
        return (
            db.query(AssessmentIndicatorSnapshot)
            .filter(AssessmentIndicatorSnapshot.assessment_id == assessment_id)
            .all()
        )

    def get_snapshot_for_indicator(
        self, db: Session, assessment_id: int, indicator_id: int
    ) -> AssessmentIndicatorSnapshot | None:
        """
        Get a specific indicator snapshot for an assessment.

        Args:
            db: Database session
            assessment_id: ID of the assessment
            indicator_id: ID of the indicator

        Returns:
            AssessmentIndicatorSnapshot or None
        """
        return (
            db.query(AssessmentIndicatorSnapshot)
            .filter(
                AssessmentIndicatorSnapshot.assessment_id == assessment_id,
                AssessmentIndicatorSnapshot.indicator_id == indicator_id,
            )
            .first()
        )

    def has_snapshots(self, db: Session, assessment_id: int) -> bool:
        """
        Check if an assessment has indicator snapshots.

        Args:
            db: Database session
            assessment_id: ID of the assessment

        Returns:
            True if snapshots exist, False otherwise
        """
        count = (
            db.query(AssessmentIndicatorSnapshot)
            .filter(AssessmentIndicatorSnapshot.assessment_id == assessment_id)
            .count()
        )
        return count > 0


# Service instances
year_config_service = YearConfigService()
indicator_snapshot_service = IndicatorSnapshotService(year_config_service)
