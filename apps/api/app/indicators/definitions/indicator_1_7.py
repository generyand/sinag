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

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 1.7: Conduct of Barangay Assembly
INDICATOR_1_7 = Indicator(
    code="1.7",
    name="Conduct of Barangay Assembly",
    governance_area_id=1,  # Financial Administration and Sustainability
    is_bbi=False,  # Barangay Assembly is NOT a BBI - it's a governance activity
    sort_order=7,
    description="Conducted the 1st and 2nd semester Barangay Assembly for CY 2024",
    children=[
        # Sub-Indicator 1.7.1
        SubIndicator(
            code="1.7.1",
            name="Conducted the 1st and 2nd semester Barangay Assembly for CY 2024",
            upload_instructions=(
                "Upload documentation of the Barangay Assemblies conducted in CY 2024:\n\n"
                "REQUIREMENTS:\n"
                "1. BOTH 1st semester AND 2nd semester assemblies must be documented\n"
                "   - 1st semester: January to June 2024\n"
                "   - 2nd semester: July to December 2024\n\n"
                "2. Acceptable document types (choose one format):\n"
                "   - Post Activity Report of the Barangay Assembly, OR\n"
                "   - Minutes of the Barangay Assembly\n\n"
                "3. Document(s) must be duly approved by the Punong Barangay\n"
                "   - Signature or approval mark must be visible\n\n"
                "4. Submission format (choose one):\n"
                "   - Option A: Upload 2 separate documents (one per semester)\n"
                "   - Option B: Upload 1 consolidated report covering both semesters\n\n"
                "5. Each assembly documentation should include:\n"
                "   - Date and venue of the assembly\n"
                "   - Attendance list of barangay residents\n"
                "   - Assembly agenda and topics discussed\n"
                "   - Resolutions or decisions made\n"
                "   - Evidence of actual assembly conduct\n"
                "   - Punong Barangay approval/signature"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="1_7_1_a",
                    label="Post Activity Report/ Minutes on the conduct of the 1st and 2nd semester Barangay Assembly 2024 duly approved by the Punong Barangay",
                    mov_description=(
                        "Verify the following:\n\n"
                        "1. DOCUMENTATION PRESENCE:\n"
                        "   - Post Activity Report OR Minutes is present\n"
                        "   - BOTH 1st semester (Jan-Jun 2024) AND 2nd semester (Jul-Dec 2024) are covered\n"
                        "   - May be submitted as 2 separate documents OR 1 consolidated report\n\n"
                        "2. APPROVAL VERIFICATION:\n"
                        "   - Document(s) are duly approved by the Punong Barangay\n"
                        "   - Signature or approval mark is clearly visible\n\n"
                        "3. CONTENT VERIFICATION:\n"
                        "   - Check for date and venue of each assembly\n"
                        "   - Verify presence of attendance list\n"
                        "   - Confirm assembly agenda/topics are documented\n"
                        "   - Look for resolutions or decisions made\n"
                        "   - Assess evidence of legitimate assembly conduct\n\n"
                        "4. COMPLETENESS CHECK:\n"
                        "   - If 2 separate documents: verify one for 1st semester, one for 2nd semester\n"
                        "   - If 1 consolidated report: verify it clearly covers both semesters\n"
                        "   - Ensure no semester is missing\n\n"
                        "NOTE: The final compliance determination should consider:\n"
                        "- Presence of documentation for BOTH semesters (critical requirement)\n"
                        "- Proper approval by Punong Barangay\n"
                        "- Evidence that assemblies were legitimately conducted (not just formalities)"
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),
    ]
)
