"""
Indicator 3.1: Functionality of the Barangay Anti-Drug Abuse Council (BADAC)

Governance Area: 3 (Safety, Peace and Order)
BBI Status: Yes (BADAC is one of the 9 mandatory barangay-based institutions)

IMPORTANT NOTES FOR PHASE 9 (VALIDATION SERVICE):

1. Ten Sub-Indicators Structure:
   - 3.1.1: Organized BADAC with composition and committees
   - 3.1.2: Established Rehabilitation Referral Desk
   - 3.1.3: Organized House Clusters with HCL
   - 3.1.4: Organized BADAC Auxiliary Team (BAT)
   - 3.1.5: Formulated BADPA covering the current year
   - 3.1.6: Allocated substantial amount for anti-illegal drugs (OR logic)
   - 3.1.7: Organized at least 1 community-based IEC activity
   - 3.1.8: Submitted CIR to CADAC/MADAC (with document count)
   - 3.1.9: Implemented Community-Based Intervention for PWUDs
   - 3.1.10: Conducted at least 3 Monthly Meetings (with document count)

2. Input Fields Required:
   - Sub-indicators 3.1.1, 3.1.2, 3.1.3, 3.1.4: DATE input ("Date of approval")
   - Sub-indicator 3.1.8: NUMBER input (number of CIR transmittals submitted)
   - Sub-indicator 3.1.10: NUMBER input (number of BADAC monthly minutes submitted)

3. OR Logic:
   - Sub-indicator 3.1.6 has OR logic: Either "Approved BAO" OR "Copy of AIP"
   - Validation rule should be "ANY_ITEM_REQUIRED" for this sub-indicator

4. Year Dependency:
   - Implementation uses dynamic year placeholders (e.g., {CY_CURRENT_YEAR})
   - Year placeholders are resolved at runtime based on active assessment year configuration

5. Validation Workflow:
   - Validator checks each sub-indicator's requirements
   - Some require date inputs (approval dates)
   - Some require document counts (CIR transmittals, monthly minutes)
   - All ten sub-indicators must pass for overall indicator to pass
   - Final YES/NO determines BADAC functionality status

6. BBI Status Update:
   - Since this is a BBI indicator (is_bbi=True), passing this indicator means BADAC is "Functional"
   - Failing means BADAC is "Non-Functional"
"""

from app.indicators.base import (
    ChecklistItem,
    FieldNotes,
    FormNotes,
    Indicator,
    NoteItem,
    SubIndicator,
)

