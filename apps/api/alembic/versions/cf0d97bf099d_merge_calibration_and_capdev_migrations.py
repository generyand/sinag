"""merge_calibration_and_capdev_migrations

Revision ID: cf0d97bf099d
Revises: 7689f5b6745f, a0799e8cc38c
Create Date: 2025-12-02 18:00:02.623274

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "cf0d97bf099d"
down_revision: Union[str, Sequence[str], None] = ("7689f5b6745f", "a0799e8cc38c")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
