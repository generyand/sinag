"""seed_indicator_1_4_statutory_allocation

Revision ID: a1b2c3d4e5f7
Revises: update_1_2_amounts
Create Date: 2025-11-16 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, Sequence[str], None] = 'update_1_2_amounts'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed Indicator 1.4 (Allocation for Statutory Programs) from Python definition."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import INDICATOR_1_4
    from app.indicators.seeder import seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Seed indicator 1.4
        seed_indicators([INDICATOR_1_4], session)
        print("✅ Indicator 1.4 (Allocation for Statutory Programs) seeded successfully")
    except Exception as e:
        print(f"❌ Error seeding indicator 1.4: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove Indicator 1.4 and its checklist items."""
    # Delete checklist items for indicator 1.4 sub-indicators
    op.execute("""
        DELETE FROM checklist_items
        WHERE indicator_id IN (
            SELECT id FROM indicators WHERE indicator_code IN ('1.4.1')
        )
    """)

    # Delete sub-indicators (1.4.1)
    op.execute("DELETE FROM indicators WHERE indicator_code IN ('1.4.1')")

    # Delete parent indicator (1.4)
    op.execute("DELETE FROM indicators WHERE indicator_code = '1.4'")
