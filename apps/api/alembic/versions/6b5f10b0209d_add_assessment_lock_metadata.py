"""add assessment lock metadata

Revision ID: 6b5f10b0209d
Revises: 4fd989bb27e0
Create Date: 2026-03-21 20:35:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "6b5f10b0209d"
down_revision: Union[str, Sequence[str], None] = "4fd989bb27e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "assessment_years",
        sa.Column(
            "default_unlock_grace_period_days",
            sa.Integer(),
            nullable=False,
            server_default="3",
        ),
    )
    op.alter_column(
        "assessment_years",
        "default_unlock_grace_period_days",
        server_default=None,
    )

    op.add_column("assessments", sa.Column("lock_reason", sa.String(length=50), nullable=True))
    op.add_column("assessments", sa.Column("grace_period_set_by", sa.Integer(), nullable=True))
    op.add_column("assessments", sa.Column("unlocked_at", sa.DateTime(), nullable=True))
    op.add_column("assessments", sa.Column("unlocked_by", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_assessments_grace_period_set_by_users",
        "assessments",
        "users",
        ["grace_period_set_by"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_assessments_unlocked_by_users",
        "assessments",
        "users",
        ["unlocked_by"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("fk_assessments_unlocked_by_users", "assessments", type_="foreignkey")
    op.drop_constraint(
        "fk_assessments_grace_period_set_by_users",
        "assessments",
        type_="foreignkey",
    )
    op.drop_column("assessments", "unlocked_by")
    op.drop_column("assessments", "unlocked_at")
    op.drop_column("assessments", "grace_period_set_by")
    op.drop_column("assessments", "lock_reason")
    op.drop_column("assessment_years", "default_unlock_grace_period_days")
