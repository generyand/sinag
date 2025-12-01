"""
🚀 Startup Service
Handles application startup checks and initialization
"""

import logging
import redis
from datetime import datetime
from typing import Any, Dict, List, Tuple

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.base import (
    SessionLocal,
    check_all_connections,
    validate_connections_startup,
)
from app.db.enums import UserRole
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from app.services.governance_area_service import governance_area_service
from app.services.indicator_service import indicator_service
from app.indicators.definitions import ALL_INDICATORS
from app.indicators.seeder import seed_indicators
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
    - Environment variable validation
    - Database connection validation
    - Redis/Celery connectivity checks
    - Health checks
    - Startup logging
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

        # CRITICAL: Validate environment variables first
        self._validate_environment_variables()

        # Validate database connections
        await self._validate_database_connections()

        # Validate Redis connection (for Celery)
        self._validate_redis_connection()

        # Validate Gemini API connection (for AI features)
        self._validate_gemini_connection()

        # Seed initial data
        self._seed_initial_data()

        # Create first superuser if needed
        self._create_first_superuser()

        # Create external stakeholder users if needed
        self._create_external_users()

        # Seed demo users (BLGU, Assessors, Validators) if needed
        self._seed_demo_users()

        # Validate indicator data integrity
        self._validate_indicators()

        # Log detailed connection status
        await self._log_connection_details()

        # Log successful startup
        self._log_startup_success()

    def _validate_environment_variables(self) -> None:
        """
        Validate that all critical environment variables are set.

        Raises:
            RuntimeError: If required environment variables are missing or invalid
        """
        logger.info("🔐 Validating environment variables...")

        errors: List[str] = []
        warnings: List[str] = []

        # Critical variables (must be set)
        critical_vars = [
            ("DATABASE_URL", settings.DATABASE_URL),
            ("SECRET_KEY", settings.SECRET_KEY),
            ("SUPABASE_URL", settings.SUPABASE_URL),
            ("SUPABASE_ANON_KEY", settings.SUPABASE_ANON_KEY),
            ("SUPABASE_SERVICE_ROLE_KEY", settings.SUPABASE_SERVICE_ROLE_KEY),
        ]

        # Conditionally required variables (based on REQUIRE_* flags)
        conditional_vars = [
            ("GEMINI_API_KEY", settings.GEMINI_API_KEY, settings.REQUIRE_GEMINI, "AI features (classification, recommendations)"),
            ("CELERY_BROKER_URL", settings.CELERY_BROKER_URL, settings.REQUIRE_CELERY, "Background tasks"),
        ]

        # Check critical variables
        for var_name, var_value in critical_vars:
            if not var_value or (isinstance(var_value, str) and var_value.strip() == ""):
                errors.append(f"  ❌ {var_name} is not set or empty")

        # Check conditionally required variables
        for var_name, var_value, is_required, feature_name in conditional_vars:
            if not var_value or (isinstance(var_value, str) and var_value.strip() == ""):
                if is_required and settings.FAIL_FAST:
                    errors.append(f"  ❌ {var_name} is not set - required for {feature_name}")
                else:
                    warnings.append(f"  ⚠️  {var_name} is not set - {feature_name} will be disabled")

        # Validate SECRET_KEY is not the default
        if settings.SECRET_KEY and len(settings.SECRET_KEY) < 32:
            errors.append(f"  ❌ SECRET_KEY is too short (minimum 32 characters)")

        # Validate DATABASE_URL format
        if settings.DATABASE_URL:
            if not settings.DATABASE_URL.startswith("postgresql://"):
                errors.append(f"  ❌ DATABASE_URL must start with 'postgresql://'")

        # Validate SUPABASE_URL format
        if settings.SUPABASE_URL:
            if not settings.SUPABASE_URL.startswith("https://"):
                errors.append(f"  ❌ SUPABASE_URL must start with 'https://'")

        # Log warnings
        if warnings:
            logger.warning("⚠️  Optional environment variables missing:")
            for warning in warnings:
                logger.warning(warning)

        # Raise error if critical variables are missing
        if errors:
            error_message = "🚨 Critical environment variables are missing or invalid:\n\n"
            error_message += "\n".join(errors)
            error_message += "\n\n"
            error_message += "Please check your .env file and ensure all required variables are set.\n"
            error_message += "See apps/api/.env.example for reference."

            logger.critical(error_message)
            raise RuntimeError(error_message)

        logger.info("✅ All critical environment variables are valid!")

    def _validate_redis_connection(self) -> None:
        """
        Validate Redis connection for Celery.

        Raises:
            RuntimeError: If Redis connection fails and both FAIL_FAST=true and REQUIRE_CELERY=true
        """
        logger.info("🔍 Checking Redis connection for Celery...")

        try:
            # Parse Redis URL
            redis_client = redis.from_url(settings.CELERY_BROKER_URL)

            # Test connection with ping
            response = redis_client.ping()

            if response:
                logger.info("✅ Redis connection: healthy")
            else:
                raise ConnectionError("Redis ping returned False")

        except Exception as e:
            error_message = f"Redis connection failed: {str(e)}"

            # Determine if we should fail based on FAIL_FAST and REQUIRE_CELERY
            should_fail = settings.FAIL_FAST and settings.REQUIRE_CELERY

            if should_fail:
                logger.critical(f"❌ {error_message}")
                logger.critical("Background tasks (Celery) will not work!")
                logger.critical("To bypass: Set FAIL_FAST=false OR REQUIRE_CELERY=false in .env (NOT RECOMMENDED)")
                raise RuntimeError(error_message)
            else:
                logger.warning(f"⚠️  {error_message}")
                logger.warning("Background tasks (Celery) may not work")
                if not settings.REQUIRE_CELERY:
                    logger.warning("Continuing because REQUIRE_CELERY=false")
                if not settings.FAIL_FAST:
                    logger.warning("Continuing because FAIL_FAST=false")
        finally:
            try:
                redis_client.close()
            except:
                pass

    def _validate_gemini_connection(self) -> None:
        """
        Validate Gemini API key and connection.

        Raises:
            RuntimeError: If Gemini connection fails and both FAIL_FAST=true and REQUIRE_GEMINI=true
        """
        logger.info("🤖 Checking Gemini API connection...")

        # Skip if no API key provided
        if not settings.GEMINI_API_KEY:
            should_fail = settings.FAIL_FAST and settings.REQUIRE_GEMINI
            if should_fail:
                error_message = "GEMINI_API_KEY is not set"
                logger.critical(f"❌ {error_message}")
                logger.critical("AI features (classification, recommendations) will not work!")
                logger.critical("To bypass: Set REQUIRE_GEMINI=false in environment (NOT RECOMMENDED)")
                raise RuntimeError(error_message)
            else:
                logger.warning("⚠️  GEMINI_API_KEY is not set - AI features will be disabled")
                return

        try:
            import google.generativeai as genai

            # Configure the API
            genai.configure(api_key=settings.GEMINI_API_KEY)

            # Test the connection by listing models
            models = list(genai.list_models())

            if models:
                logger.info(f"✅ Gemini API connection: healthy ({len(models)} models available)")
            else:
                raise ConnectionError("No models available from Gemini API")

        except Exception as e:
            error_message = f"Gemini API connection failed: {str(e)}"

            # Determine if we should fail based on FAIL_FAST and REQUIRE_GEMINI
            should_fail = settings.FAIL_FAST and settings.REQUIRE_GEMINI

            if should_fail:
                logger.critical(f"❌ {error_message}")
                logger.critical("AI features (classification, recommendations) will not work!")
                logger.critical("To bypass: Set FAIL_FAST=false OR REQUIRE_GEMINI=false (NOT RECOMMENDED)")
                raise RuntimeError(error_message)
            else:
                logger.warning(f"⚠️  {error_message}")
                logger.warning("AI features will be disabled")
                if not settings.REQUIRE_GEMINI:
                    logger.warning("Continuing because REQUIRE_GEMINI=false")
                if not settings.FAIL_FAST:
                    logger.warning("Continuing because FAIL_FAST=false")

    def _log_startup_info(self) -> None:
        """Log basic startup information"""
        logger.info("🚀 Starting SINAG API server...")
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

            # Seed hardcoded SGLGB indicators from Python definitions
            existing_indicators = db.query(Indicator).count()
            if existing_indicators == 0:
                logger.info("  - Seeding hardcoded SGLGB indicators...")
                seed_indicators(ALL_INDICATORS, db)
                logger.info(f"  - Indicator seeding complete. ({len(ALL_INDICATORS)} parent indicators created)")
            else:
                logger.info(f"  - Indicators already exist ({existing_indicators}). Skipping seed.")

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

    def _create_external_users(self) -> None:
        """Create external stakeholder user (Katuparan Center) if it doesn't exist."""
        logger.info("🏛️  Checking for external stakeholder users...")
        db: Session = SessionLocal()
        try:
            # External user configuration (Katuparan Center for research purposes)
            external_users = [
                {
                    "email": "katuparan@sulop.gov.ph",
                    "name": "Katuparan Center",
                    "role": UserRole.KATUPARAN_CENTER_USER,
                    "password": "katuparan2025",  # Default password - should be changed
                    "description": "Katuparan Center - Research and CapDev",
                },
            ]

            created_count = 0
            for user_config in external_users:
                # Check if user already exists
                existing_user = (
                    db.query(User).filter(User.email == user_config["email"]).first()
                )

                if existing_user:
                    logger.info(f"  - {user_config['description']} already exists. Skipping.")
                    continue

                # Create external user
                logger.info(f"  - Creating {user_config['description']} ({user_config['email']})")
                user = User(
                    email=user_config["email"],
                    name=user_config["name"],
                    hashed_password=get_password_hash(user_config["password"]),
                    role=user_config["role"],
                    is_active=True,
                    is_superuser=False,
                    must_change_password=True,  # Force password change on first login
                )
                db.add(user)
                created_count += 1

            if created_count > 0:
                db.commit()
                logger.info(f"  - Created {created_count} external stakeholder user(s) successfully.")
                logger.info("  ⚠️  Default password: katuparan2025 (must be changed on first login)")
            else:
                logger.info("  - All external users already exist. Skipping.")

        except Exception as e:
            logger.warning(f"⚠️  Could not create external users: {str(e)}")
            db.rollback()
        finally:
            db.close()

    def _seed_demo_users(self) -> None:
        """
        Seed demo users for development/testing purposes.

        Creates:
        - 25 BLGU users (one per barangay)
        - 3 Assessors (no governance area assignment)
        - 6 Validators (one per governance area)

        All users are created with a default password and must_change_password=True.
        This method is idempotent - it will not create duplicates.
        """
        import os
        # Skip seeding in tests
        if os.getenv("SKIP_STARTUP_SEEDING") == "true":
            logger.info("⏭️  Skipping demo user seeding (test mode)")
            return

        logger.info("👥 Seeding demo users...")
        db: Session = SessionLocal()

        DEFAULT_PASSWORD = "sinag2025"

        try:
            created_blgu = 0
            created_assessors = 0
            created_validators = 0

            # ─────────────────────────────────────────────────────────────
            # 1. Seed BLGU Users (one per barangay)
            # ─────────────────────────────────────────────────────────────
            logger.info("  - Seeding BLGU users...")
            barangays = db.query(Barangay).all()

            for barangay in barangays:
                # Create email from barangay name (lowercase, replace spaces with underscores)
                email = f"{barangay.name.lower().replace(' ', '_').replace('-', '_')}@sinag.dev"

                # Check if user already exists
                existing = db.query(User).filter(User.email == email).first()
                if existing:
                    continue

                user = User(
                    email=email,
                    name=f"BLGU {barangay.name}",
                    hashed_password=get_password_hash(DEFAULT_PASSWORD),
                    role=UserRole.BLGU_USER,
                    barangay_id=barangay.id,
                    is_active=True,
                    is_superuser=False,
                    must_change_password=True,
                )
                db.add(user)
                created_blgu += 1

            if created_blgu > 0:
                db.flush()
                logger.info(f"    ✓ Created {created_blgu} BLGU user(s)")
            else:
                logger.info("    - BLGU users already exist. Skipping.")

            # ─────────────────────────────────────────────────────────────
            # 2. Seed Assessors (3 assessors, no area assignment)
            # ─────────────────────────────────────────────────────────────
            logger.info("  - Seeding Assessor users...")

            for i in range(1, 4):  # 3 assessors
                email = f"assessor{i}@sinag.dev"

                # Check if user already exists
                existing = db.query(User).filter(User.email == email).first()
                if existing:
                    continue

                user = User(
                    email=email,
                    name=f"Assessor {i}",
                    hashed_password=get_password_hash(DEFAULT_PASSWORD),
                    role=UserRole.ASSESSOR,
                    is_active=True,
                    is_superuser=False,
                    must_change_password=True,
                )
                db.add(user)
                created_assessors += 1

            if created_assessors > 0:
                db.flush()
                logger.info(f"    ✓ Created {created_assessors} Assessor user(s)")
            else:
                logger.info("    - Assessors already exist. Skipping.")

            # ─────────────────────────────────────────────────────────────
            # 3. Seed Validators (6 validators, one per governance area)
            # ─────────────────────────────────────────────────────────────
            logger.info("  - Seeding Validator users...")
            governance_areas = db.query(GovernanceArea).order_by(GovernanceArea.id).all()

            for area in governance_areas:
                email = f"validator_area{area.id}@sinag.dev"

                # Check if user already exists
                existing = db.query(User).filter(User.email == email).first()
                if existing:
                    continue

                # Create a short name for the validator based on area
                area_short_names = {
                    1: "Financial Admin",
                    2: "Disaster Prep",
                    3: "Peace & Order",
                    4: "Social Protection",
                    5: "Business-Friendly",
                    6: "Environmental Mgmt",
                }
                short_name = area_short_names.get(area.id, f"Area {area.id}")

                user = User(
                    email=email,
                    name=f"Validator - {short_name}",
                    hashed_password=get_password_hash(DEFAULT_PASSWORD),
                    role=UserRole.VALIDATOR,
                    validator_area_id=area.id,
                    is_active=True,
                    is_superuser=False,
                    must_change_password=True,
                )
                db.add(user)
                created_validators += 1

            if created_validators > 0:
                db.flush()
                logger.info(f"    ✓ Created {created_validators} Validator user(s)")
            else:
                logger.info("    - Validators already exist. Skipping.")

            # ─────────────────────────────────────────────────────────────
            # Commit all changes
            # ─────────────────────────────────────────────────────────────
            db.commit()

            total_created = created_blgu + created_assessors + created_validators
            if total_created > 0:
                logger.info(f"  ✅ Demo user seeding complete! ({total_created} users created)")
                logger.info(f"  ⚠️  Default password for all demo users: {DEFAULT_PASSWORD}")
            else:
                logger.info("  - All demo users already exist. Skipping.")

        except Exception as e:
            logger.warning(f"⚠️  Could not seed demo users: {str(e)}")
            db.rollback()
        finally:
            db.close()

    def _validate_indicators(self) -> None:
        """
        Validate that all expected indicators are present in the database.

        This check prevents issues like missing governance area indicators
        from going unnoticed. It verifies:
        1. All 6 governance areas have indicators
        2. Expected number of parent indicators per area
        3. No indicators with NULL indicator_code (corrupt records)

        Raises:
            RuntimeError: If critical indicator data is missing (only in FAIL_FAST mode)
        """
        import os
        # Skip validation in tests
        if os.getenv("SKIP_STARTUP_SEEDING") == "true":
            return

        logger.info("📊 Validating indicator data integrity...")

        # Expected parent indicators per governance area (from definitions)
        EXPECTED_INDICATORS = {
            1: {"name": "Financial Administration and Sustainability", "count": 7},
            2: {"name": "Disaster Preparedness", "count": 3},
            3: {"name": "Safety, Peace and Order", "count": 6},
            4: {"name": "Social Protection and Sensitivity", "count": 9},
            5: {"name": "Business-Friendliness and Competitiveness", "count": 3},
            6: {"name": "Environmental Management", "count": 3},
        }

        db: Session = SessionLocal()
        errors: List[str] = []
        warnings: List[str] = []

        try:
            # Check for corrupt records (NULL indicator_code)
            corrupt_count = db.query(Indicator).filter(
                Indicator.indicator_code.is_(None),
                Indicator.parent_id.is_(None)  # Only check root indicators
            ).count()

            if corrupt_count > 0:
                errors.append(f"Found {corrupt_count} corrupt indicator(s) with NULL indicator_code")

            # Check each governance area
            for area_id, expected in EXPECTED_INDICATORS.items():
                actual_count = db.query(Indicator).filter(
                    Indicator.governance_area_id == area_id,
                    Indicator.parent_id.is_(None)  # Parent indicators only
                ).count()

                if actual_count == 0:
                    errors.append(f"Area {area_id} ({expected['name']}) has NO indicators!")
                elif actual_count < expected["count"]:
                    warnings.append(
                        f"Area {area_id} ({expected['name']}): Expected {expected['count']} "
                        f"parent indicators, found {actual_count}"
                    )

            # Check total indicator count
            total_parents = db.query(Indicator).filter(
                Indicator.parent_id.is_(None)
            ).count()

            expected_total = sum(e["count"] for e in EXPECTED_INDICATORS.values())  # 31

            if total_parents < expected_total:
                warnings.append(
                    f"Total parent indicators: Expected {expected_total}, found {total_parents}"
                )

            # Log results
            if errors:
                logger.error("❌ Critical indicator data issues found:")
                for error in errors:
                    logger.error(f"  - {error}")

                if settings.FAIL_FAST:
                    error_msg = (
                        "Critical indicator data integrity issues detected!\n"
                        "Run migrations to fix: alembic upgrade head\n"
                        "Issues:\n" + "\n".join(f"  - {e}" for e in errors)
                    )
                    raise RuntimeError(error_msg)
                else:
                    logger.warning("⚠️  Continuing despite errors (FAIL_FAST=false)")

            if warnings:
                logger.warning("⚠️  Indicator data warnings:")
                for warning in warnings:
                    logger.warning(f"  - {warning}")
            else:
                logger.info(f"✅ Indicator validation passed ({total_parents} parent indicators)")

        except RuntimeError:
            raise
        except Exception as e:
            logger.warning(f"⚠️  Could not validate indicators: {str(e)}")
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
                f"🎯 SINAG API server startup complete! ({startup_duration:.2f}s)"
            )
        else:
            logger.info("🎯 SINAG API server startup complete!")

    def log_shutdown(self) -> None:
        """Log application shutdown"""
        logger.info("🛑 Shutting down SINAG API server...")
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
