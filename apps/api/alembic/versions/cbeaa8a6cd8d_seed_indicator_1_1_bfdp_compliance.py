"""seed_indicator_1_1_bfdp_compliance

Revision ID: cbeaa8a6cd8d
Revises: 00bed49217f7
Create Date: 2025-11-16 10:47:08.959828

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cbeaa8a6cd8d'
down_revision: Union[str, Sequence[str], None] = '00bed49217f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed Indicator 1.1 (BFDP Compliance) from Python definition."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import INDICATOR_1_1
    from app.indicators.seeder import seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Seed indicator 1.1
        seed_indicators([INDICATOR_1_1], session)
        print("✅ Indicator 1.1 (BFDP Compliance) seeded successfully")
    except Exception as e:
        print(f"❌ Error seeding indicator 1.1: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove Indicator 1.1 and its checklist items."""
    # Delete checklist items for indicator 1.1 sub-indicators
    op.execute("""
        DELETE FROM checklist_items
        WHERE indicator_id IN (
            SELECT id FROM indicators WHERE indicator_code IN ('1.1.1', '1.1.2')
        )
    """)

    # Delete sub-indicators (1.1.1, 1.1.2)
    op.execute("DELETE FROM indicators WHERE indicator_code IN ('1.1.1', '1.1.2')")

    # Delete parent indicator (1.1)
    op.execute("DELETE FROM indicators WHERE indicator_code = '1.1'")
