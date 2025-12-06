"""populate_indicator_initial_versions

Revision ID: 64a5bb7d4b4d
Revises: 04567af303c9
Create Date: 2025-11-06 13:20:31.644314

Data migration to populate indicators_history with initial version snapshots.
This ensures existing indicators have version 1 archived for historical reference.
"""

from typing import Sequence, Union
from datetime import datetime

from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = "64a5bb7d4b4d"
down_revision: Union[str, Sequence[str], None] = "04567af303c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Populate indicators_history with version 1 snapshots.

    Creates a historical record for all existing indicators by:
    1. Copying current indicator state to indicators_history
    2. Setting version to 1 (current version after previous migration)
    3. Recording migration timestamp
    4. Setting archived_by to NULL (migration-created record)

    This migration is idempotent - it checks for existing records before inserting.
    """
    connection = op.get_bind()

    # Get current timestamp for archived_at
    migration_timestamp = datetime.utcnow()

    # Use raw SQL for data migration (more reliable than ORM for migrations)
    # Insert version 1 snapshot for each indicator into indicators_history
    # Only insert if not already exists (idempotent)
    connection.execute(
        text("""
        INSERT INTO indicators_history (
            indicator_id,
            version,
            name,
            description,
            is_active,
            is_auto_calculable,
            is_profiling_only,
            form_schema,
            calculation_schema,
            remark_schema,
            technical_notes_text,
            governance_area_id,
            parent_id,
            archived_at,
            archived_by
        )
        SELECT
            id AS indicator_id,
            1 AS version,  -- Version 1 (from previous migration)
            name,
            description,
            is_active,
            is_auto_calculable,
            is_profiling_only,
            form_schema,
            calculation_schema,
            remark_schema,
            technical_notes_text,
            governance_area_id,
            parent_id,
            :migration_timestamp AS archived_at,
            NULL AS archived_by  -- NULL indicates migration-created
        FROM indicators
        WHERE NOT EXISTS (
            SELECT 1
            FROM indicators_history
            WHERE indicators_history.indicator_id = indicators.id
            AND indicators_history.version = 1
        );
    """),
        {"migration_timestamp": migration_timestamp},
    )

    # Commit is handled automatically by Alembic


def downgrade() -> None:
    """Remove version 1 snapshots created by this migration.

    Deletes all indicators_history records where:
    - version = 1
    - archived_by is NULL (migration-created)

    This only removes records created by this migration, preserving any
    manually created version 1 archives.
    """
    connection = op.get_bind()

    # Delete version 1 records that were created by migration (archived_by is NULL)
    connection.execute(
        text("""
        DELETE FROM indicators_history
        WHERE version = 1
        AND archived_by IS NULL;
    """)
    )
