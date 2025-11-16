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
                "Upload: Post-Activity Report of activities such as Climate and Disaster Risk Assessment, Participatory Disaster Risk Assessment, BDRRM Planning, etc."
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Upload Verification
                ChecklistItem(
                    id="2_2_1_upload_1",
                    label="Post-Activity Report of activities such as Climate and Disaster Risk Assessment, Participatory Disaster Risk Assessment, BDRRM Planning, etc.",
                    mov_description="Verification of uploaded Post-Activity Report documenting Risk Assessment activities conducted in the barangay not earlier than CY 2020",
                    required=True,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 2.2.2
        SubIndicator(
            code="2.2.2",
            name="Barangay Risk/Hazard Map which indicates possible risks — natural or man-made (e.g. flood-prone and landslide-prone areas, etc.)",
            upload_instructions=(
                "Upload Two (2) Photo documentations of Barangay Risk/Hazard Map:\n\n"
                "Photo Requirements:\n"
                "• One (1) photo with Distant View; and\n"
                "• One (1) photo with Close-up View"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Upload Verification
                ChecklistItem(
                    id="2_2_2_upload_1",
                    label="Two (2) Photo documentations of Barangay Risk/Hazard Map",
                    mov_description="Verification of uploaded photo documentation showing the Barangay Risk/Hazard Map which indicates possible risks — natural or man-made",
                    required=True,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 2.2.3
        SubIndicator(
            code="2.2.3",
            name="An established Early Warning System (EWS) for the top two (2) hazards present in the barangay",
            upload_instructions=(
                "Upload Two (2) Photo documentations of Barangay Risk/Hazard Map:\n\n"
                "Photo Requirements:\n"
                "• One (1) photo with Distant View; and\n"
                "• One (1) photo with Close-up View"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Upload Verification
                ChecklistItem(
                    id="2_2_3_upload_1",
                    label="Two (2) Photo documentations of EWS",
                    mov_description="Verification of uploaded photo documentation showing the established Early Warning System (EWS) for the top two hazards present in the barangay",
                    required=True,
                    display_order=1
                ),
                # TOP 1 Hazard (Text Input)
                ChecklistItem(
                    id="2_2_3_top_1_hazard",
                    label="TOP 1 Hazard:",
                    mov_description="Input the first top hazard that the Early Warning System addresses",
                    required=True,
                    requires_document_count=True,  # This is a text input field
                    display_order=2
                ),
                # TOP 2 Hazard (Text Input)
                ChecklistItem(
                    id="2_2_3_top_2_hazard",
                    label="TOP 2 Hazard:",
                    mov_description="Input the second top hazard that the Early Warning System addresses",
                    required=True,
                    requires_document_count=True,  # This is a text input field
                    display_order=3
                ),
            ]
        ),
    ]
)