# Indicator 3.1: Functionality of the Barangay Anti-Drug Abuse Council (BADAC)
INDICATOR_3_1 = Indicator(
    code="3.1",
    name="Functionality of the Barangay Anti-Drug Abuse Council (BADAC)",
    governance_area_id=3,  # Safety, Peace and Order
    is_bbi=True,  # BADAC is a mandatory BBI
    sort_order=1,
    description="Functionality of the Barangay Anti-Drug Abuse Council (BADAC)",
    children=[
        # Sub-Indicator 3.1.1
        SubIndicator(
            code="3.1.1",
            name="Organized BADAC with its composition and appropriate committees (Committees on Operations and on Advocacy) compliant to DILG-DDB JMC No. 2018-01, covering {JAN_TO_OCT_CURRENT_YEAR}",
            upload_instructions=(
                "1. EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) creating the BADAC with its composition and appropriate committees"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_1_upload",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) creating the BADAC with its composition and appropriate committees",
                    mov_description="Verification that the EO/issuance creates BADAC with proper composition and committees",
                    item_type="checkbox",
                    required=False,
                    display_order=1,
                ),
                ChecklistItem(
                    id="3_1_1_date",
                    label="Date of approval",
                    mov_description="Please supply the required information:",
                    item_type="date_input",
                    required=True,
                    display_order=2,
                ),
            ],
            notes=FormNotes(
                title="Minimum Composition of the BADAC:",
                items=[
                    NoteItem(label="1.", text="Punong Barangay"),
                    NoteItem(label="2.", text="SBM"),
                    NoteItem(label="3.", text="SK Chairperson"),
                    NoteItem(label="4.", text="Public School Principal/Representative"),
                    NoteItem(label="5.", text="Chief Tanod/ Executive Officer"),
                    NoteItem(label="6.", text="At least 2 representatives of NGOs/CSOs"),
                    NoteItem(label="7.", text="Representative of Faith-Based Organization"),
                    NoteItem(label="8.", text="C/M Chief of Police or Representative"),
                    NoteItem(text=" "),
                    NoteItem(text="Minimum Composition of the BADAC Committees:"),
                    NoteItem(label="A.", text="Committee on Operations"),
                    NoteItem(label="   1.", text="SBM"),
                    NoteItem(label="   2.", text="Executive Officer/Chief Tanod"),
                    NoteItem(label="   3.", text="BADAC Auxiliary Team (BAT)"),
                    NoteItem(text=" "),
                    NoteItem(label="B.", text="Committee on Advocacy"),
                    NoteItem(label="   1.", text="SBM"),
                    NoteItem(label="   2.", text="SK Chairperson"),
                    NoteItem(label="   3.", text="Public School Principal/Representative"),
                    NoteItem(label="   4.", text="At least 2 representatives of NGOs/CSOs"),
                    NoteItem(label="   5.", text="Representative of Faith-Based Organization"),
                ],
            ),
        ),
        # Sub-Indicator 3.1.2
        SubIndicator(
            code="3.1.2",
            name="Established Barangay Rehabilitation Referral Desk with Designated Barangay Duty Officer covering {CY_CURRENT_YEAR}",
            upload_instructions=(
                "Upload: EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) establishing the Rehabilitation Referral Desk\n\n"
                "Please supply the required information:\n"
                "Date of approval"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_2_a",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) establishing the Rehabilitation Referral Desk",
                    required=True,
                    requires_document_count=False,
                    display_order=1,
                ),
                ChecklistItem(
                    id="3_1_2_date",
                    label="Date of approval",
                    mov_description="Please supply the required information:",
                    item_type="date_input",
                    required=True,
                    display_order=2,
                ),
            ],
        ),
        # Sub-Indicator 3.1.3
        SubIndicator(
            code="3.1.3",
            name="Organization of House Clusters with designated House Cluster Leaders (HCL)",
            upload_instructions=(
                "Upload: EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs), organizing house clusters with designated HCL\n\n"
                "Please supply the required information:\n"
                "Date of approval"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_3_a",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs), organizing house clusters with designated HCL",
                    required=True,
                    requires_document_count=False,
                    display_order=1,
                ),
                ChecklistItem(
                    id="3_1_3_date",
                    label="Date of approval",
                    mov_description="Please supply the required information:",
                    item_type="date_input",
                    required=True,
                    display_order=2,
                ),
            ],
        ),
        # Sub-Indicator 3.1.4
        SubIndicator(
            code="3.1.4",
            name="Organization of BADAC Auxiliary Team (BAT)",
            upload_instructions=(
                "Upload: EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs), organizing BAT\n\n"
                "Please supply the required information:\n"
                "Date of approval"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_4_a",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs), organizing BAT",
                    required=True,
                    requires_document_count=False,
                    display_order=1,
                ),
                ChecklistItem(
                    id="3_1_4_date",
                    label="Date of approval",
                    mov_description="Please supply the required information:",
                    item_type="date_input",
                    required=True,
                    display_order=2,
                ),
            ],
        ),
        # Sub-Indicator 3.1.5
        SubIndicator(
            code="3.1.5",
            name="Plan: Formulation of BADAC Plan of Action (BADPA) covering {CY_CURRENT_YEAR}",
            upload_instructions=(
                "Upload: Copy of approved BADPA Summary covering {CY_CURRENT_YEAR} or copy of approved BPOPs Plan with BADPA"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_5_a",
                    label="Copy of approved BADPA Summary covering {CY_CURRENT_YEAR} or copy of approved BPOPs Plan with BADPA",
                    required=True,
                    requires_document_count=False,
                    display_order=1,
                ),
            ],
        ),
        # Sub-Indicator 3.1.6
        SubIndicator(
            code="3.1.6",
            name="Budget: Allocation of substantial amount for anti-illegal drugs initiative",
            upload_instructions=(
                "Upload ONE of the following (only 1 required):\n\n"
                "1. Approved Barangay Appropriation Ordinance signed by the PB, Barangay Secretary and SBMs\n"
                "2. Copy of Barangay Annual Investment Plan (AIP)\n\n"
                "Note: You only need to upload ONE option (either option 1 OR option 2)."
            ),
            validation_rule="OR_LOGIC_AT_LEAST_1_REQUIRED",  # OR logic: either BAO OR AIP
            checklist_items=[
                # Option 1
                ChecklistItem(
                    id="3_1_6_option_1",
                    label="Approved Barangay Appropriation Ordinance signed by the PB, Barangay Secretary and SBMs",
                    mov_description="Verification of Approved Barangay Appropriation Ordinance (Option 1)",
                    item_type="checkbox",
                    required=False,
                    display_order=1,
                ),
                # OR separator
                ChecklistItem(
                    id="3_1_6_or",
                    label="OR",
                    mov_description="OR",
                    item_type="info_text",
                    required=False,
                    display_order=2,
                ),
                # Option 2
                ChecklistItem(
                    id="3_1_6_option_2",
                    label="Copy of Barangay Annual Investment Plan (AIP)",
                    mov_description="Verification of Barangay Annual Investment Plan (Option 2)",
                    item_type="checkbox",
                    required=False,
                    display_order=3,
                ),
                # YES/NO assessment for allocated amount (ungrouped - always required)
                ChecklistItem(
                    id="3_1_6_assessment",
                    label="Has allocated substantial amount for anti-illegal drugs initiative",
                    mov_description="Assessment whether substantial amount is allocated for anti-illegal drugs initiative",
                    item_type="assessment_field",
                    required=False,
                    display_order=5,
                ),
            ],
        ),
        # Sub-Indicator 3.1.7
        SubIndicator(
            code="3.1.7",
            name="Implementation of Drug Abuse Prevention Advocacy Campaigns - Barangay organized at least 1 community-based IEC Activity during {CY_CURRENT_YEAR}",
            upload_instructions=(
                "Upload: Copy of Activity Report prepared by the BADAC covering {CY_CURRENT_YEAR}"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_7_a",
                    label="Copy of Activity Report prepared by the BADAC covering {CY_CURRENT_YEAR}",
                    required=True,
                    requires_document_count=False,
                    display_order=1,
                ),
            ],
        ),
        # Sub-Indicator 3.1.8
        SubIndicator(
            code="3.1.8",
            name="Implementation of Drug-Clearing Operations - Submission of Consolidated Information Report (CIR) to CADAC/MADAC and Local PNP Unit",
            upload_instructions=(
                "Upload the following documents:\n"
                "1. Three (3) Transmittals of CIR, covering the 1st to 3rd quarter, received by CADAC/MADAC and Local PNP Unit\n"
                "2. Certification on the submitted CIR signed by the CADAC/MADAC and Local PNP Unit\n\n"
                "Note: The CIR contains data protected by the Data Privacy Act of 2012, we recommend to submit the transmittal only.\n\n"
                "Please supply the required information:\n"
                "Number of CIR transmittals submitted"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_8_a",
                    label="Three (3) Transmittals of CIR, covering the 1st to 3rd quarter, received by CADAC/MADAC and Local PNP Unit",
                    required=True,
                    requires_document_count=False,
                    display_order=1,
                    field_notes=FieldNotes(
                        title="Note:",
                        items=[
                            NoteItem(
                                text="The CIR contains data protected by the Data Privacy Act of 2012. Hence, we recommend submitting only the transmittal."
                            )
                        ],
                    ),
                ),
                ChecklistItem(
                    id="3_1_8_count",
                    label="Number of CIR transmittals submitted",
                    mov_description="Please supply the number of documents submitted:",
                    item_type="document_count",
                    required=True,
                    display_order=2,
                ),
                ChecklistItem(
                    id="3_1_8_b",
                    label="Certification on the submitted CIR signed by the CADAC/MADAC and Local PNP Unit",
                    required=True,
                    requires_document_count=False,
                    display_order=3,
                ),
            ],
            notes=FormNotes(
                title="Note:",
                items=[
                    NoteItem(
                        text="Drug-unaffected barangays shall also submit updated CIR, stating in the report that there is absence of illegal drug-related activities in the barangays. The same applies to drug-free and drug-cleared barangays."
                    ),
                ],
            ),
        ),
        # Sub-Indicator 3.1.9
        SubIndicator(
            code="3.1.9",
            name="Implementation of Community-Based Intervention for Person Who Used Drugs (PWUDS) - Presence of referral system",
            upload_instructions=(
                "Upload: Accomplished BADAC Form 4- Unified Barangay Report on Referral Action (UBRA)"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_9_a",
                    label="Accomplished BADAC Form 4- Unified Barangay Report on Referral Action (UBRA)",
                    required=True,
                    requires_document_count=False,
                    display_order=1,
                ),
            ],
        ),
        # Sub-Indicator 3.1.10
        SubIndicator(
            code="3.1.10",
            name="Conduct of Monthly Meetings covering {CY_CURRENT_YEAR}",
            upload_instructions=(
                "Upload: Copy of the BADAC monthly minutes of the meeting with attendance sheets (at least 3 minutes) covering {CY_CURRENT_YEAR}\n\n"
                "Please supply the required information:\n"
                "Number of BADAC monthly minutes submitted"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_10_a",
                    label="Copy of the BADAC monthly minutes of the meeting with attendance sheets (at least 3 minutes) covering {CY_CURRENT_YEAR}",
                    required=True,
                    requires_document_count=False,
                    display_order=1,
                ),
                ChecklistItem(
                    id="3_1_10_count",
                    label="Number of BADAC monthly minutes submitted",
                    mov_description="Please supply the number of documents submitted:",
                    item_type="document_count",
                    required=True,
                    display_order=2,
                ),
            ],
        ),
    ],
)
