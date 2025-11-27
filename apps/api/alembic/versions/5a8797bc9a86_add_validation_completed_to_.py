"""add_validation_completed_to_notification_type_enum

Revision ID: 5a8797bc9a86
Revises: f492caba063c
Create Date: 2025-11-27 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5a8797bc9a86'
down_revision: Union[str, Sequence[str], None] = 'f492caba063c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add VALIDATION_COMPLETED to notification_type_enum.

    This was missing from the original enum creation but is required
    for the notification that's sent when a validator completes
    all governance area validations and the assessment moves to COMPLETED status.
    """
    # Add the new enum value to the existing notification_type_enum
    # In PostgreSQL, we need to use ALTER TYPE ... ADD VALUE
    op.execute("ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'VALIDATION_COMPLETED'")


def downgrade() -> None:
    """Downgrade by removing VALIDATION_COMPLETED from enum.

    Note: PostgreSQL doesn't support removing enum values directly.
    This would require recreating the enum type and updating all references.
    For simplicity, we leave the enum value in place during downgrade.
    """
    # PostgreSQL doesn't support removing enum values
    # The value will remain in the enum but won't be used
    pass
