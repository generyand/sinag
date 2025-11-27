"""
Database seeder for hard-coded SGLGB indicators.

This module provides functionality to seed indicators from Python definitions
into the database.
"""

from typing import List, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime

from app.indicators.base import Indicator, SubIndicator, ChecklistItem as ChecklistItemDef
from app.db.models.governance_area import Indicator as IndicatorModel, ChecklistItem as ChecklistItemModel


def _parse_upload_sections_from_instructions(upload_instructions: str) -> List[Dict[str, Any]]:
    """
    Parse upload instructions to extract individual upload sections.

    This parses upload requirements from the upload_instructions string, supporting:
    1. Numbered items (e.g., "1.", "2.")
    2. OPTION-based structures (e.g., "OPTION A", "OPTION B")

    For example:
        "Upload the following documents:
        1. BFDP Monitoring Form A...
        2. Two (2) Photo Documentation..."

    Or:
        "OPTION A - For MRF:
        - Photo documentation

        OR

        OPTION B - For MRS:
        - MOA with junkshop
        - Mechanism..."

    Returns a list of upload field definitions.
    """
    if not upload_instructions:
        return []

    upload_sections = []
    lines = upload_instructions.strip().split('\n')

    # Check if this uses OPTION-based structure
    has_options = any('OPTION' in line.upper() for line in lines)

    if has_options:
        # Parse OPTION-based structure (e.g., 6.2.1)
        current_option = None
        current_option_id = None
        field_counter = 0

        for line in lines:
            line_stripped = line.strip()

            # Detect option headers (e.g., "OPTION A - For MRF:")
            if 'OPTION' in line_stripped.upper():
                current_option = line_stripped
                # Extract option letter (A, B, C) for grouping
                if 'OPTION A' in line_stripped.upper():
                    current_option_id = 'option_a'
                elif 'OPTION B' in line_stripped.upper():
                    current_option_id = 'option_b'
                elif 'OPTION C' in line_stripped.upper():
                    current_option_id = 'option_c'
                else:
                    current_option_id = f'option_{len(upload_sections) + 1}'

                # Add section header
                upload_sections.append({
                    "field_id": f"section_header_{len(upload_sections) + 1}",
                    "field_type": "section_header",
                    "label": line_stripped,
                    "description": "",
                    "required": False
                })
            # Detect "OR" separators
            elif line_stripped.upper() == 'OR':
                upload_sections.append({
                    "field_id": f"or_separator_{len(upload_sections) + 1}",
                    "field_type": "info_text",
                    "label": "OR",
                    "description": "",
                    "required": False
                })
                # Reset option after OR separator
                current_option_id = None
            # Detect bullet points (upload fields)
            elif line_stripped.startswith('-') and current_option:
                field_counter += 1
                label = line_stripped[1:].strip()  # Remove leading "-"

                upload_sections.append({
                    "field_id": f"upload_section_{field_counter}",
                    "field_type": "file_upload",
                    "label": label,
                    "description": label,
                    "required": True,
                    "accept": ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4",
                    "multiple": True,
                    "max_size": 50,
                    "option_group": current_option_id  # Add option group for frontend grouping
                })

    else:
        # Parse numbered structure (existing logic)
        current_number = 0
        for line in lines:
            line = line.strip()
            # Look for numbered items (e.g., "1.", "2.", etc.)
            if line and line[0].isdigit() and '.' in line[:3]:
                current_number += 1
                # Extract the label after the number
                label = line.split('.', 1)[1].strip() if '.' in line else line

                upload_sections.append({
                    "field_id": f"upload_section_{current_number}",
                    "field_type": "file_upload",
                    "label": label,
                    "description": label,
                    "required": True,
                    "accept": ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4",
                    "multiple": True,
                    "max_size": 50
                })

        # If no numbered sections found, extract label from first meaningful line
        if not upload_sections:
            # Try to extract a specific label from the instructions
            label = "Upload required documents"  # default fallback

            for line in lines:
                line = line.strip()
                if line and not line.startswith('('):  # Skip parenthetical notes
                    # Remove common prefixes like "Upload:", "Upload the following:", etc.
                    if line.lower().startswith('upload:'):
                        label = line.split(':', 1)[1].strip()
                    elif line.lower().startswith('upload '):
                        # Try to extract after "upload" keyword
                        after_upload = line[7:].strip()
                        # Skip generic phrases like "the following documents"
                        if after_upload and not after_upload.lower().startswith('the following'):
                            label = after_upload
                        else:
                            label = line
                    else:
                        label = line
                    break

            upload_sections.append({
                "field_id": "upload_section_1",
                "field_type": "file_upload",
                "label": label,
                "description": upload_instructions,
                "required": True,
                "accept": ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4",
                "multiple": True,
                "max_size": 50
            })

    return upload_sections


