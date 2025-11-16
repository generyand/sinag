"""
Indicator 2.1: Functionality of the Barangay Disaster Risk Reduction and Management Committee (BDRRMC)

Governance Area: 2 (Disaster Preparedness)
BBI Status: YES (This IS a BBI - BDRRMC)

Note: This indicator assesses the functionality of the BDRRMC based on four criteria:
structure, plan, budget allocation, and accomplishment reports.
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 2.1: BDRRMC Functionality (BBI)
INDICATOR_2_1 = Indicator(
    code="2.1",
    name="Functionality of the Barangay Disaster Risk Reduction and Management Committee (BDRRMC)",
    governance_area_id=2,  # Disaster Preparedness
    is_bbi=True,  # This IS a BBI indicator
    sort_order=1,
    description="Organized BDRRMC with its composition compliant to the provisions of NDRRMC, DILG, DBM, and CSC JMC No. 2014-01",
    children=[
        # Sub-Indicator 2.1.1: Structure
        SubIndicator(
            code="2.1.1",
            name="Structure: Organized BDRRMC with its composition compliant to the provisions of NDRRMC, DILG, DBM, and CSC JMC No. 2014-01",
            upload_instructions=(
                "Upload the following document:\n"
                "• EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) "
                "organizing the BDRRMC with its composition compliant to the provisions of JMC No. 2014-01, covering January to October 2023\n\n"
                "Please supply the required information:\n"
                "• Date of approval\n\n"
                "Minimum Composition of the BDRRMC:\n"
                "1. Punong Barangay\n"
                "2. A Representative from the Sangguniang Barangay\n"
                "3. Two (2) CSO representatives from the existing and active community-based people's organizations representing the most vulnerable "
                "and marginalized groups in the barangay (Item 5.7. of NDRRMC, DILG, DBM, and CSC JMC No. 2014-01)"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="2_1_1_eo",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the BDRRMC with its composition compliant to the provisions of JMC No. 2014-01, covering January to October 2023",
                    mov_description="Executive Order or similar issuance organizing BDRRMC with compliant composition",
                    required=True,
                    display_order=1
                ),
                ChecklistItem(
                    id="2_1_1_date",
                    label="Date of approval",
                    mov_description="Date when the EO/issuance was approved",
                    required=True,
                    requires_document_count=True,  # Using this to indicate input field needed
                    display_order=2
                ),
            ]
        ),

        # Sub-Indicator 2.1.2: Plan
        SubIndicator(
            code="2.1.2",
            name="Plan: Approved Barangay Disaster Risk Reduction and Management (BDRRM) Plan covering CY 2023, adopted by the Sangguniang Barangay",
            upload_instructions=(
                "Upload the following documents:\n"
                "• Approved BDRRM Plan adopted by the Sangguniang Barangay\n"
                "• Resolution adopting the BDRRM Plan signed by the Sangguniang Barangay with received stamp from the C/MDRRMO\n"
                "• Certification on the list of barangays with approved BDRRM Plan covering CY 2023 signed by the C/MDRRMO"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="2_1_2_plan",
                    label="Approved BDRRM Plan adopted by the Sangguniang Barangay",
                    mov_description="Approved BDRRM Plan covering CY 2023",
                    required=True,
                    display_order=1
                ),
                ChecklistItem(
                    id="2_1_2_resolution",
                    label="Resolution adopting the BDRRM Plan signed by the Sangguniang Barangay with received stamp from the C/MDRRMO",
                    mov_description="Resolution with C/MDRRMO stamp",
                    required=True,
                    display_order=2
                ),
                ChecklistItem(
                    id="2_1_2_certification",
                    label="Certification on the list of barangays with approved BDRRM Plan covering CY 2023 signed by the C/MDRRMO",
                    mov_description="Certification from C/MDRRMO listing barangays with approved plans",
                    required=True,
                    display_order=3
                ),
            ]
        ),

        # Sub-Indicator 2.1.3: Budget
        SubIndicator(
            code="2.1.3",
            name="Budget: Allocation of at least 5% of the Estimated Revenue from Regular Sources as BDRRM Fund",
            upload_instructions=(
                "Upload the following document:\n"
                "• Certification on the allocation of at least 5% of the Estimated Revenue from Regular Sources as BDRRM Fund, "
                "signed by the City/Municipal Budget Officer\n\n"
                "Please supply the following information:\n"
                "• Estimated revenue from regular sources\n"
                "• Amount of BDRRMF\n\n"
                "Note: To compute the allocation:\n"
                "(BDRRMF Allocated / Estimated Total Revenue from Regular Sources) x 100"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="2_1_3_certification",
                    label="Certification on the allocation of at least 5% of the Estimated Revenue from Regular Sources as BDRRM Fund, signed by the City/Municipal Budget Officer",
                    mov_description="Certification from City/Municipal Budget Officer on BDRRM Fund allocation",
                    required=True,
                    display_order=1
                ),
                ChecklistItem(
                    id="2_1_3_estimated_revenue",
                    label="Estimated revenue from regular sources",
                    mov_description="Input field for estimated revenue amount",
                    required=True,
                    requires_document_count=True,  # Using this to indicate numeric input needed
                    display_order=2
                ),
                ChecklistItem(
                    id="2_1_3_bdrrmf_amount",
                    label="Amount of BDRRMF",
                    mov_description="Input field for BDRRMF allocated amount",
                    required=True,
                    requires_document_count=True,  # Using this to indicate numeric input needed
                    display_order=3
                ),
            ]
        ),

        # Sub-Indicator 2.1.4: Accomplishment Reports
        SubIndicator(
            code="2.1.4",
            name="Accomplishment Reports: At least 50% accomplishment (physical OR financial)",
            upload_instructions=(
                "Upload ONE of the following report options:\n\n"
                "OPTION A - For Physical Accomplishment (2.1.4.1):\n"
                "• Accomplishment Report\n"
                "• Certification on the submission and correctness of Accomplishment Report signed by the C/MDRRMO\n\n"
                "Please supply the required information for Option A:\n"
                "• % of programs, project, and activities are completed\n\n"
                "To compute Physical Accomplishment Rate:\n"
                "(Total number of activities/projects accomplished / Total number of activities/projects reflected in the BDRRMP) x 100\n\n"
                "OR\n\n"
                "OPTION B - For Financial Accomplishment (2.1.4.2):\n"
                "• Annual LDRRMF Utilization Report\n"
                "• Certification on the submission and correctness of fund utilization report signed by the C/MDRRMO\n\n"
                "Please supply the required information for Option B:\n"
                "• Amount utilized (as of Dec. 31, 2023)\n"
                "• Amount allocated for FPAs in the BDRRM Plan for CY 2023\n\n"
                "To compute % utilization:\n"
                "(Total Amount Utilized of the 70% component of CY 2023 BDRRMF as of Dec 31, 2023) / "
                "(Total Amount Allocated for the 70% component of CY 2023 BDRRMF) x 100\n\n"
                "Note: Barangay officials have the option to submit both the physical and financial reports. "
                "However, for the SGLGB Assessment, only one of the above reports is required."
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # Only ONE option (A or B) is required
            checklist_items=[
                # Option A: Physical Accomplishment (2.1.4.1)
                ChecklistItem(
                    id="2_1_4_1_report",
                    label="a. At least 50% accomplishment of the physical targets in the BDRRM Plan - Accomplishment Report",
                    group_name="Option A: Physical Accomplishment (at least 50%)",
                    mov_description="Physical Accomplishment Report",
                    required=False,  # Not all required since it's ANY_ITEM_REQUIRED
                    display_order=1
                ),
                ChecklistItem(
                    id="2_1_4_1_certification",
                    label="Certification on the submission and correctness of Accomplishment Report signed by the C/MDRRMO (for Option A)",
                    group_name="Option A: Physical Accomplishment (at least 50%)",
                    mov_description="Certification from C/MDRRMO on Accomplishment Report",
                    required=False,
                    display_order=2
                ),
                ChecklistItem(
                    id="2_1_4_1_percentage",
                    label="% of programs, project, and activities are completed (for Option A)",
                    group_name="Option A: Physical Accomplishment (at least 50%)",
                    mov_description="Input field for percentage of completed programs/projects/activities",
                    required=False,
                    requires_document_count=True,  # Using this to indicate numeric input needed
                    display_order=3
                ),

                # Option B: Financial Accomplishment (2.1.4.2)
                ChecklistItem(
                    id="2_1_4_2_utilization_report",
                    label="b. At least 50% fund utilization of the 70% component of CY 2023 BDRRMF - Annual LDRRMF Utilization Report",
                    group_name="Option B: Financial Accomplishment (at least 50% fund utilization)",
                    mov_description="Annual LDRRMF Utilization Report",
                    required=False,
                    display_order=4
                ),
                ChecklistItem(
                    id="2_1_4_2_certification",
                    label="Certification on the submission and correctness of fund utilization report signed by the C/MDRRMO (for Option B)",
                    group_name="Option B: Financial Accomplishment (at least 50% fund utilization)",
                    mov_description="Certification from C/MDRRMO on fund utilization report",
                    required=False,
                    display_order=5
                ),
                ChecklistItem(
                    id="2_1_4_2_amount_utilized",
                    label="Amount utilized (as of Dec. 31, 2023) for Option B",
                    group_name="Option B: Financial Accomplishment (at least 50% fund utilization)",
                    mov_description="Input field for amount utilized as of Dec. 31, 2023",
                    required=False,
                    requires_document_count=True,  # Using this to indicate numeric input needed
                    display_order=6
                ),
                ChecklistItem(
                    id="2_1_4_2_amount_allocated",
                    label="Amount allocated for FPAs in the BDRRM Plan for CY 2023 (for Option B)",
                    group_name="Option B: Financial Accomplishment (at least 50% fund utilization)",
                    mov_description="Input field for amount allocated for FPAs",
                    required=False,
                    requires_document_count=True,  # Using this to indicate numeric input needed
                    display_order=7
                ),
            ]
        ),
    ]
)
