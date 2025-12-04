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
                "Upload: EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the establishment of BCPC covering January to October 2023"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_5_1_a",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the establishment of BCPC covering January to October 2023",
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
                "Upload: At least one (1) copy of proof of training such as Certificate of Completion and/or Participation"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_5_2_a",
                    label="At least one (1) copy of proof of training such as Certificate of Completion and/or Participation",
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
                "Upload: Approved BCPC Annual Work and Financial Plan (AWFP) for CY 2023"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_5_3_a",
                    label="Approved BCPC Annual Work and Financial Plan (AWFP) for CY 2023",
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
                "Upload: Copy of the generated report or screenshot of the updated database on children covering January to October 31, 2023"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_5_4_a",
                    label="Copy of the generated report or screenshot of the updated database on children covering January to October 31, 2023",
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
                "Upload the following documents (all required):\n\n"
                "1. Updated Localized Flow Chart of Referral System not earlier than CY 2020\n"
                "2. Copy of Comprehensive Barangay Juvenile Intervention Program/Diversion program\n"
                "3. Copy of Juvenile Justice and Welfare Council's Children at Risk (CAR) and Children in Conflict with the Law (CICL) registry (For profiling)"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_5_5_a",
                    label="Updated Localized Flow Chart of Referral System",
                    mov_description="Verification of uploaded Localized Flow Chart of Referral System",
                    item_type="checkbox",
                    required=True,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_5_5_b",
                    label="Copy of Comprehensive Barangay Juvenile Intervention Program/Diversion Program",
                    mov_description="Verification of uploaded Comprehensive Barangay Juvenile Intervention Program",
                    item_type="checkbox",
                    required=True,
                    display_order=2
                ),
                ChecklistItem(
                    id="4_5_5_c",
                    label="Copy of Juvenile Justice and Welfare Council's Children at Risk (CAR) and Children in Conflict with the Law (CICL) registry",
                    mov_description="Verification of uploaded CAR and CICL registry",
                    item_type="checkbox",
                    required=True,
                    display_order=3
                ),
            ]
        ),

        # Sub-Indicator 4.5.6
        SubIndicator(
            code="4.5.6",
            name="Accomplishment Reports: Physical accomplishment OR financial utilization (only 1 of the below reports is required)",
            upload_instructions=(
                "Upload:\n"
                "- (PHYSICAL or/and FINANCIAL) Approved Accomplishment Report on BCPC AWFP for CY 2023 with received stamp by the City/Municipality Inter-Agency Monitoring Task Force (IMTF)"
            ),
            validation_rule="OR_LOGIC_AT_LEAST_1_REQUIRED",  # OR logic: Physical OR Financial
            checklist_items=[
                # Single shared upload field for PHYSICAL or/and FINANCIAL
                ChecklistItem(
                    id="4_5_6_upload",
                    label="Approved Accomplishment Report on BCPC AWFP for CY 2023 with received stamp by the City/Municipality Inter-Agency Monitoring Task Force (IMTF)",
                    mov_description="Verification of uploaded Accomplishment Report with received stamp by IMTF",
                    item_type="checkbox",
                    required=True,
                    display_order=1
                ),
                # OPTION A - Physical Accomplishment
                ChecklistItem(
                    id="4_5_6_a",
                    label="a. At least 50% accomplishment of the physical targets in the BCPC AWFP",
                    mov_description="Assessment for physical accomplishment option",
                    item_type="assessment_field",
                    required=False,
                    display_order=3,
                    option_group="Option A"
                ),
                ChecklistItem(
                    id="4_5_6_physical_accomplished",
                    label="Total number of activities/projects accomplished",
                    mov_description="Please supply the required information:",
                    item_type="calculation_field",
                    required=False,
                    display_order=4.1,
                    option_group="Option A"
                ),
                ChecklistItem(
                    id="4_5_6_physical_reflected",
                    label="Total number of activities/projects reflected in the Plan",
                    mov_description="Please supply the required information:",
                    item_type="calculation_field",
                    required=False,
                    display_order=4.2,
                    option_group="Option A"
                ),
                # OR separator (info_text)
                ChecklistItem(
                    id="4_5_6_or",
                    label="OR",
                    mov_description="OR",
                    item_type="info_text",
                    required=False,
                    display_order=5
                ),
                # OPTION B - Fund Utilization
                ChecklistItem(
                    id="4_5_6_b",
                    label="b. At least 50% utilization rate of CY 2023 BCPC AWFP Budget",
                    mov_description="Assessment for fund utilization option",
                    item_type="assessment_field",
                    required=False,
                    display_order=6,
                    option_group="Option B"
                ),
                ChecklistItem(
                    id="4_5_6_financial_utilized",
                    label="Total amount utilized (as of Dec 31, 2023)",
                    mov_description="Please supply the required information:",
                    item_type="calculation_field",
                    required=False,
                    display_order=7.1,
                    option_group="Option B"
                ),
                ChecklistItem(
                    id="4_5_6_financial_allocated",
                    label="Total amount allocated for PPAs in the BCPC AWFP",
                    mov_description="Please supply the required information:",
                    item_type="calculation_field",
                    required=False,
                    display_order=7.2,
                    option_group="Option B"
                ),
            ]
        ),
    ]
)
