"""add_user_preferences_jsonb

Revision ID: 4736110d6eef
Revises: j5e6f7g8h9i0
Create Date: 2025-12-15 06:48:55.650339

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "4736110d6eef"
down_revision: Union[str, Sequence[str], None] = "j5e6f7g8h9i0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add preferences JSONB column to users table for storing user preferences like tour state."""
    op.add_column(
        "users",
        sa.Column(
            "preferences",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=False,
            comment="User preferences including onboarding tour state, UI settings, etc.",
        ),
    )


def downgrade() -> None:
    """Remove preferences column from users table."""
    op.drop_column("users", "preferences")
