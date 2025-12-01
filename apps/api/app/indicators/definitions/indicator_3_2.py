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
                "Upload:\n"
                "- (PHYSICAL or/and FINANCIAL) Accomplishment Report with the status of implementation of target activities and utilization of funds "
                "submitted to the C/M POC with received stamp of the DILG City Director or C/MLGOO"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",  # Single upload field required
            checklist_items=[
                # Single shared upload field for PHYSICAL or/and FINANCIAL
                ChecklistItem(
                    id="3_2_3_upload",
                    label="(PHYSICAL or/and FINANCIAL) Accomplishment Report with the status of implementation of target activities and utilization of funds submitted to the C/M POC with received stamp of the DILG City Director or C/MLGOO",
                    mov_description="Verification of uploaded Accomplishment Report (PHYSICAL or/and FINANCIAL)",
                    item_type="checkbox",
                    required=True,
                    display_order=1
                ),
                # Option A: Physical Accomplishment - YES/NO assessment
                ChecklistItem(
                    id="3_2_3_option_a",
                    label="a. At least 50% accomplishment of the physical targets in the BPOPS Plan",
                    mov_description="Checkbox for physical accomplishment option",
                    item_type="assessment_field",
                    required=False,
                    display_order=2
                ),
                ChecklistItem(
                    id="3_2_3_physical_accomplished",
                    label="Total number of activities/projects accomplished",
                    mov_description="Please supply the required information:",
                    item_type="calculation_field",
                    required=False,
                    display_order=3
                ),
                ChecklistItem(
                    id="3_2_3_physical_reflected",
                    label="Total number of activities/projects reflected in the Plan",
                    mov_description="Please supply the required information:",
                    item_type="calculation_field",
                    required=False,
                    display_order=4
                ),

                # OR Separator (info_text)
                ChecklistItem(
                    id="3_2_3_or",
                    label="OR",
                    mov_description="OR",
                    item_type="info_text",
                    required=False,
                    display_order=5
                ),

                # Option B: Financial Accomplishment - YES/NO assessment
                ChecklistItem(
                    id="3_2_3_option_b",
                    label="b. At least 50% fund utilization rate of the CY 2023 BPOPs Budget",
                    mov_description="Checkbox for financial accomplishment option",
                    item_type="assessment_field",
                    required=False,
                    display_order=6
                ),
                ChecklistItem(
                    id="3_2_3_financial_utilized",
                    label="Total amount utilized (as of Dec. 31, 2023)",
                    mov_description="Please supply the required information:",
                    item_type="calculation_field",
                    required=False,
                    display_order=8.1
                ),
                ChecklistItem(
                    id="3_2_3_financial_allocated",
                    label="Total amount allocated for FPAs in the BPOPS Plan for CY 2023",
                    mov_description="Please supply the required information:",
                    item_type="calculation_field",
                    required=False,
                    display_order=8.2
                ),
            ]
        ),
    ]
)
