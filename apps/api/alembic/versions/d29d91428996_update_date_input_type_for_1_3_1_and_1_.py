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


# revision identifiers, used by Alembic.
revision: str = "d29d91428996"
down_revision: Union[str, Sequence[str], None] = "d20911882332"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update Date of Approval fields to use date_input type using raw SQL."""
    conn = op.get_bind()

    print("Updating Date of Approval fields to date_input type...")

    # Update 1.3.1 date field
    conn.execute(
        sa.text("""
            UPDATE checklist_items
            SET item_type = :item_type, requires_document_count = :requires_doc_count
            WHERE item_id = :item_id
        """),
        {
            "item_id": "1_3_1_date_approval",
            "item_type": "date_input",
            "requires_doc_count": False,
        },
    )
    print("  - Updated 1_3_1_date_approval to date_input type")

    # Update 1.4.1 date field
    conn.execute(
        sa.text("""
            UPDATE checklist_items
            SET item_type = :item_type, requires_document_count = :requires_doc_count
            WHERE item_id = :item_id
        """),
        {
            "item_id": "1_4_1_date_of_approval",
            "item_type": "date_input",
            "requires_doc_count": False,
        },
    )
    print("  - Updated 1_4_1_date_of_approval to date_input type")

    print("Migration complete!")


def downgrade() -> None:
    """Revert to document_count type using raw SQL."""
    conn = op.get_bind()

    # Revert 1.3.1
    conn.execute(
        sa.text("""
            UPDATE checklist_items
            SET item_type = :item_type, requires_document_count = :requires_doc_count
            WHERE item_id = :item_id
        """),
        {
            "item_id": "1_3_1_date_approval",
            "item_type": "checkbox",
            "requires_doc_count": True,
        },
    )

    # Revert 1.4.1
    conn.execute(
        sa.text("""
            UPDATE checklist_items
            SET item_type = :item_type, requires_document_count = :requires_doc_count
            WHERE item_id = :item_id
        """),
        {
            "item_id": "1_4_1_date_of_approval",
            "item_type": "checkbox",
            "requires_doc_count": True,
        },
    )
