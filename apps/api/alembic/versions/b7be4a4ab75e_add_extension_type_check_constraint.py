"""add_extension_type_check_constraint

Revision ID: b7be4a4ab75e
Revises: 4c800c19753b
Create Date: 2026-01-04 12:04:52.334741

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b7be4a4ab75e"
down_revision: Union[str, Sequence[str], None] = "4c800c19753b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add CHECK constraint for extension_type column."""
    op.create_check_constraint(
        "ck_extension_type_valid",
        "assessment_deadline_extensions",
        "extension_type IN ('rework', 'calibration')",
    )


def downgrade() -> None:
    """Remove CHECK constraint for extension_type column."""
    op.drop_constraint(
        "ck_extension_type_valid",
        "assessment_deadline_extensions",
        type_="check",
    )
