"""sync_checklist_option_groups_from_definitions

Revision ID: 7346b2e75b9e
Revises: 395a21556368
Create Date: 2025-12-02 18:59:38.197259

This migration syncs option_group values for OR-logic indicators from
the Python definitions to existing checklist items in the database.

OR-Logic Indicators updated:
- 2.1.4: Physical OR Financial accomplishment
- 3.1.6: Approved Ordinance OR AIP
- 3.2.3: Physical OR Financial accomplishment
- 4.1.6: Option A OR Option B
- 4.3.4: Physical OR Financial accomplishment
- 4.5.6: Physical OR Financial accomplishment
- 4.8.4: Option A OR Option B
- 6.1.4: Physical OR Financial accomplishment
- 6.2.1: MRF OR MRS OR Clustered MRFs
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7346b2e75b9e'
down_revision: Union[str, Sequence[str], None] = '395a21556368'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Define the option_group mappings for OR-logic indicators
# Maps item_id to option_group value
OPTION_GROUP_MAPPINGS = {
    # Indicator 2.1.4 - Physical OR Financial
    "2_1_4_option_a": "Option A",
    "2_1_4_upload_1": "Option A",
    "2_1_4_upload_2": "Option A",
    "2_1_4_physical_accomplished": "Option A",
    "2_1_4_physical_reflected": "Option A",
    "2_1_4_option_b": "Option B",
    "2_1_4_upload_3": "Option B",
    "2_1_4_upload_4": "Option B",
    "2_1_4_financial_utilized": "Option B",
    "2_1_4_financial_allocated": "Option B",

    # Indicator 3.1.6 - Ordinance OR AIP
    "3_1_6_option_1": "Option 1",
    "3_1_6_option_2": "Option 2",

    # Indicator 3.2.3 - Physical OR Financial
    "3_2_3_upload": None,  # Shared (always required)
    "3_2_3_option_a": "Option A",
    "3_2_3_physical_accomplished": "Option A",
    "3_2_3_physical_reflected": "Option A",
    "3_2_3_option_b": "Option B",
    "3_2_3_financial_utilized": "Option B",
    "3_2_3_financial_allocated": "Option B",

    # Indicator 4.1.6 - Option A OR Option B
    "4_1_6_a_monitoring": "Option A",
    "4_1_6_a_photo": "Option A",
    "4_1_6_b_status": "Option B",
    "4_1_6_b_progress": "Option B",

    # Indicator 4.3.4 - Physical OR Financial
    "4_3_4_option_a": "Option A",
    "4_3_4_physical_reflected": "Option A",
    "4_3_4_physical_accomplished": "Option A",
    "4_3_4_option_b": "Option B",
    "4_3_4_financial_allocated": "Option B",
    "4_3_4_financial_utilized": "Option B",

    # Indicator 4.5.6 - Physical OR Financial
    "4_5_6_a": "Option A",
    "4_5_6_physical_accomplished": "Option A",
    "4_5_6_physical_reflected": "Option A",
    "4_5_6_b": "Option B",
    "4_5_6_financial_utilized": "Option B",
    "4_5_6_financial_allocated": "Option B",

    # Indicator 4.8.4 - Option A OR Option B
    "4_8_4_a_monitoring": "Option A",
    "4_8_4_a_photo": "Option A",
    "4_8_4_b_status": "Option B",
    "4_8_4_b_progress": "Option B",

    # Indicator 6.1.4 - Physical OR Financial
    "6_1_4_option_a": "Option A",
    "6_1_4_physical_accomplished": "Option A",
    "6_1_4_physical_reflected": "Option A",
    "6_1_4_option_b": "Option B",
    "6_1_4_financial_utilized": "Option B",
    "6_1_4_financial_allocated": "Option B",

    # Indicator 6.2.1 - MRF OR MRS OR Clustered MRFs (3 options)
    "6_2_1_a_photo": "Option A",
    "6_2_1_b_moa_junkshop": "Option B",
    "6_2_1_b_mechanism": "Option B",
    "6_2_1_b_moa_service": "Option B",
    "6_2_1_c_moa_host": "Option C",
    "6_2_1_c_moa_lgu": "Option C",
}

# Define validation rules for OR-logic indicators (by indicator code prefix)
# These use "OR_LOGIC_AT_LEAST_1_REQUIRED" - pure OR logic between option groups
OR_LOGIC_INDICATORS = [
    "2.1.4", "3.1.6", "3.2.3", "4.3.4", "4.5.6", "6.1.4", "6.2.1"
]

# These use "SHARED_PLUS_OR_LOGIC" - shared items + OR logic between option groups
# Do NOT change these - they have shared items that must be completed
SHARED_PLUS_OR_LOGIC_INDICATORS = [
    "4.1.6", "4.8.4"
]


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()

    # 1. Update option_group for each checklist item
    for item_id, option_group in OPTION_GROUP_MAPPINGS.items():
        if option_group:
            conn.execute(
                sa.text("""
                    UPDATE checklist_items
                    SET option_group = :option_group
                    WHERE item_id = :item_id
                """),
                {"option_group": option_group, "item_id": item_id}
            )

    # 2. Update validation_rule for pure OR-logic indicators
    for indicator_code in OR_LOGIC_INDICATORS:
        conn.execute(
            sa.text("""
                UPDATE indicators
                SET validation_rule = 'OR_LOGIC_AT_LEAST_1_REQUIRED'
                WHERE indicator_code = :code
            """),
            {"code": indicator_code}
        )

    # 3. Update validation_rule for SHARED + OR-logic indicators
    for indicator_code in SHARED_PLUS_OR_LOGIC_INDICATORS:
        conn.execute(
            sa.text("""
                UPDATE indicators
                SET validation_rule = 'SHARED_PLUS_OR_LOGIC'
                WHERE indicator_code = :code
            """),
            {"code": indicator_code}
        )

    print(f"Updated option_group for {len([k for k, v in OPTION_GROUP_MAPPINGS.items() if v])} checklist items")
    print(f"Updated validation_rule for {len(OR_LOGIC_INDICATORS)} pure OR-logic indicators")
    print(f"Updated validation_rule for {len(SHARED_PLUS_OR_LOGIC_INDICATORS)} SHARED + OR-logic indicators")


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()

    # Clear option_group for all mapped items
    for item_id in OPTION_GROUP_MAPPINGS.keys():
        conn.execute(
            sa.text("""
                UPDATE checklist_items
                SET option_group = NULL
                WHERE item_id = :item_id
            """),
            {"item_id": item_id}
        )

    # Reset validation_rule for pure OR-logic indicators
    for indicator_code in OR_LOGIC_INDICATORS:
        conn.execute(
            sa.text("""
                UPDATE indicators
                SET validation_rule = 'ALL_ITEMS_REQUIRED'
                WHERE indicator_code = :code
            """),
            {"code": indicator_code}
        )

    # Reset validation_rule for SHARED + OR-logic indicators
    for indicator_code in SHARED_PLUS_OR_LOGIC_INDICATORS:
        conn.execute(
            sa.text("""
                UPDATE indicators
                SET validation_rule = 'ALL_ITEMS_REQUIRED'
                WHERE indicator_code = :code
            """),
            {"code": indicator_code}
        )
