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
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f882c7bc5f45"
down_revision: Union[str, Sequence[str], None] = "4be7f4b56718"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update 3.1.8 order and 3.2.1 date field using raw SQL."""
    conn = op.get_bind()

    print("Updating 3.1.8 and 3.2.1...")

    # === 3.1.8: Update display_order ===
    # Move count field (3_1_8_count) to display_order=2
    conn.execute(
        sa.text("UPDATE checklist_items SET display_order = 2 WHERE item_id = :item_id"),
        {"item_id": "3_1_8_count"},
    )
    print("  - Updated 3_1_8_count display_order to 2")

    # Move certification (3_1_8_b) to display_order=3
    conn.execute(
        sa.text("UPDATE checklist_items SET display_order = 3 WHERE item_id = :item_id"),
        {"item_id": "3_1_8_b"},
    )
    print("  - Updated 3_1_8_b display_order to 3")

    # === 3.2.1: Add/update date field ===
    result = conn.execute(
        sa.text("SELECT id FROM indicators WHERE indicator_code = :code"),
        {"code": "3.2.1"},
    ).fetchone()

    if result:
        indicator_id = result[0]

        # Check if date field exists
        existing_date = conn.execute(
            sa.text("""
                SELECT id, item_id FROM checklist_items
                WHERE indicator_id = :indicator_id AND label ILIKE '%date%'
            """),
            {"indicator_id": indicator_id},
        ).fetchone()

        if existing_date:
            # Update existing field to date_input type
            conn.execute(
                sa.text("""
                    UPDATE checklist_items
                    SET item_type = 'date_input', requires_document_count = false
                    WHERE id = :id
                """),
                {"id": existing_date[0]},
            )
            print(f"  - Updated {existing_date[1]} to date_input type")
        else:
            # Create new date field
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
                    "item_id": "3_2_1_date",
                    "label": "Date of approval for the EO or similar issuance",
                    "item_type": "date_input",
                    "required": True,
                    "display_order": 2,
                },
            )
            print("  - Added 3_2_1_date field")

    print("Migration complete!")


def downgrade() -> None:
    """Revert changes."""
    pass
