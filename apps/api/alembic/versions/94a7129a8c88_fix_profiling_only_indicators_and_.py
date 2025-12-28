"""fix_profiling_only_indicators_and_checklist_items

This migration:
1. Adds is_profiling_only column to checklist_items table
2. Sets is_profiling_only=true for indicators: 4.1.7, 4.2.2, 4.9.1-4.9.5
3. Sets is_profiling_only=true for checklist items: 4_5_5_b, 4_5_5_c

Per DILG SGLGB guidelines, profiling-only indicators/items:
- Are for data collection purposes only
- Do NOT affect pass/fail status
- Do NOT count towards governance area compliance

Revision ID: 94a7129a8c88
Revises: 755d018546e3
Create Date: 2025-12-13 19:08:23.910267

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "94a7129a8c88"
down_revision: Union[str, Sequence[str], None] = "755d018546e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Indicator codes that should be profiling-only
PROFILING_ONLY_INDICATOR_CODES = [
    "4.1.7",  # Referral Network (FOR PROFILING)
    "4.2.2",  # Appointment of Barangay Health Personnel (FOR PROFILING)
    "4.9.1",  # HAPAG - Established BCG
    "4.9.2",  # HAPAG - Enacted Ordinance
    "4.9.3",  # HAPAG - Designated SBM
    "4.9.4",  # HAPAG - Conducted Advocacy Campaign
    "4.9.5",  # HAPAG - Established Volunteers Group
]

# Checklist item IDs that should be profiling-only
PROFILING_ONLY_CHECKLIST_ITEM_IDS = [
    "4_5_5_b",  # Copy of Comprehensive Barangay Juvenile Intervention Program (FOR PROFILING)
    "4_5_5_c",  # Copy of CAR and CICL registry (FOR PROFILING)
]


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Add is_profiling_only column to checklist_items table
    op.add_column(
        "checklist_items",
        sa.Column(
            "is_profiling_only",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
            comment="If true, this checklist item is for profiling only and does not affect pass/fail",
        ),
    )

    # 2. Update indicators to set is_profiling_only=true
    for code in PROFILING_ONLY_INDICATOR_CODES:
        op.execute(
            sa.text(
                "UPDATE indicators SET is_profiling_only = true WHERE indicator_code = :code"
            ).bindparams(code=code)
        )

    # 3. Update checklist items to set is_profiling_only=true
    for item_id in PROFILING_ONLY_CHECKLIST_ITEM_IDS:
        op.execute(
            sa.text(
                "UPDATE checklist_items SET is_profiling_only = true WHERE item_id = :item_id"
            ).bindparams(item_id=item_id)
        )


def downgrade() -> None:
    """Downgrade schema."""
    # 1. Reset checklist items is_profiling_only to false (before dropping column)
    for item_id in PROFILING_ONLY_CHECKLIST_ITEM_IDS:
        op.execute(
            sa.text(
                "UPDATE checklist_items SET is_profiling_only = false WHERE item_id = :item_id"
            ).bindparams(item_id=item_id)
        )

    # 2. Reset indicators is_profiling_only to false
    for code in PROFILING_ONLY_INDICATOR_CODES:
        op.execute(
            sa.text(
                "UPDATE indicators SET is_profiling_only = false WHERE indicator_code = :code"
            ).bindparams(code=code)
        )

    # 3. Drop the is_profiling_only column from checklist_items
    op.drop_column("checklist_items", "is_profiling_only")
