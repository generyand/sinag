"""remove_year_refs_and_add_or_separator

Revision ID: 9e0b79a6a6d5
Revises: 25aa34db3929
Create Date: 2025-12-06 10:39:06.505647

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9e0b79a6a6d5'
down_revision: Union[str, Sequence[str], None] = '25aa34db3929'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove year references and add OR separator."""
    # 2.1.4 - Remove "- Preparedness component"
    op.execute("""
        UPDATE checklist_items
        SET label = 'b. At least 50% fund utilization of the 70% component of BDRRMF'
        WHERE item_id = '2_1_4_option_b'
    """)

    # 3.6.1 - Remove "covering July-September 2023"
    op.execute("""
        UPDATE checklist_items
        SET label = 'Monthly BaRCo Reports',
            mov_description = 'Verification of uploaded Monthly BaRCo Reports'
        WHERE item_id = '3_6_1_upload_1'
    """)

    # 3.5.1 - Remove "covering January to October 2023"
    op.execute("""
        UPDATE checklist_items
        SET label = 'EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the organization of BHERT'
        WHERE item_id = '3_5_1_upload'
    """)

    # 3.5.2 - Remove "covering CY 2023"
    op.execute("""
        UPDATE checklist_items
        SET label = 'Screenshot of the posting on social media with date',
            mov_description = 'Verification of uploaded screenshot showing social media posting with contact information and date (Option 2)'
        WHERE item_id = '3_5_2_b_upload'
    """)

    # 3.3.3 - Remove "in CY 2023"
    op.execute("""
        UPDATE checklist_items
        SET label = 'Copies of minutes of meetings with attendance sheets (at least 3 minutes covering meetings conducted)'
        WHERE item_id = '3_3_3_upload_1'
    """)

    # 3.4.1 - Remove "covering January to October 2023"
    op.execute("""
        UPDATE checklist_items
        SET label = 'EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the organization of the Barangay Tanod'
        WHERE item_id = '3_4_1_upload'
    """)

    # 3.3.2 - Update option groups for existing items
    op.execute("""
        UPDATE checklist_items
        SET option_group = 'Option A'
        WHERE item_id = '3_3_2_1_upload'
    """)

    op.execute("""
        UPDATE checklist_items
        SET option_group = 'Option B',
            display_order = 3
        WHERE item_id = '3_3_2_2_upload'
    """)


def downgrade() -> None:
    """Restore year references."""
    op.execute("""
        UPDATE checklist_items
        SET label = 'b. At least 50% fund utilization of the 70% component of BDRRMF - Preparedness component'
        WHERE item_id = '2_1_4_option_b'
    """)

    op.execute("""
        UPDATE checklist_items
        SET label = 'Monthly BaRCo Reports covering July-September 2023',
            mov_description = 'Verification of uploaded Monthly BaRCo Reports covering July-September 2023'
        WHERE item_id = '3_6_1_upload_1'
    """)

    op.execute("""
        UPDATE checklist_items
        SET label = 'EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the organization of BHERTs covering January to October 2023'
        WHERE item_id = '3_5_1_upload'
    """)

    op.execute("""
        UPDATE checklist_items
        SET label = 'Screenshot of the posting on social media with date covering CY 2023',
            mov_description = 'Verification of uploaded screenshot showing social media posting with contact information and date covering CY 2023 (Option 2)'
        WHERE item_id = '3_5_2_b_upload'
    """)

    op.execute("""
        UPDATE checklist_items
        SET label = 'Copies of minutes of meetings with attendance sheets (at least 3 minutes covering meetings conducted in CY 2023)'
        WHERE item_id = '3_3_3_upload_1'
    """)

    op.execute("""
        UPDATE checklist_items
        SET label = 'EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the organization of the Barangay Tanod covering January to October 2023'
        WHERE item_id = '3_4_1_upload'
    """)

    op.execute("""
        UPDATE checklist_items
        SET option_group = NULL
        WHERE item_id = '3_3_2_1_upload'
    """)

    op.execute("""
        UPDATE checklist_items
        SET option_group = NULL,
            display_order = 2
        WHERE item_id = '3_3_2_2_upload'
    """)
