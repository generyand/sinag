"""
Indicator 6.2: Existence of a Solid Waste Management Facility Pursuant to R.A. 9003

Governance Area: 6 (Environmental Management)
BBI Status: NO (This is NOT a BBI)

Note: This indicator assesses the presence of a Materials Recovery Facility (MRF) or
Materials Recovery System (MRS) in compliance with R.A. 9003 (Ecological Solid Waste
Management Act of 2000).
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


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
                "For MRF operated by the barangay:\n"
                "1. Photo documentation of the MRF/MRF Records of the barangay (Photo Requirements: One photo with Distant View and one photo with Close-up View)\n\n"
                "For MRS:\n"
                "2. MOA with junkshop\n"
                "3. Mechanism to process biodegradable wastes\n"
                "4. MOA with service provider for collection of biodegradable wastes and recyclables for treatment and temporary storage\n\n"
                "For Clustered MRFs:\n"
                "5. MOA with the host barangay (applicable for barangay-clustered MRFs)\n"
                "6. MOA or similar document indicating coverage of city/municipal MRF (applicable for barangays clustered to the Central MRF of City/Municipality)\n\n"
                "Note: You only need to submit documents for ONE option based on your barangay's situation."
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # At least ONE option must pass
            checklist_items=[
                # Option 1: MRF operated by barangay
                ChecklistItem(
                    id="6_2_1_mrf_photos",
                    label="For MRF operated by the barangay:\nPhoto documentation of the MRF/MRF Records of the barangay (Photo Requirements: One photo with Distant View and one photo with Close-up View)",
                    mov_description="Verification of uploaded photo documentation of the MRF/MRF Records (Option 1 - MRF operated by barangay)",
                    required=False,
                    display_order=1
                ),
                # Option 2: MRS (3 documents)
                ChecklistItem(
                    id="6_2_1_mrs_junkshop",
                    label="For MRS:\nMOA with junkshop",
                    mov_description="Verification of uploaded MOA with junkshop (Option 2 - MRS)",
                    required=False,
                    display_order=2
                ),
                ChecklistItem(
                    id="6_2_1_mrs_mechanism",
                    label="For MRS:\nMechanism to process biodegradable wastes",
                    mov_description="Verification of uploaded mechanism to process biodegradable wastes (Option 2 - MRS)",
                    required=False,
                    display_order=3
                ),
                ChecklistItem(
                    id="6_2_1_mrs_service",
                    label="For MRS:\nMOA with service provider for collection of biodegradable wastes and recyclables for treatment and temporary storage",
                    mov_description="Verification of uploaded MOA with service provider (Option 2 - MRS)",
                    required=False,
                    display_order=4
                ),
                # Option 3: Clustered MRFs (2 documents)
                ChecklistItem(
                    id="6_2_1_clustered_host",
                    label="For Clustered MRFs:\nMOA with the host barangay (applicable for barangay-clustered MRFs)",
                    mov_description="Verification of uploaded MOA with the host barangay (Option 3 - Clustered MRFs)",
                    required=False,
                    display_order=5
                ),
                ChecklistItem(
                    id="6_2_1_clustered_coverage",
                    label="For Clustered MRFs:\nMOA or similar document indicating coverage of city/municipal MRF (applicable for barangays clustered to the Central MRF of City/Municipality)",
                    mov_description="Verification of uploaded MOA or LGU document indicating coverage of city/municipal MRF (Option 3 - Clustered MRFs)",
                    required=False,
                    display_order=6
                ),
            ]
        ),
    ]
)
