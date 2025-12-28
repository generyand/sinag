"""Fix option groups and validation for indicator 6.2.1 (MRF/MRS).

- Set validation_rule to ANY_OPTION_GROUP_REQUIRED
- Assign option_group to upload fields:
  * upload_section_1 -> optA (Option A requires 1 upload)
  * upload_section_2/3/4 -> optB (Option B requires 3 uploads)
  * upload_section_5/6 -> optC (Option C requires 2 uploads)
- Mark these upload fields required so completeness checks work
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "fix_6_2_1_option_groups"
down_revision = "merge_all_heads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Update validation rule
    op.execute(
        """
        UPDATE indicators
        SET validation_rule = 'ANY_OPTION_GROUP_REQUIRED'
        WHERE indicator_code = '6.2.1';
        """
    )

    # Update file upload fields option_group and required flag in form_schema
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


def downgrade() -> None:
    # Revert validation rule
    op.execute(
        """
        UPDATE indicators
        SET validation_rule = 'OR_LOGIC_AT_LEAST_1_REQUIRED'
        WHERE indicator_code = '6.2.1';
        """
    )

    # Remove option_group and required flags (set required back to false) for these fields
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
