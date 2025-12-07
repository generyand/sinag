"""
Tests for user language preference schemas
Tests the LanguageCode type and language field validation in user schemas
"""

import pytest
from pydantic import ValidationError

from app.db.enums import UserRole
from app.schemas.user import (
    User,
    UserAdminCreate,
    UserAdminUpdate,
    UserCreate,
    UserUpdate,
)


class TestLanguageCodeValidation:
    """Test suite for LanguageCode type validation."""

    def test_language_code_accepts_ceb(self):
        """Test that 'ceb' is a valid language code."""
        # Valid language codes should work when passed to schemas
        user_create = UserCreate(
            email="test@example.com",
            name="Test User",
            password="TestPassword123!",
            preferred_language="ceb",
        )
        assert user_create.preferred_language == "ceb"

    def test_language_code_accepts_fil(self):
        """Test that 'fil' is a valid language code."""
        user_create = UserCreate(
            email="test@example.com",
            name="Test User",
            password="TestPassword123!",
            preferred_language="fil",
        )
        assert user_create.preferred_language == "fil"

    def test_language_code_accepts_en(self):
        """Test that 'en' is a valid language code."""
        user_create = UserCreate(
            email="test@example.com",
            name="Test User",
            password="TestPassword123!",
            preferred_language="en",
        )
        assert user_create.preferred_language == "en"

    def test_language_code_rejects_invalid_codes(self):
        """Test that invalid language codes are rejected."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="test@example.com",
                name="Test User",
                password="TestPassword123!",
                preferred_language="invalid_code",
            )

        error = exc_info.value.errors()[0]
        assert "preferred_language" in error["loc"]
        # Pydantic will reject the invalid literal value

    def test_language_code_rejects_empty_string(self):
        """Test that empty string is rejected as language code."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="test@example.com",
                name="Test User",
                password="TestPassword123!",
                preferred_language="",
            )

        error = exc_info.value.errors()[0]
        assert "preferred_language" in error["loc"]


class TestUserCreateSchemaLanguage:
    """Test UserCreate schema with language preference."""

    def test_user_create_default_language_is_ceb(self):
        """Test that default language is 'ceb' when not specified."""
        user_create = UserCreate(
            email="test@example.com", name="Test User", password="TestPassword123!"
        )
        assert user_create.preferred_language == "ceb"

    def test_user_create_with_explicit_language(self):
        """Test creating user with explicit language preference."""
        user_create = UserCreate(
            email="test@example.com",
            name="Test User",
            password="TestPassword123!",
            preferred_language="fil",
        )
        assert user_create.preferred_language == "fil"

    def test_user_create_with_all_languages(self):
        """Test creating user with each supported language."""
        for lang in ["ceb", "fil", "en"]:
            user_create = UserCreate(
                email=f"test_{lang}@example.com",
                name=f"Test User {lang}",
                password="TestPassword123!",
                preferred_language=lang,
            )
            assert user_create.preferred_language == lang


class TestUserUpdateSchemaLanguage:
    """Test UserUpdate schema with language preference."""

    def test_user_update_language_optional(self):
        """Test that language is optional in update schema."""
        user_update = UserUpdate(name="Updated Name")
        assert user_update.preferred_language is None

    def test_user_update_with_language_change(self):
        """Test updating language preference."""
        user_update = UserUpdate(preferred_language="en")
        assert user_update.preferred_language == "en"

    def test_user_update_all_languages(self):
        """Test updating to each supported language."""
        for lang in ["ceb", "fil", "en"]:
            user_update = UserUpdate(preferred_language=lang)
            assert user_update.preferred_language == lang

    def test_user_update_rejects_invalid_language(self):
        """Test that invalid language is rejected in update."""
        with pytest.raises(ValidationError) as exc_info:
            UserUpdate(preferred_language="invalid")

        error = exc_info.value.errors()[0]
        assert "preferred_language" in error["loc"]


class TestUserAdminCreateSchemaLanguage:
    """Test UserAdminCreate schema with language preference."""

    def test_admin_create_default_language_is_ceb(self):
        """Test that default language is 'ceb' for admin-created users."""
        user_create = UserAdminCreate(
            email="admin@example.com",
            name="Admin User",
            password="TestPassword123!",
            role=UserRole.MLGOO_DILG,
        )
        assert user_create.preferred_language == "ceb"

    def test_admin_create_with_explicit_language(self):
        """Test admin creating user with explicit language."""
        user_create = UserAdminCreate(
            email="admin@example.com",
            name="Admin User",
            password="TestPassword123!",
            role=UserRole.MLGOO_DILG,
            preferred_language="en",
        )
        assert user_create.preferred_language == "en"

    def test_admin_create_blgu_user_with_tagalog(self):
        """Test admin creating BLGU user with Tagalog preference."""
        user_create = UserAdminCreate(
            email="blgu@example.com",
            name="BLGU User",
            password="TestPassword123!",
            role=UserRole.BLGU_USER,
            barangay_id=1,
            preferred_language="fil",
        )
        assert user_create.preferred_language == "fil"
        assert user_create.role == UserRole.BLGU_USER


class TestUserAdminUpdateSchemaLanguage:
    """Test UserAdminUpdate schema with language preference."""

    def test_admin_update_language_optional(self):
        """Test that language is optional in admin update."""
        user_update = UserAdminUpdate(name="Updated Name")
        assert user_update.preferred_language is None

    def test_admin_update_with_language_change(self):
        """Test admin updating language preference."""
        user_update = UserAdminUpdate(preferred_language="fil")
        assert user_update.preferred_language == "fil"

    def test_admin_update_rejects_invalid_language(self):
        """Test that invalid language is rejected in admin update."""
        with pytest.raises(ValidationError) as exc_info:
            UserAdminUpdate(preferred_language="es")  # Spanish not supported

        error = exc_info.value.errors()[0]
        assert "preferred_language" in error["loc"]


class TestUserResponseSchemaLanguage:
    """Test User response schema includes language field."""

    def test_user_response_includes_language_field(self):
        """Test that User response schema includes preferred_language field."""
        from datetime import datetime

        user = User(
            id=1,
            email="test@example.com",
            name="Test User",
            role=UserRole.BLGU_USER,
            is_active=True,
            is_superuser=False,
            must_change_password=False,
            preferred_language="ceb",
            created_at=datetime.now(),
        )
        assert user.preferred_language == "ceb"
        assert hasattr(user, "preferred_language")

    def test_user_response_default_language(self):
        """Test User response schema has correct default language."""
        from datetime import datetime

        user = User(
            id=1,
            email="test@example.com",
            name="Test User",
            role=UserRole.BLGU_USER,
            is_active=True,
            is_superuser=False,
            must_change_password=False,
            created_at=datetime.now(),
        )
        # Should use default value of "ceb"
        assert user.preferred_language == "ceb"

    def test_user_response_with_all_languages(self):
        """Test User response schema supports all language codes."""
        from datetime import datetime

        for lang in ["ceb", "fil", "en"]:
            user = User(
                id=1,
                email=f"test_{lang}@example.com",
                name=f"Test User {lang}",
                role=UserRole.BLGU_USER,
                is_active=True,
                is_superuser=False,
                must_change_password=False,
                preferred_language=lang,
                created_at=datetime.now(),
            )
            assert user.preferred_language == lang
