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
                "Upload documentation of updated RBI for the first semester of CY 2023:\n\n"
                "REQUIRED DOCUMENTS:\n"
                "1. RBI Monitoring Form C\n"
                "2. List of barangays with RBI covering the 1st Semester of CY 2023\n\n"
                "REQUIREMENTS:\n"
                "- RBI Monitoring Form C must be submitted\n"
                "- List of barangays with RBI must be present\n"
                "- List must cover the 1st Semester of CY 2023\n"
                "- List must be generated from the BIS-BPS (Barangay Information System - Barangay Profiling System)\n"
                "- List must be certified by the C/MLGOO (City/Municipal Local Government Operations Officer)\n\n"
                "IMPORTANT:\n"
                "- Both documents are required\n"
                "- RBI must be updated for the first semester of CY 2023\n"
                "- C/MLGOO certification is mandatory for the barangay list"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_7_1_a",
                    label="RBI Monitoring Form C",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - RBI Monitoring Form C is present\n"
                        "   - Form is properly accomplished\n\n"
                        "2. FORM VERIFICATION:\n"
                        "   - Form is the official RBI Monitoring Form C\n"
                        "   - Form is complete and legible\n\n"
                        "3. COVERAGE PERIOD:\n"
                        "   - Form covers the first (1st) semester of CY 2023\n"
                        "   - Coverage period is clearly indicated\n\n"
                        "NOTE: RBI Monitoring Form C is the standard form for tracking RBI maintenance."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_7_1_b",
                    label="List of barangays with RBI covering the 1st Semester of CY 2023 (generated from the BIS-BPS) certified by the C/MLGOO",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - List of barangays with RBI is present\n"
                        "   - List is complete and legible\n\n"
                        "2. COVERAGE PERIOD:\n"
                        "   - List covers the 1st Semester of CY 2023\n"
                        "   - Coverage period is clearly indicated\n\n"
                        "3. SOURCE VERIFICATION:\n"
                        "   - List is generated from the BIS-BPS (Barangay Information System - Barangay Profiling System)\n"
                        "   - Source system is clearly indicated\n\n"
                        "4. CERTIFICATION VERIFICATION:\n"
                        "   - List is certified by the C/MLGOO (City/Municipal Local Government Operations Officer)\n"
                        "   - C/MLGOO certification signature is present\n"
                        "   - Certification is clearly visible\n\n"
                        "5. CONTENT VERIFICATION:\n"
                        "   - List shows barangays with updated RBI\n"
                        "   - Barangay names are listed\n"
                        "   - RBI status is indicated\n\n"
                        "NOTE: The list must be generated from BIS-BPS and certified by the C/MLGOO.\n"
                        "Both the system source and C/MLGOO certification are mandatory requirements."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=2
                ),
            ]
        ),
    ]
)
