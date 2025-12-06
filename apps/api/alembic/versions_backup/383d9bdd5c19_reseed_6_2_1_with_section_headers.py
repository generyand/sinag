"""reseed_6_2_1_with_section_headers

Revision ID: 383d9bdd5c19
Revises: 61cf29cca0ce
Create Date: 2025-11-19 09:14:56.393520

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "383d9bdd5c19"
down_revision: Union[str, Sequence[str], None] = "61cf29cca0ce"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Reseed indicator 6.2.1 with updated form schema that includes section headers and OR separators.

    This allows the BLGU form to display:
    - OPTION A section header
    - Upload fields for Option A
    - "OR" separator
    - OPTION B section header
    - Upload fields for Option B
    - "OR" separator
    - OPTION C section header
    - Upload fields for Option C
    """
    # Import seeder and indicator definition
    from app.indicators.definitions.indicator_6_2 import INDICATOR_6_2
    from app.indicators.seeder import _generate_form_schema_from_checklist
    from app.db.base import SessionLocal
    from app.db.models.governance_area import Indicator

    db = SessionLocal()
    try:
        # Find indicator 6.2.1
        indicator = db.query(Indicator).filter(Indicator.indicator_code == "6.2.1").first()

        if indicator:
            # Get the definition for 6.2.1 from the Python code
            sub_def = INDICATOR_6_2.children[0]  # 6.2.1 is the first child of 6.2

            # Regenerate form schema with updated parser (now supports OPTION structure)
            new_form_schema = _generate_form_schema_from_checklist(
                sub_def.checklist_items,
                sub_def.upload_instructions,
                sub_def.validation_rule,
            )

            # Update the form_schema in database
            indicator.form_schema = new_form_schema
            db.commit()

            print("✅ Updated form_schema for indicator 6.2.1")
            print(f"   New schema has {len(new_form_schema.get('fields', []))} fields")
        else:
            print("⚠️  Indicator 6.2.1 not found in database")

    finally:
        db.close()


def downgrade() -> None:
    """
    Revert to simple upload_section_1 field without section headers.
    """
    from app.db.base import SessionLocal
    from app.db.models.governance_area import Indicator

    db = SessionLocal()
    try:
        indicator = db.query(Indicator).filter(Indicator.indicator_code == "6.2.1").first()

        if indicator:
            # Revert to simple single-upload-field schema
            indicator.form_schema = {
                "type": "mov_checklist",
                "fields": [
                    {
                        "field_id": "upload_section_1",
                        "field_type": "file_upload",
                        "label": "Upload required documents",
                        "description": "",
                        "required": True,
                        "accept": ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4",
                        "multiple": True,
                        "max_size": 50,
                    }
                ],
                "validation_rule": "OR_LOGIC_AT_LEAST_1_REQUIRED",
            }
            db.commit()
            print("✅ Reverted form_schema for indicator 6.2.1")
    finally:
        db.close()
