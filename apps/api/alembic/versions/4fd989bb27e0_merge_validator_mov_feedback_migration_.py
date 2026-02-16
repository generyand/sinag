"""merge validator mov feedback migration head

Revision ID: 4fd989bb27e0
Revises: 567d866b9459, 8c31c0c7a2d1
Create Date: 2026-02-16 18:12:50.716479

"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = '4fd989bb27e0'
down_revision: Union[str, Sequence[str], None] = ('567d866b9459', '8c31c0c7a2d1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
