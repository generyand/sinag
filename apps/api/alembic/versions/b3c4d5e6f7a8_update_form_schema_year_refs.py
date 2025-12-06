"""Update form_schema to remove year references from indicators 4.4 and 4.5

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2025-12-06 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ==========================================
    # UPDATE INDICATORS TABLE - form_schema JSON
    # Note: form_schema is JSON type, need to cast to jsonb for operations
    # ==========================================

    # 4.4.1 - Remove "covering January to October 2023" from form_schema
    op.execute("""
        UPDATE indicators
        SET form_schema = (
            SELECT jsonb_set(
                form_schema::jsonb,
                '{upload_instructions}',
                to_jsonb(replace(
                    form_schema->>'upload_instructions',
                    'covering January to October 2023',
                    ''
                ))
            )
        )::json
        WHERE indicator_code = '4.4.1'
        AND form_schema->>'upload_instructions' LIKE '%covering January to October 2023%'
    """)

    # Also update the fields array labels in form_schema for 4.4.1
    op.execute("""
        UPDATE indicators
        SET form_schema = (
            SELECT jsonb_set(
                form_schema::jsonb,
                '{fields}',
                (
                    SELECT jsonb_agg(
                        CASE
                            WHEN field->>'label' LIKE '%covering January to October 2023%'
                            THEN jsonb_set(field, '{label}', to_jsonb(replace(field->>'label', 'covering January to October 2023', '')))
                            ELSE field
                        END
                    )
                    FROM jsonb_array_elements(form_schema::jsonb->'fields') AS field
                )
            )
        )::json
        WHERE indicator_code = '4.4.1'
        AND form_schema::jsonb->'fields' IS NOT NULL
    """)

    # 4.4.2 - Remove "(July-September 2023)" from form_schema
    op.execute("""
        UPDATE indicators
        SET form_schema = (
            SELECT jsonb_set(
                form_schema::jsonb,
                '{upload_instructions}',
                to_jsonb(replace(
                    form_schema->>'upload_instructions',
                    '(July-September 2023)',
                    ''
                ))
            )
        )::json
        WHERE indicator_code = '4.4.2'
        AND form_schema->>'upload_instructions' LIKE '%(July-September 2023)%'
    """)

    # Also update the fields array labels in form_schema for 4.4.2
    op.execute("""
        UPDATE indicators
        SET form_schema = (
            SELECT jsonb_set(
                form_schema::jsonb,
                '{fields}',
                (
                    SELECT jsonb_agg(
                        CASE
                            WHEN field->>'label' LIKE '%(July-September 2023)%'
                            THEN jsonb_set(field, '{label}', to_jsonb(replace(field->>'label', '(July-September 2023)', '')))
                            ELSE field
                        END
                    )
                    FROM jsonb_array_elements(form_schema::jsonb->'fields') AS field
                )
            )
        )::json
        WHERE indicator_code = '4.4.2'
        AND form_schema::jsonb->'fields' IS NOT NULL
    """)

    # 4.5.1 - Remove "covering January to October 2023" from form_schema
    op.execute("""
        UPDATE indicators
        SET form_schema = (
            SELECT jsonb_set(
                form_schema::jsonb,
                '{upload_instructions}',
                to_jsonb(replace(
                    form_schema->>'upload_instructions',
                    'covering January to October 2023',
                    ''
                ))
            )
        )::json
        WHERE indicator_code = '4.5.1'
        AND form_schema->>'upload_instructions' LIKE '%covering January to October 2023%'
    """)

    # Also update the fields array labels in form_schema for 4.5.1
    op.execute("""
        UPDATE indicators
        SET form_schema = (
            SELECT jsonb_set(
                form_schema::jsonb,
                '{fields}',
                (
                    SELECT jsonb_agg(
                        CASE
                            WHEN field->>'label' LIKE '%covering January to October 2023%'
                            THEN jsonb_set(field, '{label}', to_jsonb(replace(field->>'label', 'covering January to October 2023', '')))
                            ELSE field
                        END
                    )
                    FROM jsonb_array_elements(form_schema::jsonb->'fields') AS field
                )
            )
        )::json
        WHERE indicator_code = '4.5.1'
        AND form_schema::jsonb->'fields' IS NOT NULL
    """)

    # 4.5.3 - Remove "for CY 2023" from form_schema
    op.execute("""
        UPDATE indicators
        SET form_schema = (
            SELECT jsonb_set(
                form_schema::jsonb,
                '{upload_instructions}',
                to_jsonb(replace(
                    form_schema->>'upload_instructions',
                    'for CY 2023',
                    ''
                ))
            )
        )::json
        WHERE indicator_code = '4.5.3'
        AND form_schema->>'upload_instructions' LIKE '%for CY 2023%'
    """)

    # Also update the fields array labels in form_schema for 4.5.3
    op.execute("""
        UPDATE indicators
        SET form_schema = (
            SELECT jsonb_set(
                form_schema::jsonb,
                '{fields}',
                (
                    SELECT jsonb_agg(
                        CASE
                            WHEN field->>'label' LIKE '%for CY 2023%'
                            THEN jsonb_set(field, '{label}', to_jsonb(replace(field->>'label', 'for CY 2023', '')))
                            ELSE field
                        END
                    )
                    FROM jsonb_array_elements(form_schema::jsonb->'fields') AS field
                )
            )
        )::json
        WHERE indicator_code = '4.5.3'
        AND form_schema::jsonb->'fields' IS NOT NULL
    """)

    # 4.5.4 - Remove "covering January to October 31, 2023" from form_schema
    op.execute("""
        UPDATE indicators
        SET form_schema = (
            SELECT jsonb_set(
                form_schema::jsonb,
                '{upload_instructions}',
                to_jsonb(replace(
                    form_schema->>'upload_instructions',
                    'covering January to October 31, 2023',
                    ''
                ))
            )
        )::json
        WHERE indicator_code = '4.5.4'
        AND form_schema->>'upload_instructions' LIKE '%covering January to October 31, 2023%'
    """)

    # Also update the fields array labels in form_schema for 4.5.4
    op.execute("""
        UPDATE indicators
        SET form_schema = (
            SELECT jsonb_set(
                form_schema::jsonb,
                '{fields}',
                (
                    SELECT jsonb_agg(
                        CASE
                            WHEN field->>'label' LIKE '%covering January to October 31, 2023%'
                            THEN jsonb_set(field, '{label}', to_jsonb(replace(field->>'label', 'covering January to October 31, 2023', '')))
                            ELSE field
                        END
                    )
                    FROM jsonb_array_elements(form_schema::jsonb->'fields') AS field
                )
            )
        )::json
        WHERE indicator_code = '4.5.4'
        AND form_schema::jsonb->'fields' IS NOT NULL
    """)

    # 4.5.6 - Remove "for CY 2023" from form_schema upload_instructions
    op.execute("""
        UPDATE indicators
        SET form_schema = (
            SELECT jsonb_set(
                form_schema::jsonb,
                '{upload_instructions}',
                to_jsonb(replace(
                    form_schema->>'upload_instructions',
                    'for CY 2023',
                    ''
                ))
            )
        )::json
        WHERE indicator_code = '4.5.6'
        AND form_schema->>'upload_instructions' LIKE '%for CY 2023%'
    """)

    # Also update the fields array labels in form_schema for 4.5.6 (CY 2023 references)
    op.execute("""
        UPDATE indicators
        SET form_schema = (
            SELECT jsonb_set(
                form_schema::jsonb,
                '{fields}',
                (
                    SELECT jsonb_agg(
                        CASE
                            WHEN field->>'label' LIKE '%CY 2023%'
                            THEN jsonb_set(field, '{label}', to_jsonb(replace(field->>'label', 'CY 2023 ', '')))
                            WHEN field->>'label' LIKE '%for CY 2023%'
                            THEN jsonb_set(field, '{label}', to_jsonb(replace(field->>'label', 'for CY 2023', '')))
                            ELSE field
                        END
                    )
                    FROM jsonb_array_elements(form_schema::jsonb->'fields') AS field
                )
            )
        )::json
        WHERE indicator_code = '4.5.6'
        AND form_schema::jsonb->'fields' IS NOT NULL
    """)


def downgrade() -> None:
    # Note: form_schema downgrade is not implemented as it's complex
    # If needed, re-seed the indicators from Python definitions
    pass
