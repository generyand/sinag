"""
Database seeder for hard-coded SGLGB indicators.

This module provides functionality to seed indicators from Python definitions
into the database.
"""

from typing import List
from sqlalchemy.orm import Session
from datetime import datetime

from app.indicators.base import Indicator, SubIndicator, ChecklistItem as ChecklistItemDef
from app.db.models.governance_area import Indicator as IndicatorModel, ChecklistItem as ChecklistItemModel


def seed_indicators(indicators: List[Indicator], db: Session, effective_date: datetime = None) -> None:
    """
    Seed indicators from Python definitions into the database.

    Args:
        indicators: List of Indicator dataclass instances
        db: SQLAlchemy database session
        effective_date: When this version became active (defaults to now)

    Example:
        from app.indicators.definitions import ALL_INDICATORS
        seed_indicators(ALL_INDICATORS, db)
    """
    if effective_date is None:
        effective_date = datetime.utcnow()

    for indicator_def in indicators:
        # Create parent indicator
        parent = IndicatorModel(
            indicator_code=indicator_def.code,
            name=indicator_def.name,
            description=indicator_def.description,
            governance_area_id=indicator_def.governance_area_id,
            is_bbi=indicator_def.is_bbi,
            is_profiling_only=indicator_def.is_profiling_only,
            is_active=True,
            is_auto_calculable=True,  # All hard-coded indicators use automatic validation
            parent_id=None,  # This is a root indicator
            sort_order=indicator_def.sort_order,
            effective_date=effective_date,
            validation_rule="ALL_ITEMS_REQUIRED",  # Parent validation rule (can be overridden per child)
        )
        db.add(parent)
        db.flush()  # Get parent ID

        # Create sub-indicators (children)
        for child_def in indicator_def.children:
            sub_indicator = IndicatorModel(
                indicator_code=child_def.code,
                name=child_def.name,
                parent_id=parent.id,
                governance_area_id=indicator_def.governance_area_id,
                validation_rule=child_def.validation_rule,
                is_active=True,
                is_auto_calculable=True,
            )
            db.add(sub_indicator)
            db.flush()  # Get sub-indicator ID

            # Create checklist items
            for item_def in child_def.checklist_items:
                checklist_item = ChecklistItemModel(
                    indicator_id=sub_indicator.id,
                    item_id=item_def.id,
                    label=item_def.label,
                    group_name=item_def.group_name,
                    mov_description=item_def.mov_description,
                    required=item_def.required,
                    requires_document_count=item_def.requires_document_count,
                    display_order=item_def.display_order,
                )
                db.add(checklist_item)

        db.commit()


def clear_indicators(db: Session) -> None:
    """
    Clear all indicators and checklist items from the database.

    WARNING: This will delete all indicators and their associated data.
    Use with caution!

    Args:
        db: SQLAlchemy database session
    """
    # Delete all checklist items (CASCADE will handle this automatically)
    db.query(ChecklistItemModel).delete()

    # Delete all indicators (including parent and children)
    db.query(IndicatorModel).delete()

    db.commit()


def reseed_indicators(indicators: List[Indicator], db: Session, effective_date: datetime = None) -> None:
    """
    Clear existing indicators and reseed from Python definitions.

    Args:
        indicators: List of Indicator dataclass instances
        db: SQLAlchemy database session
        effective_date: When this version became active (defaults to now)
    """
    clear_indicators(db)
    seed_indicators(indicators, db, effective_date)
