"""consolidate_indicator_1_6_1_with_or_logic

Revision ID: 5446a28e8751
Revises: c4d5e6f7a8b9
Create Date: 2025-12-06

This migration consolidates indicator 1.6.1 from three separate sub-indicators
(1.6.1.1, 1.6.1.2, 1.6.1.3) into a single indicator with OR logic.

Changes:
1. Delete child indicators 1.6.1.1, 1.6.1.2, 1.6.1.3
2. Update parent indicator 1.6.1 with new consolidated checklist items
3. Migrate existing assessment responses and MOVs to use new field IDs
4. Update form_schema with new OR logic structure

The new structure uses Option 1, Option 2, Option 3 with section headers and
OR separators. Only ONE option needs to be completed (ANY_OPTION_GROUP_REQUIRED).
"""
from typing import Sequence, Union, Dict, Any
import json

from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session


# revision identifiers, used by Alembic.
revision: str = '5446a28e8751'
down_revision: Union[str, Sequence[str], None] = 'c4d5e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Field ID mapping from old (1.6.1.x) to new (1.6.1 with option groups)
FIELD_ID_MAPPING = {
    # Old 1.6.1.1 → Option 1
    "1_6_1_1_a": "1_6_1_opt1_a",
    "1_6_1_1_b": "1_6_1_opt1_b",
    "upload_section_1": "1_6_1_opt1_a",  # Legacy format
    "upload_section_2": "1_6_1_opt1_b",  # Legacy format
    # Old 1.6.1.2 → Option 2
    "1_6_1_2_deposit": "1_6_1_opt2_deposit",
    # Old 1.6.1.3 → Option 3
    "1_6_1_3_a": "1_6_1_opt3_a",
    "1_6_1_3_b": "1_6_1_opt3_b",
}


def upgrade() -> None:
    """Consolidate indicator 1.6.1 into a single indicator with OR logic."""
    from app.db.models.governance_area import Indicator, ChecklistItem as ChecklistItemModel
    from app.indicators.definitions.indicator_1_6 import INDICATOR_1_6
    from app.indicators.seeder import _generate_form_schema_from_checklist

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        print("=" * 60)
        print("Consolidating indicator 1.6.1 with OR logic...")
        print("=" * 60)

        # 1. Get the parent indicator 1.6.1
        parent_indicator = session.query(Indicator).filter(
            Indicator.indicator_code == "1.6.1"
        ).first()

        if not parent_indicator:
            print("Parent indicator 1.6.1 not found, skipping migration...")
            return

        print(f"Found parent indicator: {parent_indicator.id} - {parent_indicator.indicator_code}")

        # 2. Get child indicators (1.6.1.1, 1.6.1.2, 1.6.1.3)
        child_indicators = session.query(Indicator).filter(
            Indicator.parent_id == parent_indicator.id
        ).all()

        child_codes = [c.indicator_code for c in child_indicators]
        print(f"Found {len(child_indicators)} child indicators: {child_codes}")

        # 3. Migrate assessment responses from children to parent
        for child in child_indicators:
            _migrate_responses(session, child, parent_indicator)

        # 4. Delete checklist items from children
        for child in child_indicators:
            deleted_count = session.query(ChecklistItemModel).filter(
                ChecklistItemModel.indicator_id == child.id
            ).delete()
            print(f"  Deleted {deleted_count} checklist items from {child.indicator_code}")

        # 5. Delete child indicators
        for child in child_indicators:
            session.delete(child)
            print(f"  Deleted child indicator: {child.indicator_code}")

        # 6. Delete existing checklist items from parent
        deleted_count = session.query(ChecklistItemModel).filter(
            ChecklistItemModel.indicator_id == parent_indicator.id
        ).delete()
        print(f"Deleted {deleted_count} existing checklist items from parent 1.6.1")

        # 7. Create new checklist items from the updated definition
        sub_161 = INDICATOR_1_6.children[0]  # Get 1.6.1 sub-indicator definition
        new_items = []
        for item_def in sub_161.checklist_items:
            new_item = ChecklistItemModel(
                indicator_id=parent_indicator.id,
                item_id=item_def.id,
                label=item_def.label,
                item_type=item_def.item_type,
                mov_description=item_def.mov_description,
                required=item_def.required,
                display_order=item_def.display_order,
                option_group=item_def.option_group,
            )
            new_items.append(new_item)
            session.add(new_item)

        print(f"Created {len(new_items)} new checklist items for 1.6.1")

        # 8. Update parent indicator with new configuration
        parent_indicator.name = sub_161.name
        parent_indicator.upload_instructions = sub_161.upload_instructions
        parent_indicator.validation_rule = sub_161.validation_rule

        # 9. Generate and update form_schema
        form_schema = _generate_form_schema_from_checklist(
            sub_161.checklist_items,
            sub_161.upload_instructions,
            sub_161.validation_rule,
            sub_161.notes
        )
        parent_indicator.form_schema = form_schema
        print(f"Updated form_schema with {len(form_schema.get('fields', []))} fields")

        session.commit()
        print("=" * 60)
        print("Migration completed successfully!")
        print("=" * 60)

    except Exception as e:
        session.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        session.close()


