"""merge conflicting migration heads

Revision ID: 339b5471cb65
Revises: 4a471efede0c, a1b2c3d4e5f7
Create Date: 2025-11-17 18:08:47.680812

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '339b5471cb65'
down_revision: Union[str, Sequence[str], None] = ('4a471efede0c', 'a1b2c3d4e5f7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
