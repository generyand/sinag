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
                "Upload ONE of the following (only 1 required):\n\n"
                "1. Photo documentation of the BHS/C (Photo Requirements: One photo with Distant View and one photo with Close-up View)\n"
                "2. For clustered BHS/C: Certification from C/MHO on the clustering scheme\n\n"
                "Note: Consideration - Clustered Health Station/Center accessed by several barangays in a city/municipality"
            ),
            validation_rule="OR_LOGIC_AT_LEAST_1_REQUIRED",  # BHS/C operated OR clustered
            checklist_items=[
                # Document verification checkboxes
                ChecklistItem(
                    id="4_2_1_photo",
                    label="Photo documentation of the BHS/C (Photo Requirements: One photo with Distant View and one photo with Close-up View)",
                    mov_description="Verification of uploaded photos showing BHS/C (Option 1 - BHS/C Operated)",
                    item_type="checkbox",
                    required=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_2_1_cert_clustered",
                    label="For clustered BHS/C: Certification from C/MHO on the clustering scheme",
                    mov_description="Verification of uploaded certification from C/MHO for clustered BHS/C (Option 2 - Clustered)",
                    item_type="checkbox",
                    required=False,
                    display_order=2
                ),
                # Instruction (info_text)
                ChecklistItem(
                    id="4_2_1_instructions",
                    label="Instruction: Put a check ✓ on the box that corresponds to your assessment.",
                    mov_description="Instructions for assessor",
                    item_type="info_text",
                    required=False,
                    display_order=3
                ),
                # Option a - YES/NO assessment
                ChecklistItem(
                    id="4_2_1_option_a",
                    label="Barangay Health Station/Center operated",
                    mov_description="Assessment for BHS/C operated option",
                    item_type="assessment_field",
                    required=False,
                    display_order=4
                ),
                # Option b - YES/NO assessment
                ChecklistItem(
                    id="4_2_1_option_b",
                    label="Clustered Clustered Health Station/Center accessed by several barangays in a city/municipality (Consideration)",
                    mov_description="Assessment for clustered BHS/C option",
                    item_type="assessment_field",
                    required=False,
                    display_order=5
                ),
            ]
        ),

        # Sub-Indicator 4.2.2: Appointment of Barangay Health Personnel (FOR PROFILING)
        SubIndicator(
            code="4.2.2",
            name="Appointment of the following Barangay Health Personnel (FOR PROFILING)",
            upload_instructions=(
                "Upload EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the Appointment of BHW and/or BHO or BHAsst covering January to October 2023:\n\n"
                "1. Accredited Barangay Health Worker (BHW); AND/OR\n"
                "2. Barangay Health Officer (BHO) or Barangay Health Assistant (BHAsst)\n\n"
                "Note: At least ONE of the above is required"
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # At least one of the two personnel types
            checklist_items=[
                ChecklistItem(
                    id="4_2_2_bhw",
                    label="Accredited Barangay Health Worker (BHW); AND/OR",
                    mov_description="Verification of uploaded EO/issuance for BHW appointment (Option 1)",
                    required=False,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="4_2_2_bho",
                    label="Barangay Health Officer (BHO) or Barangay Health Assistant (BHAsst)",
                    mov_description="Verification of uploaded EO/issuance for BHO/BHAsst appointment (Option 2)",
                    required=False,
                    requires_document_count=False,
                    display_order=2
                ),
            ]
        ),

        # Sub-Indicator 4.2.3: Appointment of a Barangay Nutrition Scholar (BNS)
        SubIndicator(
            code="4.2.3",
            name="Appointment of a Barangay Nutrition Scholar (BNS)",
            upload_instructions=(
                "Upload: EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the appointment of BNS"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_2_3_eo",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the appointment of BNS",
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.2.4: Availability of health services in the BHS/C
        SubIndicator(
            code="4.2.4",
            name="Availability of health services in the Barangay Health Station/Center (BHS/C)",
            upload_instructions=(
                "Upload: Certification on the provision of health services signed by the C/MHO\n\n"
                "Instruction: Put a check ✓ on the box that corresponds to your assessment.\n\n"
                "a. Immunization\n"
                "b. Maternal and child healthcare\n"
                "c. Family Planning\n"
                "d. Health Education"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Certification checkbox
                ChecklistItem(
                    id="4_2_4_cert",
                    label="Certification on the provision of health services signed by the C/MHO",
                    mov_description="Verification of uploaded certification",
                    item_type="checkbox",
                    required=False,
                    display_order=1
                ),
                # Instruction (info_text)
                ChecklistItem(
                    id="4_2_4_instructions",
                    label="Instruction: Put a check ✓ on the box that corresponds to your assessment.",
                    mov_description="Instructions for assessor",
                    item_type="info_text",
                    required=False,
                    display_order=2
                ),
                # Health services - each with YES/NO assessment
                ChecklistItem(
                    id="4_2_4_a",
                    label="a. Immunization",
                    mov_description="Assessment for Immunization service",
                    item_type="assessment_field",
                    required=False,
                    display_order=3
                ),
                ChecklistItem(
                    id="4_2_4_b",
                    label="b. Maternal and child healthcare",
                    mov_description="Assessment for Maternal and child healthcare service",
                    item_type="assessment_field",
                    required=False,
                    display_order=4
                ),
                ChecklistItem(
                    id="4_2_4_c",
                    label="c. Family Planning",
                    mov_description="Assessment for Family Planning service",
                    item_type="assessment_field",
                    required=False,
                    display_order=5
                ),
                ChecklistItem(
                    id="4_2_4_d",
                    label="d. Health Education",
                    mov_description="Assessment for Health Education service",
                    item_type="assessment_field",
                    required=False,
                    display_order=6
                ),
            ]
        ),
    ]
)
