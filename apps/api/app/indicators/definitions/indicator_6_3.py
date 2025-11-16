"""
Indicator 6.3: Provision of Support Mechanisms for Segregated Collection

Governance Area: 6 (Environmental Management)
BBI Status: No (This is NOT a BBI)

IMPORTANT NOTES FOR PHASE 9 (VALIDATION SERVICE):

1. One Sub-Indicator Structure:
   - 6.3.1: Enacted Barangay Ordinance or similar issuance on segregation of wastes at-source

2. Input Fields Required:
   - Sub-indicator 6.3.1: DATE input (Date of approval for ordinance/resolution)

3. Validation Workflow:
   - Validator verifies enacted ordinance/resolution on segregation of wastes at-source
   - Validator inputs date of approval
   - Simple compliance check

4. Document Requirements:
   - Sub-indicator 6.3.1: EO or similar issuance (signed by PB, Barangay Secretary and SBMs)
   - Must be on segregation of wastes at-source
   - Must be properly enacted and approved

5. Legal Basis:
   - RA 9003 (Ecological Solid Waste Management Act of 2000)
   - Related environmental regulations on waste segregation at source
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 6.3: Provision of Support Mechanisms for Segregated Collection
INDICATOR_6_3 = Indicator(
    code="6.3",
    name="Provision of Support Mechanisms for Segregated Collection",
    governance_area_id=6,  # Environmental Management
    is_bbi=False,  # NOT a BBI
    sort_order=3,
    description="Provision of Support Mechanisms for Segregated Collection",
    children=[
        # Sub-Indicator 6.3.1
        SubIndicator(
            code="6.3.1",
            name="Enacted Barangay Ordinance or similar issuance on segregation of wastes at-source",
            upload_instructions=(
                "Upload documentation of enacted ordinance on waste segregation:\n\n"
                "REQUIRED DOCUMENT:\n"
                "- EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs)\n"
                "- Must be on segregation of wastes at-source\n\n"
                "REQUIREMENTS:\n"
                "- Document must be an Executive Order or similar official issuance\n"
                "- Must be signed by:\n"
                "  * Punong Barangay (PB)\n"
                "  * Barangay Secretary\n"
                "  * Sangguniang Barangay Members (SBMs)\n"
                "- Ordinance/resolution must establish segregation of wastes at-source\n"
                "- Document must be properly enacted and approved\n\n"
                "VALIDATOR INPUT REQUIRED:\n"
                "- Date of approval for the ordinance/resolution\n\n"
                "LEGAL BASIS:\n"
                "- RA 9003 (Ecological Solid Waste Management Act of 2000)\n"
                "- Waste segregation at source is a key requirement for solid waste management\n\n"
                "IMPORTANT:\n"
                "- All required signatures must be present\n"
                "- Ordinance must clearly establish waste segregation at-source\n"
                "- Date of approval must be provided by validator"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="6_3_1_a",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on segregation of wastes at-source",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Executive Order (EO), resolution, or ordinance is present\n"
                        "   - Document is on segregation of wastes at-source\n\n"
                        "2. DATE INPUT REQUIRED:\n"
                        "   - Validator must input the DATE OF APPROVAL\n"
                        "   - This is a required input field\n\n"
                        "3. SIGNATURE VERIFICATION:\n"
                        "   - Document is signed by the Punong Barangay (PB)\n"
                        "   - Document is signed by the Barangay Secretary\n"
                        "   - Document is signed by Sangguniang Barangay Members (SBMs)\n"
                        "   - All signatures are clearly visible\n\n"
                        "4. CONTENT VERIFICATION:\n"
                        "   - Ordinance/resolution establishes segregation of wastes at-source\n"
                        "   - Waste segregation mechanisms are defined\n"
                        "   - Provisions for implementation are included\n"
                        "   - Ordinance is properly enacted and authorized\n\n"
                        "5. COMPLIANCE VERIFICATION:\n"
                        "   - Ordinance complies with RA 9003\n"
                        "   - Waste segregation at-source is clearly mandated\n"
                        "   - Support mechanisms for segregated collection are established\n\n"
                        "NOTE: Date of approval must be input by validator.\n"
                        "All required signatures must be present for ordinance to be valid.\n"
                        "Ordinance must clearly establish segregation of wastes at-source."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),
    ]
)
