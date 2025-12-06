"""update_3_4_1_3_5_1_date_and_3_5_2_or

Revision ID: 80bf6d4a6cac
Revises: 3bf9a4d326ad
Create Date: 2025-12-04 15:55:00.156020

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "80bf6d4a6cac"
down_revision: Union[str, Sequence[str], None] = "3bf9a4d326ad"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Updates:
    - 3.4.1: Change 3_4_1_date from document_count to date_input
    - 3.5.1: Change 3_5_1_date_of_approval from document_count to date_input
    - 3.5.2: Add OR separator and option_group to checklist items
    """
    conn = op.get_bind()

    # Update 3.4.1 date field to date_input type
    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET item_type = 'date_input'
        WHERE item_id = '3_4_1_date'
    """)
    )

    # Update 3.5.1 date field to date_input type
    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET item_type = 'date_input'
        WHERE item_id = '3_5_1_date_of_approval'
    """)
    )

    # Get the indicator_id for 3.5.2
    result = conn.execute(
        sa.text("""
        SELECT id FROM indicators WHERE indicator_code = '3.5.2'
    """)
    )
    row = result.fetchone()

    if row:
        indicator_id = row[0]

        # Check if OR separator already exists
        existing = conn.execute(
            sa.text("""
            SELECT id FROM checklist_items
            WHERE item_id = '3_5_2_or_separator'
        """)
        ).fetchone()

        if not existing:
            # Insert OR separator for 3.5.2
            conn.execute(
                sa.text("""
                INSERT INTO checklist_items (
                    indicator_id, item_id, label, item_type,
                    required, display_order, option_group
                ) VALUES (
                    :ind_id, '3_5_2_or_separator', 'OR', 'info_text',
                    false, 2, NULL
                )
            """),
                {"ind_id": indicator_id},
            )

        # Update display_order for 3_5_2_b_upload to be after OR separator
        conn.execute(
            sa.text("""
            UPDATE checklist_items
            SET display_order = 3, option_group = 'Option B'
            WHERE item_id = '3_5_2_b_upload'
        """)
        )

        # Update option_group for 3_5_2_a_upload
        conn.execute(
            sa.text("""
            UPDATE checklist_items
            SET option_group = 'Option A'
            WHERE item_id = '3_5_2_a_upload'
        """)
        )


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    # Revert 3.4.1 date field to document_count
    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET item_type = 'document_count'
        WHERE item_id = '3_4_1_date'
    """)
    )

    # Revert 3.5.1 date field to document_count
    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET item_type = 'document_count'
        WHERE item_id = '3_5_1_date_of_approval'
    """)
    )

    # Remove OR separator for 3.5.2
    conn.execute(
        sa.text("""
        DELETE FROM checklist_items
        WHERE item_id = '3_5_2_or_separator'
    """)
    )

    # Reset option_groups
    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET display_order = 2, option_group = NULL
        WHERE item_id = '3_5_2_b_upload'
    """)
    )

    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET option_group = NULL
        WHERE item_id = '3_5_2_a_upload'
    """)
    )
