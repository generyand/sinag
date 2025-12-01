"""fix_missing_area1_indicators

Revision ID: 10a81e8a1a96
Revises: c18197861bcc
Create Date: 2025-11-28 21:41:11.383646

This migration fixes the missing Area 1 (Financial Administration and Sustainability)
indicators. The database was found to have only 1 corrupt record for Area 1 with
indicator_code=NULL instead of the expected 7 parent indicators (1.1-1.7).

Issue discovered: 76 total indicators instead of expected 86 (now 100+ with children)
Root cause: Area 1 indicators were never properly seeded or were accidentally deleted.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '10a81e8a1a96'
down_revision: Union[str, Sequence[str], None] = 'c18197861bcc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Fix missing Area 1 indicators by:
    1. Deleting the corrupt Area 1 record (indicator_code=NULL)
    2. Seeding all 7 Area 1 indicators (1.1-1.7) with their children
    """
    from sqlalchemy.orm import Session
    from app.db.models.governance_area import Indicator, ChecklistItem
    from app.indicators.definitions import (
        INDICATOR_1_1,
        INDICATOR_1_2,
        INDICATOR_1_3,
        INDICATOR_1_4,
        INDICATOR_1_5,
        INDICATOR_1_6,
        INDICATOR_1_7,
    )
    from app.indicators.seeder import seed_indicators

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Step 1: Delete the corrupt Area 1 record(s)
        print("=" * 70)
        print("Step 1: Removing corrupt Area 1 indicators...")

        # Find and delete any Area 1 indicators with NULL indicator_code
        corrupt_indicators = session.query(Indicator).filter(
            Indicator.governance_area_id == 1,
            Indicator.indicator_code.is_(None)
        ).all()

        for ind in corrupt_indicators:
            print(f"  Deleting corrupt record: ID={ind.id}, name='{ind.name[:50]}...'")
            # Delete associated checklist items first
            session.query(ChecklistItem).filter(ChecklistItem.indicator_id == ind.id).delete()
            session.delete(ind)

        session.flush()
        print(f"  Removed {len(corrupt_indicators)} corrupt record(s)")

        # Step 2: Verify no Area 1 indicators exist (clean slate)
        existing_area1 = session.query(Indicator).filter(
            Indicator.governance_area_id == 1
        ).count()

        if existing_area1 > 0:
            print(f"  WARNING: Found {existing_area1} existing Area 1 indicators")
            print("  These will be kept. Only adding missing indicators.")

        # Step 3: Seed all Area 1 indicators
        print()
        print("Step 2: Seeding Area 1 indicators (1.1 through 1.7)...")

        area1_indicators = [
            INDICATOR_1_1,
            INDICATOR_1_2,
            INDICATOR_1_3,
            INDICATOR_1_4,
            INDICATOR_1_5,
            INDICATOR_1_6,
            INDICATOR_1_7,
        ]

        seed_indicators(area1_indicators, session)

        # Step 4: Verify the seeding worked
        print()
        print("Step 3: Verifying seeded indicators...")

        area1_parents = session.query(Indicator).filter(
            Indicator.governance_area_id == 1,
            Indicator.parent_id.is_(None)
        ).order_by(Indicator.indicator_code).all()

        print(f"  Area 1 parent indicators: {len(area1_parents)}")
        for ind in area1_parents:
            children_count = session.query(Indicator).filter(
                Indicator.parent_id == ind.id
            ).count()
            print(f"    {ind.indicator_code}: {ind.name[:40]}... ({children_count} children)")

        area1_total = session.query(Indicator).filter(
            Indicator.governance_area_id == 1
        ).count()

        print()
        print("=" * 70)
        print(f"SUCCESS: Area 1 now has {len(area1_parents)} parent indicators")
        print(f"         Total Area 1 indicators (with children): {area1_total}")
        print("=" * 70)

        session.commit()

    except Exception as e:
        print(f"ERROR: Migration failed - {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """
    Remove the Area 1 indicators that were added by this migration.
    Note: This will delete all Area 1 indicators and their children.
    """
    from sqlalchemy.orm import Session
    from app.db.models.governance_area import Indicator, ChecklistItem

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("Removing Area 1 indicators...")

        # Get all Area 1 indicator IDs
        area1_ids = [
            ind.id for ind in session.query(Indicator).filter(
                Indicator.governance_area_id == 1
            ).all()
        ]

        if area1_ids:
            # Delete checklist items first
            session.query(ChecklistItem).filter(
                ChecklistItem.indicator_id.in_(area1_ids)
            ).delete(synchronize_session=False)

            # Delete indicators
            session.query(Indicator).filter(
                Indicator.id.in_(area1_ids)
            ).delete(synchronize_session=False)

            session.commit()
            print(f"Removed {len(area1_ids)} Area 1 indicators")
        else:
            print("No Area 1 indicators found to remove")

    except Exception as e:
        print(f"ERROR: Downgrade failed - {e}")
        session.rollback()
        raise
    finally:
        session.close()
