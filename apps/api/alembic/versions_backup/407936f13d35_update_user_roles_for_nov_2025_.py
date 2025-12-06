"""Update user roles for Nov 2025 consultation

Revision ID: 407936f13d35
Revises: 1a2b3c4d5e6f
Create Date: 2025-11-05 21:14:57.719450

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "407936f13d35"
down_revision: Union[str, Sequence[str], None] = "1a2b3c4d5e6f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema for Nov 2025 role redefinition.

    This migration handles both fresh databases and existing databases:
    - Fresh DB: Column is already validator_area_id, enum already has new values
    - Existing DB: Renames governance_area_id and updates enum
    """
    connection = op.get_bind()

    # Check if this is a fresh database (validator_area_id already exists)
    result = connection.execute(
        sa.text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'users' AND column_name = 'validator_area_id'"
        )
    )
    is_fresh_db = result.fetchone() is not None

    if is_fresh_db:
        # Fresh database - nothing to do, schema is already correct
        return

    # --- Existing database migration below ---

    # Step 1: Validate no SUPERADMIN users exist (only for existing DBs)
    result = connection.execute(sa.text("SELECT COUNT(*) FROM users WHERE role = 'SUPERADMIN'"))
    superadmin_count = result.scalar()

    if superadmin_count > 0:
        raise Exception(
            f"Migration blocked: Found {superadmin_count} users with SUPERADMIN role. "
            "Please manually migrate these users to MLGOO_DILG role before running this migration."
        )

    # Step 2: Rename governance_area_id to validator_area_id
    op.alter_column("users", "governance_area_id", new_column_name="validator_area_id")

    # Step 3: Update PostgreSQL enum type to add new values
    # Check if ASSESSOR value exists, if not add it
    result = connection.execute(
        sa.text(
            "SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid "
            "WHERE t.typname = 'user_role_enum' AND e.enumlabel = 'ASSESSOR'"
        )
    )
    if not result.fetchone():
        connection.execute(sa.text("COMMIT"))
        connection.execute(sa.text("ALTER TYPE user_role_enum ADD VALUE 'ASSESSOR'"))

    # Check if VALIDATOR value exists, if not add it
    result = connection.execute(
        sa.text(
            "SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid "
            "WHERE t.typname = 'user_role_enum' AND e.enumlabel = 'VALIDATOR'"
        )
    )
    if not result.fetchone():
        connection.execute(sa.text("COMMIT"))
        connection.execute(sa.text("ALTER TYPE user_role_enum ADD VALUE 'VALIDATOR'"))

    # Step 4: Migrate existing AREA_ASSESSOR values to ASSESSOR
    op.execute("UPDATE users SET role = 'ASSESSOR' WHERE role = 'AREA_ASSESSOR'")

    # Step 5: Set validator_area_id to NULL for all users where role != VALIDATOR
    op.execute("UPDATE users SET validator_area_id = NULL WHERE role != 'VALIDATOR'")


def downgrade() -> None:
    """Downgrade schema (reverse the Nov 2025 role redefinition).

    Warning: This will convert VALIDATOR and ASSESSOR roles back to AREA_ASSESSOR.
    """

    # Step 1: Migrate ASSESSOR back to AREA_ASSESSOR and VALIDATOR back to AREA_ASSESSOR
    op.execute("UPDATE users SET role = 'AREA_ASSESSOR' WHERE role = 'ASSESSOR'")
    op.execute("UPDATE users SET role = 'AREA_ASSESSOR' WHERE role = 'VALIDATOR'")

    # Step 2: Rename validator_area_id back to governance_area_id
    op.alter_column("users", "validator_area_id", new_column_name="governance_area_id")

    # Note: We don't remove the 'ASSESSOR' and 'VALIDATOR' values from the PostgreSQL enum
    # as PostgreSQL doesn't support removing enum values without recreating the entire enum type.
