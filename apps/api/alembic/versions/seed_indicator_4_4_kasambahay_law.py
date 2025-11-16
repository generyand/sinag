"""seed_indicator_4_4_kasambahay_law

Revision ID: k9l0m1n2o3p4
Revises: j8k9l0m1n2o3
Create Date: 2025-11-16 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'k9l0m1n2o3p4'
down_revision: Union[str, Sequence[str], None] = 'j8k9l0m1n2o3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed Indicator 4.4 (Implementation of the Kasambahay Law) from Python definition."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import INDICATOR_4_4
    from app.indicators.seeder import seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Seed indicator 4.4
        seed_indicators([INDICATOR_4_4], session)
        print("✅ Indicator 4.4 (Implementation of the Kasambahay Law) seeded successfully")
    except Exception as e:
        print(f"❌ Error seeding indicator 4.4: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove Indicator 4.4 and its checklist items."""
    # Delete checklist items for indicator 4.4 sub-indicators
    op.execute("""
        DELETE FROM checklist_items
        WHERE indicator_id IN (
            SELECT id FROM indicators WHERE indicator_code IN ('4.4.1', '4.4.2')
        )
    """)

    # Delete sub-indicators (4.4.1, 4.4.2)
    op.execute("DELETE FROM indicators WHERE indicator_code IN ('4.4.1', '4.4.2')")

    # Delete parent indicator (4.4)
    op.execute("DELETE FROM indicators WHERE indicator_code = '4.4'")
