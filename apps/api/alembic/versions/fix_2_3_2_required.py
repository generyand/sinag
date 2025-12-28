"""Fix required flags for indicator 2.3.2 checklist items.

The compliance engine uses `required=True` items for ALL_ITEMS_REQUIRED.
Indicator 2.3.2 mistakenly had all checklist items marked as required=False,
so a single checked item would auto-satisfy the rule. This migration sets all
checklist items for indicator 2.3.2 to required=True.
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "fix_2_3_2_required"
down_revision = "fix_1_6_2_val_rule"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE checklist_items
        SET required = TRUE
        WHERE indicator_id = (
            SELECT id FROM indicators WHERE indicator_code = '2.3.2'
        );
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE checklist_items
        SET required = FALSE
        WHERE indicator_id = (
            SELECT id FROM indicators WHERE indicator_code = '2.3.2'
        );
        """
    )