def _generate_form_schema_from_checklist(checklist_items: List[ChecklistItemDef], upload_instructions: str = None, validation_rule: str = "ALL_ITEMS_REQUIRED") -> Dict[str, Any]:
    """
    Generate a form schema JSON from checklist items.

    For BLGU users: Creates file upload fields based on upload_instructions
    For Assessors: Creates validation form with upload section checkboxes + checklist item checkboxes

    Args:
        checklist_items: List of ChecklistItem definitions (for assessor validation)
        upload_instructions: Upload instructions that define BLGU upload sections
        validation_rule: Validation strategy (ALL_ITEMS_REQUIRED or ANY_ITEM_REQUIRED)

    Returns:
        Dictionary containing the form schema structure
    """
    if not upload_instructions and not checklist_items:
        return {}

    # Parse upload sections from instructions for BLGU users
    fields = _parse_upload_sections_from_instructions(upload_instructions)

    # Build complete form schema
    schema = {
        "type": "mov_checklist",
        "fields": fields,
        "validation_rule": validation_rule,  # Include validation rule for OR logic
    }

    if upload_instructions:
        schema["upload_instructions"] = upload_instructions

    # Build assessor validation schema
    # This includes both upload section validations AND checklist item validations
    assessor_fields = []

    # 1. Add upload section checkboxes (from parsed upload instructions)
    upload_sections = _parse_upload_sections_from_instructions(upload_instructions)
    for section in upload_sections:
        assessor_fields.append({
            "type": "upload_section_checkbox",
            "field_id": section["field_id"],
            "label": section["label"],
            "description": section["description"],
            "requires_document_count": "number of documents submitted" in section["label"].lower()
        })

    # 2. Add checklist item checkboxes (from checklist_items)
    if checklist_items:
        for item in sorted(checklist_items, key=lambda x: x.display_order):
            assessor_fields.append({
                "type": "checklist_item_checkbox",
                "item_id": item.id,
                "label": item.label,
                "group_name": item.group_name,
                "description": item.mov_description,
                "required": item.required,
                "requires_document_count": item.requires_document_count,
                "display_order": item.display_order
            })

    # Store complete assessor validation schema
    schema["assessor_validation"] = {
        "fields": assessor_fields
    }

    return schema


def _seed_sub_indicator(
    sub_def: SubIndicator,
    parent_id: int,
    governance_area_id: int,
    db: Session
) -> None:
    """
    Recursively seed a sub-indicator and its children.

    This handles nested hierarchies like:
    1.6 → 1.6.1 (container) → 1.6.1.1, 1.6.1.2, 1.6.1.3 (leaf nodes)
    """
    # Generate form_schema from checklist items OR upload_instructions
    form_schema = None
    if sub_def.checklist_items or sub_def.upload_instructions:
        form_schema = _generate_form_schema_from_checklist(
            sub_def.checklist_items,
            sub_def.upload_instructions,
            sub_def.validation_rule
        )

    # Create this sub-indicator
    sub_indicator = IndicatorModel(
        indicator_code=sub_def.code,
        name=sub_def.name,
        parent_id=parent_id,
        governance_area_id=governance_area_id,
        validation_rule=sub_def.validation_rule,
        form_schema=form_schema,  # Add generated form schema
        is_active=True,
        is_auto_calculable=True,
    )
    db.add(sub_indicator)
    db.flush()  # Get sub-indicator ID

    # If this sub-indicator has checklist items, create them (it's a leaf node)
    for item_def in sub_def.checklist_items:
        checklist_item = ChecklistItemModel(
            indicator_id=sub_indicator.id,
            item_id=item_def.id,
            label=item_def.label,
            item_type=item_def.item_type,
            group_name=item_def.group_name,
            mov_description=item_def.mov_description,
            required=item_def.required,
            requires_document_count=item_def.requires_document_count,
            display_order=item_def.display_order,
            option_group=item_def.option_group,
        )
        db.add(checklist_item)

    # If this sub-indicator has children, recursively create them (it's a container node)
    for nested_child in sub_def.children:
        _seed_sub_indicator(nested_child, sub_indicator.id, governance_area_id, db)


def seed_indicators(indicators: List[Indicator], db: Session, effective_date: datetime = None) -> None:
    """
    Seed indicators from Python definitions into the database.

    Supports hierarchical structures with multiple levels:
    - 2-level: 1.1 → 1.1.1, 1.1.2 (leaf nodes)
    - 4-level: 1.6 → 1.6.1 (container) → 1.6.1.1, 1.6.1.2, 1.6.1.3 (leaf nodes)

    Args:
        indicators: List of Indicator dataclass instances
        db: SQLAlchemy database session
        effective_date: When this version became active (defaults to now)

    Example:
        from app.indicators.definitions import ALL_INDICATORS
        seed_indicators(ALL_INDICATORS, db)
    """
    if effective_date is None:
        effective_date = datetime.utcnow()

    for indicator_def in indicators:
        # Create parent indicator (root)
        parent = IndicatorModel(
            indicator_code=indicator_def.code,
            name=indicator_def.name,
            description=indicator_def.description,
            governance_area_id=indicator_def.governance_area_id,
            is_bbi=indicator_def.is_bbi,
            is_profiling_only=indicator_def.is_profiling_only,
            is_active=True,
            is_auto_calculable=True,  # All hard-coded indicators use automatic validation
            parent_id=None,  # This is a root indicator
            sort_order=indicator_def.sort_order,
            effective_date=effective_date,
            validation_rule="ALL_ITEMS_REQUIRED",  # Parent validation rule (can be overridden per child)
        )
        db.add(parent)
        db.flush()  # Get parent ID

        # Recursively create sub-indicators (children and nested children)
        for child_def in indicator_def.children:
            _seed_sub_indicator(child_def, parent.id, indicator_def.governance_area_id, db)

        db.commit()


def clear_indicators(db: Session) -> None:
    """
    Clear all indicators and checklist items from the database.

    WARNING: This will delete all indicators and their associated data.
    Use with caution!

    Args:
        db: SQLAlchemy database session
    """
    # Delete all checklist items (CASCADE will handle this automatically)
    db.query(ChecklistItemModel).delete()

    # Delete all indicators (including parent and children)
    db.query(IndicatorModel).delete()

    db.commit()


def reseed_indicators(indicators: List[Indicator], db: Session, effective_date: datetime = None) -> None:
    """
    Clear existing indicators and reseed from Python definitions.

    Args:
        indicators: List of Indicator dataclass instances
        db: SQLAlchemy database session
        effective_date: When this version became active (defaults to now)
    """
    clear_indicators(db)
    seed_indicators(indicators, db, effective_date)
