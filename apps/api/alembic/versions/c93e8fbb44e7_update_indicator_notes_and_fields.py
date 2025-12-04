"""update_indicator_notes_and_fields

Revision ID: c93e8fbb44e7
Revises: ca5761be56b5
Create Date: 2025-12-04 14:22:11.582244

Updates indicator form_schema notes and checklist items for:
- 1.3.1: Simplified CONSIDERATION text in mov_description
- 1.6.1.1: Added FormNotes with CONSIDERATION about bank statements
- 1.6.1.2: Added FormNotes with CONSIDERATION about bank statements
- 3.4.1: Added FormNotes with Barangay Tanod composition

"""
from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session


# revision identifiers, used by Alembic.
revision: str = 'c93e8fbb44e7'
down_revision: Union[str, Sequence[str], None] = 'ca5761be56b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update specific indicators with new notes and field descriptions."""
    from app.db.models.governance_area import Indicator, ChecklistItem as ChecklistItemModel
    from app.indicators.base import FormNotes, NoteItem

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # === 1.3.1: Update mov_description for date_approval field ===
        print("Updating 1.3.1 checklist item...")
        checklist_1_3_1 = session.query(ChecklistItemModel).filter(
            ChecklistItemModel.item_id == "1_3_1_date_approval"
        ).first()
        if checklist_1_3_1:
            checklist_1_3_1.mov_description = "CONSIDERATION: Approval until March 31, 2023"
            print("  - Updated 1_3_1_date_approval mov_description")

        # === 1.6.1.1: Add notes to form_schema ===
        print("Updating 1.6.1.1 indicator...")
        indicator_1_6_1_1 = session.query(Indicator).filter(
            Indicator.indicator_code == "1.6.1.1"
        ).first()
        if indicator_1_6_1_1 and indicator_1_6_1_1.form_schema:
            form_schema = dict(indicator_1_6_1_1.form_schema)
            form_schema["notes"] = {
                "title": "CONSIDERATION:",
                "items": [
                    {"text": "In the absence of deposit slips, bank statements will be considered, provided that it shows the transaction date, and that the total 10% of the SK Fund has been transferred."}
                ]
            }
            # Update upload_instructions to remove the consideration text
            if "upload_instructions" in form_schema:
                form_schema["upload_instructions"] = (
                    "Upload the following documents:\n"
                    "1. Copy of the written agreement\n"
                    "2. Proof of deposit reflecting the Account No./Name of Barangay SK and the total allocated amount for the 2023 SK funds"
                )
            indicator_1_6_1_1.form_schema = form_schema
            print("  - Updated 1.6.1.1 form_schema with notes")

            # Also update checklist item mov_description
            checklist_1_6_1_1_b = session.query(ChecklistItemModel).filter(
                ChecklistItemModel.item_id == "1_6_1_1_b"
            ).first()
            if checklist_1_6_1_1_b:
                checklist_1_6_1_1_b.mov_description = "Proof of deposit with Account No./Name and total 2023 SK funds amount"
                print("  - Updated 1_6_1_1_b mov_description")

        # === 1.6.1.2: Add notes to form_schema ===
        print("Updating 1.6.1.2 indicator...")
        indicator_1_6_1_2 = session.query(Indicator).filter(
            Indicator.indicator_code == "1.6.1.2"
        ).first()
        if indicator_1_6_1_2 and indicator_1_6_1_2.form_schema:
            form_schema = dict(indicator_1_6_1_2.form_schema)
            form_schema["notes"] = {
                "title": "CONSIDERATION:",
                "items": [
                    {"text": "In the absence of deposit slips, bank statements will be considered, provided that it shows the transaction date, and that the total 10% of the SK Fund has been transferred."}
                ]
            }
            # Update upload_instructions to remove the consideration text
            if "upload_instructions" in form_schema:
                form_schema["upload_instructions"] = (
                    "Upload: Deposit slips reflecting the Account No./Name of Barangay SK and the total allocated amount for the 2023 SK funds"
                )
            indicator_1_6_1_2.form_schema = form_schema
            print("  - Updated 1.6.1.2 form_schema with notes")

            # Also update checklist item mov_description
            checklist_1_6_1_2 = session.query(ChecklistItemModel).filter(
                ChecklistItemModel.item_id == "1_6_1_2_deposit"
            ).first()
            if checklist_1_6_1_2:
                checklist_1_6_1_2.mov_description = "Deposit slips with Account No./Name and total 2023 SK funds"
                print("  - Updated 1_6_1_2_deposit mov_description")

        # === 3.4.1: Add notes to form_schema ===
        print("Updating 3.4.1 indicator...")
        indicator_3_4_1 = session.query(Indicator).filter(
            Indicator.indicator_code == "3.4.1"
        ).first()
        if indicator_3_4_1 and indicator_3_4_1.form_schema:
            form_schema = dict(indicator_3_4_1.form_schema)
            form_schema["notes"] = {
                "title": "Composition of the Barangay Tanod:",
                "items": [
                    {"label": "1.", "text": "Chief Tanod/Executive Officer"},
                    {"label": "2.", "text": "Team Leaders"},
                    {"label": "3.", "text": "Team Members"}
                ]
            }
            # Update upload_instructions to remove the composition list
            if "upload_instructions" in form_schema:
                form_schema["upload_instructions"] = (
                    "Upload the following:\n\n"
                    "1. EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) "
                    "on the organization of the Barangay Tanod covering January to October 2023\n\n"
                    "Please also supply the required information:\n"
                    "Date of approval"
                )
            indicator_3_4_1.form_schema = form_schema
            print("  - Updated 3.4.1 form_schema with notes")

        session.commit()
        print("Migration complete!")

    except Exception as e:
        session.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Downgrade schema - remove notes from form_schema."""
    from app.db.models.governance_area import Indicator, ChecklistItem as ChecklistItemModel

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Revert 1.3.1
        checklist_1_3_1 = session.query(ChecklistItemModel).filter(
            ChecklistItemModel.item_id == "1_3_1_date_approval"
        ).first()
        if checklist_1_3_1:
            checklist_1_3_1.mov_description = (
                "Input the Date of Approval from the ordinance.\n"
                "Primary deadline: On or before December 31, 2022\n"
                "Grace period: Approval until March 31, 2023\n\n"
                "Compliance determination:\n"
                "- On or before Dec 31, 2022: PASSED\n"
                "- Jan 1 - Mar 31, 2023: CONSIDERED\n"
                "- After Mar 31, 2023: FAILED"
            )

        # Revert 1.6.1.1, 1.6.1.2, 3.4.1 - remove notes
        for code in ["1.6.1.1", "1.6.1.2", "3.4.1"]:
            indicator = session.query(Indicator).filter(
                Indicator.indicator_code == code
            ).first()
            if indicator and indicator.form_schema:
                form_schema = dict(indicator.form_schema)
                if "notes" in form_schema:
                    del form_schema["notes"]
                indicator.form_schema = form_schema

        session.commit()

    except Exception as e:
        session.rollback()
        raise
    finally:
        session.close()
