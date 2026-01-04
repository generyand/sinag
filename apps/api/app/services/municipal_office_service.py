"""
Municipal Office Service
Comprehensive municipal office management service.

This service handles:
- Full CRUD operations for municipal offices
- Initial data seeding
"""

from typing import Any

from fastapi import HTTPException, status
from loguru import logger
from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload

from app.db.models.governance_area import GovernanceArea
from app.db.models.municipal_office import MunicipalOffice
from app.db.models.user import User

# Default municipal offices data for seeding (generic names)
DEFAULT_MUNICIPAL_OFFICES = [
    # Financial Administration and Sustainability (Area 1)
    {
        "governance_area_id": 1,
        "abbreviation": "MBO",
        "name": "Municipal Budget Office",
    },
    {
        "governance_area_id": 1,
        "abbreviation": "MTO",
        "name": "Municipal Treasury Office",
    },
    {
        "governance_area_id": 1,
        "abbreviation": "MAO",
        "name": "Municipal Accounting Office",
    },
    # Disaster Preparedness (Area 2)
    {
        "governance_area_id": 2,
        "abbreviation": "LDRRMO",
        "name": "Local Disaster Risk Reduction and Management Office",
    },
    # Safety, Peace and Order (Area 3)
    {
        "governance_area_id": 3,
        "abbreviation": "DILG",
        "name": "DILG Municipal Office",
    },
    {
        "governance_area_id": 3,
        "abbreviation": "PNP",
        "name": "PNP Municipal Station",
    },
    # Social Protection and Sensitivity (Area 4)
    {
        "governance_area_id": 4,
        "abbreviation": "MSWDO",
        "name": "Municipal Social Welfare and Development Office",
    },
    # Business Friendliness and Competitiveness (Area 5)
    {
        "governance_area_id": 5,
        "abbreviation": "BPLO",
        "name": "Business Permits and Licensing Office",
    },
    # Environmental Management (Area 6)
    {
        "governance_area_id": 6,
        "abbreviation": "MENRO",
        "name": "Municipal Environment and Natural Resources Office",
    },
]


