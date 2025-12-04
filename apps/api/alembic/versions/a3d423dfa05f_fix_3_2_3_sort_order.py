"""fix_3_2_3_sort_order

Revision ID: a3d423dfa05f
Revises: f882c7bc5f45
Create Date: 2025-12-04

Fixes the sort_order for indicator 3.2.3 so it appears after 3.2.2 in the list.

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session


# revision identifiers, used by Alembic.
revision: str = 'a3d423dfa05f'
down_revision: Union[str, Sequence[str], None] = 'f882c7bc5f45'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix sort_order for indicator 3.2.3."""
    from app.db.models.governance_area import Indicator

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("Fixing sort_order for indicator 3.2.3...")

        # Get indicator 3.2.3 and fix its sort_order
        indicator_3_2_3 = session.query(Indicator).filter(
            Indicator.indicator_code == "3.2.3"
        ).first()

        if indicator_3_2_3:
            # Set sort_order to 3 (after 3.2.1=1, 3.2.2=2)
            indicator_3_2_3.sort_order = 3
            print(f"  - Updated 3.2.3 sort_order to 3")

        # Also ensure 3.2.1 and 3.2.2 have correct sort_order
        indicator_3_2_1 = session.query(Indicator).filter(
            Indicator.indicator_code == "3.2.1"
        ).first()
        if indicator_3_2_1:
            indicator_3_2_1.sort_order = 1
            print(f"  - Updated 3.2.1 sort_order to 1")

        indicator_3_2_2 = session.query(Indicator).filter(
            Indicator.indicator_code == "3.2.2"
        ).first()
        if indicator_3_2_2:
            indicator_3_2_2.sort_order = 2
            print(f"  - Updated 3.2.2 sort_order to 2")

        session.commit()
        print("Migration complete!")

    except Exception as e:
        session.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Revert changes."""
    pass
