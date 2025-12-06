"""fix_indicator_3_2_3_year_references

Revision ID: 25aa34db3929
Revises: 738c70bbc68e
Create Date: 2025-12-06 10:33:54.492112

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "25aa34db3929"
down_revision: Union[str, Sequence[str], None] = "738c70bbc68e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove year references from indicator 3.2.3 checklist items."""
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
    """Restore year references to indicator 3.2.3 checklist items."""
    op.execute("""
        UPDATE checklist_items
        SET label = 'b. At least 50% fund utilization rate of the CY 2023 BPOPs Budget'
        WHERE item_id = '3_2_3_option_b'
    """)

    op.execute("""
        UPDATE checklist_items
        SET label = 'Total amount allocated for FPAs in the BPOPS Plan for CY 2023'
        WHERE item_id = '3_2_3_financial_allocated'
    """)

    op.execute("""
        UPDATE checklist_items
        SET label = 'Total amount utilized (as of Dec. 31, 2023)'
        WHERE item_id = '3_2_3_financial_utilized'
    """)
