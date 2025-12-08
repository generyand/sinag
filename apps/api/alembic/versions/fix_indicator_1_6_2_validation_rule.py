"""fix_indicator_1_6_2_validation_rule

Revision ID: fix_1_6_2_val_rule
Revises: 5446a28e8751
Create Date: 2025-01-08

Changes indicator 1.6.2 validation_rule from ANY_ITEM_REQUIRED to ANY_OPTION_GROUP_REQUIRED.

This is needed because 1.6.2 has two groups:
- Group "5above": Resolution (1_6_2_5above_a) + ABYIP (1_6_2_5above_b) - both must be checked
- Group "4below": Certification (1_6_2_4below_cert) - alone is sufficient

With ANY_OPTION_GROUP_REQUIRED, the validator must complete ALL items in ONE group,
not just any single checkbox.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "fix_1_6_2_val_rule"
down_revision: str = "update_bbi_results_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update indicator 1.6.2 validation_rule to ANY_OPTION_GROUP_REQUIRED."""
    conn = op.get_bind()
    
    # Update indicator 1.6.2 to use ANY_OPTION_GROUP_REQUIRED
    conn.execute(
        sa.text("""
            UPDATE indicators 
            SET validation_rule = 'ANY_OPTION_GROUP_REQUIRED'
            WHERE indicator_code = '1.6.2'
        """)
    )
    
    print("Updated indicator 1.6.2 validation_rule to ANY_OPTION_GROUP_REQUIRED")


def downgrade() -> None:
    """Revert indicator 1.6.2 validation_rule to ANY_ITEM_REQUIRED."""
    conn = op.get_bind()
    
    conn.execute(
        sa.text("""
            UPDATE indicators 
            SET validation_rule = 'ANY_ITEM_REQUIRED'
            WHERE indicator_code = '1.6.2'
        """)
    )
    
    print("Reverted indicator 1.6.2 validation_rule to ANY_ITEM_REQUIRED")

