"""Fix is_bbi flag - only official 7 BBIs per DILG MC 2024-417

This migration corrects the is_bbi flag on indicators that were incorrectly
marked as BBIs. Per DILG MC 2024-417, there are only 7 official BBIs:

1. BDRRMC (2.1) - Barangay Disaster Risk Reduction and Management Committee
2. BADAC (3.1) - Barangay Anti-Drug Abuse Council
3. BPOC (3.2) - Barangay Peace and Order Committee
4. VAW Desk (4.1) - Barangay Violence Against Women Desk
5. BDC (4.3) - Barangay Development Council
6. BCPC (4.5) - Barangay Council for the Protection of Children
7. BESWMC (6.1) - Barangay Ecological Solid Waste Management Committee

Indicators that should NOT be BBIs (fixing):
- 3.3 (Lupong Tagapamayapa) - NOT a BBI
- 4.8 (Barangay Nutrition Committee) - NOT a BBI

Revision ID: fix_is_bbi_official_7_only
Revises: fix_6_2_1_flat_ui
Create Date: 2024-12-10

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "fix_is_bbi_official_7_only"
down_revision = "fix_6_2_1_flat_ui"
branch_labels = None
depends_on = None


def upgrade():
    """Set is_bbi=False for non-official BBIs (3.3 and 4.8)"""
    # Update indicators 3.3 and 4.8 to is_bbi=False
    op.execute(
        """
        UPDATE indicators
        SET is_bbi = FALSE
        WHERE indicator_code IN ('3.3', '4.8')
    """
    )

    # Also clean up any BBI records and BBIResults for these non-BBI indicators
    # First, get the BBI IDs that need to be removed
    op.execute(
        """
        DELETE FROM bbi_results
        WHERE bbi_id IN (
            SELECT b.id FROM bbis b
            JOIN indicators i ON b.abbreviation = 'LT'
                OR b.name ILIKE '%Lupong%'
                OR b.name ILIKE '%Nutrition%'
        )
    """
    )

    # Remove any BBIs created for non-official indicators
    op.execute(
        """
        DELETE FROM bbis
        WHERE abbreviation IN ('LT', 'BNC')
           OR name ILIKE '%Lupong Tagapamayapa%'
           OR name ILIKE '%Nutrition Committee%'
    """
    )


def downgrade():
    """Revert: Set is_bbi=True for 3.3 and 4.8 (not recommended)"""
    op.execute(
        """
        UPDATE indicators
        SET is_bbi = TRUE
        WHERE indicator_code IN ('3.3', '4.8')
    """
    )
