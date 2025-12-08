"""Merge all migration heads into single head.

Revision ID: merge_all_heads
Revises: fix_required_flags_indicator_2_3_2, fix_2_1_1_single_upload_field
Create Date: 2025-12-08

This is a merge migration to combine multiple heads into one.
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "merge_all_heads"
down_revision: Union[str, Sequence[str], None] = (
    "fix_2_3_2_required",
    "fix_2_1_1_single_upload_field",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge migration - no schema changes."""
    pass


def downgrade() -> None:
    """Merge migration - no schema changes."""
    pass

