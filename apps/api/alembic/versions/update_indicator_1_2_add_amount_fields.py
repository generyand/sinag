"""update_indicator_1_2_add_amount_fields

Revision ID: update_1_2_amounts
Revises: f2862d42550b
Create Date: 2025-11-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'update_1_2_amounts'
down_revision: Union[str, Sequence[str], None] = 'f2862d42550b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add amount input fields to Indicator 1.2.1"""
    from sqlalchemy.orm import Session

    # Get database session
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Get the indicator 1.2.1 ID
        result = session.execute(
            sa.text("SELECT id FROM indicators WHERE indicator_code = '1.2.1'")
        )
        indicator_id = result.scalar_one_or_none()

        if not indicator_id:
            print("⚠️  Indicator 1.2.1 not found, skipping checklist item creation")
            return

        # Check if amount fields already exist
        existing_items = session.execute(
            sa.text("""
                SELECT checklist_item_id FROM checklist_items
                WHERE indicator_id = :indicator_id
                AND checklist_item_id IN ('1_2_1_amount_2022', '1_2_1_amount_2023')
            """),
            {"indicator_id": indicator_id}
        ).fetchall()

        if len(existing_items) >= 2:
            print("✅ Amount fields already exist, skipping")
            return

        # Insert CY 2022 amount field if not exists
        if not any(item[0] == '1_2_1_amount_2022' for item in existing_items):
            session.execute(
                sa.text("""
                    INSERT INTO checklist_items (
                        indicator_id,
                        checklist_item_id,
                        label,
                        mov_description,
                        required,
                        requires_document_count,
                        display_order
                    ) VALUES (
                        :indicator_id,
                        '1_2_1_amount_2022',
                        'Total amount obtained from local resources in CY 2022',
                        'Amount input field for CY 2022 local resources',
                        true,
                        true,
                        3
                    )
                """),
                {"indicator_id": indicator_id}
            )
            print("✅ Added CY 2022 amount field")

        # Insert CY 2023 amount field if not exists
        if not any(item[0] == '1_2_1_amount_2023' for item in existing_items):
            session.execute(
                sa.text("""
                    INSERT INTO checklist_items (
                        indicator_id,
                        checklist_item_id,
                        label,
                        mov_description,
                        required,
                        requires_document_count,
                        display_order
                    ) VALUES (
                        :indicator_id,
                        '1_2_1_amount_2023',
                        'Total amount obtained from local resources in CY 2023',
                        'Amount input field for CY 2023 local resources',
                        true,
                        true,
                        4
                    )
                """),
                {"indicator_id": indicator_id}
            )
            print("✅ Added CY 2023 amount field")

        session.commit()
        print("✅ Indicator 1.2 amount fields added successfully")

    except Exception as e:
        print(f"❌ Error updating indicator 1.2: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """Remove amount input fields from Indicator 1.2.1"""
    # Delete the amount checklist items
    op.execute("""
        DELETE FROM checklist_items
        WHERE checklist_item_id IN ('1_2_1_amount_2022', '1_2_1_amount_2023')
    """)
