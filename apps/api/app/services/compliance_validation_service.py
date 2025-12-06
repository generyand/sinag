"""
Compliance Validation Service

This service orchestrates the compliance validation workflow by:
1. Using the CalculationEngineService to execute calculation schemas
2. Using the remark schema to generate human-readable remarks
3. Updating AssessmentResponse records with calculated status and remarks

This service is ONLY called by assessor-facing endpoints, not BLGU endpoints.
The distinction is important:
- Completeness: BLGU's responsibility (all required fields filled)
- Compliance: System/Assessor's responsibility (Pass/Fail based on criteria)

Usage:
    from app.services.compliance_validation_service import compliance_validation_service

    # Validate a single indicator response
    result = compliance_validation_service.validate_indicator_compliance(
        db=db,
        assessment_id=123,
        indicator_id=456
    )

    # Validate all indicators in an assessment
    summary = compliance_validation_service.bulk_validate_assessment(
        db=db,
        assessment_id=123
    )
"""

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.db.enums import ValidationStatus
from app.db.models.assessment import AssessmentResponse
from app.db.models.governance_area import Indicator
from app.services.calculation_engine_service import calculation_engine_service

logger = logging.getLogger(__name__)


class ComplianceValidationError(Exception):
    """Custom exception for compliance validation errors"""

    pass


