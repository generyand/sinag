"""seed_indicator_4_2_health_services

Revision ID: j8k9l0m1n2o3
Revises: i7j8k9l0m1n2
Create Date: 2025-11-16 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'j8k9l0m1n2o3'
down_revision: Union[str, Sequence[str], None] = 'i7j8k9l0m1n2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed Indicator 4.2 (Access to Health and Social Welfare Services in the Barangay) from Python definition."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import INDICATOR_4_2
    from app.indicators.seeder import seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Seed indicator 4.2
        seed_indicators([INDICATOR_4_2], session)
        print("✅ Indicator 4.2 (Access to Health and Social Welfare Services in the Barangay) seeded successfully")
    except Exception as e:
        print(f"❌ Error seeding indicator 4.2: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove Indicator 4.2 and its checklist items."""
    # Delete checklist items for indicator 4.2 sub-indicators
    op.execute("""
        DELETE FROM checklist_items
        WHERE indicator_id IN (
            SELECT id FROM indicators WHERE indicator_code IN ('4.2.1', '4.2.2', '4.2.3', '4.2.4')
        )
    """)

    # Delete sub-indicators (4.2.1, 4.2.2, 4.2.3, 4.2.4)
    op.execute("DELETE FROM indicators WHERE indicator_code IN ('4.2.1', '4.2.2', '4.2.3', '4.2.4')")

    # Delete parent indicator (4.2)
    op.execute("DELETE FROM indicators WHERE indicator_code = '4.2'")
