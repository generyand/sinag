"""add mov file upload origin

Revision ID: 20250325_mov_upload_origin
Revises: 6b5f10b0209d
Create Date: 2026-03-25 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20250325_mov_upload_origin"
down_revision: Union[str, Sequence[str], None] = "6b5f10b0209d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add durable upload provenance for MOV files."""
    op.add_column(
        "mov_files",
        sa.Column(
            "upload_origin",
            sa.String(length=20),
            nullable=False,
            server_default="blgu",
        ),
    )

    connection = op.get_bind()

    # Start from a conservative fallback for historical rows.
    connection.execute(sa.text("UPDATE mov_files SET upload_origin = 'unknown'"))

    # Only rows uploaded by the assessment's BLGU owner can be safely inferred.
    connection.execute(
        sa.text(
            """
            UPDATE mov_files mf
            SET upload_origin = 'blgu'
            FROM assessments a
            WHERE mf.assessment_id = a.id
              AND mf.uploaded_by = a.blgu_user_id
            """
        )
    )


def downgrade() -> None:
    """Remove upload provenance from MOV files."""
    op.drop_column("mov_files", "upload_origin")
