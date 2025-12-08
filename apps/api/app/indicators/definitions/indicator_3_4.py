"""
Indicator 3.4: Organization and Strengthening Capacities of Barangay Tanod

Governance Area: 3 (Safety, Peace and Order)
BBI Status: NO (This is NOT a BBI)

Note: This indicator assesses the organization and capacity building of Barangay Tanod
through structure and training compliance.
"""

from app.indicators.base import (
    ChecklistItem,
    FormNotes,
    Indicator,
    NoteItem,
    SubIndicator,
)

# Indicator 3.4: Organization and Strengthening Capacities of Barangay Tanod
INDICATOR_3_4 = Indicator(
    code="3.4",
    name="Organization and Strengthening Capacities of Barangay Tanod",
    governance_area_id=3,  # Safety, Peace and Order
    is_bbi=False,
    sort_order=4,
    description="Assessment of Barangay Tanod organization and capacity strengthening through structure and training",
    children=[
        # Sub-Indicator 3.4.1: Structure
        SubIndicator(
            code="3.4.1",
            name="Structure: Organized Barangay Tanod with its composition compliant to the provisions of DILG MC No. 2003-42 covering {JAN_TO_OCT_CURRENT_YEAR}",
            upload_instructions=(
                "Upload the following:\n\n"
                "1. EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) "
                "on the organization of the Barangay Tanod covering {JAN_TO_OCT_CURRENT_YEAR}\n\n"
                "Please also supply the required information:\n"
                "Date of approval"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Simplified checklist - only 1 checkbox for the main EO requirement
                ChecklistItem(
                    id="3_4_1_upload",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the organization of the Barangay Tanod covering {JAN_TO_OCT_CURRENT_YEAR}",
                    mov_description="Verification that the EO/issuance creates Barangay Tanod with proper composition",
                    item_type="checkbox",
                    required=False,
                    display_order=1,
                ),
                ChecklistItem(
                    id="3_4_1_date",
                    label="Date of approval",
                    mov_description="Please supply the required information:",
                    item_type="date_input",
                    required=False,
                    display_order=2,
                ),
            ],
            notes=FormNotes(
                title="Composition of the Barangay Tanod:",
                items=[
                    NoteItem(label="1.", text="Chief Tanod/Executive Officer"),
                    NoteItem(label="2.", text="Team Leaders"),
                    NoteItem(label="3.", text="Team Members"),
                ],
            ),
        ),
        # Sub-Indicator 3.4.2: Trainings
        SubIndicator(
            code="3.4.2",
            name="Trainings: Attendance of barangay tanod to necessary training not earlier than 2020",
            upload_instructions=(
                "Upload: At least one (1) copy of proof of training such as Certificate of Completion and/or Participation"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_4_2_training",
                    label="At least one (1) copy of proof of training such as Certificate of Completion and/or Participation",
                    required=True,
                    requires_document_count=False,
                    display_order=1,
                ),
            ],
        ),
    ],
)