class MunicipalOfficeService:
    """
    Service for managing municipal office data.

    Follows the Fat Service pattern - all business logic lives here,
    routers are thin and just handle HTTP.
    """

    # ========================================================================
    # CRUD Operations
    # ========================================================================

    def create_municipal_office(
        self,
        db: Session,
        data: dict[str, Any],
        current_user: User | None = None,
    ) -> MunicipalOffice:
        """
        Create a new municipal office.

        Args:
            db: Database session
            data: Office data (name, abbreviation, governance_area_id, etc.)
            current_user: Current user for audit trail

        Returns:
            Created MunicipalOffice instance

        Raises:
            HTTPException: If governance area doesn't exist or abbreviation is duplicate
        """
        # Validate governance_area_id exists
        governance_area = (
            db.query(GovernanceArea)
            .filter(GovernanceArea.id == data.get("governance_area_id"))
            .first()
        )
        if not governance_area:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Governance area with ID {data.get('governance_area_id')} not found",
            )

        # Check for duplicate abbreviation within governance area
        existing_office = (
            db.query(MunicipalOffice)
            .filter(
                and_(
                    MunicipalOffice.abbreviation == data.get("abbreviation"),
                    MunicipalOffice.governance_area_id == data.get("governance_area_id"),
                )
            )
            .first()
        )
        if existing_office:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Municipal office with abbreviation '{data.get('abbreviation')}' "
                f"already exists in this governance area",
            )

        # Create office
        office = MunicipalOffice(
            name=data.get("name"),
            abbreviation=data.get("abbreviation"),
            description=data.get("description"),
            governance_area_id=data.get("governance_area_id"),
            contact_person=data.get("contact_person"),
            contact_number=data.get("contact_number"),
            contact_email=data.get("contact_email"),
            is_active=True,
            created_by_id=current_user.id if current_user else None,
        )

        db.add(office)
        db.commit()
        db.refresh(office)

        logger.info(f"Created municipal office: {office.abbreviation} (ID: {office.id})")
        return office

    def get_municipal_office(self, db: Session, office_id: int) -> MunicipalOffice | None:
        """Get a municipal office by ID with governance area loaded."""
        return (
            db.query(MunicipalOffice)
            .options(joinedload(MunicipalOffice.governance_area))
            .filter(MunicipalOffice.id == office_id)
            .first()
        )

    def list_municipal_offices(
        self,
        db: Session,
        governance_area_id: int | None = None,
        is_active: bool | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[MunicipalOffice]:
        """
        List municipal offices with optional filters.
        """
        # Query database
        query = db.query(MunicipalOffice).options(joinedload(MunicipalOffice.governance_area))

        if governance_area_id is not None:
            query = query.filter(MunicipalOffice.governance_area_id == governance_area_id)
        if is_active is not None:
            query = query.filter(MunicipalOffice.is_active == is_active)

        offices = (
            query.order_by(MunicipalOffice.governance_area_id, MunicipalOffice.abbreviation)
            .offset(skip)
            .limit(limit)
            .all()
        )

        return offices

    def count_municipal_offices(
        self,
        db: Session,
        governance_area_id: int | None = None,
        is_active: bool | None = None,
    ) -> int:
        """Count municipal offices with optional filters."""
        query = db.query(MunicipalOffice)

        if governance_area_id is not None:
            query = query.filter(MunicipalOffice.governance_area_id == governance_area_id)
        if is_active is not None:
            query = query.filter(MunicipalOffice.is_active == is_active)

        return query.count()

    def update_municipal_office(
        self,
        db: Session,
        office_id: int,
        data: dict[str, Any],
        current_user: User | None = None,
    ) -> MunicipalOffice:
        """Update a municipal office."""
        office = self.get_municipal_office(db, office_id)
        if not office:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Municipal office with ID {office_id} not found",
            )

        # Check for duplicate abbreviation if being updated
        if "abbreviation" in data and data["abbreviation"] != office.abbreviation:
            existing = (
                db.query(MunicipalOffice)
                .filter(
                    and_(
                        MunicipalOffice.abbreviation == data["abbreviation"],
                        MunicipalOffice.governance_area_id == office.governance_area_id,
                        MunicipalOffice.id != office_id,
                    )
                )
                .first()
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Municipal office with abbreviation '{data['abbreviation']}' "
                    f"already exists in this governance area",
                )

        # Update fields - allow setting nullable fields to None explicitly
        # Protected fields that should never be updated via this method
        protected_fields = {"id", "governance_area_id", "created_at", "created_by_id"}
        for key, value in data.items():
            if hasattr(office, key) and key not in protected_fields:
                setattr(office, key, value)

        if current_user:
            office.updated_by_id = current_user.id

        db.commit()
        db.refresh(office)

        logger.info(f"Updated municipal office: {office.abbreviation} (ID: {office.id})")
        return office

    def deactivate_municipal_office(
        self,
        db: Session,
        office_id: int,
        current_user: User | None = None,
    ) -> MunicipalOffice:
        """Deactivate a municipal office (soft delete)."""
        office = self.get_municipal_office(db, office_id)
        if not office:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Municipal office with ID {office_id} not found",
            )

        office.is_active = False
        if current_user:
            office.updated_by_id = current_user.id

        db.commit()
        db.refresh(office)

        logger.info(f"Deactivated municipal office: {office.abbreviation} (ID: {office.id})")
        return office

    # ========================================================================
    # Seeding
    # ========================================================================

    def seed_municipal_offices(self, db: Session) -> None:
        """
        Seed default municipal offices if none exist.

        This is idempotent - will not create duplicates.
        """
        existing_count = db.query(MunicipalOffice).count()
        if existing_count > 0:
            logger.info(f"Municipal offices already exist ({existing_count}). Skipping seed.")
            return

        logger.info("Seeding default municipal offices...")

        for office_data in DEFAULT_MUNICIPAL_OFFICES:
            office = MunicipalOffice(
                name=office_data["name"],
                abbreviation=office_data["abbreviation"],
                governance_area_id=office_data["governance_area_id"],
                is_active=True,
            )
            db.add(office)

        db.commit()
        logger.info(f"Seeded {len(DEFAULT_MUNICIPAL_OFFICES)} municipal offices.")

    # ========================================================================
    # Grouped Retrieval (for frontend display)
    # ========================================================================

    def get_offices_grouped_by_area(
        self,
        db: Session,
        is_active: bool | None = True,
    ) -> list[dict[str, Any]]:
        """
        Get municipal offices grouped by governance area.

        Returns data structured for frontend display.
        Optimized to use only 2 queries instead of N+1.
        """
        # Query 1: Get all governance areas
        governance_areas = db.query(GovernanceArea).order_by(GovernanceArea.id).all()

        # Query 2: Get all offices (with optional filter) in a single query
        offices_query = db.query(MunicipalOffice)
        if is_active is not None:
            offices_query = offices_query.filter(MunicipalOffice.is_active == is_active)
        all_offices = offices_query.order_by(
            MunicipalOffice.governance_area_id, MunicipalOffice.abbreviation
        ).all()

        # Group offices by governance_area_id in Python (O(n) operation)
        offices_by_area: dict[int, list[MunicipalOffice]] = {}
        for office in all_offices:
            if office.governance_area_id not in offices_by_area:
                offices_by_area[office.governance_area_id] = []
            offices_by_area[office.governance_area_id].append(office)

        # Build result with all governance areas (even those with no offices)
        result = []
        for area in governance_areas:
            result.append(
                {
                    "governance_area_id": area.id,
                    "governance_area_name": area.name,
                    "governance_area_code": area.code,
                    "area_type": area.area_type.value if area.area_type else None,
                    "offices": offices_by_area.get(area.id, []),
                }
            )

        return result


# Singleton instance
municipal_office_service = MunicipalOfficeService()
