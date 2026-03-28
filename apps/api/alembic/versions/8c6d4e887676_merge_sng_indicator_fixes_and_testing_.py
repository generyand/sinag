"""merge sng indicator fixes and testing review-history heads

Revision ID: 8c6d4e887676
Revises: b7f2e1c4d8a9, b8c2d4e6f8a1
Create Date: 2026-03-24 22:51:10.184779

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8c6d4e887676"
down_revision: Union[str, Sequence[str], None] = ("b7f2e1c4d8a9", "b8c2d4e6f8a1")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
