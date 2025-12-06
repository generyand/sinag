"""merge_performance_indexes_and_field_notes_branches

Revision ID: 6fa56c3e7208
Revises: 0a7915c2b55b, f56311261833
Create Date: 2025-12-05 00:20:24.461922

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6fa56c3e7208'
down_revision: Union[str, Sequence[str], None] = ('0a7915c2b55b', 'f56311261833')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
