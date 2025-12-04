"""add_performance_indexes

Revision ID: 0a7915c2b55b
Revises: ca5761be56b5
Create Date: 2025-12-04 17:45:59.469208

Performance optimization: Add indexes to frequently queried columns.
This migration addresses N+1 query issues and slow queries identified
in the performance audit.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0a7915c2b55b'
down_revision: Union[str, Sequence[str], None] = 'ca5761be56b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add performance indexes to frequently queried columns."""

    # ============================================
    # ASSESSMENTS TABLE INDEXES
    # ============================================

    # Index on status - used in almost every assessment query
    op.create_index(
        'idx_assessments_status',
        'assessments',
        ['status'],
        unique=False
    )

    # Index on submitted_at - used for date range queries in analytics
    op.create_index(
        'idx_assessments_submitted_at',
        'assessments',
        ['submitted_at'],
        unique=False
    )

    # Index on validated_at - used for validation date queries
    op.create_index(
        'idx_assessments_validated_at',
        'assessments',
        ['validated_at'],
        unique=False
    )

    # Index on rework_requested_at - used for rework file filtering
    op.create_index(
        'idx_assessments_rework_requested_at',
        'assessments',
        ['rework_requested_at'],
        unique=False
    )

    # Composite index on status + blgu_user_id - common filter pattern
    op.create_index(
        'idx_assessments_status_user',
        'assessments',
        ['status', 'blgu_user_id'],
        unique=False
    )

    # Composite index on status + submitted_at - analytics queries
    op.create_index(
        'idx_assessments_status_submitted',
        'assessments',
        ['status', 'submitted_at'],
        unique=False
    )

    # ============================================
    # ASSESSMENT_RESPONSES TABLE INDEXES
    # ============================================

    # Index on validation_status - filtered in analytics
    op.create_index(
        'idx_responses_validation_status',
        'assessment_responses',
        ['validation_status'],
        unique=False
    )

    # Index on requires_rework - filtered in rework workflows
    op.create_index(
        'idx_responses_requires_rework',
        'assessment_responses',
        ['requires_rework'],
        unique=False
    )

    # Composite index on assessment_id + validation_status
    op.create_index(
        'idx_responses_assessment_validation',
        'assessment_responses',
        ['assessment_id', 'validation_status'],
        unique=False
    )

    # Composite index on assessment_id + requires_rework
    op.create_index(
        'idx_responses_assessment_rework',
        'assessment_responses',
        ['assessment_id', 'requires_rework'],
        unique=False
    )

    # ============================================
    # INDICATORS TABLE INDEXES
    # ============================================

    # Index on is_active - filtered in queries
    op.create_index(
        'idx_indicators_is_active',
        'indicators',
        ['is_active'],
        unique=False
    )

    # Composite index on governance_area_id + sort_order - common ordering
    op.create_index(
        'idx_indicators_area_sort',
        'indicators',
        ['governance_area_id', 'sort_order'],
        unique=False
    )


def downgrade() -> None:
    """Remove performance indexes."""

    # Drop indicators indexes
    op.drop_index('idx_indicators_area_sort', table_name='indicators')
    op.drop_index('idx_indicators_is_active', table_name='indicators')

    # Drop assessment_responses indexes
    op.drop_index('idx_responses_assessment_rework', table_name='assessment_responses')
    op.drop_index('idx_responses_assessment_validation', table_name='assessment_responses')
    op.drop_index('idx_responses_requires_rework', table_name='assessment_responses')
    op.drop_index('idx_responses_validation_status', table_name='assessment_responses')

    # Drop assessments indexes
    op.drop_index('idx_assessments_status_submitted', table_name='assessments')
    op.drop_index('idx_assessments_status_user', table_name='assessments')
    op.drop_index('idx_assessments_rework_requested_at', table_name='assessments')
    op.drop_index('idx_assessments_validated_at', table_name='assessments')
    op.drop_index('idx_assessments_submitted_at', table_name='assessments')
    op.drop_index('idx_assessments_status', table_name='assessments')
