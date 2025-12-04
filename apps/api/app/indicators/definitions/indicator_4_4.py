"""
Indicator 4.4: Implementation of the Kasambahay Law

Governance Area: 4 (Social Protection and Sensitivity)
BBI Status: NO (This is NOT a BBI)

Note: This indicator assesses the implementation of the Kasambahay Law through
the establishment of a Kasambahay Desk and maintenance of a Kasambahay Masterlist.
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 4.4: Implementation of the Kasambahay Law
INDICATOR_4_4 = Indicator(
    code="4.4",
    name="Implementation of the Kasambahay Law",
    governance_area_id=4,  # Social Protection and Sensitivity
    is_bbi=False,
    sort_order=4,
    description="Assessment of Kasambahay Law implementation through desk establishment and masterlist maintenance",
    children=[
        # Sub-Indicator 4.4.1: Presence of Kasambahay Desk with designated KDO
        SubIndicator(
            code="4.4.1",
            name="Presence of Kasambahay Desk with designated Kasambahay Desk Officer (KDO)",
            upload_instructions=(
                "Upload: EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) designating a KDO to manage the Kasambahay Desk, signed by the PB, Barangay Secretary and SBMs covering January to October 2023"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_4_1_eo",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) designating a KDO to manage the Kasambahay Desk, signed by the PB, Barangay Secretary and SBMs covering January to October 2023",
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.4.2: Maintenance/updating of a Kasambahay Masterlist
        SubIndicator(
            code="4.4.2",
            name="Maintenance/updating of a Kasambahay Masterlist",
            upload_instructions=(
                "Upload: Copy of the Updated Kasambahay Report for the 3rd Quarter (July-September 2023)\n\n"
                "Please supply the number of documents submitted:\n"
                "_____ Kasambahay Reports were submitted"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_4_2_report",
                    label="Copy of the Updated Kasambahay Report for the 3rd Quarter (July-September 2023)",
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_4_2_count",
                    label="Kasambahay reports were submitted",
                    mov_description="Please supply the number of documents submitted:",
                    item_type="document_count",
                    required=True,
                    display_order=2
                ),
            ]
        ),
    ]
)
