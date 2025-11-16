"""
Indicator 5.2: Compliance to Section 11 of RA 11032 or the Ease of Doing Business Law

Governance Area: 5 (Business-Friendliness and Competitiveness)
BBI Status: No (This is NOT a BBI)

IMPORTANT NOTES FOR PHASE 9 (VALIDATION SERVICE):

1. Two Sub-Indicators Structure:
   - 5.2.1: Enacted Barangay Ordinance relative to Barangay Clearance fees on business permit and locational clearance for building permit pursuant to DILG MC No. 2019-177
   - 5.2.2: Approved resolution authorizing the City/Municipal Treasurer to collect fees for Barangay Clearance for Business permit and locational clearance purposes pursuant to DILG MC No. 2019-177

2. Input Fields Required:
   - No DATE, PERCENTAGE, or AMOUNT inputs required
   - Simple checklist validation only

3. Validation Workflow:
   - Validator verifies enacted ordinance for barangay clearance fees (5.2.1)
   - Validator confirms approved resolution authorizing C/M Treasurer to collect fees (5.2.2)
   - Both sub-indicators must be present for indicator to be considered complete

4. Document Requirements:
   - Sub-indicator 5.2.1: Enacted Barangay Ordinance (signed by PB, Barangay Secretary and SBMs)
   - Sub-indicator 5.2.2: Approved resolution (signed by PB, Barangay Secretary and SBMs)

5. Legal Basis:
   - RA 11032 (Ease of Doing Business and Efficient Government Service Delivery Act of 2018)
   - DILG MC No. 2019-177 (Guidelines on the implementation of Section 11 of RA 11032)
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 5.2: Compliance to Section 11 of RA 11032 or the Ease of Doing Business Law
INDICATOR_5_2 = Indicator(
    code="5.2",
    name="Compliance to Section 11 of RA 11032 or the Ease of Doing Business Law",
    governance_area_id=5,  # Business-Friendliness and Competitiveness
    is_bbi=False,  # NOT a BBI
    sort_order=2,
    description="Compliance to Section 11 of RA 11032 or the Ease of Doing Business Law",
    children=[
        # Sub-Indicator 5.2.1
        SubIndicator(
            code="5.2.1",
            name="Enacted Barangay Ordinance relative to Barangay Clearance fees on business permit and locational clearance for building permit pursuant to DILG MC No. 2019-177",
            upload_instructions=(
                "Upload: Enacted Barangay Ordinance (signed by the PB, Barangay Secretary and SBMs) relative to Barangay Clearance fees on business permit and locational clearance for building permit"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="5_2_1_a",
                    label="Enacted Barangay Ordinance (signed by the PB, Barangay Secretary and SBMs) relative to Barangay Clearance fees on business permit and locational clearance for building permit",
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 5.2.2
        SubIndicator(
            code="5.2.2",
            name="Approved resolution authorizing the City/Municipal Treasurer to collect fees for Barangay Clearance for Business permit and locational clearance purposes pursuant to DILG MC No. 2019-177",
            upload_instructions=(
                "Upload: Approved resolution authorizing the City/Municipal Treasurer to collect fees for Barangay Clearance for Business permit and locational clearance purposes signed by PB, Barangay Secretary and SBMs"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="5_2_2_a",
                    label="Approved resolution authorizing the City/Municipal Treasurer to collect fees for Barangay Clearance for Business permit and locational clearance purposes signed by PB, Barangay Secretary and SBMs",
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),
    ]
)
