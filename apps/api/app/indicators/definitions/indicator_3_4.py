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
                "Upload the following:\n\n"
                "1. EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) "
                "on the organization of the Barangay Tanod covering January to October 2023\n\n"
                "The Barangay Tanod must include the following composition:\n"
                "- Chief Tanod/Executive Officer\n"
                "- Team Leaders\n"
                "- Team Members\n\n"
                "Please also supply the required information:\n"
                "Date of approval"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_4_1_eo",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the organization of the Barangay Tanod covering January to October 2023",
                    mov_description="Verification that the EO/issuance creates Barangay Tanod with proper composition",
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="3_4_1_comp_chief",
                    label="Chief Tanod/Executive Officer",
                    mov_description="Verify Chief Tanod/Executive Officer is listed in the composition",
                    required=True,
                    requires_document_count=False,
                    display_order=2
                ),
                ChecklistItem(
                    id="3_4_1_comp_leaders",
                    label="Team Leaders",
                    mov_description="Verify Team Leaders are listed in the composition",
                    required=True,
                    requires_document_count=False,
                    display_order=3
                ),
                ChecklistItem(
                    id="3_4_1_comp_members",
                    label="Team Members",
                    mov_description="Verify Team Members are listed in the composition",
                    required=True,
                    requires_document_count=False,
                    display_order=4
                ),
                ChecklistItem(
                    id="3_4_1_date",
                    label="Date of approval",
                    mov_description="Date when the EO/issuance was approved",
                    required=True,
                    requires_document_count=True,  # Date input field
                    display_order=5
                ),
            ]
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
                    display_order=1
                ),
            ]
        ),
    ]
)
