"""add preferred_language to users

Revision ID: e1abc802507e
Revises: 828ea6c1eb3e
Create Date: 2025-11-27 00:38:25.153495

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "e1abc802507e"
down_revision: Union[str, Sequence[str], None] = "828ea6c1eb3e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add preferred_language column to users table."""
    op.add_column(
        "users",
        sa.Column(
            "preferred_language",
            sa.String(length=3),
            nullable=False,
            server_default="ceb",
            comment="Preferred language for AI summaries: ceb (Bisaya), fil (Tagalog), en (English)",
        ),
    )


def downgrade() -> None:
    """Remove preferred_language column from users table."""
    op.drop_column("users", "preferred_language")
