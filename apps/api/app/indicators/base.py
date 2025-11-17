"""
Base dataclasses for hard-coded SGLGB indicator definitions.

These dataclasses define the structure for indicators, sub-indicators, and checklist items
that will be defined in Python code and seeded into the database.
"""

from dataclasses import dataclass, field
from typing import List, Optional


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
    """
    id: str  # Unique identifier (e.g., "1_1_1_a")
    label: str  # Display text (e.g., "a. Barangay Financial Report")
    required: bool = True  # Required for indicator to pass
    item_type: str = "checkbox"  # Type of checklist item
    group_name: Optional[str] = None  # Group header (e.g., "ANNUAL REPORT")
    mov_description: Optional[str] = None  # Means of Verification description (right column)
    requires_document_count: bool = False  # DEPRECATED: Use item_type="document_count" instead
    display_order: int = 0  # Sort order within indicator


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
    checklist_items: List[ChecklistItem] = field(default_factory=list)  # Checklist items (for leaf nodes)
    children: List['SubIndicator'] = field(default_factory=list)  # Nested sub-indicators (for containers)
    upload_instructions: Optional[str] = None  # Instructions for BLGUs on what to upload (only for leaf nodes)
    validation_rule: Optional[str] = "ALL_ITEMS_REQUIRED"  # ALL_ITEMS_REQUIRED, ANY_ITEM_REQUIRED, CUSTOM (only for leaf nodes)


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
    children: List[SubIndicator]  # Sub-indicators
    is_bbi: bool = False  # Is this a BBI (Breakthrough and Best Initiative) indicator
    is_profiling_only: bool = False  # Is this indicator profiling-only (doesn't affect pass/fail)
    description: Optional[str] = None  # Optional description
    sort_order: int = 0  # Sort order within governance area
