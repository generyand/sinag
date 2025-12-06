"""fix_indicator_2_1_4_year_references

Revision ID: 738c70bbc68e
Revises: 2e73cc62d5dd
Create Date: 2025-12-06 10:32:15.075202

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "738c70bbc68e"
down_revision: Union[str, Sequence[str], None] = "2e73cc62d5dd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove year references from indicator 2.1.4 and 3.2.3 checklist items."""
    # Update 2_1_4_option_b - remove "CY 2023" and "as of December 31, 2023"
    op.execute("""
        UPDATE checklist_items
        SET label = 'b. At least 50% fund utilization of the 70% component of BDRRMF - Preparedness component'
        WHERE item_id = '2_1_4_option_b'
        AND label LIKE '%CY 2023%'
    """)

    # Update 2_1_4_financial_utilized - remove "(as of Dec. 31, 2023)"
    op.execute("""
        UPDATE checklist_items
        SET label = 'Total amount utilized'
        WHERE item_id = '2_1_4_financial_utilized'
        AND label LIKE '%2023%'
    """)

    # Update 2_1_4_financial_allocated - remove "for CY 2023"
    op.execute("""
        UPDATE checklist_items
        SET label = 'Total amount allocated for PPAs in the BDRRMF Plan'
        WHERE item_id = '2_1_4_financial_allocated'
        AND label LIKE '%2023%'
    """)

    # Update 3_2_3_option_b - remove "CY 2023"
    op.execute("""
        UPDATE checklist_items
        SET label = 'b. At least 50% fund utilization rate of the BPOPs Budget'
        WHERE item_id = '3_2_3_option_b'
        AND label LIKE '%CY 2023%'
    """)

    # Update 3_2_3_financial_allocated - remove "for CY 2023"
    op.execute("""
        UPDATE checklist_items
        SET label = 'Total amount allocated for FPAs in the BPOPS Plan'
        WHERE item_id = '3_2_3_financial_allocated'
        AND label LIKE '%2023%'
    """)

    # Update 3_2_3_financial_utilized - remove "(as of Dec. 31, 2023)"
    op.execute("""
        UPDATE checklist_items
        SET label = 'Total amount utilized'
        WHERE item_id = '3_2_3_financial_utilized'
        AND label LIKE '%2023%'
    """)


def downgrade() -> None:
    """Restore year references to indicator 2.1.4 checklist items."""
    op.execute("""
        UPDATE checklist_items
        SET label = 'b. At least 50% fund utilization of the 70% component of CY 2023 BDRRMF - Preparedness component as of December 31, 2023'
        WHERE item_id = '2_1_4_option_b'
    """)

    op.execute("""
        UPDATE checklist_items
        SET label = 'Total amount utilized (as of Dec. 31, 2023)'
        WHERE item_id = '2_1_4_financial_utilized'
    """)

    op.execute("""
        UPDATE checklist_items
        SET label = 'Total amount allocated for PPAs in the BDRRM Plan for CY 2023'
        WHERE item_id = '2_1_4_financial_allocated'
    """)
