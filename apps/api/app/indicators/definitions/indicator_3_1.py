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
                "Upload documentation of BADAC organization with proper composition and committees:\\n\\n"
                "REQUIRED DOCUMENT:\\n"
                "- EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs)\\n"
                "- Must create the BADAC with its composition and appropriate committees\\n"
                "- Must cover January to October 2023\\n\\n"
                "BADAC COMPOSITION REQUIREMENTS:\\n"
                "Minimum Composition of the BADAC:\\n"
                "1. Punong Barangay\\n"
                "2. SBM\\n"
                "3. SK Chairperson\\n"
                "4. Public School Principal/Representative\\n"
                "5. Chief Tanod/ Executive Officer\\n"
                "6. At least 2 representatives of NGOs/CSOs\\n"
                "7. Representative of Faith-Based Organization\\n"
                "8. C/M Chief of Police or Representative\\n\\n"
                "Minimum Composition of BADAC Committees:\\n"
                "A. Committee on Operations\\n"
                "   1. SBM\\n"
                "   2. Executive Officer/Chief Tanod\\n"
                "   3. BADAC Auxiliary Team (BAT)\\n\\n"
                "B. Committee on Advocacy\\n"
                "   1. SBM\\n"
                "   2. SK Chairperson\\n"
                "   3. Public School Principal/Representative\\n"
                "   4. At least 2 representatives of NGOs/CSOs\\n"
                "   5. Representative of Faith-Based Organization\\n\\n"
                "IMPORTANT:\\n"
                "- The EO/resolution must be signed by the Punong Barangay\\n"
                "- Document must show both BADAC composition and committee structure\\n"
                "- Must be compliant to DILG-DDB JMC No. 2018-01"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_1_a",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) creating the BADAC with its composition and appropriate committees, covering January to October 2023",
                    mov_description=(
                        "Verify the following:\\n\\n"
                        "1. DOCUMENT PRESENCE:\\n"
                        "   - EO, resolution, or ordinance is present\\n"
                        "   - Properly signed by Punong Barangay, Barangay Secretary, and SBMs\\n\\n"
                        "2. DATE INPUT REQUIRED:\\n"
                        "   - Validator must input the DATE OF APPROVAL\\n"
                        "   - This is a required input field\\n\\n"
                        "3. BADAC COMPOSITION VERIFICATION:\\n"
                        "   - Document creates BADAC with proper composition\\n"
                        "   - Must include all minimum members listed above\\n"
                        "   - Punong Barangay, SBM, SK Chairperson, etc.\\n\\n"
                        "4. COMMITTEE STRUCTURE VERIFICATION:\\n"
                        "   - Document establishes appropriate committees\\n"
                        "   - Committee on Operations (with proper composition)\\n"
                        "   - Committee on Advocacy (with proper composition)\\n\\n"
                        "5. COVERAGE PERIOD:\\n"
                        "   - Must cover January to October 2023\\n"
                        "   - Verify the coverage period in the document\\n\\n"
                        "6. COMPLIANCE CHECK:\\n"
                        "   - Must be compliant to DILG-DDB JMC No. 2018-01\\n"
                        "   - Composition and committees follow the JMC guidelines"
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 3.1.2
        SubIndicator(
            code="3.1.2",
            name="Established Barangay Rehabilitation Referral Desk with Designated Barangay Duty Officer",
            upload_instructions=(
                "Upload documentation of the establishment of Barangay Rehabilitation Referral Desk:\\n\\n"
                "REQUIRED DOCUMENT:\\n"
                "- EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs)\\n"
                "- Must establish the Rehabilitation Referral Desk\\n"
                "- Must designate a Barangay Duty Officer\\n"
                "- Must cover CY 2023\\n\\n"
                "IMPORTANT:\\n"
                "- The EO/resolution must be signed by the Punong Barangay\\n"
                "- Document must clearly establish the Referral Desk\\n"
                "- Document must designate the Duty Officer"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_2_a",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) establishing the Rehabilitation Referral Desk covering CY 2023",
                    mov_description=(
                        "Verify the following:\\n\\n"
                        "1. DOCUMENT PRESENCE:\\n"
                        "   - EO, resolution, or ordinance is present\\n"
                        "   - Properly signed by Punong Barangay, Barangay Secretary, and SBMs\\n\\n"
                        "2. DATE INPUT REQUIRED:\\n"
                        "   - Validator must input the DATE OF APPROVAL\\n"
                        "   - This is a required input field\\n\\n"
                        "3. ESTABLISHMENT VERIFICATION:\\n"
                        "   - Document establishes the Barangay Rehabilitation Referral Desk\\n"
                        "   - Includes designation of Barangay Duty Officer\\n\\n"
                        "4. COVERAGE PERIOD:\\n"
                        "   - Must cover CY 2023\\n"
                        "   - Verify the coverage period in the document"
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 3.1.3
        SubIndicator(
            code="3.1.3",
            name="Organization of House Clusters with designated House Cluster Leaders (HCL)",
            upload_instructions=(
                "Upload documentation of House Clusters organization with designated HCLs:\\n\\n"
                "REQUIRED DOCUMENT:\\n"
                "- EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs)\\n"
                "- Must organize house clusters\\n"
                "- Must designate House Cluster Leaders (HCL)\\n\\n"
                "IMPORTANT:\\n"
                "- The EO/resolution must be signed by the Punong Barangay\\n"
                "- Document must show house cluster organization\\n"
                "- Document must designate specific HCLs"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_3_a",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs), organizing house clusters with designated HCL",
                    mov_description=(
                        "Verify the following:\\n\\n"
                        "1. DOCUMENT PRESENCE:\\n"
                        "   - EO, resolution, or ordinance is present\\n"
                        "   - Properly signed by Punong Barangay, Barangay Secretary, and SBMs\\n\\n"
                        "2. DATE INPUT REQUIRED:\\n"
                        "   - Validator must input the DATE OF APPROVAL\\n"
                        "   - This is a required input field\\n\\n"
                        "3. HOUSE CLUSTER ORGANIZATION:\\n"
                        "   - Document organizes house clusters in the barangay\\n"
                        "   - Shows clear structure of house clusters\\n\\n"
                        "4. HCL DESIGNATION:\\n"
                        "   - Document designates House Cluster Leaders\\n"
                        "   - Each house cluster has a designated leader"
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 3.1.4
        SubIndicator(
            code="3.1.4",
            name="Organization of BADAC Auxiliary Team (BAT)",
            upload_instructions=(
                "Upload documentation of BADAC Auxiliary Team organization:\\n\\n"
                "REQUIRED DOCUMENT:\\n"
                "- EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs)\\n"
                "- Must organize the BADAC Auxiliary Team (BAT)\\n\\n"
                "IMPORTANT:\\n"
                "- The EO/resolution must be signed by the Punong Barangay\\n"
                "- Document must show BAT organization"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_4_a",
                    label="EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs), organizing BAT",
                    mov_description=(
                        "Verify the following:\\n\\n"
                        "1. DOCUMENT PRESENCE:\\n"
                        "   - EO, resolution, or ordinance is present\\n"
                        "   - Properly signed by Punong Barangay, Barangay Secretary, and SBMs\\n\\n"
                        "2. DATE INPUT REQUIRED:\\n"
                        "   - Validator must input the DATE OF APPROVAL\\n"
                        "   - This is a required input field\\n\\n"
                        "3. BAT ORGANIZATION:\\n"
                        "   - Document organizes BADAC Auxiliary Team (BAT)\\n"
                        "   - Shows composition and structure of BAT"
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),

        # Sub-Indicator 3.1.5
        SubIndicator(
            code="3.1.5",
            name="Plan: Formulation of BADAC Plan of Action (BADPA) covering CY 2023",
            upload_instructions=(
                "Upload the BADAC Plan of Action (BADPA) for CY 2023:\\n\\n"
                "REQUIRED DOCUMENT:\\n"
                "- Copy of approved BADPA Summary, OR\\n"
                "- Copy of approved BPOPs Plan with BADPA covering CY 2023\\n\\n"
                "IMPORTANT:\\n"
                "- Either document format is acceptable\\n"
                "- Plan must be approved\\n"
                "- Must cover CY 2023"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_5_a",
                    label="Copy of approved BADPA Summary or copy of approved BPOPs Plan with BADPA covering CY 2023",
                    mov_description=(
                        "Verify the following:\\n\\n"
                        "1. DOCUMENT PRESENCE:\\n"
                        "   - BADPA Summary is present, OR\\n"
                        "   - BPOPs Plan with BADPA is present\\n\\n"
                        "2. APPROVAL STATUS:\\n"
                        "   - Document is approved (has approval signature/marking)\\n\\n"
                        "3. COVERAGE PERIOD:\\n"
                        "   - Plan covers CY 2023\\n"
                        "   - Verify the coverage period in the document\\n\\n"
                        "4. CONTENT VERIFICATION:\\n"
                        "   - Plan includes BADAC activities and objectives\\n"
                        "   - Shows planned actions for anti-drug abuse initiatives"
                    ),
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
                "Upload budget documentation showing allocation for anti-illegal drugs initiative:\\n\\n"
                "ACCEPTABLE DOCUMENTS (choose one):\\n"
                "- Approved Barangay Appropriation Ordinance signed by the PB, Barangay Secretary and SBMs, OR\\n"
                "- Copy of Barangay Annual Investment Plan (AIP)\\n\\n"
                "REQUIREMENTS:\\n"
                "- Document must show allocation of substantial amount for anti-illegal drugs initiative\\n"
                "- If using BAO: must be approved and properly signed\\n"
                "- If using AIP: must show budget allocation for anti-drug programs\\n\\n"
                "IMPORTANT:\\n"
                "- Either document is acceptable (OR logic)\\n"
                "- Must demonstrate substantial budget allocation"
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # OR logic: either BAO OR AIP
            checklist_items=[
                ChecklistItem(
                    id="3_1_6_a",
                    label="Approved Barangay Appropriation Ordinance signed by the PB, Barangay Secretary and SBMs",
                    mov_description=(
                        "Verify the following:\\n\\n"
                        "1. DOCUMENT PRESENCE:\\n"
                        "   - Barangay Appropriation Ordinance is present\\n\\n"
                        "2. APPROVAL AND SIGNATURES:\\n"
                        "   - Document is approved\\n"
                        "   - Signed by Punong Barangay, Barangay Secretary, and SBMs\\n\\n"
                        "3. BUDGET ALLOCATION:\\n"
                        "   - Shows allocation of substantial amount for anti-illegal drugs initiative\\n"
                        "   - Amount is clearly indicated in the ordinance\\n\\n"
                        "NOTE: This is an OR requirement with item 3_1_6_b.\\n"
                        "Either this document OR the AIP is acceptable."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="3_1_6_b",
                    label="Copy of Barangay Annual Investment Plan (AIP)",
                    mov_description=(
                        "Verify the following:\\n\\n"
                        "1. DOCUMENT PRESENCE:\\n"
                        "   - Barangay Annual Investment Plan (AIP) is present\\n\\n"
                        "2. BUDGET ALLOCATION:\\n"
                        "   - AIP shows allocation for anti-illegal drugs initiative\\n"
                        "   - Amount is clearly indicated\\n"
                        "   - Allocation is substantial\\n\\n"
                        "NOTE: This is an OR requirement with item 3_1_6_a.\\n"
                        "Either the BAO OR this document is acceptable."
                    ),
                    required=True,
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
                "Upload documentation of Drug Abuse Prevention Advocacy Campaign:\\n\\n"
                "REQUIRED DOCUMENT:\\n"
                "- Copy of Activity Report prepared by the BADAC\\n\\n"
                "REQUIREMENTS:\\n"
                "- Report must show at least 1 community-based IEC Activity\\n"
                "- Activity must have been conducted during CY 2023\\n"
                "- Report must be prepared by BADAC\\n\\n"
                "ACCEPTABLE IEC ACTIVITIES:\\n"
                "- Information campaigns\\n"
                "- Education seminars\\n"
                "- Communication activities\\n"
                "- Community awareness programs\\n"
                "- Other drug abuse prevention advocacy campaigns"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_7_a",
                    label="Copy of Activity Report prepared by the BADAC",
                    mov_description=(
                        "Verify the following:\\n\\n"
                        "1. DOCUMENT PRESENCE:\\n"
                        "   - Activity Report is present\\n"
                        "   - Report is prepared by BADAC\\n\\n"
                        "2. ACTIVITY VERIFICATION:\\n"
                        "   - Report documents at least 1 community-based IEC Activity\\n"
                        "   - Activity is related to drug abuse prevention advocacy\\n\\n"
                        "3. TIMING:\\n"
                        "   - Activity was conducted during CY 2023\\n"
                        "   - Date of activity is clearly indicated\\n\\n"
                        "4. CONTENT:\\n"
                        "   - Report shows details of the IEC activity\\n"
                        "   - Includes participants, venue, topics covered, etc."
                    ),
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
                "Upload documentation of Drug-Clearing Operations - CIR submission:\\n\\n"
                "REQUIRED DOCUMENTS:\\n"
                "1. Three (3) Transmittals of CIR, covering the 1st to 3rd quarter, received by CADAC/MADAC and Local PNP Unit\\n"
                "2. Certification on the submitted CIR signed by the CADAC/MADAC and Local PNP Unit\\n\\n"
                "IMPORTANT NOTES:\\n"
                "- Must submit transmittals for all 3 quarters (1st, 2nd, 3rd)\\n"
                "- Transmittals must be received by both CADAC/MADAC AND Local PNP Unit\\n"
                "- Certification must be signed by CADAC/MADAC and Local PNP Unit\\n"
                "- The CIR contains data protected by the Data Privacy Act of 2012\\n"
                "- We recommend submitting only the transmittal (not full CIR content)\\n\\n"
                "NOTE FOR DRUG-UNAFFECTED BARANGAYS:\\n"
                "- Drug-unaffected barangays shall also submit updated CIR\\n"
                "- State in the report that there is absence of illegal drug-related activities\\n"
                "- This applies to drug-free and drug-cleared barangays"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_8_a",
                    label="Three (3) Transmittals of CIR, covering the 1st to 3rd quarter, received by CADAC/MADAC and Local PNP Unit",
                    mov_description=(
                        "Verify the following:\\n\\n"
                        "1. DOCUMENT COUNT INPUT REQUIRED:\\n"
                        "   - Validator must input the NUMBER OF CIR TRANSMITTALS SUBMITTED\\n"
                        "   - This is a required input field\\n"
                        "   - Expected: 3 transmittals (one per quarter)\\n\\n"
                        "2. DOCUMENT PRESENCE:\\n"
                        "   - Three (3) transmittals of CIR are present\\n"
                        "   - Covering 1st quarter, 2nd quarter, and 3rd quarter\\n\\n"
                        "3. RECEIPT VERIFICATION:\\n"
                        "   - Transmittals show they were received by CADAC/MADAC\\n"
                        "   - Transmittals show they were received by Local PNP Unit\\n"
                        "   - Receipt stamps or acknowledgments are visible\\n\\n"
                        "4. COVERAGE:\\n"
                        "   - All three quarters are covered (Q1, Q2, Q3)\\n"
                        "   - Each transmittal corresponds to its respective quarter"
                    ),
                    required=True,
                    requires_document_count=True,  # Requires count input
                    display_order=1
                ),
                ChecklistItem(
                    id="3_1_8_b",
                    label="Certification on the submitted CIR signed by the CADAC/MADAC and Local PNP Unit",
                    mov_description=(
                        "Verify the following:\\n\\n"
                        "1. DOCUMENT PRESENCE:\\n"
                        "   - Certification is present\\n\\n"
                        "2. SIGNATURE VERIFICATION:\\n"
                        "   - Certification is signed by CADAC/MADAC\\n"
                        "   - Certification is signed by Local PNP Unit\\n"
                        "   - Both signatures are present\\n\\n"
                        "3. CONTENT VERIFICATION:\\n"
                        "   - Certification confirms the CIR submissions\\n"
                        "   - References the submitted CIR reports"
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=2
                ),
            ]
        ),

        # Sub-Indicator 3.1.9
        SubIndicator(
            code="3.1.9",
            name="Implementation of Community-Based Intervention for Person Who Used Drugs (PWUDS) - Presence of referral system",
            upload_instructions=(
                "Upload documentation of Community-Based Intervention for PWUDs:\\n\\n"
                "REQUIRED DOCUMENT:\\n"
                "- Accomplished BADAC Form 4- Unified Barangay Report on Referral Action (UBRA)\\n\\n"
                "REQUIREMENTS:\\n"
                "- Form must be accomplished/completed\\n"
                "- Shows referral system for Persons Who Used Drugs (PWUDs)\\n"
                "- Documents community-based intervention efforts\\n\\n"
                "IMPORTANT:\\n"
                "- This form demonstrates the presence of a referral system\\n"
                "- Must show actual referral actions taken"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_9_a",
                    label="Accomplished BADAC Form 4- Unified Barangay Report on Referral Action (UBRA)",
                    mov_description=(
                        "Verify the following:\\n\\n"
                        "1. DOCUMENT PRESENCE:\\n"
                        "   - BADAC Form 4 (UBRA) is present\\n\\n"
                        "2. ACCOMPLISHED STATUS:\\n"
                        "   - Form is properly accomplished/completed\\n"
                        "   - All required sections are filled out\\n\\n"
                        "3. REFERRAL SYSTEM VERIFICATION:\\n"
                        "   - Form shows evidence of referral system\\n"
                        "   - Documents referral actions for PWUDs\\n"
                        "   - Shows community-based intervention activities\\n\\n"
                        "4. CONTENT CHECK:\\n"
                        "   - Form includes details of referred PWUDs\\n"
                        "   - Shows actions taken for each referral"
                    ),
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
                "Upload documentation of BADAC monthly meetings:\\n\\n"
                "REQUIRED DOCUMENTS:\\n"
                "- Copy of the BADAC monthly minutes of the meeting with attendance sheets\\n"
                "- Must cover at least 3 minutes for CY 2023\\n\\n"
                "REQUIREMENTS:\\n"
                "- Minimum of 3 monthly meeting minutes required\\n"
                "- Each meeting must have attendance sheets\\n"
                "- Meetings must have been conducted during CY 2023\\n\\n"
                "IMPORTANT:\\n"
                "- Submit at least 3 sets of meeting minutes\\n"
                "- Each set must include attendance sheets"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="3_1_10_a",
                    label="Copy of the BADAC monthly minutes of the meeting with attendance sheets (at least 3 minutes covering CY 2023)",
                    mov_description=(
                        "Verify the following:\\n\\n"
                        "1. DOCUMENT COUNT INPUT REQUIRED:\\n"
                        "   - Validator must input the NUMBER OF BADAC MONTHLY MINUTES SUBMITTED\\n"
                        "   - This is a required input field\\n"
                        "   - Minimum required: 3 minutes\\n\\n"
                        "2. DOCUMENT PRESENCE:\\n"
                        "   - At least 3 sets of BADAC monthly meeting minutes are present\\n\\n"
                        "3. ATTENDANCE SHEETS:\\n"
                        "   - Each meeting minute includes attendance sheets\\n"
                        "   - Attendance is properly documented\\n\\n"
                        "4. COVERAGE PERIOD:\\n"
                        "   - Meetings were conducted during CY 2023\\n"
                        "   - Dates of meetings are clearly indicated\\n\\n"
                        "5. CONTENT VERIFICATION:\\n"
                        "   - Minutes document BADAC meeting proceedings\\n"
                        "   - Include agenda, discussions, decisions made\\n"
                        "   - Properly formatted as official meeting minutes"
                    ),
                    required=True,
                    requires_document_count=True,  # Requires count input
                    display_order=1
                ),
            ]
        ),
    ]
)
