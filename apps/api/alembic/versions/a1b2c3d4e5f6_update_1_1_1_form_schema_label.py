"""update_1_1_1_form_schema_label

Revision ID: a1b2c3d4e5f6
Revises: 8b2e4f1a9c3d
Create Date: 2025-12-05 16:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '8b2e4f1a9c3d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


NEW_LABEL = "Three (3) BFDP Monitoring Form A of the DILG Advisory covering the 1st to 3rd quarter monitoring data signed by the City Director/C/MLGOO, Punong Barangay and Barangay Secretary"
OLD_LABEL = "Two (2) Photo Documentation of the BFDP board showing the name of the barangay"


def upgrade() -> None:
    """Upgrade schema - update first upload field label in 1.1.1 form_schema."""
    conn = op.get_bind()

    # Update the first field's label and description in the form_schema JSON
    conn.execute(sa.text(f"""
        UPDATE indicators
        SET form_schema = jsonb_set(
            jsonb_set(
                form_schema::jsonb,
                '{{fields,0,label}}',
                '"{NEW_LABEL}"'::jsonb
            ),
            '{{fields,0,description}}',
            '"{NEW_LABEL}"'::jsonb
        )
        WHERE indicator_code = '1.1.1'
    """))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    conn.execute(sa.text(f"""
        UPDATE indicators
        SET form_schema = jsonb_set(
            jsonb_set(
                form_schema::jsonb,
                '{{fields,0,label}}',
                '"{OLD_LABEL}"'::jsonb
            ),
            '{{fields,0,description}}',
            '"{OLD_LABEL}"'::jsonb
        )
        WHERE indicator_code = '1.1.1'
    """))
