"""seed_indicator_1_2_revenue_innovations

Revision ID: f2862d42550b
Revises: cbeaa8a6cd8d
Create Date: 2025-11-16 14:08:21.889738

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2862d42550b'
down_revision: Union[str, Sequence[str], None] = 'cbeaa8a6cd8d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed Indicator 1.2 (Innovations on revenue generation) from Python definition."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import INDICATOR_1_2
    from app.indicators.seeder import seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Seed indicator 1.2
        seed_indicators([INDICATOR_1_2], session)
        print("✅ Indicator 1.2 (Innovations on revenue generation) seeded successfully")
    except Exception as e:
        print(f"❌ Error seeding indicator 1.2: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove Indicator 1.2 and its checklist items."""
    # Delete checklist items for indicator 1.2 sub-indicators
    op.execute("""
        DELETE FROM checklist_items
        WHERE indicator_id IN (
            SELECT id FROM indicators WHERE indicator_code IN ('1.2.1')
        )
    """)

    # Delete sub-indicators (1.2.1)
    op.execute("DELETE FROM indicators WHERE indicator_code IN ('1.2.1')")

    # Delete parent indicator (1.2)
    op.execute("DELETE FROM indicators WHERE indicator_code = '1.2'")
