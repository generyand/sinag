"""
Indicator 1.1: Compliance with the Barangay Full Disclosure Policy (BFDP)

Governance Area: 1 (Financial Administration and Sustainability)
BBI Status: No (BFDP is a policy compliance requirement, NOT a barangay-based institution)
"""

from app.indicators.base import (
    ChecklistItem,
    FormNotes,
    Indicator,
    NoteItem,
    SubIndicator,
)

# Indicator 1.1: BFDP Compliance
INDICATOR_1_1 = Indicator(
    code="1.1",
    name="Compliance with the Barangay Full Disclosure Policy (BFDP)",
    governance_area_id=1,  # Financial Administration and Sustainability
    is_bbi=False,  # BFDP is NOT a BBI - it's a policy compliance requirement
    sort_order=1,
    description="Posted the following financial documents in the BFDP board, pursuant to DILG MC No. 2014-81 and DILG MC No. 2022-027",
    children=[
        # Sub-Indicator 1.1.1
        SubIndicator(
            code="1.1.1",
            name="Posted the following {CY_CURRENT_YEAR} financial documents in the BFDP board",
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
                # Top-level MOV items - BFDP Form checkbox
                ChecklistItem(
                    id="1_1_1_bfdp_form",
                    label="Three (3) BFDP Monitoring Form A of the DILG Advisory covering the 1st to 3rd quarter monitoring data signed by the City Director/C/MLGOO, Punong Barangay and Barangay Secretary",
                    mov_description=None,
                    required=True,
                    display_order=1,
                ),
                # Document count input - right after BFDP Form checkbox
                ChecklistItem(
                    id="1_1_1_bfdp_count",
                    label="BFDP Monitoring Form A were submitted",
                    mov_description="Please supply the number of documents submitted:",
                    item_type="document_count",
                    required=True,
                    display_order=2,
                ),
                # Photo documentation checkbox
                ChecklistItem(
                    id="1_1_1_photo_docs",
                    label="Two (2) Photo Documentation of the BFDP board showing the name of the barangay",
                    mov_description="Photos must clearly show the BFDP board with barangay name and posted documents",
                    required=True,
                    display_order=3,
                ),
                # ANNUAL REPORT Group - starts with "a. Barangay Financial Report"
                ChecklistItem(
                    id="1_1_1_a",
                    label="a. Barangay Financial Report",
                    group_name="ANNUAL REPORT",
                    mov_description="Barangay Financial Report",
                    required=True,
                    display_order=4,
                ),
                ChecklistItem(
                    id="1_1_1_b",
                    label="b. Barangay Budget",
                    mov_description="Barangay Budget",
                    required=True,
                    display_order=5,
                ),
                ChecklistItem(
                    id="1_1_1_c",
                    label="c. Summary of Income and Expenditures",
                    mov_description="Summary of Income and Expenditures",
                    required=True,
                    display_order=6,
                ),
                ChecklistItem(
                    id="1_1_1_d",
                    label="d. 20% Component of the NTA Utilization",
                    mov_description="20% Component of the NTA Utilization",
                    required=True,
                    display_order=7,
                ),
                ChecklistItem(
                    id="1_1_1_e",
                    label="e. Annual Procurement Plan or Procurement List",
                    mov_description="Annual Procurement Plan OR Procurement List (either one is acceptable)",
                    required=True,
                    display_order=8,
                ),
                # QUARTERLY REPORT Group - checkbox first, then count field
                ChecklistItem(
                    id="1_1_1_f",
                    label="f. List of Notices of Award (1st - 3rd Quarter)",
                    group_name="QUARTERLY REPORT",
                    mov_description="List of Notices of Award (1st - 3rd Quarter)",
                    required=True,
                    display_order=9,
                ),
                ChecklistItem(
                    id="1_1_1_f_count",
                    label="List of Notices of Award were submitted",
                    mov_description="Please supply the number of documents submitted",
                    item_type="document_count",
                    required=True,
                    display_order=10,
                ),
                # MONTHLY REPORT Group - checkbox first, then count field
                ChecklistItem(
                    id="1_1_1_g",
                    label="g. Itemized Monthly Collections and Disbursements (January to September)",
                    group_name="MONTHLY REPORT",
                    mov_description="Itemized Monthly Collections and Disbursements (January to September)",
                    required=True,
                    display_order=11,
                ),
                ChecklistItem(
                    id="1_1_1_g_count",
                    label="Itemized Monthly Collections and Disbursements were submitted",
                    mov_description="Please supply the number of documents submitted",
                    item_type="document_count",
                    required=True,
                    display_order=12,
                ),
            ],
            notes=FormNotes(
                title="Note:",
                items=[
                    NoteItem(label="a)", text="Barangay Financial Report"),
                    NoteItem(label="b)", text="Barangay Budget"),
                    NoteItem(label="c)", text="Summary of Income and Expenditures"),
                    NoteItem(label="d)", text="20% CoUtilization"),
                    NoteItem(label="e)", text="Annual Procurement Plan or Procurement List"),
                    NoteItem(label="f)", text="List of Notices of Award (1st - 3rd Quarter)"),
                    NoteItem(
                        label="g)",
                        text="Itemized Monthly Collections and Disbursements (January to September)",
                    ),
                ],
            ),
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
                    display_order=1,
                ),
            ],
        ),
    ],
)
