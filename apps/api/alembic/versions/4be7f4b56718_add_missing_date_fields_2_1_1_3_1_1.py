"""add_missing_date_fields_2_1_1_3_1_1

Revision ID: 4be7f4b56718
Revises: 91539f62d6e3
Create Date: 2025-12-04

Updates existing "Date of approval" fields in 2.1.1 and 3.1.1 to use date_input type
instead of document_count (which shows "Enter count").

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy.orm import Session


# revision identifiers, used by Alembic.
revision: str = "4be7f4b56718"
down_revision: Union[str, Sequence[str], None] = "91539f62d6e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update existing date fields to date_input type."""
    from app.db.models.governance_area import (
        Indicator,
        ChecklistItem as ChecklistItemModel,
    )

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("Updating date fields for 2.1.1 and 3.1.1...")

        # Find all checklist items with "Date of approval" label that need updating
        # Check by item_id patterns for 2.1.1 and 3.1.1

        # Get indicator 2.1.1
        indicator_2_1_1 = (
            session.query(Indicator).filter(Indicator.indicator_code == "2.1.1").first()
        )

        if indicator_2_1_1:
            # Find any date-related field for this indicator
            date_items = (
                session.query(ChecklistItemModel)
                .filter(
                    ChecklistItemModel.indicator_id == indicator_2_1_1.id,
                    ChecklistItemModel.label.ilike("%date%"),
                )
                .all()
            )

            for item in date_items:
                if item.item_type != "date_input":
                    item.item_type = "date_input"
                    item.requires_document_count = False
                    print(f"  - Updated {item.item_id} to date_input type")

            # If no date field exists, create one
            if not date_items:
                new_item = ChecklistItemModel(
                    indicator_id=indicator_2_1_1.id,
                    item_id="2_1_1_date",
                    label="Date of approval",
                    item_type="date_input",
                    required=True,
                    display_order=2,
                )
                session.add(new_item)
                print("  - Added 2_1_1_date field")

        # Get indicator 3.1.1
        indicator_3_1_1 = (
            session.query(Indicator).filter(Indicator.indicator_code == "3.1.1").first()
        )

        if indicator_3_1_1:
            # Find any date-related field for this indicator
            date_items = (
                session.query(ChecklistItemModel)
                .filter(
                    ChecklistItemModel.indicator_id == indicator_3_1_1.id,
                    ChecklistItemModel.label.ilike("%date%"),
                )
                .all()
            )

            for item in date_items:
                if item.item_type != "date_input":
                    item.item_type = "date_input"
                    item.requires_document_count = False
                    print(f"  - Updated {item.item_id} to date_input type")

            # If no date field exists, create one
            if not date_items:
                new_item = ChecklistItemModel(
                    indicator_id=indicator_3_1_1.id,
                    item_id="3_1_1_date",
                    label="Date of approval",
                    item_type="date_input",
                    required=True,
                    display_order=2,
                )
                session.add(new_item)
                print("  - Added 3_1_1_date field")

        session.commit()
        print("Migration complete!")

    except Exception as e:
        session.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Revert date input fields."""
    pass
