"""
Indicator 5.3: Issuance of Barangay Clearance not covered by DILG MC No. 2019-177

Governance Area: 5 (Business-Friendliness and Competitiveness)
BBI Status: NO (This is NOT a BBI)

Note: This indicator assesses the presence of a Citizens' Charter on the issuance of
barangay clearance not covered by DILG MC No. 2019-177 (such as: residency, indigency, etc.)
within seven (7) working days.
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 5.3: Issuance of Barangay Clearance not covered by DILG MC No. 2019-177
INDICATOR_5_3 = Indicator(
    code="5.3",
    name="Issuance of Barangay Clearance not covered by DILG MC No. 2019-177 such as: residency, indigency, etc, within seven (7) working days",
    governance_area_id=5,  # Business-Friendliness and Competitiveness
    is_bbi=False,
    sort_order=3,
    description="Assessment of presence of a Citizens' Charter on the issuance of barangay clearance not covered by DILG MC No. 2019-177 such as: residency, indigency, etc, within seven (7) working days",
    children=[
        # Sub-Indicator 5.3.1: Presence of a Citizens' Charter
        SubIndicator(
            code="5.3.1",
            name="Presence of a Citizens' Charter on the issuance of barangay clearance posted in the barangay hall",
            upload_instructions=(
                "Upload the following document:\n\n"
                "• Photo documentation of the Citizens' Charter on the issuance of barangay clearance only "
                "(name of the barangay should be visible)\n\n"
                "Photo Requirements:\n"
                "• One (1) photo with Distant View; and\n"
                "• One (1) photo with Close-up View"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="5_3_1_photo",
                    label="Photo documentation of the Citizens' Charter on the issuance of barangay clearance only (name of the barangay should be visible)",
                    mov_description="Photo documentation of the Citizens' Charter on the issuance of barangay clearance only (name of the barangay should be visible)",
                    required=True,
                    display_order=1
                ),
            ]
        ),
    ]
)
