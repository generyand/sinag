"""update_indicator_1_6_2_with_or_logic

Revision ID: 9f8467f702cd
Revises: d29d91428996
Create Date: 2025-12-04

Updates indicator 1.6.2 to add info_text headers and OR separator:
- Adds "If the barangay has 5 and above SK Officials:" header
- Adds "OR" separator
- Adds "If the barangay has 4 and below SK Officials:" header
- Updates labels to be cleaner (without the condition prefix)

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy.orm import Session


# revision identifiers, used by Alembic.
revision: str = "9f8467f702cd"
down_revision: Union[str, Sequence[str], None] = "d29d91428996"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update indicator 1.6.2 checklist items with OR logic headers."""
    from app.db.models.governance_area import (
        Indicator,
        ChecklistItem as ChecklistItemModel,
    )

    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Get indicator 1.6.2
        indicator = session.query(Indicator).filter(Indicator.indicator_code == "1.6.2").first()

        if not indicator:
            print("Indicator 1.6.2 not found, skipping...")
            return

        print("Updating indicator 1.6.2 checklist items with OR logic...")

        # Delete existing checklist items for this indicator
        session.query(ChecklistItemModel).filter(
            ChecklistItemModel.indicator_id == indicator.id
        ).delete()

        # Create new checklist items with headers and OR separator
        new_items = [
            # Option A: 5 and above SK Officials
            ChecklistItemModel(
                indicator_id=indicator.id,
                item_id="1_6_2_5above_header",
                label="If the barangay has 5 and above SK Officials:",
                item_type="info_text",
                required=False,
                display_order=1,
                option_group="Option A",
            ),
            ChecklistItemModel(
                indicator_id=indicator.id,
                item_id="1_6_2_5above_a",
                label="Approved Resolution approving the 2023 SK Annual/Supplemental Budget",
                item_type="checkbox",
                mov_description="Approved Resolution for 2023 SK Annual/Supplemental Budget (Required if 5+ SK officials)",
                required=False,
                display_order=2,
                option_group="Option A",
            ),
            ChecklistItemModel(
                indicator_id=indicator.id,
                item_id="1_6_2_5above_b",
                label="An Approved 2023 ABYIP signed by the SK Chairperson and its members",
                item_type="checkbox",
                mov_description="Approved 2023 ABYIP with signatures of SK Chairperson and members (Required if 5+ SK officials)",
                required=False,
                display_order=3,
                option_group="Option A",
            ),
            # OR separator
            ChecklistItemModel(
                indicator_id=indicator.id,
                item_id="1_6_2_or_separator",
                label="OR",
                item_type="info_text",
                required=False,
                display_order=4,
            ),
            # Option B: 4 and below SK Officials
            ChecklistItemModel(
                indicator_id=indicator.id,
                item_id="1_6_2_4below_header",
                label="If the barangay has 4 and below SK Officials:",
                item_type="info_text",
                required=False,
                display_order=5,
                option_group="Option B",
            ),
            ChecklistItemModel(
                indicator_id=indicator.id,
                item_id="1_6_2_4below_cert",
                label="Certification from the C/MLGOO on number of SK officials",
                item_type="checkbox",
                mov_description="Certification from City/Municipal LGOO confirming number of SK officials (Required if 4 or fewer SK officials)",
                required=False,
                display_order=6,
                option_group="Option B",
            ),
        ]

        for item in new_items:
            session.add(item)

        # Update indicator validation_rule to ANY_ITEM_REQUIRED
        indicator.validation_rule = "ANY_ITEM_REQUIRED"

        session.commit()
        print("  - Updated 1.6.2 checklist items with OR logic successfully")

    except Exception as e:
        session.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Revert to original checklist structure."""
    pass
