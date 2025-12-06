# 🏛️ Governance Area Service
# Business logic for governance areas management and seeding

import logging

from sqlalchemy.orm import Session

from app.core.cache import CACHE_TTL_LOOKUP, cache
from app.db.enums import AreaType
from app.db.models.governance_area import GovernanceArea

logger = logging.getLogger(__name__)


class GovernanceAreaService:
    """Service for managing governance areas and initial data seeding."""

    def seed_governance_areas(self, db: Session) -> None:
        """
        One-time seeding service to populate the governance_areas table
        with the 6 predefined SGLGB areas and their types.
        """
        # Check if areas already exist to avoid duplicate seeding
        existing_count = db.query(GovernanceArea).count()
        if existing_count > 0:
            return  # Already seeded

        # Predefined governance areas data
        governance_areas_data = [
            {
                "id": 1,
                "name": "Financial Administration and Sustainability",
                "code": "AREA1",
                "area_type": AreaType.CORE,
            },
            {
                "id": 2,
                "name": "Disaster Preparedness",
                "code": "AREA2",
                "area_type": AreaType.CORE,
            },
            {
                "id": 3,
                "name": "Safety, Peace and Order",
                "code": "AREA3",
                "area_type": AreaType.CORE,
            },
            {
                "id": 4,
                "name": "Social Protection and Sensitivity",
                "code": "AREA4",
                "area_type": AreaType.ESSENTIAL,
            },
            {
                "id": 5,
                "name": "Business-Friendliness and Competitiveness",
                "code": "AREA5",
                "area_type": AreaType.ESSENTIAL,
            },
            {
                "id": 6,
                "name": "Environmental Management",
                "code": "AREA6",
                "area_type": AreaType.ESSENTIAL,
            },
        ]

        # Create governance area records
        for area_data in governance_areas_data:
            governance_area = GovernanceArea(**area_data)
            db.add(governance_area)

        db.commit()

    def get_all_governance_areas(self, db: Session) -> list[GovernanceArea]:
        """
        Get all governance areas.

        PERFORMANCE: Results are cached in Redis for 1 hour since governance
        areas rarely change.
        """
        cache_key = "lookup:governance_areas"

        # Try to get from cache first
        if cache.is_available:
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                logger.debug(f"🎯 Governance areas cache HIT")
                # Reconstruct GovernanceArea objects from cached dicts
                # Note: This returns dicts that work with Pydantic serialization
                return cached_data

        # Fetch from database
        areas = db.query(GovernanceArea).order_by(GovernanceArea.id).all()

        # Cache the result (convert to dicts for JSON serialization)
        if cache.is_available and areas:
            try:
                # Convert to serializable format
                areas_data = [
                    {
                        "id": area.id,
                        "name": area.name,
                        "code": area.code,
                        "area_type": area.area_type.value if area.area_type else None,
                    }
                    for area in areas
                ]
                cache.set(cache_key, areas_data, ttl=CACHE_TTL_LOOKUP)
                logger.debug(f"💾 Governance areas cached (TTL: {CACHE_TTL_LOOKUP}s)")
            except Exception as e:
                logger.warning(f"⚠️  Failed to cache governance areas: {e}")

        return areas

    def get_governance_area_by_id(self, db: Session, area_id: int) -> GovernanceArea | None:
        """Get a governance area by ID."""
        return db.query(GovernanceArea).filter(GovernanceArea.id == area_id).first()


# Create a single instance to be used across the application
governance_area_service = GovernanceAreaService()
