"""
Indicator 3.4: Organization and Strengthening Capacities of Barangay Tanod

Governance Area: 3 (Safety, Peace and Order)
BBI Status: NO (This is NOT a BBI)

Note: This indicator assesses the organization and capacity building of Barangay Tanod
through structure and training compliance.
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


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
            name="Structure: Organized Barangay Tanod with its composition compliant to the provisions of DILG MC No. 2003-42",
            upload_instructions=(
                "Upload the following document:\n\n"
                "• EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) "
                "on the organization of the Barangay Tanod covering January to October 2023\n\n"
                "Please supply the required information:\n"
                "• Date of approval\n\n"
                "Composition of a Barangay Tanod:\n"
                "1. Chief Tanod/Executive Officer\n"
                "2. Team Leaders\n"
                "3. Team Members"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_4_1_eo",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the organization of the Barangay Tanod covering January to October 2023",
                    mov_description="Executive Order or similar issuance organizing Barangay Tanod with compliant composition",
                    required=True,
                    display_order=1
                ),
                ChecklistItem(
                    id="3_4_1_date",
                    label="Date of approval",
                    mov_description="Date when the EO/issuance was approved",
                    required=True,
                    requires_document_count=True,  # Using this to indicate input field needed
                    display_order=2
                ),
            ]
        ),

        # Sub-Indicator 3.4.2: Trainings
        SubIndicator(
            code="3.4.2",
            name="Trainings: Attendance of barangay tanod to necessary training not earlier than 2020",
            upload_instructions=(
                "Upload the following document:\n\n"
                "• At least one (1) copy of proof of training such as Certificate of Completion and/or Participation"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_4_2_training",
                    label="At least one (1) copy of proof of training such as Certificate of Completion and/or Participation",
                    mov_description="Proof of training attendance (Certificate of Completion/Participation) dated not earlier than 2020",
                    required=True,
                    display_order=1
                ),
            ]
        ),
    ]
)
