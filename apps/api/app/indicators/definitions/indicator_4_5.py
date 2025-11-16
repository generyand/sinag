"""
Indicator 4.5: Functionality of the Barangay Council for the Protection of Children (BCPC)

Governance Area: 4 (Social Protection and Sensitivity)
BBI Status: Yes (BCPC is one of the 9 mandatory barangay-based institutions)

IMPORTANT NOTES FOR PHASE 9 (VALIDATION SERVICE):

1. Six Sub-Indicators Structure:
   - 4.5.1: Organized BCPC with composition compliant to DILG MC No. 2021-039
   - 4.5.2: Attendance to training/orientation (not earlier than CY 2020)
   - 4.5.3: Approved BCPC Annual Work and Financial Plan
   - 4.5.4: Database on children (updated as of Dec 31, 2023)
   - 4.5.5: System (Localized Flow Chart, Comprehensive Barangay Juvenile Intervention Program, CAR/CICL registry)
   - 4.5.6: Accomplishment Reports (OR logic: physical targets OR fund utilization)

2. Input Fields Required:
   - Sub-indicator 4.5.6: PERCENTAGE and AMOUNT inputs for:
     * Physical accomplishment rate (%)
     * Amount utilized (for BCPC AWFP Budget)
     * Amount allocated (for BCPC AWFP Budget)

3. OR Logic in Sub-indicator 4.5.6:
   - Option A: At least 50% accomplishment of physical targets in BCPC AWFP, OR
   - Option B: At least 50% utilization rate of CY 2023 BCPC AWFP Budget
   - Validation rule: "ANY_ITEM_REQUIRED" (either option is acceptable)

4. Year Dependency:
   - Sub-indicator 4.5.1: BCPC organization covering January to October 2023
   - Sub-indicator 4.5.2: Training not earlier than CY 2020
   - Sub-indicator 4.5.3: BCPC Annual Work and Financial Plan for CY 2023
   - Sub-indicator 4.5.4: Database updated as of Dec 31, 2023
   - Sub-indicator 4.5.5: Localized Flow Chart not earlier than CY 2020
   - Sub-indicator 4.5.6: Accomplishment Report for CY 2023

5. Validation Workflow:
   - Validator verifies BCPC organization with proper composition
   - Validator confirms training attendance (CY 2020 or later)
   - Validator checks approved BCPC Annual Work and Financial Plan
   - Validator verifies database on children (updated as of Dec 31, 2023)
   - Validator checks system components (Flow Chart, Juvenile Intervention Program, CAR/CICL registry)
   - Validator verifies accomplishment (either physical targets OR budget utilization)
   - All sub-indicators must pass for overall indicator to pass

6. BBI Status Update:
   - Since this is a BBI indicator (is_bbi=True), passing means BCPC is "Functional"
   - Failing means BCPC is "Non-Functional"
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 4.5: Functionality of the Barangay Council for the Protection of Children (BCPC)
INDICATOR_4_5 = Indicator(
    code="4.5",
    name="Functionality of the Barangay Council for the Protection of Children (BCPC)",
    governance_area_id=4,  # Social Protection and Sensitivity
    is_bbi=True,  # BCPC is a mandatory BBI
    sort_order=5,
    description="Functionality of the Barangay Council for the Protection of Children (BCPC)",
    children=[
        # Sub-Indicator 4.5.1
        SubIndicator(
            code="4.5.1",
            name="Structure: Organized BCPC with its composition compliant to the provisions of DILG MC No. 2021-039",
            upload_instructions=(
                "Upload documentation of BCPC organization:\n\n"
                "REQUIRED DOCUMENT:\n"
                "- EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs)\n"
                "- Must document the establishment of BCPC\n"
                "- Must cover January to October 2023\n\n"
                "REQUIREMENTS:\n"
                "- Document must be an Executive Order or similar official issuance\n"
                "- Must be signed by the Punong Barangay (PB)\n"
                "- Must be countersigned by Barangay Secretary and SBMs\n"
                "- Must establish BCPC with composition compliant to DILG MC No. 2021-039\n"
                "- Coverage period: January to October 2023\n\n"
                "IMPORTANT:\n"
                "- The EO/resolution must be properly signed and approved\n"
                "- BCPC composition must comply with DILG MC No. 2021-039\n"
                "- Document must clearly establish the BCPC organization"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_5_1_a",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the establishment of BCPC covering January to October 2023",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Executive Order (EO), resolution, or ordinance is present\n"
                        "   - Document establishes the BCPC\n\n"
                        "2. SIGNATURE VERIFICATION:\n"
                        "   - Document is signed by the Punong Barangay (PB)\n"
                        "   - Document is countersigned by Barangay Secretary\n"
                        "   - Document is countersigned by Sangguniang Barangay Members (SBMs)\n"
                        "   - All signatures are clearly visible\n\n"
                        "3. BCPC COMPOSITION VERIFICATION:\n"
                        "   - BCPC composition is compliant to the provisions of DILG MC No. 2021-039\n"
                        "   - Composition requirements are met\n"
                        "   - Members are properly designated\n\n"
                        "4. COVERAGE PERIOD:\n"
                        "   - Document covers January to October 2023\n"
                        "   - Coverage period is clearly indicated\n\n"
                        "NOTE: The BCPC must be organized with composition compliant to DILG MC No. 2021-039."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.5.2
        SubIndicator(
            code="4.5.2",
            name="Trainings: Attendance of the Members of the BCPC to a training/orientation related to their functions not earlier than CY 2020",
            upload_instructions=(
                "Upload documentation of BCPC members' training attendance:\n\n"
                "REQUIRED DOCUMENT:\n"
                "- At least one (1) copy of proof of training\n"
                "- Certificate of Completion and/or Participation\n\n"
                "REQUIREMENTS:\n"
                "- Training or orientation must be related to BCPC functions\n"
                "- Training must be conducted NOT EARLIER than CY 2020\n"
                "- Certificate must show BCPC member attendance\n"
                "- Certificate should indicate:\n"
                "  * Name of training/orientation\n"
                "  * Date of training (CY 2020 or later)\n"
                "  * Name of BCPC member attendee\n"
                "  * Proof of completion/participation\n\n"
                "ACCEPTABLE TRAINING/ORIENTATIONS:\n"
                "- BCPC training\n"
                "- Child protection seminar\n"
                "- Juvenile justice training\n"
                "- Other BCPC-related capacity building activities\n\n"
                "IMPORTANT:\n"
                "- Training conducted before CY 2020 is NOT acceptable\n"
                "- Ensure the date of training is clearly visible in the certificate"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_5_2_a",
                    label="At least one (1) copy of proof of training such as Certificate of Completion and/or Participation",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Certificate of Completion and/or Participation is present\n"
                        "   - At least 1 copy is submitted\n\n"
                        "2. TRAINING TYPE:\n"
                        "   - Training/orientation is related to BCPC functions\n"
                        "   - Topics include child protection, juvenile justice, or BCPC matters\n\n"
                        "3. DATE VERIFICATION:\n"
                        "   - Training was conducted NOT EARLIER than CY 2020\n"
                        "   - Date of training is clearly visible\n"
                        "   - Any training before CY 2020 should be rejected\n\n"
                        "4. ATTENDEE VERIFICATION:\n"
                        "   - Certificate shows BCPC member attendance\n"
                        "   - Name of attendee is clearly indicated\n"
                        "   - Attendee is confirmed to be a BCPC member\n\n"
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

        # Sub-Indicator 4.5.3
        SubIndicator(
            code="4.5.3",
            name="Plan: Presence of an approved BCPC Annual Work and Financial Plan",
            upload_instructions=(
                "Upload documentation of approved BCPC Annual Work and Financial Plan:\n\n"
                "REQUIRED DOCUMENT:\n"
                "- Approved BCPC Annual Work and Financial Plan (AWFP) for CY 2023\n\n"
                "REQUIREMENTS:\n"
                "- BCPC Annual Work and Financial Plan must be approved\n"
                "- Must be for Calendar Year 2023\n"
                "- Plan should include work programs and financial allocations\n"
                "- Document must be properly approved\n\n"
                "IMPORTANT:\n"
                "- The BCPC AWFP must be approved and for CY 2023\n"
                "- Ensure approval signatures are visible"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_5_3_a",
                    label="Approved BCPC Annual Work and Financial Plan (AWFP) for CY 2023",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - BCPC Annual Work and Financial Plan is present\n"
                        "   - Document is for CY 2023\n\n"
                        "2. APPROVAL VERIFICATION:\n"
                        "   - BCPC AWFP is approved\n"
                        "   - Approval signatures are visible\n"
                        "   - Document is properly authorized\n\n"
                        "3. CONTENT VERIFICATION:\n"
                        "   - Contains work programs and activities\n"
                        "   - Includes financial plan/allocations\n"
                        "   - Properly structured as an Annual Work and Financial Plan\n\n"
                        "4. COVERAGE PERIOD:\n"
                        "   - Document is for Calendar Year 2023\n"
                        "   - Coverage period is clearly indicated\n\n"
                        "NOTE: The BCPC AWFP must be approved and for CY 2023."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.5.4
        SubIndicator(
            code="4.5.4",
            name="Database: Establishment and maintenance of updated Database on Children disaggregated by age, sex, ethnicity, with or without disabilities, OSCY, etc.",
            upload_instructions=(
                "Upload documentation of database on children:\n\n"
                "REQUIRED DOCUMENT:\n"
                "- Copy of the generated report or screenshot of the updated database on children\n"
                "- Must cover January to October 31, 2023\n"
                "- Must be updated as of Dec 31, 2023\n\n"
                "REQUIREMENTS:\n"
                "- Database must be on children\n"
                "- Must be disaggregated by:\n"
                "  * Age\n"
                "  * Sex\n"
                "  * Ethnicity\n"
                "  * With or without disabilities\n"
                "  * OSCY (Out-of-School Children and Youth)\n"
                "  * Other relevant categories\n"
                "- Database must be updated as of Dec 31, 2023\n"
                "- Coverage period: January to October 31, 2023\n\n"
                "ACCEPTABLE DOCUMENTS:\n"
                "- Generated report from database\n"
                "- Screenshot of updated database\n"
                "- Excel file showing database structure\n\n"
                "IMPORTANT:\n"
                "- Database must show disaggregation by required categories\n"
                "- Must be updated as of Dec 31, 2023"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_5_4_a",
                    label="Copy of the generated report or screenshot of the updated database on children covering January to October 31, 2023",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Generated report or screenshot of database is present\n"
                        "   - Database is on children\n\n"
                        "2. DISAGGREGATION VERIFICATION:\n"
                        "   - Database is disaggregated by age\n"
                        "   - Database is disaggregated by sex\n"
                        "   - Database is disaggregated by ethnicity\n"
                        "   - Database shows with or without disabilities\n"
                        "   - Database includes OSCY (Out-of-School Children and Youth)\n"
                        "   - Other relevant categories are included\n\n"
                        "3. UPDATE STATUS:\n"
                        "   - Database is updated as of Dec 31, 2023\n"
                        "   - Update date is clearly indicated\n\n"
                        "4. COVERAGE PERIOD:\n"
                        "   - Database covers January to October 31, 2023\n"
                        "   - Coverage period is clearly indicated\n\n"
                        "NOTE: The database must be properly disaggregated and updated as of Dec 31, 2023."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.5.5
        SubIndicator(
            code="4.5.5",
            name="System",
            upload_instructions=(
                "Upload documentation of BCPC systems:\n\n"
                "REQUIRED DOCUMENTS:\n"
                "1. Updated Localized Flow Chart of Referral System\n"
                "2. Copy of Comprehensive Barangay Juvenile Intervention Program/Diversion Program\n"
                "3. Copy of Juvenile Justice and Welfare Council's Children at Risk (CAR) and Children in Conflict with the Law (CICL) registry\n\n"
                "REQUIREMENTS:\n"
                "- All three documents must be submitted\n"
                "- Localized Flow Chart must be updated (not earlier than CY 2020)\n"
                "- Comprehensive Barangay Juvenile Intervention Program for profiling\n"
                "- CAR and CICL registry for profiling\n\n"
                "IMPORTANT:\n"
                "- All system components must be present\n"
                "- Documents must be properly maintained and updated"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_5_5_a",
                    label="a. Presence of updated Localized Flow Chart of Referral System not earlier than CY 2020",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Updated Localized Flow Chart of Referral System is present\n\n"
                        "2. UPDATE STATUS:\n"
                        "   - Flow Chart is not earlier than CY 2020\n"
                        "   - Update date is clearly indicated\n\n"
                        "3. CONTENT VERIFICATION:\n"
                        "   - Flow Chart shows referral system\n"
                        "   - Chart is localized to the barangay\n"
                        "   - Properly structured as a flow chart\n\n"
                        "NOTE: The Localized Flow Chart must be updated (not earlier than CY 2020).\n"
                        "This is for profiling purposes."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_5_5_b",
                    label="b. Presence of Comprehensive Barangay Juvenile Intervention Program/Diversion Program (For profiling)",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Copy of Comprehensive Barangay Juvenile Intervention Program is present\n"
                        "   - OR Diversion Program is present\n\n"
                        "2. CONTENT VERIFICATION:\n"
                        "   - Program is comprehensive\n"
                        "   - Covers barangay juvenile intervention\n"
                        "   - May include diversion program components\n\n"
                        "3. PROFILING PURPOSE:\n"
                        "   - This document is for profiling purposes\n"
                        "   - Program structure is clearly defined\n\n"
                        "NOTE: This is for profiling purposes to assess the presence of the intervention program."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=2
                ),
                ChecklistItem(
                    id="4_5_5_c",
                    label="c. Presence of Children at Risk (CAR) and Children in Conflict with the Law (CICL) registry (For profiling)",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Copy of Juvenile Justice and Welfare Council's CAR registry is present\n"
                        "   - Copy of CICL registry is present\n\n"
                        "2. REGISTRY VERIFICATION:\n"
                        "   - CAR (Children at Risk) registry is maintained\n"
                        "   - CICL (Children in Conflict with the Law) registry is maintained\n"
                        "   - Registries are from Juvenile Justice and Welfare Council\n\n"
                        "3. PROFILING PURPOSE:\n"
                        "   - This document is for profiling purposes\n"
                        "   - Registries show tracking of CAR and CICL\n\n"
                        "NOTE: This is for profiling purposes to assess the presence of CAR and CICL registries."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=3
                ),
            ]
        ),

        # Sub-Indicator 4.5.6
        SubIndicator(
            code="4.5.6",
            name="Accomplishment Reports: Physical accomplishment OR financial utilization (only 1 of the below reports is required)",
            upload_instructions=(
                "Upload accomplishment report documentation:\n\n"
                "IMPORTANT: Choose ONE of the following options:\n\n"
                "OPTION 1 - PHYSICAL ACCOMPLISHMENT:\n"
                "- Approved Accomplishment Report on BCPC AWFP for CY 2023\n"
                "- Must have received stamp by the City/Municipality Inter-Agency Monitoring Task Force (IMTF)\n"
                "- Must show at least 50% accomplishment of the physical targets in the BCPC AWFP\n\n"
                "VALIDATOR ACTION FOR OPTION 1:\n"
                "- Input the PERCENTAGE (%) of programs, projects, and activities completed\n"
                "- Formula: (Total number of activities/projects accomplished / Total number of activities/projects reflected in the BCPC AWFP) × 100\n\n"
                "OPTION 2 - FUND UTILIZATION:\n"
                "- Must show at least 50% utilization rate of CY 2023 BCPC AWFP Budget\n\n"
                "VALIDATOR ACTION FOR OPTION 2:\n"
                "- Input the AMOUNT UTILIZED (as of Dec 31, 2023)\n"
                "- Input the AMOUNT ALLOCATED for PPAs in the BCPC AWFP\n"
                "- Formula: (Total Amount Utilized / Total Amount Allocated) × 100\n\n"
                "IMPORTANT:\n"
                "- Only ONE option is required (either physical accomplishment OR fund utilization)\n"
                "- Either option must meet the 50% threshold"
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # OR logic: either physical OR budget
            checklist_items=[
                ChecklistItem(
                    id="4_5_6_a",
                    label="a. At least 50% accomplishment of the physical targets in the BCPC AWFP",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. APPLICABILITY:\n"
                        "   - This is OPTION 1 (Physical Accomplishment)\n"
                        "   - If barangay chose fund utilization option, check item 4_5_6_b instead\n\n"
                        "2. DOCUMENT PRESENCE:\n"
                        "   - Approved Accomplishment Report on BCPC AWFP for CY 2023 is present\n"
                        "   - Report has received stamp by the City/Municipality Inter-Agency Monitoring Task Force (IMTF)\n\n"
                        "3. STAMP VERIFICATION:\n"
                        "   - Report has received stamp from City/Municipality IMTF\n"
                        "   - Stamp is clearly visible\n\n"
                        "4. PERCENTAGE INPUT REQUIRED:\n"
                        "   - Validator must input the % of programs, projects, and activities completed\n"
                        "   - Formula: (Total number of activities/projects accomplished / Total number of activities/projects reflected in the BCPC AWFP) × 100\n"
                        "   - This is a required input field\n\n"
                        "5. ACCOMPLISHMENT VERIFICATION:\n"
                        "   - At least 50% of physical targets are accomplished\n"
                        "   - Accomplishment is documented in the report\n"
                        "   - Report shows progress on BCPC AWFP activities\n\n"
                        "NOTE: This is an OR requirement with option 4_5_6_b.\n"
                        "Only one option needs to pass."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_5_6_b",
                    label="b. At least 50% utilization rate of CY 2023 BCPC AWFP Budget",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. APPLICABILITY:\n"
                        "   - This is OPTION 2 (Fund Utilization)\n"
                        "   - If barangay chose physical accomplishment option, check item 4_5_6_a instead\n\n"
                        "2. AMOUNT INPUTS REQUIRED:\n"
                        "   - INPUT 1: Amount utilized (as of Dec 31, 2023)\n"
                        "   - INPUT 2: Amount allocated for PPAs in the BCPC AWFP\n"
                        "   - Formula: (Total Amount Utilized / Total Amount Allocated) × 100\n"
                        "   - These are required input fields\n\n"
                        "3. UTILIZATION VERIFICATION:\n"
                        "   - At least 50% of BCPC AWFP Budget is utilized\n"
                        "   - Utilization is documented\n"
                        "   - Budget utilization rate meets minimum requirement\n\n"
                        "NOTE: This is an OR requirement with option 4_5_6_a.\n"
                        "Only one option needs to pass.\n"
                        "Either physical accomplishment OR fund utilization is acceptable."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=2
                ),
            ]
        ),
    ]
)
