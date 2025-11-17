"""
Indicator 2.3: Extent of Preparedness for Effective Response and Recovery

Governance Area: 2 (Disaster Preparedness)
BBI Status: NO (This is NOT a BBI)

Note: This indicator assesses the extent of preparedness through the presence of
evacuation centers and disaster supplies/equipment.
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 2.3: Extent of Preparedness for Effective Response and Recovery
INDICATOR_2_3 = Indicator(
    code="2.3",
    name="Extent of Preparedness for Effective Response and Recovery",
    governance_area_id=2,  # Disaster Preparedness
    is_bbi=False,
    sort_order=3,
    description="Assessment of barangay preparedness through evacuation centers and disaster supplies/equipment",
    children=[
        # Sub-Indicator 2.3.1: Evacuation Center
        SubIndicator(
            code="2.3.1",
            name="A barangay must have a permanent or temporary evacuation center",
            upload_instructions=(
                "Upload the following documents:\n\n"
                "1. Two (2) Photo documentation of the permanent or temporary evacuation center "
                "(Photo Requirements: One photo with Distant View and one photo with Close-up View)\n"
                "2. Certification on the presence and location of a permanent or temporary evacuation center "
                "signed by the C/MDRRMO"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Upload Verification
                ChecklistItem(
                    id="2_3_1_upload_1",
                    label="Two (2) Photo documentation of the permanent or temporary evacuation center; and",
                    mov_description="Verification of uploaded photo documentation of the permanent or temporary evacuation center",
                    required=True,
                    display_order=1
                ),
                ChecklistItem(
                    id="2_3_1_upload_2",
                    label="Certification on the presence and location of a permanent or temporary evacuation center signed by the C/MDRRMO",
                    mov_description="Verification of uploaded certification from C/MDRRMO on evacuation center presence and location",
                    required=True,
                    display_order=2
                ),
            ]
        ),

        # Sub-Indicator 2.3.2: Disaster Supplies/Equipment
        SubIndicator(
            code="2.3.2",
            name="A barangay must have the following disaster supplies/equipment",
            upload_instructions=(
                "Upload Photo Documentation for each of disaster supplies equipment:\n\n"
                "Photo Requirements:\n"
                "One (1) photo each with Close-up View\n\n"
                "a) Communication equipment (i.e., 2 way radio mobile phone)\n"
                "b) Rescue vehicle/Barangay patrol\n"
                "c) Generator set/alternative sources of energy\n"
                "d) First aid kit\n"
                "e) Flashlight with batteries\n"
                "f) Personal Protective Equipment (PPE)"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Upload Verification
                ChecklistItem(
                    id="2_3_2_upload_1",
                    label="Photo Documentation for each of disaster supplies equipment:",
                    mov_description="Verification of uploaded photo documentation for disaster supplies/equipment",
                    item_type="checkbox",
                    required=False,
                    display_order=1
                ),
                # Item Verification Instructions (informational text only)
                ChecklistItem(
                    id="2_3_2_instructions",
                    label="Instruction: Put a check ✓ on the box that corresponds to your assessment.",
                    mov_description="Instructions for assessor",
                    item_type="info_text",
                    required=False,
                    display_order=2
                ),
                # Individual Equipment Items - Each with YES/NO assessment
                ChecklistItem(
                    id="2_3_2_a",
                    label="a. Communication equipment;",
                    mov_description="Verification of communication equipment (i.e., 2 way radio mobile phone, satellite phone)",
                    item_type="assessment_field",
                    required=False,
                    display_order=3
                ),
                ChecklistItem(
                    id="2_3_2_b",
                    label="b. Rescue vehicle/Alternative vehicle;",
                    mov_description="Verification of rescue vehicle/alternative vehicle (i.e., ambulance, amphibious vehicle, tricycle boats, vans, trucks, fire trucks, dump trucks and any appropriate vehicle depending on location at the minimum)",
                    item_type="assessment_field",
                    required=False,
                    display_order=4
                ),
                ChecklistItem(
                    id="2_3_2_c",
                    label="c. Generator set/alternative sources of energy;",
                    mov_description="Verification of generator set/alternative sources of energy (i.e., portable generator, solar-powered generator)",
                    item_type="assessment_field",
                    required=False,
                    display_order=5
                ),
                ChecklistItem(
                    id="2_3_2_d",
                    label="d. First aid kit;",
                    mov_description="Verification of first aid kit",
                    item_type="assessment_field",
                    required=False,
                    display_order=6
                ),
                ChecklistItem(
                    id="2_3_2_e",
                    label="e. Flashlight; and",
                    mov_description="Verification of flashlight with batteries",
                    item_type="assessment_field",
                    required=False,
                    display_order=7
                ),
                ChecklistItem(
                    id="2_3_2_f",
                    label="f. Personal Protective Equipment.",
                    mov_description="Verification of Personal Protective Equipment (PPE)",
                    item_type="assessment_field",
                    required=False,
                    display_order=8
                ),
            ]
        ),
    ]
)
