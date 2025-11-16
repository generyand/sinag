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
                "Upload documentation of BHERT organization:\\n\\n"
                "REQUIRED DOCUMENT:\\n"
                "- EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs)\\n"
                "- Must document the organization of BHERTs\\n"
                "- Must cover January to October 2023\\n\\n"
                "MINIMUM COMPOSITION OF THE BHERT:\\n"
                "The BHERT must include at minimum:\\n"
                "1. Executive Officer\\n"
                "2. A Barangay Tanod\\n"
                "3. 2 BHWs (Barangay Health Workers)\\n\\n"
                "REQUIREMENTS:\\n"
                "- Document must be an Executive Order or similar official issuance\\n"
                "- Must be signed by the Punong Barangay (PB)\\n"
                "- Must be countersigned by Barangay Secretary and SBMs\\n"
                "- Must show compliance with DILG MC No. 2020-023\\n"
                "- Must establish BHERT with the minimum composition listed above\\n"
                "- Coverage period: January to October 2023\\n\\n"
                "IMPORTANT:\\n"
                "- The EO/resolution must be properly signed and approved\\n"
                "- BHERT composition must meet the minimum requirements\\n"
                "- Document must clearly establish the BHERT organization"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_5_1_a",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the organization of BHERTs covering January to October 2023",
                    mov_description=(
                        "Verify the following:\\n\\n"
                        "1. DOCUMENT PRESENCE:\\n"
                        "   - Executive Order (EO), resolution, or ordinance is present\\n"
                        "   - Document establishes the BHERT organization\\n\\n"
                        "2. DATE INPUT REQUIRED:\\n"
                        "   - Validator must input the DATE OF APPROVAL\\n"
                        "   - This is a required input field\\n\\n"
                        "3. SIGNATURE VERIFICATION:\\n"
                        "   - Document is signed by the Punong Barangay (PB)\\n"
                        "   - Document is countersigned by Barangay Secretary\\n"
                        "   - Document is countersigned by Sangguniang Barangay Members (SBMs)\\n"
                        "   - All signatures are clearly visible\\n\\n"
                        "4. BHERT COMPOSITION VERIFICATION:\\n"
                        "   - BHERT includes an Executive Officer\\n"
                        "   - BHERT includes a Barangay Tanod\\n"
                        "   - BHERT includes 2 BHWs (Barangay Health Workers)\\n"
                        "   - Minimum composition requirements are met\\n\\n"
                        "5. COMPLIANCE VERIFICATION:\\n"
                        "   - Document shows compliance with DILG MC No. 2020-023\\n"
                        "   - BHERT organization follows the prescribed guidelines\\n\\n"
                        "6. COVERAGE PERIOD:\\n"
                        "   - Document covers January to October 2023\\n"
                        "   - Coverage period is clearly indicated\\n\\n"
                        "NOTE: The BHERT must have the minimum composition specified.\\n"
                        "Additional members beyond the minimum are acceptable."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 3.5.2
        SubIndicator(
            code="3.5.2",
            name="Poster or tarpaulin containing the active telephone and/or cellphone Numbers of the Barangay, Punong Barangay and BHERT Members posted in conspicuous public places within the barangay jurisdiction",
            upload_instructions=(
                "Upload documentation of poster/tarpaulin OR social media posting:\\n\\n"
                "IMPORTANT: Choose ONE of the following options:\\n\\n"
                "OPTION 1 - POSTER/TARPAULIN PHOTOS:\\n"
                "Upload TWO (2) photo documentations of poster or tarpaulin:\\n"
                "- Photo 1: Distant view showing overall poster/tarpaulin and location\\n"
                "- Photo 2: Close-up view showing contact numbers clearly\\n\\n"
                "POSTER/TARPAULIN REQUIREMENTS:\\n"
                "- Must contain active telephone and/or cellphone numbers\\n"
                "- Must show contact numbers of:\\n"
                "  * The Barangay\\n"
                "  * Punong Barangay\\n"
                "  * BHERT Members\\n"
                "- Must be posted in conspicuous public places within the barangay jurisdiction\\n\\n"
                "OPTION 2 - SOCIAL MEDIA SCREENSHOT:\\n"
                "Upload screenshot of the posting on social media:\\n"
                "- Screenshot must show the contact information post\\n"
                "- Must include date covering CY 2023\\n"
                "- Must show it was posted by the barangay or official barangay account\\n\\n"
                "IMPORTANT:\\n"
                "- Only ONE option is required (either photos OR screenshot)\\n"
                "- If using photos: submit 2 photos (distant + close-up view)\\n"
                "- If using screenshot: ensure date covering CY 2023 is visible"
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # OR logic: either photos OR screenshot
            checklist_items=[
                ChecklistItem(
                    id="3_5_2_a",
                    label="Two (2) Photo documentations of poster or tarpaulin",
                    mov_description=(
                        "Verify the following:\\n\\n"
                        "1. APPLICABILITY:\\n"
                        "   - This is OPTION 1 (Poster/Tarpaulin Photos)\\n"
                        "   - If barangay chose social media option, check item 3_5_2_b instead\\n\\n"
                        "2. PHOTO COUNT:\\n"
                        "   - EXACTLY TWO (2) photos are submitted\\n\\n"
                        "3. Photo 1 - DISTANT VIEW:\\n"
                        "   - Shows the overall poster or tarpaulin\\n"
                        "   - Demonstrates where it is posted (conspicuous public place)\\n"
                        "   - Context of location is visible\\n\\n"
                        "4. Photo 2 - CLOSE-UP VIEW:\\n"
                        "   - Shows the contact numbers clearly\\n"
                        "   - Telephone and/or cellphone numbers are legible\\n"
                        "   - Can verify the information on the poster/tarpaulin\\n\\n"
                        "5. CONTENT VERIFICATION:\\n"
                        "   - Poster/tarpaulin contains active contact numbers\\n"
                        "   - Shows contact numbers of:\\n"
                        "     * The Barangay\\n"
                        "     * Punong Barangay\\n"
                        "     * BHERT Members\\n\\n"
                        "6. POSTING LOCATION:\\n"
                        "   - Posted in conspicuous public places\\n"
                        "   - Within the barangay jurisdiction\\n"
                        "   - Accessible and visible to the public\\n\\n"
                        "NOTE: This is an OR requirement with option 3_5_2_b.\\n"
                        "Only one option needs to pass."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="3_5_2_b",
                    label="Screenshot of the posting on social media with date covering CY 2023",
                    mov_description=(
                        "Verify the following:\\n\\n"
                        "1. APPLICABILITY:\\n"
                        "   - This is OPTION 2 (Social Media Screenshot)\\n"
                        "   - If barangay chose poster/tarpaulin option, check item 3_5_2_a instead\\n\\n"
                        "2. SCREENSHOT PRESENCE:\\n"
                        "   - Screenshot of social media posting is submitted\\n\\n"
                        "3. DATE VERIFICATION:\\n"
                        "   - Screenshot shows date covering CY 2023\\n"
                        "   - Date is clearly visible in the screenshot\\n\\n"
                        "4. POSTING SOURCE:\\n"
                        "   - Posted by the barangay or official barangay account\\n"
                        "   - Can verify it's an official barangay communication\\n\\n"
                        "5. CONTENT VERIFICATION:\\n"
                        "   - Social media post contains active contact numbers\\n"
                        "   - Shows contact numbers of:\\n"
                        "     * The Barangay\\n"
                        "     * Punong Barangay\\n"
                        "     * BHERT Members\\n\\n"
                        "6. SCREENSHOT QUALITY:\\n"
                        "   - Screenshot is clear and legible\\n"
                        "   - Contact information is readable\\n"
                        "   - Date is visible\\n\\n"
                        "NOTE: This is an OR requirement with option 3_5_2_a.\\n"
                        "Only one option needs to pass.\\n"
                        "Either poster/tarpaulin photos OR social media screenshot is acceptable."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=2
                ),
            ]
        ),
    ]
)
