"""remove_year_references_from_indicators_v2

Revision ID: 2e73cc62d5dd
Revises: a1b2c3d4e5f6
Create Date: 2025-12-06 10:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2e73cc62d5dd"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove year references from indicator labels and descriptions to make them dynamic."""
    conn = op.get_bind()

    # Update checklist_items table - label column
    label_updates = [
        # 1.1.1
        (
            "1_1_1_f",
            "f. List of Notices of Award (1st - 3rd Quarter of CY 2023)",
            "f. List of Notices of Award (1st - 3rd Quarter)",
        ),
        (
            "1_1_1_g",
            "g. Itemized Monthly Collections and Disbursements (January to September 2023)",
            "g. Itemized Monthly Collections and Disbursements (January to September)",
        ),
        # 1.6.1.1
        (
            "1_6_1_1_b",
            "b) Proof of deposit reflecting the Account No./Name of Barangay SK and the total allocated amount for the 2023 SK funds",
            "b) Proof of deposit reflecting the Account No./Name of Barangay SK and the total allocated amount for SK funds",
        ),
        # 1.6.1.2
        (
            "1_6_1_2_deposit",
            "Deposit slips reflecting the Account No./Name of Barangay SK and the total allocated amount for the 2023 SK funds",
            "Deposit slips reflecting the Account No./Name of Barangay SK and the total allocated amount for SK funds",
        ),
        # 1.6.2
        (
            "1_6_2_5above_a",
            "Approved Resolution approving the 2023 SK Annual/Supplemental Budget",
            "Approved Resolution approving the SK Annual/Supplemental Budget",
        ),
        (
            "1_6_2_5above_b",
            "An Approved 2023 ABYIP signed by the SK Chairperson and its members",
            "An Approved ABYIP signed by the SK Chairperson and its members",
        ),
        # 1.7.1
        (
            "1_7_1_upload_1",
            "Post Activity Report/ Minutes on the conduct of the 1st semester Barangay Assembly 2023 duly approved by the Punong Barangay",
            "Post Activity Report/ Minutes on the conduct of the 1st semester Barangay Assembly duly approved by the Punong Barangay",
        ),
        # 2.1.1
        (
            "2_1_1_eo",
            "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the BDRRMC with its composition compliant to the provisions of JMC No. 2014-01, covering January to October 2023",
            "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the BDRRMC with its composition compliant to the provisions of JMC No. 2014-01",
        ),
        # 2.1.2
        (
            "2_1_2_certification",
            "Certification on the list of barangays with approved BDRRM Plan covering CY 2023 signed by the C/MDRRMO",
            "Certification on the list of barangays with approved BDRRM Plan signed by the C/MDRRMO",
        ),
        # 2.1.4
        (
            "2_1_4_option_b",
            "b. At least 50% fund utilization of the 70% component of CY 2023 BDRRMF - Preparedness component as of December 31, 2023",
            "b. At least 50% fund utilization of the 70% component of BDRRMF - Preparedness component",
        ),
        (
            "2_1_4_financial_utilized",
            "Total amount utilized (as of Dec. 31, 2023)",
            "Total amount utilized",
        ),
        (
            "2_1_4_financial_allocated",
            "Total amount allocated for PPAs in the BDRRM Plan for CY 2023",
            "Total amount allocated for PPAs in the BDRRMF Plan",
        ),
        # 3.1.1
        (
            "3_1_1_upload",
            "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) creating the BADAC with its composition and appropriate committees, covering January to October 2023",
            "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) creating the BADAC with its composition and appropriate committees",
        ),
        # 3.1.2
        (
            "3_1_2_a",
            "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) establishing the Rehabilitation Referral Desk covering CY 2023",
            "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) establishing the Rehabilitation Referral Desk",
        ),
        # 3.1.5
        (
            "3_1_5_a",
            "Copy of approved BADPA Summary or copy of approved BPOPs Plan with BADPA covering CY 2023",
            "Copy of approved BADPA Summary or copy of approved BPOPs Plan with BADPA",
        ),
        # 3.1.10
        (
            "3_1_10_a",
            "Copy of the BADAC monthly minutes of the meeting with attendance sheets (at least 3 minutes covering CY 2023)",
            "Copy of the BADAC monthly minutes of the meeting with attendance sheets (at least 3 minutes)",
        ),
        # 3.2.1
        (
            "3_2_1_upload",
            "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) indicating correct membership in accordance to the EO 366 s. of 1996, covering January to October 2023",
            "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) indicating correct membership in accordance to the EO 366 s. of 1996",
        ),
        # 3.2.2
        (
            "3_2_2_upload_1",
            "Approved BPOPS Plan, covering CY 2023",
            "Approved BPOPS Plan",
        ),
    ]

    for item_id, old_label, new_label in label_updates:
        conn.execute(
            sa.text("""
                UPDATE checklist_items
                SET label = :new_label
                WHERE item_id = :item_id AND label = :old_label
            """),
            {"item_id": item_id, "old_label": old_label, "new_label": new_label},
        )

    # Update mov_description for specific items
    mov_updates = [
        # 1.1.1
        (
            "1_1_1_f",
            "List of Notices of Award (1st - 3rd Quarter of CY 2023)",
            "List of Notices of Award (1st - 3rd Quarter)",
        ),
        (
            "1_1_1_g",
            "Itemized Monthly Collections and Disbursements (January to September 2023)",
            "Itemized Monthly Collections and Disbursements (January to September)",
        ),
        # 1.6.1.1
        (
            "1_6_1_1_b",
            "Proof of deposit with Account No./Name and total 2023 SK funds amount",
            "Proof of deposit with Account No./Name and total SK funds amount",
        ),
        # 1.6.1.2
        (
            "1_6_1_2_deposit",
            "Deposit slips with Account No./Name and total 2023 SK funds",
            "Deposit slips with Account No./Name and total SK funds",
        ),
        # 1.6.2
        (
            "1_6_2_5above_a",
            "Approved Resolution for 2023 SK Annual/Supplemental Budget (Required if 5+ SK officials)",
            "Approved Resolution for SK Annual/Supplemental Budget (Required if 5+ SK officials)",
        ),
        (
            "1_6_2_5above_b",
            "Approved 2023 ABYIP with signatures of SK Chairperson and members (Required if 5+ SK officials)",
            "Approved ABYIP with signatures of SK Chairperson and members (Required if 5+ SK officials)",
        ),
        # 1.7.1
        (
            "1_7_1_upload_1",
            "Verification of uploaded Post Activity Report or Minutes of the 1st semester Barangay Assembly 2023 with approval from the Punong Barangay",
            "Verification of uploaded Post Activity Report or Minutes of the 1st semester Barangay Assembly with approval from the Punong Barangay",
        ),
        # 3.2.2
        (
            "3_2_2_upload_1",
            "Verification of uploaded Approved Barangay Peace and Order and Public Safety Plan covering CY 2023",
            "Verification of uploaded Approved Barangay Peace and Order and Public Safety Plan",
        ),
    ]

    for item_id, old_desc, new_desc in mov_updates:
        conn.execute(
            sa.text("""
                UPDATE checklist_items
                SET mov_description = :new_desc
                WHERE item_id = :item_id AND mov_description = :old_desc
            """),
            {"item_id": item_id, "old_desc": old_desc, "new_desc": new_desc},
        )

    # Update indicators table - name and description columns (using name to identify)
    indicator_name_updates = [
        # 1.6.2
        (
            "Presence of Approved Annual Barangay Youth Investment Program (ABYIP) for 2023",
            "Presence of Approved Annual Barangay Youth Investment Program (ABYIP)",
        ),
        # 1.7.1
        (
            "Conducted the 1st semester Barangay Assembly for CY 2023",
            "Conducted the 1st semester Barangay Assembly",
        ),
        # 2.1.2
        (
            "Plan: Approved Barangay Disaster Risk Reduction and Management (BDRRM) Plan covering CY 2023, adopted by the Sangguniang Barangay",
            "Plan: Approved Barangay Disaster Risk Reduction and Management (BDRRM) Plan adopted by the Sangguniang Barangay",
        ),
        # 3.1.5
        (
            "Plan: Formulation of BADAC Plan of Action (BADPA) covering CY 2023",
            "Plan: Formulation of BADAC Plan of Action (BADPA)",
        ),
        # 3.2.2
        (
            "Plan: Formulated Barangay Peace and Order and Public Safety (BPOPS) Plan in accordance to DILG MC 2017-142 covering CY 2023",
            "Plan: Formulated Barangay Peace and Order and Public Safety (BPOPS) Plan in accordance to DILG MC 2017-142",
        ),
    ]

    for old_name, new_name in indicator_name_updates:
        conn.execute(
            sa.text("""
                UPDATE indicators
                SET name = :new_name
                WHERE name = :old_name
            """),
            {"old_name": old_name, "new_name": new_name},
        )

    # Update indicator 1.7 description
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET description = 'Conducted the 1st semester Barangay Assembly'
            WHERE description = 'Conducted the 1st semester Barangay Assembly for CY 2023'
        """)
    )


def downgrade() -> None:
    """Restore year references to indicator labels and descriptions."""
    conn = op.get_bind()

    # Reverse all the label updates (swap old and new values)
    label_updates = [
        (
            "1_1_1_f",
            "f. List of Notices of Award (1st - 3rd Quarter)",
            "f. List of Notices of Award (1st - 3rd Quarter of CY 2023)",
        ),
        (
            "1_1_1_g",
            "g. Itemized Monthly Collections and Disbursements (January to September)",
            "g. Itemized Monthly Collections and Disbursements (January to September 2023)",
        ),
        (
            "1_6_1_1_b",
            "b) Proof of deposit reflecting the Account No./Name of Barangay SK and the total allocated amount for SK funds",
            "b) Proof of deposit reflecting the Account No./Name of Barangay SK and the total allocated amount for the 2023 SK funds",
        ),
        (
            "1_6_1_2_deposit",
            "Deposit slips reflecting the Account No./Name of Barangay SK and the total allocated amount for SK funds",
            "Deposit slips reflecting the Account No./Name of Barangay SK and the total allocated amount for the 2023 SK funds",
        ),
        (
            "1_6_2_5above_a",
            "Approved Resolution approving the SK Annual/Supplemental Budget",
            "Approved Resolution approving the 2023 SK Annual/Supplemental Budget",
        ),
        (
            "1_6_2_5above_b",
            "An Approved ABYIP signed by the SK Chairperson and its members",
            "An Approved 2023 ABYIP signed by the SK Chairperson and its members",
        ),
        (
            "1_7_1_upload_1",
            "Post Activity Report/ Minutes on the conduct of the 1st semester Barangay Assembly duly approved by the Punong Barangay",
            "Post Activity Report/ Minutes on the conduct of the 1st semester Barangay Assembly 2023 duly approved by the Punong Barangay",
        ),
        (
            "2_1_1_eo",
            "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the BDRRMC with its composition compliant to the provisions of JMC No. 2014-01",
            "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) organizing the BDRRMC with its composition compliant to the provisions of JMC No. 2014-01, covering January to October 2023",
        ),
        (
            "2_1_2_certification",
            "Certification on the list of barangays with approved BDRRM Plan signed by the C/MDRRMO",
            "Certification on the list of barangays with approved BDRRM Plan covering CY 2023 signed by the C/MDRRMO",
        ),
        (
            "2_1_4_option_b",
            "b. At least 50% fund utilization of the 70% component of BDRRMF - Preparedness component",
            "b. At least 50% fund utilization of the 70% component of CY 2023 BDRRMF - Preparedness component as of December 31, 2023",
        ),
        (
            "2_1_4_financial_utilized",
            "Total amount utilized",
            "Total amount utilized (as of Dec. 31, 2023)",
        ),
        (
            "2_1_4_financial_allocated",
            "Total amount allocated for PPAs in the BDRRMF Plan",
            "Total amount allocated for PPAs in the BDRRM Plan for CY 2023",
        ),
        (
            "3_1_1_upload",
            "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) creating the BADAC with its composition and appropriate committees",
            "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) creating the BADAC with its composition and appropriate committees, covering January to October 2023",
        ),
        (
            "3_1_2_a",
            "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) establishing the Rehabilitation Referral Desk",
            "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) establishing the Rehabilitation Referral Desk covering CY 2023",
        ),
        (
            "3_1_5_a",
            "Copy of approved BADPA Summary or copy of approved BPOPs Plan with BADPA",
            "Copy of approved BADPA Summary or copy of approved BPOPs Plan with BADPA covering CY 2023",
        ),
        (
            "3_1_10_a",
            "Copy of the BADAC monthly minutes of the meeting with attendance sheets (at least 3 minutes)",
            "Copy of the BADAC monthly minutes of the meeting with attendance sheets (at least 3 minutes covering CY 2023)",
        ),
        (
            "3_2_1_upload",
            "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) indicating correct membership in accordance to the EO 366 s. of 1996",
            "EO (signed by the PB) or similar issuance (resolution/ordinance signed by the PB, Barangay Secretary and SBMs) indicating correct membership in accordance to the EO 366 s. of 1996, covering January to October 2023",
        ),
        (
            "3_2_2_upload_1",
            "Approved BPOPS Plan",
            "Approved BPOPS Plan, covering CY 2023",
        ),
    ]

    for item_id, old_label, new_label in label_updates:
        conn.execute(
            sa.text("""
                UPDATE checklist_items
                SET label = :new_label
                WHERE item_id = :item_id AND label = :old_label
            """),
            {"item_id": item_id, "old_label": old_label, "new_label": new_label},
        )

    # Reverse mov_description updates
    mov_updates = [
        (
            "1_1_1_f",
            "List of Notices of Award (1st - 3rd Quarter)",
            "List of Notices of Award (1st - 3rd Quarter of CY 2023)",
        ),
        (
            "1_1_1_g",
            "Itemized Monthly Collections and Disbursements (January to September)",
            "Itemized Monthly Collections and Disbursements (January to September 2023)",
        ),
        (
            "1_6_1_1_b",
            "Proof of deposit with Account No./Name and total SK funds amount",
            "Proof of deposit with Account No./Name and total 2023 SK funds amount",
        ),
        (
            "1_6_1_2_deposit",
            "Deposit slips with Account No./Name and total SK funds",
            "Deposit slips with Account No./Name and total 2023 SK funds",
        ),
        (
            "1_6_2_5above_a",
            "Approved Resolution for SK Annual/Supplemental Budget (Required if 5+ SK officials)",
            "Approved Resolution for 2023 SK Annual/Supplemental Budget (Required if 5+ SK officials)",
        ),
        (
            "1_6_2_5above_b",
            "Approved ABYIP with signatures of SK Chairperson and members (Required if 5+ SK officials)",
            "Approved 2023 ABYIP with signatures of SK Chairperson and members (Required if 5+ SK officials)",
        ),
        (
            "1_7_1_upload_1",
            "Verification of uploaded Post Activity Report or Minutes of the 1st semester Barangay Assembly with approval from the Punong Barangay",
            "Verification of uploaded Post Activity Report or Minutes of the 1st semester Barangay Assembly 2023 with approval from the Punong Barangay",
        ),
        (
            "3_2_2_upload_1",
            "Verification of uploaded Approved Barangay Peace and Order and Public Safety Plan",
            "Verification of uploaded Approved Barangay Peace and Order and Public Safety Plan covering CY 2023",
        ),
    ]

    for item_id, old_desc, new_desc in mov_updates:
        conn.execute(
            sa.text("""
                UPDATE checklist_items
                SET mov_description = :new_desc
                WHERE item_id = :item_id AND mov_description = :old_desc
            """),
            {"item_id": item_id, "old_desc": old_desc, "new_desc": new_desc},
        )

    # Reverse indicator name updates
    indicator_name_updates = [
        (
            "Presence of Approved Annual Barangay Youth Investment Program (ABYIP)",
            "Presence of Approved Annual Barangay Youth Investment Program (ABYIP) for 2023",
        ),
        (
            "Conducted the 1st semester Barangay Assembly",
            "Conducted the 1st semester Barangay Assembly for CY 2023",
        ),
        (
            "Plan: Approved Barangay Disaster Risk Reduction and Management (BDRRM) Plan adopted by the Sangguniang Barangay",
            "Plan: Approved Barangay Disaster Risk Reduction and Management (BDRRM) Plan covering CY 2023, adopted by the Sangguniang Barangay",
        ),
        (
            "Plan: Formulation of BADAC Plan of Action (BADPA)",
            "Plan: Formulation of BADAC Plan of Action (BADPA) covering CY 2023",
        ),
        (
            "Plan: Formulated Barangay Peace and Order and Public Safety (BPOPS) Plan in accordance to DILG MC 2017-142",
            "Plan: Formulated Barangay Peace and Order and Public Safety (BPOPS) Plan in accordance to DILG MC 2017-142 covering CY 2023",
        ),
    ]

    for old_name, new_name in indicator_name_updates:
        conn.execute(
            sa.text("""
                UPDATE indicators
                SET name = :new_name
                WHERE name = :old_name
            """),
            {"old_name": old_name, "new_name": new_name},
        )

    # Restore indicator 1.7 description
    conn.execute(
        sa.text("""
            UPDATE indicators
            SET description = 'Conducted the 1st semester Barangay Assembly for CY 2023'
            WHERE description = 'Conducted the 1st semester Barangay Assembly'
        """)
    )
