"""merge_bbi_fix

Revision ID: 9f95c4e66c67
Revises: 7c78cb0595d7, fix_is_bbi_official_7_only
Create Date: 2025-12-10 05:38:33.983730

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9f95c4e66c67"
down_revision: Union[str, Sequence[str], None] = ("7c78cb0595d7", "fix_is_bbi_official_7_only")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
