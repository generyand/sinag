"""fix_indicator_4_1_and_add_3_3_2_or_separator

Revision ID: 4eedf1a978f5
Revises: 9e0b79a6a6d5
Create Date: 2025-12-06 10:43:12.468881

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "4eedf1a978f5"
down_revision: Union[str, Sequence[str], None] = "9e0b79a6a6d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix indicator 4.1 year references and add 3.3.2 OR separator."""
    # 4.1.1 - Remove "covering January to October 2023"
    op.execute("""
        UPDATE checklist_items
        SET label = 'EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the establishment of Barangay VAW Desk and designated VAW Desk Officer'
        WHERE item_id = '4_1_1_upload_1'
    """)

    # 4.1.3 - Remove "for CY 2023"
    op.execute("""
        UPDATE checklist_items
        SET label = 'Approved Barangay GAD Plan and Budget',
            mov_description = 'Verification of uploaded Approved Barangay Gender and Development (GAD) Plan and Budget'
        WHERE item_id = '4_1_3_upload_1'
    """)

    # 4.1.4 - Remove "of CY 2023"
    op.execute("""
        UPDATE checklist_items
        SET label = 'Accomplishment Report covering 1st to 3rd quarter with received stamp by the C/MSWDO and C/MLGOO'
        WHERE item_id = '4_1_4_upload_1'
    """)

    # 3.3.2 - Insert OR separator (if not exists)
    op.execute("""
        INSERT INTO checklist_items (indicator_id, item_id, label, mov_description, item_type, required, display_order, option_group)
        SELECT
            indicator_id,
            '3_3_2_or_separator',
            'OR',
            'OR',
            'info_text',
            false,
            2,
            NULL
        FROM checklist_items
        WHERE item_id = '3_3_2_1_upload'
        AND NOT EXISTS (
            SELECT 1 FROM checklist_items WHERE item_id = '3_3_2_or_separator'
        )
    """)


def downgrade() -> None:
    """Restore year references and remove OR separator."""
    op.execute("""
        UPDATE checklist_items
        SET label = 'EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the establishment of Barangay VAW Desk and designated VAW Desk Officer covering January to October 2023'
        WHERE item_id = '4_1_1_upload_1'
    """)

    op.execute("""
        UPDATE checklist_items
        SET label = 'Approved Barangay GAD Plan and Budget for CY 2023',
            mov_description = 'Verification of uploaded Approved Barangay Gender and Development (GAD) Plan and Budget for CY 2023'
        WHERE item_id = '4_1_3_upload_1'
    """)

    op.execute("""
        UPDATE checklist_items
        SET label = 'Accomplishment Report covering 1st to 3rd quarter of CY 2023 with received stamp by the C/MSWDO and C/MLGOO'
        WHERE item_id = '4_1_4_upload_1'
    """)

    op.execute("""
        DELETE FROM checklist_items WHERE item_id = '3_3_2_or_separator'
    """)
