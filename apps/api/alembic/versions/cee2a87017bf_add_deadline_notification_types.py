"""add_deadline_notification_types

Revision ID: cee2a87017bf
Revises: 26dfbca7795e
Create Date: 2026-01-05 11:50:28.219412

Adds notification types for Phase 1 deadline reminders and auto-submit:
- DEADLINE_REMINDER_7_DAYS: Reminder 7 days before deadline
- DEADLINE_REMINDER_3_DAYS: Reminder 3 days before deadline
- DEADLINE_REMINDER_1_DAY: Reminder 1 day before deadline
- AUTO_SUBMITTED: Assessment was auto-submitted at deadline
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "cee2a87017bf"
down_revision: Union[str, Sequence[str], None] = "26dfbca7795e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add deadline notification types to notification_type_enum."""
    op.execute(
        "ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'DEADLINE_REMINDER_7_DAYS'"
    )
    op.execute(
        "ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'DEADLINE_REMINDER_3_DAYS'"
    )
    op.execute(
        "ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'DEADLINE_REMINDER_1_DAY'"
    )
    op.execute("ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'AUTO_SUBMITTED'")


def downgrade() -> None:
    """Downgrade schema.

    Note: PostgreSQL does not support removing enum values directly.
    The enum values will remain but won't be used.
    """
    pass
