"""
Indicator 1.1: Compliance with the Barangay Full Disclosure Policy (BFDP)

Governance Area: 1 (Financial Administration and Sustainability)
BBI Status: No (BFDP is a policy compliance requirement, NOT a barangay-based institution)
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 1.1: BFDP Compliance
INDICATOR_1_1 = Indicator(
    code="1.1",
    name="Compliance with the Barangay Full Disclosure Policy (BFDP)",
    governance_area_id=1,  # Financial Administration and Sustainability
    is_bbi=False,  # BFDP is NOT a BBI - it's a policy compliance requirement
    sort_order=1,
    description="Posted the following CY 2023 financial documents in the BFDP board, pursuant to DILG MC No. 2014-81 and DILG MC No. 2022-027",
    children=[
        # Sub-Indicator 1.1.1
        SubIndicator(
            code="1.1.1",
            name="Posted the following CY 2023 financial documents in the BFDP board",
            upload_instructions=(
                "Upload the following documents:\n"
                "1. BFDP Monitoring Form A of the DILG Advisory (covering 1st - 3rd quarter monitoring data)\n"
                "2. Two (2) Photo Documentation of the BFDP board clearly showing:\n"
                "   - Name of the barangay\n"
                "   - Posted financial documents\n"
                "   - Date visible (if possible)"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # ANNUAL REPORT Group
                ChecklistItem(
                    id="1_1_1_a",
                    label="a. Barangay Financial Report",
                    group_name="ANNUAL REPORT",
                    mov_description="Barangay Financial Report for CY 2023",
                    required=True,
                    display_order=1
                ),
                ChecklistItem(
                    id="1_1_1_b",
                    label="b. Barangay Budget",
                    group_name="ANNUAL REPORT",
                    mov_description="Barangay Budget for CY 2023",
                    required=True,
                    display_order=2
                ),
                ChecklistItem(
                    id="1_1_1_c",
                    label="c. Summary of Income and Expenditures",
                    group_name="ANNUAL REPORT",
                    mov_description="Summary of Income and Expenditures for CY 2023",
                    required=True,
                    display_order=3
                ),
                ChecklistItem(
                    id="1_1_1_d",
                    label="d. 20% Component of the NTA Utilization",
                    group_name="ANNUAL REPORT",
                    mov_description="20% Component of the NTA Utilization for CY 2023",
                    required=True,
                    display_order=4
                ),
                ChecklistItem(
                    id="1_1_1_e",
                    label="e. Annual Procurement Plan or Procurement List",
                    group_name="ANNUAL REPORT",
                    mov_description="Annual Procurement Plan OR Procurement List (either one is acceptable)",
                    required=True,
                    display_order=5
                ),
                # QUARTERLY REPORT Group
                ChecklistItem(
                    id="1_1_1_f",
                    label="f. List of Notices of Award (1st - 3rd Quarter of CY 2023)",
                    group_name="QUARTERLY REPORT",
                    mov_description="List of Notices of Award (1st - 3rd Quarter of CY 2023)",
                    required=True,
                    requires_document_count=True,  # Validator enters count
                    display_order=6
                ),
                # MONTHLY REPORT Group
                ChecklistItem(
                    id="1_1_1_g",
                    label="g. Itemized Monthly Collections and Disbursements (January to September 2023)",
                    group_name="MONTHLY REPORT",
                    mov_description="Itemized Monthly Collections and Disbursements (January to September 2023)",
                    required=True,
                    requires_document_count=True,  # Validator enters count
                    display_order=7
                ),
            ]
        ),
        # Sub-Indicator 1.1.2
        SubIndicator(
            code="1.1.2",
            name="Accomplished and signed BFR with received stamp from the Office of the C/M Accountant",
            upload_instructions=(
                "Upload: Annex B of DBM-DOF-DILG Joint Memorandum Circular (JMC) No. 2018-1\n"
                "(Accomplished and signed BFR with received stamp from the Office of the City/Municipal Accountant)"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="1_1_2_a",
                    label="Annex B of DBM-DOF-DILG JMC No. 2018-1",
                    mov_description="Accomplished and signed BFR with received stamp from the Office of the C/M Accountant",
                    required=True,
                    display_order=1
                ),
            ]
        ),
    ]
)
