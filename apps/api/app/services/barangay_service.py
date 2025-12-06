# 🏘️ Barangay Service
# Business logic for managing barangays

from sqlalchemy.orm import Session

from app.db.models.barangay import Barangay


class BarangayService:
    """Service for managing barangay data."""

    def get_all_barangays(self, db: Session) -> list[Barangay]:
        """Get all barangays."""
        return db.query(Barangay).order_by(Barangay.name).all()

    def get_barangay_by_id(self, db: Session, barangay_id: int) -> Barangay | None:
        """Get a barangay by ID."""
        return db.query(Barangay).filter(Barangay.id == barangay_id).first()


# Create a single instance to be used across the application
barangay_service = BarangayService()
