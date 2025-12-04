"""
Indicator 6.1: Functionality of the Barangay Ecological Solid Waste Management Committee (BESWMC)

Governance Area: 6 (Environmental Management)
BBI Status: Yes (BESWMC is BBI #9 - one of the 9 mandatory barangay-based institutions)

IMPORTANT NOTES FOR PHASE 9 (VALIDATION SERVICE):

1. Four Sub-Indicators Structure:
   - 6.1.1: Organized BESWMC with composition compliant to DILG MC No. 2018-112
   - 6.1.2: Approved Solid Waste Management Program/Plan with corresponding fund allocation
   - 6.1.3: Attendance of BESWMC to necessary training (not earlier than CY 2020)
   - 6.1.4: Accomplishment Reports (OR logic: physical targets OR fund utilization)

2. Input Fields Required:
   - Sub-indicator 6.1.1: DATE input (Date of approval for EO/resolution)
   - Sub-indicator 6.1.4: DOCUMENT COUNT input (number of Monthly Accomplishment Reports)
   - Sub-indicator 6.1.4.a: PERCENTAGE input (physical accomplishment rate)
   - Sub-indicator 6.1.4.b: AMOUNT inputs (amount utilized and amount allocated)

3. OR Logic in Sub-indicator 6.1.4:
   - Option A: At least 50% accomplishment of physical targets in BESWMP, OR
   - Option B: At least 50% utilization rate of CY 2023 BESWM Budget
   - Validation rule: "ANY_ITEM_REQUIRED" (either option is acceptable)

4. Year Dependency:
   - Sub-indicator 6.1.1: EO/resolution covering CY 2023
   - Sub-indicator 6.1.2: Approved SWMP covering CY 2023
   - Sub-indicator 6.1.3: Training not earlier than CY 2020
   - Sub-indicator 6.1.4: Accomplishment Reports covering July-September 2023
   - Future assessments may need to update these baseline years

5. Validation Workflow:
   - Validator verifies BESWMC organization with proper composition (inputs date of approval)
   - Validator confirms approved SWMP with fund allocation
   - Validator checks training attendance (not earlier than CY 2020)
   - Validator verifies accomplishment (either physical targets OR budget utilization)
   - All sub-indicators must pass for overall indicator to pass

6. BBI Status Update:
   - Since this is a BBI indicator (is_bbi=True), passing means BESWMC is "Functional"
   - Failing means BESWMC is "Non-Functional"
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 6.1: Functionality of the Barangay Ecological Solid Waste Management Committee (BESWMC)
INDICATOR_6_1 = Indicator(
    code="6.1",
    name="Functionality of the Barangay Ecological Solid Waste Management Committee (BESWMC)",
    governance_area_id=6,  # Environmental Management
    is_bbi=True,  # BESWMC is BBI #9
    sort_order=1,
    description="Functionality of the Barangay Ecological Solid Waste Management Committee (BESWMC)",
    children=[
        # Sub-Indicator 6.1.1
        SubIndicator(
            code="6.1.1",
            name="Structure: Organized BESWMC with composition compliant to DILG MC No. 2018-112",
            upload_instructions=(
                "Upload: EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the organization of the BESWMC\n\n"
                "Please supply the required information:\n"
                "Date of approval"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="6_1_1_a",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the organization of the BESWMC",
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="6_1_1_date",
                    label="Date of approval",
                    mov_description="Please supply the required information:",
                    item_type="date_input",
                    required=True,
                    display_order=2
                ),
            ]
        ),

        # Sub-Indicator 6.1.2
        SubIndicator(
            code="6.1.2",
            name="Plan: Approved Solid Waste Management Program/Plan with corresponding fund allocation",
            upload_instructions=(
                "Upload: Approved Solid Waste Management Program/Plan covering CY 2023 with corresponding fund allocation"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="6_1_2_a",
                    label="Approved Solid Waste Management Program/Plan covering CY 2023 with corresponding fund allocation",
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 6.1.3
        SubIndicator(
            code="6.1.3",
            name="Training: Attendance of BESWMC to necessary training relative to promoting environmental protection, preservation and awareness not earlier than CY 2020",
            upload_instructions=(
                "Upload: At least one (1) copy of proof of training such as Certificate of Completion and/or Participation"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="6_1_3_a",
                    label="At least one (1) copy of proof of training such as Certificate of Completion and/or Participation",
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 6.1.4
        SubIndicator(
            code="6.1.4",
            name="Accomplishment Reports: Physical accomplishment OR fund utilization (only 1 of the below reports is required)",
            upload_instructions=(
                "Upload:\n"
                "- Three (3) Monthly Accomplishment Reports covering July-September 2023\n\n"
                "OPTION A - PHYSICAL:\n"
                "To compute Physical Accomplishment Rate:\n"
                "(Total number of activities/projects accomplished / Total number of activities/projects reflected in the BESWMP) × 100\n\n"
                "OR\n\n"
                "OPTION B - FINANCIAL:\n"
                "Amount utilized (as of Dec 31, 2023):\n"
                "Amount allocated for PPAs in the BESWM Plan:\n\n"
                "To compute % utilization:\n"
                "(Total Amount Utilized / Total Amount Allocated) × 100"
            ),
            validation_rule="OR_LOGIC_AT_LEAST_1_REQUIRED",  # OR logic: either physical OR budget
            checklist_items=[
                # Document checkbox
                ChecklistItem(
                    id="6_1_4_upload",
                    label="Three (3) Monthly Accomplishment Reports covering July-September 2023",
                    item_type="checkbox",
                    mov_description=None,
                    required=False,
                    display_order=1
                ),
                # INPUT FIELD for report count (BEFORE YES/NO)
                ChecklistItem(
                    id="6_1_4_report_count",
                    label="Monthly Accomplishment Reports were submitted",
                    item_type="calculation_field",
                    mov_description="Please supply the number of documents submitted",
                    required=False,
                    display_order=2
                ),
                # OPTION A: YES/NO, then calculation fields
                ChecklistItem(
                    id="6_1_4_option_a",
                    label="a. At least 50% accomplishment of the physical targets in the BESWMP",
                    item_type="assessment_field",
                    mov_description="Assessment for physical accomplishment option",
                    required=False,
                    display_order=3,
                    option_group="Option A"
                ),
                ChecklistItem(
                    id="6_1_4_physical_accomplished",
                    label="Total number of activities/projects accomplished",
                    item_type="calculation_field",
                    mov_description="Please supply the required information:",
                    required=False,
                    display_order=4.1,
                    option_group="Option A"
                ),
                ChecklistItem(
                    id="6_1_4_physical_reflected",
                    label="Total number of activities/projects reflected in the BESWMP",
                    item_type="calculation_field",
                    mov_description=None,
                    required=False,
                    display_order=4.2,
                    option_group="Option A"
                ),
                # OR separator
                ChecklistItem(
                    id="6_1_4_or",
                    label="OR",
                    item_type="info_text",
                    mov_description="OR",
                    required=False,
                    display_order=5
                ),
                # OPTION B: YES/NO, then amount calculations
                ChecklistItem(
                    id="6_1_4_option_b",
                    label="b. At least 50% utilization rate of CY 2023 BESWM Budget",
                    item_type="assessment_field",
                    mov_description="Assessment for fund utilization option",
                    required=False,
                    display_order=6,
                    option_group="Option B"
                ),
                ChecklistItem(
                    id="6_1_4_financial_utilized",
                    label="Total amount utilized (as of Dec 31, 2023)",
                    item_type="calculation_field",
                    mov_description="Please supply the required information:",
                    required=False,
                    display_order=7.1,
                    option_group="Option B"
                ),
                ChecklistItem(
                    id="6_1_4_financial_allocated",
                    label="Total amount allocated for PPAs in the BESWM Plan",
                    item_type="calculation_field",
                    mov_description=None,
                    required=False,
                    display_order=7.2,
                    option_group="Option B"
                ),
            ]
        ),
    ]
)
