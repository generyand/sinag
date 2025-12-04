"""fix_3_2_3_calculation_field_types

Revision ID: 3bf9a4d326ad
Revises: a3d423dfa05f
Create Date: 2025-12-04

Ensures all calculation_field items in 3.2.3 have the correct item_type set,
so they initialize with empty string instead of boolean false.

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session


# revision identifiers, used by Alembic.
revision: str = '3bf9a4d326ad'
down_revision: Union[str, Sequence[str], None] = 'a3d423dfa05f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix calculation_field item types for 3.2.3."""
    from app.db.models.governance_area import ChecklistItem as ChecklistItemModel

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("Fixing calculation_field item types for 3.2.3...")

        # List of calculation field item_ids that need to be updated
        calculation_field_ids = [
            "3_2_3_physical_accomplished",
            "3_2_3_physical_reflected",
            "3_2_3_financial_allocated",
            "3_2_3_financial_utilized",
        ]

        for item_id in calculation_field_ids:
            item = session.query(ChecklistItemModel).filter(
                ChecklistItemModel.item_id == item_id
            ).first()
            if item:
                item.item_type = "calculation_field"
                item.requires_document_count = False
                print(f"  - Updated {item_id} to calculation_field type")

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
