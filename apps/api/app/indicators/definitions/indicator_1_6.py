"""
Indicator 1.6: Release of the Sangguniang Kabataan (SK) Funds by the Barangay

Governance Area: 1 (Financial Administration and Sustainability)
BBI Status: No (This is NOT a BBI)

Note: This indicator assesses compliance with the SK Reform Act of 2015 regarding
the release of SK funds and the presence of an approved ABYIP (Annual Barangay
Youth Investment Program).
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 1.6: Release of SK Funds
INDICATOR_1_6 = Indicator(
    code="1.6",
    name="Release of the Sangguniang Kabataan (SK) Funds by the Barangay",
    governance_area_id=1,  # Financial Administration and Sustainability
    is_bbi=False,
    sort_order=6,
    description="Compliance with Section 20 of the SK Reform Act of 2015 and Item 3.2 of DBM-DILG-NYC JMC No. 1, s. 2019",
    children=[
        # Sub-Indicator 1.6.1
        SubIndicator(
            code="1.6.1",
            name="Compliance with Section 20 of the SK Reform Act of 2015 and Item 3.2 of DBM-DILG-NYC JMC No. 1, s. 2019",
            upload_instructions=(
                "Upload relevant documents based on your barangay's situation:\n\n"
                "FOR 1.6.1.1 - If the barangay has Barangay-SK Agreement:\n"
                "• Copy of the written agreement\n"
                "• Proof of deposit reflecting the Account No./Name of Barangay SK and total allocated amount for 2023 SK funds\n"
                "(Consideration: In the absence of deposit slips, bank statements will be considered, "
                "provided that it shows the transaction date, and that the total 10% of the SK Fund has been transferred)\n\n"
                "FOR 1.6.1.2 - If the barangay does not have Barangay-SK Agreement but with current account:\n"
                "• Deposit slips reflecting the Account No./Name of Barangay SK and total allocated amount for 2023 SK funds\n"
                "(Consideration: In the absence of deposit slips, bank statements will be considered, "
                "provided that it shows the transaction date, and that the total 10% of the SK Fund has been transferred)\n\n"
                "FOR 1.6.1.3 - If the barangay does not have SK Officials or with SK Officials but no quorum and/or No SK Bank Account:\n"
                "• Proof of transfer of the 10% 2023 SK funds to the trust fund of the Barangay (Deposit Slip or Official Receipt), OR\n"
                "• Proof of transfer or corresponding legal forms/documents issued by the city/municipal treasurer "
                "if the barangay opted that the corresponding SK fund be kept as trust fund in the custody of the C/M treasurer\n"
                "Note: SK Resolution authorizing the barangay to utilize the SK Funds if the SK has no bank account "
                "yet shall not be considered as MOV under this indicator."
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # Any one of the three scenarios (1.6.1.1, 1.6.1.2, or 1.6.1.3)
            checklist_items=[
                # Scenario 1.6.1.1 - Has Barangay-SK Agreement
                ChecklistItem(
                    id="1_6_1_1_a",
                    label="a) Copy of the written agreement (for 1.6.1.1)",
                    group_name="1.6.1.1 - Barangay has Barangay-SK Agreement for release/deposit",
                    mov_description="Copy of the written Barangay-SK Agreement",
                    required=False,  # Only required if choosing scenario 1.6.1.1
                    display_order=1
                ),
                ChecklistItem(
                    id="1_6_1_1_b",
                    label="b) Proof of deposit reflecting the Account No./Name of Barangay SK and the total allocated amount for the 2023 SK funds (for 1.6.1.1)",
                    group_name="1.6.1.1 - Barangay has Barangay-SK Agreement for release/deposit",
                    mov_description="Proof of deposit with Account No./Name and total 2023 SK funds amount. Consideration: In the absence of deposit slips, bank statements showing transaction date and full 10% transfer will be accepted",
                    required=False,
                    display_order=2
                ),

                # Scenario 1.6.1.2 - No Agreement but with current account
                ChecklistItem(
                    id="1_6_1_2_deposit",
                    label="Deposit slips reflecting the Account No./Name of Barangay SK and the total allocated amount for the 2023 SK funds (for 1.6.1.2)",
                    group_name="1.6.1.2 - Barangay does not have Barangay-SK Agreement but with current account",
                    mov_description="Deposit slips with Account No./Name and total 2023 SK funds. Consideration: In the absence of deposit slips, bank statements showing transaction date and full 10% transfer will be accepted",
                    required=False,
                    display_order=3
                ),

                # Scenario 1.6.1.3 - No SK Officials or no quorum/no bank account
                ChecklistItem(
                    id="1_6_1_3_a",
                    label="a) Proof of transfer of the 10% 2023 SK funds to the trust fund of the Barangay such as Deposit Slip or Official Receipt (for 1.6.1.3)",
                    group_name="1.6.1.3 - Barangay does not have SK Officials or with SK Officials but no quorum and/or No SK Bank Account",
                    mov_description="Proof of transfer of 10% 2023 SK funds to barangay trust fund (Deposit Slip or Official Receipt)",
                    required=False,
                    display_order=4
                ),
                ChecklistItem(
                    id="1_6_1_3_b",
                    label="b) Proof of transfer or corresponding legal forms/documents issued by the city/municipal treasurer if the barangay opted that the corresponding SK fund be kept as trust fund in the custody of the C/M treasurer (for 1.6.1.3)",
                    group_name="1.6.1.3 - Barangay does not have SK Officials or with SK Officials but no quorum and/or No SK Bank Account",
                    mov_description="Legal forms/documents from city/municipal treasurer if SK fund kept as trust fund in C/M custody",
                    required=False,
                    display_order=5
                ),
            ]
        ),

        # Sub-Indicator 1.6.2
        SubIndicator(
            code="1.6.2",
            name="Presence of Approved Annual Barangay Youth Investment Program (ABYIP) for 2023",
            upload_instructions=(
                "Upload the required documents based on the number of SK Officials:\n\n"
                "If the barangay has 5 and above SK Officials:\n"
                "• Approved Resolution approving the 2023 SK Annual/Supplemental Budget\n"
                "• An Approved 2023 ABYIP signed by the SK Chairperson and its members\n\n"
                "If the barangay has 4 and below SK Officials:\n"
                "• Certification from the C/MLGOO on number of SK officials"
            ),
            validation_rule="ANY_ITEM_REQUIRED",  # Either scenario based on number of SK Officials
            checklist_items=[
                # For barangays with 5 and above SK Officials
                ChecklistItem(
                    id="1_6_2_5above_a",
                    label="Approved Resolution approving the 2023 SK Annual/Supplemental Budget (for barangays with 5 and above SK Officials)",
                    group_name="If the barangay has 5 and above SK Officials",
                    mov_description="Approved Resolution for 2023 SK Annual/Supplemental Budget",
                    required=False,
                    display_order=1
                ),
                ChecklistItem(
                    id="1_6_2_5above_b",
                    label="An Approved 2023 ABYIP signed by the SK Chairperson and its members (for barangays with 5 and above SK Officials)",
                    group_name="If the barangay has 5 and above SK Officials",
                    mov_description="Approved 2023 ABYIP with signatures of SK Chairperson and members",
                    required=False,
                    display_order=2
                ),

                # For barangays with 4 and below SK Officials
                ChecklistItem(
                    id="1_6_2_4below_cert",
                    label="Certification from the C/MLGOO on number of SK officials (for barangays with 4 and below SK Officials)",
                    group_name="If the barangay has 4 and below SK Officials",
                    mov_description="Certification from City/Municipal LGOO confirming number of SK officials",
                    required=False,
                    display_order=3
                ),
            ]
        ),
    ]
)
