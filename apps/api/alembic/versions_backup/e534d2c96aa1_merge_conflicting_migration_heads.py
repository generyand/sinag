"""merge conflicting migration heads

Revision ID: e534d2c96aa1
Revises: 78a204fd5bc8, add_rework_summary
Create Date: 2025-11-24 22:14:04.098096

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e534d2c96aa1'
down_revision: Union[str, Sequence[str], None] = ('78a204fd5bc8', 'add_rework_summary')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
