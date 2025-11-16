"""seed_indicator_3_6_barco

Revision ID: h7i8j9k0l1m2
Revises: g6h7i8j9k0l1
Create Date: 2025-11-16 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'h7i8j9k0l1m2'
down_revision: Union[str, Sequence[str], None] = 'g6h7i8j9k0l1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed Indicator 3.6 (Conduct of Monthly Barangay Road Clearing Operations - BaRCO) from Python definition."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import INDICATOR_3_6
    from app.indicators.seeder import seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Seed indicator 3.6
        seed_indicators([INDICATOR_3_6], session)
        print("✅ Indicator 3.6 (Conduct of Monthly Barangay Road Clearing Operations - BaRCO) seeded successfully")
    except Exception as e:
        print(f"❌ Error seeding indicator 3.6: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove Indicator 3.6 and its checklist items."""
    # Delete checklist items for indicator 3.6 sub-indicators
    op.execute("""
        DELETE FROM checklist_items
        WHERE indicator_id IN (
            SELECT id FROM indicators WHERE indicator_code = '3.6.1'
        )
    """)

    # Delete sub-indicator (3.6.1)
    op.execute("DELETE FROM indicators WHERE indicator_code = '3.6.1'")

    # Delete parent indicator (3.6)
    op.execute("DELETE FROM indicators WHERE indicator_code = '3.6'")
