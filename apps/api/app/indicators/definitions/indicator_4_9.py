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
                "Upload photo documentation of the established Barangay Community Garden:\n\n"
                "REQUIRED DOCUMENTS:\n"
                "- Photo documentation of the established BCG\n\n"
                "PHOTO REQUIREMENTS:\n"
                "- One (1) photo with Distant View\n"
                "- One (1) photo with Close-up View\n\n"
                "REQUIREMENTS:\n"
                "- Photos must show the established Barangay Community Garden\n"
                "- Distant view photo should show the overall garden layout and location\n"
                "- Close-up view photo should show garden details (plants, crops, etc.)\n"
                "- Both photos are required to document the BCG\n\n"
                "IMPORTANT:\n"
                "- Both distant and close-up views must be submitted\n"
                "- Photos should clearly show the community garden\n"
                "- Garden should be identifiable as a barangay initiative"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_9_1_a",
                    label="Photo documentation of the established BCG (One photo with Distant View and One photo with Close-up View)",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. PHOTO COUNT:\n"
                        "   - Two (2) photos are submitted\n"
                        "   - One photo shows distant view\n"
                        "   - One photo shows close-up view\n\n"
                        "2. DISTANT VIEW PHOTO:\n"
                        "   - Shows overall garden layout\n"
                        "   - Demonstrates the location and size of BCG\n"
                        "   - Context of surrounding area is visible\n\n"
                        "3. CLOSE-UP VIEW PHOTO:\n"
                        "   - Shows garden details clearly\n"
                        "   - Plants, crops, or vegetables are visible\n"
                        "   - Garden features are identifiable\n\n"
                        "4. BARANGAY COMMUNITY GARDEN VERIFICATION:\n"
                        "   - Photos show a community garden\n"
                        "   - Garden appears to be a barangay initiative\n"
                        "   - Garden is established and maintained\n\n"
                        "NOTE: Both distant and close-up view photos are required.\n"
                        "Photos should clearly document the established Barangay Community Garden."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.9.2
        SubIndicator(
            code="4.9.2",
            name="Enacted an Ordinance for the Establishment of a Barangay Community Garden",
            upload_instructions=(
                "Upload documentation of enacted ordinance for BCG establishment:\n\n"
                "REQUIRED DOCUMENT:\n"
                "- Ordinance signed by the PB, Barangay Secretary and SBMs on the establishment of a BCG\n\n"
                "REQUIREMENTS:\n"
                "- Ordinance must establish a Barangay Community Garden\n"
                "- Must be signed by:\n"
                "  * Punong Barangay (PB)\n"
                "  * Barangay Secretary\n"
                "  * Sangguniang Barangay Members (SBMs)\n"
                "- Ordinance must be properly enacted and approved\n\n"
                "VALIDATOR INPUT REQUIRED:\n"
                "- Date of approval for the ordinance\n\n"
                "IMPORTANT:\n"
                "- All required signatures must be present\n"
                "- Ordinance must clearly establish the BCG\n"
                "- Date of approval must be provided by validator"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_9_2_a",
                    label="Ordinance signed by the PB, Barangay Secretary and SBMs on the establishment of a BCG",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Ordinance for establishment of BCG is present\n"
                        "   - Document is properly enacted\n\n"
                        "2. DATE INPUT REQUIRED:\n"
                        "   - Validator must input the DATE OF APPROVAL\n"
                        "   - This is a required input field\n\n"
                        "3. SIGNATURE VERIFICATION:\n"
                        "   - Ordinance is signed by the Punong Barangay (PB)\n"
                        "   - Ordinance is signed by the Barangay Secretary\n"
                        "   - Ordinance is signed by Sangguniang Barangay Members (SBMs)\n"
                        "   - All signatures are clearly visible\n\n"
                        "4. CONTENT VERIFICATION:\n"
                        "   - Ordinance establishes a Barangay Community Garden\n"
                        "   - Purpose and scope of BCG are defined\n"
                        "   - Ordinance is properly structured and authorized\n\n"
                        "NOTE: Date of approval must be input by validator.\n"
                        "All required signatures must be present for ordinance to be valid."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.9.3
        SubIndicator(
            code="4.9.3",
            name="Designated SBM to Manage the Barangay Community Garden",
            upload_instructions=(
                "Upload documentation of designated SBM to manage the BCG:\n\n"
                "REQUIRED DOCUMENT:\n"
                "- EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs)\n"
                "- Must designate an SBM to manage the BCG\n\n"
                "REQUIREMENTS:\n"
                "- Document must designate a Sangguniang Barangay Member (SBM)\n"
                "- SBM is designated to manage the Barangay Community Garden\n"
                "- Must be signed by:\n"
                "  * Punong Barangay (PB)\n"
                "  * Barangay Secretary\n"
                "  * Sangguniang Barangay Members (SBMs)\n"
                "- Document must be properly approved\n\n"
                "VALIDATOR INPUT REQUIRED:\n"
                "- Date of approval for the EO/issuance\n\n"
                "IMPORTANT:\n"
                "- All required signatures must be present\n"
                "- SBM designation must be clearly stated\n"
                "- Date of approval must be provided by validator"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_9_3_a",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the designated SBM to manage the BCG",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Executive Order (EO), resolution, or ordinance is present\n"
                        "   - Document designates an SBM to manage the BCG\n\n"
                        "2. DATE INPUT REQUIRED:\n"
                        "   - Validator must input the DATE OF APPROVAL\n"
                        "   - This is a required input field\n\n"
                        "3. SIGNATURE VERIFICATION:\n"
                        "   - Document is signed by the Punong Barangay (PB)\n"
                        "   - Document is signed by the Barangay Secretary\n"
                        "   - Document is signed by Sangguniang Barangay Members (SBMs)\n"
                        "   - All signatures are clearly visible\n\n"
                        "4. DESIGNATION VERIFICATION:\n"
                        "   - A Sangguniang Barangay Member (SBM) is designated\n"
                        "   - SBM is designated to manage the Barangay Community Garden\n"
                        "   - Designation is clearly stated in the document\n\n"
                        "NOTE: Date of approval must be input by validator.\n"
                        "The designated person must be an SBM (Sangguniang Barangay Member)."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.9.4
        SubIndicator(
            code="4.9.4",
            name="Conducted at least One (1) Advocacy Campaign/Awareness on community household gardening",
            upload_instructions=(
                "Upload proof of conduct of advocacy campaign/awareness activities:\n\n"
                "REQUIRED DOCUMENT:\n"
                "- Proof of conduct of at least one (1) Advocacy Campaign/Awareness\n"
                "- Can be in the form of:\n"
                "  * Photo documentation\n"
                "  * Social Media Posts\n"
                "  * Posters/Tarpaulins (PAR/AR)\n"
                "  * Other promotional materials\n\n"
                "REQUIREMENTS:\n"
                "- At least one (1) advocacy campaign or awareness activity conducted\n"
                "- Activity must be about community household gardening\n"
                "- Proof must demonstrate barangay initiative\n"
                "- Evidence must be clear and verifiable\n\n"
                "ACCEPTABLE FORMS OF PROOF:\n"
                "- Photos of advocacy events\n"
                "- Social media posts promoting household gardening\n"
                "- Posters or tarpaulins (PAR/AR)\n"
                "- Other campaign materials\n\n"
                "IMPORTANT:\n"
                "- At least one form of proof is required\n"
                "- Proof must be related to community household gardening\n"
                "- Activity must be conducted by or for the barangay"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_9_4_a",
                    label="Proof of conduct of at least one (1) Advocacy Campaign/Awareness (Photo/Social Media Post, PAR/AR, etc.)",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Proof of advocacy campaign/awareness is present\n"
                        "   - At least one (1) form of proof is submitted\n\n"
                        "2. CAMPAIGN/AWARENESS VERIFICATION:\n"
                        "   - Advocacy campaign or awareness activity was conducted\n"
                        "   - Activity is about community household gardening\n"
                        "   - Barangay involvement is evident\n\n"
                        "3. ACCEPTABLE FORMS OF PROOF:\n"
                        "   - Photo documentation of advocacy events\n"
                        "   - Social media posts promoting household gardening\n"
                        "   - Posters or tarpaulins (PAR/AR)\n"
                        "   - Other campaign materials\n"
                        "   - Any of these forms is acceptable\n\n"
                        "4. CONTENT VERIFICATION:\n"
                        "   - Proof shows advocacy/awareness activities\n"
                        "   - Focus is on community household gardening\n"
                        "   - Activity is barangay-initiated or supported\n"
                        "   - Evidence is clear and verifiable\n\n"
                        "NOTE: At least one (1) advocacy campaign or awareness activity must be documented."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 4.9.5
        SubIndicator(
            code="4.9.5",
            name="Established Group of Volunteers on the implementation of the Community Garden",
            upload_instructions=(
                "Upload documentation of established volunteer group:\n\n"
                "REQUIRED DOCUMENT:\n"
                "- EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs)\n"
                "- Must establish a group of volunteers for the implementation of the Community Garden\n\n"
                "REQUIREMENTS:\n"
                "- Document must establish a group of volunteers\n"
                "- Volunteers are for the implementation of the Community Garden\n"
                "- Must be signed by:\n"
                "  * Punong Barangay (PB)\n"
                "  * Barangay Secretary\n"
                "  * Sangguniang Barangay Members (SBMs)\n"
                "- Document must be properly approved\n\n"
                "VALIDATOR INPUT REQUIRED:\n"
                "- Date of approval for the EO/issuance\n\n"
                "IMPORTANT:\n"
                "- All required signatures must be present\n"
                "- Volunteer group establishment must be clearly stated\n"
                "- Date of approval must be provided by validator"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="4_9_5_a",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the established group volunteers",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENT PRESENCE:\n"
                        "   - Executive Order (EO), resolution, or ordinance is present\n"
                        "   - Document establishes a group of volunteers\n\n"
                        "2. DATE INPUT REQUIRED:\n"
                        "   - Validator must input the DATE OF APPROVAL\n"
                        "   - This is a required input field\n\n"
                        "3. SIGNATURE VERIFICATION:\n"
                        "   - Document is signed by the Punong Barangay (PB)\n"
                        "   - Document is signed by the Barangay Secretary\n"
                        "   - Document is signed by Sangguniang Barangay Members (SBMs)\n"
                        "   - All signatures are clearly visible\n\n"
                        "4. VOLUNTEER GROUP VERIFICATION:\n"
                        "   - Group of volunteers is established\n"
                        "   - Volunteers are for the implementation of the Community Garden\n"
                        "   - Volunteer group composition is documented\n"
                        "   - Purpose of volunteer group is clearly stated\n\n"
                        "NOTE: Date of approval must be input by validator.\n"
                        "The volunteer group must be for Community Garden implementation."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),
    ]
)
