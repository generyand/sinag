"""update_date_input_type_for_1_3_1_and_1_4_1

Revision ID: d29d91428996
Revises: d20911882332
Create Date: 2025-12-04

Updates "Date of Approval" fields in indicators 1.3.1 and 1.4.1 to use
date_input type instead of document_count, enabling calendar date picker.

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session


# revision identifiers, used by Alembic.
revision: str = 'd29d91428996'
down_revision: Union[str, Sequence[str], None] = 'd20911882332'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update Date of Approval fields to use date_input type."""
    from app.db.models.governance_area import ChecklistItem as ChecklistItemModel

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("Updating Date of Approval fields to date_input type...")

        # Update 1.3.1 date field
        checklist_1_3_1 = session.query(ChecklistItemModel).filter(
            ChecklistItemModel.item_id == "1_3_1_date_approval"
        ).first()
        if checklist_1_3_1:
            checklist_1_3_1.item_type = "date_input"
            checklist_1_3_1.requires_document_count = False
            print("  - Updated 1_3_1_date_approval to date_input type")

        # Update 1.4.1 date field
        checklist_1_4_1 = session.query(ChecklistItemModel).filter(
            ChecklistItemModel.item_id == "1_4_1_date_of_approval"
        ).first()
        if checklist_1_4_1:
            checklist_1_4_1.item_type = "date_input"
            checklist_1_4_1.requires_document_count = False
            print("  - Updated 1_4_1_date_of_approval to date_input type")

        session.commit()
        print("Migration complete!")

    except Exception as e:
        session.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Revert to document_count type."""
    from app.db.models.governance_area import ChecklistItem as ChecklistItemModel

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Revert 1.3.1
        checklist_1_3_1 = session.query(ChecklistItemModel).filter(
            ChecklistItemModel.item_id == "1_3_1_date_approval"
        ).first()
        if checklist_1_3_1:
            checklist_1_3_1.item_type = "checkbox"
            checklist_1_3_1.requires_document_count = True

        # Revert 1.4.1
        checklist_1_4_1 = session.query(ChecklistItemModel).filter(
            ChecklistItemModel.item_id == "1_4_1_date_of_approval"
        ).first()
        if checklist_1_4_1:
            checklist_1_4_1.item_type = "checkbox"
            checklist_1_4_1.requires_document_count = True

        session.commit()

    except Exception as e:
        session.rollback()
        raise
    finally:
        session.close()
