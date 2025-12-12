"""merge migration heads

Revision ID: 755d018546e3
Revises: 28b28b23f4e2, 650332d0bc71
Create Date: 2025-12-13 06:11:24.544101

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '755d018546e3'
down_revision: Union[str, Sequence[str], None] = ('28b28b23f4e2', '650332d0bc71')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
