"""add_unique_constraint_assessment_indicator

Revision ID: a0799e8cc38c
Revises: 659d6215f301
Create Date: 2025-12-01 22:55:49.579313

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "a0799e8cc38c"
down_revision: Union[str, Sequence[str], None] = "659d6215f301"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Add unique constraint on (assessment_id, indicator_id) to prevent
    duplicate responses for the same indicator in an assessment.
    """
    op.create_unique_constraint(
        "uq_assessment_responses_assessment_indicator",
        "assessment_responses",
        ["assessment_id", "indicator_id"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "uq_assessment_responses_assessment_indicator",
        "assessment_responses",
        type_="unique",
    )
