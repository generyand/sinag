"""seed_indicator_3_4_barangay_tanod

Revision ID: f6g7h8i9j0k1
Revises: e5f6g7h8i9j0
Create Date: 2025-11-16 19:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6g7h8i9j0k1'
down_revision: Union[str, Sequence[str], None] = 'e5f6g7h8i9j0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed Indicator 3.4 (Organization and Strengthening Capacities of Barangay Tanod) from Python definition."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import INDICATOR_3_4
    from app.indicators.seeder import seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Seed indicator 3.4
        seed_indicators([INDICATOR_3_4], session)
        print("✅ Indicator 3.4 (Organization and Strengthening Capacities of Barangay Tanod) seeded successfully")
    except Exception as e:
        print(f"❌ Error seeding indicator 3.4: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove Indicator 3.4 and its checklist items."""
    # Delete checklist items for indicator 3.4 sub-indicators
    op.execute("""
        DELETE FROM checklist_items
        WHERE indicator_id IN (
            SELECT id FROM indicators WHERE indicator_code IN ('3.4.1', '3.4.2')
        )
    """)

    # Delete sub-indicators (3.4.1, 3.4.2)
    op.execute("DELETE FROM indicators WHERE indicator_code IN ('3.4.1', '3.4.2')")

    # Delete parent indicator (3.4)
    op.execute("DELETE FROM indicators WHERE indicator_code = '3.4'")
