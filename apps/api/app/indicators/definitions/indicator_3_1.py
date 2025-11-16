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
   - 3.1.5: Formulated BADPA covering CY 2023
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
   - Current implementation uses CY 2023 for BADPA, monthly meetings, IEC activity, etc.
   - Future assessments may need to update to CY 2024, CY 2025, etc.

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

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


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
            name="Organized BADAC with its composition and appropriate committees (Committees on Operations and on Advocacy) compliant to DILG-DDB JMC No. 2018-01",
            upload_instructions=(
                "Upload the following document:\n\n"
                "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) creating the BADAC with its composition and appropriate committees, covering January to October 2023\n\n"
                "The BADAC must include:\n"
                "- Minimum Composition: Punong Barangay, SBM, SK Chairperson, Public School Principal/Representative, Chief Tanod/Executive Officer, At least 2 representatives of NGOs/CSOs, Representative of Faith-Based Organization, C/M Chief of Police or Representative\n"
                "- Committee on Operations: SBM, Executive Officer/Chief Tanod, BADAC Auxiliary Team (BAT)\n"
                "- Committee on Advocacy: SBM, SK Chairperson, Public School Principal/Representative, At least 2 representatives of NGOs/CSOs, Representative of Faith-Based Organization\n\n"
                "Please also supply the required information:\n"
                "Date of approval"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_1_a",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) creating the BADAC with its composition and appropriate committees, covering January to October 2023",
                    mov_description="Verification that the EO/issuance creates BADAC with proper composition and committees",
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="3_1_1_comp_badac_pb",
                    label="Punong Barangay",
                    mov_description="Verify Punong Barangay is listed in BADAC composition",
                    required=True,
                    requires_document_count=False,
                    display_order=2
                ),
                ChecklistItem(
                    id="3_1_1_comp_badac_sbm",
                    label="SBM",
                    mov_description="Verify SBM is listed in BADAC composition",
                    required=True,
                    requires_document_count=False,
                    display_order=3
                ),
                ChecklistItem(
                    id="3_1_1_comp_badac_sk",
                    label="SK Chairperson",
                    mov_description="Verify SK Chairperson is listed in BADAC composition",
                    required=True,
                    requires_document_count=False,
                    display_order=4
                ),
                ChecklistItem(
                    id="3_1_1_comp_badac_school",
                    label="Public School Principal/Representative",
                    mov_description="Verify Public School Principal/Representative is listed in BADAC composition",
                    required=True,
                    requires_document_count=False,
                    display_order=5
                ),
                ChecklistItem(
                    id="3_1_1_comp_badac_tanod",
                    label="Chief Tanod/ Executive Officer",
                    mov_description="Verify Chief Tanod/Executive Officer is listed in BADAC composition",
                    required=True,
                    requires_document_count=False,
                    display_order=6
                ),
                ChecklistItem(
                    id="3_1_1_comp_badac_ngo",
                    label="At least 2 representatives of NGOs/CSOs",
                    mov_description="Verify at least 2 NGO/CSO representatives are listed in BADAC composition",
                    required=True,
                    requires_document_count=False,
                    display_order=7
                ),
                ChecklistItem(
                    id="3_1_1_comp_badac_faith",
                    label="Representative of Faith-Based Organization",
                    mov_description="Verify Faith-Based Organization representative is listed in BADAC composition",
                    required=True,
                    requires_document_count=False,
                    display_order=8
                ),
                ChecklistItem(
                    id="3_1_1_comp_badac_police",
                    label="C/M Chief of Police or Representative",
                    mov_description="Verify C/M Chief of Police or Representative is listed in BADAC composition",
                    required=True,
                    requires_document_count=False,
                    display_order=9
                ),
                ChecklistItem(
                    id="3_1_1_comm_ops_sbm",
                    label="SBM",
                    mov_description="Verify SBM is in Committee on Operations",
                    required=True,
                    requires_document_count=False,
                    display_order=10
                ),
                ChecklistItem(
                    id="3_1_1_comm_ops_exec",
                    label="Executive Officer/Chief Tanod",
                    mov_description="Verify Executive Officer/Chief Tanod is in Committee on Operations",
                    required=True,
                    requires_document_count=False,
                    display_order=11
                ),
                ChecklistItem(
                    id="3_1_1_comm_ops_bat",
                    label="BADAC Auxiliary Team (BAT)",
                    mov_description="Verify BADAC Auxiliary Team (BAT) is in Committee on Operations",
                    required=True,
                    requires_document_count=False,
                    display_order=12
                ),
                ChecklistItem(
                    id="3_1_1_comm_adv_sbm",
                    label="SBM",
                    mov_description="Verify SBM is in Committee on Advocacy",
                    required=True,
                    requires_document_count=False,
                    display_order=13
                ),
                ChecklistItem(
                    id="3_1_1_comm_adv_sk",
                    label="SK Chairperson",
                    mov_description="Verify SK Chairperson is in Committee on Advocacy",
                    required=True,
                    requires_document_count=False,
                    display_order=14
                ),
                ChecklistItem(
                    id="3_1_1_comm_adv_school",
                    label="Public School Principal/Representative",
                    mov_description="Verify Public School Principal/Representative is in Committee on Advocacy",
                    required=True,
                    requires_document_count=False,
                    display_order=15
                ),
                ChecklistItem(
                    id="3_1_1_comm_adv_ngo",
                    label="At least 2 representatives of NGOs/CSOs",
                    mov_description="Verify at least 2 NGO/CSO representatives are in Committee on Advocacy",
                    required=True,
                    requires_document_count=False,
                    display_order=16
                ),
                ChecklistItem(
                    id="3_1_1_comm_adv_faith",
                    label="Representative of Faith-Based Organization",
                    mov_description="Verify Faith-Based Organization representative is in Committee on Advocacy",
                    required=True,
                    requires_document_count=False,
                    display_order=17
                ),
                ChecklistItem(
                    id="3_1_1_date",
                    label="Date of approval",
                    mov_description="Date when the EO/issuance was approved",
                    required=True,
                    requires_document_count=True,  # Date input field
                    display_order=18
                ),
            ]
        ),

        # Sub-Indicator 3.1.2
        SubIndicator(
            code="3.1.2",
            name="Established Barangay Rehabilitation Referral Desk with Designated Barangay Duty Officer",
            upload_instructions=(
                "Upload: EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) establishing the Rehabilitation Referral Desk covering CY 2023\n\n"
                "Please supply the required information:\n"
                "Date of approval"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_2_a",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) establishing the Rehabilitation Referral Desk covering CY 2023",
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="3_1_2_date",
                    label="Date of approval",
                    required=True,
                    requires_document_count=True,  # Date input field
                    display_order=2
                ),
            ]
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
                    display_order=1
                ),
                ChecklistItem(
                    id="3_1_3_date",
                    label="Date of approval",
                    required=True,
                    requires_document_count=True,  # Date input field
                    display_order=2
                ),
            ]
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
                    display_order=1
                ),
                ChecklistItem(
                    id="3_1_4_date",
                    label="Date of approval",
                    required=True,
                    requires_document_count=True,  # Date input field
                    display_order=2
                ),
            ]
        ),

        # Sub-Indicator 3.1.5
        SubIndicator(
            code="3.1.5",
            name="Plan: Formulation of BADAC Plan of Action (BADPA) covering CY 2023",
            upload_instructions=(
                "Upload: Copy of approved BADPA Summary or copy of approved BPOPs Plan with BADPA covering CY 2023"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_5_a",
                    label="Copy of approved BADPA Summary or copy of approved BPOPs Plan with BADPA covering CY 2023",
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
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
            validation_rule="ANY_ITEM_REQUIRED",  # OR logic: either BAO OR AIP
            checklist_items=[
                ChecklistItem(
                    id="3_1_6_a",
                    label="Approved Barangay Appropriation Ordinance signed by the PB, Barangay Secretary and SBMs",
                    mov_description="Verification of Approved Barangay Appropriation Ordinance (Option 1)",
                    required=False,  # OR logic - only one is required
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="3_1_6_b",
                    label="Copy of Barangay Annual Investment Plan (AIP)",
                    mov_description="Verification of Barangay Annual Investment Plan (Option 2)",
                    required=False,  # OR logic - only one is required
                    requires_document_count=False,
                    display_order=2
                ),
            ]
        ),

        # Sub-Indicator 3.1.7
        SubIndicator(
            code="3.1.7",
            name="Implementation of Drug Abuse Prevention Advocacy Campaigns - Barangay organized at least 1 community-based IEC Activity during CY 2023",
            upload_instructions=(
                "Upload: Copy of Activity Report prepared by the BADAC"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_7_a",
                    label="Copy of Activity Report prepared by the BADAC",
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
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
                    display_order=1
                ),
                ChecklistItem(
                    id="3_1_8_b",
                    label="Certification on the submitted CIR signed by the CADAC/MADAC and Local PNP Unit",
                    required=True,
                    requires_document_count=False,
                    display_order=2
                ),
                ChecklistItem(
                    id="3_1_8_count",
                    label="Number of CIR transmittals submitted",
                    required=True,
                    requires_document_count=True,  # Number input field
                    display_order=3
                ),
            ]
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
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 3.1.10
        SubIndicator(
            code="3.1.10",
            name="Conduct of Monthly Meetings",
            upload_instructions=(
                "Upload: Copy of the BADAC monthly minutes of the meeting with attendance sheets (at least 3 minutes covering CY 2023)\n\n"
                "Please supply the required information:\n"
                "Number of BADAC monthly minutes submitted"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_10_a",
                    label="Copy of the BADAC monthly minutes of the meeting with attendance sheets (at least 3 minutes covering CY 2023)",
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="3_1_10_count",
                    label="Number of BADAC monthly minutes submitted",
                    required=True,
                    requires_document_count=True,  # Number input field
                    display_order=2
                ),
            ]
        ),
    ]
)
