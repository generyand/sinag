"""seed_indicator_3_2_bpoc_functionality

Revision ID: e5f6g7h8i9j0
Revises: d4e5f6g7h8i9
Create Date: 2025-11-16 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6g7h8i9j0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6g7h8i9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed Indicator 3.2 (BPOC Functionality - BBI) from Python definition."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import INDICATOR_3_2
    from app.indicators.seeder import seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Seed indicator 3.2 (BBI indicator for BPOC!)
        seed_indicators([INDICATOR_3_2], session)
        print("✅ Indicator 3.2 (BPOC Functionality - BBI) seeded successfully")
    except Exception as e:
        print(f"❌ Error seeding indicator 3.2: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove Indicator 3.2 and its checklist items."""
    # Delete checklist items for indicator 3.2 sub-indicators
    op.execute("""
        DELETE FROM checklist_items
        WHERE indicator_id IN (
            SELECT id FROM indicators WHERE indicator_code IN ('3.2.1', '3.2.2', '3.2.3')
        )
    """)

    # Delete sub-indicators (3.2.1, 3.2.2, 3.2.3)
    op.execute("DELETE FROM indicators WHERE indicator_code IN ('3.2.1', '3.2.2', '3.2.3')")

    # Delete parent indicator (3.2)
    op.execute("DELETE FROM indicators WHERE indicator_code = '3.2'")
