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
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "91539f62d6e3"
down_revision: Union[str, Sequence[str], None] = "9f8467f702cd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add/update date input fields using raw SQL."""
    conn = op.get_bind()

    print("Adding/updating date input fields...")

    # === 2.1.1: Add new date field ===
    result = conn.execute(
        sa.text("SELECT id FROM indicators WHERE indicator_code = :code"),
        {"code": "2.1.1"},
    ).fetchone()

    if result:
        indicator_id = result[0]
        # Check if date field already exists
        existing = conn.execute(
            sa.text("SELECT id FROM checklist_items WHERE item_id = :item_id"),
            {"item_id": "2_1_1_date"},
        ).fetchone()

        if not existing:
            conn.execute(
                sa.text("""
                    INSERT INTO checklist_items (
                        indicator_id, item_id, label, item_type, required, display_order
                    ) VALUES (
                        :indicator_id, :item_id, :label, :item_type, :required, :display_order
                    )
                """),
                {
                    "indicator_id": indicator_id,
                    "item_id": "2_1_1_date",
                    "label": "Date of approval",
                    "item_type": "date_input",
                    "required": True,
                    "display_order": 2,
                },
            )
            print("  - Added 2_1_1_date field")

    # === 3.1.1: Add new date field ===
    result = conn.execute(
        sa.text("SELECT id FROM indicators WHERE indicator_code = :code"),
        {"code": "3.1.1"},
    ).fetchone()

    if result:
        indicator_id = result[0]
        # Check if date field already exists
        existing = conn.execute(
            sa.text("SELECT id FROM checklist_items WHERE item_id = :item_id"),
            {"item_id": "3_1_1_date"},
        ).fetchone()

        if not existing:
            conn.execute(
                sa.text("""
                    INSERT INTO checklist_items (
                        indicator_id, item_id, label, item_type, required, display_order
                    ) VALUES (
                        :indicator_id, :item_id, :label, :item_type, :required, :display_order
                    )
                """),
                {
                    "indicator_id": indicator_id,
                    "item_id": "3_1_1_date",
                    "label": "Date of approval",
                    "item_type": "date_input",
                    "required": True,
                    "display_order": 2,
                },
            )
            print("  - Added 3_1_1_date field")

    # === 3.1.2: Update existing date field ===
    conn.execute(
        sa.text("""
            UPDATE checklist_items
            SET item_type = :item_type, requires_document_count = :requires_doc_count
            WHERE item_id = :item_id
        """),
        {
            "item_id": "3_1_2_date",
            "item_type": "date_input",
            "requires_doc_count": False,
        },
    )
    print("  - Updated 3_1_2_date to date_input type")

    # === 3.1.3: Update existing date field ===
    conn.execute(
        sa.text("""
            UPDATE checklist_items
            SET item_type = :item_type, requires_document_count = :requires_doc_count
            WHERE item_id = :item_id
        """),
        {
            "item_id": "3_1_3_date",
            "item_type": "date_input",
            "requires_doc_count": False,
        },
    )
    print("  - Updated 3_1_3_date to date_input type")

    # === 3.1.4: Update existing date field ===
    conn.execute(
        sa.text("""
            UPDATE checklist_items
            SET item_type = :item_type, requires_document_count = :requires_doc_count
            WHERE item_id = :item_id
        """),
        {
            "item_id": "3_1_4_date",
            "item_type": "date_input",
            "requires_doc_count": False,
        },
    )
    print("  - Updated 3_1_4_date to date_input type")

    print("Migration complete!")


def downgrade() -> None:
    """Revert date input fields."""
    pass
