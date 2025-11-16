"""
Indicator 4.9: Halina't Magtanim ng Prutas at Gulay (HAPAG) sa Barangay Project

Governance Area: 4 (Social Protection and Sensitivity)
BBI Status: No (HAPAG is a community project, NOT a barangay-based institution)

IMPORTANT NOTES FOR PHASE 9 (VALIDATION SERVICE):

1. Five Sub-Indicators Structure:
   - 4.9.1: Established a Barangay Community Garden (BCG)
   - 4.9.2: Enacted Ordinance for the Establishment of a Barangay Community Garden
   - 4.9.3: Designated SBM to Manage the Barangay Community Garden
   - 4.9.4: Conducted at least One (1) Advocacy Campaign/Awareness on community household gardening
   - 4.9.5: Established Group of Volunteers on the implementation of the Community Garden

2. Input Fields Required:
   - Sub-indicator 4.9.2: DATE input (Date of approval for ordinance)
   - Sub-indicator 4.9.3: DATE input (Date of approval for EO designating SBM)
   - Sub-indicator 4.9.5: DATE input (Date of approval for EO establishing volunteer group)

3. PROFILING PURPOSES ONLY:
   - This indicator is FOR PROFILING PURPOSES ONLY
   - It is NOT scored for SGLGB assessment
   - It collects data on community garden initiatives
   - Results are used for analytics and reporting only

4. Validation Workflow:
   - Validator verifies photo documentation of established BCG
   - Validator confirms ordinance for BCG establishment (inputs date of approval)
   - Validator checks EO designating SBM to manage BCG (inputs date of approval)
   - Validator verifies proof of advocacy campaign/awareness activities
   - Validator confirms EO establishing volunteer group (inputs date of approval)
   - All sub-indicators must be present for indicator to be considered complete

5. Photo Documentation Requirements:
   - Sub-indicator 4.9.1: Photo documentation of established BCG
     * One (1) photo with Distant View
     * One (1) photo with Close-up View
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 4.9: Halina't Magtanim ng Prutas at Gulay (HAPAG) sa Barangay Project
INDICATOR_4_9 = Indicator(
    code="4.9",
    name="Halina't Magtanim ng Prutas at Gulay (HAPAG) sa Barangay Project",
    governance_area_id=4,  # Social Protection and Sensitivity
    is_bbi=False,  # HAPAG is NOT a BBI
    is_profiling_only=True,  # FOR PROFILING PURPOSES ONLY
    sort_order=9,
    description="Halina't Magtanim ng Prutas at Gulay (HAPAG) sa Barangay Project - For Profiling Purposes Only",
    children=[
        # Sub-Indicator 4.9.1
        SubIndicator(
            code="4.9.1",
            name="Established a Barangay Community Garden (BCG)",
            upload_instructions=(
                "Upload: Photo documentation of the established BCG\n\n"
                "Photo Requirements:\n"
                "One (1) photo with Distant View; and\n"
                "One (1) photo with Close-up View"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_9_1_upload_1",
                    label="Photo documentation of the established BCG (One photo with Distant View and One photo with Close-up View)",
                    mov_description="Verification of uploaded photo documentation of the established BCG",
                    required=False,  # Profiling only
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.9.2
        SubIndicator(
            code="4.9.2",
            name="Enacted an Ordinance for the Establishment of a Barangay Community Garden",
            upload_instructions=(
                "Upload: Ordinance signed by the PB, Barangay Secretary and SBMs on the establishment of a BCG\n\n"
                "Please supply the required information:\n"
                "Date of approval"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_9_2_upload_1",
                    label="Ordinance signed by the PB, Barangay Secretary and SBMs on the establishment of a BCG",
                    mov_description="Verification of uploaded Ordinance signed by the PB, Barangay Secretary and SBMs on the establishment of a BCG",
                    required=False,  # Profiling only
                    display_order=1
                ),
                ChecklistItem(
                    id="4_9_2_date_of_approval",
                    label="Date of approval",
                    mov_description="Date of approval for the ordinance",
                    required=False,  # Profiling only
                    requires_document_count=True,
                    display_order=2
                ),
            ]
        ),

        # Sub-Indicator 4.9.3
        SubIndicator(
            code="4.9.3",
            name="Designated SBM to Manage the Barangay Community Garden",
            upload_instructions=(
                "Upload: EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the designated SBM to manage the BCG\n\n"
                "Please supply the required information:\n"
                "Date of approval"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_9_3_upload_1",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the designated SBM to manage the BCG",
                    mov_description="Verification of uploaded EO or similar issuance on the designated SBM to manage the BCG",
                    required=False,  # Profiling only
                    display_order=1
                ),
                ChecklistItem(
                    id="4_9_3_date_of_approval",
                    label="Date of approval",
                    mov_description="Date of approval for the EO/issuance",
                    required=False,  # Profiling only
                    requires_document_count=True,
                    display_order=2
                ),
            ]
        ),

        # Sub-Indicator 4.9.4
        SubIndicator(
            code="4.9.4",
            name="Conducted at least One (1) Advocacy Campaign/Awareness on community household gardening",
            upload_instructions=(
                "Upload: Proof of conduct of at least one (1) Advocacy Campaign/Awareness (Photo/Social Media Post, PAR/AR, etc.)"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_9_4_upload_1",
                    label="Proof of conduct of at least one (1) Advocacy Campaign/Awareness (Photo/Social Media Post, PAR/AR, etc.)",
                    mov_description="Verification of uploaded proof of conduct of at least one (1) Advocacy Campaign/Awareness",
                    required=False,  # Profiling only
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.9.5
        SubIndicator(
            code="4.9.5",
            name="Established Group of Volunteers on the implementation of the Community Garden",
            upload_instructions=(
                "Upload: EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the established group volunteers\n\n"
                "Please supply the required information:\n"
                "Date of approval"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_9_5_upload_1",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the established group volunteers",
                    mov_description="Verification of uploaded EO or similar issuance on the established group volunteers",
                    required=False,  # Profiling only
                    display_order=1
                ),
                ChecklistItem(
                    id="4_9_5_date_of_approval",
                    label="Date of approval",
                    mov_description="Date of approval for the EO/issuance",
                    required=False,  # Profiling only
                    requires_document_count=True,
                    display_order=2
                ),
            ]
        ),
    ]
)
