"""
Indicator 1.6: Release of the Sangguniang Kabataan (SK) Funds by the Barangay

Governance Area: 1 (Financial Administration and Sustainability)
BBI Status: No (This is NOT a BBI)

Note: This indicator assesses compliance with the SK Reform Act of 2015 regarding
the release of SK funds and the presence of an approved ABYIP (Annual Barangay
Youth Investment Program).

HIERARCHICAL STRUCTURE:
1.6 Release of SK Funds
  ├─ 1.6.1 Compliance with Section 20 of SK Reform Act (OR logic - choose ONE option)
  │   ├─ OPTION 1: Has Barangay-SK Agreement (needs both a + b)
  │   ├─ OR
  │   ├─ OPTION 2: No agreement but has SK account (needs deposit slip)
  │   ├─ OR
  │   └─ OPTION 3: No SK Officials/quorum or no SK bank account (needs a OR b)
  └─ 1.6.2 Presence of Approved ABYIP
      ├─ Option A: If 5 or more SK Officials
      └─ Option B: If 4 or fewer SK Officials
"""

from app.indicators.base import (
    ChecklistItem,
    FieldNotes,
    FormNotes,
    Indicator,
    NoteItem,
    SubIndicator,
)

# Indicator 1.6: Release of SK Funds
INDICATOR_1_6 = Indicator(
    code="1.6",
    name="Release of the Sangguniang Kabataan (SK) Funds by the Barangay",
    governance_area_id=1,  # Financial Administration and Sustainability
    is_bbi=False,
    sort_order=6,
    description="Compliance with Section 20 of the SK Reform Act of 2015 and Item 3.2 of DBM-DILG-NYC JMC No. 1, s. 2019",
    children=[
        # === 1.6.1 Consolidated Indicator with OR logic (choose ONE of three options) ===
        SubIndicator(
            code="1.6.1",
            name="Compliance with Section 20 of the SK Reform Act of 2015 and Item 3.2 of DBM-DILG-NYC JMC No. 1, s. 2019 dated January 23, 2019",
            upload_instructions=(
                "Upload documents for ONE of the following options that applies to your barangay:\n\n"
                "OPTION 1: If barangay has Barangay-SK Agreement for release/deposit\n"
                "  - Copy of the written agreement, AND\n"
                "  - Proof of deposit reflecting Account No./Name and total SK funds\n\n"
                "OPTION 2: If barangay does NOT have Barangay-SK Agreement but has current account\n"
                "  - Deposit slips reflecting Account No./Name and total SK funds\n\n"
                "OPTION 3: If barangay does NOT have SK Officials, or has SK Officials but no quorum and/or no SK Bank Account\n"
                "  - Proof of transfer to trust fund, OR\n"
                "  - Legal forms from C/M treasurer if SK fund kept in C/M custody"
            ),
            validation_rule="ANY_OPTION_GROUP_REQUIRED",  # Any one complete option group satisfies the requirement
            checklist_items=[
                # === OPTION 1: Has Barangay-SK Agreement ===
                ChecklistItem(
                    id="1_6_1_opt1_header",
                    label="OPTION 1: The barangay has Barangay-SK Agreement for the release/deposit",
                    item_type="section_header",
                    required=False,
                    display_order=1,
                    option_group="Option 1",
                ),
                ChecklistItem(
                    id="1_6_1_opt1_a",
                    label="a) Copy of the written agreement",
                    mov_description="Copy of the written Barangay-SK Agreement",
                    required=False,  # Part of Option 1 group
                    display_order=2,
                    option_group="Option 1",
                ),
                ChecklistItem(
                    id="1_6_1_opt1_b",
                    label="b) Proof of deposit reflecting the Account No./Name of Barangay SK and the total allocated amount for the {CURRENT_YEAR} SK funds",
                    mov_description="Proof of deposit with Account No./Name and total SK funds amount",
                    required=False,  # Part of Option 1 group
                    display_order=3,
                    option_group="Option 1",
                    field_notes=FieldNotes(
                        title="CONSIDERATION:",
                        items=[
                            NoteItem(
                                text="In the absence of deposit slips, bank statements will be considered, provided that it shows the transaction date, and that the total 10% of the SK Fund has been transferred."
                            ),
                        ],
                    ),
                ),
                # === OR Separator between Option 1 and Option 2 ===
                ChecklistItem(
                    id="1_6_1_or_1",
                    label="OR",
                    item_type="info_text",
                    required=False,
                    display_order=4,
                ),
                # === OPTION 2: No Agreement but has current account ===
                ChecklistItem(
                    id="1_6_1_opt2_header",
                    label="OPTION 2: The barangay does not have Barangay-SK Agreement but with current account",
                    item_type="section_header",
                    required=False,
                    display_order=5,
                    option_group="Option 2",
                ),
                ChecklistItem(
                    id="1_6_1_opt2_deposit",
                    label="Deposit slips reflecting the Account No./Name of Barangay SK and the total allocated amount for the {CURRENT_YEAR} SK funds",
                    mov_description="Deposit slips with Account No./Name and total SK funds",
                    required=False,  # Part of Option 2 group
                    display_order=6,
                    option_group="Option 2",
                    field_notes=FieldNotes(
                        title="CONSIDERATION:",
                        items=[
                            NoteItem(
                                text="In the absence of deposit slips, bank statements will be considered, provided that it shows the transaction date, and that the total 10% of the SK Fund has been transferred."
                            ),
                        ],
                    ),
                ),
                # === OR Separator between Option 2 and Option 3 ===
                ChecklistItem(
                    id="1_6_1_or_2",
                    label="OR",
                    item_type="info_text",
                    required=False,
                    display_order=7,
                ),
                # === OPTION 3: No SK Officials / No Quorum / No SK Bank Account ===
                ChecklistItem(
                    id="1_6_1_opt3_header",
                    label="OPTION 3: The barangay does not have SK Officials or with SK Officials but no quorum and/or No SK Bank Account",
                    item_type="section_header",
                    required=False,
                    display_order=8,
                    option_group="Option 3",
                    field_notes=FieldNotes(
                        title="Important:",
                        items=[
                            NoteItem(
                                text="SK Resolution authorizing the barangay to utilize the SK Funds if the SK has no bank account yet shall NOT be considered as MOV under this indicator."
                            ),
                        ],
                    ),
                ),
                ChecklistItem(
                    id="1_6_1_opt3_a",
                    label="a) Proof of transfer of the 10% {CURRENT_YEAR} SK funds to the trust fund of the Barangay such as Deposit Slip or Official Receipt",
                    mov_description="Proof of transfer of 10% SK funds to barangay trust fund (Deposit Slip or Official Receipt)",
                    required=False,  # Part of Option 3 group (OR logic within)
                    display_order=9,
                    option_group="Option 3",
                ),
                ChecklistItem(
                    id="1_6_1_opt3_or",
                    label="OR",
                    item_type="info_text",
                    required=False,
                    display_order=10,
                    option_group="Option 3",  # Part of Option 3's internal OR
                ),
                ChecklistItem(
                    id="1_6_1_opt3_b",
                    label="b) Proof of transfer or corresponding legal forms/documents issued by the city/municipal treasurer if the barangay opted that the corresponding SK fund be kept as trust fund in the custody of the C/M treasurer",
                    mov_description="Legal forms/documents from city/municipal treasurer if SK fund kept as trust fund in C/M custody",
                    required=False,  # Part of Option 3 group (OR logic within)
                    display_order=11,
                    option_group="Option 3",
                ),
            ],
            notes=FormNotes(
                title="Important Notes:",
                items=[
                    NoteItem(
                        text="Choose and upload documents for ONLY ONE option that applies to your barangay's situation."
                    ),
                ],
            ),
        ),
        # === 1.6.2 Single Indicator with Conditional Logic (OR between 5+ and 4-below) ===
        SubIndicator(
            code="1.6.2",
            name="Presence of Approved Annual Barangay Youth Investment Program (ABYIP) for {CURRENT_YEAR}",
            upload_instructions=(
                "Upload based on the number of SK Officials:\n\n"
                "1. (If 5+ SK Officials) Approved Resolution approving the SK Annual/Supplemental Budget\n"
                "2. (If 5+ SK Officials) An Approved ABYIP signed by the SK Chairperson and its members\n"
                "3. (If 4 or fewer SK Officials) Certification from the C/MLGOO on number of SK officials"
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # OR logic between the two option groups
            checklist_items=[
                # Option A: 5 and above SK Officials
                ChecklistItem(
                    id="1_6_2_5above_header",
                    label="If the barangay has 5 and above SK Officials:",
                    item_type="info_text",
                    required=False,
                    display_order=1,
                ),
                ChecklistItem(
                    id="1_6_2_5above_a",
                    label="Approved Resolution approving the SK Annual/Supplemental Budget",
                    mov_description="Approved Resolution for SK Annual/Supplemental Budget (Required if 5+ SK officials)",
                    required=False,  # Conditionally required
                    display_order=2,
                ),
                ChecklistItem(
                    id="1_6_2_5above_b",
                    label="An Approved ABYIP signed by the SK Chairperson and its members",
                    mov_description="Approved ABYIP with signatures of SK Chairperson and members (Required if 5+ SK officials)",
                    required=False,  # Conditionally required
                    display_order=3,
                ),
                # OR separator (visual indicator)
                ChecklistItem(
                    id="1_6_2_or_separator",
                    label="OR",
                    item_type="info_text",
                    required=False,
                    display_order=4,
                ),
                # Option B: 4 and below SK Officials
                ChecklistItem(
                    id="1_6_2_4below_header",
                    label="If the barangay has 4 and below SK Officials:",
                    item_type="info_text",
                    required=False,
                    display_order=5,
                ),
                ChecklistItem(
                    id="1_6_2_4below_cert",
                    label="Certification from the C/MLGOO on number of SK officials",
                    mov_description="Certification from City/Municipal LGOO confirming number of SK officials (Required if 4 or fewer SK officials)",
                    required=False,  # Conditionally required
                    display_order=6,
                ),
            ],
        ),
    ],
)
