"""
Indicator 3.3: Functionality of the Lupong Tagapamayapa (LT)

Governance Area: 3 (Safety, Peace and Order)
BBI Status: Yes (Lupong Tagapamayapa is one of the 9 mandatory barangay-based institutions)

IMPORTANT NOTES FOR PHASE 9 (VALIDATION SERVICE):

1. Four Sub-Indicators Structure:
   - 3.3.1: Organized Lupong Tagapamayapa (appointment of at least 10 members)
   - 3.3.2: Systematic maintenance of records (with OR logic for cities vs municipalities)
   - 3.3.3: Conducted at least 3 monthly meetings Katarungang Pambarangay
   - 3.3.4: Attendance of LT to KP training not earlier than CY 2020

2. OR Logic in Sub-indicator 3.3.2:
   - For barangays of CITIES: Computer database with searchable information (2 photos)
   - For barangays of MUNICIPALITIES: Manual Records (Case Record Book) OR Digital Record Filing (1 photo)
   - Validation rule: "ANY_ITEM_REQUIRED" (either option is acceptable)

3. Photo Documentation Requirements:
   - Sub-indicator 3.3.2.1 (Cities): TWO (2) photos of computer database
     * Photo 1: Distant view
     * Photo 2: Close-up view
   - Sub-indicator 3.3.2.2 (Municipalities): ONE (1) photo of manual/digital records

4. Year Dependency:
   - Sub-indicator 3.3.4: Training must be not earlier than CY 2020
   - Sub-indicator 3.3.3: Monthly meetings covering the current year
   - Uses dynamic year placeholders (e.g., {CY_CURRENT_YEAR})

5. Validation Workflow:
   - Validator verifies LT organization with at least 10 members
   - Validator checks records maintenance (either city or municipality option)
   - Validator confirms at least 3 monthly meetings conducted
   - Validator verifies training attendance (CY 2020 or later)
   - All four sub-indicators must pass for overall indicator to pass

6. BBI Status Update:
   - Since this is a BBI indicator (is_bbi=True), passing means LT is "Functional"
   - Failing means LT is "Non-Functional"
"""

from app.indicators.base import ChecklistItem, Indicator, SubIndicator

# Indicator 3.3: Functionality of the Lupong Tagapamayapa (LT)
INDICATOR_3_3 = Indicator(
    code="3.3",
    name="Functionality of the Lupong Tagapamayapa (LT)",
    governance_area_id=3,  # Safety, Peace and Order
    is_bbi=True,  # Lupong Tagapamayapa is a mandatory BBI
    sort_order=3,
    description="Functionality of the Lupong Tagapamayapa (LT)",
    children=[
        # Sub-Indicator 3.3.1
        SubIndicator(
            code="3.3.1",
            name="Structure: Organized Lupong Tagapamayapa",
            upload_instructions=(
                "Upload: At least ten (10) KP Form #5 - Oath of Office of the Lupong Tagapamayapa members, signed by the PB"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Upload Verification
                ChecklistItem(
                    id="3_3_1_upload_1",
                    label="At least ten (10) KP Form #5 - Oath of Office of the Lupong Tagapamayapa members, signed by the PB",
                    mov_description="Verification of uploaded KP Form #5 - Oath of Office for at least 10 Lupong Tagapamayapa members",
                    required=True,
                    display_order=1,
                ),
            ],
        ),
        # Sub-Indicator 3.3.2
        SubIndicator(
            code="3.3.2",
            name="System: Systematic maintenance of records of cases",
            upload_instructions=(
                "OPTION A - For barangays of cities:\n"
                "- Two (2) photos with caption of the computer database with searchable information\n\n"
                "OR\n\n"
                "OPTION B - For barangays of municipalities:\n"
                "- One (1) photo with caption on the manual record (Case Record Book) OR digital file (scanned copy of KP files)"
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # OR logic: either cities OR municipalities option
            checklist_items=[
                # Upload Verification for Cities (3.3.2.1)
                ChecklistItem(
                    id="3_3_2_1_upload",
                    label="For barangays of cities: Complete database with searchable information",
                    mov_description="Verification of uploaded photos showing computer database with searchable information for barangays of cities (2 photos: Distant View and Close-up View)",
                    required=False,  # OR logic - only one of the two options is required
                    display_order=1,
                ),
                # OR Separator
                ChecklistItem(
                    id="3_3_2_or_separator",
                    label="OR",
                    mov_description="OR",
                    item_type="info_text",
                    required=False,
                    display_order=2,
                ),
                # Upload Verification for Municipalities (3.3.2.2)
                ChecklistItem(
                    id="3_3_2_2_upload",
                    label="For barangays of municipalities: Manual Records (Case Record Book) OR Digital Record Filing (scanned copy of KP files)",
                    mov_description="Verification of uploaded photo showing manual record or digital file for barangays of municipalities (1 photo)",
                    required=False,  # OR logic - only one of the two options is required
                    display_order=3,
                ),
            ],
        ),
        # Sub-Indicator 3.3.3
        SubIndicator(
            code="3.3.3",
            name="Meetings: Conducted monthly meetings for the administration of the Katarungang Pambarangay covering {CY_CURRENT_YEAR}",
            upload_instructions=(
                "Upload: Copies of minutes of meetings with attendance sheets (at least 3 minutes covering meetings conducted in {CY_CURRENT_YEAR})"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Upload Verification
                ChecklistItem(
                    id="3_3_3_upload_1",
                    label="Copies of minutes of meetings with attendance sheets (at least 3 minutes covering meetings conducted in {CY_CURRENT_YEAR})",
                    mov_description="Verification of uploaded copies of minutes of meetings with attendance sheets for at least 3 monthly meetings covering {CY_CURRENT_YEAR}",
                    required=True,
                    display_order=1,
                ),
            ],
        ),
        # Sub-Indicator 3.3.4
        SubIndicator(
            code="3.3.4",
            name="Trainings: Attendance of LT to KP training or seminar not earlier than CY 2020",
            upload_instructions=(
                "Upload: At least 1 copy of proof of training such as Certificate of Completion and/or Participation"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Upload Verification
                ChecklistItem(
                    id="3_3_4_upload_1",
                    label="At least 1 copy of proof of training such as Certificate of Completion and/or Participation",
                    mov_description="Verification of uploaded proof of training (Certificate of Completion and/or Participation) for KP training or seminar not earlier than CY 2020",
                    required=True,
                    display_order=1,
                ),
            ],
        ),
    ],
)
