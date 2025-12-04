"""add_field_notes_to_checklist_items

Revision ID: 272952e50349
Revises: 593ff4320a55
Create Date: 2025-12-04 17:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = '272952e50349'
down_revision: Union[str, Sequence[str], None] = '593ff4320a55'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add field_notes column to checklist_items table."""
    op.add_column('checklist_items', sa.Column('field_notes', JSONB, nullable=True))

    # Add field_notes to 3_1_8_a (Three Transmittals of CIR)
    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET field_notes = '{"title": "Note:", "items": [{"text": "The CIR contains data protected by the Data Privacy Act of 2012. Hence, we recommend submitting only the transmittal."}]}'::jsonb
        WHERE item_id = '3_1_8_a'
    """))


def downgrade() -> None:
    """Remove field_notes column from checklist_items table."""
    op.drop_column('checklist_items', 'field_notes')
