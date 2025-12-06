"""add_date_input_fields_for_2_1_1_and_3_1_x

Revision ID: 91539f62d6e3
Revises: 9f8467f702cd
Create Date: 2025-12-04

Adds/updates date input fields for:
- 2.1.1: Add new date_input field for "Date of approval"
- 3.1.1: Add new date_input field for "Date of approval"
- 3.1.2: Update existing field to date_input type
- 3.1.3: Update existing field to date_input type
- 3.1.4: Update existing field to date_input type

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy.orm import Session


# revision identifiers, used by Alembic.
revision: str = "91539f62d6e3"
down_revision: Union[str, Sequence[str], None] = "9f8467f702cd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add/update date input fields."""
    from app.db.models.governance_area import (
        Indicator,
        ChecklistItem as ChecklistItemModel,
    )

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("Adding/updating date input fields...")

        # === 2.1.1: Add new date field ===
        indicator_2_1_1 = (
            session.query(Indicator).filter(Indicator.indicator_code == "2.1.1").first()
        )
        if indicator_2_1_1:
            # Check if date field already exists
            existing = (
                session.query(ChecklistItemModel)
                .filter(ChecklistItemModel.item_id == "2_1_1_date")
                .first()
            )
            if not existing:
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

        # === 3.1.1: Add new date field ===
        indicator_3_1_1 = (
            session.query(Indicator).filter(Indicator.indicator_code == "3.1.1").first()
        )
        if indicator_3_1_1:
            # Check if date field already exists
            existing = (
                session.query(ChecklistItemModel)
                .filter(ChecklistItemModel.item_id == "3_1_1_date")
                .first()
            )
            if not existing:
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

        # === 3.1.2: Update existing date field ===
        checklist_3_1_2 = (
            session.query(ChecklistItemModel)
            .filter(ChecklistItemModel.item_id == "3_1_2_date")
            .first()
        )
        if checklist_3_1_2:
            checklist_3_1_2.item_type = "date_input"
            checklist_3_1_2.requires_document_count = False
            print("  - Updated 3_1_2_date to date_input type")

        # === 3.1.3: Update existing date field ===
        checklist_3_1_3 = (
            session.query(ChecklistItemModel)
            .filter(ChecklistItemModel.item_id == "3_1_3_date")
            .first()
        )
        if checklist_3_1_3:
            checklist_3_1_3.item_type = "date_input"
            checklist_3_1_3.requires_document_count = False
            print("  - Updated 3_1_3_date to date_input type")

        # === 3.1.4: Update existing date field ===
        checklist_3_1_4 = (
            session.query(ChecklistItemModel)
            .filter(ChecklistItemModel.item_id == "3_1_4_date")
            .first()
        )
        if checklist_3_1_4:
            checklist_3_1_4.item_type = "date_input"
            checklist_3_1_4.requires_document_count = False
            print("  - Updated 3_1_4_date to date_input type")

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
