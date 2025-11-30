"""
Tests for user schema validation (email, password strength, type coercion)
Tests the new validation features added to user schemas
"""

import pytest
from pydantic import ValidationError

from app.schemas.user import (
    UserCreate,
    UserAdminCreate,
    UserAdminUpdate,
    UserUpdate,
    PasswordResetRequest,
    coerce_to_optional_int,
    validate_password_strength,
)
from app.db.enums import UserRole


# ====================================================================
# Email Validation Tests (EmailStr)
# ====================================================================


class TestEmailValidation:
    """Test suite for EmailStr validation."""

    def test_valid_email_accepted(self):
        """Test that valid email formats are accepted."""
        valid_emails = [
            "user@example.com",
            "test.user@example.co.uk",
            "admin@dilg.gov.ph",
            "validator+test@sulop.gov.ph",
        ]

        for email in valid_emails:
            user = UserCreate(
                email=email,
                name="Test User",
                password="ValidPass123",
            )
            assert user.email == email

    def test_invalid_email_rejected(self):
        """Test that invalid email formats are rejected."""
        invalid_emails = [
            "not-an-email",
            "missing@domain",
            "@nodomain.com",
            "spaces in@email.com",
            "double@@domain.com",
        ]

        for email in invalid_emails:
            with pytest.raises(ValidationError) as exc_info:
                UserCreate(
                    email=email,
                    name="Test User",
                    password="ValidPass123",
                )

            error = exc_info.value.errors()[0]
            assert "email" in error["loc"]

    def test_empty_email_rejected(self):
        """Test that empty email is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="",
                name="Test User",
                password="ValidPass123",
            )

        error = exc_info.value.errors()[0]
        assert "email" in error["loc"]

    def test_email_validation_in_admin_create(self):
        """Test email validation in UserAdminCreate schema."""
        with pytest.raises(ValidationError) as exc_info:
            UserAdminCreate(
                email="invalid-email",
                name="Admin User",
                password="ValidPass123",
                role=UserRole.MLGOO_DILG,
            )

        error = exc_info.value.errors()[0]
        assert "email" in error["loc"]

    def test_email_validation_in_update_schemas(self):
        """Test email validation in update schemas."""
        # UserUpdate
        with pytest.raises(ValidationError) as exc_info:
            UserUpdate(email="not-valid")

        error = exc_info.value.errors()[0]
        assert "email" in error["loc"]

        # UserAdminUpdate
        with pytest.raises(ValidationError) as exc_info:
            UserAdminUpdate(email="also-not-valid")

        error = exc_info.value.errors()[0]
        assert "email" in error["loc"]


# ====================================================================
# Password Strength Validation Tests
# ====================================================================


class TestPasswordStrengthValidation:
    """Test suite for password strength validation."""

    def test_valid_password_accepted(self):
        """Test that passwords meeting all requirements are accepted."""
        valid_passwords = [
            "ValidPass123",
            "SecurePassword1",
            "Abcd1234efgh",
            "P@ssw0rd123",
            "MySecure123Pass",
        ]

        for password in valid_passwords:
            user = UserCreate(
                email="test@example.com",
                name="Test User",
                password=password,
            )
            assert user.password == password

    def test_password_too_short_rejected(self):
        """Test that passwords shorter than 8 characters are rejected."""
        short_passwords = [
            "Short1",      # 6 chars
            "Pass1",       # 5 chars
            "Abc123",      # 6 chars
            "Test1",       # 5 chars
        ]

        for password in short_passwords:
            with pytest.raises(ValidationError) as exc_info:
                UserCreate(
                    email="test@example.com",
                    name="Test User",
                    password=password,
                )

            error = exc_info.value.errors()[0]
            assert "password" in error["loc"]
            assert "at least 8 characters" in str(error["ctx"]["error"]).lower()

    def test_password_missing_uppercase_rejected(self):
        """Test that passwords without uppercase letters are rejected."""
        no_uppercase = [
            "alllowercase123",
            "password1234",
            "nouppercasehere1",
        ]

        for password in no_uppercase:
            with pytest.raises(ValidationError) as exc_info:
                UserCreate(
                    email="test@example.com",
                    name="Test User",
                    password=password,
                )

            error = exc_info.value.errors()[0]
            assert "password" in error["loc"]
            assert "uppercase" in str(error["ctx"]["error"]).lower()

    def test_password_missing_lowercase_rejected(self):
        """Test that passwords without lowercase letters are rejected."""
        no_lowercase = [
            "ALLUPPERCASE123",
            "PASSWORD1234",
            "NOLOWERCASEHERE1",
        ]

        for password in no_lowercase:
            with pytest.raises(ValidationError) as exc_info:
                UserCreate(
                    email="test@example.com",
                    name="Test User",
                    password=password,
                )

            error = exc_info.value.errors()[0]
            assert "password" in error["loc"]
            assert "lowercase" in str(error["ctx"]["error"]).lower()

    def test_password_missing_digit_rejected(self):
        """Test that passwords without digits are rejected."""
        no_digit = [
            "NoDigitsHere",
            "PasswordOnly",
            "AllLettersNoNumber",
        ]

        for password in no_digit:
            with pytest.raises(ValidationError) as exc_info:
                UserCreate(
                    email="test@example.com",
                    name="Test User",
                    password=password,
                )

            error = exc_info.value.errors()[0]
            assert "password" in error["loc"]
            assert "digit" in str(error["ctx"]["error"]).lower()

    def test_password_validation_in_admin_create(self):
        """Test password validation in UserAdminCreate schema."""
        with pytest.raises(ValidationError) as exc_info:
            UserAdminCreate(
                email="admin@example.com",
                name="Admin User",
                password="weak",  # Too short, missing uppercase and digit
                role=UserRole.MLGOO_DILG,
            )

        error = exc_info.value.errors()[0]
        assert "password" in error["loc"]

    def test_password_validation_in_reset_request(self):
        """Test password validation in PasswordResetRequest schema."""
        with pytest.raises(ValidationError) as exc_info:
            PasswordResetRequest(new_password="short1")

        error = exc_info.value.errors()[0]
        assert "new_password" in error["loc"]

    def test_validate_password_strength_function_direct(self):
        """Test the validate_password_strength function directly."""
        # Valid password should return unchanged
        valid = "ValidPass123"
        assert validate_password_strength(valid) == valid

        # Invalid passwords should raise ValueError
        with pytest.raises(ValueError, match="at least 8 characters"):
            validate_password_strength("Short1")

        with pytest.raises(ValueError, match="uppercase"):
            validate_password_strength("nouppercase123")

        with pytest.raises(ValueError, match="lowercase"):
            validate_password_strength("NOLOWERCASE123")

        with pytest.raises(ValueError, match="digit"):
            validate_password_strength("NoDigitsHere")


# ====================================================================
# Type Coercion Tests (coerce_to_optional_int)
# ====================================================================


class TestTypeCoercion:
    """Test suite for type coercion validation."""

    def test_coerce_to_optional_int_function_direct(self):
        """Test the coerce_to_optional_int function directly."""
        # Integer passthrough
        assert coerce_to_optional_int(42) == 42
        assert coerce_to_optional_int(0) == 0

        # String to int conversion
        assert coerce_to_optional_int("123") == 123
        assert coerce_to_optional_int("0") == 0

        # Null/empty handling
        assert coerce_to_optional_int(None) is None
        assert coerce_to_optional_int("") is None
        assert coerce_to_optional_int("null") is None

        # Invalid string raises ValueError
        with pytest.raises(ValueError, match="Invalid integer value"):
            coerce_to_optional_int("not-a-number")

        with pytest.raises(ValueError, match="Invalid integer value"):
            coerce_to_optional_int("12.5")

    def test_barangay_id_string_to_int_coercion(self):
        """Test barangay_id coercion from string to int in UserCreate."""
        # String number should be coerced to int
        user = UserCreate(
            email="test@example.com",
            name="Test User",
            password="ValidPass123",
            barangay_id="42",  # String instead of int
        )
        assert user.barangay_id == 42
        assert isinstance(user.barangay_id, int)

    def test_barangay_id_null_string_coercion(self):
        """Test barangay_id coercion for null/empty strings."""
        # Empty string should become None
        user = UserCreate(
            email="test@example.com",
            name="Test User",
            password="ValidPass123",
            barangay_id="",  # Empty string
        )
        assert user.barangay_id is None

        # "null" string should become None
        user = UserCreate(
            email="test@example.com",
            name="Test User",
            password="ValidPass123",
            barangay_id="null",  # String "null"
        )
        assert user.barangay_id is None

    def test_validator_area_id_string_to_int_coercion(self):
        """Test validator_area_id coercion in UserAdminUpdate."""
        # String number should be coerced to int
        update = UserAdminUpdate(
            validator_area_id="5",  # String instead of int
        )
        assert update.validator_area_id == 5
        assert isinstance(update.validator_area_id, int)

    def test_multiple_id_coercion_in_admin_create(self):
        """Test both validator_area_id and barangay_id coercion in UserAdminCreate."""
        # Both string numbers should be coerced
        user = UserAdminCreate(
            email="test@example.com",
            name="Test User",
            password="ValidPass123",
            role=UserRole.VALIDATOR,
            validator_area_id="3",  # String
            barangay_id="7",  # String (will be cleared for VALIDATOR role)
        )
        assert user.validator_area_id == 3
        assert isinstance(user.validator_area_id, int)
        # Note: barangay_id will be coerced but then cleared by service layer

    def test_invalid_string_for_id_coercion_rejected(self):
        """Test that invalid strings for ID fields are rejected."""
        with pytest.raises(ValidationError) as exc_info:
            UserAdminUpdate(
                validator_area_id="not-a-number",
            )

        error = exc_info.value.errors()[0]
        assert "validator_area_id" in error["loc"]


# ====================================================================
# Combined Validation Tests
# ====================================================================


class TestCombinedValidation:
    """Test suite for combined validation scenarios."""

    def test_valid_user_create_with_all_validations(self):
        """Test UserCreate with all validation features working together."""
        user = UserCreate(
            email="valid.email@example.com",  # Valid email
            name="Test User",
            password="SecurePass123",  # Valid password
            barangay_id="42",  # String coerced to int
        )
        assert user.email == "valid.email@example.com"
        assert user.password == "SecurePass123"
        assert user.barangay_id == 42

    def test_valid_admin_create_with_all_validations(self):
        """Test UserAdminCreate with all validation features working together."""
        user = UserAdminCreate(
            email="admin@dilg.gov.ph",  # Valid email
            name="Admin User",
            password="StrongPass456",  # Valid password
            role=UserRole.VALIDATOR,
            validator_area_id="3",  # String coerced to int
        )
        assert user.email == "admin@dilg.gov.ph"
        assert user.password == "StrongPass456"
        assert user.validator_area_id == 3

    def test_invalid_email_and_password_both_rejected(self):
        """Test that both email and password validation errors are caught."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(
                email="not-valid-email",  # Invalid email
                name="Test User",
                password="weak",  # Invalid password (too short, missing uppercase and digit)
            )

        errors = exc_info.value.errors()
        error_fields = [error["loc"][0] for error in errors]
        # Should have errors for both email and password
        assert "email" in error_fields
        assert "password" in error_fields

    def test_password_reset_request_validation(self):
        """Test PasswordResetRequest schema validation."""
        # Valid password
        request = PasswordResetRequest(new_password="NewSecure123")
        assert request.new_password == "NewSecure123"

        # Invalid password
        with pytest.raises(ValidationError) as exc_info:
            PasswordResetRequest(new_password="weak")

        error = exc_info.value.errors()[0]
        assert "new_password" in error["loc"]


