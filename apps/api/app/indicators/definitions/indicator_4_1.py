"""
Indicator 4.1: Functionality of Barangay Violence Against Women (VAW) Desk

Governance Area: 4 (Social Protection and Sensitivity)
BBI Status: Yes (VAW Desk is one of the 9 mandatory barangay-based institutions)

IMPORTANT NOTES FOR PHASE 9 (VALIDATION SERVICE):

1. Seven Sub-Indicators Structure:
   - 4.1.1: Organized VAW Desk with designated officer
   - 4.1.2: Training attendance (not earlier than CY 2020)
   - 4.1.3: Approved GAD Plan and Budget for CY 2023
   - 4.1.4: Quarterly accomplishment reports (1st to 3rd quarter CY 2023)
   - 4.1.5: Updated database on VAW cases
   - 4.1.6: Accomplishment Reports (OR logic: physical targets OR fund utilization)
   - 4.1.7: Referral Network (For Profiling only)

2. Input Fields Required:
   - Sub-indicator 4.1.4: NUMBER input for quarterly report count
   - Sub-indicator 4.1.5: MULTIPLE NUMBER inputs for:
     * Total number of VAW cases received
     * Total number of cases documented for violating RA 9262
     * Total number of cases documented for violating other VAW-related laws
     * Total number of assistance provided to victim-survivors
   - Sub-indicator 4.1.6: PERCENTAGE and AMOUNT inputs for:
     * Physical accomplishment rate (%)
     * Amount utilized (for GAD Budget)
     * Amount allocated (for GAD Budget)

3. OR Logic in Sub-indicator 4.1.6:
   - Option A: At least 50% accomplishment of physical targets in GAD Plan, OR
   - Option B: At least 50% fund utilization of CY 2023 GAD Budget
   - Validation rule: "ANY_ITEM_REQUIRED" (either option is acceptable)

4. Profiling-Only Sub-indicator:
   - Sub-indicator 4.1.7: Referral Network is for PROFILING ONLY
   - Does NOT affect pass/fail status
   - Contains 2 checklist items (flow chart and directory)

5. Year Dependency:
   - Sub-indicator 4.1.1: VAW Desk establishment covering January to October 2023
   - Sub-indicator 4.1.2: Training not earlier than CY 2020
   - Sub-indicator 4.1.3: GAD Plan and Budget for CY 2023
   - Sub-indicator 4.1.4: Quarterly reports for CY 2023 (1st to 3rd quarter)
   - Sub-indicator 4.1.5: Database as of Dec 2024
   - Future assessments may need to update these baseline years

6. Validation Workflow:
   - Validator verifies VAW Desk organization and designated officer
   - Validator confirms training attendance (CY 2020 or later)
   - Validator checks approved GAD Plan and Budget
   - Validator inputs quarterly report count
   - Validator inputs VAW case statistics from database
   - Validator verifies accomplishment (either physical targets OR budget utilization)
   - Validator profiles referral network (optional, does not affect pass/fail)
   - All non-profiling sub-indicators must pass for overall indicator to pass

7. BBI Status Update:
   - Since this is a BBI indicator (is_bbi=True), passing means VAW Desk is "Functional"
   - Failing means VAW Desk is "Non-Functional"
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 4.1: Functionality of Barangay Violence Against Women (VAW) Desk
INDICATOR_4_1 = Indicator(
    code="4.1",
    name="Functionality of Barangay Violence Against Women (VAW) Desk",
    governance_area_id=4,  # Social Protection and Sensitivity
    is_bbi=True,  # VAW Desk is a mandatory BBI
    sort_order=1,
    description="Functionality of Barangay Violence Against Women (VAW) Desk",
    children=[
        # Sub-Indicator 4.1.1
        SubIndicator(
            code="4.1.1",
            name="Structure: Organized Barangay VAW Desk and designated Barangay VAW Desk Officer",
            upload_instructions=(
                "Upload documentation of VAW Desk organization:\n\n"
                "REQUIRED DOCUMENT:\n"
                "- EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs)\n"
                "- Must document the establishment of Barangay VAW Desk and designated VAW Desk Officer\n"
                "- Must cover January to October 2023\n\n"
                "REQUIREMENTS:\n"
                "- Document must be an Executive Order or similar official issuance\n"
                "- Must be signed by the Punong Barangay (PB)\n"
                "- Must be countersigned by Barangay Secretary and SBMs\n"
                "- Must establish the Barangay VAW Desk\n"
                "- Must designate a Barangay VAW Desk Officer\n"
                "- Coverage period: January to October 2023\n\n"
                "IMPORTANT:\n"
                "- The EO/resolution must be properly signed and approved\n"
                "- VAW Desk Officer must be clearly designated\n"
                "- Document must clearly establish the VAW Desk organization"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_1_1_a",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the establishment of Barangay VAW Desk and designated VAW Desk Officer covering January to October 2023",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Executive Order (EO), resolution, or ordinance is present\n"
                        "   - Document establishes the Barangay VAW Desk\n"
                        "   - Document designates the Barangay VAW Desk Officer\n\n"
                        "2. SIGNATURE VERIFICATION:\n"
                        "   - Document is signed by the Punong Barangay (PB)\n"
                        "   - Document is countersigned by Barangay Secretary\n"
                        "   - Document is countersigned by Sangguniang Barangay Members (SBMs)\n"
                        "   - All signatures are clearly visible\n\n"
                        "3. VAW DESK ESTABLISHMENT:\n"
                        "   - Barangay VAW Desk is established\n"
                        "   - VAW Desk Officer is designated\n"
                        "   - Designation is clear and unambiguous\n\n"
                        "4. COVERAGE PERIOD:\n"
                        "   - Document covers January to October 2023\n"
                        "   - Coverage period is clearly indicated\n\n"
                        "NOTE: The VAW Desk must be properly organized with a designated officer."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.1.2
        SubIndicator(
            code="4.1.2",
            name="Training: Attendance of the Barangay VAW Desk Officer to at least one (1) training/orientation related to gender-sensitive handling of VAW Cases not earlier than CY 2020",
            upload_instructions=(
                "Upload documentation of VAW Desk Officer training attendance:\n\n"
                "REQUIRED DOCUMENT:\n"
                "- At least one (1) copy of proof of training\n"
                "- Certificate of Completion and/or Participation\n\n"
                "REQUIREMENTS:\n"
                "- Training or orientation must be related to gender-sensitive handling of VAW cases\n"
                "- Training must be conducted NOT EARLIER than CY 2020\n"
                "- Certificate must show VAW Desk Officer attendance\n"
                "- Certificate should indicate:\n"
                "  * Name of training/orientation\n"
                "  * Date of training (CY 2020 or later)\n"
                "  * Name of VAW Desk Officer attendee\n"
                "  * Proof of completion/participation\n\n"
                "ACCEPTABLE TRAINING/ORIENTATIONS:\n"
                "- Gender-sensitive handling of VAW cases\n"
                "- VAW desk management training\n"
                "- Gender and development orientation\n"
                "- Violence against women response training\n"
                "- Other VAW-related capacity building activities\n\n"
                "IMPORTANT:\n"
                "- Training conducted before CY 2020 is NOT acceptable\n"
                "- Ensure the date of training is clearly visible in the certificate"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_1_2_a",
                    label="At least one (1) copy of proof of training such as Certificate of Completion and/or Participation",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Certificate of Completion and/or Participation is present\n"
                        "   - At least 1 copy is submitted\n\n"
                        "2. TRAINING TYPE:\n"
                        "   - Training/orientation is related to gender-sensitive handling of VAW cases\n"
                        "   - Topics include VAW response, gender sensitivity, or related matters\n\n"
                        "3. DATE VERIFICATION:\n"
                        "   - Training was conducted NOT EARLIER than CY 2020\n"
                        "   - Date of training is clearly visible\n"
                        "   - Any training before CY 2020 should be rejected\n\n"
                        "4. ATTENDEE VERIFICATION:\n"
                        "   - Certificate shows VAW Desk Officer attendance\n"
                        "   - Name of attendee is clearly indicated\n"
                        "   - Attendee is confirmed to be the VAW Desk Officer\n\n"
                        "5. CERTIFICATE CONTENT:\n"
                        "   - Contains name of training/orientation\n"
                        "   - Shows date of training\n"
                        "   - Indicates completion or participation\n"
                        "   - Properly issued by training organizer\n\n"
                        "NOTE: The critical requirement is that training was conducted in CY 2020 or later.\n"
                        "Trainings before this date do not meet the minimum requirement."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.1.3
        SubIndicator(
            code="4.1.3",
            name="Plan and Budget: Approved CY 2023 Barangay Gender and Development (GAD) Plan and Budget",
            upload_instructions=(
                "Upload documentation of approved GAD Plan and Budget:\n\n"
                "REQUIRED DOCUMENT:\n"
                "- Approved Barangay GAD Plan and Budget for CY 2023\n\n"
                "REQUIREMENTS:\n"
                "- Document must be the approved GAD Plan and Budget\n"
                "- Must be for Calendar Year 2023\n"
                "- Must be properly approved by the Sangguniang Barangay\n"
                "- Should contain:\n"
                "  * GAD programs, projects, and activities\n"
                "  * Budget allocation for GAD\n"
                "  * Physical targets\n"
                "  * Approval signatures\n\n"
                "IMPORTANT:\n"
                "- The GAD Plan and Budget must be approved\n"
                "- Must cover CY 2023\n"
                "- Ensure approval signatures are visible"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_1_3_a",
                    label="Approved Barangay GAD Plan and Budget for CY 2023",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Barangay GAD Plan and Budget is present\n"
                        "   - Document is for CY 2023\n\n"
                        "2. APPROVAL VERIFICATION:\n"
                        "   - Document is approved by the Sangguniang Barangay\n"
                        "   - Approval signatures are visible\n"
                        "   - Document is properly authorized\n\n"
                        "3. CONTENT VERIFICATION:\n"
                        "   - Contains GAD programs, projects, and activities\n"
                        "   - Shows budget allocation for GAD\n"
                        "   - Includes physical targets\n"
                        "   - Properly structured as a GAD Plan and Budget\n\n"
                        "4. COVERAGE PERIOD:\n"
                        "   - Document is for Calendar Year 2023\n"
                        "   - Coverage period is clearly indicated\n\n"
                        "NOTE: The GAD Plan and Budget must be approved and cover CY 2023."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.1.4
        SubIndicator(
            code="4.1.4",
            name="Accomplishment Reports: Quarterly accomplishment reports based on the database/records of VAW cases reported in the barangay covering 1st to 3rd quarter of CY 2023 with received stamp by the C/MSWDO and C/MLGOO",
            upload_instructions=(
                "Upload quarterly accomplishment reports on VAW cases:\n\n"
                "REQUIRED DOCUMENTS:\n"
                "- Accomplishment Report covering 1st to 3rd quarter of CY 2023\n"
                "- Must have received stamp by the C/MSWDO and C/MLGOO\n\n"
                "REQUIREMENTS:\n"
                "- Quarterly accomplishment reports based on database/records of VAW cases\n"
                "- Must cover 1st to 3rd quarter of CY 2023\n"
                "- Must contain relevant information such as:\n"
                "  * VAW services provided to victim-survivors\n"
                "  * Total number of cases documented for violating RA 9262 and other VAW-related laws\n"
                "  * Total barangay population\n"
                "  * Number of male and female in the barangay\n"
                "  * Minor to adult ratio\n"
                "- Must have received stamp from C/MSWDO and C/MLGOO\n\n"
                "VALIDATOR ACTION REQUIRED:\n"
                "- Input the NUMBER of quarterly accomplishment reports submitted\n\n"
                "IMPORTANT:\n"
                "- Reports must be properly stamped by C/MSWDO and C/MLGOO\n"
                "- Must cover the specified quarters of CY 2023"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_1_4_a",
                    label="Accomplishment Report covering 1st to 3rd quarter of CY 2023 with received stamp by the C/MSWDO and C/MLGOO",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Accomplishment reports are submitted\n"
                        "   - Reports are based on database/records of VAW cases\n\n"
                        "2. NUMBER INPUT REQUIRED:\n"
                        "   - Validator must input the NUMBER of quarterly accomplishment reports submitted\n"
                        "   - This is a required input field\n\n"
                        "3. COVERAGE PERIOD:\n"
                        "   - Reports cover 1st to 3rd quarter of CY 2023\n"
                        "   - Coverage period is clearly indicated\n\n"
                        "4. CONTENT VERIFICATION:\n"
                        "   - Contains relevant information on VAW cases\n"
                        "   - Includes services provided to victim-survivors\n"
                        "   - Shows total number of cases (RA 9262 and other VAW-related laws)\n"
                        "   - Includes barangay population data\n"
                        "   - Contains male/female and minor/adult statistics\n\n"
                        "5. STAMP VERIFICATION:\n"
                        "   - Reports have received stamp from C/MSWDO\n"
                        "   - Reports have received stamp from C/MLGOO\n"
                        "   - Stamps are clearly visible\n\n"
                        "NOTE: All quarterly reports must be properly stamped by both C/MSWDO and C/MLGOO."
                    ),
                    required=True,
                    requires_document_count=True,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.1.5
        SubIndicator(
            code="4.1.5",
            name="Database: Updated database on VAW cases reported to the barangay, with the following information at the minimum",
            upload_instructions=(
                "Upload documentation of updated VAW cases database:\n\n"
                "REQUIRED DOCUMENT:\n"
                "- Copy of the generated report or screenshot of the updated database on VAW cases\n"
                "- Database must be updated as of Dec 2024\n\n"
                "REQUIREMENTS:\n"
                "- Updated database on VAW cases reported to the barangay\n"
                "- Must contain the following information at the minimum:\n"
                "  a. Total number of VAW cases received\n"
                "     * Number of cases documented for violating RA 9262\n"
                "     * Number of cases documented for violating other VAW-related laws\n"
                "  b. Assistance provided to victim-survivors\n\n"
                "VALIDATOR ACTION REQUIRED:\n"
                "- Input the TOTAL NUMBER of VAW cases received\n"
                "- Input the TOTAL NUMBER of cases documented for violating RA 9262\n"
                "- Input the TOTAL NUMBER of cases documented for violating other VAW-related laws\n"
                "- Input the TOTAL NUMBER of assistance provided to victim-survivors\n\n"
                "IMPORTANT:\n"
                "- Database must be current (as of Dec 2024)\n"
                "- All required statistics must be available in the database"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_1_5_a",
                    label="Copy of the generated report or screenshot of the updated database on VAW cases reported to the barangay with the following information at the minimum",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Generated report or screenshot of database is present\n"
                        "   - Database is updated as of Dec 2024\n\n"
                        "2. NUMBER INPUTS REQUIRED:\n"
                        "   - INPUT 1: Total number of VAW cases received\n"
                        "   - INPUT 2: Total number of cases documented for violating RA 9262\n"
                        "   - INPUT 3: Total number of cases documented for violating other VAW-related laws\n"
                        "   - INPUT 4: Total number of assistance provided to victim-survivors\n"
                        "   - These are required input fields\n\n"
                        "3. DATABASE VERIFICATION:\n"
                        "   - Database contains VAW cases reported to the barangay\n"
                        "   - Information is organized and accessible\n"
                        "   - All required statistics are available\n\n"
                        "4. CONTENT VERIFICATION:\n"
                        "   - a. Total number of VAW cases received is documented\n"
                        "      * Number of cases for RA 9262 violations\n"
                        "      * Number of cases for other VAW-related law violations\n"
                        "   - b. Assistance provided to victim-survivors is documented\n\n"
                        "5. CURRENCY:\n"
                        "   - Database is updated as of Dec 2024\n"
                        "   - Information is current\n\n"
                        "NOTE: All required statistics must be clearly available in the database."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.1.6
        SubIndicator(
            code="4.1.6",
            name="Accomplishment Reports: Physical accomplishment OR fund utilization (only 1 of the below reports is required)",
            upload_instructions=(
                "Upload accomplishment report documentation:\n\n"
                "IMPORTANT: Choose ONE of the following options:\n\n"
                "OPTION 1 - PHYSICAL ACCOMPLISHMENT:\n"
                "- 2023 GAD Accomplishment Report, AND\n"
                "- Certification on the submitted CY 2023 GAD Accomplishment Report signed by the C/MSWDO or C/MLGOO\n"
                "- Must show at least 50% accomplishment of the physical targets in the GAD Plan\n\n"
                "VALIDATOR ACTION FOR OPTION 1:\n"
                "- Input the PERCENTAGE (%) of physical accomplishment rate\n"
                "- Formula: (Total number of activities/projects accomplished / Total number of activities/projects reflected in the GAD Plan) × 100\n\n"
                "OPTION 2 - FUND UTILIZATION:\n"
                "- Certification on the submitted CY 2023 GAD Accomplishment Report indicating at least 50% fund utilization of the CY 2023 GAD Budget signed by the C/MSWDO or C/MLGOO\n"
                "- Must show at least 50% fund utilization of the CY 2023 GAD Budget\n\n"
                "VALIDATOR ACTION FOR OPTION 2:\n"
                "- Input the AMOUNT UTILIZED (as of Dec 31, 2023)\n"
                "- Input the AMOUNT ALLOCATED for PPAs in the GAD Plan\n"
                "- Formula: (Total Amount Utilized / Total Amount Allocated) × 100\n\n"
                "IMPORTANT:\n"
                "- Only ONE option is required (either physical accomplishment OR fund utilization)\n"
                "- Either option must meet the 50% threshold"
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # OR logic: either physical OR budget
            checklist_items=[
                ChecklistItem(
                    id="4_1_6_a",
                    label="a. At least 50% accomplishment of the physical targets in the GAD Plan",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. APPLICABILITY:\n"
                        "   - This is OPTION 1 (Physical Accomplishment)\n"
                        "   - If barangay chose fund utilization option, check item 4_1_6_b instead\n\n"
                        "2. DOCUMENT PRESENCE:\n"
                        "   - 2023 GAD Accomplishment Report is present\n"
                        "   - Certification is present\n\n"
                        "3. CERTIFICATION VERIFICATION:\n"
                        "   - Certification is on the submitted CY 2023 GAD Accomplishment Report\n"
                        "   - Signed by C/MSWDO or C/MLGOO\n"
                        "   - Indicates at least 50% accomplishment of physical targets\n\n"
                        "4. PERCENTAGE INPUT REQUIRED:\n"
                        "   - Validator must input the % of physical accomplishment rate\n"
                        "   - Formula: (% of programs, project, and activities are completed / Total number of activities/projects reflected in the GAD Plan) × 100\n"
                        "   - This is a required input field\n\n"
                        "5. ACCOMPLISHMENT VERIFICATION:\n"
                        "   - At least 50% of physical targets are accomplished\n"
                        "   - Accomplishment is documented in the report\n"
                        "   - Certification confirms the accomplishment rate\n\n"
                        "NOTE: This is an OR requirement with option 4_1_6_b.\n"
                        "Only one option needs to pass."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_1_6_b",
                    label="b. At least 50% fund utilization of the CY 2023 GAD Budget",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. APPLICABILITY:\n"
                        "   - This is OPTION 2 (Fund Utilization)\n"
                        "   - If barangay chose physical accomplishment option, check item 4_1_6_a instead\n\n"
                        "2. DOCUMENT PRESENCE:\n"
                        "   - Certification is present\n\n"
                        "3. CERTIFICATION VERIFICATION:\n"
                        "   - Certification is on the submitted CY 2023 GAD Accomplishment Report\n"
                        "   - Indicates at least 50% fund utilization of the CY 2023 GAD Budget\n"
                        "   - Signed by C/MSWDO or C/MLGOO\n\n"
                        "4. AMOUNT INPUTS REQUIRED:\n"
                        "   - INPUT 1: Amount utilized (as of Dec 31, 2023)\n"
                        "   - INPUT 2: Amount allocated for PPAs in the GAD Plan\n"
                        "   - Formula: (Total Amount Utilized / Total Amount Allocated) × 100\n"
                        "   - These are required input fields\n\n"
                        "5. UTILIZATION VERIFICATION:\n"
                        "   - At least 50% of GAD Budget is utilized\n"
                        "   - Utilization is documented\n"
                        "   - Certification confirms the utilization rate\n\n"
                        "NOTE: This is an OR requirement with option 4_1_6_a.\n"
                        "Only one option needs to pass.\n"
                        "Either physical accomplishment OR fund utilization is acceptable."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=2
                ),
            ]
        ),

        # Sub-Indicator 4.1.7 (FOR PROFILING ONLY)
        SubIndicator(
            code="4.1.7",
            name="Referral Network (For Profiling): Presence of referral system and directory",
            upload_instructions=(
                "Upload referral network documentation:\n\n"
                "IMPORTANT: This sub-indicator is FOR PROFILING ONLY and does NOT affect pass/fail status.\n\n"
                "REQUIRED DOCUMENTS:\n"
                "1. Flow Chart based on Annex C - Establishment of Referral System\n"
                "2. Annex J - Directory Form\n\n"
                "REQUIREMENTS:\n"
                "- 4.1.7.1: Presence of Referral System Flow Chart (For profiling)\n"
                "- 4.1.7.2: Presence of Directory of agencies/individuals providing services to victim-survivors (For profiling)\n\n"
                "NOTE:\n"
                "- This is for profiling purposes only\n"
                "- Does not affect the overall functionality assessment of VAW Desk"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_1_7_1_a",
                    label="4.1.7.1: Presence of Referral System Flow Chart; and",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. FOR PROFILING ONLY:\n"
                        "   - This item is for PROFILING purposes only\n"
                        "   - Does NOT affect pass/fail status of the indicator\n\n"
                        "2. DOCUMENT PRESENCE:\n"
                        "   - Flow Chart based on Annex C is present\n"
                        "   - Shows Establishment of Referral System\n\n"
                        "3. FLOW CHART VERIFICATION:\n"
                        "   - Flow chart is present\n"
                        "   - Shows referral system process\n"
                        "   - Based on standard Annex C format\n\n"
                        "NOTE: This is for profiling only and does not affect VAW Desk functionality status."
                    ),
                    required=False,  # Not required for pass/fail
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_1_7_2_a",
                    label="4.1.7.2: Presence of Directory of agencies/individuals providing services to victim-survivors",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. FOR PROFILING ONLY:\n"
                        "   - This item is for PROFILING purposes only\n"
                        "   - Does NOT affect pass/fail status of the indicator\n\n"
                        "2. DOCUMENT PRESENCE:\n"
                        "   - Annex J - Directory Form is present\n\n"
                        "3. DIRECTORY VERIFICATION:\n"
                        "   - Directory of agencies/individuals is present\n"
                        "   - Lists service providers for victim-survivors\n"
                        "   - Based on standard Annex J format\n\n"
                        "NOTE: This is for profiling only and does not affect VAW Desk functionality status."
                    ),
                    required=False,  # Not required for pass/fail
                    requires_document_count=False,
                    display_order=2
                ),
            ]
        ),
    ]
)
