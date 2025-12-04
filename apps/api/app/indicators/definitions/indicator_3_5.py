"""
Indicator 3.5: Barangay Initiatives During Health Emergencies

Governance Area: 3 (Safety, Peace and Order)
BBI Status: No (Health emergency initiatives are activities, NOT a barangay-based institution)

IMPORTANT NOTES FOR PHASE 9 (VALIDATION SERVICE):

1. Two Sub-Indicators Structure:
   - 3.5.1: Organized BHERT with minimum composition
   - 3.5.2: Poster/tarpaulin with contact numbers OR social media screenshot (OR logic)

2. Input Fields Required:
   - Sub-indicator 3.5.1: DATE input ("Date of approval")

3. OR Logic in Sub-indicator 3.5.2:
   - Option A: Two (2) photo documentations of poster/tarpaulin, OR
   - Option B: Screenshot of social media posting with date covering CY 2023
   - Validation rule: "ANY_ITEM_REQUIRED" (either option is acceptable)

4. Year Dependency:
   - Sub-indicator 3.5.1: BHERT organization covering January to October 2023
   - Sub-indicator 3.5.2: Social media screenshot must cover CY 2023
   - Future assessments may need to update these years

5. BHERT Composition Requirements:
   - Minimum composition specified:
     * Executive Officer
     * A Barangay Tanod
     * 2 BHWs (Barangay Health Workers)

6. Validation Workflow:
   - Validator verifies BHERT organization with proper composition
   - Validator inputs date of approval for EO/resolution
   - Validator checks poster/tarpaulin photos OR social media screenshot
   - Both sub-indicators must pass for overall indicator to pass
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 3.5: Barangay Initiatives During Health Emergencies
INDICATOR_3_5 = Indicator(
    code="3.5",
    name="Barangay Initiatives During Health Emergencies",
    governance_area_id=3,  # Safety, Peace and Order
    is_bbi=False,  # Health emergency initiatives are NOT a BBI
    sort_order=5,
    description="Barangay Initiatives During Health Emergencies",
    children=[
        # Sub-Indicator 3.5.1
        SubIndicator(
            code="3.5.1",
            name="Organized Barangay Health and Emergency Response Team (BHERT) with its composition compliant to the provisions of DILG MC No. 2020-023",
            upload_instructions=(
                "Upload the following:\n\n"
                "1. EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) "
                "on the organization of BHERTs covering January to October 2023\n\n"
                "The BHERT must include the following minimum composition:\n"
                "- Executive Officer\n"
                "- A Barangay Tanod\n"
                "- 2 BHWs (Barangay Health Workers)\n\n"
                "Please also supply the required information:\n"
                "Date of approval"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Simplified checklist - only 1 checkbox for the main EO requirement
                ChecklistItem(
                    id="3_5_1_upload",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the organization of BHERTs covering January to October 2023",
                    mov_description="Verification of uploaded Executive Order or similar issuance organizing the BHERT",
                    item_type="checkbox",
                    required=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="3_5_1_date_of_approval",
                    label="Date of approval for the EO or similar issuance",
                    mov_description="Please supply the required information:",
                    item_type="date_input",
                    required=False,
                    display_order=2
                ),
            ]
        ),

        # Sub-Indicator 3.5.2
        SubIndicator(
            code="3.5.2",
            name="Poster or tarpaulin containing the active telephone and/or cellphone Numbers of the Barangay, Punong Barangay and BHERT Members posted in conspicuous public places within the barangay jurisdiction",
            upload_instructions=(
                "Upload ONE of the following (only 1 required):\n\n"
                "1. Two (2) Photo documentations of poster or tarpaulin "
                "(Photo Requirements: One photo with Distant View and one photo with Close-up View)\n"
                "2. Screenshot of the posting on social media with date covering CY 2023\n\n"
                "Note: You only need to upload ONE option (either option 1 OR option 2)."
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # OR logic: either photos OR screenshot
            checklist_items=[
                # Option A: Poster/Tarpaulin Photos
                ChecklistItem(
                    id="3_5_2_a_upload",
                    label="Two (2) Photo documentations of poster or tarpaulin (Photo Requirements: One photo with Distant View and one photo with Close-up View)",
                    mov_description="Verification of uploaded photos showing poster or tarpaulin with contact numbers (Option 1)",
                    required=False,  # OR logic - only one option is required
                    requires_document_count=False,
                    display_order=1,
                    option_group="Option A"
                ),
                # OR Separator
                ChecklistItem(
                    id="3_5_2_or_separator",
                    label="OR",
                    item_type="info_text",
                    required=False,
                    display_order=2
                ),
                # Option B: Social Media Screenshot
                ChecklistItem(
                    id="3_5_2_b_upload",
                    label="Screenshot of the posting on social media with date covering CY 2023",
                    mov_description="Verification of uploaded screenshot showing social media posting with contact information and date covering CY 2023 (Option 2)",
                    required=False,  # OR logic - only one option is required
                    requires_document_count=False,
                    display_order=3,
                    option_group="Option B"
                ),
            ]
        ),
    ]
)
