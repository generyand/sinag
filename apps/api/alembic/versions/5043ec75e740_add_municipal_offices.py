"""add_municipal_offices

Revision ID: 5043ec75e740
Revises: b7be4a4ab75e
Create Date: 2026-01-04 14:10:10.502160

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5043ec75e740"
down_revision: Union[str, Sequence[str], None] = "b7be4a4ab75e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create municipal_offices table."""
    op.create_table(
        "municipal_offices",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("abbreviation", sa.String(length=20), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("contact_person", sa.String(length=100), nullable=True),
        sa.Column("contact_number", sa.String(length=20), nullable=True),
        sa.Column("contact_email", sa.String(length=100), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("governance_area_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("updated_by_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["governance_area_id"],
            ["governance_areas.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_by_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "governance_area_id", "abbreviation", name="uq_municipal_office_area_abbr"
        ),
    )
    op.create_index(
        op.f("ix_municipal_offices_governance_area_id"),
        "municipal_offices",
        ["governance_area_id"],
        unique=False,
    )
    op.create_index(op.f("ix_municipal_offices_id"), "municipal_offices", ["id"], unique=False)


def downgrade() -> None:
    """Drop municipal_offices table."""
    op.drop_index(op.f("ix_municipal_offices_id"), table_name="municipal_offices")
    op.drop_index(op.f("ix_municipal_offices_governance_area_id"), table_name="municipal_offices")
    op.drop_table("municipal_offices")
