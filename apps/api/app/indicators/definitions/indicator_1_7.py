"""
Indicator 1.7: Conduct of Barangay Assembly

Governance Area: 1 (Financial Administration and Sustainability)
BBI Status: No (Barangay Assembly is a governance activity, NOT a barangay-based institution)

IMPORTANT NOTES FOR PHASE 9 (VALIDATION SERVICE):

1. Year Dependency:
   - Current implementation uses CY 2024 (hardcoded)
   - MUST be updated for future assessment cycles (CY 2025, 2026, etc.)
   - Year appears in: indicator description, sub-indicator name, and checklist item label

2. Dual Semester Requirement:
   - This indicator requires BOTH 1st and 2nd semester assemblies for CY 2024
   - Rationale: GAR view (most authoritative source) specifies "1st and 2nd semester"
   - Note: Earlier BLGU/Validator views showed only "1st semester" for CY 2023
   - Decision: Follow the GAR view as the current standard

3. Documentation Flexibility:
   - Acceptable documents: Post Activity Report OR Minutes of the assembly
   - Either format is acceptable as long as it's duly approved by the Punong Barangay
   - May be submitted as:
     * 2 separate documents (one per semester)
     * 1 consolidated report covering both semesters

4. Required Elements in Documentation:
   - Attendance list of barangay residents
   - Assembly agenda and topics discussed
   - Resolutions or decisions made
   - Evidence of actual assembly conduct (date, venue, etc.)
   - Approval/signature of the Punong Barangay

5. Validation Workflow:
   - Validator verifies presence of assembly documentation
   - Check for BOTH 1st and 2nd semester coverage
   - Verify Punong Barangay approval/signature
   - Confirm assemblies were legitimately conducted
   - May need to verify 2 documents (one per semester) OR accept 1 consolidated report

6. Processing of Results:
   - The YES/NO question ("Met all the minimum requirements...?") determines final compliance
   - Based on:
     * Presence of documentation for BOTH semesters
     * Proper approval by Punong Barangay
     * Evidence of legitimate assembly conduct

7. Future Updates:
   - When updating to new assessment years (e.g., CY 2025):
     * Update indicator description
     * Update sub-indicator name
     * Update checklist item label
     * Update upload instructions
     * Update MOV description
   - Consider parameterizing the year in future refactoring
"""

from app.indicators.base import ChecklistItem, Indicator, SubIndicator

# Indicator 1.7: Conduct of Barangay Assembly
INDICATOR_1_7 = Indicator(
    code="1.7",
    name="Conduct of Barangay Assembly",
    governance_area_id=1,  # Financial Administration and Sustainability
    is_bbi=False,  # Barangay Assembly is NOT a BBI - it's a governance activity
    sort_order=7,
    description="Conducted the 1st semester Barangay Assembly",
    children=[
        # Sub-Indicator 1.7.1
        SubIndicator(
            code="1.7.1",
            name="Conducted the 1st semester Barangay Assembly",
            upload_instructions=(
                "Upload: Post Activity Report/ Minutes on the conduct of the 1st semester Barangay Assembly duly approved by the Punong Barangay"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Upload Verification
                ChecklistItem(
                    id="1_7_1_upload_1",
                    label="Post Activity Report/ Minutes on the conduct of the 1st semester Barangay Assembly duly approved by the Punong Barangay",
                    mov_description="Verification of uploaded Post Activity Report or Minutes of the 1st semester Barangay Assembly with approval from the Punong Barangay",
                    required=True,
                    display_order=1,
                ),
            ],
        ),
    ],
)
