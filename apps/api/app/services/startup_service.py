"""
🚀 Startup Service
Handles application startup checks and initialization
"""

import logging
from datetime import datetime
from typing import Any, Dict

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.base import (
    SessionLocal,
    check_all_connections,
    validate_connections_startup,
)
from app.db.enums import UserRole
from app.db.models.barangay import Barangay
from app.db.models.user import User
from app.services.governance_area_service import governance_area_service
from app.services.indicator_service import indicator_service
from sqlalchemy.orm import Session  # type: ignore[reportMissingImports]

logger = logging.getLogger(__name__)


BARANGAYS = [
    "Balasinon",
    "Buguis",
    "Carre",
    "Clib",
    "Harada Butai",
    "Katipunan",
    "Kiblagon",
    "Labon",
    "Laperas",
    "Lapla",
    "Litos",
    "Luparan",
    "Mckinley",
    "New Cebu",
    "Osmeña",
    "Palili",
    "Parame",
    "Poblacion",
    "Roxas",
    "Solongvale",
    "Tagolilong",
    "Tala-o",
    "Talas",
    "Tanwalang",
    "Waterfall",
]


class StartupService:
    """
    Service responsible for handling application startup procedures.

    This service encapsulates all startup-related logic including:
    - Database connection validation
    - Health checks
    - Startup logging
    - Environment validation
    """

    def __init__(self):
        self.startup_time = None

    async def perform_startup_checks(self) -> None:
        """
        Execute all required startup checks and validations.

        Raises:
            RuntimeError: If critical startup requirements are not met
        """
        self.startup_time = datetime.now()

        # Log startup initiation
        self._log_startup_info()

        # Validate database connections
        await self._validate_database_connections()

        # Seed initial data
        self._seed_initial_data()

        # Create first superuser if needed
        self._create_first_superuser()

        # Log detailed connection status
        await self._log_connection_details()

        # Log successful startup
        self._log_startup_success()

    def _log_startup_info(self) -> None:
        """Log basic startup information"""
        logger.info("🚀 Starting VANTAGE API server...")
        logger.info(f"📊 Environment: {settings.ENVIRONMENT}")
        logger.info(f"🔧 Debug mode: {settings.DEBUG}")
        logger.info(f"📝 Project: {settings.PROJECT_NAME} v{settings.VERSION}")

    def _seed_initial_data(self) -> None:
        """Seed the database with initial required data."""
        import os
        # Skip seeding in tests to speed up test runs
        if os.getenv("SKIP_STARTUP_SEEDING") == "true":
            logger.info("⏭️  Skipping startup seeding (test mode)")
            return

        logger.info("🌱 Seeding initial data...")
        db: Session = SessionLocal()
        try:
            # Check if barangays already exist
            count = db.query(Barangay).count()
            if count == 0:
                logger.info("  - Seeding 25 barangays for Sulop...")
                for name in BARANGAYS:
                    db_barangay = Barangay(name=name)
                    db.add(db_barangay)
                db.commit()
                logger.info("  - Barangay seeding complete.")
            else:
                logger.info("  - Barangays already seeded. Skipping.")

            # Seed governance areas
            logger.info("  - Seeding SGLGB governance areas...")
            governance_area_service.seed_governance_areas(db)
            logger.info("  - Governance areas seeding complete.")

            # NOTE: Mock indicators and old seeding logic is now DISABLED
            # We use hardcoded indicators from app/indicators/definitions/ instead
            # These are seeded via Alembic migrations
            logger.info("  - Using hardcoded SGLGB indicators from migrations (not mock data)")

            # # Seed mock indicators
            # logger.info("  - Seeding mock indicators for testing...")
            # indicator_service.seed_mock_indicators(db)
            # logger.info("  - Mock indicators seeding complete.")

            # # Ensure Area 1 exists as a SINGLE indicator (sub-items live in schema only)
            # logger.info("  - Enforcing Area 1 as a single indicator (sub-indicators in schema)...")
            # indicator_service.enforce_area1_as_single_indicator(db)
            # logger.info("  - Area 1 DB indicator enforced as single.")

            # # Ensure official governance area names are used as indicator names
            # indicator_service.standardize_indicator_area_names(db)

            # # Seed indicators for areas 2-6 with specific codes (2.1.1, 3.1.1, 4.1.1, 5.1.1, 6.1.1)
            # logger.info("  - Seeding indicators for governance areas 2-6...")
            # indicator_service.seed_areas_2_to_6_indicators(db)
            # logger.info("  - Areas 2-6 indicators seeding complete.")

        except Exception as e:
            logger.warning(f"⚠️  Could not seed initial data: {str(e)}")
            db.rollback()
        finally:
            db.close()

    def _create_first_superuser(self) -> None:
        """Create the first admin user (MLGOO_DILG) if it doesn't exist."""
        logger.info("👤 Checking for first admin user...")
        db: Session = SessionLocal()
        try:
            # Check if any MLGOO_DILG user exists
            existing_user = (
                db.query(User).filter(User.role == UserRole.MLGOO_DILG).first()
            )
            if existing_user:
                logger.info("  - Admin user already exists. Skipping.")
                return

            # Create first admin user with MLGOO_DILG role
            logger.info(f"  - Creating first admin user: {settings.FIRST_SUPERUSER}")
            user = User(
                email=settings.FIRST_SUPERUSER,
                name="MLGOO-DILG Administrator",
                hashed_password=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
                role=UserRole.MLGOO_DILG,
                is_active=True,
                is_superuser=True,
                must_change_password=False,
            )
            db.add(user)
            db.commit()
            logger.info("  - Admin user created successfully.")

        except Exception as e:
            logger.warning(f"⚠️  Could not create first admin user: {str(e)}")
            db.rollback()
        finally:
            db.close()

    async def _validate_database_connections(self) -> None:
        """
        Validate database connections according to configuration requirements.

        Raises:
            RuntimeError: If connection requirements are not satisfied
        """
        logger.info("🔍 Checking database connections...")

        connection_requirement = (
            "all" if settings.REQUIRE_ALL_CONNECTIONS else "at least one"
        )
        logger.info(
            f"🔐 Connection requirement: {connection_requirement} connection(s) must be healthy"
        )

        try:
            # This will throw an exception if connections fail according to requirements
            await validate_connections_startup(
                require_all=settings.REQUIRE_ALL_CONNECTIONS
            )
            logger.info("✅ Database connection requirements satisfied!")

        except Exception as e:
            logger.critical(f"❌ Failed to establish required connections: {str(e)}")
            raise

    async def _log_connection_details(self) -> None:
        """Log detailed status of individual connections"""
        try:
            connection_details = await check_all_connections()

            # Log PostgreSQL connection status
            if connection_details["database"]["connected"]:
                logger.info("  🗄️  PostgreSQL: healthy")
            else:
                logger.warning(
                    "  🗄️  PostgreSQL: not connected (some features may be unavailable)"
                )

            # Log Supabase connection status
            if connection_details["supabase"]["connected"]:
                logger.info("  ⚡ Supabase: healthy")
            else:
                logger.warning(
                    "  ⚡ Supabase: not connected (some features may be unavailable)"
                )

        except Exception as e:
            logger.warning(
                f"⚠️  Could not retrieve detailed connection status: {str(e)}"
            )

    def _log_startup_success(self) -> None:
        """Log successful startup completion"""
        if self.startup_time:
            startup_duration = (datetime.now() - self.startup_time).total_seconds()
            logger.info(
                f"🎯 VANTAGE API server startup complete! ({startup_duration:.2f}s)"
            )
        else:
            logger.info("🎯 VANTAGE API server startup complete!")

    def log_shutdown(self) -> None:
        """Log application shutdown"""
        logger.info("🛑 Shutting down VANTAGE API server...")
        logger.info("👋 Goodbye!")

    async def get_health_status(self) -> Dict[str, Any]:
        """
        Get current health status for health check endpoints.

        Returns:
            Dict containing overall health status and connection details
        """
        try:
            connection_details = await check_all_connections()
            connection_details["timestamp"] = datetime.now().isoformat()
            return connection_details
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return {
                "overall_status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }


# Singleton instance for use across the application
startup_service = StartupService()
