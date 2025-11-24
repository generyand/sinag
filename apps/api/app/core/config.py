# ⚙️ Core Configuration
# Pydantic settings management for environment variables and app configuration

import secrets
from typing import List, Optional

from pydantic import ConfigDict, ValidationInfo, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    Uses .env file for local development.
    """

    # Project Information
    PROJECT_NAME: str = "VANTAGE API"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Leadership Assessment and Development Platform"

    # API Configuration
    API_V1_STR: str = "/api/v1"

    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        # Development
        "http://localhost:3000",
        "http://localhost:3001",
        "https://localhost:3000",
        "https://localhost:3001",
        # Docker internal network access
        "http://vantage-web:3000",
        "http://172.25.0.40:3000",
        # Production (add your production domain here)
        # "https://vantage.dilg.gov.ph",
        # "https://www.vantage.dilg.gov.ph",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        """Parse CORS origins from string or list."""
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Database (Supabase PostgreSQL)
    DATABASE_URL: Optional[str] = None

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_supabase_db_url(cls, v, info: ValidationInfo):
        """Assemble Supabase database URL."""
        if isinstance(v, str) and v:
            return v

        # Extract database URL from Supabase URL if not provided directly
        supabase_url = info.data.get("SUPABASE_URL", "") if info.data else ""
        if supabase_url:
            # Supabase database URL pattern:
            # postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
            # This will be set from environment or Supabase dashboard
            return None  # Will be set via environment variable

        return None

    # Connection Requirements
    REQUIRE_ALL_CONNECTIONS: bool = (
        True  # If False, server can start with at least one working connection
    )

    # Email Configuration (for notifications)
    SMTP_TLS: bool = True
    SMTP_PORT: Optional[int] = None
    SMTP_HOST: Optional[str] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[str] = None
    EMAILS_FROM_NAME: Optional[str] = None

    # File Upload
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    UPLOAD_FOLDER: str = "uploads"
    ALLOWED_EXTENSIONS: List[str] = [".mov", ".mp4", ".avi", ".mkv"]

    # Background Tasks
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    REQUIRE_CELERY: bool = True  # If False, Redis failures only log warnings

    # Gemini AI Configuration
    GEMINI_API_KEY: Optional[str] = None

    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Startup Behavior
    FAIL_FAST: bool = True  # If True, crash on startup errors. If False, log warnings and continue.

    # First Superuser
    FIRST_SUPERUSER: str = "admin@vantage.com"
    FIRST_SUPERUSER_PASSWORD: str = "changethis"

    model_config = ConfigDict(env_file=".env", case_sensitive=True, extra="ignore")


# Global settings instance
settings = Settings()
