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

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


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
                "Upload TWO (2) Photo Documentation of the Barangay Citizens' Charter:\n\n"
                "PHOTO REQUIREMENTS:\n"
                "1. Photo 1: DISTANT VIEW\n"
                "   - Shows the overall posting location and surrounding area\n"
                "   - Demonstrates the CitCha is posted at a conspicuous (easily visible) place\n"
                "   - Barangay name should be visible in the photo\n\n"
                "2. Photo 2: CLOSE-UP VIEW\n"
                "   - Shows the details of the Citizens' Charter content\n"
                "   - Must clearly show the services, procedures, or other CitCha information\n"
                "   - Barangay name should be visible in the photo\n\n"
                "ACCEPTABLE POSTING LOCATIONS:\n"
                "- Barangay hall (entrance, lobby, or public area)\n"
                "- Public market\n"
                "- Transport terminal\n"
                "- Multi-purpose hall\n"
                "- Other high-traffic public areas where residents can easily see it\n\n"
                "IMPORTANT REMINDERS:\n"
                "- Upload EXACTLY 2 photos (1 distant view + 1 close-up view)\n"
                "- Ensure barangay name is visible in both photos\n"
                "- Photos must be clear and legible\n"
                "- The posting location must be genuinely accessible to the public"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="1_5_1_a",
                    label="Two (2) Photo documentation of the Barangay CitCha (name of the barangay should be visible)",
                    mov_description=(
                        "Verify the following:\n"
                        "1. EXACTLY TWO (2) photos are submitted\n\n"
                        "2. Photo 1 - DISTANT VIEW:\n"
                        "   - Shows the overall posting location\n"
                        "   - Demonstrates the CitCha is at a conspicuous place\n"
                        "   - Context of surrounding area is visible\n\n"
                        "3. Photo 2 - CLOSE-UP VIEW:\n"
                        "   - Shows the details of the Citizens' Charter\n"
                        "   - Content is legible (services, procedures, etc.)\n\n"
                        "4. BARANGAY NAME VISIBILITY:\n"
                        "   - Barangay name is visible in the photos\n"
                        "   - Name can be on the CitCha itself, signage, or visible context\n\n"
                        "5. CONSPICUOUS LOCATION VERIFICATION:\n"
                        "   - Confirm the posting is at a public, high-traffic area\n"
                        "   - Acceptable locations: barangay hall, market, transport terminal,\n"
                        "     multi-purpose hall, or similar public spaces\n"
                        "   - The location should be accessible to barangay residents\n\n"
                        "NOTE: Both photos must meet all requirements for the indicator to pass.\n"
                        "If any requirement is missing, the submission does not meet the minimum requirements."
                    ),
                    required=True,
                    requires_document_count=False,
                    display_order=1
                ),
            ]
        ),
    ]
)
