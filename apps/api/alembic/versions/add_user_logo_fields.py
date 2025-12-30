"""add_user_logo_fields

Revision ID: c1a2b3d4e5f6
Revises: 84ad5b2dfad0
Create Date: 2025-12-30

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c1a2b3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "84ad5b2dfad0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add logo_url and logo_uploaded_at columns to users table."""
    op.add_column(
        "users",
        sa.Column(
            "logo_url",
            sa.String(),
            nullable=True,
            comment="URL to user's profile logo/avatar in Supabase Storage",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "logo_uploaded_at",
            sa.DateTime(timezone=True),
            nullable=True,
            comment="Timestamp when logo was last uploaded",
        ),
    )


def downgrade() -> None:
    """Remove logo_url and logo_uploaded_at columns from users table."""
    op.drop_column("users", "logo_uploaded_at")
    op.drop_column("users", "logo_url")
