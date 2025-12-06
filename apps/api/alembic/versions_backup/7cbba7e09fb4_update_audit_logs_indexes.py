"""update_audit_logs_indexes

Revision ID: 7cbba7e09fb4
Revises: cb6e47e7da7b
Create Date: 2025-11-06 11:28:40.255430

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7cbba7e09fb4"
down_revision: Union[str, Sequence[str], None] = "cb6e47e7da7b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - optimize audit_logs indexes."""
    # Drop old created_at index
    op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")

    # Drop old composite index (will be replaced by model's __table_args__)
    op.drop_index("ix_audit_logs_entity_type_entity_id", table_name="audit_logs")

    # Create descending index on created_at for efficient time-based queries
    op.create_index("ix_audit_logs_created_at_desc", "audit_logs", [sa.text("created_at DESC")])

    # Recreate composite index (now managed by model's __table_args__)
    op.create_index("ix_audit_logs_entity_lookup", "audit_logs", ["entity_type", "entity_id"])


def downgrade() -> None:
    """Downgrade schema - restore original indexes."""
    # Drop optimized indexes
    op.drop_index("ix_audit_logs_entity_lookup", table_name="audit_logs")
    op.drop_index("ix_audit_logs_created_at_desc", table_name="audit_logs")

    # Restore original indexes
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])
    op.create_index(
        "ix_audit_logs_entity_type_entity_id",
        "audit_logs",
        ["entity_type", "entity_id"],
    )
