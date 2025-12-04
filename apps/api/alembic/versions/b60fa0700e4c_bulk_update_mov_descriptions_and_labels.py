"""bulk_update_mov_descriptions_and_labels

Revision ID: b60fa0700e4c
Revises: e9e76b9d1ad7
Create Date: 2025-12-04 16:44:46.955012

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b60fa0700e4c'
down_revision: Union[str, Sequence[str], None] = 'e9e76b9d1ad7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - bulk update mov_descriptions and labels."""
    conn = op.get_bind()
    import json

    # 1. Update mov_descriptions to "Please supply the required information:" for date fields
    date_field_items = [
        '4_9_2_date_of_approval',
        '4_9_3_date_of_approval',
        '4_9_5_date_of_approval',
        '6_1_1_date',
        '6_3_1_date_of_approval',
        '1_4_1_date',
        '2_1_3_date',
        '3_1_2_date',
        '3_1_3_date',
        '3_1_4_date',
        '4_6_1_date',
    ]
    for item_id in date_field_items:
        conn.execute(sa.text("""
            UPDATE checklist_items
            SET mov_description = 'Please supply the required information:'
            WHERE item_id = :item_id
        """), {"item_id": item_id})

    # 2. Update mov_descriptions to "Please supply the number of documents submitted:" for count fields
    count_field_items = [
        '6_1_4_count',
        '3_1_8_count',
        '3_1_10_count',
        '4_4_2_count',
    ]
    for item_id in count_field_items:
        conn.execute(sa.text("""
            UPDATE checklist_items
            SET mov_description = 'Please supply the number of documents submitted:'
            WHERE item_id = :item_id
        """), {"item_id": item_id})

    # 3. Update 3.1.10 label
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET label = 'BADAC monthly minutes of the meeting with attendance sheets were submitted'
        WHERE item_id = '3_1_10_count'
    """))

    # 4. Change 4.6.1 date field to date_input type
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET item_type = 'date_input'
        WHERE item_id = '4_6_1_date'
    """))

    # 5. Add notes for 4.8.1 - BNC composition
    bnc_notes = {
        "title": "Minimum Composition of the BNC:",
        "items": [
            {"label": "1.", "text": "Barangay Captain (as chair)"},
            {"label": "2.", "text": "President of the Rural Improvement Club (RIC)"},
            {"label": "3.", "text": "President, Parent Teacher Child Association (PTCA)"},
            {"label": "4.", "text": "Head/President, local organization"},
            {"label": "5.", "text": "Sangguniang Members on Health"},
            {"label": "6.", "text": "SK Chairperson"},
            {"label": "7.", "text": "Barangay Nutrition Scholar (BNS)"},
            {"label": "8.", "text": "Day Care Worker"},
            {"label": "9.", "text": "Barangay Nutrition Action Association (BNAO)"},
            {"label": "10.", "text": "School Principal"},
            {"label": "11.", "text": "Agriculture Technicians"},
            {"label": "12.", "text": "Rural Health Midwife (RHM)"},
            {"label": "13.", "text": "Other as may be identified"}
        ]
    }
    bnc_notes_json = json.dumps(bnc_notes)
    conn.execute(sa.text(f"""
        UPDATE indicators
        SET form_schema = jsonb_set(
            COALESCE(form_schema::jsonb, '{{}}'::jsonb),
            '{{notes}}',
            '{bnc_notes_json}'::jsonb
        )::json
        WHERE indicator_code = '4.8.1'
    """))

    # 6. Add notes for 4.8.3 - Categories
    categories_notes = {
        "title": "Categories:",
        "items": [
            {"label": "1.", "text": "Underweight and Severe Underweight"},
            {"label": "2.", "text": "Stunting and Severe Stunting; and"},
            {"label": "3.", "text": "Moderate Wasting and Severe Wasting"}
        ]
    }
    categories_notes_json = json.dumps(categories_notes)
    conn.execute(sa.text(f"""
        UPDATE indicators
        SET form_schema = jsonb_set(
            COALESCE(form_schema::jsonb, '{{}}'::jsonb),
            '{{notes}}',
            '{categories_notes_json}'::jsonb
        )::json
        WHERE indicator_code = '4.8.3'
    """))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    # Revert mov_descriptions for date fields
    date_field_items = [
        '4_9_2_date_of_approval',
        '4_9_3_date_of_approval',
        '4_9_5_date_of_approval',
        '6_1_1_date',
        '6_3_1_date_of_approval',
        '1_4_1_date',
        '2_1_3_date',
        '3_1_2_date',
        '3_1_3_date',
        '3_1_4_date',
        '4_6_1_date',
    ]
    for item_id in date_field_items:
        conn.execute(sa.text("""
            UPDATE checklist_items
            SET mov_description = NULL
            WHERE item_id = :item_id
        """), {"item_id": item_id})

    # Revert mov_descriptions for count fields
    count_field_items = [
        '6_1_4_count',
        '3_1_8_count',
        '3_1_10_count',
        '4_4_2_count',
    ]
    for item_id in count_field_items:
        conn.execute(sa.text("""
            UPDATE checklist_items
            SET mov_description = NULL
            WHERE item_id = :item_id
        """), {"item_id": item_id})

    # Revert 3.1.10 label
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET label = 'Number of BADAC monthly minutes submitted'
        WHERE item_id = '3_1_10_count'
    """))

    # Revert 4.6.1 date field type
    conn.execute(sa.text("""
        UPDATE checklist_items
        SET item_type = 'checkbox'
        WHERE item_id = '4_6_1_date'
    """))

    # Remove notes from 4.8.1 and 4.8.3
    conn.execute(sa.text("""
        UPDATE indicators
        SET form_schema = (form_schema::jsonb - 'notes')::json
        WHERE indicator_code IN ('4.8.1', '4.8.3')
    """))
