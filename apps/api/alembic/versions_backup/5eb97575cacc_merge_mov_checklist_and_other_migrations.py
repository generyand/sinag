"""merge mov checklist and other migrations

Revision ID: 5eb97575cacc
Revises: a1b2c3d4e5f6, ucz4sottgz50
Create Date: 2025-11-13 10:37:21.764605

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5eb97575cacc'
down_revision: Union[str, Sequence[str], None] = ('a1b2c3d4e5f6', 'ucz4sottgz50')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
