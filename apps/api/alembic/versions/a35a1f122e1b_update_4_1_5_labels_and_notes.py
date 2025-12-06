"""update_4_1_5_labels_and_notes

Revision ID: a35a1f122e1b
Revises: a2dfa88eb5d5
Create Date: 2025-12-04 16:27:37.431945

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a35a1f122e1b"
down_revision: Union[str, Sequence[str], None] = "a2dfa88eb5d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - update 4.1.5 labels and add notes."""
    conn = op.get_bind()

    # Update 4_1_5_total_cases - change label and mov_description
    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET label = 'Total number of VAW cases received',
            mov_description = 'Please supply the number of documents submitted:'
        WHERE item_id = '4_1_5_total_cases'
    """)
    )

    # Update 4_1_5_ra_9262 - change label and remove mov_description
    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET label = 'Number of cases documented for violating RA 9262',
            mov_description = NULL
        WHERE item_id = '4_1_5_ra_9262'
    """)
    )

    # Update 4_1_5_other_laws - change label and remove mov_description
    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET label = 'Number of cases documented for violating other VAW-related laws',
            mov_description = NULL
        WHERE item_id = '4_1_5_other_laws'
    """)
    )

    # Update 4_1_5_assistance - change label and remove mov_description
    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET label = 'Assistance provided to victim-survivors',
            mov_description = NULL
        WHERE item_id = '4_1_5_assistance'
    """)
    )

    # Update indicator 4.1.5 form_schema with notes
    import json

    notes = {
        "title": "Minimum Information:",
        "items": [
            {"label": "a.", "text": "Total number of VAW cases received"},
            {
                "label": "",
                "text": "i. Number of cases documented for violating RA 9262",
            },
            {
                "label": "",
                "text": "ii. Number of cases documented for violating other VAW-related laws",
            },
            {"label": "b.", "text": "Assistance provided to victim-survivors"},
        ],
    }
    notes_json = json.dumps(notes)
    conn.execute(
        sa.text(f"""
        UPDATE indicators
        SET form_schema = jsonb_set(
            COALESCE(form_schema::jsonb, '{{}}'::jsonb),
            '{{notes}}',
            '{notes_json}'::jsonb
        )::json
        WHERE indicator_code = '4.1.5'
    """)
    )


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET label = 'Please supply the number of documents submitted:
Total number of VAW cases received',
            mov_description = 'Input field for total number of VAW cases received'
        WHERE item_id = '4_1_5_total_cases'
    """)
    )

    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET label = 'Total number of cases documented for violating RA 9262',
            mov_description = 'Input field for total number of cases documented for violating RA 9262'
        WHERE item_id = '4_1_5_ra_9262'
    """)
    )

    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET label = 'Total number of cases documented for violating other VAW-related laws',
            mov_description = 'Input field for total number of cases documented for violating other VAW-related laws'
        WHERE item_id = '4_1_5_other_laws'
    """)
    )

    conn.execute(
        sa.text("""
        UPDATE checklist_items
        SET label = 'Total number of assistance provided to victim-survivors',
            mov_description = 'Input field for total number of assistance provided to victim-survivors'
        WHERE item_id = '4_1_5_assistance'
    """)
    )

    # Remove notes from form_schema
    conn.execute(
        sa.text("""
        UPDATE indicators
        SET form_schema = form_schema - 'notes'
        WHERE indicator_code = '4.1.5'
    """)
    )
