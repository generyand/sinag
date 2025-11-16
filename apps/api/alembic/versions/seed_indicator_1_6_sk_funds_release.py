"""seed_indicator_1_6_sk_funds_release

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f7
Create Date: 2025-11-16 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed Indicator 1.6 (Release of SK Funds) from Python definition."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import INDICATOR_1_6
    from app.indicators.seeder import seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Seed indicator 1.6
        seed_indicators([INDICATOR_1_6], session)
        print("✅ Indicator 1.6 (Release of SK Funds) seeded successfully")
    except Exception as e:
        print(f"❌ Error seeding indicator 1.6: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove Indicator 1.6 and its checklist items."""
    # Delete checklist items for indicator 1.6 sub-indicators
    op.execute("""
        DELETE FROM checklist_items
        WHERE indicator_id IN (
            SELECT id FROM indicators WHERE indicator_code IN ('1.6.1', '1.6.2')
        )
    """)

    # Delete sub-indicators (1.6.1, 1.6.2)
    op.execute("DELETE FROM indicators WHERE indicator_code IN ('1.6.1', '1.6.2')")

    # Delete parent indicator (1.6)
    op.execute("DELETE FROM indicators WHERE indicator_code = '1.6'")
