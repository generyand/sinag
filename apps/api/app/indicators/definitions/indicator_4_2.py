"""
Indicator 4.2: Access to Health and Social Welfare Services in the Barangay

Governance Area: 4 (Social Protection and Sensitivity)
BBI Status: NO (This is NOT a BBI)

Note: This indicator assesses access to health and social welfare services through
the presence of health facilities, appointment of health personnel, and availability
of essential health services.
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 4.2: Access to Health and Social Welfare Services in the Barangay
INDICATOR_4_2 = Indicator(
    code="4.2",
    name="Access to Health and Social Welfare Services in the Barangay",
    governance_area_id=4,  # Social Protection and Sensitivity
    is_bbi=False,
    sort_order=2,
    description="Assessment of access to health and social welfare services through health station presence, personnel appointments, and service availability",
    children=[
        # Sub-Indicator 4.2.1: Presence of a Barangay Health Station/Center
        SubIndicator(
            code="4.2.1",
            name="Presence of a Barangay Health Station/Center",
            upload_instructions=(
                "Upload the following documents:\n\n"
                "• Photo documentation of the BHS/C\n\n"
                "Photo Requirements:\n"
                "- One (1) photo with Distant View; and\n"
                "- One (1) photo with Close-up View\n\n"
                "• For clustered BHS/C: Certification from C/MHO on the clustering scheme\n\n"
                "Consideration: Clustered Health Station/Center accessed by several barangays in a city/municipality"
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # BHS/C operated OR clustered
            checklist_items=[
                ChecklistItem(
                    id="4_2_1_photos",
                    label="Photo documentation of the BHS/C",
                    mov_description="Two photos: One with Distant View and One with Close-up View",
                    required=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_2_1_certification_clustered",
                    label="For clustered BHS/C: Certification from C/MHO on the clustering scheme",
                    mov_description="Certification from C/MHO on the clustering scheme for clustered health stations",
                    required=False,
                    display_order=2
                ),
                ChecklistItem(
                    id="4_2_1_operated",
                    label="Barangay Health Station/Center operated",
                    group_name="Option A: BHS/C Operated",
                    mov_description="YES/NO checkbox: Barangay Health Station/Center operated",
                    required=False,
                    display_order=3
                ),
                ChecklistItem(
                    id="4_2_1_clustered",
                    label="Clustered Health Station/Center accessed by several barangays in a city/municipality (Consideration)",
                    group_name="Option B: Clustered BHS/C",
                    mov_description="YES/NO checkbox: Clustered Health Station/Center accessed by several barangays",
                    required=False,
                    display_order=4
                ),
            ]
        ),

        # Sub-Indicator 4.2.2: Appointment of Barangay Health Personnel (FOR PROFILING)
        SubIndicator(
            code="4.2.2",
            name="Appointment of the following Barangay Health Personnel (FOR PROFILING)",
            upload_instructions=(
                "Upload the following documents:\n\n"
                "1. Accredited Barangay Health Worker (BHW); AND/OR\n\n"
                "2. Barangay Health Officer (BHO) or Barangay Health Assistant (BHAsst)\n\n"
                "• EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) "
                "on the Appointment of BHW and/or BHO or BHAsst covering January to October 2023"
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # At least one of the two personnel types
            checklist_items=[
                ChecklistItem(
                    id="4_2_2_bhw",
                    label="1. Accredited Barangay Health Worker (BHW); AND/OR",
                    group_name="Barangay Health Personnel",
                    mov_description="EO on appointment of BHW covering January to October 2023",
                    required=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_2_2_bho",
                    label="2. Barangay Health Officer (BHO) or Barangay Health Assistant (BHAsst)",
                    group_name="Barangay Health Personnel",
                    mov_description="EO on appointment of BHO or BHAsst covering January to October 2023",
                    required=False,
                    display_order=2
                ),
            ]
        ),

        # Sub-Indicator 4.2.3: Appointment of a Barangay Nutrition Scholar (BNS)
        SubIndicator(
            code="4.2.3",
            name="Appointment of a Barangay Nutrition Scholar (BNS)",
            upload_instructions=(
                "Upload the following document:\n\n"
                "• EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) "
                "on the appointment of BNS"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_2_3_eo",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the appointment of BNS",
                    mov_description="Executive Order or similar issuance appointing Barangay Nutrition Scholar",
                    required=True,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.2.4: Availability of health services in the BHS/C
        SubIndicator(
            code="4.2.4",
            name="Availability of health services in the Barangay Health Station/Center (BHS/C)",
            upload_instructions=(
                "Upload the following document:\n\n"
                "• Certification on the provision of health services signed by the C/MHO\n\n"
                "Health services to verify:\n"
                "a) Immunization\n"
                "b) Maternal and child healthcare\n"
                "c) Family planning\n"
                "d) Health education\n\n"
                "Instruction: Put a check ✓ on the box that corresponds to your assessment."
            ),
            validation_rule="ALL_ITEMS_REQUIRED",  # Certification is required, plus at least some services
            checklist_items=[
                ChecklistItem(
                    id="4_2_4_certification",
                    label="Certification on the provision of health services signed by the C/MHO",
                    mov_description="Certification from C/MHO on the provision of health services",
                    required=True,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_2_4_immunization",
                    label="a. Immunization",
                    group_name="Health Services Available",
                    mov_description="YES/NO checkbox: Immunization service available",
                    required=False,
                    display_order=2
                ),
                ChecklistItem(
                    id="4_2_4_maternal",
                    label="b. Maternal and child healthcare",
                    group_name="Health Services Available",
                    mov_description="YES/NO checkbox: Maternal and child healthcare service available",
                    required=False,
                    display_order=3
                ),
                ChecklistItem(
                    id="4_2_4_family_planning",
                    label="c. Family Planning",
                    group_name="Health Services Available",
                    mov_description="YES/NO checkbox: Family Planning service available",
                    required=False,
                    display_order=4
                ),
                ChecklistItem(
                    id="4_2_4_health_education",
                    label="d. Health Education",
                    group_name="Health Services Available",
                    mov_description="YES/NO checkbox: Health Education service available",
                    required=False,
                    display_order=5
                ),
            ]
        ),
    ]
)
