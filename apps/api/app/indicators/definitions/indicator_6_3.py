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

from app.indicators.base import ChecklistItem, Indicator, SubIndicator

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
                "Upload: EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on segregation of wastes at-source\n\n"
                "Please supply the required information:\n"
                "Date of approval"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="6_3_1_upload_1",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on segregation of wastes at-source",
                    mov_description="Verification of uploaded EO or similar issuance on segregation of wastes at-source",
                    required=True,
                    display_order=1,
                ),
                ChecklistItem(
                    id="6_3_1_date_of_approval",
                    label="Date of approval",
                    mov_description="Please supply the required information:",
                    item_type="date_input",
                    required=False,  # Date fields are for assessor review, not BLGU submission
                    display_order=2,
                ),
            ],
        ),
    ],
)
