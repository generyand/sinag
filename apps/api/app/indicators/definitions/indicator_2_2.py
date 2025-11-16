"""
Indicator 2.2: Extent of Risk Assessment and Early Warning System (EWS)

Governance Area: 2 (Disaster Preparedness)
BBI Status: No (Risk Assessment and EWS are disaster preparedness activities, NOT a barangay-based institution)

IMPORTANT NOTES FOR PHASE 9 (VALIDATION SERVICE):

1. Three Sub-Indicators Structure:
   - 2.2.1: Conducted activity in relation to Risk Assessment (not earlier than CY 2020)
   - 2.2.2: Barangay Risk/Hazard Map with natural/man-made risks
   - 2.2.3: Established Early Warning System (EWS) for top 2 hazards
   - All three sub-indicators must be met for indicator 2.2 to pass

2. Photo Documentation Requirements:
   - Sub-indicator 2.2.2: TWO (2) photos of Risk/Hazard Map
     * Photo 1: Distant view showing overall map
     * Photo 2: Close-up view showing details
   - Sub-indicator 2.2.3: TWO (2) photos of EWS
     * Photo 1: Distant view showing overall EWS setup
     * Photo 2: Close-up view showing details
   - Each set must show clear, legible documentation

3. Input Fields Required:
   - Sub-indicator 2.2.3 requires TWO text inputs:
     * TOP 1 Hazard: Validator enters the first hazard identified
     * TOP 2 Hazard: Validator enters the second hazard identified
   - These inputs capture which hazards the EWS addresses

4. Validation Workflow:
   - Validator verifies Risk Assessment activity was conducted (not earlier than CY 2020)
   - Validator checks for presence of Risk/Hazard Map with 2 photos
   - Validator confirms EWS is established for top 2 hazards
   - Validator inputs the names of the top 2 hazards
   - All three sub-indicators must pass for overall indicator to pass

5. Processing of Results:
   - The YES/NO question ("Met all the minimum requirements...?") determines final compliance
   - Based on:
     * Risk Assessment activity conducted (CY 2020 or later)
     * Risk/Hazard Map present with proper photo documentation
     * EWS established for top 2 hazards with proper photo documentation
     * Top 2 hazards clearly identified

6. Year Dependency:
   - Current implementation uses CY 2020 as the baseline year
   - Future assessments may need to update this baseline year
   - The year appears in sub-indicator 2.2.1 description
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 2.2: Extent of Risk Assessment and Early Warning System (EWS)
INDICATOR_2_2 = Indicator(
    code="2.2",
    name="Extent of Risk Assessment and Early Warning System (EWS)",
    governance_area_id=2,  # Disaster Preparedness
    is_bbi=False,  # Risk Assessment and EWS are NOT a BBI
    sort_order=2,
    description="Extent of Risk Assessment and Early Warning System (EWS) in the barangay",
    children=[
        # Sub-Indicator 2.2.1
        SubIndicator(
            code="2.2.1",
            name="Conducted an activity in relation to Risk Assessment in the barangay not earlier than CY 2020",
            upload_instructions=(
                "Upload documentation of Risk Assessment activity conducted in CY 2020 or later:\n\n"
                "ACCEPTABLE DOCUMENTS:\n"
                "- Post-Activity Report of Climate and Disaster Risk Assessment\n"
                "- Participatory Disaster Risk Assessment documentation\n"
                "- BDRRM Planning documents\n"
                "- Other official Risk Assessment reports\n\n"
                "REQUIREMENTS:\n"
                "1. Activity must be conducted NOT EARLIER than CY 2020\n"
                "2. Document must show evidence of actual Risk Assessment activity\n"
                "3. Document should include:\n"
                "   - Date of activity (must be CY 2020 or later)\n"
                "   - Nature of Risk Assessment conducted\n"
                "   - Participants or stakeholders involved\n"
                "   - Identified risks/hazards\n\n"
                "IMPORTANT:\n"
                "- Activities conducted before CY 2020 are NOT acceptable\n"
                "- Ensure the date of the activity is clearly visible in the document"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="2_2_1_a",
                    label="Post-Activity Report of activities such as Climate and Disaster Risk Assessment, Participatory Disaster Risk Assessment, BDRRM Planning, etc.",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Post-Activity Report or equivalent Risk Assessment documentation is present\n"
                        "   - Document shows evidence of actual activity conducted\n\n"
                        "2. DATE VERIFICATION:\n"
                        "   - Activity was conducted NOT EARLIER than CY 2020\n"
                        "   - Date of activity is clearly visible and verifiable\n"
                        "   - Any activity before CY 2020 should be rejected\n\n"
                        "3. CONTENT VERIFICATION:\n"
                        "   - Document shows Risk Assessment was actually conducted\n"
                        "   - Contains information about identified risks/hazards\n"
                        "   - Shows participation of barangay stakeholders\n\n"
                        "4. ACCEPTABLE ACTIVITIES:\n"
                        "   - Climate and Disaster Risk Assessment\n"
                        "   - Participatory Disaster Risk Assessment\n"
                        "   - BDRRM Planning sessions\n"
                        "   - Other legitimate Risk Assessment activities\n\n"
                        "NOTE: The critical requirement is that the activity was conducted in CY 2020 or later.\n"
                        "Activities before this date do not meet the minimum requirement."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 2.2.2
        SubIndicator(
            code="2.2.2",
            name="Barangay Risk/Hazard Map which indicates possible risks — natural or man-made (e.g. flood-prone and landslide-prone areas, etc.)",
            upload_instructions=(
                "Upload TWO (2) Photo Documentation of the Barangay Risk/Hazard Map:\n\n"
                "PHOTO REQUIREMENTS:\n"
                "1. Photo 1: DISTANT VIEW\n"
                "   - Shows the overall Risk/Hazard Map\n"
                "   - Demonstrates the map is displayed/posted in the barangay\n"
                "   - Shows context of where the map is located\n\n"
                "2. Photo 2: CLOSE-UP VIEW\n"
                "   - Shows the details of the Risk/Hazard Map\n"
                "   - Must clearly show the identified risks/hazards\n"
                "   - Map markings should be legible (flood-prone areas, landslide-prone areas, etc.)\n\n"
                "MAP CONTENT REQUIREMENTS:\n"
                "The Risk/Hazard Map must indicate:\n"
                "- Natural risks (e.g., flood-prone areas, landslide-prone areas, earthquake fault lines)\n"
                "- Man-made risks (e.g., fire-prone areas, chemical hazards, high-traffic zones)\n"
                "- Geographic boundaries of the barangay\n"
                "- Key landmarks and risk zones\n\n"
                "IMPORTANT REMINDERS:\n"
                "- Upload EXACTLY 2 photos (1 distant view + 1 close-up view)\n"
                "- Photos must be clear and legible\n"
                "- Risk/hazard markings should be visible in the close-up photo\n"
                "- Map should cover the barangay's geographic area"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="2_2_2_a",
                    label="Two (2) Photo documentations of Barangay Risk/Hazard Map",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. PHOTO COUNT:\n"
                        "   - EXACTLY TWO (2) photos are submitted\n\n"
                        "2. Photo 1 - DISTANT VIEW:\n"
                        "   - Shows the overall Risk/Hazard Map\n"
                        "   - Demonstrates where the map is posted/displayed\n"
                        "   - Context of surrounding area is visible\n\n"
                        "3. Photo 2 - CLOSE-UP VIEW:\n"
                        "   - Shows details of the Risk/Hazard Map\n"
                        "   - Risk/hazard markings are legible\n"
                        "   - Can identify specific risks marked on the map\n\n"
                        "4. MAP CONTENT VERIFICATION:\n"
                        "   - Map indicates possible risks (natural or man-made)\n"
                        "   - Examples: flood-prone areas, landslide-prone areas, etc.\n"
                        "   - Geographic coverage of the barangay is shown\n\n"
                        "5. PHOTO QUALITY:\n"
                        "   - Photos are clear and legible\n"
                        "   - Risk zones are visible and identifiable\n"
                        "   - Map appears to be legitimate and properly prepared\n\n"
                        "NOTE: Both photos must meet all requirements.\n"
                        "If photo quality is poor or risks are not clearly marked, the submission may not meet the minimum requirements."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 2.2.3
        SubIndicator(
            code="2.2.3",
            name="An established Early Warning System (EWS) for the top two (2) hazards present in the barangay",
            upload_instructions=(
                "Upload TWO (2) Photo Documentation of the Barangay Early Warning System (EWS):\n\n"
                "PHOTO REQUIREMENTS:\n"
                "1. Photo 1: DISTANT VIEW\n"
                "   - Shows the overall Early Warning System setup\n"
                "   - Demonstrates the EWS is installed/established in the barangay\n"
                "   - Shows context of where the EWS is located\n\n"
                "2. Photo 2: CLOSE-UP VIEW\n"
                "   - Shows the details of the Early Warning System\n"
                "   - Must clearly show the EWS components or equipment\n"
                "   - Equipment/system should be identifiable\n\n"
                "EWS REQUIREMENTS:\n"
                "The Early Warning System must be established for the TOP TWO (2) hazards present in the barangay:\n"
                "- Identified from the Risk/Hazard Map (indicator 2.2.2)\n"
                "- Examples of hazards: flooding, landslide, earthquake, fire, etc.\n"
                "- EWS can include: alarm systems, warning bells, sirens, communication equipment, monitoring devices\n\n"
                "ACCEPTABLE EWS EXAMPLES:\n"
                "- Flood early warning system (rain gauges, water level monitors, alarm bells)\n"
                "- Landslide early warning system (slope monitors, warning sirens)\n"
                "- Fire alarm systems\n"
                "- Earthquake/tsunami warning systems\n"
                "- Community-based warning communication systems\n\n"
                "IMPORTANT REMINDERS:\n"
                "- Upload EXACTLY 2 photos (1 distant view + 1 close-up view)\n"
                "- Photos must be clear and legible\n"
                "- EWS equipment should be visible and identifiable\n"
                "- The validator will identify which 2 hazards the EWS addresses"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="2_2_3_a",
                    label="Two (2) Photo documentations of EWS",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. PHOTO COUNT:\n"
                        "   - EXACTLY TWO (2) photos are submitted\n\n"
                        "2. Photo 1 - DISTANT VIEW:\n"
                        "   - Shows the overall Early Warning System\n"
                        "   - Demonstrates the EWS is established in the barangay\n"
                        "   - Context of installation location is visible\n\n"
                        "3. Photo 2 - CLOSE-UP VIEW:\n"
                        "   - Shows details of the EWS equipment/system\n"
                        "   - EWS components are identifiable\n"
                        "   - Can verify it's a legitimate warning system\n\n"
                        "4. EWS VERIFICATION:\n"
                        "   - Early Warning System is established for the top 2 hazards\n"
                        "   - INPUT REQUIRED: Identify the TOP 1 Hazard\n"
                        "   - INPUT REQUIRED: Identify the TOP 2 Hazard\n"
                        "   - Hazards should align with those in the Risk/Hazard Map (2.2.2)\n\n"
                        "5. SYSTEM FUNCTIONALITY:\n"
                        "   - EWS appears to be functional and properly installed\n"
                        "   - System is appropriate for the identified hazards\n"
                        "   - Equipment is visible and identifiable in photos\n\n"
                        "6. PHOTO QUALITY:\n"
                        "   - Photos are clear and legible\n"
                        "   - EWS components are visible\n"
                        "   - Can verify the system exists and is established\n\n"
                        "VALIDATOR ACTION REQUIRED:\n"
                        "- Input the TOP 1 Hazard that the EWS addresses\n"
                        "- Input the TOP 2 Hazard that the EWS addresses\n"
                        "- Verify the EWS is appropriate for these hazards\n\n"
                        "NOTE: Both photos must meet all requirements, and the top 2 hazards must be clearly identified."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),
    ]
)
