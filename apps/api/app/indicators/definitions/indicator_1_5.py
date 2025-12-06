"""
Indicator 1.5: Posting of the Barangay Citizens' Charter (CitCha)

Governance Area: 1 (Financial Administration and Sustainability)
BBI Status: No (CitCha posting is a transparency requirement, NOT a barangay-based institution)

IMPORTANT NOTES FOR PHASE 9 (VALIDATION SERVICE):
1. Photo Documentation Requirements:
   - Exactly TWO (2) photos required
   - Photo 1: Distant view showing the posting location
   - Photo 2: Close-up view showing the CitCha content
   - Barangay name MUST be visible in the photos

2. Conspicuous Place Verification:
   - Validators must verify the CitCha is posted at a conspicuous public location
   - Acceptable locations include:
     * Barangay hall
     * Market
     * Transport terminal
     * Multi-purpose hall
     * Other high-traffic public areas

3. Photo Quality Standards:
   - Photos must clearly show the CitCha posting
   - Barangay name must be legible
   - Distant view should show context (surrounding area, posting location)
   - Close-up view should show CitCha details (services, procedures, etc.)

4. Validation Workflow:
   - Validator verifies presence of 2 photos
   - Validator checks barangay name visibility
   - Validator confirms posting location is conspicuous/public
   - Validator verifies one distant view and one close-up view

5. Processing of Results:
   - The YES/NO question in the validator view ("Met all the minimum requirements...?")
     is the final determination based on:
     * Presence of 2 photos
     * Barangay name visible
     * Conspicuous location confirmed
     * Both distant and close-up views present
"""

from app.indicators.base import ChecklistItem, Indicator, SubIndicator

# Indicator 1.5: Posting of the Barangay Citizens' Charter (CitCha)
INDICATOR_1_5 = Indicator(
    code="1.5",
    name="Posting of the Barangay Citizens' Charter (CitCha)",
    governance_area_id=1,  # Financial Administration and Sustainability
    is_bbi=False,  # CitCha posting is NOT a BBI - it's a transparency requirement
    sort_order=5,
    description="Barangay Citizens' Charter posted at a conspicuous place",
    children=[
        # Sub-Indicator 1.5.1
        SubIndicator(
            code="1.5.1",
            name="Barangay Citizens' Charter posted at a conspicuous place (e.g. barangay hall, market, transport terminal, or multi-purpose hall)",
            upload_instructions=(
                "Upload Two (2) Photo documentation of the Barangay CitCha (name of the barangay should be visible):\n\n"
                "Photo requirements:\n"
                "• One (1) photo with Distant View; and\n"
                "• One (1) photo with Close-up View"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                # Upload Verification
                ChecklistItem(
                    id="1_5_1_upload_1",
                    label="Two (2) Photo documentation of the Barangay CitCha (name of the barangay should be visible)",
                    mov_description="Verification of uploaded photo documentation showing the Barangay Citizens' Charter posted at a conspicuous place with barangay name visible",
                    required=True,
                    display_order=1,
                ),
            ],
        ),
    ],
)