class ComplianceValidationService:
    """
    Service for validating compliance of assessment responses.

    This service coordinates the calculation engine and database updates to
    determine and persist compliance status for auto-calculable indicators.
    """

    def __init__(self):
        """Initialize the compliance validation service"""
        self.logger = logging.getLogger(__name__)
        self.calculation_engine = calculation_engine_service

    def validate_indicator_compliance(
        self,
        db: Session,
        assessment_id: int,
        indicator_id: int,
        bbi_statuses: dict[int, str] | None = None,
    ) -> dict[str, Any]:
        """
        Validate compliance for a single indicator response.

        This method:
        1. Retrieves the indicator's calculation_schema
        2. Retrieves the assessment response data
        3. Executes the calculation to get Pass/Fail/Conditional
        4. Generates the appropriate remark
        5. Updates the AssessmentResponse record with calculated status and remark

        Args:
            db: Database session
            assessment_id: ID of the assessment
            indicator_id: ID of the indicator to validate
            bbi_statuses: Optional dict mapping BBI IDs to their status (for BBI rules)

        Returns:
            Dict with validation results:
            {
                "response_id": int,
                "indicator_id": int,
                "calculated_status": str,
                "generated_remark": str,
                "was_updated": bool
            }

        Raises:
            ComplianceValidationError: If validation fails or records not found
        """
        try:
            # Retrieve the indicator
            indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
            if not indicator:
                raise ComplianceValidationError(f"Indicator with ID {indicator_id} not found")

            # Check if indicator is auto-calculable
            if not indicator.is_auto_calculable:
                self.logger.info(f"Indicator {indicator_id} is not auto-calculable, skipping")
                return {
                    "response_id": None,
                    "indicator_id": indicator_id,
                    "calculated_status": None,
                    "generated_remark": None,
                    "was_updated": False,
                    "skip_reason": "Not auto-calculable",
                }

            # Retrieve the assessment response
            response = (
                db.query(AssessmentResponse)
                .filter(
                    AssessmentResponse.assessment_id == assessment_id,
                    AssessmentResponse.indicator_id == indicator_id,
                )
                .first()
            )

            if not response:
                raise ComplianceValidationError(
                    f"No response found for assessment {assessment_id} and indicator {indicator_id}"
                )

            # Execute calculation
            calculated_status = self.calculation_engine.execute_calculation(
                calculation_schema=indicator.calculation_schema,
                response_data=response.response_data,
                bbi_statuses=bbi_statuses or {},
            )

            # Generate remark
            generated_remark = self.calculation_engine.get_remark_for_status(
                remark_schema=indicator.remark_schema, status=calculated_status
            )

            # Update the response record
            old_status = response.validation_status
            old_remark = response.generated_remark

            response.validation_status = calculated_status
            response.generated_remark = generated_remark

            db.commit()
            db.refresh(response)

            # Check if values actually changed
            was_updated = (old_status != calculated_status) or (old_remark != generated_remark)

            self.logger.info(
                f"Validated indicator {indicator_id} for assessment {assessment_id}: "
                f"Status={calculated_status.value}, Updated={was_updated}"
            )

            return {
                "response_id": response.id,
                "indicator_id": indicator_id,
                "calculated_status": calculated_status.value,
                "generated_remark": generated_remark,
                "was_updated": was_updated,
            }

        except ComplianceValidationError:
            # Re-raise our custom errors
            raise
        except Exception as e:
            self.logger.error(
                f"Error validating compliance for indicator {indicator_id} "
                f"in assessment {assessment_id}: {str(e)}",
                exc_info=True,
            )
            # Don't fail the entire operation, just log and continue
            return {
                "response_id": None,
                "indicator_id": indicator_id,
                "calculated_status": None,
                "generated_remark": None,
                "was_updated": False,
                "error": str(e),
            }

    def bulk_validate_assessment(
        self,
        db: Session,
        assessment_id: int,
        bbi_statuses: dict[int, str] | None = None,
    ) -> dict[str, Any]:
        """
        Validate compliance for all auto-calculable indicators in an assessment.

        This is useful when an assessment is submitted or when an assessor wants
        to recalculate all compliance statuses.

        Args:
            db: Database session
            assessment_id: ID of the assessment to validate
            bbi_statuses: Optional dict mapping BBI IDs to their status

        Returns:
            Dict with summary:
            {
                "assessment_id": int,
                "total_responses": int,
                "auto_calculable_count": int,
                "validated_count": int,
                "passed_count": int,
                "failed_count": int,
                "conditional_count": int,
                "error_count": int,
                "results": [list of individual validation results]
            }
        """
        try:
            # Get all responses for this assessment with their indicators
            responses = (
                db.query(AssessmentResponse)
                .filter(AssessmentResponse.assessment_id == assessment_id)
                .all()
            )

            if not responses:
                self.logger.warning(f"No responses found for assessment {assessment_id}")
                return {
                    "assessment_id": assessment_id,
                    "total_responses": 0,
                    "auto_calculable_count": 0,
                    "validated_count": 0,
                    "passed_count": 0,
                    "failed_count": 0,
                    "conditional_count": 0,
                    "error_count": 0,
                    "results": [],
                }

            # Validate each auto-calculable indicator
            results = []
            auto_calculable_count = 0
            validated_count = 0
            passed_count = 0
            failed_count = 0
            conditional_count = 0
            error_count = 0

            for response in responses:
                indicator = response.indicator

                # Skip non-auto-calculable indicators
                if not indicator.is_auto_calculable:
                    continue

                auto_calculable_count += 1

                # Validate this indicator
                result = self.validate_indicator_compliance(
                    db=db,
                    assessment_id=assessment_id,
                    indicator_id=indicator.id,
                    bbi_statuses=bbi_statuses,
                )

                results.append(result)

                # Track statistics
                if result.get("error"):
                    error_count += 1
                elif result.get("calculated_status"):
                    validated_count += 1
                    status = result["calculated_status"]
                    if status == ValidationStatus.PASS.value:
                        passed_count += 1
                    elif status == ValidationStatus.FAIL.value:
                        failed_count += 1
                    elif status == ValidationStatus.CONDITIONAL.value:
                        conditional_count += 1

            self.logger.info(
                f"Bulk validation complete for assessment {assessment_id}: "
                f"{validated_count}/{auto_calculable_count} validated, "
                f"P:{passed_count} F:{failed_count} C:{conditional_count} E:{error_count}"
            )

            return {
                "assessment_id": assessment_id,
                "total_responses": len(responses),
                "auto_calculable_count": auto_calculable_count,
                "validated_count": validated_count,
                "passed_count": passed_count,
                "failed_count": failed_count,
                "conditional_count": conditional_count,
                "error_count": error_count,
                "results": results,
            }

        except Exception as e:
            self.logger.error(
                f"Error during bulk validation for assessment {assessment_id}: {str(e)}",
                exc_info=True,
            )
            raise ComplianceValidationError(
                f"Failed to bulk validate assessment {assessment_id}: {str(e)}"
            )

    def recalculate_all_responses(
        self,
        db: Session,
        indicator_id: int,
        bbi_statuses: dict[int, str] | None = None,
    ) -> dict[str, Any]:
        """
        Recalculate compliance for all responses to a specific indicator.

        This is useful when an indicator's calculation schema is updated and
        you want to recalculate all existing responses.

        Args:
            db: Database session
            indicator_id: ID of the indicator
            bbi_statuses: Optional dict mapping BBI IDs to their status

        Returns:
            Dict with summary similar to bulk_validate_assessment
        """
        try:
            # Get the indicator
            indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
            if not indicator:
                raise ComplianceValidationError(f"Indicator with ID {indicator_id} not found")

            if not indicator.is_auto_calculable:
                self.logger.warning(f"Indicator {indicator_id} is not auto-calculable")
                return {
                    "indicator_id": indicator_id,
                    "total_responses": 0,
                    "recalculated_count": 0,
                    "passed_count": 0,
                    "failed_count": 0,
                    "conditional_count": 0,
                    "error_count": 0,
                    "results": [],
                }

            # Get all responses for this indicator
            responses = (
                db.query(AssessmentResponse)
                .filter(AssessmentResponse.indicator_id == indicator_id)
                .all()
            )

            results = []
            recalculated_count = 0
            passed_count = 0
            failed_count = 0
            conditional_count = 0
            error_count = 0

            for response in responses:
                try:
                    # Execute calculation
                    calculated_status = self.calculation_engine.execute_calculation(
                        calculation_schema=indicator.calculation_schema,
                        response_data=response.response_data,
                        bbi_statuses=bbi_statuses or {},
                    )

                    # Generate remark
                    generated_remark = self.calculation_engine.get_remark_for_status(
                        remark_schema=indicator.remark_schema, status=calculated_status
                    )

                    # Update the response
                    response.validation_status = calculated_status
                    response.generated_remark = generated_remark

                    db.commit()
                    db.refresh(response)

                    recalculated_count += 1

                    # Track statistics
                    if calculated_status == ValidationStatus.PASS:
                        passed_count += 1
                    elif calculated_status == ValidationStatus.FAIL:
                        failed_count += 1
                    elif calculated_status == ValidationStatus.CONDITIONAL:
                        conditional_count += 1

                    results.append(
                        {
                            "response_id": response.id,
                            "assessment_id": response.assessment_id,
                            "calculated_status": calculated_status.value,
                            "generated_remark": generated_remark,
                        }
                    )

                except Exception as e:
                    self.logger.error(
                        f"Error recalculating response {response.id}: {str(e)}",
                        exc_info=True,
                    )
                    error_count += 1
                    results.append(
                        {
                            "response_id": response.id,
                            "assessment_id": response.assessment_id,
                            "error": str(e),
                        }
                    )

            self.logger.info(
                f"Recalculated {recalculated_count}/{len(responses)} responses for indicator {indicator_id}"
            )

            return {
                "indicator_id": indicator_id,
                "total_responses": len(responses),
                "recalculated_count": recalculated_count,
                "passed_count": passed_count,
                "failed_count": failed_count,
                "conditional_count": conditional_count,
                "error_count": error_count,
                "results": results,
            }

        except Exception as e:
            self.logger.error(
                f"Error recalculating responses for indicator {indicator_id}: {str(e)}",
                exc_info=True,
            )
            raise ComplianceValidationError(
                f"Failed to recalculate responses for indicator {indicator_id}: {str(e)}"
            )


# Singleton instance for use across the application
compliance_validation_service = ComplianceValidationService()
