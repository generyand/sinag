"""merge heads

Revision ID: 8b29bcf2785e
Revises: 5446a28e8751, d4e5f6a7b8c9
Create Date: 2025-12-06 16:10:39.255389

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8b29bcf2785e'
down_revision: Union[str, Sequence[str], None] = ('5446a28e8751', 'd4e5f6a7b8c9')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
