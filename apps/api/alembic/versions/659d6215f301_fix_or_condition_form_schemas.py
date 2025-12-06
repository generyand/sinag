"""fix_or_condition_form_schemas

Revision ID: 659d6215f301
Revises: 0ddebee1b7ac
Create Date: 2025-12-01

This migration regenerates form_schema for all sub-indicators from Python definitions.
Fixes issue where indicators with OR conditions (like 2.1.4) were not getting
proper file_upload fields in their form_schema due to a parser bug.

Affected indicators with OR conditions:
- 1.6.1.3, 2.1.4, 3.1.6, 3.2.3, 3.3.2, 3.5.2
- 4.1.6, 4.2.2, 4.3.4, 4.5.6, 4.8.4, 6.2.1
"""

from typing import Sequence, Union
import json

from alembic import op
from sqlalchemy.orm import Session
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = "659d6215f301"
down_revision: Union[str, Sequence[str], None] = "0ddebee1b7ac"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Regenerate form_schema for all sub-indicators from Python definitions."""
    # Import here to avoid circular imports
    from app.indicators.definitions import ALL_INDICATORS
    from app.indicators.seeder import _generate_form_schema_from_checklist

    # Get database connection
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("Regenerating form_schema for all sub-indicators...")

        updated_count = 0
        or_indicators_fixed = []

        def process_indicator(indicator_def, parent_code=""):
            """Recursively process indicator definitions."""
            nonlocal updated_count, or_indicators_fixed

            for child in indicator_def.children:
                code = child.code

                # Generate form_schema from definition
                form_schema = None
                if child.checklist_items or child.upload_instructions:
                    form_schema = _generate_form_schema_from_checklist(
                        child.checklist_items,
                        child.upload_instructions,
                        child.validation_rule,
                    )

                if form_schema:
                    # Update the indicator's form_schema
                    form_schema_json = json.dumps(form_schema)

                    result = session.execute(
                        text("""
                            UPDATE indicators
                            SET form_schema = :form_schema,
                                validation_rule = :validation_rule
                            WHERE indicator_code = :code
                        """),
                        {
                            "form_schema": form_schema_json,
                            "validation_rule": child.validation_rule,
                            "code": code,
                        },
                    )

                    if result.rowcount > 0:
                        updated_count += 1

                        # Track OR condition indicators
                        fields = form_schema.get("fields", [])
                        upload_fields = [f for f in fields if f.get("field_type") == "file_upload"]

                        if child.validation_rule in [
                            "ANY_ITEM_REQUIRED",
                            "OR_LOGIC_AT_LEAST_1_REQUIRED",
                        ]:
                            or_indicators_fixed.append(
                                f"{code}: {len(upload_fields)} upload fields"
                            )
                        elif child.validation_rule == "SHARED_PLUS_OR_LOGIC":
                            # Track SHARED+OR indicators separately
                            shared_count = sum(
                                1 for f in upload_fields if f.get("option_group") == "shared"
                            )
                            option_a_count = sum(
                                1 for f in upload_fields if f.get("option_group") == "option_a"
                            )
                            option_b_count = sum(
                                1 for f in upload_fields if f.get("option_group") == "option_b"
                            )
                            or_indicators_fixed.append(
                                f"{code}: SHARED+OR ({shared_count} shared, {option_a_count} opt_a, {option_b_count} opt_b)"
                            )

                # Process nested children
                if hasattr(child, "children") and child.children:
                    process_indicator(child, code)

        # Process all indicators
        for indicator in ALL_INDICATORS:
            process_indicator(indicator)

        session.commit()

        print(f"✅ Updated form_schema for {updated_count} indicators")
        if or_indicators_fixed:
            print("✅ Fixed OR condition indicators:")
            for info in or_indicators_fixed:
                print(f"   - {info}")

    except Exception as e:
        session.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        session.close()


def downgrade() -> None:
    """No downgrade - form_schema regeneration is safe to repeat."""
    pass
