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
                "Upload: EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the BDRRMC with its composition compliant to the provisions of JMC No. 2014-01, covering January to October 2023\n\n"
                "Minimum Composition of the BDRRMC:\n"
                "- Punong Barangay\n"
                "- A Representative from the Sangguniang Barangay; and\n"
                "- Two (2) CSO representatives from the existing and active community-based people's organizations representing the most vulnerable and marginalized groups in the barangay (Item 5.7. of NDRRMC, DILG, DBM, and CSC JMC No. 2014-01)\n\n"
                "Please supply the required information:\n"
                "Date of approval"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="2_1_1_eo",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the BDRRMC with its composition compliant to the provisions of JMC No. 2014-01, covering January to October 2023",
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="2_1_1_date",
                    label="Date of approval",
                    required=True,
                    requires_document_count=True,  # Date input field
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
                "1. Approved BDRRM Plan adopted by the Sangguniang Barangay\n"
                "2. Resolution adopting the BDRRM Plan signed by the Sangguniang Barangay with received stamp from the C/MDRRMO; and\n"
                "3. Certification on the list of barangays with approved BDRRM Plan covering CY 2023 signed by the C/MDRRMO"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="2_1_2_plan",
                    label="Approved BDRRM Plan adopted by the Sangguniang Barangay",
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="2_1_2_resolution",
                    label="Resolution adopting the BDRRM Plan signed by the Sangguniang Barangay with received stamp from the C/MDRRMO",
                    required=True,
                    requires_document_count=False,
                    display_order=2
                ),
                ChecklistItem(
                    id="2_1_2_certification",
                    label="Certification on the list of barangays with approved BDRRM Plan covering CY 2023 signed by the C/MDRRMO",
                    required=True,
                    requires_document_count=False,
                    display_order=3
                ),
            ]
        ),

        # Sub-Indicator 2.1.3: Budget
        SubIndicator(
            code="2.1.3",
            name="Budget: Allocation of at least 5% of the Estimated Revenue from Regular Sources as BDRRM Fund",
            upload_instructions=(
                "Upload: Certification on the allocation of at least 5% of the Estimated Revenue from Regular Sources as BDRRM Fund, signed by the City/Municipal Budget Officer\n\n"
                "To compute % allocation for BDRRMF:\n"
                "(BDRRMF Allocated / Estimated Total Revenue from Regular Sources) x 100\n\n"
                "Please supply the following information:\n"
                "Estimated revenue from regular sources:\n"
                "Amount of BDRRMF:"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="2_1_3_certification",
                    label="Certification on the allocation of at least 5% of the Estimated Revenue from Regular Sources as BDRRM Fund, signed by the City/Municipal Budget Officer",
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="2_1_3_estimated_revenue",
                    label="Estimated revenue from regular sources",
                    required=True,
                    requires_document_count=True,  # Amount input
                    display_order=2
                ),
                ChecklistItem(
                    id="2_1_3_bdrrmf_amount",
                    label="Amount of BDRRMF",
                    required=True,
                    requires_document_count=True,  # Amount input
                    display_order=3
                ),
            ]
        ),

        # Sub-Indicator 2.1.4: Accomplishment Reports
        SubIndicator(
            code="2.1.4",
            name="Accomplishment Reports: At least 50% accomplishment (physical OR financial)",
            upload_instructions=(
                "Upload based on your chosen option (only ONE option is required):\n\n"
                "1. (Option A: Physical) Accomplishment Report\n"
                "2. (Option A: Physical) Certification on the submission and correctness of Accomplishment Report signed by the C/MDRRMO\n"
                "3. (Option B: Financial) Annual LDRRMF Utilization Report\n"
                "4. (Option B: Financial) Certification on the submission and correctness of fund utilization report signed by the C/MDRRMO\n\n"
                "Note: Choose either Option A (upload fields 1 & 2) OR Option B (upload fields 3 & 4). Only ONE option is required."
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # Only ONE option (A or B) is required
            checklist_items=[
                # Option A: Physical Accomplishment (with YES/NO assessment)
                ChecklistItem(
                    id="2_1_4_option_a",
                    label="a. At least 50% accomplishment of the physical targets in the BDRRM Plan",
                    mov_description="Option A label - informational only",
                    item_type="assessment_field",
                    required=False,
                    display_order=2
                ),
                ChecklistItem(
                    id="2_1_4_upload_1",
                    label="Accomplishment Report, and",
                    mov_description="Verification of uploaded Accomplishment Report",
                    item_type="checkbox",
                    required=False,
                    display_order=3
                ),
                ChecklistItem(
                    id="2_1_4_upload_2",
                    label="Certification on the submission and correctness of Accomplishment Report signed by the C/MDRRMO",
                    mov_description="Verification of uploaded Certification on the submission and correctness of Accomplishment Report",
                    item_type="checkbox",
                    required=False,
                    display_order=4
                ),
                ChecklistItem(
                    id="2_1_4_calculation_a",
                    label="% of programs, project, and activities are completed",
                    mov_description="Please supply the required information:",
                    item_type="calculation_field",
                    required=False,
                    display_order=5
                ),

                # OR Separator (informational)
                ChecklistItem(
                    id="2_1_4_or_separator",
                    label="OR",
                    mov_description="OR separator between physical and financial options",
                    item_type="info_text",
                    required=False,
                    display_order=6
                ),

                # Option B: Financial Accomplishment (with YES/NO assessment)
                ChecklistItem(
                    id="2_1_4_option_b",
                    label="b. At least 50% fund utilization of the 70% component of CY 2023 BDRRMF - Preparedness component as of December 31, 2023.",
                    mov_description="Option B label - informational only",
                    item_type="assessment_field",
                    required=False,
                    display_order=7
                ),
                ChecklistItem(
                    id="2_1_4_upload_3",
                    label="Annual LDRRMF Utilization Report, and",
                    mov_description="Verification of uploaded Annual LDRRMF Utilization Report",
                    item_type="checkbox",
                    required=False,
                    display_order=8
                ),
                ChecklistItem(
                    id="2_1_4_upload_4",
                    label="Certification on the submission and correctness of fund utilization report signed by the C/MDRRMO",
                    mov_description="Verification of uploaded Certification on the submission and correctness of fund utilization report",
                    item_type="checkbox",
                    required=False,
                    display_order=9
                ),
                ChecklistItem(
                    id="2_1_4_calculation_b1",
                    label="Amount utilized (as of Dec. 31, 2023):",
                    mov_description="Please supply the required information:",
                    item_type="calculation_field",
                    required=False,
                    display_order=10.1
                ),
                ChecklistItem(
                    id="2_1_4_calculation_b2",
                    label="Amount allocated for PPAs in the BDRRM Plan for CY 2023:",
                    mov_description="Please supply the required information:",
                    item_type="calculation_field",
                    required=False,
                    display_order=10.2
                ),
            ]
        ),
    ]
)
