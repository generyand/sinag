"""merge mov upload origin head

Revision ID: 3dc01c5ade6b
Revises: 20250325_mov_upload_origin, 8c6d4e887676
Create Date: 2026-03-25 16:12:27.244607

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3dc01c5ade6b"
down_revision: Union[str, Sequence[str], None] = ("20250325_mov_upload_origin", "8c6d4e887676")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
