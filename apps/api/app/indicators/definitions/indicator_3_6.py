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
                "Upload the following documents:\n\n"
                "• Three (3) Monthly BaRCO Reports covering July-September 2023\n\n"
                "Please supply the required information:\n"
                "• Number of Monthly BaRCO Reports submitted"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_6_1_reports",
                    label="Monthly BaRCO Reports covering July-September 2023",
                    mov_description="Three (3) Monthly BaRCO Reports covering July-September 2023",
                    required=True,
                    display_order=1
                ),
                ChecklistItem(
                    id="3_6_1_count",
                    label="Number of Monthly BaRCO Reports submitted",
                    mov_description="Input field for number of Monthly BaRCO Reports submitted",
                    required=True,
                    requires_document_count=True,  # Requires numeric input
                    display_order=2
                ),
            ]
        ),
    ]
)
