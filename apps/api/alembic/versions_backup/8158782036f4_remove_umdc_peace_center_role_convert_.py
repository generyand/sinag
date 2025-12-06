"""remove_umdc_peace_center_role_convert_to_katuparan

This migration converts any existing UMDC_PEACE_CENTER_USER users to KATUPARAN_CENTER_USER
since UMDC Peace Center is now consolidated under Katuparan Center.

Revision ID: 8158782036f4
Revises: 9512065761d8
Create Date: 2025-11-28 00:09:41.750043

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "8158782036f4"
down_revision: Union[str, Sequence[str], None] = "9512065761d8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Convert all UMDC_PEACE_CENTER_USER users to KATUPARAN_CENTER_USER.

    This is a data migration that consolidates UMDC Peace Center users
    under the Katuparan Center role since UMDC is part of Katuparan Center.
    """
    # Update any existing UMDC_PEACE_CENTER_USER users to KATUPARAN_CENTER_USER
    op.execute(
        """
        UPDATE users
        SET role = 'KATUPARAN_CENTER_USER'
        WHERE role = 'UMDC_PEACE_CENTER_USER'
        """
    )


def downgrade() -> None:
    """
    Downgrade is not fully reversible since we don't know which users
    were originally UMDC_PEACE_CENTER_USER. This is intentional as the
    consolidation is a business decision.

    Note: If you need to restore UMDC users, you would need to manually
    identify them from audit logs or other records.
    """
    pass
