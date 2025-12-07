"""add_missing_date_fields_2_1_1_3_1_1

Revision ID: 4be7f4b56718
Revises: 91539f62d6e3
Create Date: 2025-12-04

Updates existing "Date of approval" fields in 2.1.1 and 3.1.1 to use date_input type
instead of document_count (which shows "Enter count").

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4be7f4b56718"
down_revision: Union[str, Sequence[str], None] = "91539f62d6e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update existing date fields to date_input type using raw SQL."""
    conn = op.get_bind()

    print("Updating date fields for 2.1.1 and 3.1.1...")

    # Get indicator 2.1.1
    result = conn.execute(
        sa.text("SELECT id FROM indicators WHERE indicator_code = :code"),
        {"code": "2.1.1"},
    ).fetchone()

    if result:
        indicator_id = result[0]
        # Find any date-related field for this indicator and update to date_input
        conn.execute(
            sa.text("""
                UPDATE checklist_items
                SET item_type = 'date_input', requires_document_count = false
                WHERE indicator_id = :indicator_id
                AND label ILIKE '%date%'
                AND item_type != 'date_input'
            """),
            {"indicator_id": indicator_id},
        )

        # If no date field exists, create one
        existing = conn.execute(
            sa.text("""
                SELECT id FROM checklist_items
                WHERE indicator_id = :indicator_id AND label ILIKE '%date%'
            """),
            {"indicator_id": indicator_id},
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
        else:
            print("  - Updated 2.1.1 date fields to date_input type")

    # Get indicator 3.1.1
    result = conn.execute(
        sa.text("SELECT id FROM indicators WHERE indicator_code = :code"),
        {"code": "3.1.1"},
    ).fetchone()

    if result:
        indicator_id = result[0]
        # Find any date-related field for this indicator and update to date_input
        conn.execute(
            sa.text("""
                UPDATE checklist_items
                SET item_type = 'date_input', requires_document_count = false
                WHERE indicator_id = :indicator_id
                AND label ILIKE '%date%'
                AND item_type != 'date_input'
            """),
            {"indicator_id": indicator_id},
        )

        # If no date field exists, create one
        existing = conn.execute(
            sa.text("""
                SELECT id FROM checklist_items
                WHERE indicator_id = :indicator_id AND label ILIKE '%date%'
            """),
            {"indicator_id": indicator_id},
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
        else:
            print("  - Updated 3.1.1 date fields to date_input type")

    print("Migration complete!")


def downgrade() -> None:
    """Revert date input fields."""
    pass
