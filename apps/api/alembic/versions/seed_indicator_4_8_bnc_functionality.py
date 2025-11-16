"""seed_indicator_4_8_bnc_functionality

Revision ID: n2o3p4q5r6s7
Revises: m1n2o3p4q5r6
Create Date: 2025-11-16 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'n2o3p4q5r6s7'
down_revision: Union[str, Sequence[str], None] = 'm1n2o3p4q5r6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed Indicator 4.8 (Functionality of the Barangay Nutrition Committee - BNC) from Python definition."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import INDICATOR_4_8
    from app.indicators.seeder import seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Seed indicator 4.8
        seed_indicators([INDICATOR_4_8], session)
        print("✅ Indicator 4.8 (Functionality of the Barangay Nutrition Committee - BNC) seeded successfully")
    except Exception as e:
        print(f"❌ Error seeding indicator 4.8: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove Indicator 4.8 and its checklist items."""
    # Delete checklist items for indicator 4.8 sub-indicators
    op.execute("""
        DELETE FROM checklist_items
        WHERE indicator_id IN (
            SELECT id FROM indicators WHERE indicator_code IN ('4.8.1', '4.8.2', '4.8.3', '4.8.4')
        )
    """)

    # Delete sub-indicators (4.8.1, 4.8.2, 4.8.3, 4.8.4)
    op.execute("DELETE FROM indicators WHERE indicator_code IN ('4.8.1', '4.8.2', '4.8.3', '4.8.4')")

    # Delete parent indicator (4.8)
    op.execute("DELETE FROM indicators WHERE indicator_code = '4.8'")
