"""
Indicator 1.2: Innovations on revenue generation or exercise of corporate powers

Governance Area: 1 (Financial Administration and Sustainability)
BBI Status: No (This is NOT a BBI)

Note: This indicator assesses whether the barangay has increased its local resources
compared to the previous year, demonstrating innovation in revenue generation.
"""

from app.indicators.base import Indicator, SubIndicator, ChecklistItem


# Indicator 1.2: Innovations on revenue generation
INDICATOR_1_2 = Indicator(
    code="1.2",
    name="Innovations on revenue generation or exercise of corporate powers",
    governance_area_id=1,  # Financial Administration and Sustainability
    is_bbi=False,
    sort_order=2,
    description="Increase in local resources in CY 2023",
    children=[
        # Sub-Indicator 1.2.1
        SubIndicator(
            code="1.2.1",
            name="Increase in local resources in CY 2023",
            upload_instructions=(
                "Upload the following documents:\n"
                "1. SRE (Statement of Receipts and Expenditures) for 2022 and 2023, signed by Barangay Treasurer and Punong Barangay\n"
                "2. Certification on Increase in Local Resources signed by the City/Municipal Treasurer/Budget Officer"
            ),
            validation_rule="ALL_ITEMS_REQUIRED",
            checklist_items=[
                ChecklistItem(
                    id="1_2_1_a",
                    label="SRE for 2022 and 2023, signed by Barangay Treasurer and Punong Barangay",
                    mov_description="Statement of Receipts and Expenditures (SRE) for CY 2022 and CY 2023 with signatures",
                    required=True,
                    display_order=1
                ),
                ChecklistItem(
                    id="1_2_1_b",
                    label="Certification on Increase in Local Resources signed by the City/Municipal Treasurer/ Budget Officer",
                    mov_description="Official certification from City/Municipal Treasurer or Budget Officer confirming the increase in local resources",
                    required=True,
                    display_order=2
                ),
                ChecklistItem(
                    id="1_2_1_amount_2022",
                    label="Total amount obtained from local resources in CY 2022",
                    mov_description="Amount input field for CY 2022 local resources",
                    required=True,
                    requires_document_count=True,  # Reusing this field to indicate numeric input is required
                    display_order=3
                ),
                ChecklistItem(
                    id="1_2_1_amount_2023",
                    label="Total amount obtained from local resources in CY 2023",
                    mov_description="Amount input field for CY 2023 local resources",
                    required=True,
                    requires_document_count=True,  # Reusing this field to indicate numeric input is required
                    display_order=4
                ),
            ]
        ),
    ]
)
