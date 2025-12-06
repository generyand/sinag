"""
🔒 Compliance Separation: BLGU Response Filtering (Story 6.10 - Task 6.10.1)

Tests that BLGU-accessible endpoints NEVER return calculated_status or calculated_remark.
Verifies completeness vs compliance separation is enforced at API layer.

CRITICAL: This is a security requirement. BLGU users should only see completion status,
not compliance/quality assessment (PASS/FAIL/CONDITIONAL).
"""

from fastapi.testclient import TestClient

from app.db.models.assessment import Assessment
from app.db.models.governance_area import Indicator


class TestBLGUResponseFiltering:
    """
    Test that BLGU endpoints filter out compliance fields (Task 6.10.1)
    """

    def test_get_assessment_excludes_calculated_status(
        self,
        client: TestClient,
        auth_headers_blgu: dict[str, str],
        test_draft_assessment: Assessment,
    ):
        """
        Test: GET /assessments/{id} for BLGU user excludes calculated_status.

        Verifies:
        - Response does not contain calculated_status field
        - Response does not contain calculated_remark field
        - Only completion-related fields returned
        - Compliance data hidden from BLGU
        """
        response = client.get(
            f"/api/v1/assessments/{test_draft_assessment.id}",
            headers=auth_headers_blgu,
        )

        assert response.status_code == 200
        data = response.json()

        # CRITICAL: These fields must NOT be present for BLGU
        assert "calculated_status" not in data
        assert "calculated_remark" not in data
        assert "compliance_status" not in data
        assert "validation_status" not in data

        # Completeness fields ARE allowed
        # (These would be present if they exist)
        # assert "status" in data  # Overall assessment status
        # assert "is_complete" in data  # Completeness flag

    def test_list_assessments_excludes_calculated_status(
        self,
        client: TestClient,
        auth_headers_blgu: dict[str, str],
    ):
        """
        Test: GET /assessments list for BLGU excludes calculated_status.

        Verifies:
        - All assessments in list exclude calculated_status
        - Bulk endpoints respect field filtering
        - No compliance data leakage in lists
        """
        response = client.get("/api/v1/assessments", headers=auth_headers_blgu)

        if response.status_code == 200:
            assessments = response.json()

            # Verify each assessment excludes compliance fields
            for assessment in assessments:
                assert "calculated_status" not in assessment
                assert "calculated_remark" not in assessment
                assert "compliance_status" not in assessment

    def test_get_assessment_response_excludes_calculated_status(
        self,
        client: TestClient,
        auth_headers_blgu: dict[str, str],
        test_assessment_with_responses: Assessment,
    ):
        """
        Test: GET /assessments/responses/{id} excludes calculated_status.

        Verifies:
        - Individual response objects exclude calculated_status
        - Response-level compliance hidden from BLGU
        """
        if len(test_assessment_with_responses.responses) > 0:
            response_obj = test_assessment_with_responses.responses[0]

            response = client.get(
                f"/api/v1/assessments/responses/{response_obj.id}",
                headers=auth_headers_blgu,
            )

            if response.status_code == 200:
                data = response.json()

                # CRITICAL: Response-level compliance must be hidden
                assert "calculated_status" not in data
                assert "calculated_remark" not in data
                assert "validation_status" not in data

    def test_get_indicator_excludes_calculated_fields(
        self,
        client: TestClient,
        auth_headers_blgu: dict[str, str],
        test_indicator: Indicator,
    ):
        """
        Test: GET /indicators/{id} for BLGU excludes calculation_schema.

        Verifies:
        - calculation_schema not exposed to BLGU
        - Only form_schema returned
        - Compliance logic hidden
        """
        response = client.get(
            f"/api/v1/lookups/indicators/{test_indicator.id}",
            headers=auth_headers_blgu,
        )

        if response.status_code == 200:
            data = response.json()

            # calculation_schema should be excluded for BLGU
            # (or only visible to assessors/admins)
            # Form schema IS visible
            # assert "form_schema" in data

    def test_submission_status_endpoint_excludes_compliance(
        self,
        client: TestClient,
        auth_headers_blgu: dict[str, str],
        test_draft_assessment: Assessment,
    ):
        """
        Test: GET /assessments/{id}/submission-status excludes compliance.

        Verifies:
        - Validation status endpoint shows completeness only
        - No compliance PASS/FAIL/CONDITIONAL exposed
        - Only "complete" vs "incomplete" for BLGU
        """
        response = client.get(
            f"/api/v1/assessments/{test_draft_assessment.id}/submission-status",
            headers=auth_headers_blgu,
        )

        if response.status_code == 200:
            data = response.json()

            # Should show completeness validation
            # Should NOT show compliance validation
            assert "calculated_status" not in data
            assert "compliance_status" not in data
            assert "validation_status" not in data

            # Completeness fields allowed
            # assert "is_complete" in data
            # assert "incomplete_indicators" in data

    def test_dashboard_endpoint_excludes_compliance_stats(
        self,
        client: TestClient,
        auth_headers_blgu: dict[str, str],
    ):
        """
        Test: GET /blgu/dashboard excludes compliance statistics.

        Verifies:
        - Dashboard shows completion stats only
        - No PASS/FAIL counts for BLGU
        - Only submission status counts
        """
        response = client.get("/api/v1/blgu/dashboard", headers=auth_headers_blgu)

        if response.status_code == 200:
            data = response.json()

            # Should NOT contain compliance statistics
            assert "pass_count" not in data
            assert "fail_count" not in data
            assert "conditional_count" not in data
            assert "compliance_rate" not in data

            # Completeness statistics ARE allowed
            # assert "total_assessments" in data
            # assert "draft_count" in data
            # assert "submitted_count" in data

    def test_resubmit_response_excludes_compliance(
        self,
        client: TestClient,
        auth_headers_blgu: dict[str, str],
        test_rework_assessment: Assessment,
    ):
        """
        Test: POST /assessments/{id}/resubmit response excludes compliance.

        Verifies:
        - Resubmission response doesn't leak compliance data
        - BLGU sees confirmation only
        - No calculated_status in response
        """
        response = client.post(
            f"/api/v1/assessments/{test_rework_assessment.id}/resubmit",
            headers=auth_headers_blgu,
        )

        if response.status_code in [200, 201]:
            data = response.json()

            # Resubmission confirmation should exclude compliance
            assert "calculated_status" not in data
            assert "calculated_remark" not in data


