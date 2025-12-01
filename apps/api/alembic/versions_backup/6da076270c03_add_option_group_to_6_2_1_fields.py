"""add_option_group_to_6_2_1_fields

Revision ID: 6da076270c03
Revises: 383d9bdd5c19
Create Date: 2025-11-19 09:21:49.511374

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6da076270c03'
down_revision: Union[str, Sequence[str], None] = '383d9bdd5c19'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Reseed indicator 6.2.1 to add option_group field to upload fields.

    This enables proper grouped OR validation where:
    - Option A: 1 field (photo documentation)
    - Option B: 3 fields (MOA + Mechanism + MOA)
    - Option C: 2 fields (MOA host + MOA/LGU)

    Completion should show "0 of 1" not "0 of 6" since only 1 complete option is required.
    """
    from app.indicators.definitions.indicator_6_2 import INDICATOR_6_2
    from app.indicators.seeder import _generate_form_schema_from_checklist
    from app.db.base import SessionLocal
    from app.db.models.governance_area import Indicator

    db = SessionLocal()
    try:
        indicator = db.query(Indicator).filter(Indicator.indicator_code == '6.2.1').first()

        if indicator:
            sub_def = INDICATOR_6_2.children[0]

            # Regenerate with option_group fields
            new_form_schema = _generate_form_schema_from_checklist(
                sub_def.checklist_items,
                sub_def.upload_instructions,
                sub_def.validation_rule
            )

            indicator.form_schema = new_form_schema
            db.commit()

            print(f"✅ Added option_group to 6.2.1 upload fields")

            # Show which fields have option_group
            if 'fields' in new_form_schema:
                for field in new_form_schema['fields']:
                    if field.get('field_type') == 'file_upload':
                        option_group = field.get('option_group', 'none')
                        print(f"   {field['field_id']}: option_group={option_group}")
        else:
            print("⚠️  Indicator 6.2.1 not found")

    finally:
        db.close()


def downgrade() -> None:
    """Revert to schema without option_group."""
    from app.db.base import SessionLocal
    from app.db.models.governance_area import Indicator

    db = SessionLocal()
    try:
        indicator = db.query(Indicator).filter(Indicator.indicator_code == '6.2.1').first()

        if indicator and indicator.form_schema and 'fields' in indicator.form_schema:
            # Remove option_group from all fields
            for field in indicator.form_schema['fields']:
                if 'option_group' in field:
                    del field['option_group']

            db.commit()
            print("✅ Removed option_group from 6.2.1 fields")
    finally:
        db.close()
