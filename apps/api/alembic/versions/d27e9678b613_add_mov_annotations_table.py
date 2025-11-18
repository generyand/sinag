"""add mov_annotations table

Revision ID: d27e9678b613
Revises: zx9conditional01
Create Date: 2025-11-18 23:49:24.758567

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd27e9678b613'
down_revision: Union[str, Sequence[str], None] = 'zx9conditional01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add mov_annotations table to store assessor annotations on MOV files.

    Supports both PDF text highlights and image rectangle annotations with comments.
    """
    op.create_table(
        'mov_annotations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('mov_file_id', sa.Integer(), nullable=False),
        sa.Column('assessor_id', sa.Integer(), nullable=False),
        sa.Column('annotation_type', sa.String(length=20), nullable=False),
        sa.Column('page', sa.Integer(), nullable=False),
        sa.Column('rect', sa.JSON(), nullable=False),
        sa.Column('rects', sa.JSON(), nullable=True),
        sa.Column('comment', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['assessor_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['mov_file_id'], ['mov_files.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_mov_annotations_assessor_id'), 'mov_annotations', ['assessor_id'], unique=False)
    op.create_index(op.f('ix_mov_annotations_id'), 'mov_annotations', ['id'], unique=False)
    op.create_index(op.f('ix_mov_annotations_mov_file_id'), 'mov_annotations', ['mov_file_id'], unique=False)


def downgrade() -> None:
    """Remove mov_annotations table."""
    op.drop_index(op.f('ix_mov_annotations_mov_file_id'), table_name='mov_annotations')
    op.drop_index(op.f('ix_mov_annotations_id'), table_name='mov_annotations')
    op.drop_index(op.f('ix_mov_annotations_assessor_id'), table_name='mov_annotations')
    op.drop_table('mov_annotations')
