"""
Indicator 1.6: Release of the Sangguniang Kabataan (SK) Funds by the Barangay

Governance Area: 1 (Financial Administration and Sustainability)
BBI Status: No (This is NOT a BBI)

Note: This indicator assesses compliance with the SK Reform Act of 2015 regarding
the release of SK funds and the presence of an approved ABYIP (Annual Barangay
Youth Investment Program).

HIERARCHICAL STRUCTURE:
1.6 Release of SK Funds
  ├─ 1.6.1 Compliance with Section 20 of SK Reform Act
  │   ├─ 1.6.1.1 Has Barangay-SK Agreement
  │   ├─ 1.6.1.2 No agreement but has SK account
  │   └─ 1.6.1.3 No SK Officials/quorum or no SK bank account
  └─ 1.6.2 Presence of Approved ABYIP
      ├─ 1.6.2.1 If 5 or more SK Officials
      └─ 1.6.2.2 If 4 or fewer SK Officials
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem, FormNotes, NoteItem, FieldNotes


# Indicator 1.6: Release of SK Funds
INDICATOR_1_6 = Indicator(
    code="1.6",
    name="Release of the Sangguniang Kabataan (SK) Funds by the Barangay",
    governance_area_id=1,  # Financial Administration and Sustainability
    is_bbi=False,
    sort_order=6,
    description="Compliance with Section 20 of the SK Reform Act of 2015 and Item 3.2 of DBM-DILG-NYC JMC No. 1, s. 2019",
    children=[
        # === 1.6.1 Parent Container with OR logic ===
        SubIndicator(
            code="1.6.1",
            name="Compliance with Section 20 of the SK Reform Act of 2015 and Item 3.2 of DBM-DILG-NYC JMC No. 1, s. 2019",
            upload_instructions=None,  # Parent container - no direct upload
            validation_rule="ANY_ITEM_REQUIRED",  # Only ONE child (1.6.1.1 OR 1.6.1.2 OR 1.6.1.3) is required
            checklist_items=[],
            children=[
                # === 1.6.1.1 Actual Upload Indicator ===
                SubIndicator(
                    code="1.6.1.1",
                    name="Barangay has Barangay-SK Agreement for release/deposit",
                    upload_instructions=(
                        "Upload the following documents:\n"
                        "1. Copy of the written agreement\n"
                        "2. Proof of deposit reflecting the Account No./Name of Barangay SK and the total allocated amount for the 2023 SK funds"
                    ),
                    validation_rule="ALL_ITEMS_REQUIRED",
                    checklist_items=[
                        ChecklistItem(
                            id="1_6_1_1_a",
                            label="a) Copy of the written agreement",
                            mov_description="Copy of the written Barangay-SK Agreement",
                            required=True,
                            display_order=1
                        ),
                        ChecklistItem(
                            id="1_6_1_1_b",
                            label="b) Proof of deposit reflecting the Account No./Name of Barangay SK and the total allocated amount for the 2023 SK funds",
                            mov_description="Proof of deposit with Account No./Name and total 2023 SK funds amount",
                            required=True,
                            display_order=2,
                            field_notes=FieldNotes(
                                title="CONSIDERATION:",
                                items=[
                                    NoteItem(text="In the absence of deposit slips, bank statements will be considered, provided that it shows the transaction date, and that the total 10% of the SK Fund has been transferred."),
                                ]
                            )
                        ),
                    ]
                ),

                # === 1.6.1.2 Actual Upload Indicator ===
                SubIndicator(
                    code="1.6.1.2",
                    name="The barangay does not have Barangay-SK Agreement but with current account",
                    upload_instructions=(
                        "Upload: Deposit slips reflecting the Account No./Name of Barangay SK and the total allocated amount for the 2023 SK funds"
                    ),
                    validation_rule="ALL_ITEMS_REQUIRED",
                    checklist_items=[
                        ChecklistItem(
                            id="1_6_1_2_deposit",
                            label="Deposit slips reflecting the Account No./Name of Barangay SK and the total allocated amount for the 2023 SK funds",
                            mov_description="Deposit slips with Account No./Name and total 2023 SK funds",
                            required=True,
                            display_order=1,
                            field_notes=FieldNotes(
                                title="CONSIDERATION:",
                                items=[
                                    NoteItem(text="In the absence of deposit slips, bank statements will be considered, provided that it shows the transaction date, and that the total 10% of the SK Fund has been transferred."),
                                ]
                            )
                        ),
                    ]
                ),

                # === 1.6.1.3 Actual Upload Indicator ===
                SubIndicator(
                    code="1.6.1.3",
                    name="The barangay does not have SK Officials or with SK Officials but no quorum and/or No SK Bank Account",
                    upload_instructions=(
                        "Upload ONE of the following:\n"
                        "1. Proof of transfer of the 10% 2023 SK funds to the trust fund of the Barangay such as Deposit Slip or Official Receipt\n"
                        "2. Proof of transfer or corresponding legal forms/documents issued by the city/municipal treasurer if the barangay opted that the corresponding SK fund be kept as trust fund in the custody of the C/M treasurer"
                    ),
                    validation_rule="ANY_ITEM_REQUIRED",
                    checklist_items=[
                        ChecklistItem(
                            id="1_6_1_3_a",
                            label="a) Proof of transfer of the 10% 2023 SK funds to the trust fund of the Barangay such as Deposit Slip or Official Receipt",
                            mov_description="Proof of transfer of 10% 2023 SK funds to barangay trust fund (Deposit Slip or Official Receipt)",
                            required=False,
                            display_order=1
                        ),
                        ChecklistItem(
                            id="1_6_1_3_b",
                            label="b) Proof of transfer or corresponding legal forms/documents issued by the city/municipal treasurer if the barangay opted that the corresponding SK fund be kept as trust fund in the custody of the C/M treasurer",
                            mov_description="Legal forms/documents from city/municipal treasurer if SK fund kept as trust fund in C/M custody",
                            required=False,
                            display_order=2
                        ),
                    ],
                    notes=FormNotes(
                        title="Note:",
                        items=[
                            NoteItem(text="SK Resolution authorizing the barangay to utilize the SK Funds if the SK has no bank account yet shall not be considered as MOV under the indicator."),
                        ]
                    )
                ),
            ]
        ),

        # === 1.6.2 Single Indicator with Conditional Logic (OR between 5+ and 4-below) ===
        SubIndicator(
            code="1.6.2",
            name="Presence of Approved Annual Barangay Youth Investment Program (ABYIP) for 2023",
            upload_instructions=(
                "Upload based on the number of SK Officials:\n\n"
                "1. (If 5+ SK Officials) Approved Resolution approving the 2023 SK Annual/Supplemental Budget\n"
                "2. (If 5+ SK Officials) An Approved 2023 ABYIP signed by the SK Chairperson and its members\n"
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
                    option_group="Option A"
                ),
                ChecklistItem(
                    id="1_6_2_5above_a",
                    label="Approved Resolution approving the 2023 SK Annual/Supplemental Budget",
                    mov_description="Approved Resolution for 2023 SK Annual/Supplemental Budget (Required if 5+ SK officials)",
                    required=False,  # Conditionally required
                    display_order=2,
                    option_group="Option A"
                ),
                ChecklistItem(
                    id="1_6_2_5above_b",
                    label="An Approved 2023 ABYIP signed by the SK Chairperson and its members",
                    mov_description="Approved 2023 ABYIP with signatures of SK Chairperson and members (Required if 5+ SK officials)",
                    required=False,  # Conditionally required
                    display_order=3,
                    option_group="Option A"
                ),
                # OR separator (visual indicator)
                ChecklistItem(
                    id="1_6_2_or_separator",
                    label="OR",
                    item_type="info_text",
                    required=False,
                    display_order=4
                ),
                # Option B: 4 and below SK Officials
                ChecklistItem(
                    id="1_6_2_4below_header",
                    label="If the barangay has 4 and below SK Officials:",
                    item_type="info_text",
                    required=False,
                    display_order=5,
                    option_group="Option B"
                ),
                ChecklistItem(
                    id="1_6_2_4below_cert",
                    label="Certification from the C/MLGOO on number of SK officials",
                    mov_description="Certification from City/Municipal LGOO confirming number of SK officials (Required if 4 or fewer SK officials)",
                    required=False,  # Conditionally required
                    display_order=6,
                    option_group="Option B"
                ),
            ]
        ),
    ]
)
