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
                "• Two (2) Photo documentation of the permanent or temporary evacuation center\n\n"
                "Photo Requirements:\n"
                "- One (1) photo with Distant View; and\n"
                "- One (1) photo with Close-up View\n\n"
                "• Certification on the presence and location of a permanent or temporary evacuation center "
                "signed by the C/MDRRMO"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="2_3_1_photos",
                    label="Two (2) Photo documentation of the permanent or temporary evacuation center",
                    mov_description="Two photos: One with Distant View and One with Close-up View",
                    required=True,
                    display_order=1
                ),
                ChecklistItem(
                    id="2_3_1_certification",
                    label="Certification on the presence and location of a permanent or temporary evacuation center signed by the C/MDRRMO",
                    mov_description="Certification from C/MDRRMO on evacuation center presence and location",
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
                "Upload Photo Documentation for each of the following disaster supplies/equipment:\n\n"
                "For each item (a-f), provide:\n"
                "• Photo Documentation (One photo each with Close-up View)\n\n"
                "Required disaster supplies/equipment:\n"
                "a) Communication equipment (i.e., 2 way radio mobile phone)\n"
                "b) Rescue vehicle/Barangay patrol\n"
                "c) Generator set/alternative sources of energy\n"
                "d) First aid kit\n"
                "e) Flashlight with batteries\n"
                "f) Personal Protective Equipment (PPE)\n\n"
                "Instruction: Put a check ✓ on the box that corresponds to your assessment.\n"
                "Note: All minimum requirements must be met."
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="2_3_2_a_communication",
                    label="a. Communication equipment (i.e., 2 way radio mobile phone, satellite phone)",
                    mov_description="Photo documentation of communication equipment with Close-up View",
                    required=True,
                    display_order=1
                ),
                ChecklistItem(
                    id="2_3_2_b_rescue_vehicle",
                    label="b. Rescue vehicle/Alternative vehicle (i.e., ambulance; amphibious vehicle, tricycle boats, cars, trucks, fire trucks, dump trucks and any appropriate vehicle depending on location at the minimum)",
                    mov_description="Photo documentation of rescue vehicle/alternative vehicle with Close-up View",
                    required=True,
                    display_order=2
                ),
                ChecklistItem(
                    id="2_3_2_c_generator",
                    label="c. Generator set/alternative sources of energy (i.e., portable generator, solar-powered generator)",
                    mov_description="Photo documentation of generator set/alternative sources of energy with Close-up View",
                    required=True,
                    display_order=3
                ),
                ChecklistItem(
                    id="2_3_2_d_first_aid",
                    label="d. First aid kit",
                    mov_description="Photo documentation of first aid kit with Close-up View",
                    required=True,
                    display_order=4
                ),
                ChecklistItem(
                    id="2_3_2_e_flashlight",
                    label="e. Flashlight; and",
                    mov_description="Photo documentation of flashlight with batteries with Close-up View",
                    required=True,
                    display_order=5
                ),
                ChecklistItem(
                    id="2_3_2_f_ppe",
                    label="f. Personal Protective Equipment (PPE)",
                    mov_description="Photo documentation of Personal Protective Equipment with Close-up View",
                    required=True,
                    display_order=6
                ),
            ]
        ),
    ]
)
