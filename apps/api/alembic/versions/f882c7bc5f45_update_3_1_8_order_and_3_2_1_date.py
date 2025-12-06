"""update_3_1_8_order_and_3_2_1_date

Revision ID: f882c7bc5f45
Revises: 4be7f4b56718
Create Date: 2025-12-04

Updates:
- 3.1.8: Reorder checklist items - move count field after first checkbox
- 3.2.1: Add/update date input field for "Date of approval"

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy.orm import Session


# revision identifiers, used by Alembic.
revision: str = "f882c7bc5f45"
down_revision: Union[str, Sequence[str], None] = "4be7f4b56718"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update 3.1.8 order and 3.2.1 date field."""
    from app.db.models.governance_area import (
        Indicator,
        ChecklistItem as ChecklistItemModel,
    )

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("Updating 3.1.8 and 3.2.1...")

        # === 3.1.8: Update display_order ===
        # Move count field (3_1_8_count) to display_order=2
        # Move certification (3_1_8_b) to display_order=3
        checklist_3_1_8_count = (
            session.query(ChecklistItemModel)
            .filter(ChecklistItemModel.item_id == "3_1_8_count")
            .first()
        )
        if checklist_3_1_8_count:
            checklist_3_1_8_count.display_order = 2
            print("  - Updated 3_1_8_count display_order to 2")

        checklist_3_1_8_b = (
            session.query(ChecklistItemModel)
            .filter(ChecklistItemModel.item_id == "3_1_8_b")
            .first()
        )
        if checklist_3_1_8_b:
            checklist_3_1_8_b.display_order = 3
            print("  - Updated 3_1_8_b display_order to 3")

        # === 3.2.1: Add/update date field ===
        indicator_3_2_1 = (
            session.query(Indicator).filter(Indicator.indicator_code == "3.2.1").first()
        )

        if indicator_3_2_1:
            # Check if date field exists
            existing_date = (
                session.query(ChecklistItemModel)
                .filter(
                    ChecklistItemModel.indicator_id == indicator_3_2_1.id,
                    ChecklistItemModel.label.ilike("%date%"),
                )
                .first()
            )

            if existing_date:
                # Update existing field to date_input type
                existing_date.item_type = "date_input"
                existing_date.requires_document_count = False
                print(f"  - Updated {existing_date.item_id} to date_input type")
            else:
                # Create new date field
                new_item = ChecklistItemModel(
                    indicator_id=indicator_3_2_1.id,
                    item_id="3_2_1_date",
                    label="Date of approval for the EO or similar issuance",
                    item_type="date_input",
                    required=True,
                    display_order=2,
                )
                session.add(new_item)
                print("  - Added 3_2_1_date field")

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
