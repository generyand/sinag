"""
Indicator 6.2: Existence of a Solid Waste Management Facility Pursuant to R.A. 9003

Governance Area: 6 (Environmental Management)
BBI Status: NO (This is NOT a BBI)

Note: This indicator assesses the presence of a Materials Recovery Facility (MRF) or
Materials Recovery System (MRS) in compliance with R.A. 9003 (Ecological Solid Waste
Management Act of 2000).
"""

from app.indicators.base import ChecklistItem, Indicator, SubIndicator

# Indicator 6.2: Existence of a Solid Waste Management Facility Pursuant to R.A. 9003
INDICATOR_6_2 = Indicator(
    code="6.2",
    name="Existence of a Solid Waste Management Facility Pursuant to R.A. 9003",
    governance_area_id=6,  # Environmental Management
    is_bbi=False,
    sort_order=2,
    description="Assessment of presence of a Materials Recovery Facility (MRF)/Materials Recovery System (MRS)",
    children=[
        # Sub-Indicator 6.2.1: Presence of a Materials Recovery Facility (MRF)/Materials Recovery System (MRS)
        SubIndicator(
            code="6.2.1",
            name="Presence of a Materials Recovery Facility (MRF)/Materials Recovery System (MRS)",
            upload_instructions=(
                "Upload documents for ONE of the following options (only 1 option required):\n\n"
                "OPTION A - For MRF operated by the barangay:\n"
                "- Photo documentation of the MRF/MRF Records of the barangay (Photo Requirements: One photo with Distant View and one photo with Close-up View)\n\n"
                "OR\n\n"
                "OPTION B - For MRS:\n"
                "- MOA with junkshop\n"
                "- Mechanism to process biodegradable wastes\n"
                "- MOA with service provider for collection of biodegradable wastes and recyclables for treatment and temporary storage\n\n"
                "OR\n\n"
                "OPTION C - For Clustered MRFs:\n"
                "- MOA with the host barangay (applicable for barangay-clustered MRFs)\n"
                "- MOA or similar document indicating coverage of city/municipal MRF (applicable for barangays clustered to the Central MRF of City/Municipality)"
            ),
            validation_rule="OR_LOGIC_AT_LEAST_1_REQUIRED",  # At least ONE option must pass
            checklist_items=[
                # OPTION A LABEL (info_text, not checkbox)
                ChecklistItem(
                    id="6_2_1_label_a",
                    label="A. For MRF operated by the barangay:",
                    item_type="info_text",
                    mov_description="Label for option A",
                    required=False,
                    display_order=1,
                ),
                ChecklistItem(
                    id="6_2_1_a_photo",
                    label="Photo documentation of the MRF/MRF Records of the barangay",
                    item_type="checkbox",
                    mov_description="Verification of photo documentation",
                    required=False,
                    display_order=2,
                    option_group="Option A",
                ),
                # OR separator 1
                ChecklistItem(
                    id="6_2_1_or_1",
                    label="OR",
                    item_type="info_text",
                    mov_description="OR",
                    required=False,
                    display_order=3,
                ),
                # OPTION B LABEL (info_text, not checkbox)
                ChecklistItem(
                    id="6_2_1_label_b",
                    label="B. For MRS:",
                    item_type="info_text",
                    mov_description="Label for option B",
                    required=False,
                    display_order=4,
                ),
                ChecklistItem(
                    id="6_2_1_b_moa_junkshop",
                    label="MOA with junkshop;",
                    item_type="checkbox",
                    mov_description="Verification of MOA with junkshop",
                    required=False,
                    display_order=5,
                    option_group="Option B",
                ),
                ChecklistItem(
                    id="6_2_1_b_mechanism",
                    label="Mechanism to process biodegradable wastes;",
                    item_type="checkbox",
                    mov_description="Verification of mechanism to process biodegradable wastes",
                    required=False,
                    display_order=6,
                    option_group="Option B",
                ),
                ChecklistItem(
                    id="6_2_1_b_moa_service",
                    label="MOA with service provider for collection of biodegradable and recyclables for treatment temporary storage",
                    item_type="checkbox",
                    mov_description="Verification of MOA with service provider",
                    required=False,
                    display_order=7,
                    option_group="Option B",
                ),
                # OR separator 2
                ChecklistItem(
                    id="6_2_1_or_2",
                    label="OR",
                    item_type="info_text",
                    mov_description="OR",
                    required=False,
                    display_order=8,
                ),
                # OPTION C LABEL (info_text, not checkbox)
                ChecklistItem(
                    id="6_2_1_label_c",
                    label="C. For Clustered MRFs:",
                    item_type="info_text",
                    mov_description="Label for option C",
                    required=False,
                    display_order=9,
                ),
                ChecklistItem(
                    id="6_2_1_c_moa_host",
                    label="MOA with the host barangay (applicable for barangay-clustered MRFs);",
                    item_type="checkbox",
                    mov_description="Verification of MOA with host barangay",
                    required=False,
                    display_order=10,
                    option_group="Option C",
                ),
                ChecklistItem(
                    id="6_2_1_c_moa_lgu",
                    label="MOA or LGU document indicating coverage of City/municipal MRF (applicable for barangays clustered to the Central MRF of City/Municipality)",
                    item_type="checkbox",
                    mov_description="Verification of MOA or LGU document",
                    required=False,
                    display_order=11,
                    option_group="Option C",
                ),
            ],
        ),
    ],
)
