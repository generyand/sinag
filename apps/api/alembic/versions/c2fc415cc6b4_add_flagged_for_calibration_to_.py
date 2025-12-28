"""add flagged_for_calibration to assessment_responses

Revision ID: c2fc415cc6b4
Revises: 9f95c4e66c67
Create Date: 2025-12-10 15:51:33.290836

Adds flagged_for_calibration boolean field to assessment_responses table.
This field allows validators to explicitly flag indicators for calibration/rework
independent of the Met/Unmet compliance status.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c2fc415cc6b4"
down_revision: Union[str, Sequence[str], None] = "9f95c4e66c67"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add flagged_for_calibration column to assessment_responses."""
    op.add_column(
        "assessment_responses",
        sa.Column(
            "flagged_for_calibration",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )


def downgrade() -> None:
    """Remove flagged_for_calibration column from assessment_responses."""
    op.drop_column("assessment_responses", "flagged_for_calibration")
