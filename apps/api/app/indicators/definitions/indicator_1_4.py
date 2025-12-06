"""
Indicator 1.4: Allocation for Statutory Programs and Projects as Mandated by Laws and/or Other Issuances

Governance Area: 1 (Financial Administration and Sustainability)
BBI Status: No (This is NOT a BBI)

Note: This indicator assesses whether the barangay has properly allocated funds
for mandatory statutory programs as required by law.
"""

from app.indicators.base import (
    ChecklistItem,
    FormNotes,
    Indicator,
    NoteItem,
    SubIndicator,
)

# Indicator 1.4: Allocation for Statutory Programs
INDICATOR_1_4 = Indicator(
    code="1.4",
    name="Allocation for Statutory Programs and Projects as Mandated by Laws and/or Other Issuances",
    governance_area_id=1,  # Financial Administration and Sustainability
    is_bbi=False,
    sort_order=4,
    description="With allocated funds for the following statutory programs and projects",
    children=[
        # Sub-Indicator 1.4.1
        SubIndicator(
            code="1.4.1",
            name="With allocated funds for the following statutory programs and projects",
            upload_instructions=(
                "Upload the following documents:\n"
                "1. Approved Barangay Appropriation Ordinance\n"
                "2. Annual Investment Program signed by Barangay Treasurer, Barangay Secretary, and Punong Barangay\n"
                "3. Certification for the Allocation for Statutory Programs and Projects signed by the City/Municipal Budget Officer"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Upload Verification Section
                ChecklistItem(
                    id="1_4_1_upload_1",
                    label="Approved Barangay Appropriation Ordinance",
                    mov_description="Verification of uploaded Approved Barangay Appropriation Ordinance",
                    required=True,
                    display_order=1,
                ),
                ChecklistItem(
                    id="1_4_1_date_of_approval",
                    label="Date of Approval",
                    mov_description="Please supply the required information",
                    required=True,
                    item_type="date_input",
                    display_order=2,
                ),
                # Statutory Allocation Requirements (a-f)
                ChecklistItem(
                    id="1_4_1_a",
                    label="At least 20% of the NTA is allocated for development programs",
                    mov_description="Verification that at least 20% of the National Tax Allotment (NTA) is allocated for development programs",
                    required=True,
                    display_order=3,
                ),
                ChecklistItem(
                    id="1_4_1_b",
                    label="Not less than five percent (5%) shall be set aside at the Local Disaster Risk Reduction and Management Fund",
                    mov_description="Verification that at least 5% is allocated for LDRRM Fund",
                    required=True,
                    display_order=4,
                ),
                ChecklistItem(
                    id="1_4_1_c",
                    label="Gender and Development",
                    mov_description="Verification of allocation for Gender and Development programs",
                    required=True,
                    display_order=5,
                ),
                ChecklistItem(
                    id="1_4_1_d",
                    label="Senior Citizens and Persons with Disabilities",
                    mov_description="Verification of allocation for Senior Citizens and Persons with Disabilities programs",
                    required=True,
                    display_order=6,
                ),
                ChecklistItem(
                    id="1_4_1_e",
                    label="Implementation of the programs of the Local Councils for the Protection of Children",
                    mov_description="Verification of allocation for LCPC programs",
                    required=True,
                    display_order=7,
                ),
                ChecklistItem(
                    id="1_4_1_f",
                    label="Ten percent (10%) for the Sangguniang Kabataan",
                    mov_description="Verification that 10% is allocated for Sangguniang Kabataan",
                    required=True,
                    display_order=8,
                ),
                # Additional Upload Verification
                ChecklistItem(
                    id="1_4_1_upload_2",
                    label="Annual Investment Program signed by Barangay Treasurer, Barangay Secretary, and Punong Barangay",
                    mov_description="Verification of uploaded Annual Investment Program with required signatures",
                    required=True,
                    display_order=9,
                ),
                ChecklistItem(
                    id="1_4_1_upload_3",
                    label="Certification for the Allocation for Statutory Programs and Projects signed by the City/Municipal Budget Officer",
                    mov_description="Verification of uploaded Certification from City/Municipal Budget Officer",
                    required=True,
                    display_order=10,
                ),
            ],
            notes=FormNotes(
                title="Allocated funds for:",
                items=[
                    NoteItem(
                        label="a)",
                        text="At least 20% of the NTA is allocated for development programs;",
                    ),
                    NoteItem(
                        label="b)",
                        text="Not less than five percent (5%) shall be set aside as the Local Disaster Risk Reduction and Management Fund;",
                    ),
                    NoteItem(label="c)", text="Gender and Development;"),
                    NoteItem(
                        label="d)",
                        text="Senior Citizens and Persons with Disabilities;",
                    ),
                    NoteItem(
                        label="e)",
                        text="Implementation of the programs of the Local Councils for the Protection of Children; and",
                    ),
                    NoteItem(
                        label="f)",
                        text="Ten percent (10%) for the Sangguniang Kabataan",
                    ),
                ],
            ),
        ),
    ],
)
