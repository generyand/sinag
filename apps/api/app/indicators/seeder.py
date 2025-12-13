"""
Database seeder for hard-coded SGLGB indicators.

This module provides functionality to seed indicators from Python definitions
into the database.
"""

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.db.models.governance_area import (
    ChecklistItem as ChecklistItemModel,
)
from app.db.models.governance_area import (
    Indicator as IndicatorModel,
)
from app.indicators.base import (
    ChecklistItem as ChecklistItemDef,
)
from app.indicators.base import (
    FormNotes,
    Indicator,
    SubIndicator,
)


def _parse_upload_sections_from_instructions(
    upload_instructions: str,
) -> list[dict[str, Any]]:
    """
    Parse upload instructions to extract individual upload sections.

    This parses upload requirements from the upload_instructions string, supporting:
    1. Numbered items (e.g., "1.", "2.")
    2. OPTION-based structures (e.g., "OPTION A", "OPTION B")
    3. Hybrid format: numbered items with "(Option A:", "(Option B:" in labels

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

    Or (hybrid format for OR conditions like 2.1.4):
        "Upload based on your chosen option:
        1. (Option A: Physical) Accomplishment Report
        2. (Option A: Physical) Certification...
        3. (Option B: Financial) Annual Report
        4. (Option B: Financial) Certification..."

    Returns a list of upload field definitions.
    """
    if not upload_instructions:
        return []

    upload_sections = []
    lines = upload_instructions.strip().split("\n")

    # Check if this uses pure OPTION-based structure (with bullet points)
    # vs hybrid format (numbered items with Option labels)
    # Also check for SHARED+OR format (SHARED section + OPTION A/B)
    has_bullet_options = any(
        line.strip().upper().startswith("OPTION")
        and not line.strip()[0].isdigit()  # Not a numbered item
        for line in lines
    )
    has_numbered_with_options = any(
        line.strip() and line.strip()[0].isdigit() and "(OPTION" in line.upper() for line in lines
    )
    has_shared_section = any(line.strip().upper().startswith("SHARED") for line in lines)

    if (has_bullet_options or has_shared_section) and not has_numbered_with_options:
        # Parse OPTION-based structure (e.g., 6.2.1) or SHARED+OR format (e.g., 4.1.6, 4.8.4)
        # SHARED+OR format: SHARED (Required) + (OPTION A OR OPTION B)
        current_section = None  # Track current section (shared, option_a, option_b)
        current_option_id = None
        field_counter = 0

        for line in lines:
            line_stripped = line.strip()
            line_upper = line_stripped.upper()

            # Detect SHARED section header (e.g., "SHARED (Required):")
            if line_upper.startswith("SHARED"):
                current_section = line_stripped
                current_option_id = "shared"
                # Add section header for SHARED
                upload_sections.append(
                    {
                        "field_id": f"section_header_{len(upload_sections) + 1}",
                        "field_type": "section_header",
                        "label": line_stripped,
                        "description": "",
                        "required": False,
                    }
                )
            # Detect option headers (e.g., "OPTION A - PHYSICAL:" or "OPTION 1:")
            elif "OPTION" in line_upper and (
                not line_stripped[0].isdigit() if line_stripped else True
            ):
                current_section = line_stripped
                # Extract option letter (A, B, C) or number (1, 2, 3) for grouping
                if "OPTION A" in line_upper:
                    current_option_id = "option_a"
                elif "OPTION B" in line_upper:
                    current_option_id = "option_b"
                elif "OPTION C" in line_upper:
                    current_option_id = "option_c"
                elif "OPTION 1" in line_upper:
                    current_option_id = "Option 1"
                elif "OPTION 2" in line_upper:
                    current_option_id = "Option 2"
                elif "OPTION 3" in line_upper:
                    current_option_id = "Option 3"
                else:
                    current_option_id = f"option_{len(upload_sections) + 1}"

                # Add section header with option_group for frontend grouping
                upload_sections.append(
                    {
                        "field_id": f"section_header_{len(upload_sections) + 1}",
                        "field_type": "section_header",
                        "label": line_stripped,
                        "description": "",
                        "required": False,
                        "option_group": current_option_id,
                    }
                )
            # Detect "OR" separators
            elif line_upper == "OR":
                upload_sections.append(
                    {
                        "field_id": f"or_separator_{len(upload_sections) + 1}",
                        "field_type": "info_text",
                        "label": "OR",
                        "description": "",
                        "required": False,
                    }
                )
                # Don't reset option_id - let next OPTION header set it
            # Detect bullet points (upload fields)
            elif line_stripped.startswith("-") and current_section:
                field_counter += 1
                label = line_stripped[1:].strip()  # Remove leading "-"

                # SHARED fields are required, OPTION fields are not (OR logic)
                is_required = current_option_id == "shared"

                upload_sections.append(
                    {
                        "field_id": f"upload_section_{field_counter}",
                        "field_type": "file_upload",
                        "label": label,
                        "description": label,
                        "required": is_required,
                        "accept": ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4",
                        "multiple": True,
                        "max_size": 50,
                        "option_group": current_option_id,  # Add option group for frontend grouping
                    }
                )

    elif has_numbered_with_options:
        # Parse hybrid format: numbered items with "(Option A:", "(Option B:" labels
        # Used for OR conditions like indicator 2.1.4
        current_number = 0

        for line in lines:
            line_stripped = line.strip()

            # Look for numbered items (e.g., "1.", "2.", etc.)
            if line_stripped and line_stripped[0].isdigit() and "." in line_stripped[:3]:
                current_number += 1
                # Extract the label after the number
                label = (
                    line_stripped.split(".", 1)[1].strip()
                    if "." in line_stripped
                    else line_stripped
                )

                # Determine option group from label
                option_group = None
                if "(OPTION A" in line_stripped.upper():
                    option_group = "option_a"
                elif "(OPTION B" in line_stripped.upper():
                    option_group = "option_b"
                elif "(OPTION C" in line_stripped.upper():
                    option_group = "option_c"

                upload_sections.append(
                    {
                        "field_id": f"upload_section_{current_number}",
                        "field_type": "file_upload",
                        "label": label,
                        "description": label,
                        "required": False,  # OR logic - not all required
                        "accept": ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4",
                        "multiple": True,
                        "max_size": 50,
                        "option_group": option_group,
                    }
                )

    else:
        # Parse numbered structure (existing logic)
        # But skip informational lists that aren't actual upload requirements

        # Detect if numbered items are informational (e.g., "Minimum Composition of BNC:")
        # by checking for headers that indicate the list is not uploads
        # IMPORTANT: These must appear at the START of a line, not embedded in text
        informational_header_starts = [
            "minimum composition",
            "composition of",
            "members of",
            "membership:",
            "membership of",
            "components:",
            "criteria:",
            "note:",  # Notes are informational
        ]

        # Also check if the numbered items appear AFTER an informational header
        # If so, they're likely not upload requirements
        in_informational_section = False
        current_number = 0

        for line in lines:
            line_stripped = line.strip()
            line_lower = line_stripped.lower()

            # Check if we're entering an informational section
            # The header must START the line (not be embedded like "Photo Requirements:")
            is_informational_header = any(
                line_lower.startswith(header) for header in informational_header_starts
            )
            if is_informational_header:
                in_informational_section = True
                continue

            # Reset if we hit "Upload" again (new upload section)
            if line_lower.startswith("upload") and ":" in line_lower:
                in_informational_section = False

            # Look for numbered items (e.g., "1.", "2.", etc.)
            if line_stripped and line_stripped[0].isdigit() and "." in line_stripped[:3]:
                # Skip if we're in an informational section
                if in_informational_section:
                    continue

                current_number += 1
                # Extract the label after the number
                label = (
                    line_stripped.split(".", 1)[1].strip()
                    if "." in line_stripped
                    else line_stripped
                )

                upload_sections.append(
                    {
                        "field_id": f"upload_section_{current_number}",
                        "field_type": "file_upload",
                        "label": label,
                        "description": label,
                        "required": True,
                        "accept": ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4",
                        "multiple": True,
                        "max_size": 50,
                    }
                )

        # If no numbered sections found, check for bullet point format or extract from first line
        if not upload_sections:
            # First, check for bullet point items (lines starting with "-")
            bullet_counter = 0
            for line in lines:
                line_stripped = line.strip()
                if line_stripped.startswith("-"):
                    bullet_counter += 1
                    label = line_stripped[1:].strip()  # Remove leading "-"
                    upload_sections.append(
                        {
                            "field_id": f"upload_section_{bullet_counter}",
                            "field_type": "file_upload",
                            "label": label,
                            "description": label,
                            "required": True,
                            "accept": ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4",
                            "multiple": True,
                            "max_size": 50,
                        }
                    )

        # If still no sections found, extract label from first meaningful line
        if not upload_sections:
            # Try to extract a specific label from the instructions
            label = "Upload required documents"  # default fallback

            for line in lines:
                line = line.strip()
                if line and not line.startswith("("):  # Skip parenthetical notes
                    # Remove common prefixes like "Upload:", "Upload the following:", etc.
                    if line.lower().startswith("upload:"):
                        label = line.split(":", 1)[1].strip()
                    elif line.lower().startswith("upload "):
                        # Try to extract after "upload" keyword
                        after_upload = line[7:].strip()
                        # Skip generic phrases like "the following documents"
                        if after_upload and not after_upload.lower().startswith("the following"):
                            label = after_upload
                        else:
                            label = line
                    else:
                        label = line
                    break

            upload_sections.append(
                {
                    "field_id": "upload_section_1",
                    "field_type": "file_upload",
                    "label": label,
                    "description": upload_instructions,
                    "required": True,
                    "accept": ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4",
                    "multiple": True,
                    "max_size": 50,
                }
            )

    return upload_sections


