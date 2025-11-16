"""
Indicator 4.6: Mechanism for Gender and Development (GAD)

Governance Area: 4 (Social Protection and Sensitivity)
BBI Status: NO (This is NOT a BBI)

Note: This indicator assesses the establishment of a Barangay GAD Focal Point System
through the organization and designation of a GAD focal point.
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 4.6: Mechanism for Gender and Development (GAD)
INDICATOR_4_6 = Indicator(
    code="4.6",
    name="Mechanism for Gender and Development (GAD)",
    governance_area_id=4,  # Social Protection and Sensitivity
    is_bbi=False,
    sort_order=6,
    description="Assessment of GAD mechanism through the establishment of a Barangay GAD Focal Point System",
    children=[
        # Sub-Indicator 4.6.1: Organized Barangay GAD Focal Point System
        SubIndicator(
            code="4.6.1",
            name="Organized Barangay GAD Focal Point System",
            upload_instructions=(
                "Upload: EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the Barangay GAD Focal Point System covering January to October 2023\n\n"
                "Please supply the required information:\n"
                "Date of approval"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_6_1_upload_1",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the Barangay GAD Focal Point System covering January to October 2023",
                    mov_description="Verification of uploaded EO or similar issuance organizing the Barangay GAD Focal Point System covering January to October 2023",
                    required=True,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_6_1_date_of_approval",
                    label="Date of approval",
                    mov_description="Date of approval for the GAD Focal Point System",
                    required=True,
                    requires_document_count=True,
                    display_order=2
                ),
            ]
        ),
    ]
)
