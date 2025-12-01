"""add_checklist_items_table_for_hard_coded_indicators

Revision ID: 00bed49217f7
Revises: 5eb97575cacc
Create Date: 2025-11-16 10:41:55.270370

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '00bed49217f7'
down_revision: Union[str, Sequence[str], None] = '5eb97575cacc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Upgrade schema for hard-coded indicators.

    Creates:
    1. checklist_items table for normalized checklist storage
    2. New indicator metadata fields (validation_rule, is_bbi, effective_date, retired_date)
    """
    # 1. Create checklist_items table
    op.create_table(
        'checklist_items',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('indicator_id', sa.Integer(), sa.ForeignKey('indicators.id', ondelete='CASCADE'), nullable=False),
        sa.Column('item_id', sa.String(50), nullable=False, comment='Unique item identifier (e.g., "1_1_1_a")'),
        sa.Column('label', sa.Text(), nullable=False, comment='Display text (e.g., "a. Barangay Financial Report")'),
        sa.Column('item_type', sa.String(30), nullable=False, server_default='checkbox', comment='Item type: checkbox, info_text, etc.'),
        sa.Column('group_name', sa.String(255), nullable=True, comment='Group header (e.g., "ANNUAL REPORT")'),
        sa.Column('mov_description', sa.Text(), nullable=True, comment='Means of Verification description'),
        sa.Column('required', sa.Boolean(), nullable=False, server_default='true', comment='Required for indicator to pass'),
        sa.Column('requires_document_count', sa.Boolean(), nullable=False, server_default='false', comment='Needs document count input'),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0', comment='Sort order within indicator'),
        sa.Column('option_group', sa.String(50), nullable=True, comment='Option group for OR logic'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('indicator_id', 'item_id', name='uq_indicator_item_id')
    )

    # Create indexes for performance
    op.create_index('idx_checklist_items_indicator', 'checklist_items', ['indicator_id'])
    op.create_index('idx_checklist_items_group', 'checklist_items', ['group_name'])

    # 2. Add new fields to indicators table
    op.add_column('indicators', sa.Column('validation_rule', sa.String(50), nullable=False, server_default='ALL_ITEMS_REQUIRED', comment='Validation strategy'))
    op.add_column('indicators', sa.Column('is_bbi', sa.Boolean(), nullable=False, server_default='false', comment='Is this a BBI indicator'))
    op.add_column('indicators', sa.Column('effective_date', sa.Date(), nullable=True, comment='When this version became active'))
    op.add_column('indicators', sa.Column('retired_date', sa.Date(), nullable=True, comment='When this version was retired'))

    # 3. Set validation_rule to 'ALL_ITEMS_REQUIRED' for all existing indicators
    op.execute("UPDATE indicators SET validation_rule = 'ALL_ITEMS_REQUIRED' WHERE validation_rule IS NULL")


def downgrade() -> None:
    """Downgrade schema."""
    # Remove new indicator fields
    op.drop_column('indicators', 'retired_date')
    op.drop_column('indicators', 'effective_date')
    op.drop_column('indicators', 'is_bbi')
    op.drop_column('indicators', 'validation_rule')

    # Drop indexes
    op.drop_index('idx_checklist_items_group', table_name='checklist_items')
    op.drop_index('idx_checklist_items_indicator', table_name='checklist_items')

    # Drop table
    op.drop_table('checklist_items')
