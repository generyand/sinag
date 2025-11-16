"""generate_form_schemas_for_hardcoded_indicators

Generate BLGU file upload form_schema for all hardcoded sub-indicators using upload_instructions.

For hardcoded SGLGB sub-indicators (1.1.1, 1.1.2, etc.), this migration creates
a file upload form based on the MOVs (Means of Verification) defined in upload_instructions.

IMPORTANT DISTINCTION:
- MOVs (upload_instructions): What BLGUs UPLOAD (e.g., "BFDP Form + 2 photos")
- Checklist items: What VALIDATORS CHECK in those uploaded files (e.g., a, b, c, d...)

Example for 1.1.1:
- BLGU uploads: 2 types of files (BFDP form + photos)
- Validator checks: 7 items (a-g) visible in those uploaded files

Revision ID: 03be4cf96073
Revises: c0d0ff841142
Create Date: 2025-11-16 19:44:45.058611

"""
from typing import Sequence, Union
import json
import sys
from pathlib import Path

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# Add app directory to path so we can import indicators
app_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(app_dir))

from app.indicators.definitions import indicator_1_1, indicator_1_2, indicator_1_3, indicator_1_4, indicator_1_5, indicator_1_6, indicator_1_7
from app.indicators.definitions import indicator_2_1, indicator_2_2, indicator_2_3
from app.indicators.definitions import indicator_3_1, indicator_3_2, indicator_3_3, indicator_3_4, indicator_3_5, indicator_3_6
from app.indicators.definitions import indicator_4_1, indicator_4_2, indicator_4_3, indicator_4_4, indicator_4_5, indicator_4_6, indicator_4_7, indicator_4_8, indicator_4_9
from app.indicators.definitions import indicator_5_1, indicator_5_2, indicator_5_3
from app.indicators.definitions import indicator_6_1, indicator_6_2, indicator_6_3

# revision identifiers, used by Alembic.
revision: str = '03be4cf96073'
down_revision: Union[str, Sequence[str], None] = 'c0d0ff841142'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Collect all indicators from the definitions
ALL_INDICATORS = [
    indicator_1_1.INDICATOR_1_1,
    indicator_1_2.INDICATOR_1_2,
    indicator_1_3.INDICATOR_1_3,
    indicator_1_4.INDICATOR_1_4,
    indicator_1_5.INDICATOR_1_5,
    indicator_1_6.INDICATOR_1_6,
    indicator_1_7.INDICATOR_1_7,
    indicator_2_1.INDICATOR_2_1,
    indicator_2_2.INDICATOR_2_2,
    indicator_2_3.INDICATOR_2_3,
    indicator_3_1.INDICATOR_3_1,
    indicator_3_2.INDICATOR_3_2,
    indicator_3_3.INDICATOR_3_3,
    indicator_3_4.INDICATOR_3_4,
    indicator_3_5.INDICATOR_3_5,
    indicator_3_6.INDICATOR_3_6,
    indicator_4_1.INDICATOR_4_1,
    indicator_4_2.INDICATOR_4_2,
    indicator_4_3.INDICATOR_4_3,
    indicator_4_4.INDICATOR_4_4,
    indicator_4_5.INDICATOR_4_5,
    indicator_4_6.INDICATOR_4_6,
    indicator_4_7.INDICATOR_4_7,
    indicator_4_8.INDICATOR_4_8,
    indicator_4_9.INDICATOR_4_9,
    indicator_5_1.INDICATOR_5_1,
    indicator_5_2.INDICATOR_5_2,
    indicator_5_3.INDICATOR_5_3,
    indicator_6_1.INDICATOR_6_1,
    indicator_6_2.INDICATOR_6_2,
    indicator_6_3.INDICATOR_6_3,
]


