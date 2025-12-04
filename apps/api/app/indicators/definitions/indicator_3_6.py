"""
Indicator 3.6: Conduct of Monthly Barangay Road Clearing Operations (BaRCO)

Governance Area: 3 (Safety, Peace and Order)
BBI Status: NO (This is NOT a BBI)

Note: This indicator assesses the conduct of monthly Barangay Road Clearing Operations
through submission of monthly BaRCO reports.
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 3.6: Conduct of Monthly Barangay Road Clearing Operations (BaRCO)
INDICATOR_3_6 = Indicator(
    code="3.6",
    name="Conduct of Monthly Barangay Road Clearing Operations (BaRCO)",
    governance_area_id=3,  # Safety, Peace and Order
    is_bbi=False,
    sort_order=6,
    description="Assessment of monthly Barangay Road Clearing Operations through BaRCO report submissions",
    children=[
        # Sub-Indicator 3.6.1: Conducted BaRCO on a monthly basis
        SubIndicator(
            code="3.6.1",
            name="Conducted BaRCO on a monthly basis in CY 2023",
            upload_instructions=(
                "Upload: Three (3) Monthly BaRCo Reports covering July-September 2023"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Upload Verification
                ChecklistItem(
                    id="3_6_1_upload_1",
                    label="Monthly BaRCo Reports covering July-September 2023",
                    mov_description="Verification of uploaded Monthly BaRCo Reports covering July-September 2023",
                    required=True,
                    display_order=1
                ),
                # Text Input Field
                ChecklistItem(
                    id="3_6_1_count",
                    label="Monthly BaRCo Reports were submitted",
                    mov_description="Please supply the number of documents submitted:",
                    required=True,
                    requires_document_count=True,  # This is a text input field
                    display_order=2
                ),
            ]
        ),
    ]
)
