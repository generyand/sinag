"""update_1_6_1_field_labels

Revision ID: 96050d3cf901
Revises: 6e10dbef170b
Create Date: 2025-12-07 18:39:54.406336

Update field labels in indicator 1.6.1 to be more descriptive.
"""

from typing import Sequence, Union
import json

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "96050d3cf901"
down_revision: Union[str, Sequence[str], None] = "6e10dbef170b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Label mappings: partial match -> new label
LABEL_UPDATES = {
    # Option 1 - field b (proof of deposit)
    "Proof of deposit reflecting": "Proof of deposit reflecting the Account No./ Name of Barangay SK and the total allocated amount for the SK funds",
    # Option 2 - deposit slips
    "Deposit slips reflecting": "Deposit slips reflecting the Account No./ Name of Barangay SK and the total allocated amount for the SK funds",
    # Option 3 - field a (proof of transfer to trust fund)
    "Proof of transfer of the 10%": "Proof of transfer of the 10% SK funds to the trust fund of the Barangay such as Deposit Slip or Official Receipt",
    "Proof of transfer to trust fund": "Proof of transfer of the 10% SK funds to the trust fund of the Barangay such as Deposit Slip or Official Receipt",
    # Option 3 - field b (legal forms from C/M treasurer)
    "Legal forms from C/M treasurer": "Proof of transfer or corresponding legal forms/documents issued by the city/municipal treasurer if the barangay opted that the corresponding SK fund be kept as trust fund in the custody of the C/M treasurer",
    "Proof of transfer or corresponding legal forms": "Proof of transfer or corresponding legal forms/documents issued by the city/municipal treasurer if the barangay opted that the corresponding SK fund be kept as trust fund in the custody of the C/M treasurer",
}


def upgrade() -> None:
    """Update field labels in indicator 1.6.1."""
    conn = op.get_bind()

    # Get indicator 1.6.1's form_schema
    result = conn.execute(
        sa.text("SELECT form_schema FROM indicators WHERE indicator_code = '1.6.1'")
    ).fetchone()

    if not result or not result[0]:
        print("Indicator 1.6.1 not found or has no form_schema, skipping...")
        return

    form_schema = result[0]
    fields = form_schema.get("fields", [])
    updated_count = 0

    for field in fields:
        if field.get("field_type") != "file_upload":
            continue

        current_label = field.get("label", "")

        # Check each mapping
        for pattern, new_label in LABEL_UPDATES.items():
            if pattern.lower() in current_label.lower():
                print(f"  Updating: '{current_label[:50]}...' -> '{new_label[:50]}...'")
                field["label"] = new_label
                field["description"] = new_label
                updated_count += 1
                break

    if updated_count > 0:
        # Update the database
        conn.execute(
            sa.text(
                "UPDATE indicators SET form_schema = CAST(:schema AS jsonb) WHERE indicator_code = '1.6.1'"
            ),
            {"schema": json.dumps(form_schema)},
        )
        print(f"Updated {updated_count} field labels in indicator 1.6.1")
    else:
        print("No fields needed updating")


def downgrade() -> None:
    """Revert is complex - skipping."""
    pass
