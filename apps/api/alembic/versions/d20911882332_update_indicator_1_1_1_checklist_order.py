"""update_indicator_1_1_1_checklist_order

Revision ID: d20911882332
Revises: c93e8fbb44e7
Create Date: 2025-12-04

Updates indicator 1.1.1 checklist items:
1. Move "BFDP Monitoring Form A were submitted" count field right after BFDP Form checkbox
2. Remove redundant "ANNUAL REPORT" group from first item, keep it only on "a. Barangay Financial Report"
3. Add separate checkboxes for f and g, with count fields below them

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy.orm import Session


# revision identifiers, used by Alembic.
revision: str = "d20911882332"
down_revision: Union[str, Sequence[str], None] = "c93e8fbb44e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update indicator 1.1.1 checklist items."""
    from app.db.models.governance_area import (
        Indicator,
        ChecklistItem as ChecklistItemModel,
    )

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Get indicator 1.1.1
        indicator = session.query(Indicator).filter(Indicator.indicator_code == "1.1.1").first()

        if not indicator:
            print("Indicator 1.1.1 not found, skipping...")
            return

        print("Updating indicator 1.1.1 checklist items...")

        # Delete existing checklist items for this indicator
        session.query(ChecklistItemModel).filter(
            ChecklistItemModel.indicator_id == indicator.id
        ).delete()

        # Create new checklist items with correct order
        new_items = [
            # BFDP Form checkbox
            ChecklistItemModel(
                indicator_id=indicator.id,
                item_id="1_1_1_bfdp_form",
                label="BFDP Monitoring Form A of the DILG Advisory covering the 1st to 3rd quarter monitoring data signed by the City/Municipal C/MLGOO, Punong Barangay and Barangay Secretary",
                item_type="checkbox",
                mov_description=None,
                required=True,
                requires_document_count=False,
                display_order=1,
            ),
            # Document count - right after BFDP Form
            ChecklistItemModel(
                indicator_id=indicator.id,
                item_id="1_1_1_bfdp_count",
                label="BFDP Monitoring Form A were submitted",
                item_type="document_count",
                mov_description="Please supply the number of documents submitted:",
                required=True,
                requires_document_count=True,
                display_order=2,
            ),
            # Photo documentation checkbox
            ChecklistItemModel(
                indicator_id=indicator.id,
                item_id="1_1_1_photo_docs",
                label="Two (2) Photo Documentation of the BFDP board showing the name of the barangay",
                item_type="checkbox",
                mov_description="Photos must clearly show the BFDP board with barangay name and posted documents",
                required=True,
                requires_document_count=False,
                display_order=3,
            ),
            # ANNUAL REPORT Group
            ChecklistItemModel(
                indicator_id=indicator.id,
                item_id="1_1_1_a",
                label="a. Barangay Financial Report",
                item_type="checkbox",
                group_name="ANNUAL REPORT",
                mov_description="Barangay Financial Report for CY 2023",
                required=True,
                requires_document_count=False,
                display_order=4,
            ),
            ChecklistItemModel(
                indicator_id=indicator.id,
                item_id="1_1_1_b",
                label="b. Barangay Budget",
                item_type="checkbox",
                group_name=None,
                mov_description="Barangay Budget for CY 2023",
                required=True,
                requires_document_count=False,
                display_order=5,
            ),
            ChecklistItemModel(
                indicator_id=indicator.id,
                item_id="1_1_1_c",
                label="c. Summary of Income and Expenditures",
                item_type="checkbox",
                group_name=None,
                mov_description="Summary of Income and Expenditures for CY 2023",
                required=True,
                requires_document_count=False,
                display_order=6,
            ),
            ChecklistItemModel(
                indicator_id=indicator.id,
                item_id="1_1_1_d",
                label="d. 20% Component of the NTA Utilization",
                item_type="checkbox",
                group_name=None,
                mov_description="20% Component of the NTA Utilization for CY 2023",
                required=True,
                requires_document_count=False,
                display_order=7,
            ),
            ChecklistItemModel(
                indicator_id=indicator.id,
                item_id="1_1_1_e",
                label="e. Annual Procurement Plan or Procurement List",
                item_type="checkbox",
                group_name=None,
                mov_description="Annual Procurement Plan OR Procurement List (either one is acceptable)",
                required=True,
                requires_document_count=False,
                display_order=8,
            ),
            # QUARTERLY REPORT Group - checkbox first
            ChecklistItemModel(
                indicator_id=indicator.id,
                item_id="1_1_1_f",
                label="f. List of Notices of Award (1st - 3rd Quarter of CY 2023)",
                item_type="checkbox",
                group_name="QUARTERLY REPORT",
                mov_description="List of Notices of Award (1st - 3rd Quarter of CY 2023)",
                required=True,
                requires_document_count=False,
                display_order=9,
            ),
            # Count field for f
            ChecklistItemModel(
                indicator_id=indicator.id,
                item_id="1_1_1_f_count",
                label="List of Notices of Award were submitted",
                item_type="document_count",
                group_name=None,
                mov_description=None,
                required=True,
                requires_document_count=True,
                display_order=10,
            ),
            # MONTHLY REPORT Group - checkbox first
            ChecklistItemModel(
                indicator_id=indicator.id,
                item_id="1_1_1_g",
                label="g. Itemized Monthly Collections and Disbursements (January to September 2023)",
                item_type="checkbox",
                group_name="MONTHLY REPORT",
                mov_description="Itemized Monthly Collections and Disbursements (January to September 2023)",
                required=True,
                requires_document_count=False,
                display_order=11,
            ),
            # Count field for g
            ChecklistItemModel(
                indicator_id=indicator.id,
                item_id="1_1_1_g_count",
                label="Itemized Monthly Collections and Disbursements were submitted",
                item_type="document_count",
                group_name=None,
                mov_description=None,
                required=True,
                requires_document_count=True,
                display_order=12,
            ),
        ]

        for item in new_items:
            session.add(item)

        # Also update the form_schema to reflect the new checklist structure
        if indicator.form_schema:
            form_schema = dict(indicator.form_schema)
            # Update assessor_validation fields to match new checklist
            form_schema["assessor_validation"] = {
                "fields": [
                    {
                        "item_id": "1_1_1_bfdp_form",
                        "type": "checkbox",
                        "label": "BFDP Monitoring Form A of the DILG Advisory covering the 1st to 3rd quarter monitoring data signed by the City/Municipal C/MLGOO, Punong Barangay and Barangay Secretary",
                    },
                    {
                        "item_id": "1_1_1_bfdp_count",
                        "type": "document_count",
                        "label": "BFDP Monitoring Form A were submitted",
                        "description": "Please supply the number of documents submitted:",
                    },
                    {
                        "item_id": "1_1_1_photo_docs",
                        "type": "checkbox",
                        "label": "Two (2) Photo Documentation of the BFDP board showing the name of the barangay",
                        "description": "Photos must clearly show the BFDP board with barangay name and posted documents",
                    },
                    {
                        "item_id": "1_1_1_a",
                        "type": "checkbox",
                        "label": "a. Barangay Financial Report",
                        "group": "ANNUAL REPORT",
                        "description": "Barangay Financial Report for CY 2023",
                    },
                    {
                        "item_id": "1_1_1_b",
                        "type": "checkbox",
                        "label": "b. Barangay Budget",
                        "description": "Barangay Budget for CY 2023",
                    },
                    {
                        "item_id": "1_1_1_c",
                        "type": "checkbox",
                        "label": "c. Summary of Income and Expenditures",
                        "description": "Summary of Income and Expenditures for CY 2023",
                    },
                    {
                        "item_id": "1_1_1_d",
                        "type": "checkbox",
                        "label": "d. 20% Component of the NTA Utilization",
                        "description": "20% Component of the NTA Utilization for CY 2023",
                    },
                    {
                        "item_id": "1_1_1_e",
                        "type": "checkbox",
                        "label": "e. Annual Procurement Plan or Procurement List",
                        "description": "Annual Procurement Plan OR Procurement List (either one is acceptable)",
                    },
                    {
                        "item_id": "1_1_1_f",
                        "type": "checkbox",
                        "label": "f. List of Notices of Award (1st - 3rd Quarter of CY 2023)",
                        "group": "QUARTERLY REPORT",
                        "description": "List of Notices of Award (1st - 3rd Quarter of CY 2023)",
                    },
                    {
                        "item_id": "1_1_1_f_count",
                        "type": "document_count",
                        "label": "List of Notices of Award were submitted",
                    },
                    {
                        "item_id": "1_1_1_g",
                        "type": "checkbox",
                        "label": "g. Itemized Monthly Collections and Disbursements (January to September 2023)",
                        "group": "MONTHLY REPORT",
                        "description": "Itemized Monthly Collections and Disbursements (January to September 2023)",
                    },
                    {
                        "item_id": "1_1_1_g_count",
                        "type": "document_count",
                        "label": "Itemized Monthly Collections and Disbursements were submitted",
                    },
                ]
            }
            indicator.form_schema = form_schema

        session.commit()
        print("  - Updated 1.1.1 checklist items successfully")

    except Exception as e:
        session.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Revert changes - would need to restore old checklist structure."""
    pass
