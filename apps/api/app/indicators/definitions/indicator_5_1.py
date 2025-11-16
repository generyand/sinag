"""
Indicator 5.1: Power to Levy Other Taxes, Fees or Charges

Governance Area: 5 (Business-Friendliness and Competitiveness)
BBI Status: NO (This is NOT a BBI)

Note: This indicator assesses the barangay's power to levy taxes, fees, or charges
pursuant to Section 129 of the Local Government Code.
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 5.1: Power to Levy Other Taxes, Fees or Charges
INDICATOR_5_1 = Indicator(
    code="5.1",
    name="Power to Levy Other Taxes, Fees or Charges",
    governance_area_id=5,  # Business-Friendliness and Competitiveness
    is_bbi=False,
    sort_order=1,
    description="Assessment of barangay's power to levy other taxes, fees or charges pursuant to Section 129 of the LGC",
    children=[
        # Sub-Indicator 5.1.1: Enacted Barangay Tax Ordinance
        SubIndicator(
            code="5.1.1",
            name="Enacted Barangay Tax Ordinance pursuant to Sec. 129 of the LGC",
            upload_instructions=(
                "Upload: Enacted Barangay Tax Ordinance signed by the PB, Barangay Secretary and SBMs"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="5_1_1_upload_1",
                    label="Enacted Barangay Tax Ordinance signed by the PB, Barangay Secretary and SBMs",
                    mov_description="Verification of uploaded Enacted Barangay Tax Ordinance signed by the PB, Barangay Secretary and SBMs",
                    required=True,
                    display_order=1
                ),
            ]
        ),
    ]
)
