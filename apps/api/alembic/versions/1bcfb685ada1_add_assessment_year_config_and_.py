"""add_assessment_year_config_and_indicator_snapshots

Revision ID: 1bcfb685ada1
Revises: 8b29bcf2785e
Create Date: 2025-12-06 21:02:10.175604

This migration adds:
1. assessment_year_configs table - For managing assessment year configurations
2. assessment_indicator_snapshots table - For preserving indicator definitions at submission time
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1bcfb685ada1'
down_revision: Union[str, Sequence[str], None] = '8b29bcf2785e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create assessment_year_configs table
    op.create_table('assessment_year_configs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('current_assessment_year', sa.Integer(), nullable=False),
        sa.Column('assessment_period_start', sa.DateTime(), nullable=False),
        sa.Column('assessment_period_end', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('activated_at', sa.DateTime(), nullable=True),
        sa.Column('activated_by_id', sa.Integer(), nullable=True),
        sa.Column('deactivated_at', sa.DateTime(), nullable=True),
        sa.Column('deactivated_by_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['activated_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['deactivated_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_assessment_year_configs_current_assessment_year'), 'assessment_year_configs', ['current_assessment_year'], unique=False)
    op.create_index(op.f('ix_assessment_year_configs_id'), 'assessment_year_configs', ['id'], unique=False)
    op.create_index(op.f('ix_assessment_year_configs_is_active'), 'assessment_year_configs', ['is_active'], unique=False)

    # Create assessment_indicator_snapshots table
    op.create_table('assessment_indicator_snapshots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('assessment_id', sa.Integer(), nullable=False),
        sa.Column('indicator_id', sa.Integer(), nullable=False),
        sa.Column('indicator_version', sa.Integer(), nullable=False),
        sa.Column('assessment_year', sa.Integer(), nullable=False),
        sa.Column('indicator_code', sa.String(length=50), nullable=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_auto_calculable', sa.Boolean(), nullable=False),
        sa.Column('is_profiling_only', sa.Boolean(), nullable=False),
        sa.Column('is_bbi', sa.Boolean(), nullable=False),
        sa.Column('validation_rule', sa.String(length=50), nullable=False),
        sa.Column('form_schema_resolved', sa.JSON(), nullable=True),
        sa.Column('calculation_schema_resolved', sa.JSON(), nullable=True),
        sa.Column('remark_schema_resolved', sa.JSON(), nullable=True),
        sa.Column('technical_notes_resolved', sa.Text(), nullable=True),
        sa.Column('checklist_items_resolved', sa.JSON(), nullable=True),
        sa.Column('governance_area_id', sa.Integer(), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['indicator_id'], ['indicators.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_assessment_indicator_snapshots_assessment_id'), 'assessment_indicator_snapshots', ['assessment_id'], unique=False)
    op.create_index(op.f('ix_assessment_indicator_snapshots_id'), 'assessment_indicator_snapshots', ['id'], unique=False)
    op.create_index(op.f('ix_assessment_indicator_snapshots_indicator_id'), 'assessment_indicator_snapshots', ['indicator_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop assessment_indicator_snapshots table
    op.drop_index(op.f('ix_assessment_indicator_snapshots_indicator_id'), table_name='assessment_indicator_snapshots')
    op.drop_index(op.f('ix_assessment_indicator_snapshots_id'), table_name='assessment_indicator_snapshots')
    op.drop_index(op.f('ix_assessment_indicator_snapshots_assessment_id'), table_name='assessment_indicator_snapshots')
    op.drop_table('assessment_indicator_snapshots')

    # Drop assessment_year_configs table
    op.drop_index(op.f('ix_assessment_year_configs_is_active'), table_name='assessment_year_configs')
    op.drop_index(op.f('ix_assessment_year_configs_id'), table_name='assessment_year_configs')
    op.drop_index(op.f('ix_assessment_year_configs_current_assessment_year'), table_name='assessment_year_configs')
    op.drop_table('assessment_year_configs')
