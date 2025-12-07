"""finalize_indicator_updates_4_3_4_4_5_6

Revision ID: 05b614bebace
Revises: d23c948a2fbf
Create Date: 2025-12-07 19:52:51.607090

Captures direct database changes made during the session:
1. Update indicator names for 4.3.4 and 4.5.6
2. Swap checklist_items display_order for 4.3.4 (accomplished before reflected)
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "05b614bebace"
down_revision: Union[str, Sequence[str], None] = "d23c948a2fbf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEW_NAME = "Accomplishment Reports: At least 50% accomplishment (Physical) OR 50% fund utilization (Financial)"


def upgrade() -> None:
    """Apply finalized changes."""
    conn = op.get_bind()

    # 1. Update indicator names for 4.3.4 and 4.5.6
    conn.execute(
        sa.text("UPDATE indicators SET name = :name WHERE indicator_code IN ('4.3.4', '4.5.6')"),
        {"name": NEW_NAME},
    )
    print("Updated indicator names for 4.3.4 and 4.5.6")

    # 2. Swap checklist_items display_order for 4.3.4
    # Get indicator ID
    result = conn.execute(
        sa.text("SELECT id FROM indicators WHERE indicator_code = '4.3.4'")
    ).fetchone()

    if result:
        indicator_id = result[0]

        # Get current display_order values
        accomplished = conn.execute(
            sa.text(
                "SELECT display_order FROM checklist_items WHERE indicator_id = :ind_id AND item_id = '4_3_4_physical_accomplished'"
            ),
            {"ind_id": indicator_id},
        ).fetchone()

        reflected = conn.execute(
            sa.text(
                "SELECT display_order FROM checklist_items WHERE indicator_id = :ind_id AND item_id = '4_3_4_physical_reflected'"
            ),
            {"ind_id": indicator_id},
        ).fetchone()

        if accomplished and reflected:
            acc_order = accomplished[0]
            ref_order = reflected[0]

            # Only swap if reflected comes before accomplished (wrong order)
            if ref_order < acc_order:
                conn.execute(
                    sa.text(
                        "UPDATE checklist_items SET display_order = :order WHERE indicator_id = :ind_id AND item_id = '4_3_4_physical_accomplished'"
                    ),
                    {"order": ref_order, "ind_id": indicator_id},
                )
                conn.execute(
                    sa.text(
                        "UPDATE checklist_items SET display_order = :order WHERE indicator_id = :ind_id AND item_id = '4_3_4_physical_reflected'"
                    ),
                    {"order": acc_order, "ind_id": indicator_id},
                )
                print(
                    f"Swapped 4.3.4 checklist_items display_order: accomplished={ref_order}, reflected={acc_order}"
                )
            else:
                print("4.3.4 checklist_items already in correct order")


def downgrade() -> None:
    """Revert changes."""
    conn = op.get_bind()

    # Revert indicator names
    conn.execute(
        sa.text(
            "UPDATE indicators SET name = 'Accomplishment Reports: Physical accomplishment OR fund utilization (only 1 of the below reports is required)' WHERE indicator_code = '4.3.4'"
        )
    )
    conn.execute(
        sa.text(
            "UPDATE indicators SET name = 'Accomplishment Reports: Physical accomplishment OR financial utilization (only 1 of the below reports is required)' WHERE indicator_code = '4.5.6'"
        )
    )