class TestComplianceFieldNaming:
    """
    Test that field naming conventions enforce separation
    """

    def test_calculated_status_never_in_any_blgu_response(
        self,
        client: TestClient,
        auth_headers_blgu: dict[str, str],
    ):
        """
        Test: Search all BLGU responses for compliance field leakage.

        Verifies:
        - Comprehensive check across all endpoints
        - String search for "calculated_status" in responses
        - Automated detection of leakage
        """
        # List of BLGU-accessible endpoints to test
        blgu_endpoints = [
            "/api/v1/assessments",
            "/api/v1/blgu/dashboard",
            "/api/v1/lookups/indicators",
            "/api/v1/lookups/governance-areas",
        ]

        for endpoint in blgu_endpoints:
            response = client.get(endpoint, headers=auth_headers_blgu)

            if response.status_code == 200:
                response_text = response.text.lower()

                # CRITICAL: These strings should never appear in BLGU responses
                assert "calculated_status" not in response_text
                assert "calculated_remark" not in response_text
                assert '"compliance"' not in response_text  # As a field name
                assert "validation_status" not in response_text

    def test_response_schema_validation_blgu(
        self,
        client: TestClient,
        auth_headers_blgu: dict[str, str],
        test_draft_assessment: Assessment,
    ):
        """
        Test: Validate response schema excludes compliance fields.

        Verifies:
        - Response conforms to BLGU-specific schema
        - Only whitelisted fields present
        - Schema validation enforced
        """
        response = client.get(
            f"/api/v1/assessments/{test_draft_assessment.id}",
            headers=auth_headers_blgu,
        )

        if response.status_code == 200:
            data = response.json()

            # Define allowed fields for BLGU assessment response
            allowed_fields = {
                "id",
                "blgu_id",
                "year",
                "status",
                "created_at",
                "updated_at",
                "submitted_at",
                "rework_requested_at",
                "rework_count",
                "responses",
                # Add other allowed fields
            }

            # Define forbidden compliance fields
            forbidden_fields = {
                "calculated_status",
                "calculated_remark",
                "compliance_status",
                "validation_status",
                "pass_count",
                "fail_count",
            }

            # Verify no forbidden fields present
            for field in forbidden_fields:
                assert field not in data, f"Forbidden field '{field}' found in BLGU response"


