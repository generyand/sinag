"""fix_child_indicator_sort_order

Revision ID: f0c7b9b01747
Revises: 10a81e8a1a96
Create Date: 2025-11-28

This migration fixes the sort_order for all child indicators.
Previously, child indicators had sort_order=0 (default).
Now they are assigned sort_order based on their position within siblings,
derived from parsing their indicator_code (e.g., 1.1.1 -> sort_order 1, 1.1.2 -> sort_order 2).
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f0c7b9b01747"
down_revision: Union[str, Sequence[str], None] = "10a81e8a1a96"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Fix sort_order for all child indicators by deriving it from indicator_code.

    For indicator_code like "1.1.2", the sort_order should be 2 (last segment).
    For indicator_code like "1.6.1.3", the sort_order should be 3 (last segment).
    """
    from sqlalchemy.orm import Session
    from app.db.models.governance_area import Indicator

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("=" * 70)
        print("Fixing sort_order for child indicators...")

        # Get all child indicators (those with parent_id set)
        children = session.query(Indicator).filter(Indicator.parent_id.isnot(None)).all()

        updated_count = 0
        for child in children:
            if child.indicator_code:
                # Parse indicator_code to get sort_order from last segment
                # e.g., "1.1.2" -> ["1", "1", "2"] -> sort_order = 2
                parts = child.indicator_code.split(".")
                if parts:
                    try:
                        new_sort_order = int(parts[-1])
                        if child.sort_order != new_sort_order:
                            child.sort_order = new_sort_order
                            updated_count += 1
                    except ValueError:
                        # Skip if last segment is not a number
                        pass

        session.commit()

        print(f"  Updated sort_order for {updated_count} child indicators")
        print("=" * 70)

    except Exception as e:
        print(f"ERROR: Migration failed - {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """
    Reset sort_order to 0 for all child indicators.
    """
    from sqlalchemy.orm import Session
    from app.db.models.governance_area import Indicator

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("Resetting sort_order to 0 for child indicators...")

        session.query(Indicator).filter(Indicator.parent_id.isnot(None)).update(
            {Indicator.sort_order: 0}, synchronize_session=False
        )

        session.commit()
        print("Done")

    except Exception as e:
        print(f"ERROR: Downgrade failed - {e}")
        session.rollback()
        raise
    finally:
        session.close()
