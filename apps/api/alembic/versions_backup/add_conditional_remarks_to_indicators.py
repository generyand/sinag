"""add conditional remarks to indicators

Revision ID: zx9conditional01
Revises: ucz4sottgz50
Create Date: 2025-11-18 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "zx9conditional01"
down_revision: Union[str, None] = "d783d77dcb2c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add conditional_remarks to remark_schema for indicators that support "Considered" status.

    Based on SGLGB specifications:
    - Indicator 1.3.1: Approval of Barangay Budget (Consideration: until March 31, 2023)
    - Indicator 1.6.1.1: Deposit slips (Consideration)
    - Indicator 1.6.1.2: Bank statements (Consideration)
    - Indicator 4.2.1: Clustered Health Station (Consideration)
    """

    # Update indicator 1.3.1
    op.execute("""
        UPDATE indicators
        SET remark_schema = CAST(
            jsonb_set(
                COALESCE(CAST(remark_schema AS jsonb), '{}'::jsonb),
                '{conditional_remarks}',
                '[{"condition": "considered", "message": "Approval until March 31, 2023"}]'::jsonb
            ) AS json
        )
        WHERE indicator_code = '1.3.1'
    """)

    # Update indicator 1.6.1.1
    op.execute("""
        UPDATE indicators
        SET remark_schema = CAST(
            jsonb_set(
                COALESCE(CAST(remark_schema AS jsonb), '{}'::jsonb),
                '{conditional_remarks}',
                '[{"condition": "considered", "message": "In the absence of deposit slips, bank statements will be considered"}]'::jsonb
            ) AS json
        )
        WHERE indicator_code = '1.6.1.1'
    """)

    # Update indicator 1.6.1.2
    op.execute("""
        UPDATE indicators
        SET remark_schema = CAST(
            jsonb_set(
                COALESCE(CAST(remark_schema AS jsonb), '{}'::jsonb),
                '{conditional_remarks}',
                '[{"condition": "considered", "message": "In the absence of deposit slips, bank statements will be considered"}]'::jsonb
            ) AS json
        )
        WHERE indicator_code = '1.6.1.2'
    """)

    # Update indicator 4.2.1
    op.execute("""
        UPDATE indicators
        SET remark_schema = CAST(
            jsonb_set(
                COALESCE(CAST(remark_schema AS jsonb), '{}'::jsonb),
                '{conditional_remarks}',
                '[{"condition": "considered", "message": "Clustered Health Station/Center accessed by several barangays in a city/municipality"}]'::jsonb
            ) AS json
        )
        WHERE indicator_code = '4.2.1'
    """)


def downgrade() -> None:
    """Remove conditional_remarks from remark_schema."""

    # Remove conditional_remarks from all affected indicators
    op.execute("""
        UPDATE indicators
        SET remark_schema = CAST(
            (CAST(remark_schema AS jsonb) - 'conditional_remarks') AS json
        )
        WHERE indicator_code IN ('1.3.1', '1.6.1.1', '1.6.1.2', '4.2.1')
    """)
