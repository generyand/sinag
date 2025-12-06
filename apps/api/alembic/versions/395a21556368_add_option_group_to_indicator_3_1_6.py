"""add_option_group_to_indicator_3_1_6

Revision ID: 395a21556368
Revises: cf0d97bf099d
Create Date: 2025-12-02 18:13:38.214806

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "395a21556368"
down_revision: Union[str, Sequence[str], None] = "cf0d97bf099d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Update indicator 3.1.6's checklist items to add option_group for OR-logic support.

    This enables the frontend to correctly calculate automatic Met/Unmet status
    for indicators with OR-logic validation rules.
    """
    # Get connection for raw SQL
    conn = op.get_bind()

    # Find indicator 3.1.6 by indicator_code
    result = conn.execute(
        sa.text("SELECT id FROM indicators WHERE indicator_code = '3.1.6'")
    ).fetchone()

    if result:
        indicator_id = result[0]

        # Update checklist item 3_1_6_option_1 to have option_group = "Option 1"
        conn.execute(
            sa.text("""
                UPDATE checklist_items
                SET option_group = 'Option 1'
                WHERE indicator_id = :indicator_id AND item_id = '3_1_6_option_1'
            """),
            {"indicator_id": indicator_id},
        )

        # Update checklist item 3_1_6_option_2 to have option_group = "Option 2"
        conn.execute(
            sa.text("""
                UPDATE checklist_items
                SET option_group = 'Option 2'
                WHERE indicator_id = :indicator_id AND item_id = '3_1_6_option_2'
            """),
            {"indicator_id": indicator_id},
        )


def downgrade() -> None:
    """Remove option_group from indicator 3.1.6's checklist items."""
    conn = op.get_bind()

    result = conn.execute(
        sa.text("SELECT id FROM indicators WHERE indicator_code = '3.1.6'")
    ).fetchone()

    if result:
        indicator_id = result[0]

        conn.execute(
            sa.text("""
                UPDATE checklist_items
                SET option_group = NULL
                WHERE indicator_id = :indicator_id AND item_id IN ('3_1_6_option_1', '3_1_6_option_2')
            """),
            {"indicator_id": indicator_id},
        )
