"""
Indicator 4.8: Functionality of the Barangay Nutrition Committee (BNC)

Governance Area: 4 (Social Protection and Sensitivity)
BBI Status: YES (This IS a BBI - one of the 9 mandatory BBIs)

Note: This indicator assesses the functionality of the Barangay Nutrition Committee (BNC)
through its organizational structure, approved plan, performance in reducing malnutrition,
and accomplishment reporting.
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 4.8: Functionality of the Barangay Nutrition Committee (BNC)
INDICATOR_4_8 = Indicator(
    code="4.8",
    name="Functionality of the Barangay Nutrition Committee (BNC)",
    governance_area_id=4,  # Social Protection and Sensitivity
    is_bbi=True,  # This is one of the 9 mandatory BBIs
    sort_order=8,
    description="Assessment of BNC functionality through organizational structure, approved BNAP, malnutrition reduction, and accomplishment reporting",
    children=[
        # Sub-Indicator 4.8.1: Structure - Organized BNC
        SubIndicator(
            code="4.8.1",
            name="Structure: Organized BNC",
            upload_instructions=(
                "Upload: EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the Barangay Nutrition Committee (BNC) covering January to October 2023\n\n"
                "Minimum Composition of BNC:\n"
                "1. Barangay Captain (as chair)\n"
                "2. President of the Rural Improvement Club (RIC)\n"
                "3. President, Parent-Teacher Child Association (PTCA)\n"
                "4. Head/President, local organization\n"
                "5. Sangguniang Members on Health\n"
                "6. SK Chairperson\n"
                "7. Barangay Nutrition Scholar (BNS)\n"
                "8. Day Care Worker\n"
                "9. Barangay Nutrition Action Association (BNAO)\n"
                "10. School Principal\n"
                "11. Agriculture Technicians\n"
                "12. Rural Health Midwife (RHM)\n"
                "13. Other as may be identified"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_8_1_upload",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the Barangay Nutrition Committee (BNC) covering January to October 2023",
                    mov_description="Verification that the EO/issuance creates BNC with proper composition as per minimum requirement",
                    item_type="checkbox",
                    required=True,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.8.2: Plan - Presence of approved CY 2023 BNAP
        SubIndicator(
            code="4.8.2",
            name="Plan: Presence of approved CY 2023 BNAP",
            upload_instructions=(
                "Upload: Approved CY 2023 BNAP signed by the BNC"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_8_2_upload_1",
                    label="Approved CY 2023 BNAP signed by the BNC",
                    mov_description="Verification of uploaded Approved CY 2023 BNAP signed by the BNC",
                    required=True,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.8.3: Decrease in Prevalence Rate
        SubIndicator(
            code="4.8.3",
            name="Decrease in Prevalence Rate in the barangay, for the following categories",
            upload_instructions=(
                "Upload the following (all required):\n\n"
                "1. Operation Timbang (OPT) Plus Form 1A (Barangay Tally and Summary Sheet of Preschoolers with Weight & Height Measurement by Age Group, Sex and Nutritional Status) of CYs 2022 and 2023; and\n"
                "2. Certification from the C/MHO on the Decrease in Prevalence Rate"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Document verification checkboxes
                ChecklistItem(
                    id="4_8_3_upload_opt",
                    label="Operation Timbang (OPT) Plus Form 1A (Barangay Tally and Summary Sheet of Preschoolers with Weight & Height Measurement by Age Group, Sex and Nutritional Status) of CYs 2022 and 2023",
                    mov_description="Verification of uploaded Operation Timbang (OPT) Plus Form 1A for CYs 2022 and 2023",
                    item_type="checkbox",
                    required=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_8_3_upload_cert",
                    label="Certification from the C/MHO on the Decrease in Prevalence Rate",
                    mov_description="Verification of uploaded Certification from the C/MHO on the Decrease in Prevalence Rate",
                    item_type="checkbox",
                    required=False,
                    display_order=2
                ),
                # Three categories with YES/NO assessment
                ChecklistItem(
                    id="4_8_3_underweight",
                    label="1. With decrease in prevalence rate of Underweight and Severe Underweight",
                    mov_description="Assessment for decrease in underweight prevalence",
                    item_type="assessment_field",
                    required=False,
                    display_order=4
                ),
                ChecklistItem(
                    id="4_8_3_stunting",
                    label="2. With decrease in prevalence rate of Stunting and Severe Stunting",
                    mov_description="Assessment for decrease in stunting prevalence",
                    item_type="assessment_field",
                    required=False,
                    display_order=5
                ),
                ChecklistItem(
                    id="4_8_3_wasting",
                    label="3. With decrease in prevalence rate of Moderate Wasting and Severe Wasting",
                    mov_description="Assessment for decrease in wasting prevalence",
                    item_type="assessment_field",
                    required=False,
                    display_order=6
                ),
            ]
        ),

        # Sub-Indicator 4.8.4: Accomplishment Report
        SubIndicator(
            code="4.8.4",
            name="Accomplishment Report",
            upload_instructions=(
                "Upload the following:\n\n"
                "SHARED (Required):\n"
                "- Accomplishment Report on CY 2023 BNAP\n\n"
                "PLUS ONE of the following (PHYSICAL or FINANCIAL):\n\n"
                "OPTION A - PHYSICAL:\n"
                "- Certification on the submitted BNAP Accomplishment Report for CY 2023 indicating at least 50% accomplishment of the physical targets in the BNAP signed by the C/MLGOO\n\n"
                "OR\n\n"
                "OPTION B - FINANCIAL:\n"
                "- Certification on the submitted BNAP Accomplishment Report for CY 2023 indicating at least 50% fund utilization rate of the CY 2023 BNAP Budget signed by the C/MLGOO"
            ),
            validation_rule="SHARED_PLUS_OR_LOGIC",  # SHARED + (A OR B)
            checklist_items=[
                # SHARED: Accomplishment Report
                ChecklistItem(
                    id="4_8_4_upload_report",
                    label="Accomplishment Report on CY 2023 BNAP",
                    mov_description="Verification of uploaded Accomplishment Report on CY 2023 BNAP",
                    item_type="checkbox",
                    required=True,
                    display_order=1,
                    option_group="shared"
                ),
                # OPTION A: YES/NO, then CERTIFICATION, then calculation
                ChecklistItem(
                    id="4_8_4_option_a_check",
                    label="a. At least 50% accomplishment of the physical targets in the CY 2023 BNAP",
                    mov_description="Verify at least 50% accomplishment of physical targets (Option A)",
                    item_type="assessment_field",
                    required=False,
                    display_order=2,
                    option_group="option_a"
                ),
                ChecklistItem(
                    id="4_8_4_cert_a",
                    label="Certification on the submitted BNAP Accomplishment Report for CY 2023 indicating at least 50% accomplishment of the physical targets in the BNAP signed by the C/MLGOO",
                    mov_description="Verification of certification for option A",
                    item_type="checkbox",
                    required=False,
                    display_order=3,
                    option_group="option_a"
                ),
                ChecklistItem(
                    id="4_8_4_physical_accomplished",
                    label="Total number of activities/projects accomplished",
                    mov_description="Please supply the required information:",
                    item_type="calculation_field",
                    required=False,
                    display_order=4,
                    option_group="option_a"
                ),
                ChecklistItem(
                    id="4_8_4_physical_reflected",
                    label="Total number of activities/projects reflected in the Plan",
                    mov_description="Please supply the required information:",
                    item_type="calculation_field",
                    required=False,
                    display_order=5,
                    option_group="option_a"
                ),
                # OR separator
                ChecklistItem(
                    id="4_8_4_or",
                    label="OR",
                    mov_description="OR",
                    item_type="info_text",
                    required=False,
                    display_order=6
                ),
                # OPTION B: YES/NO, then CERTIFICATION, then calculations
                ChecklistItem(
                    id="4_8_4_option_b_check",
                    label="b. At least 50% fund utilization rate of the CY 2023 BNAP Budget",
                    mov_description="Verify at least 50% fund utilization rate (Option B)",
                    item_type="assessment_field",
                    required=False,
                    display_order=7,
                    option_group="option_b"
                ),
                ChecklistItem(
                    id="4_8_4_cert_b",
                    label="Certification on the submitted BNAP Accomplishment Report for CY 2023 indicating at least 50% fund utilization rate of the CY 2023 BNAP Budget signed by the C/MLGOO",
                    mov_description="Verification of certification for option B",
                    item_type="checkbox",
                    required=False,
                    display_order=8,
                    option_group="option_b"
                ),
                ChecklistItem(
                    id="4_8_4_financial_utilized",
                    label="Total amount utilized (as of Dec. 31, 2023)",
                    mov_description="Please supply the required information:",
                    item_type="calculation_field",
                    required=False,
                    display_order=9,
                    option_group="option_b"
                ),
                ChecklistItem(
                    id="4_8_4_financial_allocated",
                    label="Total amount allocated for PPAs in the BNAP",
                    mov_description="Please supply the required information:",
                    item_type="calculation_field",
                    required=False,
                    display_order=10,
                    option_group="option_b"
                ),
            ]
        ),
    ]
)
