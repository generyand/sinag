"""seed_indicator_2_3_extent_preparedness

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2025-11-16 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6g7h8i9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6g7h8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed Indicator 2.3 (Extent of Preparedness for Effective Response and Recovery) from Python definition."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import INDICATOR_2_3
    from app.indicators.seeder import seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Seed indicator 2.3
        seed_indicators([INDICATOR_2_3], session)
        print("✅ Indicator 2.3 (Extent of Preparedness for Effective Response and Recovery) seeded successfully")
    except Exception as e:
        print(f"❌ Error seeding indicator 2.3: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove Indicator 2.3 and its checklist items."""
    # Delete checklist items for indicator 2.3 sub-indicators
    op.execute("""
        DELETE FROM checklist_items
        WHERE indicator_id IN (
            SELECT id FROM indicators WHERE indicator_code IN ('2.3.1', '2.3.2')
        )
    """)

    # Delete sub-indicators (2.3.1, 2.3.2)
    op.execute("DELETE FROM indicators WHERE indicator_code IN ('2.3.1', '2.3.2')")

    # Delete parent indicator (2.3)
    op.execute("DELETE FROM indicators WHERE indicator_code = '2.3'")
