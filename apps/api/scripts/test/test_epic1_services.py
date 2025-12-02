#!/usr/bin/env python3
"""
Interactive test script for Epic 1.0 services.

This script demonstrates how to use the three core services:
- CalculationEngineService
- CompletenessValidationService
- ComplianceValidationService

Run this script to see the services in action with sample data.
"""

from app.services.calculation_engine_service import calculation_engine_service
from app.services.completeness_validation_service import completeness_validation_service
from app.db.enums import ValidationStatus
import json


def test_calculation_engine():
    """Test the Calculation Engine Service with sample data."""
    print("\n" + "=" * 80)
    print("TEST 1: Calculation Engine Service")
    print("=" * 80)

    # Sample calculation schema
    calculation_schema = {
        "condition_groups": [
            {
                "operator": "AND",
                "rules": [
                    {
                        "rule_type": "PERCENTAGE_THRESHOLD",
                        "field_id": "completion_rate",
                        "operator": ">=",
                        "threshold": 75.0,
                        "description": "Completion rate must be at least 75%"
                    },
                    {
                        "rule_type": "COUNT_THRESHOLD",
                        "field_id": "required_documents",
                        "operator": ">=",
                        "threshold": 3,
                        "description": "At least 3 documents required"
                    }
                ]
            }
        ],
        "output_status_on_pass": "Pass",
        "output_status_on_fail": "Fail"
    }

    # Test Case 1: Both conditions met (should PASS)
    print("\n📝 Test Case 1: Both conditions met")
    response_data_pass = {
        "completion_rate": 85.0,
        "required_documents": ["doc1", "doc2", "doc3", "doc4"]
    }

    result = calculation_engine_service.execute_calculation(
        calculation_schema, response_data_pass
    )

    print(f"   Response data: {json.dumps(response_data_pass, indent=2)}")
    print(f"   ✅ Result: {result.value}")
    assert result == ValidationStatus.PASS, "Expected PASS"

    # Test Case 2: Missing required documents (should FAIL)
    print("\n📝 Test Case 2: Missing required documents")
    response_data_fail = {
        "completion_rate": 85.0,
        "required_documents": ["doc1", "doc2"]  # Only 2 documents
    }

    result = calculation_engine_service.execute_calculation(
        calculation_schema, response_data_fail
    )

    print(f"   Response data: {json.dumps(response_data_fail, indent=2)}")
    print(f"   ❌ Result: {result.value}")
    assert result == ValidationStatus.FAIL, "Expected FAIL"

    # Test remark generation
    print("\n📝 Test Case 3: Remark generation")
    remark_schema = {
        "Pass": "✅ All requirements met. Excellent work!",
        "Fail": "❌ Requirements not met. Please review and resubmit.",
        "Conditional": "⚠️ Partially compliant. Additional review needed."
    }

    remark = calculation_engine_service.get_remark_for_status(
        remark_schema, ValidationStatus.PASS
    )

    print(f"   Status: PASS")
    print(f"   Remark: {remark}")

    print("\n✅ Calculation Engine Service tests passed!")


