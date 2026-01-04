"""add_municipal_office_id_to_users

Revision ID: 44e657e8abb5
Revises: 5043ec75e740
Create Date: 2026-01-04 14:34:53.604407

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "44e657e8abb5"
down_revision: Union[str, Sequence[str], None] = "5043ec75e740"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add municipal_office_id column to users table."""
    op.add_column("users", sa.Column("municipal_office_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_users_municipal_office_id",
        "users",
        "municipal_offices",
        ["municipal_office_id"],
        ["id"],
    )


def downgrade() -> None:
    """Remove municipal_office_id column from users table."""
    op.drop_constraint("fk_users_municipal_office_id", "users", type_="foreignkey")
    op.drop_column("users", "municipal_office_id")