def upgrade() -> None:
    """Generate form_schema from upload_instructions in indicator definitions."""
    conn = op.get_bind()

    # Build a mapping of indicator_code -> upload_instructions from Python definitions
    instructions_map = {}
    for parent_indicator in ALL_INDICATORS:
        if hasattr(parent_indicator, 'children'):
            for sub_indicator in parent_indicator.children:
                if hasattr(sub_indicator, 'upload_instructions'):
                    instructions_map[sub_indicator.code] = sub_indicator.upload_instructions

    print(f"📝 Generating BLGU file upload forms for hardcoded sub-indicators...")
    print(f"   Using upload_instructions (MOVs) from Python definitions")
    print(f"   Found {len(instructions_map)} sub-indicators with upload_instructions\n")

    # Get all indicators from database that have checklist items
    indicators_query = text("""
        SELECT DISTINCT i.id, i.name, i.indicator_code, i.description
        FROM indicators i
        INNER JOIN checklist_items ci ON ci.indicator_id = i.id
        WHERE i.form_schema IS NULL
           OR i.form_schema::text = '{}'
           OR i.form_schema::text = 'null'
           OR NOT EXISTS (
                SELECT 1 FROM json_each(i.form_schema::json)
                WHERE key = 'fields'
           )
        ORDER BY i.id
    """)

    indicators = conn.execute(indicators_query).fetchall()
    updated_count = 0

    for indicator in indicators:
        indicator_id = indicator[0]
        indicator_name = indicator[1]
        indicator_code = indicator[2]
        indicator_description = indicator[3]

        # Get upload_instructions from the Python definitions
        upload_instructions = instructions_map.get(indicator_code)

        if not upload_instructions:
            print(f"  ⚠️  {indicator_code}: No upload_instructions found, skipping")
            continue

        # Parse upload_instructions to create separate upload fields
        # upload_instructions is a multi-line string like:
        # "Upload the following documents:\n1. BFDP Form...\n2. Two photos..."

        # Split by numbered items (1. 2. 3. etc.)
        import re
        lines = upload_instructions.split('\n')

        # Find lines that start with numbers (1. 2. 3. etc.)
        numbered_items = []
        current_item = None
        current_text = []

        for line in lines:
            # Check if line starts with a number followed by a period (e.g., "1. ", "2. ")
            match = re.match(r'^(\d+)\.\s+(.+)$', line.strip())
            if match:
                # Save previous item if exists
                if current_item is not None:
                    numbered_items.append({
                        'number': current_item,
                        'text': '\n'.join(current_text)
                    })
                # Start new item
                current_item = match.group(1)
                current_text = [match.group(2)]
            elif current_item is not None and line.strip():
                # Continuation of current item (indented lines)
                current_text.append(line.strip())

        # Add the last item
        if current_item is not None:
            numbered_items.append({
                'number': current_item,
                'text': '\n'.join(current_text)
            })

        # Create upload fields
        fields = []

        if numbered_items:
            # Multiple numbered MOVs - create separate upload field for each
            for idx, item in enumerate(numbered_items):
                field = {
                    "field_id": f"upload_{indicator_code}_{item['number']}",
                    "field_type": "file_upload",
                    "label": f"MOV {item['number']}: Upload for {indicator_code}",
                    "required": True,
                    "help_text": item['text'],  # The specific MOV description
                    "accept": ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.xls",
                    "max_size_mb": 50,
                    "multiple": True
                }
                fields.append(field)
        else:
            # No numbered items found - create single field with full instructions
            field = {
                "field_id": f"upload_{indicator_code}",
                "field_type": "file_upload",
                "label": f"Upload Documents for {indicator_code}",
                "required": True,
                "help_text": upload_instructions,
                "accept": ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.xls",
                "max_size_mb": 50,
                "multiple": True
            }
            fields.append(field)

        # Create the form_schema structure
        form_schema = {
            "fields": fields,
            "version": "2.0",
            "schema_type": "blgu_upload"
        }

        # Update the indicator with the generated form_schema
        form_schema_json = json.dumps(form_schema).replace("'", "''")  # Escape single quotes
        update_sql = f"""
            UPDATE indicators
            SET form_schema = '{form_schema_json}'::json
            WHERE id = {indicator_id}
        """
        conn.execute(text(update_sql))

        print(f"  ✅ {indicator_code}: {indicator_name}")
        print(f"      → {len(fields)} upload field(s) created")
        updated_count += 1

    print(f"\n✨ Form schemas generated for {updated_count} sub-indicators!")
    print(f"   BLGUs see upload_instructions (MOVs) telling them what to upload")
    print(f"   Validators see checklist items (a, b, c...) to verify uploaded files")


def downgrade() -> None:
    """Remove generated form schemas."""
    conn = op.get_bind()

    # Clear form_schema for all indicators that have checklist items
    clear_query = text("""
        UPDATE indicators
        SET form_schema = NULL
        WHERE id IN (
            SELECT DISTINCT indicator_id
            FROM checklist_items
        )
    """)

    conn.execute(clear_query)
    print("🔄 Cleared generated form schemas")
