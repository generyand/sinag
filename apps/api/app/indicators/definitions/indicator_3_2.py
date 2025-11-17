"""
Indicator 3.2: Functionality of the Barangay Peace and Order Committee (BPOC)

Governance Area: 3 (Safety, Peace and Order)
BBI Status: YES (This IS a BBI - BPOC)

Note: This indicator assesses the functionality of the BPOC based on three criteria:
structure, plan, and accomplishment reports.
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 3.2: BPOC Functionality (BBI)
INDICATOR_3_2 = Indicator(
    code="3.2",
    name="Functionality of the Barangay Peace and Order Committee (BPOC)",
    governance_area_id=3,  # Safety, Peace and Order
    is_bbi=True,  # This IS a BBI indicator
    sort_order=2,
    description="Organized BPOC with its composition compliant to the provisions of EO No. 366, s. of 1996",
    children=[
        # Sub-Indicator 3.2.1: Structure
        SubIndicator(
            code="3.2.1",
            name="Structure: Organized BPOC with its composition compliant to the provisions of EO No. 366, s. of 1996",
            upload_instructions=(
                "Upload the following:\n\n"
                "1. EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) "
                "indicating correct membership in accordance to the EO 366 s. of 1996, covering January to October 2023\n\n"
                "The BPOC must include the following minimum composition:\n"
                "- Punong Barangay\n"
                "- Sangguniang Kabataan Chairperson\n"
                "- A member of the Lupon Tagapamayapa\n"
                "- A Public School Teacher\n"
                "- PNP Officer\n"
                "- A representative of the Interfaith Group\n"
                "- A Senior Citizen\n"
                "- At least three (3) members of the existing Barangay-Based Anti-Crime or Neighborhood Watch Groups or an NGO representative\n"
                "- A Barangay Tanod\n\n"
                "Please also supply the required information:\n"
                "Date of approval"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Simplified checklist - only 1 checkbox for the main EO requirement
                ChecklistItem(
                    id="3_2_1_upload",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) indicating correct membership in accordance to the EO 366 s. of 1996, covering January to October 2023",
                    mov_description="Verification of uploaded Executive Order or similar issuance organizing BPOC with compliant composition",
                    item_type="checkbox",
                    required=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="3_2_1_date_of_approval",
                    label="Date of approval for the EO or similar issuance",
                    mov_description="Please supply the required information:",
                    item_type="document_count",
                    required=False,
                    display_order=2
                ),
            ]
        ),

        # Sub-Indicator 3.2.2: Plan
        SubIndicator(
            code="3.2.2",
            name="Plan: Formulated Barangay Peace and Order and Public Safety (BPOPS) Plan in accordance to DILG MC 2017-142 covering CY 2023",
            upload_instructions=(
                "Upload: Approved BPOPS Plan, covering CY 2023"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Upload Verification
                ChecklistItem(
                    id="3_2_2_upload_1",
                    label="Approved BPOPS Plan, covering CY 2023",
                    mov_description="Verification of uploaded Approved Barangay Peace and Order and Public Safety Plan covering CY 2023",
                    required=True,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 3.2.3: Accomplishment Reports
        SubIndicator(
            code="3.2.3",
            name="Accomplishment Reports: At least 50% accomplishment (physical OR financial)",
            upload_instructions=(
                "Upload: Accomplishment Report with the status of implementation of target activities and utilization of funds "
                "submitted to the C/M POC with received stamp of the DILG City Director or C/MLGOO\n\n"
                "3.2.3.1. At least 50% accomplishment of the physical targets in the BPOPS Plan\n\n"
                "OR\n\n"
                "3.2.3.2. At least 50% fund utilization rate of the CY 2023 BPOPs Budget\n\n"
                "Note: Barangay officials have the option to submit both the physical and financial reports. "
                "However, for the SGLGB Assessment, only one of the above documents is required."
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # Only ONE option (A or B) is required
            checklist_items=[
                # Instruction Section
                ChecklistItem(
                    id="3_2_3_instructions",
                    label="Instruction: Put a check ✓ on the box that corresponds to your assessment.",
                    mov_description="Instructions for assessor",
                    required=False,
                    display_order=1
                ),

                # Option A: Physical Accomplishment (3.2.3.1)
                ChecklistItem(
                    id="3_2_3_1_checkbox",
                    label="a. At least 50% accomplishment of the physical targets in the BPOPS Plan",
                    mov_description="Checkbox for physical accomplishment option",
                    required=False,
                    display_order=2
                ),
                ChecklistItem(
                    id="3_2_3_1_upload",
                    label="Accomplishment Report with the status of implementation of target activities and utilization of funds submitted to the C/M POC with received stamp of the DILG City Director or C/MLGOO",
                    mov_description="Verification of uploaded Accomplishment Report for physical accomplishment",
                    required=False,
                    display_order=3
                ),
                ChecklistItem(
                    id="3_2_3_1_percentage",
                    label="Please supply the required information:\n% of programs, project, and activities are completed",
                    mov_description="Input field for percentage of completed programs/projects/activities",
                    required=False,
                    requires_document_count=True,  # This is a text input field
                    display_order=4
                ),

                # OR Separator (informational)
                ChecklistItem(
                    id="3_2_3_or_separator",
                    label="OR",
                    mov_description="OR separator between physical and financial options",
                    required=False,
                    display_order=5
                ),

                # Option B: Financial Accomplishment (3.2.3.2)
                ChecklistItem(
                    id="3_2_3_2_checkbox",
                    label="b. At least 50% fund utilization rate of the CY 2023 BPOPs Budget",
                    mov_description="Checkbox for financial accomplishment option",
                    required=False,
                    display_order=6
                ),
                ChecklistItem(
                    id="3_2_3_2_upload",
                    label="Accomplishment Report with the status of implementation of target activities and utilization of funds submitted to the C/M POC with received stamp of the DILG City Director or C/MLGOO",
                    mov_description="Verification of uploaded Accomplishment Report for financial accomplishment",
                    required=False,
                    display_order=7
                ),
                ChecklistItem(
                    id="3_2_3_2_amount_utilized",
                    label="Please supply the required information:\nAmount utilized\n(as of Dec. 31, 2023):",
                    mov_description="Input field for amount utilized as of Dec. 31, 2023",
                    required=False,
                    requires_document_count=True,  # This is a text input field
                    display_order=8
                ),
                ChecklistItem(
                    id="3_2_3_2_amount_allocated",
                    label="Amount allocated for FPAs in the BPOPS Plan for CY 2023:",
                    mov_description="Input field for amount allocated for FPAs in BPOPS Plan",
                    required=False,
                    requires_document_count=True,  # This is a text input field
                    display_order=9
                ),
            ]
        ),
    ]
)
