"""
Indicator 4.7: Maintenance of Updated Record of Barangay Inhabitants (RBIs)

Governance Area: 4 (Social Protection and Sensitivity)
BBI Status: No (RBI maintenance is a record-keeping requirement, NOT a barangay-based institution)

IMPORTANT NOTES FOR PHASE 9 (VALIDATION SERVICE):

1. One Sub-Indicator Structure:
   - 4.7.1: Presence of updated RBI for the first (1st) semester of CY 2023

2. Input Fields Required:
   - None (no percentage or amount inputs)

3. Year Dependency:
   - Sub-indicator 4.7.1: RBI must cover the first (1st) semester of CY 2023
   - Future assessments may need to update this baseline year

4. Validation Workflow:
   - Validator verifies presence of RBI Monitoring Form C
   - Validator confirms list of barangays with RBI covering 1st Semester of CY 2023
   - List must be generated from BIS-BPS and certified by the C/MLGOO
   - Both checklist items must be present for sub-indicator to pass

5. Document Requirements:
   - RBI Monitoring Form C
   - List of barangays with RBI (from BIS-BPS system)
   - List must be certified by C/MLGOO (City/Municipal Local Government Operations Officer)
   - Coverage: 1st Semester of CY 2023
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 4.7: Maintenance of Updated Record of Barangay Inhabitants (RBIs)
INDICATOR_4_7 = Indicator(
    code="4.7",
    name="Maintenance of Updated Record of Barangay Inhabitants (RBIs)",
    governance_area_id=4,  # Social Protection and Sensitivity
    is_bbi=False,  # RBI maintenance is NOT a BBI
    sort_order=7,
    description="Maintenance of Updated Record of Barangay Inhabitants (RBIs)",
    children=[
        # Sub-Indicator 4.7.1
        SubIndicator(
            code="4.7.1",
            name="Presence of updated RBI for the first (1st) semester of CY 2023",
            upload_instructions=(
                "Upload the following documents:\n"
                "1. RBI Monitoring Form C, and\n"
                "2. List of barangays with RBI covering the 1st Semester (generated from the BIS-BPS) certified by the C/MLGOO"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_7_1_a",
                    label="RBI Monitoring Form C",
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_7_1_b",
                    label="List of barangays with RBI covering the 1st Semester (generated from the BIS-BPS) certified by the C/MLGOO",
                    required=True,
                    requires_document_count=False,
                    display_order=2
                ),
            ]
        ),
    ]
)
