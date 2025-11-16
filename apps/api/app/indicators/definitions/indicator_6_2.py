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
                "Upload the following documents based on your setup:\n\n"
                "Choose ONE of the following options:\n\n"
                "Option A - For MRF operated by the barangay:\n"
                "• Photo documentation of the MRF/MRF Records of the barangay\n\n"
                "Photo Requirements:\n"
                "• One (1) photo with Distant View; and\n"
                "• One (1) photo with Close-up View\n\n"
                "OR\n\n"
                "Option B - For MRS:\n"
                "• MOA with junkshop;\n"
                "• Mechanism to process biodegradable wastes; and\n"
                "• MOA with service provider for collection of biodegradable wastes and recyclables for treatment and temporary storage\n\n"
                "OR\n\n"
                "Option C - For Clustered MRFs:\n"
                "• MOA with the host barangay (applicable for barangay-clustered MRFs); and\n"
                "• MOA or similar document indicating coverage of city/municipal MRF (applicable for barangays clustered to the Central MRF of City/Municipality)"
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # At least ONE option must pass
            checklist_items=[
                # Option A: For MRF operated by the barangay
                ChecklistItem(
                    id="6_2_1_mrf_photo",
                    label="A. For MRF operated by the barangay: Photo documentation of the MRF/MRF Records of the barangay",
                    group_name="Option A: MRF operated by barangay",
                    mov_description="Photo documentation of the MRF/MRF Records of the barangay (Distant View + Close-up View)",
                    required=False,
                    display_order=1
                ),

                # Option B: For MRS
                ChecklistItem(
                    id="6_2_1_mrs_junkshop",
                    label="B. For MRS: MOA with junkshop",
                    group_name="Option B: Materials Recovery System (MRS)",
                    mov_description="MOA with junkshop",
                    required=False,
                    display_order=2
                ),
                ChecklistItem(
                    id="6_2_1_mrs_mechanism",
                    label="B. For MRS: Mechanism to process biodegradable wastes",
                    group_name="Option B: Materials Recovery System (MRS)",
                    mov_description="Mechanism to process biodegradable wastes",
                    required=False,
                    display_order=3
                ),
                ChecklistItem(
                    id="6_2_1_mrs_service",
                    label="B. For MRS: MOA with service provider for collection of biodegradable wastes and recyclables for treatment and temporary storage",
                    group_name="Option B: Materials Recovery System (MRS)",
                    mov_description="MOA with service provider for collection of biodegradable wastes and recyclables for treatment and temporary storage",
                    required=False,
                    display_order=4
                ),

                # Option C: For Clustered MRFs
                ChecklistItem(
                    id="6_2_1_clustered_host",
                    label="C. For Clustered MRFs: MOA with the host barangay (applicable for barangay-clustered MRFs)",
                    group_name="Option C: Clustered MRFs",
                    mov_description="MOA with the host barangay (applicable for barangay-clustered MRFs)",
                    required=False,
                    display_order=5
                ),
                ChecklistItem(
                    id="6_2_1_clustered_coverage",
                    label="C. For Clustered MRFs: MOA or similar document indicating coverage of city/municipal MRF (applicable for barangays clustered to the Central MRF of City/Municipality)",
                    group_name="Option C: Clustered MRFs",
                    mov_description="MOA or similar document indicating coverage of city/municipal MRF (applicable for barangays clustered to the Central MRF of City/Municipality)",
                    required=False,
                    display_order=6
                ),
            ]
        ),
    ]
)