# ====================================================================
# Edge Case Tests
# ====================================================================


class TestEdgeCases:
    """Test suite for edge cases and boundary conditions."""

    def test_password_exactly_8_characters_accepted(self):
        """Test that 8-character passwords are accepted (minimum length)."""
        user = UserCreate(
            email="test@example.com",
            name="Test User",
            password="Valid123",  # Exactly 8 characters
        )
        assert user.password == "Valid123"

    def test_password_with_special_characters_accepted(self):
        """Test that passwords with special characters are accepted."""
        special_passwords = [
            "P@ssw0rd",
            "Secure#123",
            "Valid$Pass1",
            "Test!Pass123",
        ]

        for password in special_passwords:
            user = UserCreate(
                email="test@example.com",
                name="Test User",
                password=password,
            )
            assert user.password == password

    def test_very_long_password_accepted(self):
        """Test that very long passwords are accepted."""
        long_password = "VeryLongSecurePassword123" * 10  # 250 characters
        user = UserCreate(
            email="test@example.com",
            name="Test User",
            password=long_password,
        )
        assert user.password == long_password

    def test_barangay_id_zero_coercion(self):
        """Test that barangay_id of 0 is properly handled."""
        # Integer 0 should be kept as 0
        user = UserCreate(
            email="test@example.com",
            name="Test User",
            password="ValidPass123",
            barangay_id=0,
        )
        assert user.barangay_id == 0

        # String "0" should be coerced to int 0
        user = UserCreate(
            email="test@example.com",
            name="Test User",
            password="ValidPass123",
            barangay_id="0",
        )
        assert user.barangay_id == 0

    def test_email_case_preservation(self):
        """Test that email case is preserved (case-insensitive comparison is at DB level)."""
        user = UserCreate(
            email="Test.User@Example.COM",
            name="Test User",
            password="ValidPass123",
        )
        # EmailStr preserves case but validates format
        # (case-insensitive comparison happens at DB level via collation)
        assert user.email == "Test.User@example.com"  # Domain is normalized to lowercase by EmailStr
