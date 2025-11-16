"""seed_indicator_5_3_barangay_clearance

Revision ID: p4q5r6s7t8u9
Revises: o3p4q5r6s7t8
Create Date: 2025-11-16 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'p4q5r6s7t8u9'
down_revision: Union[str, Sequence[str], None] = 'o3p4q5r6s7t8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Seed Indicator 5.3 (Issuance of Barangay Clearance not covered by DILG MC No. 2019-177) from Python definition."""
    from sqlalchemy.orm import Session
    from app.indicators.definitions import INDICATOR_5_3
    from app.indicators.seeder import seed_indicators

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Seed indicator 5.3
        seed_indicators([INDICATOR_5_3], session)
        print("✅ Indicator 5.3 (Issuance of Barangay Clearance not covered by DILG MC No. 2019-177) seeded successfully")
    except Exception as e:
        print(f"❌ Error seeding indicator 5.3: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove Indicator 5.3 and its checklist items."""
    # Delete checklist items for indicator 5.3 sub-indicators
    op.execute("""
        DELETE FROM checklist_items
        WHERE indicator_id IN (
            SELECT id FROM indicators WHERE indicator_code = '5.3.1'
        )
    """)

    # Delete sub-indicator (5.3.1)
    op.execute("DELETE FROM indicators WHERE indicator_code = '5.3.1'")

    # Delete parent indicator (5.3)
    op.execute("DELETE FROM indicators WHERE indicator_code = '5.3'")
