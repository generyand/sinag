"""add_submission_reminder_notification_type

Revision ID: de9cebeadd8a
Revises: ed829737bd16
Create Date: 2026-01-05 10:52:39.564956

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "de9cebeadd8a"
down_revision: Union[str, Sequence[str], None] = "ed829737bd16"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add SUBMISSION_REMINDER to notification_type_enum."""
    op.execute("ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'SUBMISSION_REMINDER'")


def downgrade() -> None:
    """Downgrade schema.

    Note: PostgreSQL does not support removing enum values directly.
    The enum value will remain but won't be used.
    """
    pass
