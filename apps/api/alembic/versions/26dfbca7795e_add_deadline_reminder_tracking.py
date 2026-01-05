"""add_deadline_reminder_tracking

Revision ID: 26dfbca7795e
Revises: de9cebeadd8a
Create Date: 2026-01-05 11:50:08.002718

Adds columns to track Phase 1 deadline reminders and auto-submit status:
- phase1_reminder_7d_sent_at: When 7-day reminder was sent
- phase1_reminder_3d_sent_at: When 3-day reminder was sent
- phase1_reminder_1d_sent_at: When 1-day reminder was sent
- auto_submitted_at: When assessment was auto-submitted at deadline
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "26dfbca7795e"
down_revision: Union[str, Sequence[str], None] = "de9cebeadd8a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add deadline reminder tracking columns to assessments table."""
    # Add Phase 1 deadline reminder tracking columns
    op.add_column(
        "assessments",
        sa.Column("phase1_reminder_7d_sent_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "assessments",
        sa.Column("phase1_reminder_3d_sent_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "assessments",
        sa.Column("phase1_reminder_1d_sent_at", sa.DateTime(), nullable=True),
    )
    # Add auto-submit timestamp
    op.add_column(
        "assessments",
        sa.Column("auto_submitted_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    """Remove deadline reminder tracking columns."""
    op.drop_column("assessments", "auto_submitted_at")
    op.drop_column("assessments", "phase1_reminder_1d_sent_at")
    op.drop_column("assessments", "phase1_reminder_3d_sent_at")
    op.drop_column("assessments", "phase1_reminder_7d_sent_at")
