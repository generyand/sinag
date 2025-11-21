"""
Indicator 1.3: Approval of the Barangay Budget on the Specified Timeframe

Governance Area: 1 (Financial Administration and Sustainability)
BBI Status: No (Budget approval is a compliance requirement, NOT a barangay-based institution)

IMPORTANT NOTES FOR PHASE 9 (VALIDATION SERVICE):
1. Date Input Requirement:
   - Validators must input the "Date of Approval" from the Barangay Appropriation Ordinance
   - This date determines compliance with the deadline requirements
   - Primary deadline: December 31, 2022
   - Grace period (consideration): March 31, 2023

2. Grace Period Logic:
   - Ordinances approved on or before December 31, 2022 → Full compliance (PASSED)
   - Ordinances approved between January 1, 2023 and March 31, 2023 → Considered compliance (CONSIDERED)
   - Ordinances approved after March 31, 2023 → Non-compliance (FAILED)

3. Validation Workflow:
   - Validator verifies the presence of the Barangay Appropriation Ordinance
   - Validator checks all required signatories:
     * Sangguniang Barangay Members (SBMs)
     * SK Chairperson
     * Barangay Secretary
     * Punong Barangay
   - Validator inputs the Date of Approval
   - System automatically determines compliance based on the date

4. Processing of Results:
   - The YES/NO question in the validator view ("Met all the minimum requirements...?")
     is the final determination based on:
     * Presence of the ordinance
     * All required signatures
     * Approval date within acceptable timeframe (considering grace period)
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 1.3: Approval of the Barangay Budget on the Specified Timeframe
INDICATOR_1_3 = Indicator(
    code="1.3",
    name="Approval of the Barangay Budget on the Specified Timeframe",
    governance_area_id=1,  # Financial Administration and Sustainability
    is_bbi=False,  # Budget approval is NOT a BBI - it's a compliance requirement
    sort_order=3,
    description="Presence of a Barangay Appropriation Ordinance approved on or before December 31, 2022 (Consideration: Approval until March 31, 2023)",
    children=[
        # Sub-Indicator 1.3.1
        SubIndicator(
            code="1.3.1",
            name="Presence of a Barangay Appropriation Ordinance approved on or before December 31, 2022",
            upload_instructions=(
                "Upload: Approved Barangay Appropriation Ordinance signed by the Sangguniang Barangay Members (SBMs), SK Chairperson, Barangay Secretary, and Punong Barangay\n"
                "(Consideration: Approval until March 31, 2023)"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="1_3_1_a",
                    label="Approved Barangay Appropriation Ordinance signed by the Sangguniang Barangay Members (SBMs), SK Chairperson, Barangay Secretary, and Punong Barangay",
                    mov_description="Verify that the Barangay Appropriation Ordinance contains all required signatures",
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="1_3_1_date_approval",
                    label="Date of Approval",
                    mov_description=(
                        "Input the Date of Approval from the ordinance.\n"
                        "Primary deadline: On or before December 31, 2022\n"
                        "Grace period: Approval until March 31, 2023\n\n"
                        "Compliance determination:\n"
                        "- On or before Dec 31, 2022: PASSED\n"
                        "- Jan 1 - Mar 31, 2023: CONSIDERED\n"
                        "- After Mar 31, 2023: FAILED"
                    ),
                    required=True,
                    requires_document_count=True,  # Indicates this is a date/text input field
                    display_order=2
                ),
            ]
        ),
    ]
)
