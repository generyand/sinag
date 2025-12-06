"""
Indicator 4.3: Functionality of the Barangay Development Council (BDC)

Governance Area: 4 (Social Protection and Sensitivity)
BBI Status: Yes (BDC is one of the 9 mandatory barangay-based institutions)

IMPORTANT NOTES FOR PHASE 9 (VALIDATION SERVICE):

1. Four Sub-Indicators Structure:
   - 4.3.1: Organized BDC with composition compliant to Section 107 of RA 7160
   - 4.3.2: Conducted meetings, public hearings, and/or barangay assemblies for public consultation
   - 4.3.3: Approved Barangay Development Plan covering CY 2023
   - 4.3.4: Accomplishment Reports (OR logic: physical targets OR fund utilization)

2. Input Fields Required:
   - Sub-indicator 4.3.4: PERCENTAGE and AMOUNT inputs for:
     * Physical accomplishment rate (%)
     * Amount utilized (for BDP Budget)
     * Amount allocated (for BDP Budget)

3. OR Logic in Sub-indicator 4.3.4:
   - Option A: At least 50% accomplishment of physical targets in BDP, OR
   - Option B: At least 50% fund utilization rate of CY 2023 BDP Budget
   - Validation rule: "ANY_ITEM_REQUIRED" (either option is acceptable)

4. Year Dependency:
   - Sub-indicator 4.3.1: BDC organization covering January to October 2023
   - Sub-indicator 4.3.2: Meetings/public hearings covering CY 2023
   - Sub-indicator 4.3.3: Barangay Development Plan covering CY 2023
   - Sub-indicator 4.3.4: Accomplishment Report for CY 2023
   - Future assessments may need to update these baseline years

5. Validation Workflow:
   - Validator verifies BDC organization with proper composition
   - Validator confirms meetings/public hearings conducted
   - Validator checks approved Barangay Development Plan and SB Resolution
   - Validator verifies accomplishment (either physical targets OR budget utilization)
   - All sub-indicators must pass for overall indicator to pass

6. BBI Status Update:
   - Since this is a BBI indicator (is_bbi=True), passing means BDC is "Functional"
   - Failing means BDC is "Non-Functional"
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 4.3: Functionality of the Barangay Development Council (BDC)
INDICATOR_4_3 = Indicator(
    code="4.3",
    name="Functionality of the Barangay Development Council (BDC)",
    governance_area_id=4,  # Social Protection and Sensitivity
    is_bbi=True,  # BDC is a mandatory BBI
    sort_order=3,
    description="Functionality of the Barangay Development Council (BDC)",
    children=[
        # Sub-Indicator 4.3.1
        SubIndicator(
            code="4.3.1",
            name="Structure: Organized BDC with its composition compliant to Section 107 of RA 7160",
            upload_instructions=(
                "Upload: EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) "
                "organizing/reconstituting the BDC with its composition compliant to Section 107 of RA 7160"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Upload Verification
                ChecklistItem(
                    id="4_3_1_upload_1",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing/reconstituting the BDC with its composition compliant to Section 107 of RA 7160",
                    mov_description="Verification of uploaded Executive Order or similar issuance organizing/reconstituting the BDC",
                    required=True,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.3.2
        SubIndicator(
            code="4.3.2",
            name="Meeting: Conducted meetings, public hearings, and/or barangay assemblies for public consultation",
            upload_instructions=(
                "Upload: Post activity report or Minutes with attendance sheet"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_3_2_upload_1",
                    label="Post activity report or Minutes with attendance sheet",
                    mov_description="Verification of uploaded Post activity report or Minutes with attendance sheet",
                    required=True,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.3.3
        SubIndicator(
            code="4.3.3",
            name="Plan: Approved Barangay Development Plan",
            upload_instructions=(
                "Upload the following (both required):\n\n"
                "1. Approved Barangay Development Plan\n"
                "2. SB Resolution adopting the approved BDP"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_3_3_upload_1",
                    label="a. Approved Barangay Development Plan",
                    mov_description="Verification of uploaded Approved Barangay Development Plan",
                    required=True,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_3_3_upload_2",
                    label="b. SB Resolution adopting the approved BDP",
                    mov_description="Verification of uploaded SB Resolution adopting the BDP",
                    required=True,
                    display_order=2
                ),
            ]
        ),

        # Sub-Indicator 4.3.4
        SubIndicator(
            code="4.3.4",
            name="Accomplishment Reports: Physical accomplishment OR fund utilization (only 1 of the below reports is required)",
            upload_instructions=(
                "Upload:\n"
                "- (PHYSICAL or/and FINANCIAL) Accomplishment Report with received stamp by the C/MPDC"
            ),
            validation_rule="OR_LOGIC_AT_LEAST_1_REQUIRED",  # OR logic: Physical OR Financial
            checklist_items=[
                # Single shared upload field for PHYSICAL or/and FINANCIAL (ungrouped - always required)
                ChecklistItem(
                    id="4_3_4_upload",
                    label="(PHYSICAL or/and FINANCIAL) Accomplishment Report with received stamp by the C/MPDC",
                    mov_description="Verification of uploaded Accomplishment Report (PHYSICAL or/and FINANCIAL)",
                    item_type="checkbox",
                    required=True,
                    display_order=1
                ),
                # OPTION A: YES/NO assessment first, then calculation
                ChecklistItem(
                    id="4_3_4_option_a",
                    label="a. At least 50% accomplishment of the physical targets in the BDP",
                    mov_description="Verification that at least 50% of physical targets are accomplished",
                    item_type="assessment_field",
                    required=False,
                    display_order=3,
                    option_group="Option A"
                ),
                ChecklistItem(
                    id="4_3_4_physical_reflected",
                    label="Total number of activities/projects reflected in the Plan",
                    item_type="calculation_field",
                    required=False,
                    display_order=4,
                    option_group="Option A"
                ),
                ChecklistItem(
                    id="4_3_4_physical_accomplished",
                    label="Total number of activities/projects accomplished",
                    mov_description="Please supply the required information:",
                    item_type="calculation_field",
                    required=False,
                    display_order=5,
                    option_group="Option A"
                ),
                # OR separator
                ChecklistItem(
                    id="4_3_4_or",
                    label="OR",
                    mov_description="OR",
                    item_type="info_text",
                    required=False,
                    display_order=6
                ),
                # OPTION B: YES/NO assessment first, then calculations
                ChecklistItem(
                    id="4_3_4_option_b",
                    label="b. At least 50% fund utilization rate of the BDP Budget",
                    mov_description="Verification that at least 50% of BDP Budget is utilized",
                    item_type="assessment_field",
                    required=False,
                    display_order=7,
                    option_group="Option B"
                ),
                ChecklistItem(
                    id="4_3_4_financial_allocated",
                    label="Total amount allocated for PPAs in the BDP",
                    item_type="calculation_field",
                    required=False,
                    display_order=8,
                    option_group="Option B"
                ),
                ChecklistItem(
                    id="4_3_4_financial_utilized",
                    label="Total amount utilized (as of Dec 31, 2023)",
                    mov_description="Please supply the required information:",
                    item_type="calculation_field",
                    required=False,
                    display_order=9,
                    option_group="Option B"
                ),
            ]
        ),
    ]
)
