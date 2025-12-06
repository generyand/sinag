"""create mov_files table

Revision ID: 5562d6674781
Revises: c0ef832297f3
Create Date: 2025-11-08 20:21:20.625634

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5562d6674781"
down_revision: Union[str, Sequence[str], None] = "c0ef832297f3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Create mov_files table for tracking uploaded MOV files."""
    # Create mov_files table
    op.create_table(
        "mov_files",
        # Primary key (using Integer instead of UUID for consistency with other tables)
        sa.Column("id", sa.Integer(), nullable=False),
        # Foreign keys
        sa.Column("assessment_id", sa.Integer(), nullable=False),
        sa.Column("indicator_id", sa.Integer(), nullable=False),
        sa.Column(
            "uploaded_by", sa.Integer(), nullable=True
        ),  # Nullable to support SET NULL on user deletion
        # File metadata
        sa.Column("file_name", sa.String(), nullable=False),
        sa.Column("file_url", sa.String(), nullable=False),
        sa.Column("file_type", sa.String(length=50), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),  # Size in bytes
        # Timestamps
        sa.Column(
            "uploaded_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),  # For soft delete
        # Primary key constraint
        sa.PrimaryKeyConstraint("id", name="pk_mov_files"),
        # Foreign key constraints with explicit names
        sa.ForeignKeyConstraint(
            ["assessment_id"],
            ["assessments.id"],
            name="fk_mov_files_assessment_id",
            ondelete="CASCADE",  # Delete files when assessment is deleted
        ),
        sa.ForeignKeyConstraint(
            ["indicator_id"],
            ["indicators.id"],
            name="fk_mov_files_indicator_id",
            ondelete="CASCADE",  # Delete files when indicator is deleted
        ),
        sa.ForeignKeyConstraint(
            ["uploaded_by"],
            ["users.id"],
            name="fk_mov_files_uploaded_by",
            ondelete="SET NULL",  # Keep file record but clear uploader reference
        ),
    )

    # Create indexes for query performance
    op.create_index("idx_mov_files_assessment_id", "mov_files", ["assessment_id"], unique=False)
    op.create_index("idx_mov_files_indicator_id", "mov_files", ["indicator_id"], unique=False)
    op.create_index("idx_mov_files_uploaded_by", "mov_files", ["uploaded_by"], unique=False)
    # Index for soft delete queries (finding non-deleted files)
    op.create_index("idx_mov_files_deleted_at", "mov_files", ["deleted_at"], unique=False)


def downgrade() -> None:
    """Downgrade schema - Drop mov_files table and related indexes."""
    # Drop indexes first
    op.drop_index("idx_mov_files_deleted_at", table_name="mov_files")
    op.drop_index("idx_mov_files_uploaded_by", table_name="mov_files")
    op.drop_index("idx_mov_files_indicator_id", table_name="mov_files")
    op.drop_index("idx_mov_files_assessment_id", table_name="mov_files")

    # Drop table (foreign keys are dropped automatically)
    op.drop_table("mov_files")
