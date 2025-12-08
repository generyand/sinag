"""Fix 6.2.1 with option groups but flat UI (no accordion).

Revision ID: fix_6_2_1_flat_ui
Revises: revert_6_2_1_option_groups
Create Date: 2025-01-01

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "fix_6_2_1_flat_ui"
down_revision: Union[str, Sequence[str], None] = "revert_6_2_1_option_groups"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Update indicator 6.2.1:
    # 1. Set validation_rule to ANY_OPTION_GROUP_REQUIRED (for completion calculation)
    # 2. Add option_group to each upload field (for grouping in completion logic)
    # 3. Add use_accordion_ui: false to keep flat UI

    # First, update validation_rule
    op.execute(
        """
        UPDATE indicators
        SET validation_rule = 'ANY_OPTION_GROUP_REQUIRED'
        WHERE indicator_code = '6.2.1';
        """
    )

    # Update form_schema: add use_accordion_ui: false at root level
    op.execute(
        """
        UPDATE indicators
        SET form_schema = (form_schema::jsonb || '{"use_accordion_ui": false}')::json
        WHERE indicator_code = '6.2.1';
        """
    )

    # Update each upload field with option_group
    # Option A: upload_section_1 (1 field)
    # Option B: upload_section_2, upload_section_3, upload_section_4 (3 fields)
    # Option C: upload_section_5, upload_section_6 (2 fields)
    op.execute(
        """
        UPDATE indicators
        SET form_schema = (
            SELECT jsonb_set(
                form_schema::jsonb,
                '{fields}',
                (
                    SELECT jsonb_agg(
                        CASE f->>'field_id'
                            WHEN 'upload_section_1' THEN f::jsonb || '{"option_group": "optA"}'
                            WHEN 'upload_section_2' THEN f::jsonb || '{"option_group": "optB"}'
                            WHEN 'upload_section_3' THEN f::jsonb || '{"option_group": "optB"}'
                            WHEN 'upload_section_4' THEN f::jsonb || '{"option_group": "optB"}'
                            WHEN 'upload_section_5' THEN f::jsonb || '{"option_group": "optC"}'
                            WHEN 'upload_section_6' THEN f::jsonb || '{"option_group": "optC"}'
                            ELSE f::jsonb
                        END
                    )
                    FROM jsonb_array_elements(form_schema::jsonb->'fields') f
                )
            )::json
        )
        WHERE indicator_code = '6.2.1';
        """
    )


def downgrade() -> None:
    # Revert to OR_LOGIC_AT_LEAST_1_REQUIRED
    op.execute(
        """
        UPDATE indicators
        SET validation_rule = 'OR_LOGIC_AT_LEAST_1_REQUIRED'
        WHERE indicator_code = '6.2.1';
        """
    )

    # Remove use_accordion_ui flag
    op.execute(
        """
        UPDATE indicators
        SET form_schema = (form_schema::jsonb - 'use_accordion_ui')::json
        WHERE indicator_code = '6.2.1';
        """
    )

    # Remove option_group from fields
    op.execute(
        """
        UPDATE indicators
        SET form_schema = (
            SELECT jsonb_set(
                form_schema::jsonb,
                '{fields}',
                (
                    SELECT jsonb_agg(f::jsonb - 'option_group')
                    FROM jsonb_array_elements(form_schema::jsonb->'fields') f
                )
            )::json
        )
        WHERE indicator_code = '6.2.1';
        """
    )
