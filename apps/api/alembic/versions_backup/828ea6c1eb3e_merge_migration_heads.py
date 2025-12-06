"""merge migration heads

Revision ID: 828ea6c1eb3e
Revises: 03dfef4cb0ff, 298c4eb4b84e
Create Date: 2025-11-27 00:37:03.901194

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "828ea6c1eb3e"
down_revision: Union[str, Sequence[str], None] = ("03dfef4cb0ff", "298c4eb4b84e")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
