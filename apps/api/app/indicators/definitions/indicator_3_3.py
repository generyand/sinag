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
   - Sub-indicator 3.3.3: Monthly meetings covering CY 2023
   - Future assessments may need to update these baseline years

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

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


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
                "Upload documentation of Lupong Tagapamayapa organization:\\n\\n"
                "REQUIRED DOCUMENT:\\n"
                "- At least ten (10) KP Form #5 - Oath of Office of the Lupong Tagapamayapa members, signed by the PB\\n\\n"
                "REQUIREMENTS:\\n"
                "- Must have at least 10 members\\n"
                "- KP Form #5 (Oath of Office) for each member\\n"
                "- Forms must be signed by the Punong Barangay (PB)\\n"
                "- All forms should be properly accomplished\\n\\n"
                "IMPORTANT:\\n"
                "- Submit at least 10 KP Form #5 documents\\n"
                "- Each form represents one LT member's oath of office\\n"
                "- Forms must be signed by the PB to be valid"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_3_1_a",
                    label="At least ten (10) KP Form #5 - Oath of Office of the Lupong Tagapamayapa members, signed by the PB",
                    mov_description=(
                        "Verify the following:\\n\\n"
                        "1. DOCUMENT COUNT:\\n"
                        "   - At least 10 KP Form #5 documents are submitted\\n"
                        "   - Each form represents one LT member\\n\\n"
                        "2. FORM VERIFICATION:\\n"
                        "   - Forms are KP Form #5 (Oath of Office)\\n"
                        "   - Forms are properly accomplished\\n"
                        "   - Each form contains member information\\n\\n"
                        "3. SIGNATURE VERIFICATION:\\n"
                        "   - All forms are signed by the Punong Barangay (PB)\\n"
                        "   - Signatures are clearly visible\\n\\n"
                        "4. LUPONG TAGAPAMAYAPA COMPOSITION:\\n"
                        "   - Minimum of 10 members is met\\n"
                        "   - Members are properly appointed\\n\\n"
                        "NOTE: The requirement is for AT LEAST 10 members.\\n"
                        "Having more than 10 is acceptable."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 3.3.2
        SubIndicator(
            code="3.3.2",
            name="System: Systematic maintenance of records of cases",
            upload_instructions=(
                "Upload documentation of systematic maintenance of case records:\\n\\n"
                "IMPORTANT: Choose the appropriate option based on your barangay type:\\n\\n"
                "OPTION 1 - FOR BARANGAYS OF CITIES:\\n"
                "Upload TWO (2) photos of computer database with searchable information:\\n"
                "- Photo 1: Distant view showing overall database\\n"
                "- Photo 2: Close-up view showing searchable information\\n"
                "- Database must contain case records\\n"
                "- Information must be searchable\\n\\n"
                "NOTE: Photos of MS Excel database are acceptable\\n\\n"
                "OPTION 2 - FOR BARANGAYS OF MUNICIPALITIES:\\n"
                "Upload ONE (1) photo with caption:\\n"
                "- Manual Records (Case Record Book), OR\\n"
                "- Digital Record Filing (scanned copy of KP files)\\n"
                "- Photo must show the manual record or digital file\\n"
                "- Caption should indicate which type of record\\n\\n"
                "IMPORTANT:\\n"
                "- Only ONE option is required (based on your barangay type)\\n"
                "- Cities: Must submit computer database photos\\n"
                "- Municipalities: Can submit either manual or digital records"
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # OR logic: either cities OR municipalities option
            checklist_items=[
                ChecklistItem(
                    id="3_3_2_a",
                    label="For barangays of cities: Two (2) photos with caption of the computer database with searchable information",
                    mov_description=(
                        "Verify the following:\\n\\n"
                        "1. APPLICABILITY:\\n"
                        "   - This option is for BARANGAYS OF CITIES only\\n"
                        "   - If barangay is from a municipality, check option 3_3_2_b instead\\n\\n"
                        "2. PHOTO COUNT:\\n"
                        "   - EXACTLY TWO (2) photos are submitted\\n\\n"
                        "3. Photo 1 - DISTANT VIEW:\\n"
                        "   - Shows the overall computer database\\n"
                        "   - Demonstrates the database is in use\\n\\n"
                        "4. Photo 2 - CLOSE-UP VIEW:\\n"
                        "   - Shows searchable information in the database\\n"
                        "   - Case records are visible\\n"
                        "   - Search functionality is demonstrated\\n\\n"
                        "5. DATABASE VERIFICATION:\\n"
                        "   - Computer database contains case records\\n"
                        "   - Information is searchable\\n"
                        "   - MS Excel databases are acceptable\\n\\n"
                        "NOTE: This is an OR requirement with option 3_3_2_b.\\n"
                        "Only one option needs to pass based on barangay type."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="3_3_2_b",
                    label="For barangays of municipalities: One (1) photo, with caption on the manual record or digital file",
                    mov_description=(
                        "Verify the following:\\n\\n"
                        "1. APPLICABILITY:\\n"
                        "   - This option is for BARANGAYS OF MUNICIPALITIES only\\n"
                        "   - If barangay is from a city, check option 3_3_2_a instead\\n\\n"
                        "2. PHOTO COUNT:\\n"
                        "   - ONE (1) photo is submitted\\n\\n"
                        "3. PHOTO CONTENT:\\n"
                        "   - Photo shows manual records (Case Record Book), OR\\n"
                        "   - Photo shows digital record filing (scanned KP files)\\n"
                        "   - Caption indicates which type of record\\n\\n"
                        "4. RECORD VERIFICATION:\\n"
                        "   - Manual records: Case Record Book is visible\\n"
                        "   - Digital records: Scanned copy of KP files is shown\\n"
                        "   - Records contain case information\\n\\n"
                        "5. SYSTEMATIC MAINTENANCE:\\n"
                        "   - Records are organized and maintained\\n"
                        "   - Case information is accessible\\n\\n"
                        "NOTE: This is an OR requirement with option 3_3_2_a.\\n"
                        "Only one option needs to pass based on barangay type.\\n"
                        "Within this option, either manual OR digital records is acceptable."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=2
                ),
            ]
        ),

        # Sub-Indicator 3.3.3
        SubIndicator(
            code="3.3.3",
            name="Meetings: Conducted monthly meetings for the administration of the Katarungang Pambarangay",
            upload_instructions=(
                "Upload documentation of Katarungang Pambarangay monthly meetings:\\n\\n"
                "REQUIRED DOCUMENTS:\\n"
                "- Copies of minutes of meetings with attendance sheets\\n"
                "- Must cover at least 3 meetings conducted in CY 2023\\n\\n"
                "REQUIREMENTS:\\n"
                "- Minimum of 3 monthly meeting minutes required\\n"
                "- Each meeting must have attendance sheets\\n"
                "- Meetings must be for the administration of Katarungang Pambarangay\\n"
                "- Meetings must have been conducted during CY 2023\\n\\n"
                "MEETING MINUTES SHOULD INCLUDE:\\n"
                "- Date and venue of meeting\\n"
                "- Attendance list of LT members\\n"
                "- Agenda items discussed\\n"
                "- Decisions or resolutions made\\n"
                "- Matters related to Katarungang Pambarangay administration\\n\\n"
                "IMPORTANT:\\n"
                "- Submit at least 3 sets of meeting minutes\\n"
                "- Each set must include attendance sheets\\n"
                "- Meetings should be for Katarungang Pambarangay matters"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_3_3_a",
                    label="Copies of minutes of meetings with attendance sheets (at least 3 minutes covering meetings conducted in CY 2023)",
                    mov_description=(
                        "Verify the following:\\n\\n"
                        "1. DOCUMENT COUNT:\\n"
                        "   - At least 3 sets of meeting minutes are submitted\\n\\n"
                        "2. ATTENDANCE SHEETS:\\n"
                        "   - Each meeting minute includes attendance sheets\\n"
                        "   - Attendance of LT members is documented\\n\\n"
                        "3. COVERAGE PERIOD:\\n"
                        "   - Meetings were conducted during CY 2023\\n"
                        "   - Dates of meetings are clearly indicated\\n\\n"
                        "4. MEETING PURPOSE:\\n"
                        "   - Meetings are for administration of Katarungang Pambarangay\\n"
                        "   - Agenda relates to LT/KP matters\\n\\n"
                        "5. CONTENT VERIFICATION:\\n"
                        "   - Minutes document meeting proceedings\\n"
                        "   - Include date, venue, attendees\\n"
                        "   - Record discussions and decisions\\n"
                        "   - Properly formatted as official minutes\\n\\n"
                        "6. MONTHLY MEETINGS:\\n"
                        "   - Meetings demonstrate regular monthly conduct\\n"
                        "   - At least 3 meetings are documented\\n\\n"
                        "NOTE: The requirement is for AT LEAST 3 meetings.\\n"
                        "Having more than 3 is acceptable and demonstrates better compliance."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 3.3.4
        SubIndicator(
            code="3.3.4",
            name="Trainings: Attendance of LT to KP training or seminar not earlier than CY 2020",
            upload_instructions=(
                "Upload documentation of LT attendance to KP training or seminar:\\n\\n"
                "REQUIRED DOCUMENT:\\n"
                "- At least 1 copy of proof of training\\n"
                "- Certificate of Completion and/or Participation\\n\\n"
                "REQUIREMENTS:\\n"
                "- Training or seminar must be related to Katarungang Pambarangay (KP)\\n"
                "- Training must be conducted NOT EARLIER than CY 2020\\n"
                "- Certificate must show LT member attendance\\n"
                "- Certificate should indicate:\\n"
                "  * Name of training/seminar\\n"
                "  * Date of training (CY 2020 or later)\\n"
                "  * Name of LT member attendee\\n"
                "  * Proof of completion/participation\\n\\n"
                "ACCEPTABLE TRAINING/SEMINARS:\\n"
                "- Katarungang Pambarangay training\\n"
                "- Lupong Tagapamayapa seminar\\n"
                "- Mediation and conciliation training\\n"
                "- Alternative dispute resolution seminar\\n"
                "- Other KP-related capacity building activities\\n\\n"
                "IMPORTANT:\\n"
                "- Training conducted before CY 2020 is NOT acceptable\\n"
                "- Ensure the date of training is clearly visible in the certificate"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_3_4_a",
                    label="At least 1 copy of proof of training such as Certificate of Completion and/or Participation",
                    mov_description=(
                        "Verify the following:\\n\\n"
                        "1. DOCUMENT PRESENCE:\\n"
                        "   - Certificate of Completion and/or Participation is present\\n"
                        "   - At least 1 copy is submitted\\n\\n"
                        "2. TRAINING TYPE:\\n"
                        "   - Training/seminar is related to Katarungang Pambarangay (KP)\\n"
                        "   - Topics include mediation, conciliation, ADR, or LT matters\\n\\n"
                        "3. DATE VERIFICATION:\\n"
                        "   - Training was conducted NOT EARLIER than CY 2020\\n"
                        "   - Date of training is clearly visible\\n"
                        "   - Any training before CY 2020 should be rejected\\n\\n"
                        "4. ATTENDEE VERIFICATION:\\n"
                        "   - Certificate shows LT member attendance\\n"
                        "   - Name of attendee is clearly indicated\\n"
                        "   - Attendee is confirmed to be an LT member\\n\\n"
                        "5. CERTIFICATE CONTENT:\\n"
                        "   - Contains name of training/seminar\\n"
                        "   - Shows date of training\\n"
                        "   - Indicates completion or participation\\n"
                        "   - Properly issued by training organizer\\n\\n"
                        "NOTE: The critical requirement is that training was conducted in CY 2020 or later.\\n"
                        "Trainings before this date do not meet the minimum requirement."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),
    ]
)