def _generate_form_schema_from_checklist(
    checklist_items: list[ChecklistItemDef],
    upload_instructions: str = None,
    validation_rule: str = "ALL_ITEMS_REQUIRED",
    notes: FormNotes = None,
) -> dict[str, Any]:
    """
    Generate a form schema JSON from checklist items.

    For BLGU users: Creates file upload fields based on upload_instructions
    For Assessors: Creates validation form with upload section checkboxes + checklist item checkboxes

    Args:
        checklist_items: List of ChecklistItem definitions (for assessor validation)
        upload_instructions: Upload instructions that define BLGU upload sections
        validation_rule: Validation strategy (ALL_ITEMS_REQUIRED or ANY_ITEM_REQUIRED)
        notes: Optional notes section to display below form fields

    Returns:
        Dictionary containing the form schema structure
    """
    if not upload_instructions and not checklist_items:
        return {}

    # Parse upload sections from instructions for BLGU users
    fields = _parse_upload_sections_from_instructions(upload_instructions)

    # Add field_notes from checklist items to corresponding fields
    # Match by order (first checklist item with field_notes -> first field, etc.)
    if checklist_items:
        items_with_notes = [
            (i, item)
            for i, item in enumerate(sorted(checklist_items, key=lambda x: x.display_order))
            if item.field_notes
        ]
        for idx, item in items_with_notes:
            if idx < len(fields):
                fields[idx]["field_notes"] = {
                    "title": item.field_notes.title,
                    "items": [
                        {"label": note_item.label, "text": note_item.text}
                        if note_item.label
                        else {"text": note_item.text}
                        for note_item in item.field_notes.items
                    ],
                }

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
        assessor_fields.append(
            {
                "type": "upload_section_checkbox",
                "field_id": section["field_id"],
                "label": section["label"],
                "description": section["description"],
                "requires_document_count": "number of documents submitted"
                in section["label"].lower(),
            }
        )

    # 2. Add checklist item checkboxes (from checklist_items)
    if checklist_items:
        for item in sorted(checklist_items, key=lambda x: x.display_order):
            assessor_fields.append(
                {
                    "type": "checklist_item_checkbox",
                    "item_id": item.id,
                    "label": item.label,
                    "group_name": item.group_name,
                    "description": item.mov_description,
                    "required": item.required,
                    "requires_document_count": item.requires_document_count,
                    "display_order": item.display_order,
                }
            )

    # Store complete assessor validation schema
    schema["assessor_validation"] = {"fields": assessor_fields}

    # Add notes section if provided
    if notes:
        schema["notes"] = {
            "title": notes.title,
            "items": [
                {"label": item.label, "text": item.text} if item.label else {"text": item.text}
                for item in notes.items
            ],
        }

    return schema


