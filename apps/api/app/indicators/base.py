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
    """
    id: str  # Unique identifier (e.g., "1_1_1_a")
    label: str  # Display text (e.g., "a. Barangay Financial Report")
    required: bool = True  # Required for indicator to pass
    group_name: Optional[str] = None  # Group header (e.g., "ANNUAL REPORT")
    mov_description: Optional[str] = None  # Means of Verification description (right column)
    requires_document_count: bool = False  # Needs document count input from validator
    display_order: int = 0  # Sort order within indicator


@dataclass
class SubIndicator:
    """
    Represents a sub-indicator (leaf node) with a checklist.

    Examples:
    - 1.1.1: "Posted the following CY 2023 financial documents in the BFDP board"
    - 1.1.2: "Accomplished and signed BFR with received stamp"
    """
    code: str  # Sub-indicator code (e.g., "1.1.1")
    name: str  # Sub-indicator name
    checklist_items: List[ChecklistItem]  # Checklist items for this sub-indicator
    upload_instructions: Optional[str] = None  # Instructions for BLGUs on what to upload
    validation_rule: str = "ALL_ITEMS_REQUIRED"  # ALL_ITEMS_REQUIRED, ANY_ITEM_REQUIRED, CUSTOM


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