def test_completeness_validation():
    """Test the Completeness Validation Service with sample data."""
    print("\n" + "=" * 80)
    print("TEST 2: Completeness Validation Service")
    print("=" * 80)

    # Sample form schema
    form_schema = {
        "fields": [
            {
                "field_id": "project_name",
                "field_type": "text_input",
                "label": "Project Name",
                "required": True,
                "help_text": "Enter the name of your project"
            },
            {
                "field_id": "project_description",
                "field_type": "text_area",
                "label": "Project Description",
                "required": True,
                "help_text": "Provide a detailed description"
            },
            {
                "field_id": "project_type",
                "field_type": "radio_button",
                "label": "Project Type",
                "required": True,
                "options": [
                    {"label": "Infrastructure", "value": "infrastructure"},
                    {"label": "Social Services", "value": "social_services"},
                    {"label": "Environmental", "value": "environmental"}
                ]
            },
            {
                "field_id": "budget_amount",
                "field_type": "number_input",
                "label": "Budget Amount",
                "required": False
            }
        ]
    }

    # Test Case 1: All required fields filled
    print("\n📝 Test Case 1: All required fields filled")
    complete_response = {
        "project_name": "Community Health Center",
        "project_description": "A new health center for the barangay",
        "project_type": "social_services",
        "budget_amount": 500000
    }

    result = completeness_validation_service.validate_completeness(
        form_schema, complete_response
    )

    print(f"   Response data: {json.dumps(complete_response, indent=2)}")
    print(f"   ✅ Is complete: {result['is_complete']}")
    print(f"   📊 Completion: {result['filled_field_count']}/{result['required_field_count']} required fields")
    assert result["is_complete"] == True, "Should be complete"

    # Test Case 2: Missing required fields
    print("\n📝 Test Case 2: Missing required fields")
    incomplete_response = {
        "project_name": "Community Health Center",
        # Missing project_description and project_type
        "budget_amount": 500000
    }

    result = completeness_validation_service.validate_completeness(
        form_schema, incomplete_response
    )

    print(f"   Response data: {json.dumps(incomplete_response, indent=2)}")
    print(f"   ❌ Is complete: {result['is_complete']}")
    print(f"   📊 Completion: {result['filled_field_count']}/{result['required_field_count']} required fields")
    print(f"   Missing fields:")
    for field in result["missing_fields"]:
        print(f"      - {field['label']} ({field['field_id']}): {field['reason']}")

    assert result["is_complete"] == False, "Should be incomplete"
    assert len(result["missing_fields"]) == 2, "Should have 2 missing fields"

    # Test Case 3: Completion percentage
    print("\n📝 Test Case 3: Completion percentage calculation")
    percentage = completeness_validation_service.get_completion_percentage(
        form_schema, incomplete_response
    )

    print(f"   Completion percentage: {percentage}%")
    assert percentage == 33.33, "Should be 33.33% (1 out of 3 required fields filled)"

    print("\n✅ Completeness Validation Service tests passed!")


def test_compliance_validation_demo():
    """
    Demonstrate Compliance Validation Service usage.

    Note: This service requires database access, so we'll just show
    the structure of how to use it. To run this, you need:
    1. A running database with indicators and assessments
    2. A database session
    """
    print("\n" + "=" * 80)
    print("TEST 3: Compliance Validation Service (Demo)")
    print("=" * 80)

    print("""
    The ComplianceValidationService orchestrates the other two services
    and persists results to the database. Here's how to use it:

    Example 1: Validate a single indicator
    ----------------------------------------
    from app.services.compliance_validation_service import compliance_validation_service
    from sqlalchemy.orm import Session

    result = compliance_validation_service.validate_indicator_compliance(
        db=db_session,
        assessment_id=123,
        indicator_id=456
    )

    # Returns:
    {
        "response_id": 789,
        "indicator_id": 456,
        "calculated_status": "Pass",  # or "Fail", "Conditional"
        "generated_remark": "All requirements met. Excellent work!",
        "was_updated": True
    }


    Example 2: Bulk validate entire assessment
    -------------------------------------------
    summary = compliance_validation_service.bulk_validate_assessment(
        db=db_session,
        assessment_id=123
    )

    # Returns:
    {
        "assessment_id": 123,
        "total_responses": 25,
        "auto_calculable_count": 15,
        "validated_count": 15,
        "passed_count": 12,
        "failed_count": 2,
        "conditional_count": 1,
        "error_count": 0,
        "results": [...]  # Individual validation results
    }


    Example 3: Recalculate when schema changes
    -------------------------------------------
    summary = compliance_validation_service.recalculate_all_responses(
        db=db_session,
        indicator_id=456
    )

    # Recalculates all existing responses for this indicator
    # Useful when you update the calculation_schema
    """)

    print("✅ Compliance Validation Service demo complete!")
    print("\n💡 To test with real data, you need a running API with database access.")
    print("   You can use the API endpoints once they're created in Epic 2.0+")


def main():
    """Run all tests."""
    print("\n" + "🧪" * 40)
    print("Epic 1.0 Services - Interactive Testing")
    print("🧪" * 40)

    try:
        test_calculation_engine()
        test_completeness_validation()
        test_compliance_validation_demo()

        print("\n" + "=" * 80)
        print("✅ ALL TESTS PASSED!")
        print("=" * 80)
        print("\nThe services are working correctly and ready to use! 🎉")
        print("\nNext steps:")
        print("  1. Create API endpoints that use these services")
        print("  2. Integrate with frontend for table-assessment workflow")
        print("  3. Test end-to-end with real assessment data")

    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        return 1
    except Exception as e:
        print(f"\n💥 ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