def _seed_sub_indicator(
    sub_def: SubIndicator,
    parent_id: int,
    governance_area_id: int,
    db: Session,
    sort_order: int = 0,
) -> None:
    """
    Recursively seed a sub-indicator and its children.

    This handles nested hierarchies like:
    1.6 → 1.6.1 (container) → 1.6.1.1, 1.6.1.2, 1.6.1.3 (leaf nodes)

    Args:
        sub_def: SubIndicator definition from Python code
        parent_id: ID of the parent indicator in the database
        governance_area_id: ID of the governance area
        db: SQLAlchemy database session
        sort_order: Position within siblings (1-based)
    """
    # Generate form_schema from checklist items OR upload_instructions
    form_schema = None
    if sub_def.checklist_items or sub_def.upload_instructions:
        form_schema = _generate_form_schema_from_checklist(
            sub_def.checklist_items,
            sub_def.upload_instructions,
            sub_def.validation_rule,
            sub_def.notes,
        )

    # Create this sub-indicator with sort_order
    sub_indicator = IndicatorModel(
        indicator_code=sub_def.code,
        name=sub_def.name,
        parent_id=parent_id,
        governance_area_id=governance_area_id,
        validation_rule=sub_def.validation_rule,
        form_schema=form_schema,  # Add generated form schema
        is_active=True,
        is_auto_calculable=True,
        is_profiling_only=sub_def.is_profiling_only,  # Preserve profiling-only flag
        sort_order=sort_order,  # Set sort_order based on position
    )
    db.add(sub_indicator)
    db.flush()  # Get sub-indicator ID

    # If this sub-indicator has checklist items, create them (it's a leaf node)
    for item_def in sub_def.checklist_items:
        # Convert field_notes to dict if present
        field_notes_dict = None
        if item_def.field_notes:
            field_notes_dict = {
                "title": item_def.field_notes.title,
                "items": [
                    {"label": item.label, "text": item.text} if item.label else {"text": item.text}
                    for item in item_def.field_notes.items
                ],
            }

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
            field_notes=field_notes_dict,
            is_profiling_only=item_def.is_profiling_only,  # Preserve profiling-only flag
        )
        db.add(checklist_item)

    # If this sub-indicator has children, recursively create them (it's a container node)
    for idx, nested_child in enumerate(sub_def.children, start=1):
        _seed_sub_indicator(nested_child, sub_indicator.id, governance_area_id, db, sort_order=idx)


def seed_indicators(
    indicators: list[Indicator], db: Session, effective_date: datetime = None
) -> None:
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

        # Recursively create sub-indicators (children and nested children) with sort_order
        for idx, child_def in enumerate(indicator_def.children, start=1):
            _seed_sub_indicator(
                child_def,
                parent.id,
                indicator_def.governance_area_id,
                db,
                sort_order=idx,
            )

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


def reseed_indicators(
    indicators: list[Indicator], db: Session, effective_date: datetime = None
) -> None:
    """
    Clear existing indicators and reseed from Python definitions.

    Args:
        indicators: List of Indicator dataclass instances
        db: SQLAlchemy database session
        effective_date: When this version became active (defaults to now)
    """
    clear_indicators(db)
    seed_indicators(indicators, db, effective_date)
