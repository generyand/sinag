"""Remove all year references from form_schema and checklist_items

Revision ID: d4e5f6a7b8c9
Revises: c4d5e6f7a8b9
Create Date: 2025-12-06 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c4d5e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Year reference patterns to remove
REPLACEMENTS = [
    # Date range patterns
    (" covering January to October 2023", ""),
    (" covering January to October 31, 2023", ""),
    ("covering January to October 2023", ""),
    (" covering July-September 2023", ""),
    ("covering July-September 2023", ""),
    (" covering July to September 2023", ""),

    # CY patterns
    (" covering CY 2023", ""),
    ("covering CY 2023", ""),
    (" for CY 2023", ""),
    ("for CY 2023", ""),
    (" of CY 2023", ""),
    ("of CY 2023", ""),
    (" in CY 2023", ""),
    ("in CY 2023", ""),
    ("CY 2023 ", ""),
    (" CY 2023", ""),

    # Specific patterns
    (" for 2022 and 2023", " for the previous assessed year and current assessed year"),
    ("for 2022 and 2023", "for the previous assessed year and current assessed year"),
    ("2022 and 2023", "the previous assessed year and current assessed year"),
    ("CYs 2022 and 2023", "the previous assessed year and current assessed year"),
    ("CY 2022 and CY 2023", "the previous assessed year and current assessed year"),

    # Trailing patterns
    (", and*", ""),  # Remove trailing ", and" before asterisk
    (" C, and", " C"),  # Fix "RBI Monitoring Form C, and"

    # Other year patterns
    ("(as of Dec. 31, 2023)", ""),
    ("(as of Dec 31, 2023)", ""),
    ("as of Dec. 31, 2023", ""),
    ("as of Dec 31, 2023", ""),
]


def upgrade() -> None:
    conn = op.get_bind()

    # Update checklist_items labels
    for old, new in REPLACEMENTS:
        conn.execute(
            sa.text("""
                UPDATE checklist_items
                SET label = REPLACE(label, :old, :new)
                WHERE label LIKE :pattern
            """),
            {"old": old, "new": new, "pattern": f"%{old}%"}
        )

        # Also update mov_description
        conn.execute(
            sa.text("""
                UPDATE checklist_items
                SET mov_description = REPLACE(mov_description, :old, :new)
                WHERE mov_description LIKE :pattern
            """),
            {"old": old, "new": new, "pattern": f"%{old}%"}
        )

    # Update indicators form_schema (JSON field)
    # Get all indicators with form_schema
    result = conn.execute(
        sa.text("SELECT id, indicator_code, form_schema FROM indicators WHERE form_schema IS NOT NULL")
    )

    for row in result:
        indicator_id, code, form_schema = row
        if not form_schema:
            continue

        import json
        schema = form_schema if isinstance(form_schema, dict) else json.loads(form_schema)
        modified = False

        # Update upload_instructions
        if 'upload_instructions' in schema:
            original = schema['upload_instructions']
            updated = original
            for old, new in REPLACEMENTS:
                if old in updated:
                    updated = updated.replace(old, new)
            if updated != original:
                schema['upload_instructions'] = updated
                modified = True

        # Update fields
        if 'fields' in schema:
            for field in schema['fields']:
                if 'label' in field:
                    original = field['label']
                    updated = original
                    for old, new in REPLACEMENTS:
                        if old in updated:
                            updated = updated.replace(old, new)
                    if updated != original:
                        field['label'] = updated
                        modified = True

                if 'description' in field:
                    original = field['description']
                    updated = original
                    for old, new in REPLACEMENTS:
                        if old in updated:
                            updated = updated.replace(old, new)
                    if updated != original:
                        field['description'] = updated
                        modified = True

        # Update sub_indicators if present
        if 'sub_indicators' in schema:
            for sub in schema['sub_indicators']:
                if 'upload_instructions' in sub:
                    original = sub['upload_instructions']
                    updated = original
                    for old, new in REPLACEMENTS:
                        if old in updated:
                            updated = updated.replace(old, new)
                    if updated != original:
                        sub['upload_instructions'] = updated
                        modified = True

                if 'fields' in sub:
                    for field in sub['fields']:
                        if 'label' in field:
                            original = field['label']
                            updated = original
                            for old, new in REPLACEMENTS:
                                if old in updated:
                                    updated = updated.replace(old, new)
                            if updated != original:
                                field['label'] = updated
                                modified = True

        # Update notes if present
        if 'notes' in schema and schema['notes']:
            notes = schema['notes']
            if 'items' in notes:
                for item in notes['items']:
                    if 'text' in item:
                        original = item['text']
                        updated = original
                        for old, new in REPLACEMENTS:
                            if old in updated:
                                updated = updated.replace(old, new)
                        if updated != original:
                            item['text'] = updated
                            modified = True

        if modified:
            conn.execute(
                sa.text("UPDATE indicators SET form_schema = :schema WHERE id = :id"),
                {"schema": json.dumps(schema), "id": indicator_id}
            )


def downgrade() -> None:
    # Downgrade would require storing original values, which we don't have
    pass
