"""Remove year references from indicators 4.1.6, 4.2.2, 4.3.1-4.3.4

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2025-12-06 13:00:00.000000

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, None] = "b3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ==========================================
    # 4.1.6 - GAD Accomplishment Report, GAD Budget
    # ==========================================

    # Update checklist_items labels
    op.execute("""
        UPDATE checklist_items
        SET label = 'GAD Accomplishment Report',
            mov_description = 'Verification of uploaded GAD Accomplishment Report'
        WHERE item_id = '4_1_6_report'
    """)

    op.execute("""
        UPDATE checklist_items
        SET label = 'Certification on the submitted GAD Accomplishment Report indicating at least 50% accomplishment of the physical targets in the GAD Plan signed by the C/MSWDO or C/MLGOO'
        WHERE item_id = '4_1_6_cert_physical'
    """)

    op.execute("""
        UPDATE checklist_items
        SET label = 'b. At least 50% fund utilization of the GAD Budget'
        WHERE item_id = '4_1_6_option_b'
    """)

    op.execute("""
        UPDATE checklist_items
        SET label = 'Certification on the submitted GAD Accomplishment Report indicating at least 50% fund utilization of the GAD Budget signed by the C/MSWDO or C/MLGOO'
        WHERE item_id = '4_1_6_cert_financial'
    """)

    # Update form_schema for 4.1.6
    op.execute("""
        UPDATE indicators
        SET form_schema = (
            SELECT jsonb_set(
                form_schema::jsonb,
                '{upload_instructions}',
                to_jsonb(replace(replace(replace(
                    form_schema->>'upload_instructions',
                    '2023 GAD Accomplishment Report', 'GAD Accomplishment Report'),
                    'CY 2023 GAD Accomplishment Report', 'GAD Accomplishment Report'),
                    'CY 2023 GAD Budget', 'GAD Budget'
                ))
            )
        )::json
        WHERE indicator_code = '4.1.6'
        AND form_schema IS NOT NULL
    """)

    # Update fields array in form_schema for 4.1.6
    op.execute("""
        UPDATE indicators
        SET form_schema = (
            SELECT jsonb_set(
                form_schema::jsonb,
                '{fields}',
                (
                    SELECT jsonb_agg(
                        CASE
                            WHEN field->>'label' LIKE '%2023 GAD%' OR field->>'label' LIKE '%CY 2023%'
                            THEN jsonb_set(field, '{label}', to_jsonb(replace(replace(replace(
                                field->>'label',
                                '2023 GAD Accomplishment Report', 'GAD Accomplishment Report'),
                                'CY 2023 GAD Accomplishment Report', 'GAD Accomplishment Report'),
                                'CY 2023 GAD Budget', 'GAD Budget'
                            )))
                            ELSE field
                        END
                    )
                    FROM jsonb_array_elements(form_schema::jsonb->'fields') AS field
                )
            )
        )::json
        WHERE indicator_code = '4.1.6'
        AND form_schema::jsonb->'fields' IS NOT NULL
    """)

    # ==========================================
    # 4.2.2 - Remove "covering January to October 2023"
    # ==========================================

    op.execute("""
        UPDATE checklist_items
        SET label = 'EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the Appointment of BHW'
        WHERE item_id = '4_2_2_bhw'
    """)

    op.execute("""
        UPDATE checklist_items
        SET label = 'EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) on the Appointment of BHO or BHAsst'
        WHERE item_id = '4_2_2_bho'
    """)

    # Update form_schema for 4.2.2
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
        WHERE indicator_code = '4.2.2'
        AND form_schema->>'upload_instructions' LIKE '%covering January to October 2023%'
    """)

    # Update fields array in form_schema for 4.2.2
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
        WHERE indicator_code = '4.2.2'
        AND form_schema::jsonb->'fields' IS NOT NULL
    """)

    # ==========================================
    # 4.3.1 - Remove "covering January to October 2023"
    # ==========================================

    op.execute("""
        UPDATE checklist_items
        SET label = 'EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing/reconstituting the BDC with its composition compliant to Section 107 of RA 7160'
        WHERE item_id = '4_3_1_upload_1'
    """)

    # Update form_schema for 4.3.1
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
        WHERE indicator_code = '4.3.1'
        AND form_schema->>'upload_instructions' LIKE '%covering January to October 2023%'
    """)

    # Update fields array for 4.3.1
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
        WHERE indicator_code = '4.3.1'
        AND form_schema::jsonb->'fields' IS NOT NULL
    """)

    # ==========================================
    # 4.3.2 - Remove "covering CY 2023"
    # ==========================================

    op.execute("""
        UPDATE checklist_items
        SET label = 'Post activity report or Minutes with attendance sheet',
            mov_description = 'Verification of uploaded Post activity report or Minutes with attendance sheet'
        WHERE item_id = '4_3_2_upload_1'
    """)

    # Update form_schema for 4.3.2
    op.execute("""
        UPDATE indicators
        SET form_schema = (
            SELECT jsonb_set(
                form_schema::jsonb,
                '{upload_instructions}',
                to_jsonb(replace(replace(
                    form_schema->>'upload_instructions',
                    ', covering CY 2023', ''),
                    'covering CY 2023', ''
                ))
            )
        )::json
        WHERE indicator_code = '4.3.2'
        AND form_schema->>'upload_instructions' LIKE '%CY 2023%'
    """)

    # Update fields array for 4.3.2
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
                            THEN jsonb_set(field, '{label}', to_jsonb(replace(replace(field->>'label', ', covering CY 2023', ''), 'covering CY 2023', '')))
                            ELSE field
                        END
                    )
                    FROM jsonb_array_elements(form_schema::jsonb->'fields') AS field
                )
            )
        )::json
        WHERE indicator_code = '4.3.2'
        AND form_schema::jsonb->'fields' IS NOT NULL
    """)

    # ==========================================
    # 4.3.3 - Remove "covering CY 2023"
    # ==========================================

    op.execute("""
        UPDATE checklist_items
        SET label = 'a. Approved Barangay Development Plan; and',
            mov_description = 'Verification of uploaded Approved Barangay Development Plan'
        WHERE item_id = '4_3_3_upload_1'
    """)

    # Update form_schema for 4.3.3
    op.execute("""
        UPDATE indicators
        SET form_schema = (
            SELECT jsonb_set(
                form_schema::jsonb,
                '{upload_instructions}',
                to_jsonb(replace(
                    form_schema->>'upload_instructions',
                    'covering CY 2023',
                    ''
                ))
            )
        )::json
        WHERE indicator_code = '4.3.3'
        AND form_schema->>'upload_instructions' LIKE '%CY 2023%'
    """)

    # Update fields array for 4.3.3
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
                            THEN jsonb_set(field, '{label}', to_jsonb(replace(field->>'label', 'covering CY 2023', '')))
                            ELSE field
                        END
                    )
                    FROM jsonb_array_elements(form_schema::jsonb->'fields') AS field
                )
            )
        )::json
        WHERE indicator_code = '4.3.3'
        AND form_schema::jsonb->'fields' IS NOT NULL
    """)

    # ==========================================
    # 4.3.4 - Remove "CY 2023" references
    # ==========================================

    op.execute("""
        UPDATE checklist_items
        SET label = '(PHYSICAL or/and FINANCIAL) Accomplishment Report with received stamp by the C/MPDC',
            mov_description = 'Verification of uploaded Accomplishment Report (PHYSICAL or/and FINANCIAL)'
        WHERE item_id = '4_3_4_upload'
    """)

    op.execute("""
        UPDATE checklist_items
        SET label = 'b. At least 50% fund utilization rate of the BDP Budget'
        WHERE item_id = '4_3_4_option_b'
    """)

    # Update form_schema for 4.3.4
    op.execute("""
        UPDATE indicators
        SET form_schema = (
            SELECT jsonb_set(
                form_schema::jsonb,
                '{upload_instructions}',
                to_jsonb(replace(
                    form_schema->>'upload_instructions',
                    'CY 2023 ',
                    ''
                ))
            )
        )::json
        WHERE indicator_code = '4.3.4'
        AND form_schema->>'upload_instructions' LIKE '%CY 2023%'
    """)

    # Update fields array for 4.3.4
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
                            ELSE field
                        END
                    )
                    FROM jsonb_array_elements(form_schema::jsonb->'fields') AS field
                )
            )
        )::json
        WHERE indicator_code = '4.3.4'
        AND form_schema::jsonb->'fields' IS NOT NULL
    """)


def downgrade() -> None:
    # Note: Downgrade is complex due to multiple replacements
    # If needed, re-seed the indicators from Python definitions
    pass