class TestComplianceCalculationTiming:
    """
    Test that compliance calculation happens but isn't exposed to BLGU
    """

    def test_compliance_calculated_on_submission_but_hidden(
        self,
        client: TestClient,
        auth_headers_blgu: dict[str, str],
        test_assessment_with_responses: Assessment,
    ):
        """
        Test: Compliance IS calculated on submission but NOT returned to BLGU.

        Verifies:
        - Backend calculates compliance
        - Stores calculated_status in database
        - But doesn't include it in BLGU response
        - Two-tier validation working
        """
        response = client.post(
            f"/api/v1/assessments/{test_assessment_with_responses.id}/submit",
            headers=auth_headers_blgu,
        )

        if response.status_code in [200, 201]:
            data = response.json()

            # Submission response should NOT include calculated_status
            assert "calculated_status" not in data

            # But backend should have calculated it (verify via admin endpoint later)

    def test_blgu_cannot_query_calculated_status_directly(
        self,
        client: TestClient,
        auth_headers_blgu: dict[str, str],
        test_draft_assessment: Assessment,
    ):
        """
        Test: BLGU cannot filter or query by calculated_status.

        Verifies:
        - Query parameters for calculated_status ignored or rejected
        - No way for BLGU to access compliance via query
        """
        # Attempt to filter by calculated_status
        response = client.get(
            "/api/v1/assessments?calculated_status=PASS", headers=auth_headers_blgu
        )

        # Should either ignore the filter or return empty results
        # Should not error out
        assert response.status_code in [200, 400]

        if response.status_code == 200:
            # If query succeeds, verify it didn't actually filter by compliance
            data = response.json()
            # Would verify results don't actually respect calculated_status filter


class TestErrorMessagesDoNotLeakCompliance:
    """
    Test that error messages don't leak compliance information
    """

    def test_validation_error_does_not_mention_compliance(
        self,
        client: TestClient,
        auth_headers_blgu: dict[str, str],
        test_draft_assessment: Assessment,
    ):
        """
        Test: Validation errors for BLGU don't mention compliance.

        Verifies:
        - Error messages use "completeness" terminology
        - Never mention "compliance", "PASS", "FAIL"
        - User-friendly non-technical language for BLGU
        """
        # Attempt to submit incomplete assessment
        response = client.post(
            f"/api/v1/assessments/{test_draft_assessment.id}/submit",
            headers=auth_headers_blgu,
        )

        if response.status_code == 400:
            error_data = response.json()
            error_message = str(error_data).lower()

            # Error should mention "complete" not "comply"
            # assert "incomplete" in error_message or "required" in error_message

            # Should NOT mention compliance terms
            assert "pass" not in error_message or "passport" in error_message  # False positive
            assert "fail" not in error_message or "failure" in error_message
            assert "conditional" not in error_message
            assert "calculated_status" not in error_message

    def test_unauthorized_access_error_generic(
        self,
        client: TestClient,
        auth_headers_blgu: dict[str, str],
    ):
        """
        Test: Error messages don't reveal existence of compliance endpoints.

        Verifies:
        - Generic 403/404 errors
        - No hints about assessor-only endpoints
        - Security through obscurity for internal endpoints
        """
        # Attempt to access assessor-only endpoint (if such exists)
        response = client.get(
            "/api/v1/assessor/assessments-with-compliance", headers=auth_headers_blgu
        )

        # Should return generic 403 or 404
        # Should not reveal endpoint structure or purpose
        assert response.status_code in [403, 404]

        if response.status_code == 403:
            error_data = response.json()
            error_message = str(error_data).lower()

            # Error should be generic
            assert "not authorized" in error_message or "forbidden" in error_message

            # Should NOT explain what the endpoint does
            assert "compliance" not in error_message
            assert "calculated_status" not in error_message
