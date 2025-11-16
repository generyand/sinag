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
                "Upload documentation of BDC organization:\n\n"
                "REQUIRED DOCUMENT:\n"
                "- EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs)\n"
                "- Must document the organizing/reconstituting the BDC with composition compliant to Section 107 of RA 7160\n"
                "- Must cover January to October 2023\n\n"
                "REQUIREMENTS:\n"
                "- Document must be an Executive Order or similar official issuance\n"
                "- Must be signed by the Punong Barangay (PB)\n"
                "- Must be countersigned by Barangay Secretary and SBMs\n"
                "- Must establish/reconstitute the BDC\n"
                "- BDC composition must be compliant to Section 107 of RA 7160\n"
                "- Coverage period: January to October 2023\n\n"
                "IMPORTANT:\n"
                "- The EO/resolution must be properly signed and approved\n"
                "- BDC composition must comply with RA 7160 Section 107\n"
                "- Document must clearly establish the BDC organization"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_3_1_a",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing/reconstituting the BDC with its composition compliant to Section 107 of RA 7160 covering January to October 2023",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Executive Order (EO), resolution, or ordinance is present\n"
                        "   - Document establishes/reconstitutes the BDC\n\n"
                        "2. SIGNATURE VERIFICATION:\n"
                        "   - Document is signed by the Punong Barangay (PB)\n"
                        "   - Document is countersigned by Barangay Secretary\n"
                        "   - Document is countersigned by Sangguniang Barangay Members (SBMs)\n"
                        "   - All signatures are clearly visible\n\n"
                        "3. BDC COMPOSITION VERIFICATION:\n"
                        "   - BDC composition is compliant to Section 107 of RA 7160\n"
                        "   - Composition requirements are met\n"
                        "   - Members are properly designated\n\n"
                        "4. COVERAGE PERIOD:\n"
                        "   - Document covers January to October 2023\n"
                        "   - Coverage period is clearly indicated\n\n"
                        "NOTE: The BDC must be organized/reconstituted with composition compliant to RA 7160 Section 107."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.3.2
        SubIndicator(
            code="4.3.2",
            name="Meeting: Conducted meetings, public hearings, and/or barangay assemblies for public consultation",
            upload_instructions=(
                "Upload documentation of BDC meetings, public hearings, or barangay assemblies:\n\n"
                "REQUIRED DOCUMENT:\n"
                "- Post activity report or Minutes with attendance sheet\n"
                "- Must cover CY 2023\n\n"
                "REQUIREMENTS:\n"
                "- Documentation of meetings, public hearings, and/or barangay assemblies\n"
                "- Conducted for public consultation purposes\n"
                "- Must have attendance sheets\n"
                "- Coverage period: CY 2023\n\n"
                "ACCEPTABLE DOCUMENTS:\n"
                "- Post activity report of meetings\n"
                "- Minutes of meetings with attendance sheet\n"
                "- Public hearing documentation\n"
                "- Barangay assembly records\n\n"
                "IMPORTANT:\n"
                "- Document must include attendance sheets\n"
                "- Must be for public consultation purposes\n"
                "- Must cover CY 2023"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_3_2_a",
                    label="Post activity report or Minutes with attendance sheet, covering CY 2023",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Post activity report or Minutes is present\n"
                        "   - Attendance sheet is included\n\n"
                        "2. COVERAGE PERIOD:\n"
                        "   - Document covers CY 2023\n"
                        "   - Date of activity/meeting is clearly indicated\n\n"
                        "3. CONTENT VERIFICATION:\n"
                        "   - Documents meetings, public hearings, and/or barangay assemblies\n"
                        "   - Conducted for public consultation purposes\n"
                        "   - Attendance of participants is documented\n\n"
                        "4. ATTENDANCE VERIFICATION:\n"
                        "   - Attendance sheet is attached\n"
                        "   - Participants are listed\n"
                        "   - Signatures or confirmation of attendance is present\n\n"
                        "NOTE: The document must show evidence of BDC conducting public consultation activities."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.3.3
        SubIndicator(
            code="4.3.3",
            name="Plan: Approved Barangay Development Plan",
            upload_instructions=(
                "Upload documentation of approved Barangay Development Plan:\n\n"
                "REQUIRED DOCUMENTS:\n"
                "1. Approved Barangay Development Plan covering CY 2023\n"
                "2. SB Resolution adopting the BDP\n\n"
                "REQUIREMENTS:\n"
                "- Barangay Development Plan (BDP) must be approved\n"
                "- Must cover Calendar Year 2023\n"
                "- SB Resolution adopting the BDP must be present\n"
                "- Both documents must be properly approved\n\n"
                "IMPORTANT:\n"
                "- The BDP must be approved and cover CY 2023\n"
                "- SB Resolution must formally adopt the BDP\n"
                "- Ensure approval signatures are visible"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_3_3_a",
                    label="Approved Barangay Development Plan covering CY 2023",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Barangay Development Plan (BDP) is present\n"
                        "   - Document is for CY 2023\n\n"
                        "2. APPROVAL VERIFICATION:\n"
                        "   - BDP is approved\n"
                        "   - Approval signatures are visible\n"
                        "   - Document is properly authorized\n\n"
                        "3. CONTENT VERIFICATION:\n"
                        "   - Contains development programs, projects, and activities\n"
                        "   - Shows planning for barangay development\n"
                        "   - Properly structured as a Development Plan\n\n"
                        "4. COVERAGE PERIOD:\n"
                        "   - Document is for Calendar Year 2023\n"
                        "   - Coverage period is clearly indicated\n\n"
                        "NOTE: The BDP must be approved and cover CY 2023."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_3_3_b",
                    label="SB Resolution adopting the BDP",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - SB Resolution is present\n"
                        "   - Resolution adopts the Barangay Development Plan\n\n"
                        "2. APPROVAL VERIFICATION:\n"
                        "   - Resolution is properly approved by the Sangguniang Barangay\n"
                        "   - Approval signatures are visible\n"
                        "   - Document is properly authorized\n\n"
                        "3. CONTENT VERIFICATION:\n"
                        "   - Resolution formally adopts the BDP\n"
                        "   - References the Barangay Development Plan\n"
                        "   - Shows SB approval of the plan\n\n"
                        "NOTE: The SB Resolution must formally adopt the BDP for CY 2023."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=2
                ),
            ]
        ),

        # Sub-Indicator 4.3.4
        SubIndicator(
            code="4.3.4",
            name="Accomplishment Reports: Physical accomplishment OR fund utilization (only 1 of the below reports is required)",
            upload_instructions=(
                "Upload accomplishment report documentation:\n\n"
                "IMPORTANT: Choose ONE of the following options:\n\n"
                "OPTION 1 - PHYSICAL ACCOMPLISHMENT:\n"
                "- CY 2023 Accomplishment Report with received stamp by the C/MPDC\n"
                "- Must show at least 50% accomplishment of the physical targets in the BDP\n\n"
                "VALIDATOR ACTION FOR OPTION 1:\n"
                "- Input the PERCENTAGE (%) of programs, projects, and activities completed\n"
                "- Formula: (Total number of activities/projects accomplished / Total number of activities/projects reflected in the BDP) × 100\n\n"
                "OPTION 2 - FUND UTILIZATION:\n"
                "- Must show at least 50% fund utilization rate of the CY 2023 BDP Budget\n\n"
                "VALIDATOR ACTION FOR OPTION 2:\n"
                "- Input the AMOUNT UTILIZED (as of Dec 31, 2023)\n"
                "- Input the AMOUNT ALLOCATED for PPAs in the BDP\n"
                "- Formula: (Total Amount Utilized / Total Amount Allocated) × 100\n\n"
                "IMPORTANT:\n"
                "- Only ONE option is required (either physical accomplishment OR fund utilization)\n"
                "- Either option must meet the 50% threshold"
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # OR logic: either physical OR budget
            checklist_items=[
                ChecklistItem(
                    id="4_3_4_a",
                    label="a. At least 50% accomplishment of the physical targets in the BDP",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. APPLICABILITY:\n"
                        "   - This is OPTION 1 (Physical Accomplishment)\n"
                        "   - If barangay chose fund utilization option, check item 4_3_4_b instead\n\n"
                        "2. DOCUMENT PRESENCE:\n"
                        "   - CY 2023 Accomplishment Report is present\n"
                        "   - Report has received stamp by the C/MPDC\n\n"
                        "3. STAMP VERIFICATION:\n"
                        "   - Report has received stamp from C/MPDC\n"
                        "   - Stamp is clearly visible\n\n"
                        "4. PERCENTAGE INPUT REQUIRED:\n"
                        "   - Validator must input the % of programs, projects, and activities completed\n"
                        "   - Formula: (Total number of activities/projects accomplished / Total number of activities/projects reflected in the BDP) × 100\n"
                        "   - This is a required input field\n\n"
                        "5. ACCOMPLISHMENT VERIFICATION:\n"
                        "   - At least 50% of physical targets are accomplished\n"
                        "   - Accomplishment is documented in the report\n"
                        "   - Report shows progress on BDP activities\n\n"
                        "NOTE: This is an OR requirement with option 4_3_4_b.\n"
                        "Only one option needs to pass."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_3_4_b",
                    label="b. At least 50% fund utilization rate of the CY 2023 BDP Budget",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. APPLICABILITY:\n"
                        "   - This is OPTION 2 (Fund Utilization)\n"
                        "   - If barangay chose physical accomplishment option, check item 4_3_4_a instead\n\n"
                        "2. AMOUNT INPUTS REQUIRED:\n"
                        "   - INPUT 1: Amount utilized (as of Dec 31, 2023)\n"
                        "   - INPUT 2: Amount allocated for PPAs in the BDP\n"
                        "   - Formula: (Total Amount Utilized / Total Amount Allocated) × 100\n"
                        "   - These are required input fields\n\n"
                        "3. UTILIZATION VERIFICATION:\n"
                        "   - At least 50% of BDP Budget is utilized\n"
                        "   - Utilization is documented\n"
                        "   - Budget utilization rate meets minimum requirement\n\n"
                        "NOTE: This is an OR requirement with option 4_3_4_a.\n"
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
