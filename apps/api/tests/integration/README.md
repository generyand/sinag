# Integration Tests - Epic 6.0 Story 6.3

## Overview

This directory contains comprehensive integration tests for the SINAG backend API, covering end-to-end workflows across Epics 1-5.

## Test Structure

### Fixtures (`conftest.py`)

The `conftest.py` file provides comprehensive test fixtures for integration testing:

#### User Fixtures
- `test_blgu_user` - BLGU user with authentication credentials
- `test_assessor_user` - ASSESSOR user with authentication credentials
- `test_validator_user` - VALIDATOR user with authentication credentials
- `test_mlgoo_user` - MLGOO_DILG admin user with authentication credentials

#### Authentication Fixtures
- `auth_headers_blgu` - Pre-authenticated headers for BLGU user
- `auth_headers_assessor` - Pre-authenticated headers for ASSESSOR user
- `auth_headers_validator` - Pre-authenticated headers for VALIDATOR user
- `auth_headers_mlgoo` - Pre-authenticated headers for MLGOO admin user

#### Test Data Fixtures
- `governance_area` - Test governance area
- `test_indicator` - Test indicator with complete form_schema
- `test_assessment_data` - Sample assessment response data
- `test_draft_assessment` - Assessment in DRAFT status
- `test_submitted_assessment` - Assessment in SUBMITTED status
- `test_rework_assessment` - Assessment in REWORK status
- `test_assessment_with_responses` - Assessment with saved responses

## Running Tests

### Run all integration tests
```bash
pnpm test
```

### Run specific integration test file
```bash
cd apps/api
pytest tests/integration/test_submission_flow.py -v
```

### Run with verbose output
```bash
cd apps/api
pytest tests/integration/ -vv --log-cli-level=DEBUG
```

## Test Coverage

Integration tests cover:

1. **Submission Flow** - Complete assessment submission workflow
2. **Rework Cycle** - Rework request and resubmission flow
3. **Role-Based Access Control** - Permission enforcement across roles
4. **MOV Operations** - File upload, deletion, and access control
5. **Database Transactions** - Rollback on error scenarios
6. **Calculation Engine** - Form response calculation integration
7. **Validation Enforcement** - Pre-submission validation
8. **Concurrent Operations** - Race condition handling

## Fixture Usage Examples

### Testing BLGU submission
```python
def test_blgu_submits_assessment(
    client,
    auth_headers_blgu,
    test_draft_assessment
):
    response = client.post(
        f"/api/v1/assessments/{test_draft_assessment.id}/submit",
        headers=auth_headers_blgu
    )
    assert response.status_code == 200
```

### Testing Assessor rework request
```python
def test_assessor_requests_rework(
    client,
    auth_headers_assessor,
    test_submitted_assessment
):
    response = client.post(
        f"/api/v1/assessments/{test_submitted_assessment.id}/request-rework",
        headers=auth_headers_assessor,
        json={"comments": "Please revise indicators 1-3"}
    )
    assert response.status_code == 200
```

## Notes

- All fixtures use unique identifiers (UUID) to avoid test conflicts
- Database is cleaned between tests via `db_session` fixture
- Authentication headers are automatically generated via login endpoint
- Plaintext passwords are stored on user objects for testing only
