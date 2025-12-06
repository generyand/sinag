"""Remove year references from indicator 1.1

Revision ID: f7e8d9c0b1a2
Revises: 4eedf1a978f5
Create Date: 2025-12-06 11:15:00.000000

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f7e8d9c0b1a2"
down_revision: Union[str, None] = "4eedf1a978f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove year references from indicator 1.1 and sub-indicator 1.1.1."""

    # Update indicator 1.1 description
    op.execute("""
        UPDATE indicators
        SET description = 'Posted the following financial documents in the BFDP board, pursuant to DILG MC No. 2014-81 and DILG MC No. 2022-027'
        WHERE indicator_code = '1.1'
        AND description LIKE '%CY 2023%'
    """)

    # Update sub-indicator 1.1.1 name
    op.execute("""
        UPDATE indicators
        SET name = 'Posted the following financial documents in the BFDP board'
        WHERE indicator_code = '1.1.1'
        AND name LIKE '%CY 2023%'
    """)

    # Update checklist items mov_descriptions
    checklist_updates = [
        ("1_1_1_a", "Barangay Financial Report"),
        ("1_1_1_b", "Barangay Budget"),
        ("1_1_1_c", "Summary of Income and Expenditures"),
        ("1_1_1_d", "20% Component of the NTA Utilization"),
    ]

    for item_id, new_description in checklist_updates:
        op.execute(f"""
            UPDATE checklist_items
            SET mov_description = '{new_description}'
            WHERE item_id = '{item_id}'
            AND mov_description LIKE '%CY 2023%'
        """)


def downgrade() -> None:
    """Restore year references to indicator 1.1."""

    # Restore indicator 1.1 description
    op.execute("""
        UPDATE indicators
        SET description = 'Posted the following CY 2023 financial documents in the BFDP board, pursuant to DILG MC No. 2014-81 and DILG MC No. 2022-027'
        WHERE indicator_code = '1.1'
    """)

    # Restore sub-indicator 1.1.1 name
    op.execute("""
        UPDATE indicators
        SET name = 'Posted the following CY 2023 financial documents in the BFDP board'
        WHERE indicator_code = '1.1.1'
    """)

    # Restore checklist items mov_descriptions
    checklist_restores = [
        ("1_1_1_a", "Barangay Financial Report for CY 2023"),
        ("1_1_1_b", "Barangay Budget for CY 2023"),
        ("1_1_1_c", "Summary of Income and Expenditures for CY 2023"),
        ("1_1_1_d", "20% Component of the NTA Utilization for CY 2023"),
    ]

    for item_id, old_description in checklist_restores:
        op.execute(f"""
            UPDATE checklist_items
            SET mov_description = '{old_description}'
            WHERE item_id = '{item_id}'
        """)
