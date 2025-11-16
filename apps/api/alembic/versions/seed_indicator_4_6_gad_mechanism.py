"""seed_indicator_4_6_gad_mechanism

Revision ID: l0m1n2o3p4q5
Revises: k9l0m1n2o3p4
Create Date: 2025-11-16 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'l0m1n2o3p4q5'
down_revision: Union[str, Sequence[str], None] = 'k9l0m1n2o3p4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed Indicator 4.6 (Mechanism for Gender and Development - GAD) from Python definition."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import INDICATOR_4_6
    from app.indicators.seeder import seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Seed indicator 4.6
        seed_indicators([INDICATOR_4_6], session)
        print("✅ Indicator 4.6 (Mechanism for Gender and Development - GAD) seeded successfully")
    except Exception as e:
        print(f"❌ Error seeding indicator 4.6: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove Indicator 4.6 and its checklist items."""
    # Delete checklist items for indicator 4.6 sub-indicators
    op.execute("""
        DELETE FROM checklist_items
        WHERE indicator_id IN (
            SELECT id FROM indicators WHERE indicator_code = '4.6.1'
        )
    """)

    # Delete sub-indicator (4.6.1)
    op.execute("DELETE FROM indicators WHERE indicator_code = '4.6.1'")

    # Delete parent indicator (4.6)
    op.execute("DELETE FROM indicators WHERE indicator_code = '4.6'")
