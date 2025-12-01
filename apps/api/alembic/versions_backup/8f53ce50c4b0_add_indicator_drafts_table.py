"""add_indicator_drafts_table

Revision ID: 8f53ce50c4b0
Revises: c0ef832297f3
Create Date: 2025-11-09 15:24:26.930788

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f53ce50c4b0'
down_revision: Union[str, Sequence[str], None] = 'c0ef832297f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create indicator_drafts table
    op.create_table(
        'indicator_drafts',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('governance_area_id', sa.Integer(), nullable=False),
        sa.Column('creation_mode', sa.String(length=50), nullable=False),
        sa.Column('current_step', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.Column('status', sa.String(length=50), server_default=sa.text("'in_progress'"), nullable=False),
        sa.Column('data', sa.dialects.postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('last_accessed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('version', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.Column('lock_token', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('locked_by_user_id', sa.Integer(), nullable=True),
        sa.Column('locked_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['governance_area_id'], ['governance_areas.id'], ),
        sa.ForeignKeyConstraint(['locked_by_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('idx_indicator_drafts_user', 'indicator_drafts', ['user_id'], unique=False)
    op.create_index('idx_indicator_drafts_governance_area', 'indicator_drafts', ['governance_area_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    op.drop_index('idx_indicator_drafts_governance_area', table_name='indicator_drafts')
    op.drop_index('idx_indicator_drafts_user', table_name='indicator_drafts')

    # Drop table
    op.drop_table('indicator_drafts')