def _migrate_responses(session: Session, old_indicator: Any, new_indicator: Any) -> None:
    """Migrate assessment responses from old child indicator to new parent indicator."""
    from app.db.models.assessment import AssessmentResponse, MOVFile

    # Get responses for the old indicator
    responses = session.query(AssessmentResponse).filter(
        AssessmentResponse.indicator_id == old_indicator.id
    ).all()

    print(f"  Migrating {len(responses)} responses from {old_indicator.indicator_code}...")

    for response in responses:
        # Check if there's already a response for the parent indicator in this assessment
        existing_parent_response = session.query(AssessmentResponse).filter(
            AssessmentResponse.assessment_id == response.assessment_id,
            AssessmentResponse.indicator_id == new_indicator.id
        ).first()

        if existing_parent_response:
            # Merge response data into existing parent response
            _merge_response_data(existing_parent_response, response, old_indicator.indicator_code)
            # Migrate MOV files to point to new indicator
            _migrate_mov_files(session, old_indicator, new_indicator, response.assessment_id)
            # Delete the old response
            session.delete(response)
        else:
            # Update the response to point to the parent indicator
            response.indicator_id = new_indicator.id
            # Update field IDs in response_data
            if response.response_data:
                response.response_data = _remap_field_ids(response.response_data, old_indicator.indicator_code)
            # Update MOV files to point to new indicator
            _migrate_mov_files(session, old_indicator, new_indicator, response.assessment_id)


def _merge_response_data(parent_response: Any, child_response: Any, child_code: str) -> None:
    """Merge response data from child into parent response."""
    if not child_response.response_data:
        return

    if parent_response.response_data is None:
        parent_response.response_data = {}

    # Remap field IDs and merge
    remapped_data = _remap_field_ids(child_response.response_data, child_code)
    parent_response.response_data.update(remapped_data)


def _remap_field_ids(response_data: Dict[str, Any], child_code: str) -> Dict[str, Any]:
    """Remap old field IDs to new field IDs based on the indicator code."""
    if not response_data:
        return {}

    remapped = {}
    for key, value in response_data.items():
        new_key = FIELD_ID_MAPPING.get(key, key)
        remapped[new_key] = value

    return remapped


def _migrate_mov_files(session: Session, old_indicator: Any, new_indicator: Any, assessment_id: int) -> None:
    """Migrate MOV files from old indicator to new indicator and update field IDs."""
    from app.db.models.assessment import MOVFile

    # Get MOV files for the old indicator in this assessment
    movs = session.query(MOVFile).filter(
        MOVFile.indicator_id == old_indicator.id,
        MOVFile.assessment_id == assessment_id
    ).all()

    for mov in movs:
        # Update indicator reference to point to new parent indicator
        mov.indicator_id = new_indicator.id
        # Update field_id mapping
        if mov.field_id:
            mov.field_id = FIELD_ID_MAPPING.get(mov.field_id, mov.field_id)


def downgrade() -> None:
    """Revert the consolidation (not fully reversible - data may be lost)."""
    # Note: Full downgrade is complex and may result in data loss.
    # This is intentionally left as a pass - manual intervention required.
    print("Downgrade not implemented. Manual intervention required to restore child indicators.")
    pass
