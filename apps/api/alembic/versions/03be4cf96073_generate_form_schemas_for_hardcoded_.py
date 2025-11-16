"""generate_form_schemas_for_hardcoded_indicators

Generate BLGU file upload form_schema for all hardcoded sub-indicators.

For hardcoded SGLGB sub-indicators (1.1.1, 1.1.2, etc.), this migration creates
a simple file upload form with ONE file upload field per sub-indicator.

IMPORTANT: Checklist items are NOT for BLGU upload forms - they are for VALIDATORS
to check what documents are visible in the uploaded photos/files.

BLGU Workflow:
- Sub-indicator 1.1.1 → Upload 2-3 files (form + photos) in ONE upload area
- Validator sees those files + checklist items (a-g) to verify what's visible

Revision ID: 03be4cf96073
Revises: c0d0ff841142
Create Date: 2025-11-16 19:44:45.058611

"""
from typing import Sequence, Union
from collections import defaultdict
import json

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = '03be4cf96073'
down_revision: Union[str, Sequence[str], None] = 'c0d0ff841142'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Generate form_schema for all indicators that have checklist items."""
    conn = op.get_bind()

    # Get all indicators that have checklist items but no/empty form_schema
    # These are the sub-indicators (children) that BLGUs submit files for
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

    print(f"📝 Generating BLGU file upload forms for {len(indicators)} sub-indicators...")
    print(f"   Each sub-indicator gets ONE file upload area (not one per checklist item)")
    print(f"   Checklist items are for validators to check, not for BLGUs to upload\n")

    for indicator in indicators:
        indicator_id = indicator[0]
        indicator_name = indicator[1]
        indicator_code = indicator[2]
        indicator_description = indicator[3]

        # Get checklist items to show as upload instructions for BLGUs
        checklist_query = text("""
            SELECT item_id, label, group_name, mov_description, required, display_order
            FROM checklist_items
            WHERE indicator_id = :indicator_id
            ORDER BY display_order
        """)
        checklist_items = conn.execute(checklist_query, {"indicator_id": indicator_id}).fetchall()

        # Build instruction list from checklist items grouped by category
        instructions = []
        current_group = None
        group_items = []

        for item in checklist_items:
            item_id, label, group_name, mov_description, required, display_order = item

            # If we hit a new group, save the previous group and start a new one
            if group_name != current_group:
                if current_group is not None:
                    instructions.append({
                        "group": current_group,
                        "items": group_items
                    })
                current_group = group_name
                group_items = []

            group_items.append(label)

        # Add the last group
        if current_group is not None:
            instructions.append({
                "group": current_group,
                "items": group_items
            })

        # Create a SINGLE file upload field for this sub-indicator
        # BLGUs upload ALL required files for this sub-indicator in one place

        # Use description as help text if available
        help_text = indicator_description if indicator_description else f"Upload all required documents for {indicator_name}"

        field = {
            "field_id": f"upload_{indicator_code}",
            "field_type": "file_upload",
            "label": f"Upload Documents for {indicator_code}",
            "required": True,
            "help_text": help_text,
            "instructions": instructions,  # Show what documents are needed
            "accept": ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.xls",  # Accepted file types
            "max_size_mb": 50,  # Max file size in MB
            "multiple": True  # Allow multiple file uploads
        }

        # Create the form_schema structure
        form_schema = {
            "fields": [field],
            "version": "2.0",
            "schema_type": "blgu_upload"
        }

        # Update the indicator with the generated form_schema
        # Use direct SQL with JSON literal to avoid parameter binding issues
        form_schema_json = json.dumps(form_schema).replace("'", "''")  # Escape single quotes
        update_sql = f"""
            UPDATE indicators
            SET form_schema = '{form_schema_json}'::json
            WHERE id = {indicator_id}
        """
        conn.execute(text(update_sql))

        print(f"  ✅ {indicator_code}: {indicator_name}")
        print(f"      → 1 file upload field for BLGU")

    print(f"\n✨ Form schemas generated successfully for {len(indicators)} sub-indicators!")
    print(f"   BLGUs now have simple file upload forms.")
    print(f"   Validators will use checklist items to verify uploaded documents.")


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
