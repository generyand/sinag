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
                "Upload the following document:\n\n"
                "• EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) "
                "indicating correct membership in accordance to the EO 366 s. of 1996, covering January to October 2023\n\n"
                "Please supply the required information:\n"
                "• Date of approval\n\n"
                "Minimum composition of the BPOC:\n"
                "1. Punong Barangay\n"
                "2. Sangguniang Kabataan Chairperson\n"
                "3. A member of the Lupon Tagapamayapa\n"
                "4. A Public School Teacher\n"
                "5. PNP Officer\n"
                "6. A representative of the Interfaith Group\n"
                "7. A Senior Citizen\n"
                "8. At least three (3) members of the existing Barangay-Based Anti-Crime or Neighborhood Watch Groups or an NGO representative\n"
                "9. A Barangay Tanod"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_2_1_eo",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) indicating correct membership in accordance to the EO 366 s. of 1996, covering January to October 2023",
                    mov_description="Executive Order or similar issuance organizing BPOC with compliant composition",
                    required=True,
                    display_order=1
                ),
                ChecklistItem(
                    id="3_2_1_date",
                    label="Date of approval",
                    mov_description="Date when the EO/issuance was approved",
                    required=True,
                    requires_document_count=True,  # Using this to indicate input field needed
                    display_order=2
                ),
            ]
        ),

        # Sub-Indicator 3.2.2: Plan
        SubIndicator(
            code="3.2.2",
            name="Plan: Formulated Barangay Peace and Order and Public Safety (BPOPS) Plan in accordance to DILG MC 2017-142 covering CY 2023",
            upload_instructions=(
                "Upload the following document:\n\n"
                "• Approved BPOPS Plan, covering CY 2023"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_2_2_plan",
                    label="Approved BPOPS Plan, covering CY 2023",
                    mov_description="Approved Barangay Peace and Order and Public Safety Plan covering CY 2023",
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
                "Upload ONE of the following report options:\n\n"
                "OPTION A - For Physical Accomplishment (3.2.3.1):\n"
                "• Accomplishment Report with the status of implementation of target activities and utilization of funds "
                "submitted to the C/M POC with received stamp of the DILG City Director or C/MLGOO\n\n"
                "Please supply the required information for Option A:\n"
                "• % of programs, project, and activities are completed\n\n"
                "To compute Physical Accomplishment Rate:\n"
                "(Total number of activities/projects accomplished / Total number of activities/projects reflected in the BPOPS Plan) x 100\n\n"
                "OR\n\n"
                "OPTION B - For Financial Accomplishment (3.2.3.2):\n"
                "• Accomplishment Report with the status of implementation of target activities and utilization of funds "
                "submitted to the C/M POC with received stamp of the DILG City Director or C/MLGOO\n\n"
                "Please supply the required information for Option B:\n"
                "• Amount utilized (as of Dec. 31, 2023)\n"
                "• Amount allocated for FPAs in the BPOPS Plan for CY 2023\n\n"
                "To compute % utilization:\n"
                "(Total Amount Utilized) / (Total Amount Allocated) x 100\n\n"
                "Note: Barangay officials have the option to submit both the physical and financial reports. "
                "However, for the SGLGB Assessment, only one of the above documents is required."
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # Only ONE option (A or B) is required
            checklist_items=[
                # Option A: Physical Accomplishment (3.2.3.1)
                ChecklistItem(
                    id="3_2_3_1_report",
                    label="a. At least 50% accomplishment of the physical targets in the BPOPS Plan",
                    group_name="Option A: Physical Accomplishment (at least 50%)",
                    mov_description="Accomplishment Report with status of implementation submitted to C/M POC with DILG stamp",
                    required=False,  # Not all required since it's ANY_ITEM_REQUIRED
                    display_order=1
                ),
                ChecklistItem(
                    id="3_2_3_1_percentage",
                    label="% of programs, project, and activities are completed (for Option A)",
                    group_name="Option A: Physical Accomplishment (at least 50%)",
                    mov_description="Input field for percentage of completed programs/projects/activities",
                    required=False,
                    requires_document_count=True,  # Using this to indicate numeric input needed
                    display_order=2
                ),

                # Option B: Financial Accomplishment (3.2.3.2)
                ChecklistItem(
                    id="3_2_3_2_report",
                    label="b. At least 50% fund utilization rate of the CY 2023 BPOPs Budget",
                    group_name="Option B: Financial Accomplishment (at least 50% fund utilization)",
                    mov_description="Accomplishment Report with status of implementation and utilization submitted to C/M POC with DILG stamp",
                    required=False,
                    display_order=3
                ),
                ChecklistItem(
                    id="3_2_3_2_amount_utilized",
                    label="Amount utilized (as of Dec. 31, 2023) for Option B",
                    group_name="Option B: Financial Accomplishment (at least 50% fund utilization)",
                    mov_description="Input field for amount utilized as of Dec. 31, 2023",
                    required=False,
                    requires_document_count=True,  # Using this to indicate numeric input needed
                    display_order=4
                ),
                ChecklistItem(
                    id="3_2_3_2_amount_allocated",
                    label="Amount allocated for FPAs in the BPOPS Plan for CY 2023 (for Option B)",
                    group_name="Option B: Financial Accomplishment (at least 50% fund utilization)",
                    mov_description="Input field for amount allocated for FPAs in BPOPS Plan",
                    required=False,
                    requires_document_count=True,  # Using this to indicate numeric input needed
                    display_order=5
                ),
            ]
        ),
    ]
)
