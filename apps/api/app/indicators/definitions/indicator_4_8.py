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
                "Upload the following document:\n\n"
                "• EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) "
                "organizing the Barangay Nutrition Committee (BNC) covering January to October 2023\n\n"
                "Minimum Composition of the BNC:\n"
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
                    id="4_8_1_eo",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the Barangay Nutrition Committee (BNC) covering January to October 2023",
                    mov_description="Executive Order or similar issuance organizing the BNC covering January to October 2023",
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
                "Upload the following document:\n\n"
                "• Approved CY 2023 BNAP signed by the BNC"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_8_2_bnap",
                    label="Approved CY 2023 BNAP signed by the BNC",
                    mov_description="Approved CY 2023 Barangay Nutrition Action Plan signed by the BNC",
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
                "Upload the following documents:\n\n"
                "• Operation Timbang (OPT) Plus Form 1A (Barangay Tally and Summary Sheet of Preschoolers with Weight & Height "
                "Measurement by Age Group, Sex and Nutritional Status) of CYs 2022 and 2023; and\n\n"
                "• Certification from the C/MHO on the Decrease in Prevalence Rate\n\n"
                "Instruction: Put a check ✓ on the box that corresponds to your assessment.\n\n"
                "Categories:\n"
                "1. Underweight and Severe Underweight\n"
                "2. Stunting and Severe Stunting; and\n"
                "3. Moderate Wasting and Severe Wasting"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_8_3_opt_form",
                    label="Operation Timbang (OPT) Plus Form 1A (Barangay Tally and Summary Sheet of Preschoolers with Weight & Height Measurement by Age Group, Sex and Nutritional Status) of CYs 2022 and 2023",
                    mov_description="OPT Plus Form 1A for CYs 2022 and 2023",
                    required=True,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_8_3_certification",
                    label="Certification from the C/MHO on the Decrease in Prevalence Rate",
                    mov_description="Certification from C/MHO on the Decrease in Prevalence Rate",
                    required=True,
                    display_order=2
                ),
                ChecklistItem(
                    id="4_8_3_underweight",
                    label="1. With decrease in prevalence rate of Underweight and Severe Underweight",
                    group_name="Decrease in Prevalence Rate Categories",
                    mov_description="YES/NO checkbox: Decrease in prevalence rate of Underweight and Severe Underweight",
                    required=False,
                    display_order=3
                ),
                ChecklistItem(
                    id="4_8_3_stunting",
                    label="2. With decrease in prevalence rate of Stunting and Severe Stunting",
                    group_name="Decrease in Prevalence Rate Categories",
                    mov_description="YES/NO checkbox: Decrease in prevalence rate of Stunting and Severe Stunting",
                    required=False,
                    display_order=4
                ),
                ChecklistItem(
                    id="4_8_3_wasting",
                    label="3. With decrease in prevalence rate of Moderate Wasting and Severe Wasting",
                    group_name="Decrease in Prevalence Rate Categories",
                    mov_description="YES/NO checkbox: Decrease in prevalence rate of Moderate Wasting and Severe Wasting",
                    required=False,
                    display_order=5
                ),
            ]
        ),

        # Sub-Indicator 4.8.4: Accomplishment Report
        SubIndicator(
            code="4.8.4",
            name="Accomplishment Report",
            upload_instructions=(
                "Upload the following documents:\n\n"
                "• Accomplishment Report on CY 2023 BNAP;\n\n"
                "Choose ONE of the following options:\n\n"
                "Option A - Physical Accomplishment (at least 50%):\n"
                "• Certification on the submitted BNAP Accomplishment Report for CY 2023 signed by the C/MLGOO\n"
                "Please supply the required information:\n"
                "• % of programs, project, and activities are completed\n\n"
                "OR\n\n"
                "Option B - Fund Utilization (at least 50%):\n"
                "• Certification on the submitted BNAP Accomplishment Report for CY 2023 indicating at least 50% fund utilization rate of the CY 2023 BNAP Budget signed by the C/MLGOO\n"
                "Please supply the required information:\n"
                "• Amount utilized (as of Dec. 31, 2023):\n"
                "• Amount allocated for PPAs in the BNAP:\n\n"
                "Note: To compute Physical Accomplishment Rate:\n"
                "(Total number of activities/projects accomplished / Total number of activities/projects reflected in the BNAP) x 100\n\n"
                "To compute % utilization:\n"
                "(Total Amount Utilized)/(Total Amount Allocated) x 100"
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # Either Option A OR Option B
            checklist_items=[
                ChecklistItem(
                    id="4_8_4_report",
                    label="Accomplishment Report on CY 2023 BNAP",
                    mov_description="Accomplishment Report on CY 2023 BNAP",
                    required=True,
                    display_order=1
                ),
                # Option A: Physical Accomplishment
                ChecklistItem(
                    id="4_8_4_physical_cert",
                    label="a. At least 50% accomplishment of the physical targets in the CY 2023 BNAP",
                    group_name="Option A: Physical Accomplishment",
                    mov_description="YES/NO checkbox: At least 50% accomplishment of physical targets",
                    required=False,
                    display_order=2
                ),
                ChecklistItem(
                    id="4_8_4_physical_certification",
                    label="Certification on the submitted BNAP Accomplishment Report for CY 2023 indicating at least 50% accomplishment of the physical targets in the BNAP signed by the C/MLGOO",
                    group_name="Option A: Physical Accomplishment",
                    mov_description="Certification on submitted BNAP Accomplishment Report for CY 2023 (physical accomplishment)",
                    required=False,
                    display_order=3
                ),
                ChecklistItem(
                    id="4_8_4_physical_percentage",
                    label="% of programs, project, and activities are completed",
                    group_name="Option A: Physical Accomplishment",
                    mov_description="Input field for percentage of programs, projects, and activities completed",
                    required=False,
                    requires_document_count=True,  # Repurposing for percentage input
                    display_order=4
                ),
                # Option B: Fund Utilization
                ChecklistItem(
                    id="4_8_4_fund_cert",
                    label="b. At least 50% fund utilization rate of the CY 2023 BNAP Budget",
                    group_name="Option B: Fund Utilization",
                    mov_description="YES/NO checkbox: At least 50% fund utilization rate",
                    required=False,
                    display_order=5
                ),
                ChecklistItem(
                    id="4_8_4_fund_certification",
                    label="Certification on the submitted BNAP Accomplishment Report for CY 2023 indicating at least 50% fund utilization rate of the CY 2023 BNAP Budget signed by the C/MLGOO",
                    group_name="Option B: Fund Utilization",
                    mov_description="Certification on submitted BNAP Accomplishment Report for CY 2023 (fund utilization)",
                    required=False,
                    display_order=6
                ),
                ChecklistItem(
                    id="4_8_4_amount_utilized",
                    label="Amount utilized (as of Dec. 31, 2023)",
                    group_name="Option B: Fund Utilization",
                    mov_description="Input field for amount utilized as of Dec. 31, 2023",
                    required=False,
                    requires_document_count=True,  # Repurposing for amount input
                    display_order=7
                ),
                ChecklistItem(
                    id="4_8_4_amount_allocated",
                    label="Amount allocated for PPAs in the BNAP",
                    group_name="Option B: Fund Utilization",
                    mov_description="Input field for amount allocated for PPAs in the BNAP",
                    required=False,
                    requires_document_count=True,  # Repurposing for amount input
                    display_order=8
                ),
            ]
        ),
    ]
)
