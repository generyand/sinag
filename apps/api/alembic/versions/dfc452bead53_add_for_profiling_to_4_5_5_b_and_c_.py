"""add_for_profiling_to_4_5_5_b_and_c_checklist_items

Revision ID: dfc452bead53
Revises: cf6b48c08eac
Create Date: 2025-12-12 16:40:03.991046

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "dfc452bead53"
down_revision: Union[str, Sequence[str], None] = "cf6b48c08eac"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add (FOR PROFILING) suffix to checklist items 4_5_5_b and 4_5_5_c."""
    # Update 4_5_5_b label and set required=false
    op.execute(
        "UPDATE checklist_items "
        "SET label = 'Copy of Comprehensive Barangay Juvenile Intervention Program/Diversion Program (FOR PROFILING)', "
        "required = false, "
        "updated_at = NOW() "
        "WHERE item_id = '4_5_5_b'"
    )

    # Update 4_5_5_c label and set required=false
    op.execute(
        "UPDATE checklist_items "
        "SET label = 'Copy of Juvenile Justice and Welfare Council''s Children at Risk (CAR) and Children in Conflict with the Law (CICL) registry (FOR PROFILING)', "
        "required = false, "
        "updated_at = NOW() "
        "WHERE item_id = '4_5_5_c'"
    )


def downgrade() -> None:
    """Revert checklist item labels and required status."""
    # Revert 4_5_5_b
    op.execute(
        "UPDATE checklist_items "
        "SET label = 'Copy of Comprehensive Barangay Juvenile Intervention Program/Diversion Program', "
        "required = true, "
        "updated_at = NOW() "
        "WHERE item_id = '4_5_5_b'"
    )

    # Revert 4_5_5_c
    op.execute(
        "UPDATE checklist_items "
        "SET label = 'Copy of Juvenile Justice and Welfare Council''s Children at Risk (CAR) and Children in Conflict with the Law (CICL) registry', "
        "required = true, "
        "updated_at = NOW() "
        "WHERE item_id = '4_5_5_c'"
    )
