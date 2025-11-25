"""add external user roles for katuparan and umdc peace center

Revision ID: 58cc6bc4a841
Revises: e534d2c96aa1
Create Date: 2025-11-25 08:44:35.976305

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '58cc6bc4a841'
down_revision: Union[str, Sequence[str], None] = 'e534d2c96aa1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new enum values to user_role_enum
    # PostgreSQL requires using ALTER TYPE to add new enum values
    op.execute("ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'KATUPARAN_CENTER_USER'")
    op.execute("ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'UMDC_PEACE_CENTER_USER'")


def downgrade() -> None:
    """Downgrade schema."""
    # Note: PostgreSQL does not support removing enum values
    # This downgrade would require recreating the enum type and all dependent columns
    # For simplicity, we'll leave the enum values in place
    # They won't cause issues as long as no users have these roles
    pass
