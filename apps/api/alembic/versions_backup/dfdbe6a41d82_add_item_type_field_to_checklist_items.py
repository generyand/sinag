"""Add item_type field to checklist_items

Revision ID: dfdbe6a41d82
Revises: 339b5471cb65
Create Date: 2025-11-17 18:10:07.515029

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "dfdbe6a41d82"
down_revision: Union[str, Sequence[str], None] = "339b5471cb65"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Note: For fresh databases, many of these changes are already in place.
    This migration is primarily for existing databases that need updates.
    """
    conn = op.get_bind()

    # Check if item_type already exists (fresh database scenario)
    result = conn.execute(
        sa.text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'checklist_items' AND column_name = 'item_type'"
        )
    )
    if result.fetchone() is not None:
        # Fresh database - schema is already correct, skip this migration
        return

    # --- Existing database migration below ---

    # Drop index if it exists
    try:
        op.drop_index(op.f("idx_assessments_rework_requested_by"), table_name="assessments")
    except:
        pass

    op.add_column(
        "checklist_items",
        sa.Column("item_type", sa.String(length=30), server_default="checkbox", nullable=False),
    )
    op.alter_column(
        "checklist_items",
        "item_id",
        existing_type=sa.VARCHAR(length=50),
        type_=sa.String(length=20),
        comment=None,
        existing_comment='Unique item identifier (e.g., "1_1_1_a")',
        existing_nullable=False,
    )
    op.alter_column(
        "checklist_items",
        "label",
        existing_type=sa.TEXT(),
        type_=sa.String(),
        comment=None,
        existing_comment='Display text (e.g., "a. Barangay Financial Report")',
        existing_nullable=False,
    )
    op.alter_column(
        "checklist_items",
        "group_name",
        existing_type=sa.VARCHAR(length=255),
        type_=sa.String(length=100),
        comment=None,
        existing_comment='Group header (e.g., "ANNUAL REPORT")',
        existing_nullable=True,
    )
    op.alter_column(
        "checklist_items",
        "mov_description",
        existing_type=sa.TEXT(),
        type_=sa.String(),
        comment=None,
        existing_comment="Means of Verification description",
        existing_nullable=True,
    )
    op.alter_column(
        "checklist_items",
        "required",
        existing_type=sa.BOOLEAN(),
        comment=None,
        existing_comment="Required for indicator to pass",
        existing_nullable=False,
        existing_server_default=sa.text("true"),
    )
    op.alter_column(
        "checklist_items",
        "requires_document_count",
        existing_type=sa.BOOLEAN(),
        comment=None,
        existing_comment="Needs document count input",
        existing_nullable=False,
        existing_server_default=sa.text("false"),
    )
    op.alter_column(
        "checklist_items",
        "display_order",
        existing_type=sa.INTEGER(),
        comment=None,
        existing_comment="Sort order within indicator",
        existing_nullable=False,
        existing_server_default=sa.text("0"),
    )
    op.drop_index(op.f("idx_checklist_items_group"), table_name="checklist_items")
    op.drop_index(op.f("idx_checklist_items_indicator"), table_name="checklist_items")
    op.create_index(op.f("ix_checklist_items_id"), "checklist_items", ["id"], unique=False)
    op.create_index(
        op.f("ix_checklist_items_indicator_id"),
        "checklist_items",
        ["indicator_id"],
        unique=False,
    )
    op.alter_column(
        "indicator_drafts",
        "data",
        existing_type=postgresql.JSONB(astext_type=sa.Text()),
        type_=sa.JSON(),
        existing_nullable=False,
        existing_server_default=sa.text("'[]'::jsonb"),
    )
    op.drop_index(op.f("idx_indicator_drafts_governance_area"), table_name="indicator_drafts")
    op.drop_index(op.f("idx_indicator_drafts_user"), table_name="indicator_drafts")
    op.create_index(
        op.f("ix_indicator_drafts_governance_area_id"),
        "indicator_drafts",
        ["governance_area_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_indicator_drafts_user_id"),
        "indicator_drafts",
        ["user_id"],
        unique=False,
    )
    op.alter_column(
        "indicators",
        "mov_checklist_items",
        existing_type=postgresql.JSONB(astext_type=sa.Text()),
        type_=sa.JSON(),
        existing_nullable=True,
    )
    op.alter_column(
        "indicators",
        "validation_rule",
        existing_type=sa.VARCHAR(length=50),
        comment=None,
        existing_comment="Validation strategy",
        existing_nullable=False,
        existing_server_default=sa.text("'ALL_ITEMS_REQUIRED'::character varying"),
    )
    op.alter_column(
        "indicators",
        "is_bbi",
        existing_type=sa.BOOLEAN(),
        comment=None,
        existing_comment="Is this a BBI indicator",
        existing_nullable=False,
        existing_server_default=sa.text("false"),
    )
    op.alter_column(
        "indicators",
        "effective_date",
        existing_type=sa.DATE(),
        type_=sa.DateTime(),
        comment=None,
        existing_comment="When this version became active",
        existing_nullable=True,
    )
    op.alter_column(
        "indicators",
        "retired_date",
        existing_type=sa.DATE(),
        type_=sa.DateTime(),
        comment=None,
        existing_comment="When this version was retired",
        existing_nullable=True,
    )
    op.alter_column(
        "indicators_history",
        "mov_checklist_items",
        existing_type=postgresql.JSONB(astext_type=sa.Text()),
        type_=sa.JSON(),
        existing_nullable=True,
    )
    op.drop_index(op.f("idx_mov_files_assessment_id"), table_name="mov_files")
    op.drop_index(op.f("idx_mov_files_deleted_at"), table_name="mov_files")
    op.drop_index(op.f("idx_mov_files_indicator_id"), table_name="mov_files")
    op.drop_index(op.f("idx_mov_files_uploaded_by"), table_name="mov_files")
    op.create_index(
        op.f("ix_mov_files_assessment_id"), "mov_files", ["assessment_id"], unique=False
    )
    op.create_index(op.f("ix_mov_files_deleted_at"), "mov_files", ["deleted_at"], unique=False)
    op.create_index(op.f("ix_mov_files_id"), "mov_files", ["id"], unique=False)
    op.create_index(op.f("ix_mov_files_indicator_id"), "mov_files", ["indicator_id"], unique=False)
    op.create_index(op.f("ix_mov_files_uploaded_by"), "mov_files", ["uploaded_by"], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f("ix_mov_files_uploaded_by"), table_name="mov_files")
    op.drop_index(op.f("ix_mov_files_indicator_id"), table_name="mov_files")
    op.drop_index(op.f("ix_mov_files_id"), table_name="mov_files")
    op.drop_index(op.f("ix_mov_files_deleted_at"), table_name="mov_files")
    op.drop_index(op.f("ix_mov_files_assessment_id"), table_name="mov_files")
    op.create_index(op.f("idx_mov_files_uploaded_by"), "mov_files", ["uploaded_by"], unique=False)
    op.create_index(op.f("idx_mov_files_indicator_id"), "mov_files", ["indicator_id"], unique=False)
    op.create_index(op.f("idx_mov_files_deleted_at"), "mov_files", ["deleted_at"], unique=False)
    op.create_index(
        op.f("idx_mov_files_assessment_id"),
        "mov_files",
        ["assessment_id"],
        unique=False,
    )
    op.alter_column(
        "indicators_history",
        "mov_checklist_items",
        existing_type=sa.JSON(),
        type_=postgresql.JSONB(astext_type=sa.Text()),
        existing_nullable=True,
    )
    op.alter_column(
        "indicators",
        "retired_date",
        existing_type=sa.DateTime(),
        type_=sa.DATE(),
        comment="When this version was retired",
        existing_nullable=True,
    )
    op.alter_column(
        "indicators",
        "effective_date",
        existing_type=sa.DateTime(),
        type_=sa.DATE(),
        comment="When this version became active",
        existing_nullable=True,
    )
    op.alter_column(
        "indicators",
        "is_bbi",
        existing_type=sa.BOOLEAN(),
        comment="Is this a BBI indicator",
        existing_nullable=False,
        existing_server_default=sa.text("false"),
    )
    op.alter_column(
        "indicators",
        "validation_rule",
        existing_type=sa.VARCHAR(length=50),
        comment="Validation strategy",
        existing_nullable=False,
        existing_server_default=sa.text("'ALL_ITEMS_REQUIRED'::character varying"),
    )
    op.alter_column(
        "indicators",
        "mov_checklist_items",
        existing_type=sa.JSON(),
        type_=postgresql.JSONB(astext_type=sa.Text()),
        existing_nullable=True,
    )
    op.drop_index(op.f("ix_indicator_drafts_user_id"), table_name="indicator_drafts")
    op.drop_index(op.f("ix_indicator_drafts_governance_area_id"), table_name="indicator_drafts")
    op.create_index(
        op.f("idx_indicator_drafts_user"), "indicator_drafts", ["user_id"], unique=False
    )
    op.create_index(
        op.f("idx_indicator_drafts_governance_area"),
        "indicator_drafts",
        ["governance_area_id"],
        unique=False,
    )
    op.alter_column(
        "indicator_drafts",
        "data",
        existing_type=sa.JSON(),
        type_=postgresql.JSONB(astext_type=sa.Text()),
        existing_nullable=False,
        existing_server_default=sa.text("'[]'::jsonb"),
    )
    op.drop_index(op.f("ix_checklist_items_indicator_id"), table_name="checklist_items")
    op.drop_index(op.f("ix_checklist_items_id"), table_name="checklist_items")
    op.create_index(
        op.f("idx_checklist_items_indicator"),
        "checklist_items",
        ["indicator_id"],
        unique=False,
    )
    op.create_index(
        op.f("idx_checklist_items_group"),
        "checklist_items",
        ["group_name"],
        unique=False,
    )
    op.alter_column(
        "checklist_items",
        "display_order",
        existing_type=sa.INTEGER(),
        comment="Sort order within indicator",
        existing_nullable=False,
        existing_server_default=sa.text("0"),
    )
    op.alter_column(
        "checklist_items",
        "requires_document_count",
        existing_type=sa.BOOLEAN(),
        comment="Needs document count input",
        existing_nullable=False,
        existing_server_default=sa.text("false"),
    )
    op.alter_column(
        "checklist_items",
        "required",
        existing_type=sa.BOOLEAN(),
        comment="Required for indicator to pass",
        existing_nullable=False,
        existing_server_default=sa.text("true"),
    )
    op.alter_column(
        "checklist_items",
        "mov_description",
        existing_type=sa.String(),
        type_=sa.TEXT(),
        comment="Means of Verification description",
        existing_nullable=True,
    )
    op.alter_column(
        "checklist_items",
        "group_name",
        existing_type=sa.String(length=100),
        type_=sa.VARCHAR(length=255),
        comment='Group header (e.g., "ANNUAL REPORT")',
        existing_nullable=True,
    )
    op.alter_column(
        "checklist_items",
        "label",
        existing_type=sa.String(),
        type_=sa.TEXT(),
        comment='Display text (e.g., "a. Barangay Financial Report")',
        existing_nullable=False,
    )
    op.alter_column(
        "checklist_items",
        "item_id",
        existing_type=sa.String(length=20),
        type_=sa.VARCHAR(length=50),
        comment='Unique item identifier (e.g., "1_1_1_a")',
        existing_nullable=False,
    )
    op.drop_column("checklist_items", "item_type")
    op.create_index(
        op.f("idx_assessments_rework_requested_by"),
        "assessments",
        ["rework_requested_by"],
        unique=False,
    )
    # ### end Alembic commands ###
