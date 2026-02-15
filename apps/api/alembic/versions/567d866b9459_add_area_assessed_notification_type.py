"""add_area_assessed_notification_type

Revision ID: 567d866b9459
Revises: 790b5f8fe7d2
Create Date: 2026-02-15 19:33:33.332713

Adds notification type for per-area assessor approval:
- AREA_ASSESSED: Assessor approved a governance area
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "567d866b9459"
down_revision: Union[str, Sequence[str], None] = "790b5f8fe7d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add AREA_ASSESSED notification type to notification_type_enum."""
    op.execute("ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'AREA_ASSESSED'")


def downgrade() -> None:
    """Downgrade schema.

    Note: PostgreSQL does not support removing enum values directly.
    The enum values will remain but won't be used.
    """
    pass
