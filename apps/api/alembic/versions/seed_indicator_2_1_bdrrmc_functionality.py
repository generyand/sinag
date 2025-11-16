"""seed_indicator_2_1_bdrrmc_functionality

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2025-11-16 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6g7h8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6g7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed Indicator 2.1 (BDRRMC Functionality - FIRST BBI) from Python definition."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import INDICATOR_2_1
    from app.indicators.seeder import seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Seed indicator 2.1 (First BBI indicator!)
        seed_indicators([INDICATOR_2_1], session)
        print("✅ Indicator 2.1 (BDRRMC Functionality - BBI) seeded successfully")
    except Exception as e:
        print(f"❌ Error seeding indicator 2.1: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove Indicator 2.1 and its checklist items."""
    # Delete checklist items for indicator 2.1 sub-indicators
    op.execute("""
        DELETE FROM checklist_items
        WHERE indicator_id IN (
            SELECT id FROM indicators WHERE indicator_code IN ('2.1.1', '2.1.2', '2.1.3', '2.1.4')
        )
    """)

    # Delete sub-indicators (2.1.1, 2.1.2, 2.1.3, 2.1.4)
    op.execute("DELETE FROM indicators WHERE indicator_code IN ('2.1.1', '2.1.2', '2.1.3', '2.1.4')")

    # Delete parent indicator (2.1)
    op.execute("DELETE FROM indicators WHERE indicator_code = '2.1'")
