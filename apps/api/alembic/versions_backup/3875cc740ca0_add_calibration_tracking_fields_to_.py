"""add calibration tracking fields to assessment

Revision ID: 3875cc740ca0
Revises: 58cc6bc4a841
Create Date: 2025-11-25 20:59:40.506154

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3875cc740ca0"
down_revision: Union[str, Sequence[str], None] = "58cc6bc4a841"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add calibration tracking fields."""
    # Add is_calibration_rework flag to track if rework is for calibration (Phase 2 Validator)
    op.add_column(
        "assessments",
        sa.Column(
            "is_calibration_rework",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )

    # Add calibration_validator_id to track which validator requested calibration
    op.add_column(
        "assessments",
        sa.Column("calibration_validator_id", sa.Integer(), nullable=True),
    )

    # Add foreign key constraint for calibration_validator_id
    op.create_foreign_key(
        "fk_assessments_calibration_validator_id",
        "assessments",
        "users",
        ["calibration_validator_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Downgrade schema - remove calibration tracking fields."""
    op.drop_constraint("fk_assessments_calibration_validator_id", "assessments", type_="foreignkey")
    op.drop_column("assessments", "calibration_validator_id")
    op.drop_column("assessments", "is_calibration_rework")
