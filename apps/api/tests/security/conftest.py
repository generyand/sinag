"""
Security Test Fixtures
Imports fixtures from integration tests to avoid duplication
"""

# Import all integration test fixtures
from tests.integration.conftest import (
    auth_headers_assessor,
    auth_headers_blgu,
    auth_headers_mlgoo,
    auth_headers_validator,
    governance_area,
    test_assessor_user,
    test_blgu_user,
    test_mlgoo_user,
    test_validator_user,
)

# Re-export fixtures for use in security tests
__all__ = [
    "test_blgu_user",
    "test_assessor_user",
    "test_validator_user",
    "test_mlgoo_user",
    "auth_headers_blgu",
    "auth_headers_assessor",
    "auth_headers_validator",
    "auth_headers_mlgoo",
    "governance_area",
]
