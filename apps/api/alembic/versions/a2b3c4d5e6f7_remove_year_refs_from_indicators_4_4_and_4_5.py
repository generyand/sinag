"""Remove year references from indicators 4.4 and 4.5

Revision ID: a2b3c4d5e6f7
Revises: f7e8d9c0b1a2
Create Date: 2025-12-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = 'f7e8d9c0b1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ==========================================
    # UPDATE CHECKLIST_ITEMS TABLE
    # ==========================================

    # 4.4.1 - Remove "covering January to October 2023" from checklist item label
    op.execute("""
        UPDATE checklist_items
        SET label = 'EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) designating a KDO to manage the Kasambahay Desk, signed by the PB, Barangay Secretary and SBMs'
        WHERE item_id = '4_4_1_eo'
        AND label LIKE '%covering January to October 2023%'
    """)

    # 4.4.2 - Remove "(July-September 2023)" from checklist item label
    op.execute("""
        UPDATE checklist_items
        SET label = 'Copy of the Updated Kasambahay Report for the 3rd Quarter'
        WHERE item_id = '4_4_2_report'
        AND label LIKE '%(July-September 2023)%'
    """)

    # 4.5.1 - Remove "covering January to October 2023" from checklist item label
    op.execute("""
        UPDATE checklist_items
        SET label = 'EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the establishment of BCPC'
        WHERE item_id = '4_5_1_a'
        AND label LIKE '%covering January to October 2023%'
    """)

    # 4.5.3 - Remove "for CY 2023" from checklist item label
    op.execute("""
        UPDATE checklist_items
        SET label = 'Approved BCPC Annual Work and Financial Plan (AWFP)'
        WHERE item_id = '4_5_3_a'
        AND label LIKE '%for CY 2023%'
    """)

    # 4.5.4 - Remove "covering January to October 31, 2023" from checklist item label
    op.execute("""
        UPDATE checklist_items
        SET label = 'Copy of the generated report or screenshot of the updated database on children'
        WHERE item_id = '4_5_4_a'
        AND label LIKE '%covering January to October 31, 2023%'
    """)

    # 4.5.6 - Remove "for CY 2023" from checklist item labels
    op.execute("""
        UPDATE checklist_items
        SET label = 'Approved Accomplishment Report on BCPC AWFP with received stamp by the City/Municipality Inter-Agency Monitoring Task Force (IMTF)'
        WHERE item_id = '4_5_6_upload'
        AND label LIKE '%for CY 2023%'
    """)

    op.execute("""
        UPDATE checklist_items
        SET label = 'b. At least 50% utilization rate of BCPC AWFP Budget'
        WHERE item_id = '4_5_6_b'
        AND label LIKE '%CY 2023%'
    """)

    # ==========================================
    # UPDATE INDICATORS TABLE - form_schema JSON
    # ==========================================

    # Update form_schema.upload_instructions for each indicator
    # Using PostgreSQL JSONB replace functions

    # 4.4.1 - Remove "covering January to October 2023" from form_schema
    op.execute("""
        UPDATE indicators
        SET form_schema = jsonb_set(
            form_schema::jsonb,
            '{upload_instructions}',
            to_jsonb(replace(
                form_schema->>'upload_instructions',
                'covering January to October 2023',
                ''
            ))
        )
        WHERE indicator_code = '4.4.1'
        AND form_schema->>'upload_instructions' LIKE '%covering January to October 2023%'
    """)

    # 4.4.2 - Remove "(July-September 2023)" from form_schema
    op.execute("""
        UPDATE indicators
        SET form_schema = jsonb_set(
            form_schema::jsonb,
            '{upload_instructions}',
            to_jsonb(replace(
                form_schema->>'upload_instructions',
                '(July-September 2023)',
                ''
            ))
        )
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
                    FROM jsonb_array_elements(form_schema->'fields') AS field
                )
            )
        )
        WHERE indicator_code = '4.4.2'
        AND form_schema->'fields' IS NOT NULL
    """)

    # 4.5.1 - Remove "covering January to October 2023" from form_schema
    op.execute("""
        UPDATE indicators
        SET form_schema = jsonb_set(
            form_schema::jsonb,
            '{upload_instructions}',
            to_jsonb(replace(
                form_schema->>'upload_instructions',
                'covering January to October 2023',
                ''
            ))
        )
        WHERE indicator_code = '4.5.1'
        AND form_schema->>'upload_instructions' LIKE '%covering January to October 2023%'
    """)

    # 4.5.3 - Remove "for CY 2023" from form_schema
    op.execute("""
        UPDATE indicators
        SET form_schema = jsonb_set(
            form_schema::jsonb,
            '{upload_instructions}',
            to_jsonb(replace(
                form_schema->>'upload_instructions',
                'for CY 2023',
                ''
            ))
        )
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
                    FROM jsonb_array_elements(form_schema->'fields') AS field
                )
            )
        )
        WHERE indicator_code = '4.5.3'
        AND form_schema->'fields' IS NOT NULL
    """)

    # 4.5.4 - Remove "covering January to October 31, 2023" from form_schema
    op.execute("""
        UPDATE indicators
        SET form_schema = jsonb_set(
            form_schema::jsonb,
            '{upload_instructions}',
            to_jsonb(replace(
                form_schema->>'upload_instructions',
                'covering January to October 31, 2023',
                ''
            ))
        )
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
                    FROM jsonb_array_elements(form_schema->'fields') AS field
                )
            )
        )
        WHERE indicator_code = '4.5.4'
        AND form_schema->'fields' IS NOT NULL
    """)

    # 4.5.6 - Remove "for CY 2023" from form_schema upload_instructions
    op.execute("""
        UPDATE indicators
        SET form_schema = jsonb_set(
            form_schema::jsonb,
            '{upload_instructions}',
            to_jsonb(replace(
                form_schema->>'upload_instructions',
                'for CY 2023',
                ''
            ))
        )
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
                    FROM jsonb_array_elements(form_schema->'fields') AS field
                )
            )
        )
        WHERE indicator_code = '4.5.6'
        AND form_schema->'fields' IS NOT NULL
    """)


def downgrade() -> None:
    # ==========================================
    # RESTORE CHECKLIST_ITEMS TABLE
    # ==========================================

    # 4.4.1 - Restore year references
    op.execute("""
        UPDATE checklist_items
        SET label = 'EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) designating a KDO to manage the Kasambahay Desk, signed by the PB, Barangay Secretary and SBMs covering January to October 2023'
        WHERE item_id = '4_4_1_eo'
    """)

    # 4.4.2 - Restore year references
    op.execute("""
        UPDATE checklist_items
        SET label = 'Copy of the Updated Kasambahay Report for the 3rd Quarter (July-September 2023)'
        WHERE item_id = '4_4_2_report'
    """)

    # 4.5.1 - Restore year references
    op.execute("""
        UPDATE checklist_items
        SET label = 'EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the establishment of BCPC covering January to October 2023'
        WHERE item_id = '4_5_1_a'
    """)

    # 4.5.3 - Restore year references
    op.execute("""
        UPDATE checklist_items
        SET label = 'Approved BCPC Annual Work and Financial Plan (AWFP) for CY 2023'
        WHERE item_id = '4_5_3_a'
    """)

    # 4.5.4 - Restore year references
    op.execute("""
        UPDATE checklist_items
        SET label = 'Copy of the generated report or screenshot of the updated database on children covering January to October 31, 2023'
        WHERE item_id = '4_5_4_a'
    """)

    # 4.5.6 - Restore year references
    op.execute("""
        UPDATE checklist_items
        SET label = 'Approved Accomplishment Report on BCPC AWFP for CY 2023 with received stamp by the City/Municipality Inter-Agency Monitoring Task Force (IMTF)'
        WHERE item_id = '4_5_6_upload'
    """)

    op.execute("""
        UPDATE checklist_items
        SET label = 'b. At least 50% utilization rate of CY 2023 BCPC AWFP Budget'
        WHERE item_id = '4_5_6_b'
    """)

    # Note: form_schema downgrade is not implemented as it's complex
    # If needed, re-seed the indicators from Python definitions
