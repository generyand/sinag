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
                "Upload documentation of BESWMC organization:\n\n"
                "REQUIRED DOCUMENT:\n"
                "- EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs)\n"
                "- Must document the organization of the BESWMC\n"
                "- Composition must be compliant to DILG MC No. 2018-112\n\n"
                "REQUIREMENTS:\n"
                "- Document must be an Executive Order or similar official issuance\n"
                "- Must be signed by the Punong Barangay (PB)\n"
                "- Must be countersigned by Barangay Secretary and SBMs\n"
                "- Must establish/organize the BESWMC\n"
                "- BESWMC composition must be compliant to DILG MC No. 2018-112\n\n"
                "VALIDATOR INPUT REQUIRED:\n"
                "- Date of approval for the EO/resolution\n\n"
                "IMPORTANT:\n"
                "- The EO/resolution must be properly signed and approved\n"
                "- BESWMC composition must comply with DILG MC No. 2018-112\n"
                "- Document must clearly establish the BESWMC organization"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="6_1_1_a",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the organization of the BESWMC",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Executive Order (EO), resolution, or ordinance is present\n"
                        "   - Document establishes/organizes the BESWMC\n\n"
                        "2. DATE INPUT REQUIRED:\n"
                        "   - Validator must input the DATE OF APPROVAL\n"
                        "   - This is a required input field\n\n"
                        "3. SIGNATURE VERIFICATION:\n"
                        "   - Document is signed by the Punong Barangay (PB)\n"
                        "   - Document is countersigned by Barangay Secretary\n"
                        "   - Document is countersigned by Sangguniang Barangay Members (SBMs)\n"
                        "   - All signatures are clearly visible\n\n"
                        "4. BESWMC COMPOSITION VERIFICATION:\n"
                        "   - BESWMC composition is compliant to DILG MC No. 2018-112\n"
                        "   - Composition requirements are met\n"
                        "   - Members are properly designated\n\n"
                        "NOTE: The BESWMC must be organized with composition compliant to DILG MC No. 2018-112.\n"
                        "Date of approval must be input by validator."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 6.1.2
        SubIndicator(
            code="6.1.2",
            name="Plan: Approved Solid Waste Management Program/Plan with corresponding fund allocation",
            upload_instructions=(
                "Upload documentation of approved Solid Waste Management Program/Plan:\n\n"
                "REQUIRED DOCUMENT:\n"
                "- Approved Solid Waste Management Program/Plan covering CY 2023\n"
                "- Must include corresponding fund allocation\n\n"
                "REQUIREMENTS:\n"
                "- Solid Waste Management Program/Plan (SWMP) must be approved\n"
                "- Must cover Calendar Year 2023\n"
                "- Must include corresponding fund allocation for the program/plan\n"
                "- Document must be properly approved\n\n"
                "IMPORTANT:\n"
                "- The SWMP must be approved and cover CY 2023\n"
                "- Fund allocation must be clearly indicated\n"
                "- Ensure approval signatures are visible"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="6_1_2_a",
                    label="Approved Solid Waste Management Program/Plan covering CY 2023 with corresponding fund allocation",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Solid Waste Management Program/Plan (SWMP) is present\n"
                        "   - Document is for CY 2023\n\n"
                        "2. APPROVAL VERIFICATION:\n"
                        "   - SWMP is approved\n"
                        "   - Approval signatures are visible\n"
                        "   - Document is properly authorized\n\n"
                        "3. FUND ALLOCATION VERIFICATION:\n"
                        "   - Corresponding fund allocation is included\n"
                        "   - Budget for solid waste management is clearly indicated\n"
                        "   - Fund allocation is properly documented\n\n"
                        "4. COVERAGE PERIOD:\n"
                        "   - Document is for Calendar Year 2023\n"
                        "   - Coverage period is clearly indicated\n\n"
                        "NOTE: The SWMP must be approved, cover CY 2023, and include corresponding fund allocation."
                    ),
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
                "Upload proof of BESWMC training attendance:\n\n"
                "REQUIRED DOCUMENT:\n"
                "- At least one (1) copy of proof of training\n"
                "- Can be Certificate of Completion and/or Participation\n"
                "- Training must be not earlier than CY 2020\n\n"
                "REQUIREMENTS:\n"
                "- Training must be relative to promoting environmental protection, preservation and awareness\n"
                "- At least one BESWMC member attended the training\n"
                "- Training certificate or proof of participation must be submitted\n"
                "- Training must have occurred not earlier than CY 2020\n\n"
                "ACCEPTABLE DOCUMENTS:\n"
                "- Certificate of Completion\n"
                "- Certificate of Participation\n"
                "- Training attendance documentation\n\n"
                "IMPORTANT:\n"
                "- Training must be not earlier than CY 2020\n"
                "- Training must be related to environmental protection, preservation and awareness\n"
                "- At least one proof of training is required"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="6_1_3_a",
                    label="At least one (1) copy of proof of training such as Certificate of Completion and/or Participation",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - At least one (1) proof of training is present\n"
                        "   - Can be Certificate of Completion or Certificate of Participation\n\n"
                        "2. TRAINING VERIFICATION:\n"
                        "   - Training is relative to promoting environmental protection\n"
                        "   - Training covers preservation and/or awareness topics\n"
                        "   - BESWMC member(s) attended the training\n\n"
                        "3. DATE VERIFICATION:\n"
                        "   - Training occurred not earlier than CY 2020\n"
                        "   - Date of training is clearly indicated on the certificate/proof\n\n"
                        "4. CONTENT VERIFICATION:\n"
                        "   - Certificate/proof shows attendee name(s)\n"
                        "   - Training topic/title is related to environmental management\n"
                        "   - Document is properly issued and authenticated\n\n"
                        "NOTE: Training must be not earlier than CY 2020 and related to environmental protection, preservation and awareness."
                    ),
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
                "Upload accomplishment report documentation:\n\n"
                "IMPORTANT: Choose ONE of the following options:\n\n"
                "OPTION 1 - PHYSICAL ACCOMPLISHMENT:\n"
                "- Three (3) Monthly Accomplishment Reports covering July-September 2023\n"
                "- Must show at least 50% accomplishment of the physical targets in the BESWMP\n\n"
                "VALIDATOR ACTION FOR OPTION 1:\n"
                "- Input the NUMBER OF DOCUMENTS submitted (Monthly Accomplishment Reports)\n"
                "- Input the PERCENTAGE (%) of programs, project, and activities completed\n"
                "- Formula: (Total number of activities/projects accomplished / Total number of activities/projects reflected in the BESWMP) × 100\n\n"
                "OPTION 2 - FUND UTILIZATION:\n"
                "- Must show at least 50% utilization rate of CY 2023 BESWM Budget\n\n"
                "VALIDATOR ACTION FOR OPTION 2:\n"
                "- Input the AMOUNT UTILIZED (as of Dec 31, 2023)\n"
                "- Input the AMOUNT ALLOCATED for PPAs in the BESWM Plan\n"
                "- Formula: (Total Amount Utilized / Total Amount Allocated) × 100\n\n"
                "IMPORTANT:\n"
                "- Only ONE option is required (either physical accomplishment OR fund utilization)\n"
                "- Either option must meet the 50% threshold"
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # OR logic: either physical OR budget
            checklist_items=[
                ChecklistItem(
                    id="6_1_4_a",
                    label="a. At least 50% accomplishment of the physical targets in the BESWMP",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. APPLICABILITY:\n"
                        "   - This is OPTION 1 (Physical Accomplishment)\n"
                        "   - If barangay chose fund utilization option, check item 6_1_4_b instead\n\n"
                        "2. DOCUMENT PRESENCE:\n"
                        "   - Three (3) Monthly Accomplishment Reports are present\n"
                        "   - Reports cover July-September 2023\n\n"
                        "3. DOCUMENT COUNT INPUT REQUIRED:\n"
                        "   - Validator must input the NUMBER of Monthly Accomplishment Reports submitted\n"
                        "   - This is a required input field\n\n"
                        "4. PERCENTAGE INPUT REQUIRED:\n"
                        "   - Validator must input the % of programs, project, and activities completed\n"
                        "   - Formula: (Total number of activities/projects accomplished / Total number of activities/projects reflected in the BESWMP) × 100\n"
                        "   - This is a required input field\n\n"
                        "5. ACCOMPLISHMENT VERIFICATION:\n"
                        "   - At least 50% of physical targets are accomplished\n"
                        "   - Accomplishment is documented in the reports\n"
                        "   - Reports show progress on BESWMP activities\n\n"
                        "NOTE: This is an OR requirement with option 6_1_4_b.\n"
                        "Only one option needs to pass."
                    ),
                    required=True,
                    requires_document_count=True,  # Number of Monthly Accomplishment Reports
                    display_order=1
                ),
                ChecklistItem(
                    id="6_1_4_b",
                    label="b. At least 50% utilization rate of CY 2023 BESWM Budget",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. APPLICABILITY:\n"
                        "   - This is OPTION 2 (Fund Utilization)\n"
                        "   - If barangay chose physical accomplishment option, check item 6_1_4_a instead\n\n"
                        "2. AMOUNT INPUTS REQUIRED:\n"
                        "   - INPUT 1: Amount utilized (as of Dec 31, 2023)\n"
                        "   - INPUT 2: Amount allocated for PPAs in the BESWM Plan\n"
                        "   - Formula: (Total Amount Utilized / Total Amount Allocated) × 100\n"
                        "   - These are required input fields\n\n"
                        "3. UTILIZATION VERIFICATION:\n"
                        "   - At least 50% of BESWM Budget is utilized\n"
                        "   - Utilization is documented\n"
                        "   - Budget utilization rate meets minimum requirement\n\n"
                        "NOTE: This is an OR requirement with option 6_1_4_a.\n"
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
