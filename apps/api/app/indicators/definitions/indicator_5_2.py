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
                "Upload documentation of enacted barangay ordinance:\n\n"
                "REQUIRED DOCUMENT:\n"
                "- Enacted Barangay Ordinance relative to Barangay Clearance fees on business permit and locational clearance for building permit\n\n"
                "REQUIREMENTS:\n"
                "- Ordinance must be enacted and approved\n"
                "- Must be signed by:\n"
                "  * Punong Barangay (PB)\n"
                "  * Barangay Secretary\n"
                "  * Sangguniang Barangay Members (SBMs)\n"
                "- Ordinance must be pursuant to DILG MC No. 2019-177\n"
                "- Must cover Barangay Clearance fees for:\n"
                "  * Business permit\n"
                "  * Locational clearance for building permit\n\n"
                "LEGAL BASIS:\n"
                "- Section 11 of RA 11032 (Ease of Doing Business and Efficient Government Service Delivery Act of 2018)\n"
                "- DILG MC No. 2019-177\n\n"
                "IMPORTANT:\n"
                "- All required signatures must be present\n"
                "- Ordinance must clearly state fees for barangay clearance\n"
                "- Must comply with DILG MC No. 2019-177 guidelines"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="5_2_1_a",
                    label="Enacted Barangay Ordinance (signed by the PB, Barangay Secretary and SBMs) relative to Barangay Clearance fees on business permit and locational clearance for building permit",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Enacted Barangay Ordinance is present\n"
                        "   - Ordinance is properly enacted and approved\n\n"
                        "2. SIGNATURE VERIFICATION:\n"
                        "   - Ordinance is signed by the Punong Barangay (PB)\n"
                        "   - Ordinance is signed by the Barangay Secretary\n"
                        "   - Ordinance is signed by Sangguniang Barangay Members (SBMs)\n"
                        "   - All signatures are clearly visible\n\n"
                        "3. CONTENT VERIFICATION:\n"
                        "   - Ordinance is relative to Barangay Clearance fees\n"
                        "   - Covers fees for business permit\n"
                        "   - Covers fees for locational clearance for building permit\n"
                        "   - Pursuant to DILG MC No. 2019-177\n\n"
                        "4. COMPLIANCE VERIFICATION:\n"
                        "   - Ordinance complies with Section 11 of RA 11032\n"
                        "   - Ordinance follows DILG MC No. 2019-177 guidelines\n"
                        "   - Fees are clearly stated and reasonable\n\n"
                        "NOTE: All required signatures must be present for ordinance to be valid.\n"
                        "Ordinance must clearly establish fees for barangay clearance for business permits and locational clearance."
                    ),
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
                "Upload documentation of approved resolution:\n\n"
                "REQUIRED DOCUMENT:\n"
                "- Approved resolution authorizing the City/Municipal Treasurer to collect fees\n"
                "- Must be signed by Punong Barangay, Barangay Secretary and SBMs\n\n"
                "REQUIREMENTS:\n"
                "- Resolution must be approved by the Sangguniang Barangay\n"
                "- Must authorize City/Municipal Treasurer to collect fees\n"
                "- Must be signed by:\n"
                "  * Punong Barangay (PB)\n"
                "  * Barangay Secretary\n"
                "  * Sangguniang Barangay Members (SBMs)\n"
                "- Resolution must be pursuant to DILG MC No. 2019-177\n"
                "- Must cover fees for:\n"
                "  * Barangay Clearance for Business permit\n"
                "  * Locational clearance purposes\n\n"
                "LEGAL BASIS:\n"
                "- Section 11 of RA 11032 (Ease of Doing Business and Efficient Government Service Delivery Act of 2018)\n"
                "- DILG MC No. 2019-177\n\n"
                "IMPORTANT:\n"
                "- All required signatures must be present\n"
                "- Resolution must clearly authorize C/M Treasurer to collect fees\n"
                "- Must comply with DILG MC No. 2019-177 guidelines"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="5_2_2_a",
                    label="Approved resolution authorizing the City/Municipal Treasurer to collect fees for Barangay Clearance for Business permit and locational clearance purposes signed by PB, Barangay Secretary and SBMs",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Approved resolution is present\n"
                        "   - Resolution is properly approved by Sangguniang Barangay\n\n"
                        "2. SIGNATURE VERIFICATION:\n"
                        "   - Resolution is signed by the Punong Barangay (PB)\n"
                        "   - Resolution is signed by the Barangay Secretary\n"
                        "   - Resolution is signed by Sangguniang Barangay Members (SBMs)\n"
                        "   - All signatures are clearly visible\n\n"
                        "3. AUTHORIZATION VERIFICATION:\n"
                        "   - Resolution authorizes City/Municipal Treasurer\n"
                        "   - Authorization is to collect fees for Barangay Clearance\n"
                        "   - Covers fees for Business permit\n"
                        "   - Covers fees for locational clearance purposes\n"
                        "   - Pursuant to DILG MC No. 2019-177\n\n"
                        "4. COMPLIANCE VERIFICATION:\n"
                        "   - Resolution complies with Section 11 of RA 11032\n"
                        "   - Resolution follows DILG MC No. 2019-177 guidelines\n"
                        "   - Authorization is clear and properly documented\n\n"
                        "NOTE: All required signatures must be present for resolution to be valid.\n"
                        "Resolution must clearly authorize C/M Treasurer to collect fees for barangay clearance."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),
    ]
)
