"""seed_indicator_5_1_tax_levy_power

Revision ID: o3p4q5r6s7t8
Revises: n2o3p4q5r6s7
Create Date: 2025-11-16 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'o3p4q5r6s7t8'
down_revision: Union[str, Sequence[str], None] = 'n2o3p4q5r6s7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed Indicator 5.1 (Power to Levy Other Taxes, Fees or Charges) from Python definition."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import INDICATOR_5_1
    from app.indicators.seeder import seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Seed indicator 5.1
        seed_indicators([INDICATOR_5_1], session)
        print("✅ Indicator 5.1 (Power to Levy Other Taxes, Fees or Charges) seeded successfully")
    except Exception as e:
        print(f"❌ Error seeding indicator 5.1: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove Indicator 5.1 and its checklist items."""
    # Delete checklist items for indicator 5.1 sub-indicators
    op.execute("""
        DELETE FROM checklist_items
        WHERE indicator_id IN (
            SELECT id FROM indicators WHERE indicator_code = '5.1.1'
        )
    """)

    # Delete sub-indicator (5.1.1)
    op.execute("DELETE FROM indicators WHERE indicator_code = '5.1.1'")

    # Delete parent indicator (5.1)
    op.execute("DELETE FROM indicators WHERE indicator_code = '5.1'")
