"""seed_indicator_6_2_solid_waste_facility

Revision ID: q5r6s7t8u9v0
Revises: p4q5r6s7t8u9
Create Date: 2025-11-16 23:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'q5r6s7t8u9v0'
down_revision: Union[str, Sequence[str], None] = 'p4q5r6s7t8u9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed Indicator 6.2 (Existence of a Solid Waste Management Facility Pursuant to R.A. 9003) from Python definition."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import INDICATOR_6_2
    from app.indicators.seeder import seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Seed indicator 6.2
        seed_indicators([INDICATOR_6_2], session)
        print("✅ Indicator 6.2 (Existence of a Solid Waste Management Facility Pursuant to R.A. 9003) seeded successfully")
    except Exception as e:
        print(f"❌ Error seeding indicator 6.2: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove Indicator 6.2 and its checklist items."""
    # Delete checklist items for indicator 6.2 sub-indicators
    op.execute("""
        DELETE FROM checklist_items
        WHERE indicator_id IN (
            SELECT id FROM indicators WHERE indicator_code = '6.2.1'
        )
    """)

    # Delete sub-indicator (6.2.1)
    op.execute("DELETE FROM indicators WHERE indicator_code = '6.2.1'")

    # Delete parent indicator (6.2)
    op.execute("DELETE FROM indicators WHERE indicator_code = '6.2'")
