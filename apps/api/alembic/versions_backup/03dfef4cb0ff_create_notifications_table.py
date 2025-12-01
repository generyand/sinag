"""create notifications table

Revision ID: 03dfef4cb0ff
Revises: de1d0f3186e7
Create Date: 2025-11-26 21:03:48.342727

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '03dfef4cb0ff'
down_revision: Union[str, Sequence[str], None] = 'de1d0f3186e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create notification_type_enum type if it doesn't exist
    # Using postgresql.ENUM with create_type=False since we handle creation manually
    notification_type_enum = postgresql.ENUM(
        'NEW_SUBMISSION',
        'REWORK_REQUESTED',
        'REWORK_RESUBMITTED',
        'READY_FOR_VALIDATION',
        'CALIBRATION_REQUESTED',
        'CALIBRATION_RESUBMITTED',
        name='notification_type_enum',
        create_type=False
    )

    # Create the enum type only if it doesn't exist
    conn = op.get_bind()
    result = conn.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = 'notification_type_enum'")
    ).fetchone()
    if not result:
        notification_type_enum.create(conn)

    # Create notifications table
    op.create_table('notifications',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('recipient_id', sa.Integer(), nullable=False),
        sa.Column('notification_type', notification_type_enum, nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('assessment_id', sa.Integer(), nullable=True),
        sa.Column('governance_area_id', sa.Integer(), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('email_sent', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('email_sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['governance_area_id'], ['governance_areas.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['recipient_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for efficient querying
    op.create_index('ix_notifications_id', 'notifications', ['id'], unique=False)
    op.create_index('ix_notifications_recipient_id', 'notifications', ['recipient_id'], unique=False)
    op.create_index('ix_notifications_notification_type', 'notifications', ['notification_type'], unique=False)
    op.create_index('ix_notifications_is_read', 'notifications', ['is_read'], unique=False)
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    op.drop_index('ix_notifications_created_at', table_name='notifications')
    op.drop_index('ix_notifications_is_read', table_name='notifications')
    op.drop_index('ix_notifications_notification_type', table_name='notifications')
    op.drop_index('ix_notifications_recipient_id', table_name='notifications')
    op.drop_index('ix_notifications_id', table_name='notifications')

    # Drop table
    op.drop_table('notifications')

    # Note: We don't drop the enum type as other tables may use it
    # and it's safe to leave it in the database
