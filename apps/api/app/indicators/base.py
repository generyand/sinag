"""
Base dataclasses for hard-coded SGLGB indicator definitions.

These dataclasses define the structure for indicators, sub-indicators, and checklist items
that will be defined in Python code and seeded into the database.
"""

from dataclasses import dataclass, field


@dataclass
class FieldNotes:
    """
    Notes that appear below a specific checklist item field.

    Example:
        FieldNotes(
            title="Note:",
            items=[
                NoteItem(text="The CIR contains data protected by the Data Privacy Act...")
            ]
        )
    """

    items: list["NoteItem"]  # List of note items
    title: str = "Note:"  # Title for the notes section


@dataclass
class ChecklistItem:
    """
    Represents a single checklist item within an indicator's MOV checklist.

    Examples:
    - "a. Barangay Financial Report"
    - "f. List of Notices of Award (1st - 3rd Quarter)"

    Item Types:
    - checkbox: Regular checkbox for document verification
    - info_text: Instructional text (no input control)
    - assessment_field: YES/NO radio buttons for validator assessment
    - document_count: Number input for document counting
    - calculation_field: Input field for calculated values (amount, percentage, etc.)
    - date_input: Date picker input for approval dates, etc.
    """

    id: str  # Unique identifier (e.g., "1_1_1_a")
    label: str  # Display text (e.g., "a. Barangay Financial Report")
    required: bool = True  # Required for indicator to pass
    item_type: str = "checkbox"  # Type of checklist item
    group_name: str | None = None  # Group header (e.g., "ANNUAL REPORT")
    mov_description: str | None = None  # Means of Verification description (right column)
    requires_document_count: bool = False  # DEPRECATED: Use item_type="document_count" instead
    display_order: int = 0  # Sort order within indicator
    option_group: str | None = None  # Option group for OR logic (e.g., "Option A", "Option B")
    field_notes: FieldNotes | None = None  # Notes displayed below this field


@dataclass
class NoteItem:
    """
    Represents a single note item with optional label prefix.

    Examples:
    - NoteItem(label="a)", text="Barangay Financial Report")
    - NoteItem(text="Some note without a label")
    """

    text: str  # Note text content
    label: str | None = None  # Optional label prefix (e.g., "a)", "1.")


@dataclass
class FormNotes:
    """
    Notes section for the form with title and items.

    Example:
        FormNotes(
            title="Note:",
            items=[
                NoteItem(label="a)", text="Barangay Financial Report"),
                NoteItem(label="b)", text="Barangay Budget"),
            ]
        )
    """

    items: list[NoteItem]  # List of note items
    title: str = "Note:"  # Title for the notes section


@dataclass
class SubIndicator:
    """
    Represents a sub-indicator (can be a leaf node with checklist OR a container with children).

    Examples:
    - Leaf node (has checklist): 1.1.1, 1.1.2
    - Container node (has children): 1.6.1 (parent of 1.6.1.1, 1.6.1.2, 1.6.1.3)

    A SubIndicator can either:
    - Have checklist_items (leaf node with actual data)
    - Have children (container node for organization)
    - Not both (one or the other)
    """

    code: str  # Sub-indicator code (e.g., "1.1.1" or "1.6.1")
    name: str  # Sub-indicator name
    checklist_items: list[ChecklistItem] = field(
        default_factory=list
    )  # Checklist items (for leaf nodes)
    children: list["SubIndicator"] = field(
        default_factory=list
    )  # Nested sub-indicators (for containers)
    upload_instructions: str | None = (
        None  # Instructions for BLGUs on what to upload (only for leaf nodes)
    )
    validation_rule: str | None = (
        "ALL_ITEMS_REQUIRED"  # ALL_ITEMS_REQUIRED, ANY_ITEM_REQUIRED, CUSTOM (only for leaf nodes)
    )
    notes: FormNotes | None = None  # Optional notes section displayed below form fields
    is_profiling_only: bool = (
        False  # Is this sub-indicator profiling-only (doesn't affect pass/fail)
    )


@dataclass
class Indicator:
    """
    Represents a parent indicator with child sub-indicators.

    Examples:
    - 1.1: "Compliance with the Barangay Full Disclosure Policy (BFDP)"
    - 1.2: "Compliance with Bottom-Up Budgeting (BUB)"
    """

    code: str  # Indicator code (e.g., "1.1")
    name: str  # Indicator name
    governance_area_id: int  # Foreign key to governance_areas table
    children: list[SubIndicator]  # Sub-indicators
    is_bbi: bool = False  # Is this a BBI (Breakthrough and Best Initiative) indicator
    is_profiling_only: bool = False  # Is this indicator profiling-only (doesn't affect pass/fail)
    description: str | None = None  # Optional description
    sort_order: int = 0  # Sort order within governance area
