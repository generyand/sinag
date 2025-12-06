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

from app.indicators.base import Indicator, SubIndicator, ChecklistItem, FormNotes, NoteItem


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
                "Upload: EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) "
                "on the establishment of Barangay VAW Desk and designated VAW Desk Officer covering January to October 2023"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Upload Verification
                ChecklistItem(
                    id="4_1_1_upload_1",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the establishment of Barangay VAW Desk and designated VAW Desk Officer",
                    mov_description="Verification of uploaded Executive Order or similar issuance establishing the Barangay VAW Desk and designating the VAW Desk Officer",
                    required=True,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.1.2
        SubIndicator(
            code="4.1.2",
            name="Training: Attendance of the Barangay VAW Desk Officer to at least one (1) training/orientation related to gender-sensitive handling of VAW Cases not earlier than CY 2020",
            upload_instructions=(
                "Upload: At least one (1) copy of proof of training such as Certificate of Completion and/or Participation"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Upload Verification
                ChecklistItem(
                    id="4_1_2_upload_1",
                    label="At least one (1) copy of proof of training such as Certificate of Completion and/or Participation",
                    mov_description="Verification of uploaded proof of training for the Barangay VAW Desk Officer related to gender-sensitive handling of VAW cases not earlier than CY 2020",
                    required=True,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.1.3
        SubIndicator(
            code="4.1.3",
            name="Plan and Budget: Approved CY 2023 Barangay Gender and Development (GAD) Plan and Budget",
            upload_instructions=(
                "Upload: Approved Barangay GAD Plan and Budget for CY 2023"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Upload Verification
                ChecklistItem(
                    id="4_1_3_upload_1",
                    label="Approved Barangay GAD Plan and Budget",
                    mov_description="Verification of uploaded Approved Barangay Gender and Development (GAD) Plan and Budget",
                    required=True,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.1.4
        SubIndicator(
            code="4.1.4",
            name="Accomplishment Reports: Quarterly accomplishment reports based on the database/records of VAW cases reported in the barangay covering 1st to 3rd quarter of CY 2023 with received stamp by the C/MSWDO and C/MLGOO",
            upload_instructions=(
                "Upload: Accomplishment Report covering 1st to 3rd quarter of CY 2023 with received stamp by the C/MSWDO and C/MLGOO\n\n"
                "Quarterly accomplishment reports based on the database/records of VAW cases reported in the barangay "
                "with the following information at the minimum: total number of VAW cases received, assistance provided to victim-survivors, "
                "total number of cases documented for violating RA 9262 and other VAW-related laws, total barangay population, number of male "
                "and female in the barangay, and minor to adult ratio"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Upload Verification
                ChecklistItem(
                    id="4_1_4_upload_1",
                    label="Accomplishment Report covering 1st to 3rd quarter with received stamp by the C/MSWDO and C/MLGOO",
                    mov_description="Verification of uploaded quarterly accomplishment reports based on VAW cases database/records",
                    required=True,
                    display_order=1
                ),
                # Text Input Field
                ChecklistItem(
                    id="4_1_4_count",
                    label="Quarterly Accomplishment Reports were submitted",
                    mov_description="Please supply the number of documents submitted:",
                    required=True,
                    requires_document_count=True,  # This is a text input field
                    display_order=2
                ),
            ]
        ),

        # Sub-Indicator 4.1.5
        SubIndicator(
            code="4.1.5",
            name="Database: Updated database on VAW cases reported to the barangay, with the following information at the minimum",
            upload_instructions=(
                "Upload: Copy of the generated report or screenshot of the updated database on VAW cases reported to the barangay "
                "with the total no. of VAW cases and assistance provided\n\n"
                "a. total number of VAW cases received\n"
                "   - number of cases documented for violating RA 9262\n"
                "   - number of cases documented for violating other VAW-related laws\n"
                "b. assistance provided to victim-survivors"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Upload Verification
                ChecklistItem(
                    id="4_1_5_upload_1",
                    label="Copy of the generated report or screenshot of the updated database on VAW cases reported to the barangay with the following information at the minimum:",
                    mov_description="Verification of uploaded database report or screenshot showing VAW cases and assistance provided",
                    required=True,
                    display_order=1
                ),
                # Text Input Fields
                ChecklistItem(
                    id="4_1_5_total_cases",
                    label="Total number of VAW cases received",
                    mov_description="Please supply the number of documents submitted:",
                    required=True,
                    requires_document_count=True,  # This is a text input field
                    display_order=2
                ),
                ChecklistItem(
                    id="4_1_5_ra_9262",
                    label="Number of cases documented for violating RA 9262",
                    mov_description=None,
                    required=True,
                    requires_document_count=True,  # This is a text input field
                    display_order=3
                ),
                ChecklistItem(
                    id="4_1_5_other_laws",
                    label="Number of cases documented for violating other VAW-related laws",
                    mov_description=None,
                    required=True,
                    requires_document_count=True,  # This is a text input field
                    display_order=4
                ),
                ChecklistItem(
                    id="4_1_5_assistance",
                    label="Assistance provided to victim-survivors",
                    mov_description=None,
                    required=True,
                    requires_document_count=True,  # This is a text input field
                    display_order=5
                ),
            ],
            notes=FormNotes(
                title="Minimum Information:",
                items=[
                    NoteItem(label="a.", text="Total number of VAW cases received"),
                    NoteItem(label="", text="i. Number of cases documented for violating RA 9262"),
                    NoteItem(label="", text="ii. Number of cases documented for violating other VAW-related laws"),
                    NoteItem(label="b.", text="Assistance provided to victim-survivors"),
                ]
            )
        ),

        # Sub-Indicator 4.1.6
        SubIndicator(
            code="4.1.6",
            name="Accomplishment Reports: Physical accomplishment OR fund utilization (only 1 of the below reports is required)",
            upload_instructions=(
                "Upload the following:\n\n"
                "SHARED (Required):\n"
                "- GAD Accomplishment Report\n\n"
                "PLUS ONE of the following (PHYSICAL or FINANCIAL):\n\n"
                "OPTION A - PHYSICAL:\n"
                "- Certification on the submitted GAD Accomplishment Report indicating at least 50% accomplishment of the physical targets in the GAD Plan signed by the C/MSWDO or C/MLGOO\n\n"
                "OR\n\n"
                "OPTION B - FINANCIAL:\n"
                "- Certification on the submitted GAD Accomplishment Report indicating at least 50% fund utilization of the GAD Budget signed by the C/MSWDO or C/MLGOO"
            ),
            validation_rule="SHARED_PLUS_OR_LOGIC",  # SHARED + (A OR B)
            checklist_items=[
                # SHARED document verification
                ChecklistItem(
                    id="4_1_6_report",
                    label="GAD Accomplishment Report",
                    mov_description="Verification of uploaded GAD Accomplishment Report",
                    item_type="checkbox",
                    required=True,
                    display_order=1,
                    option_group="shared"
                ),
                # Option A: Physical Accomplishment - YES/NO assessment
                ChecklistItem(
                    id="4_1_6_option_a",
                    label="a. At least 50% accomplishment of the physical targets in the GAD Plan",
                    mov_description="Checkbox for physical accomplishment option",
                    item_type="assessment_field",
                    required=False,
                    display_order=4,
                    option_group="option_a"
                ),
                ChecklistItem(
                    id="4_1_6_cert_physical",
                    label="Certification on the submitted GAD Accomplishment Report indicating at least 50% accomplishment of the physical targets in the GAD Plan signed by the C/MSWDO or C/MLGOO",
                    mov_description="Verification of certification for physical accomplishment",
                    item_type="checkbox",
                    required=False,
                    display_order=5,
                    option_group="option_a"
                ),
                ChecklistItem(
                    id="4_1_6_physical_accomplished",
                    label="Total number of activities/projects accomplished",
                    mov_description="Please supply the required information:",
                    item_type="calculation_field",
                    required=False,
                    display_order=6,
                    option_group="option_a"
                ),
                ChecklistItem(
                    id="4_1_6_physical_reflected",
                    label="Total number of activities/projects reflected in the Plan",
                    item_type="calculation_field",
                    required=False,
                    display_order=7,
                    option_group="option_a"
                ),
                # OR Separator (info_text)
                ChecklistItem(
                    id="4_1_6_or",
                    label="OR",
                    mov_description="OR",
                    item_type="info_text",
                    required=False,
                    display_order=8
                ),
                # Option B: Fund Utilization - YES/NO assessment
                ChecklistItem(
                    id="4_1_6_option_b",
                    label="b. At least 50% fund utilization of the GAD Budget",
                    mov_description="Checkbox for fund utilization option",
                    item_type="assessment_field",
                    required=False,
                    display_order=9,
                    option_group="option_b"
                ),
                ChecklistItem(
                    id="4_1_6_cert_financial",
                    label="Certification on the submitted GAD Accomplishment Report indicating at least 50% fund utilization of the GAD Budget signed by the C/MSWDO or C/MLGOO",
                    mov_description="Verification of certification for 50% fund utilization",
                    item_type="checkbox",
                    required=False,
                    display_order=10,
                    option_group="option_b"
                ),
                ChecklistItem(
                    id="4_1_6_financial_utilized",
                    label="Total amount utilized (as of Dec. 31, 2023)",
                    mov_description="Please supply the required information:",
                    item_type="calculation_field",
                    required=False,
                    display_order=11,
                    option_group="option_b"
                ),
                ChecklistItem(
                    id="4_1_6_financial_allocated",
                    label="Total amount allocated for PPAs in the GAD Plan",
                    item_type="calculation_field",
                    required=False,
                    display_order=12,
                    option_group="option_b"
                ),
            ]
        ),

        # Sub-Indicator 4.1.7 (FOR PROFILING ONLY)
        SubIndicator(
            code="4.1.7",
            name="Referral Network (For Profiling): Presence of referral system and directory",
            upload_instructions=(
                "Upload the following (both required):\n\n"
                "1. 4.1.7.1. Presence of Referral System Flow Chart (For profiling)\n"
                "2. 4.1.7.2. Presence of Directory of agencies/individuals providing services to victim-survivors (For profiling)"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Upload Verification for Flow Chart
                ChecklistItem(
                    id="4_1_7_1_upload",
                    label="4.1.7.1. Presence of Referral System Flow Chart (For profiling) - Flow Chart based on Annex C - Establishment of Referral System",
                    mov_description="Verification of uploaded Flow Chart based on Annex C (For profiling only)",
                    required=False,  # Not required for pass/fail - profiling only
                    display_order=1
                ),
                # Upload Verification for Directory
                ChecklistItem(
                    id="4_1_7_2_upload",
                    label="4.1.7.2. Presence of Directory of agencies/individuals providing services to victim-survivors (For profiling) - Annex J - Directory Form",
                    mov_description="Verification of uploaded Annex J - Directory Form (For profiling only)",
                    required=False,  # Not required for pass/fail - profiling only
                    display_order=2
                ),
            ]
        ),
    ]
)
