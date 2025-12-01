"""Initial database schema

Revision ID: 421de4cd5e1e
Revises:
Create Date: 2025-07-29 10:34:18.284880

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "421de4cd5e1e"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create base tables: governance_areas, barangays, users."""

    # Create governance_areas table first (referenced by users and indicators)
    op.create_table(
        "governance_areas",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("code", sa.String(length=10), nullable=False),
        sa.Column(
            "area_type",
            sa.Enum("Core", "Essential", name="area_type_enum", create_constraint=True),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_governance_areas_id"), "governance_areas", ["id"], unique=False)
    op.create_index(op.f("ix_governance_areas_code"), "governance_areas", ["code"], unique=False)

    # Create barangays table (referenced by users)
    op.create_table(
        "barangays",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_barangays_id"), "barangays", ["id"], unique=False)
    op.create_index(op.f("ix_barangays_name"), "barangays", ["name"], unique=False)

    # Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("phone_number", sa.String(), nullable=True),
        sa.Column(
            "role",
            sa.Enum(
                "MLGOO_DILG",
                "ASSESSOR",
                "VALIDATOR",
                "BLGU_USER",
                "KATUPARAN_CENTER_USER",
                name="user_role_enum",
                create_constraint=True,
            ),
            nullable=False,
        ),
        sa.Column("validator_area_id", sa.SmallInteger(), nullable=True),
        sa.Column("barangay_id", sa.Integer(), nullable=True),
        sa.Column("preferred_language", sa.String(length=3), nullable=False, server_default="ceb"),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_superuser", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["validator_area_id"], ["governance_areas.id"]),
        sa.ForeignKeyConstraint(["barangay_id"], ["barangays.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # Seed the 6 governance areas
    op.execute("""
        INSERT INTO governance_areas (name, code, area_type) VALUES
        ('Financial Administration', 'FI', 'Core'),
        ('Disaster Preparedness', 'DI', 'Core'),
        ('Safety, Peace and Order', 'SA', 'Core'),
        ('Social Protection', 'SO', 'Essential'),
        ('Business-Friendliness and Competitiveness', 'BU', 'Essential'),
        ('Environmental Management', 'EN', 'Essential')
    """)


def downgrade() -> None:
    """Drop base tables."""
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")

    op.drop_index(op.f("ix_barangays_name"), table_name="barangays")
    op.drop_index(op.f("ix_barangays_id"), table_name="barangays")
    op.drop_table("barangays")

    op.drop_index(op.f("ix_governance_areas_code"), table_name="governance_areas")
    op.drop_index(op.f("ix_governance_areas_id"), table_name="governance_areas")
    op.drop_table("governance_areas")

    # Drop enums
    op.execute("DROP TYPE IF EXISTS user_role_enum")
    op.execute("DROP TYPE IF EXISTS area_type_enum")
