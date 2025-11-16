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
                "Upload the following:\n\n"
                "1. EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the Barangay Nutrition Committee (BNC) covering January to October 2023\n\n"
                "The BNC must include the following minimum composition:\n"
                "- Barangay Captain (as chair)\n"
                "- President of the Rural Improvement Club (RIC)\n"
                "- President, Parent-Teacher Child Association (PTCA)\n"
                "- Head/President, local organization\n"
                "- Sangguniang Members on Health\n"
                "- SK Chairperson\n"
                "- Barangay Nutrition Scholar (BNS)\n"
                "- Day Care Worker\n"
                "- Barangay Nutrition Action Association (BNAO)\n"
                "- School Principal\n"
                "- Agriculture Technicians\n"
                "- Rural Health Midwife (RHM)\n"
                "- Other as may be identified"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_8_1_upload_1",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the Barangay Nutrition Committee (BNC) covering January to October 2023",
                    mov_description="Verification of uploaded EO or similar issuance organizing the Barangay Nutrition Committee (BNC) covering January to October 2023",
                    required=True,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_8_1_comp_captain",
                    label="Barangay Captain (as chair)",
                    mov_description="Verify Barangay Captain is listed in BNC composition",
                    required=True,
                    requires_document_count=False,
                    display_order=2
                ),
                ChecklistItem(
                    id="4_8_1_comp_ric",
                    label="President of the Rural Improvement Club (RIC)",
                    mov_description="Verify RIC President is listed in BNC composition",
                    required=True,
                    requires_document_count=False,
                    display_order=3
                ),
                ChecklistItem(
                    id="4_8_1_comp_ptca",
                    label="President, Parent-Teacher Child Association (PTCA)",
                    mov_description="Verify PTCA President is listed in BNC composition",
                    required=True,
                    requires_document_count=False,
                    display_order=4
                ),
                ChecklistItem(
                    id="4_8_1_comp_local_org",
                    label="Head/President, local organization",
                    mov_description="Verify local organization head is listed in BNC composition",
                    required=True,
                    requires_document_count=False,
                    display_order=5
                ),
                ChecklistItem(
                    id="4_8_1_comp_health",
                    label="Sangguniang Members on Health",
                    mov_description="Verify Sangguniang Members on Health are listed in BNC composition",
                    required=True,
                    requires_document_count=False,
                    display_order=6
                ),
                ChecklistItem(
                    id="4_8_1_comp_sk",
                    label="SK Chairperson",
                    mov_description="Verify SK Chairperson is listed in BNC composition",
                    required=True,
                    requires_document_count=False,
                    display_order=7
                ),
                ChecklistItem(
                    id="4_8_1_comp_bns",
                    label="Barangay Nutrition Scholar (BNS)",
                    mov_description="Verify BNS is listed in BNC composition",
                    required=True,
                    requires_document_count=False,
                    display_order=8
                ),
                ChecklistItem(
                    id="4_8_1_comp_daycare",
                    label="Day Care Worker",
                    mov_description="Verify Day Care Worker is listed in BNC composition",
                    required=True,
                    requires_document_count=False,
                    display_order=9
                ),
                ChecklistItem(
                    id="4_8_1_comp_bnao",
                    label="Barangay Nutrition Action Association (BNAO)",
                    mov_description="Verify BNAO is listed in BNC composition",
                    required=True,
                    requires_document_count=False,
                    display_order=10
                ),
                ChecklistItem(
                    id="4_8_1_comp_principal",
                    label="School Principal",
                    mov_description="Verify School Principal is listed in BNC composition",
                    required=True,
                    requires_document_count=False,
                    display_order=11
                ),
                ChecklistItem(
                    id="4_8_1_comp_agriculture",
                    label="Agriculture Technicians",
                    mov_description="Verify Agriculture Technicians are listed in BNC composition",
                    required=True,
                    requires_document_count=False,
                    display_order=12
                ),
                ChecklistItem(
                    id="4_8_1_comp_rhm",
                    label="Rural Health Midwife (RHM)",
                    mov_description="Verify RHM is listed in BNC composition",
                    required=True,
                    requires_document_count=False,
                    display_order=13
                ),
                ChecklistItem(
                    id="4_8_1_comp_other",
                    label="Other as may be identified",
                    mov_description="Verify other members as may be identified are listed in BNC composition",
                    required=False,
                    requires_document_count=False,
                    display_order=14
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
                "2. Certification from the C/MHO on the Decrease in Prevalence Rate\n\n"
                "The following categories will be assessed:\n"
                "- Underweight and Severe Underweight\n"
                "- Stunting and Severe Stunting\n"
                "- Moderate Wasting and Severe Wasting"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_8_3_upload_opt",
                    label="Operation Timbang (OPT) Plus Form 1A (Barangay Tally and Summary Sheet of Preschoolers with Weight & Height Measurement by Age Group, Sex and Nutritional Status) of CYs 2022 and 2023",
                    mov_description="Verification of uploaded Operation Timbang (OPT) Plus Form 1A for CYs 2022 and 2023",
                    required=True,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_8_3_upload_cert",
                    label="Certification from the C/MHO on the Decrease in Prevalence Rate",
                    mov_description="Verification of uploaded Certification from the C/MHO on the Decrease in Prevalence Rate",
                    required=True,
                    display_order=2
                ),
                ChecklistItem(
                    id="4_8_3_underweight",
                    label="Underweight and Severe Underweight",
                    mov_description="Verify decrease in prevalence rate of Underweight and Severe Underweight",
                    required=True,
                    requires_document_count=False,
                    display_order=3
                ),
                ChecklistItem(
                    id="4_8_3_stunting",
                    label="Stunting and Severe Stunting; and",
                    mov_description="Verify decrease in prevalence rate of Stunting and Severe Stunting",
                    required=True,
                    requires_document_count=False,
                    display_order=4
                ),
                ChecklistItem(
                    id="4_8_3_wasting",
                    label="Moderate Wasting and Severe Wasting",
                    mov_description="Verify decrease in prevalence rate of Moderate Wasting and Severe Wasting",
                    required=True,
                    requires_document_count=False,
                    display_order=5
                ),
            ]
        ),

        # Sub-Indicator 4.8.4: Accomplishment Report
        SubIndicator(
            code="4.8.4",
            name="Accomplishment Report",
            upload_instructions=(
                "Upload the following:\n\n"
                "1. Accomplishment Report on CY 2023 BNAP\n"
                "2. Certification on the submitted BNAP Accomplishment Report for CY 2023 signed by the C/MLGOO\n\n"
                "Note: The certification must indicate EITHER:\n"
                "- 4.8.4 a) At least 50% accomplishment of the physical targets in the CY 2023 BNAP, OR\n"
                "- 4.8.4 b) At least 50% fund utilization rate of the CY 2023 BNAP Budget"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",  # Both uploads required, but assessor checks for either option A or B
            checklist_items=[
                ChecklistItem(
                    id="4_8_4_upload_report",
                    label="Accomplishment Report on CY 2023 BNAP",
                    mov_description="Verification of uploaded Accomplishment Report on CY 2023 BNAP",
                    required=True,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_8_4_upload_cert",
                    label="Certification on the submitted BNAP Accomplishment Report for CY 2023 signed by the C/MLGOO",
                    mov_description="Verification of uploaded Certification on submitted BNAP Accomplishment Report for CY 2023",
                    required=True,
                    display_order=2
                ),
                ChecklistItem(
                    id="4_8_4_option_a_check",
                    label="4.8.4 a) At least 50% accomplishment of the physical targets in the CY 2023 BNAP",
                    mov_description="Verify at least 50% accomplishment of physical targets (Option A)",
                    required=False,
                    display_order=3
                ),
                ChecklistItem(
                    id="4_8_4_physical_percentage",
                    label="% of programs, project, and activities are completed",
                    mov_description="Input field for percentage of programs, projects, and activities completed",
                    required=False,
                    requires_document_count=True,
                    display_order=4
                ),
                ChecklistItem(
                    id="4_8_4_option_b_check",
                    label="4.8.4 b) At least 50% fund utilization rate of the CY 2023 BNAP Budget",
                    mov_description="Verify at least 50% fund utilization rate (Option B)",
                    required=False,
                    display_order=5
                ),
                ChecklistItem(
                    id="4_8_4_amount_utilized",
                    label="Amount utilized (as of Dec. 31, 2023)",
                    mov_description="Input field for amount utilized as of Dec. 31, 2023",
                    required=False,
                    requires_document_count=True,
                    display_order=6
                ),
                ChecklistItem(
                    id="4_8_4_amount_allocated",
                    label="Amount allocated for PPAs in the BNAP",
                    mov_description="Input field for amount allocated for PPAs in the BNAP",
                    required=False,
                    requires_document_count=True,
                    display_order=7
                ),
            ]
        ),
    ]
)
