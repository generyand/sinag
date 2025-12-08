"""Revert option group changes for indicator 6.2.1 (keep original OR logic).

This restores:
- validation_rule to OR_LOGIC_AT_LEAST_1_REQUIRED
- Removes option_group assignments and sets required back to false
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "revert_6_2_1_option_groups"
down_revision = "fix_6_2_1_option_groups"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Restore validation rule
    op.execute(
        """
        UPDATE indicators
        SET validation_rule = 'OR_LOGIC_AT_LEAST_1_REQUIRED'
        WHERE indicator_code = '6.2.1';
        """
    )

    # Remove option_group and set required to false for upload fields
    op.execute(
        """
        UPDATE indicators
        SET form_schema = jsonb_set(
            form_schema::jsonb,
            '{fields}',
            (
                SELECT jsonb_agg(
                    CASE f->>'field_id'
                        WHEN 'upload_section_1' THEN (f - 'option_group') || jsonb_build_object('required', false)
                        WHEN 'upload_section_2' THEN (f - 'option_group') || jsonb_build_object('required', false)
                        WHEN 'upload_section_3' THEN (f - 'option_group') || jsonb_build_object('required', false)
                        WHEN 'upload_section_4' THEN (f - 'option_group') || jsonb_build_object('required', false)
                        WHEN 'upload_section_5' THEN (f - 'option_group') || jsonb_build_object('required', false)
                        WHEN 'upload_section_6' THEN (f - 'option_group') || jsonb_build_object('required', false)
                        ELSE f
                    END
                )
                FROM jsonb_array_elements((form_schema::jsonb->'fields')) f
            )
        )::jsonb
        WHERE indicator_code = '6.2.1';
        """
    )


def downgrade() -> None:
    # Re-apply option groups and required flags (same as fix_6_2_1_option_groups)
    op.execute(
        """
        UPDATE indicators
        SET validation_rule = 'ANY_OPTION_GROUP_REQUIRED'
        WHERE indicator_code = '6.2.1';
        """
    )

    op.execute(
        """
        UPDATE indicators
        SET form_schema = jsonb_set(
            form_schema::jsonb,
            '{fields}',
            (
                SELECT jsonb_agg(
                    CASE f->>'field_id'
                        WHEN 'upload_section_1' THEN jsonb_set(jsonb_set(f, '{option_group}', '"optA"'), '{required}', 'true')
                        WHEN 'upload_section_2' THEN jsonb_set(jsonb_set(f, '{option_group}', '"optB"'), '{required}', 'true')
                        WHEN 'upload_section_3' THEN jsonb_set(jsonb_set(f, '{option_group}', '"optB"'), '{required}', 'true')
                        WHEN 'upload_section_4' THEN jsonb_set(jsonb_set(f, '{option_group}', '"optB"'), '{required}', 'true')
                        WHEN 'upload_section_5' THEN jsonb_set(jsonb_set(f, '{option_group}', '"optC"'), '{required}', 'true')
                        WHEN 'upload_section_6' THEN jsonb_set(jsonb_set(f, '{option_group}', '"optC"'), '{required}', 'true')
                        ELSE f
                    END
                )
                FROM jsonb_array_elements((form_schema::jsonb->'fields')) f
            )
        )::jsonb
        WHERE indicator_code = '6.2.1';
        """
    )

