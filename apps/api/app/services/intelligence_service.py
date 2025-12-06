# 🧠 Intelligence Service
# Business logic for SGLGB compliance classification and AI-powered insights

import json
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional

import google.generativeai as genai
from loguru import logger

from app.core.config import settings
from app.db.enums import ComplianceStatus, ValidationStatus
from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.models.governance_area import GovernanceArea, Indicator
from app.schemas.calculation_schema import (
    AndAllRule,
    BBIFunctionalityCheckRule,
    CalculationRule,
    CalculationSchema,
    ConditionGroup,
    CountThresholdRule,
    MatchValueRule,
    OrAnyRule,
    PercentageThresholdRule,
)
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm.attributes import flag_modified

# Core governance areas (must all pass for compliance)
CORE_AREAS = [
    "Financial Administration and Sustainability",
    "Disaster Preparedness",
    "Safety, Peace and Order",
]

# Essential governance areas (at least one must pass for compliance)
ESSENTIAL_AREAS = [
    "Social Protection and Sensitivity",
    "Business-Friendliness and Competitiveness",
    "Environmental Management",
]

# Language instructions for AI-generated summaries
LANGUAGE_INSTRUCTIONS = {
    "ceb": """
IMPORTANTE: Isulat ang TANAN nga output sa Binisaya (Cebuano). Gamita ang casual ug moderno
nga Binisaya nga ginagamit sa adlaw-adlaw nga pakigpulong - ang klase nga Binisaya nga
dali masabtan sa ordinaryo nga tawo ug mga opisyal sa barangay. Ayaw gamita ang deep o
formal nga Binisaya. Gamita lang ang simple, casual nga Binisaya nga parehas sa
ginagamit sa mga tawo karon. Ayaw gamita ang English gawas lang sa mga technical nga
pulong nga walay direktang Binisaya nga katumbas (sama sa "MOV" o "SGLGB"). Ang JSON
keys kinahanglan magpabilin sa English, pero ang mga values kinahanglan sa casual nga
Binisaya.
""",
    "fil": """
IMPORTANTE: Isulat ang LAHAT ng output sa Tagalog (Filipino). Gumamit ng natural na
Filipino na madaling maintindihan ng mga opisyal ng barangay. Huwag gumamit ng English
maliban sa mga technical na salita na walang direktang Filipino na katumbas
(tulad ng "MOV" o "SGLGB"). Ang JSON keys ay dapat manatili sa English, pero ang mga
values ay dapat nasa Tagalog.
""",
    "en": """
IMPORTANT: Generate ALL text output in English. Use clear, simple English that
barangay officials can easily understand. JSON keys should remain in English.
""",
}

# Default languages to generate upfront (Bisaya + English)
DEFAULT_LANGUAGES = ["ceb", "en"]


class IntelligenceService:
    # ========================================
    # CALCULATION RULE ENGINE
    # ========================================

    def evaluate_rule(
        self, rule: CalculationRule, assessment_data: Dict[str, Any]
    ) -> bool:
        """
        Recursively evaluate a calculation rule against assessment data.

        This is the core evaluation engine that handles all 6 rule types:
        - AND_ALL: All nested conditions must be true
        - OR_ANY: At least one nested condition must be true
        - PERCENTAGE_THRESHOLD: Number field comparison
        - COUNT_THRESHOLD: Checkbox count comparison
        - MATCH_VALUE: Field value matching
        - BBI_FUNCTIONALITY_CHECK: BBI status check (placeholder)

        Args:
            rule: The calculation rule to evaluate (discriminated union type)
            assessment_data: Dictionary containing assessment response data
                            Format: {"field_id": value, ...}

        Returns:
            Boolean indicating if the rule evaluates to true

        Raises:
            ValueError: If rule type is unknown or field_id not found in data
        """
        # Handle AND_ALL rule: all conditions must be true
        if isinstance(rule, AndAllRule):
            return self._evaluate_and_all_rule(rule, assessment_data)

        # Handle OR_ANY rule: at least one condition must be true
        elif isinstance(rule, OrAnyRule):
            return self._evaluate_or_any_rule(rule, assessment_data)

        # Handle PERCENTAGE_THRESHOLD rule: number field comparison
        elif isinstance(rule, PercentageThresholdRule):
            return self._evaluate_percentage_threshold_rule(rule, assessment_data)

        # Handle COUNT_THRESHOLD rule: checkbox count comparison
        elif isinstance(rule, CountThresholdRule):
            return self._evaluate_count_threshold_rule(rule, assessment_data)

        # Handle MATCH_VALUE rule: field value matching
        elif isinstance(rule, MatchValueRule):
            return self._evaluate_match_value_rule(rule, assessment_data)

        # Handle BBI_FUNCTIONALITY_CHECK rule: BBI status check
        elif isinstance(rule, BBIFunctionalityCheckRule):
            return self._evaluate_bbi_functionality_check_rule(rule, assessment_data)

        else:
            raise ValueError(f"Unknown rule type: {type(rule).__name__}")

    def _evaluate_and_all_rule(
        self, rule: AndAllRule, assessment_data: Dict[str, Any]
    ) -> bool:
        """
        Evaluate AND_ALL rule: all nested conditions must be true.

        Args:
            rule: The AndAllRule instance
            assessment_data: Dictionary containing assessment response data

        Returns:
            True if all conditions evaluate to true, False otherwise
        """
        for condition in rule.conditions:
            if not self.evaluate_rule(condition, assessment_data):
                return False
        return True

    def _evaluate_or_any_rule(
        self, rule: OrAnyRule, assessment_data: Dict[str, Any]
    ) -> bool:
        """
        Evaluate OR_ANY rule: at least one nested condition must be true.

        Args:
            rule: The OrAnyRule instance
            assessment_data: Dictionary containing assessment response data

        Returns:
            True if at least one condition evaluates to true, False otherwise
        """
        for condition in rule.conditions:
            if self.evaluate_rule(condition, assessment_data):
                return True
        return False

    def _evaluate_percentage_threshold_rule(
        self, rule: PercentageThresholdRule, assessment_data: Dict[str, Any]
    ) -> bool:
        """
        Evaluate PERCENTAGE_THRESHOLD rule: check if number field meets threshold.

        Args:
            rule: The PercentageThresholdRule instance
            assessment_data: Dictionary containing assessment response data

        Returns:
            True if the field value meets the threshold condition, False otherwise

        Raises:
            ValueError: If field_id not found in assessment_data or value is not numeric
        """
        if rule.field_id not in assessment_data:
            raise ValueError(
                f"Field '{rule.field_id}' not found in assessment data. "
                f"Available fields: {list(assessment_data.keys())}"
            )

        field_value = assessment_data[rule.field_id]

        # Ensure field value is numeric
        try:
            numeric_value = float(field_value)
        except (TypeError, ValueError):
            raise ValueError(
                f"Field '{rule.field_id}' has non-numeric value: {field_value}"
            )

        # Apply the comparison operator
        if rule.operator == ">=":
            return numeric_value >= rule.threshold
        elif rule.operator == ">":
            return numeric_value > rule.threshold
        elif rule.operator == "<=":
            return numeric_value <= rule.threshold
        elif rule.operator == "<":
            return numeric_value < rule.threshold
        elif rule.operator == "==":
            return numeric_value == rule.threshold
        else:
            raise ValueError(f"Unknown operator: {rule.operator}")

    def _evaluate_count_threshold_rule(
        self, rule: CountThresholdRule, assessment_data: Dict[str, Any]
    ) -> bool:
        """
        Evaluate COUNT_THRESHOLD rule: check if checkbox count meets threshold.

        Expects field value to be a list of selected checkbox values.

        Args:
            rule: The CountThresholdRule instance
            assessment_data: Dictionary containing assessment response data
                            Field value should be a list: ["value1", "value2", ...]

        Returns:
            True if the count of selected checkboxes meets the threshold, False otherwise

        Raises:
            ValueError: If field_id not found or value is not a list
        """
        if rule.field_id not in assessment_data:
            raise ValueError(
                f"Field '{rule.field_id}' not found in assessment data. "
                f"Available fields: {list(assessment_data.keys())}"
            )

        field_value = assessment_data[rule.field_id]

        # Ensure field value is a list (for checkbox groups)
        if not isinstance(field_value, list):
            raise ValueError(
                f"Field '{rule.field_id}' expected list for checkbox count, "
                f"got {type(field_value).__name__}: {field_value}"
            )

        count = len(field_value)

        # Apply the comparison operator
        if rule.operator == ">=":
            return count >= rule.threshold
        elif rule.operator == ">":
            return count > rule.threshold
        elif rule.operator == "<=":
            return count <= rule.threshold
        elif rule.operator == "<":
            return count < rule.threshold
        elif rule.operator == "==":
            return count == rule.threshold
        else:
            raise ValueError(f"Unknown operator: {rule.operator}")

    def _evaluate_match_value_rule(
        self, rule: MatchValueRule, assessment_data: Dict[str, Any]
    ) -> bool:
        """
        Evaluate MATCH_VALUE rule: check if field value matches expected value.

        Supports multiple operators: ==, !=, contains, not_contains

        Args:
            rule: The MatchValueRule instance
            assessment_data: Dictionary containing assessment response data

        Returns:
            True if the field value matches the condition, False otherwise

        Raises:
            ValueError: If field_id not found in assessment_data
        """
        if rule.field_id not in assessment_data:
            raise ValueError(
                f"Field '{rule.field_id}' not found in assessment data. "
                f"Available fields: {list(assessment_data.keys())}"
            )

        field_value = assessment_data[rule.field_id]

        # Apply the comparison operator
        if rule.operator == "==":
            return field_value == rule.expected_value
        elif rule.operator == "!=":
            return field_value != rule.expected_value
        elif rule.operator == "contains":
            # For string values
            if isinstance(field_value, str):
                return str(rule.expected_value) in field_value
            # For list values (checkbox groups)
            elif isinstance(field_value, list):
                return rule.expected_value in field_value
            else:
                return False
        elif rule.operator == "not_contains":
            # For string values
            if isinstance(field_value, str):
                return str(rule.expected_value) not in field_value
            # For list values (checkbox groups)
            elif isinstance(field_value, list):
                return rule.expected_value not in field_value
            else:
                return True
        else:
            raise ValueError(f"Unknown operator: {rule.operator}")

    def _evaluate_bbi_functionality_check_rule(
        self, rule: BBIFunctionalityCheckRule, assessment_data: Dict[str, Any]
    ) -> bool:
        """
        Evaluate BBI_FUNCTIONALITY_CHECK rule: check if BBI is Functional.

        This is a placeholder for Epic 4 BBI integration.
        Currently returns False as BBI data is not yet available.

        Args:
            rule: The BBIFunctionalityCheckRule instance
            assessment_data: Dictionary containing assessment response data

        Returns:
            Boolean indicating if BBI meets expected status

        Note:
            In Epic 4, this will query the BBI database table to check status.
            For now, it returns False to indicate the feature is not yet implemented.
        """
        # TODO: Epic 4 - Implement BBI database query
        # Expected implementation:
        # 1. Query BBI table by bbi_id
        # 2. Check if BBI status matches expected_status
        # 3. Return comparison result

        # Placeholder: Check if assessment_data has BBI status override
        bbi_key = f"bbi_{rule.bbi_id}_status"
        if bbi_key in assessment_data:
            actual_status = assessment_data[bbi_key]
            return actual_status == rule.expected_status

        # Default: return False (feature not yet implemented)
        return False

    def evaluate_calculation_schema(
        self,
        calculation_schema: CalculationSchema,
        assessment_data: Dict[str, Any],
    ) -> bool:
        """
        Evaluate a complete calculation schema against assessment data.

        Evaluates all condition groups and returns overall Pass/Fail status.
        Top-level condition groups are evaluated with implicit AND logic.

        Args:
            calculation_schema: The CalculationSchema to evaluate
            assessment_data: Dictionary containing assessment response data

        Returns:
            True if all condition groups pass (Pass status), False otherwise (Fail status)
        """
        # Evaluate all condition groups (implicit AND between groups)
        for group in calculation_schema.condition_groups:
            if not self._evaluate_condition_group(group, assessment_data):
                return False
        return True

    def evaluate_indicator_calculation(
        self,
        db: Session,
        indicator_id: int,
        assessment_data: Dict[str, Any],
    ) -> Optional[str]:
        """
        Evaluate an indicator's calculation schema if is_auto_calculable is True.

        This is the main entry point for automatic Pass/Fail calculation during
        the assessment workflow. It checks the is_auto_calculable flag and only
        evaluates if the flag is true.

        Args:
            db: Database session
            indicator_id: ID of the indicator to evaluate
            assessment_data: Dictionary containing assessment response data

        Returns:
            "Pass" or "Fail" if is_auto_calculable is True and calculation succeeds,
            None if is_auto_calculable is False or calculation_schema is not defined

        Raises:
            ValueError: If indicator not found or evaluation fails
        """
        # Get the indicator with its calculation schema
        indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
        if not indicator:
            raise ValueError(f"Indicator with ID {indicator_id} not found")

        # Check is_auto_calculable flag
        if not indicator.is_auto_calculable:
            # Not auto-calculable, return None (manual validation required)
            return None

        # Check if calculation_schema exists
        if not indicator.calculation_schema:
            # No schema defined, return None
            logger.warning(
                f"Indicator {indicator_id} is marked as auto-calculable but has no calculation_schema"
            )
            return None

        # Parse calculation_schema
        try:
            calculation_schema = CalculationSchema(**indicator.calculation_schema)
        except Exception as e:
            raise ValueError(
                f"Invalid calculation_schema for indicator {indicator_id}: {str(e)}"
            )

        # Evaluate the schema
        evaluation_result = self.evaluate_calculation_schema(
            calculation_schema=calculation_schema,
            assessment_data=assessment_data,
        )

        # Return status based on evaluation result
        if evaluation_result:
            return calculation_schema.output_status_on_pass
        else:
            return calculation_schema.output_status_on_fail

    def calculate_indicator_status(
        self,
        db: Session,
        indicator_id: int,
        assessment_data: Dict[str, Any],
    ) -> Optional[str]:
        """
        Alias for evaluate_indicator_calculation for backwards compatibility.

        Calculate the Pass/Fail status of an auto-calculable indicator.
        """
        return self.evaluate_indicator_calculation(db, indicator_id, assessment_data)

    def _evaluate_condition_group(
        self, group: ConditionGroup, assessment_data: Dict[str, Any]
    ) -> bool:
        """
        Evaluate a condition group with its logical operator (AND/OR).

        Args:
            group: The ConditionGroup to evaluate
            assessment_data: Dictionary containing assessment response data

        Returns:
            True if the group evaluates to true based on its operator, False otherwise
        """
        if group.operator == "AND":
            # All rules in the group must be true
            for rule in group.rules:
                if not self.evaluate_rule(rule, assessment_data):
                    return False
            return True
        elif group.operator == "OR":
            # At least one rule in the group must be true
            for rule in group.rules:
                if self.evaluate_rule(rule, assessment_data):
                    return True
            return False
        else:
            raise ValueError(f"Unknown condition group operator: {group.operator}")

    # ========================================
    # REMARK GENERATION ENGINE
    # ========================================

    def generate_indicator_remark(
        self,
        db: Session,
        indicator_id: int,
        indicator_status: Optional[str],
        assessment_data: Dict[str, Any],
    ) -> Optional[str]:
        """
        Generate a remark for an indicator based on its remark_schema.

        This function evaluates the remark_schema and generates appropriate remarks
        based on the indicator's Pass/Fail status. Supports Jinja2 templates with
        placeholders for dynamic content.

        Args:
            db: Database session
            indicator_id: ID of the indicator
            indicator_status: Pass/Fail status of the indicator (or None)
            assessment_data: Dictionary containing assessment response data

        Returns:
            Generated remark string, or None if no remark_schema defined

        Raises:
            ValueError: If indicator not found or template rendering fails
        """
        from jinja2 import Template, TemplateSyntaxError, UndefinedError
        from app.schemas.remark_schema import RemarkSchema

        # Get the indicator with its remark schema
        indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
        if not indicator:
            raise ValueError(f"Indicator with ID {indicator_id} not found")

        # Check if remark_schema exists
        if not indicator.remark_schema:
            return None

        try:
            # Parse the remark schema
            remark_schema = RemarkSchema(**indicator.remark_schema)
        except Exception as e:
            raise ValueError(f"Invalid remark schema format: {str(e)}")

        # Find matching conditional remark based on status
        template_str = None
        if indicator_status:
            status_lower = indicator_status.lower()
            for conditional_remark in remark_schema.conditional_remarks:
                if conditional_remark.condition.lower() == status_lower:
                    template_str = conditional_remark.template
                    break

        # Use default template if no match found
        if template_str is None:
            template_str = remark_schema.default_template

        # Prepare template context
        context = {
            "indicator_name": indicator.name,
            "status": indicator_status or "Unknown",
            **assessment_data,  # Include all assessment data for field access
        }

        # Render the template with Jinja2
        try:
            template = Template(template_str)
            rendered_remark = template.render(context)
            return rendered_remark.strip()
        except TemplateSyntaxError as e:
            raise ValueError(f"Template syntax error in remark: {str(e)}")
        except UndefinedError as e:
            raise ValueError(f"Undefined variable in remark template: {str(e)}")
        except Exception as e:
            raise ValueError(f"Failed to render remark template: {str(e)}")

    # ========================================
    # SGLGB CLASSIFICATION (3+1 Rule)
    # ========================================

    def get_validated_responses_by_area(
        self, db: Session, assessment_id: int
    ) -> dict[str, list[AssessmentResponse]]:
        """
        Fetch all assessment responses for an assessment, filtered by validation_status='Pass'.

        Groups responses by governance area name.

        Args:
            db: Database session
            assessment_id: ID of the assessment

        Returns:
            Dictionary mapping governance area name to list of passed responses
        """
        responses = (
            db.query(AssessmentResponse)
            .join(Indicator, AssessmentResponse.indicator_id == Indicator.id)
            .join(GovernanceArea, Indicator.governance_area_id == GovernanceArea.id)
            .filter(
                AssessmentResponse.assessment_id == assessment_id,
                AssessmentResponse.validation_status == ValidationStatus.PASS,
            )
            .all()
        )

        # Group by governance area name
        area_responses: dict[str, list[AssessmentResponse]] = {}
        for response in responses:
            area_name = response.indicator.governance_area.name
            if area_name not in area_responses:
                area_responses[area_name] = []
            area_responses[area_name].append(response)

        return area_responses

    def determine_area_compliance(
        self, db: Session, assessment_id: int, area_name: str
    ) -> bool:
        """
        Determine if a governance area has passed (all LEAF indicators within that area must pass).

        An area passes if ALL of its LEAF indicators have validation_status = 'Pass'.
        An area fails if ANY leaf indicator has validation_status != 'Pass' or is None.

        IMPORTANT: Only leaf indicators (indicators with no children) are checked.
        Parent/section indicators don't have responses and should be excluded.

        Args:
            db: Database session
            assessment_id: ID of the assessment
            area_name: Name of the governance area to check

        Returns:
            True if all leaf indicators in the area passed, False otherwise
        """
        # Get all indicators for this governance area
        area = db.query(GovernanceArea).filter(GovernanceArea.name == area_name).first()
        if not area:
            return False

        all_indicators = (
            db.query(Indicator).filter(Indicator.governance_area_id == area.id).all()
        )

        if not all_indicators:
            return False  # No indicators = failed area

        # Build a set of parent IDs to identify which indicators have children
        parent_ids = {ind.parent_id for ind in all_indicators if ind.parent_id is not None}

        # Filter to only leaf indicators (indicators that are NOT parents of other indicators)
        leaf_indicators = [ind for ind in all_indicators if ind.id not in parent_ids]

        if not leaf_indicators:
            return False  # No leaf indicators = failed area

        # Check all responses for leaf indicators only
        for indicator in leaf_indicators:
            response = (
                db.query(AssessmentResponse)
                .filter(
                    AssessmentResponse.assessment_id == assessment_id,
                    AssessmentResponse.indicator_id == indicator.id,
                )
                .first()
            )

            # If no response exists, the area fails
            # PASS and CONDITIONAL both count as passing (SGLGB rule: Conditional = Considered = Pass)
            # Only FAIL status causes the area to fail
            if not response:
                return False
            if response.validation_status not in (ValidationStatus.PASS, ValidationStatus.CONDITIONAL):
                return False

        return True

    def get_all_area_results(self, db: Session, assessment_id: int) -> dict[str, str]:
        """
        Get pass/fail status for all six governance areas.

        Returns a dictionary mapping area names to their status ('Passed' or 'Failed').

        Args:
            db: Database session
            assessment_id: ID of the assessment

        Returns:
            Dictionary mapping area name to status
        """
        area_results: dict[str, str] = {}

        # Check all six areas
        all_areas = CORE_AREAS + ESSENTIAL_AREAS

        for area_name in all_areas:
            if self.determine_area_compliance(db, assessment_id, area_name):
                area_results[area_name] = "Passed"
            else:
                area_results[area_name] = "Failed"

        return area_results

    def check_core_areas_compliance(self, db: Session, assessment_id: int) -> bool:
        """
        Check if all three Core areas have passed.

        Returns True if all three Core areas (Financial, Disaster Prep, Safety/Peace/Order) have passed.

        Args:
            db: Database session
            assessment_id: ID of the assessment

        Returns:
            True if all Core areas passed, False otherwise
        """
        for area_name in CORE_AREAS:
            if not self.determine_area_compliance(db, assessment_id, area_name):
                return False
        return True

    def check_essential_areas_compliance(self, db: Session, assessment_id: int) -> bool:
        """
        Check if at least one Essential area has passed.

        Returns True if at least one Essential area has passed.

        Args:
            db: Database session
            assessment_id: ID of the assessment

        Returns:
            True if at least one Essential area passed, False otherwise
        """
        for area_name in ESSENTIAL_AREAS:
            if self.determine_area_compliance(db, assessment_id, area_name):
                return True
        return False

    def determine_compliance_status(
        self, db: Session, assessment_id: int
    ) -> ComplianceStatus:
        """
        Determine overall compliance status using the "3+1" SGLGB rule.

        A barangay PASSES if:
        - All three (3) Core areas are marked as "Passed" AND
        - At least one (1) Essential area is marked as "Passed"

        A barangay FAILS if:
        - Any one of the three Core areas is failed, OR
        - All three Essential areas are failed

        Args:
            db: Database session
            assessment_id: ID of the assessment

        Returns:
            ComplianceStatus.PASSED or ComplianceStatus.FAILED
        """
        # Check Core areas compliance
        all_core_passed = self.check_core_areas_compliance(db, assessment_id)

        # Check Essential areas compliance
        at_least_one_essential_passed = self.check_essential_areas_compliance(
            db, assessment_id
        )

        # Apply "3+1" rule
        if all_core_passed and at_least_one_essential_passed:
            return ComplianceStatus.PASSED
        else:
            return ComplianceStatus.FAILED

    def classify_assessment(self, db: Session, assessment_id: int) -> dict[str, Any]:
        """
        Run the complete classification algorithm and store results.

        This method:
        1. Calculates area-level compliance (all indicators must pass)
        2. Applies the "3+1" rule to determine overall compliance status
        3. Stores results in the database

        Args:
            db: Database session
            assessment_id: ID of the assessment to classify

        Returns:
            Dictionary with classification results

        Raises:
            ValueError: If assessment not found
        """
        # Verify assessment exists
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        # Get area-level results
        area_results = self.get_all_area_results(db, assessment_id)

        # Determine overall compliance status using "3+1" rule
        compliance_status = self.determine_compliance_status(db, assessment_id)

        # Store results in database
        assessment.final_compliance_status = compliance_status
        assessment.area_results = area_results
        assessment.updated_at = datetime.now(UTC)

        db.commit()
        db.refresh(assessment)

        return {
            "success": True,
            "assessment_id": assessment_id,
            "final_compliance_status": compliance_status.value,
            "area_results": area_results,
        }

    def build_gemini_prompt(
        self, db: Session, assessment_id: int, language: str = "ceb"
    ) -> str:
        """
        Build a structured prompt for Gemini API from failed indicators.

        Creates a comprehensive prompt that includes:
        - Barangay name and assessment year
        - Failed indicators with governance area context
        - Assessor comments and feedback
        - Overall compliance status

        Args:
            db: Database session
            assessment_id: ID of the assessment
            language: Language code for output (ceb=Bisaya, fil=Tagalog, en=English)

        Returns:
            Formatted prompt string for Gemini API

        Raises:
            ValueError: If assessment not found
        """
        # Get assessment with all relationships
        from app.db.models.user import User

        assessment = (
            db.query(Assessment)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                joinedload(Assessment.responses)
                .joinedload(AssessmentResponse.indicator)
                .joinedload(Indicator.governance_area),
                joinedload(Assessment.responses).joinedload(
                    AssessmentResponse.feedback_comments
                ),
            )
            .filter(Assessment.id == assessment_id)
            .first()
        )

        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        # Get barangay name
        barangay_name = "Unknown"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Get assessment year
        assessment_year = "2024"  # Default
        if assessment.validated_at:
            assessment_year = str(assessment.validated_at.year)

        # Get failed indicators with feedback
        failed_indicators = []
        for response in assessment.responses:
            if response.validation_status != ValidationStatus.PASS:
                indicator = response.indicator
                governance_area = indicator.governance_area

                # Get assessor comments
                comments = []
                for comment in response.feedback_comments:
                    comments.append(
                        f"{comment.assessor.name if comment.assessor else 'Assessor'}: {comment.comment}"
                    )

                failed_indicators.append(
                    {
                        "indicator_name": indicator.name,
                        "description": indicator.description,
                        "governance_area": governance_area.name,
                        "area_type": governance_area.area_type.value,
                        "assessor_comments": comments,
                    }
                )

        # Get overall compliance status
        compliance_status = (
            assessment.final_compliance_status.value
            if assessment.final_compliance_status
            else "Not yet classified"
        )

        # Get language instruction
        lang_instruction = LANGUAGE_INSTRUCTIONS.get(
            language, LANGUAGE_INSTRUCTIONS["ceb"]
        )

        # Build the prompt
        prompt = f"""{lang_instruction}

You are an expert consultant analyzing SGLGB (Seal of Good Local Governance - Barangay) compliance assessment results.

BARANGAY INFORMATION:
- Name: {barangay_name}
- Assessment Year: {assessment_year}
- Overall Compliance Status: {compliance_status}

FAILED INDICATORS:
"""

        for idx, indicator in enumerate(failed_indicators, 1):
            prompt += f"""
{idx}. {indicator["indicator_name"]}
   - Governance Area: {indicator["governance_area"]} ({indicator["area_type"]})
   - Description: {indicator["description"]}
"""

            if indicator["assessor_comments"]:
                prompt += "   - Assessor Feedback:\n"
                for comment in indicator["assessor_comments"]:
                    prompt += f"     • {comment}\n"

        prompt += """

TASK:
Based on the failed indicators and assessor feedback above, provide a comprehensive analysis in the following JSON structure:

{
  "summary": "A brief 2-3 sentence summary of the barangay's compliance status and key issues",
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2",
    "..."
  ],
  "capacity_development_needs": [
    "Identified capacity building need 1",
    "Identified capacity building need 2",
    "..."
  ]
}

Focus on:
1. Identifying root causes of non-compliance
2. Providing actionable recommendations for improvement
3. Identifying specific capacity development needs for barangay officials and staff
"""

        return prompt

    def call_gemini_api(
        self, db: Session, assessment_id: int, language: str = "ceb"
    ) -> dict[str, Any]:
        """
        Call Gemini API with the prompt and parse the JSON response.

        Builds the prompt from failed indicators, calls Gemini API,
        and returns the structured JSON response.

        Args:
            db: Database session
            assessment_id: ID of the assessment
            language: Language code for output (ceb=Bisaya, fil=Tagalog, en=English)

        Returns:
            Dictionary with 'summary', 'recommendations', and 'capacity_development_needs' keys

        Raises:
            ValueError: If assessment not found or API key not configured
            Exception: If API call fails or response parsing fails
        """
        # Check if API key is configured
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured in environment")

        # Build the prompt with language instruction
        prompt = self.build_gemini_prompt(db, assessment_id, language)

        # Configure Gemini
        genai.configure(api_key=settings.GEMINI_API_KEY)  # type: ignore

        # Initialize the model
        # Using Gemini 2.5 Flash (latest stable as of Oct 2025)
        # Supports up to 1M input tokens and 65K output tokens
        model = genai.GenerativeModel("gemini-2.5-flash")  # type: ignore

        try:
            # Call the API with generation configuration
            # Using type: ignore due to incomplete type stubs in google-generativeai
            generation_config = {
                "temperature": 0.7,
                "max_output_tokens": 8192,
            }

            response = model.generate_content(
                prompt,
                generation_config=generation_config,  # type: ignore
            )

            # Parse the response text
            if not response or not hasattr(response, "text") or not response.text:
                raise Exception("Gemini API returned empty or invalid response")

            response_text = response.text

            # Try to extract JSON from the response
            # The response might be wrapped in markdown code blocks
            if "```json" in response_text:
                # Extract JSON from code block
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                json_str = response_text[start:end].strip()
            elif "```" in response_text:
                # Extract JSON from code block (without json tag)
                start = response_text.find("```") + 3
                end = response_text.find("```", start)
                json_str = response_text[start:end].strip()
            else:
                # Assume the entire response is JSON
                json_str = response_text.strip()

            # Parse the JSON
            parsed_response = json.loads(json_str)

            # Validate the response structure
            required_keys = ["summary", "recommendations", "capacity_development_needs"]
            if not all(key in parsed_response for key in required_keys):
                raise ValueError(
                    f"Gemini API response missing required keys. Got: {list(parsed_response.keys())}"
                )

            # Add language to response
            parsed_response["language"] = language

            return parsed_response

        except json.JSONDecodeError as e:
            raise Exception(
                f"Failed to parse Gemini API response as JSON: {response_text}"
            ) from e
        except TimeoutError as e:
            raise Exception(
                "Gemini API request timed out after waiting for response"
            ) from e
        except ValueError:
            # Re-raise ValueError as-is (for invalid response structure)
            raise
        except Exception as e:
            # Handle various API errors
            error_message = str(e).lower()
            if "quota" in error_message or "rate limit" in error_message:
                raise Exception(
                    "Gemini API quota exceeded or rate limit hit. Please try again later."
                ) from e
            elif "network" in error_message or "connection" in error_message:
                raise Exception(
                    "Network error connecting to Gemini API. Please check your internet connection."
                ) from e
            elif "permission" in error_message or "unauthorized" in error_message:
                raise Exception(
                    "Gemini API authentication failed. Please check your API key."
                ) from e
            else:
                raise Exception(f"Gemini API call failed: {str(e)}") from e

    def get_insights_with_caching(
        self, db: Session, assessment_id: int, language: str = "ceb"
    ) -> dict[str, Any]:
        """
        Get AI-powered insights for an assessment with language-aware caching.

        First checks if ai_recommendations already exists for the requested language.
        If cached data exists, returns it immediately without calling Gemini API.
        If not, calls Gemini API, stores the result under the language key, and returns it.

        This method implements cost-saving logic by avoiding duplicate API calls.

        Args:
            db: Database session
            assessment_id: ID of the assessment
            language: Language code for output (ceb=Bisaya, fil=Tagalog, en=English)

        Returns:
            Dictionary with 'summary', 'recommendations', 'capacity_development_needs', and 'language' keys

        Raises:
            ValueError: If assessment not found
            Exception: If API call fails or response parsing fails
        """
        # Get assessment to check for cached recommendations
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        # Check if ai_recommendations already exists for this language
        if assessment.ai_recommendations:
            # New format: keyed by language
            if isinstance(assessment.ai_recommendations, dict):
                if language in assessment.ai_recommendations:
                    return assessment.ai_recommendations[language]
                # Legacy format check: if 'summary' key exists, it's old single-language format
                elif "summary" in assessment.ai_recommendations:
                    # Return legacy format as-is (it's in English)
                    if language == "en":
                        return assessment.ai_recommendations

        # No cached data for this language, call Gemini API
        insights = self.call_gemini_api(db, assessment_id, language)

        # Store the recommendations in the database under the language key
        if not assessment.ai_recommendations:
            assessment.ai_recommendations = {}
        elif "summary" in assessment.ai_recommendations:
            # Migrate legacy format: wrap existing data under 'en' key
            assessment.ai_recommendations = {"en": assessment.ai_recommendations}

        assessment.ai_recommendations[language] = insights
        assessment.updated_at = datetime.now(UTC)
        db.commit()
        db.refresh(assessment)

        return insights

    # ========================================
    # REWORK SUMMARY GENERATION (AI-POWERED)
    # ========================================

    def build_rework_summary_prompt(
        self, db: Session, assessment_id: int, language: str = "ceb"
    ) -> tuple[str, List[Dict[str, Any]]]:
        """
        Build a structured prompt for Gemini API from rework feedback.

        Analyzes all feedback provided by assessors (comments and MOV annotations)
        for indicators requiring rework and creates a comprehensive prompt for
        AI-powered summary generation.

        Args:
            db: Database session
            assessment_id: ID of the assessment in rework status
            language: Language code for output (ceb=Bisaya, fil=Tagalog, en=English)

        Returns:
            Tuple of (prompt_string, indicator_data_list)
            - prompt_string: Formatted prompt for Gemini API
            - indicator_data_list: Raw data for each indicator (for reference)

        Raises:
            ValueError: If assessment not found or not in rework status
        """
        # Get assessment with all relationships
        from app.db.models.assessment import MOVAnnotation
        from app.db.models.user import User

        assessment = (
            db.query(Assessment)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                joinedload(Assessment.responses)
                .joinedload(AssessmentResponse.indicator)
                .joinedload(Indicator.governance_area),
                joinedload(Assessment.responses).joinedload(
                    AssessmentResponse.feedback_comments
                ),
                joinedload(Assessment.responses).joinedload(AssessmentResponse.movs),
            )
            .filter(Assessment.id == assessment_id)
            .first()
        )

        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        # Get barangay name
        barangay_name = "Unknown"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Get indicators requiring rework with all feedback
        indicator_data = []
        for response in assessment.responses:
            if not response.requires_rework:
                continue

            indicator = response.indicator
            governance_area = indicator.governance_area

            # Get public comments (exclude internal notes)
            public_comments = [
                {
                    "assessor": (
                        comment.assessor.name if comment.assessor else "Assessor"
                    ),
                    "comment": comment.comment,
                }
                for comment in response.feedback_comments
                if not comment.is_internal_note
            ]

            # Get MOV annotations for this response
            mov_annotations = []
            affected_mov_files = set()
            for mov in response.movs:
                # Query annotations for this MOV file
                annotations = (
                    db.query(MOVAnnotation)
                    .filter(MOVAnnotation.mov_file_id == mov.id)
                    .all()
                )
                for annotation in annotations:
                    mov_annotations.append(
                        {
                            "filename": mov.original_filename,
                            "comment": annotation.comment,
                            "page": annotation.page,
                        }
                    )
                    affected_mov_files.add(mov.original_filename)

            indicator_data.append(
                {
                    "indicator_id": indicator.id,
                    "indicator_name": indicator.name,
                    "description": indicator.description,
                    "governance_area": governance_area.name,
                    "public_comments": public_comments,
                    "mov_annotations": mov_annotations,
                    "affected_movs": list(affected_mov_files),
                }
            )

        if not indicator_data:
            raise ValueError(
                f"Assessment {assessment_id} has no indicators requiring rework"
            )

        # Get language instruction
        lang_instruction = LANGUAGE_INSTRUCTIONS.get(
            language, LANGUAGE_INSTRUCTIONS["ceb"]
        )

        # Build the prompt
        prompt = f"""{lang_instruction}

You are an expert consultant analyzing SGLGB (Seal of Good Local Governance - Barangay) assessment rework feedback.

BARANGAY INFORMATION:
- Name: {barangay_name}
- Assessment ID: {assessment_id}
- Status: Rework Requested

CONTEXT:
An assessor has reviewed this barangay's assessment submission and identified issues that need to be addressed. Your task is to generate a clear, comprehensive, and actionable summary that helps the BLGU (Barangay Local Government Unit) understand exactly what needs to be fixed.

INDICATORS REQUIRING REWORK:
"""

        for idx, indicator in enumerate(indicator_data, 1):
            prompt += f"""
{idx}. {indicator["indicator_name"]}
   - Governance Area: {indicator["governance_area"]}
   - Description: {indicator["description"]}
"""

            if indicator["public_comments"]:
                prompt += "   - Assessor Comments:\n"
                for comment in indicator["public_comments"]:
                    prompt += f"     • {comment['assessor']}: {comment['comment']}\n"

            if indicator["mov_annotations"]:
                prompt += "   - Document Issues (MOV Annotations):\n"
                for annotation in indicator["mov_annotations"]:
                    page_info = (
                        f"(Page {annotation['page']})"
                        if annotation["page"]
                        else ""
                    )
                    prompt += f"     • {annotation['filename']} {page_info}: {annotation['comment']}\n"

        prompt += """

TASK:
Based on the assessor feedback above, generate a comprehensive rework summary in the following JSON structure:

{
  "overall_summary": "A brief 2-3 sentence summary of the main issues across all indicators. Be specific and actionable.",
  "indicator_summaries": [
    {
      "indicator_id": 1,
      "indicator_name": "Full indicator name",
      "key_issues": [
        "Specific issue 1 identified by assessor",
        "Specific issue 2 identified by assessor"
      ],
      "suggested_actions": [
        "Actionable step 1 the BLGU should take",
        "Actionable step 2 the BLGU should take"
      ],
      "affected_movs": ["filename1.pdf", "filename2.jpg"]
    }
  ],
  "priority_actions": [
    "Most critical action 1",
    "Most critical action 2",
    "Most critical action 3"
  ],
  "estimated_time": "Estimated time to complete all rework (e.g., '30-45 minutes', '1-2 hours')"
}

GUIDELINES:
1. Be clear and specific - avoid vague language
2. Focus on actionable steps the BLGU can take immediately
3. Prioritize issues that will have the biggest impact on compliance
4. Use simple language that BLGU staff can easily understand
5. For each indicator, extract the key issues from both comments and MOV annotations
6. Suggest concrete actions (e.g., "Reupload budget ordinance with clearer dates" not "Fix budget document")
7. List only the top 3-5 priority actions that address the most critical issues
8. Estimate time realistically based on the complexity and number of issues
"""

        return prompt, indicator_data

    def generate_rework_summary(
        self, db: Session, assessment_id: int, language: str = "ceb"
    ) -> Dict[str, Any]:
        """
        Generate AI-powered rework summary from assessor feedback.

        Builds a comprehensive prompt from all rework feedback (comments and
        annotations), calls Gemini API, and returns a structured summary that
        helps BLGU users understand what needs to be fixed.

        This method does NOT cache results - it generates a fresh summary each time.
        Caching is handled by the background worker that stores results in
        assessment.rework_summary.

        Args:
            db: Database session
            assessment_id: ID of the assessment in rework status
            language: Language code for output (ceb=Bisaya, fil=Tagalog, en=English)

        Returns:
            Dictionary with rework summary structure matching ReworkSummaryResponse schema

        Raises:
            ValueError: If assessment not found, API key not configured, or no rework data
            Exception: If API call fails or response parsing fails
        """
        # Check if API key is configured
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured in environment")

        # Build the prompt with language instruction
        prompt, indicator_data = self.build_rework_summary_prompt(
            db, assessment_id, language
        )

        # Configure Gemini
        genai.configure(api_key=settings.GEMINI_API_KEY)  # type: ignore

        # Initialize the model
        model = genai.GenerativeModel("gemini-2.5-flash")  # type: ignore

        try:
            # Call the API with generation configuration
            generation_config = {
                "temperature": 0.7,  # Slightly creative but still factual
                "max_output_tokens": 8192,
            }

            response = model.generate_content(
                prompt,
                generation_config=generation_config,  # type: ignore
            )

            # Parse the response text
            if not response or not hasattr(response, "text") or not response.text:
                raise Exception("Gemini API returned empty or invalid response")

            response_text = response.text

            # Extract JSON from the response (handle markdown code blocks)
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                json_str = response_text[start:end].strip()
            elif "```" in response_text:
                start = response_text.find("```") + 3
                end = response_text.find("```", start)
                json_str = response_text[start:end].strip()
            else:
                json_str = response_text.strip()

            # Parse the JSON
            parsed_response = json.loads(json_str)

            # Validate the response structure
            required_keys = [
                "overall_summary",
                "indicator_summaries",
                "priority_actions",
            ]
            if not all(key in parsed_response for key in required_keys):
                raise ValueError(
                    f"Gemini API response missing required keys. Got: {list(parsed_response.keys())}"
                )

            # Add generation timestamp and language
            parsed_response["generated_at"] = datetime.now(UTC).isoformat()
            parsed_response["language"] = language

            # Ensure estimated_time exists (set default if not provided)
            if "estimated_time" not in parsed_response:
                # Estimate based on number of indicators
                num_indicators = len(parsed_response["indicator_summaries"])
                if num_indicators <= 2:
                    parsed_response["estimated_time"] = "30-45 minutes"
                elif num_indicators <= 4:
                    parsed_response["estimated_time"] = "1-2 hours"
                else:
                    parsed_response["estimated_time"] = "2-3 hours"

            logger.info(
                f"Successfully generated rework summary for assessment {assessment_id}"
            )

            return parsed_response

        except json.JSONDecodeError as e:
            logger.error(
                f"Failed to parse Gemini API response as JSON for assessment {assessment_id}: {response_text}"
            )
            raise Exception(
                f"Failed to parse Gemini API response as JSON: {response_text}"
            ) from e
        except TimeoutError as e:
            logger.error(
                f"Gemini API request timed out for assessment {assessment_id}"
            )
            raise Exception(
                "Gemini API request timed out after waiting for response"
            ) from e
        except ValueError:
            # Re-raise ValueError as-is
            raise
        except Exception as e:
            # Handle various API errors with specific messages
            error_message = str(e).lower()
            if "quota" in error_message or "rate limit" in error_message:
                logger.error(f"Gemini API quota/rate limit hit: {str(e)}")
                raise Exception(
                    "Gemini API quota exceeded or rate limit hit. Please try again later."
                ) from e
            elif "network" in error_message or "connection" in error_message:
                logger.error(f"Network error calling Gemini API: {str(e)}")
                raise Exception(
                    "Network error connecting to Gemini API. Please check your internet connection."
                ) from e
            elif "permission" in error_message or "unauthorized" in error_message:
                logger.error(f"Gemini API authentication failed: {str(e)}")
                raise Exception(
                    "Gemini API authentication failed. Please check your API key."
                ) from e
            else:
                logger.error(f"Gemini API call failed: {str(e)}")
                raise Exception(f"Gemini API call failed: {str(e)}") from e

    def generate_default_language_summaries(
        self, db: Session, assessment_id: int
    ) -> Dict[str, Dict[str, Any]]:
        """
        Generate rework summaries in default languages (Bisaya + English).

        This is called by the Celery worker when an assessment enters rework status.
        Generates summaries in both Bisaya (ceb) and English (en) upfront for instant
        language switching. Tagalog is generated on-demand when requested.

        Args:
            db: Database session
            assessment_id: ID of the assessment in rework status

        Returns:
            Dictionary keyed by language code with summary data:
            {"ceb": {...}, "en": {...}}
        """
        summaries = {}
        for lang in DEFAULT_LANGUAGES:
            try:
                logger.info(
                    f"Generating {lang} rework summary for assessment {assessment_id}"
                )
                summaries[lang] = self.generate_rework_summary(db, assessment_id, lang)
            except Exception as e:
                logger.error(
                    f"Failed to generate {lang} rework summary for assessment {assessment_id}: {e}"
                )
                # Continue with other languages even if one fails
        return summaries

    def generate_single_language_summary(
        self, db: Session, assessment_id: int, language: str
    ) -> Dict[str, Any]:
        """
        Generate rework summary for a specific language (on-demand).

        Used when a user requests a language that wasn't pre-generated
        (e.g., Tagalog which is generated on-demand).

        Args:
            db: Database session
            assessment_id: ID of the assessment in rework status
            language: Language code (ceb, fil, en)

        Returns:
            Dictionary with rework summary in the requested language
        """
        return self.generate_rework_summary(db, assessment_id, language)

    # ========================================
    # CALIBRATION SUMMARY GENERATION (AI-POWERED)
    # ========================================

    def build_calibration_summary_prompt(
        self, db: Session, assessment_id: int, governance_area_id: int, language: str = "ceb"
    ) -> tuple[str, List[Dict[str, Any]]]:
        """
        Build a structured prompt for Gemini API from calibration feedback.

        Unlike rework summaries which cover all indicators, calibration summaries
        focus only on indicators in the validator's governance area that were
        marked as FAIL (Unmet).

        Args:
            db: Database session
            assessment_id: ID of the assessment in rework/calibration status
            governance_area_id: ID of the validator's governance area
            language: Language code for output (ceb=Bisaya, fil=Tagalog, en=English)

        Returns:
            Tuple of (prompt_string, indicator_data_list)
            - prompt_string: Formatted prompt for Gemini API
            - indicator_data_list: Raw data for each indicator (for reference)

        Raises:
            ValueError: If assessment not found or no calibration data
        """
        # Get assessment with all relationships
        from app.db.models.assessment import MOVAnnotation
        from app.db.models.user import User

        assessment = (
            db.query(Assessment)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                joinedload(Assessment.responses)
                .joinedload(AssessmentResponse.indicator)
                .joinedload(Indicator.governance_area),
                joinedload(Assessment.responses).joinedload(
                    AssessmentResponse.feedback_comments
                ),
                joinedload(Assessment.responses).joinedload(AssessmentResponse.movs),
            )
            .filter(Assessment.id == assessment_id)
            .first()
        )

        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        # Get the governance area name
        governance_area = (
            db.query(GovernanceArea)
            .filter(GovernanceArea.id == governance_area_id)
            .first()
        )
        governance_area_name = governance_area.name if governance_area else "Unknown"

        # Get barangay name
        barangay_name = "Unknown"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Get indicators requiring calibration (only from the validator's governance area)
        # Filter to indicators that have requires_rework=True and are in the validator's area
        indicator_data = []
        for response in assessment.responses:
            if not response.requires_rework:
                continue

            indicator = response.indicator
            if not indicator or indicator.governance_area_id != governance_area_id:
                continue

            # Get public comments (exclude internal notes)
            public_comments = [
                {
                    "assessor": (
                        comment.assessor.name if comment.assessor else "Validator"
                    ),
                    "comment": comment.comment,
                }
                for comment in response.feedback_comments
                if not comment.is_internal_note
            ]

            # Get MOV annotations for this response
            mov_annotations = []
            affected_mov_files = set()
            for mov in response.movs:
                # Query annotations for this MOV file
                annotations = (
                    db.query(MOVAnnotation)
                    .filter(MOVAnnotation.mov_file_id == mov.id)
                    .all()
                )
                for annotation in annotations:
                    mov_annotations.append(
                        {
                            "filename": mov.original_filename,
                            "comment": annotation.comment,
                            "page": annotation.page,
                        }
                    )
                    affected_mov_files.add(mov.original_filename)

            indicator_data.append(
                {
                    "indicator_id": indicator.id,
                    "indicator_name": indicator.name,
                    "description": indicator.description,
                    "governance_area": governance_area_name,
                    "public_comments": public_comments,
                    "mov_annotations": mov_annotations,
                    "affected_movs": list(affected_mov_files),
                }
            )

        if not indicator_data:
            raise ValueError(
                f"Assessment {assessment_id} has no indicators requiring calibration in governance area {governance_area_id}"
            )

        # Get language instruction
        lang_instruction = LANGUAGE_INSTRUCTIONS.get(
            language, LANGUAGE_INSTRUCTIONS["ceb"]
        )

        # Build the prompt (similar to rework but emphasizing calibration context)
        prompt = f"""{lang_instruction}

You are an expert consultant analyzing SGLGB (Seal of Good Local Governance - Barangay) assessment calibration feedback.

BARANGAY INFORMATION:
- Name: {barangay_name}
- Assessment ID: {assessment_id}
- Status: Calibration Requested
- Governance Area: {governance_area_name}

CONTEXT:
A validator has reviewed this barangay's assessment during table validation and identified specific issues in the "{governance_area_name}" governance area that need to be addressed. Unlike a full rework, calibration focuses only on specific indicators that were marked as "Unmet" (Failed) during validation.

Your task is to generate a clear, comprehensive, and actionable summary that helps the BLGU (Barangay Local Government Unit) understand exactly what needs to be fixed for this specific governance area.

INDICATORS REQUIRING CALIBRATION:
"""

        for idx, indicator in enumerate(indicator_data, 1):
            prompt += f"""
{idx}. {indicator["indicator_name"]}
   - Governance Area: {indicator["governance_area"]}
   - Description: {indicator["description"]}
"""

            if indicator["public_comments"]:
                prompt += "   - Validator Comments:\n"
                for comment in indicator["public_comments"]:
                    prompt += f"     • {comment['assessor']}: {comment['comment']}\n"

            if indicator["mov_annotations"]:
                prompt += "   - Document Issues (MOV Annotations):\n"
                for annotation in indicator["mov_annotations"]:
                    page_info = (
                        f"(Page {annotation['page']})"
                        if annotation["page"]
                        else ""
                    )
                    prompt += f"     • {annotation['filename']} {page_info}: {annotation['comment']}\n"

        prompt += f"""

TASK:
Based on the validator feedback above, generate a comprehensive calibration summary in the following JSON structure:

{{
  "overall_summary": "A brief 2-3 sentence summary of the main issues in the {governance_area_name} governance area. Be specific and actionable.",
  "governance_area": "{governance_area_name}",
  "indicator_summaries": [
    {{
      "indicator_id": 1,
      "indicator_name": "Full indicator name",
      "key_issues": [
        "Specific issue 1 identified by validator",
        "Specific issue 2 identified by validator"
      ],
      "suggested_actions": [
        "Actionable step 1 the BLGU should take",
        "Actionable step 2 the BLGU should take"
      ],
      "affected_movs": ["filename1.pdf", "filename2.jpg"]
    }}
  ],
  "priority_actions": [
    "Most critical action 1",
    "Most critical action 2",
    "Most critical action 3"
  ],
  "estimated_time": "Estimated time to complete calibration corrections (e.g., '15-30 minutes', '30-45 minutes')"
}}

GUIDELINES:
1. Be clear and specific - avoid vague language
2. Focus on actionable steps the BLGU can take immediately
3. Emphasize that this is a focused calibration, not a full rework
4. Use simple language that BLGU staff can easily understand
5. For each indicator, extract the key issues from both comments and MOV annotations
6. Suggest concrete actions (e.g., "Reupload budget ordinance with clearer dates" not "Fix budget document")
7. List only the top 3 priority actions that address the most critical issues
8. Estimate time realistically - calibrations are typically faster than full reworks
9. Remember this is only for the {governance_area_name} governance area, not all indicators
"""

        return prompt, indicator_data

    def generate_calibration_summary(
        self, db: Session, assessment_id: int, governance_area_id: int, language: str = "ceb"
    ) -> Dict[str, Any]:
        """
        Generate AI-powered calibration summary from validator feedback.

        Builds a comprehensive prompt from calibration feedback (comments and
        annotations) for the specified governance area, calls Gemini API, and
        returns a structured summary that helps BLGU users understand what
        needs to be fixed.

        This method does NOT cache results - it generates a fresh summary each time.
        Caching is handled by the background worker that stores results in
        assessment.calibration_summary.

        Args:
            db: Database session
            assessment_id: ID of the assessment in calibration status
            governance_area_id: ID of the validator's governance area
            language: Language code for output (ceb=Bisaya, fil=Tagalog, en=English)

        Returns:
            Dictionary with calibration summary structure matching CalibrationSummaryResponse schema

        Raises:
            ValueError: If assessment not found, API key not configured, or no calibration data
            Exception: If API call fails or response parsing fails
        """
        # Check if API key is configured
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured in environment")

        # Build the prompt with language instruction
        prompt, indicator_data = self.build_calibration_summary_prompt(
            db, assessment_id, governance_area_id, language
        )

        # Configure Gemini
        genai.configure(api_key=settings.GEMINI_API_KEY)  # type: ignore

        # Initialize the model
        model = genai.GenerativeModel("gemini-2.5-flash")  # type: ignore

        try:
            # Call the API with generation configuration
            generation_config = {
                "temperature": 0.7,  # Slightly creative but still factual
                "max_output_tokens": 8192,
            }

            response = model.generate_content(
                prompt,
                generation_config=generation_config,  # type: ignore
            )

            # Parse the response text
            if not response or not hasattr(response, "text") or not response.text:
                raise Exception("Gemini API returned empty or invalid response")

            response_text = response.text

            # Extract JSON from the response (handle markdown code blocks)
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                json_str = response_text[start:end].strip()
            elif "```" in response_text:
                start = response_text.find("```") + 3
                end = response_text.find("```", start)
                json_str = response_text[start:end].strip()
            else:
                json_str = response_text.strip()

            # Parse the JSON
            parsed_response = json.loads(json_str)

            # Validate the response structure
            required_keys = [
                "overall_summary",
                "indicator_summaries",
                "priority_actions",
            ]
            if not all(key in parsed_response for key in required_keys):
                raise ValueError(
                    f"Gemini API response missing required keys. Got: {list(parsed_response.keys())}"
                )

            # Add generation timestamp, language, and governance area info
            parsed_response["generated_at"] = datetime.now(UTC).isoformat()
            parsed_response["language"] = language
            parsed_response["governance_area_id"] = governance_area_id

            # Ensure estimated_time exists (set default if not provided)
            if "estimated_time" not in parsed_response:
                # Estimate based on number of indicators (calibrations are typically faster)
                num_indicators = len(parsed_response["indicator_summaries"])
                if num_indicators <= 2:
                    parsed_response["estimated_time"] = "15-30 minutes"
                elif num_indicators <= 4:
                    parsed_response["estimated_time"] = "30-45 minutes"
                else:
                    parsed_response["estimated_time"] = "1-2 hours"

            logger.info(
                f"Successfully generated calibration summary for assessment {assessment_id} "
                f"(governance area {governance_area_id})"
            )

            return parsed_response

        except json.JSONDecodeError as e:
            logger.error(
                f"Failed to parse Gemini API response as JSON for assessment {assessment_id}: {response_text}"
            )
            raise Exception(
                f"Failed to parse Gemini API response as JSON: {response_text}"
            ) from e
        except TimeoutError as e:
            logger.error(
                f"Gemini API request timed out for assessment {assessment_id}"
            )
            raise Exception(
                "Gemini API request timed out after waiting for response"
            ) from e
        except ValueError:
            # Re-raise ValueError as-is
            raise
        except Exception as e:
            # Handle various API errors with specific messages
            error_message = str(e).lower()
            if "quota" in error_message or "rate limit" in error_message:
                logger.error(f"Gemini API quota/rate limit hit: {str(e)}")
                raise Exception(
                    "Gemini API quota exceeded or rate limit hit. Please try again later."
                ) from e
            elif "network" in error_message or "connection" in error_message:
                logger.error(f"Network error calling Gemini API: {str(e)}")
                raise Exception(
                    "Network error connecting to Gemini API. Please check your internet connection."
                ) from e
            elif "permission" in error_message or "unauthorized" in error_message:
                logger.error(f"Gemini API authentication failed: {str(e)}")
                raise Exception(
                    "Gemini API authentication failed. Please check your API key."
                ) from e
            else:
                logger.error(f"Gemini API call failed: {str(e)}")
                raise Exception(f"Gemini API call failed: {str(e)}") from e

    def generate_default_language_calibration_summaries(
        self, db: Session, assessment_id: int, governance_area_id: int
    ) -> Dict[str, Dict[str, Any]]:
        """
        Generate calibration summaries in default languages (Bisaya + English).

        This is called by the Celery worker when an assessment enters calibration status.
        Generates summaries in both Bisaya (ceb) and English (en) upfront for instant
        language switching. Tagalog is generated on-demand when requested.

        Args:
            db: Database session
            assessment_id: ID of the assessment in calibration status
            governance_area_id: ID of the validator's governance area

        Returns:
            Dictionary keyed by language code with summary data:
            {"ceb": {...}, "en": {...}}
        """
        summaries = {}
        for lang in DEFAULT_LANGUAGES:
            try:
                logger.info(
                    f"Generating {lang} calibration summary for assessment {assessment_id} "
                    f"(governance area {governance_area_id})"
                )
                summaries[lang] = self.generate_calibration_summary(
                    db, assessment_id, governance_area_id, lang
                )
            except Exception as e:
                logger.error(
                    f"Failed to generate {lang} calibration summary for assessment {assessment_id}: {e}"
                )
                # Continue with other languages even if one fails
        return summaries

    def generate_single_language_calibration_summary(
        self, db: Session, assessment_id: int, governance_area_id: int, language: str
    ) -> Dict[str, Any]:
        """
        Generate calibration summary for a specific language (on-demand).

        Used when a user requests a language that wasn't pre-generated
        (e.g., Tagalog which is generated on-demand).

        Args:
            db: Database session
            assessment_id: ID of the assessment in calibration status
            governance_area_id: ID of the validator's governance area
            language: Language code (ceb, fil, en)

        Returns:
            Dictionary with calibration summary in the requested language
        """
        return self.generate_calibration_summary(db, assessment_id, governance_area_id, language)

    # ========================================
    # CAPDEV (CAPACITY DEVELOPMENT) INSIGHTS GENERATION
    # Generated after MLGOO approval for approved assessments
    # ========================================

    def build_capdev_prompt(
        self, db: Session, assessment_id: int, language: str = "ceb"
    ) -> str:
        """
        Build a comprehensive prompt for CapDev insights generation.

        Creates a detailed prompt that analyzes:
        - Failed indicators and governance area weaknesses
        - Area-level compliance results
        - Assessor/Validator feedback patterns
        - Generates actionable CapDev interventions

        Args:
            db: Database session
            assessment_id: ID of the approved assessment
            language: Language code for output (ceb=Bisaya, fil=Tagalog, en=English)

        Returns:
            Formatted prompt string for Gemini API

        Raises:
            ValueError: If assessment not found or not approved
        """
        from app.db.models.user import User

        # Get assessment with all relationships
        assessment = (
            db.query(Assessment)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                joinedload(Assessment.responses)
                .joinedload(AssessmentResponse.indicator)
                .joinedload(Indicator.governance_area),
                joinedload(Assessment.responses).joinedload(
                    AssessmentResponse.feedback_comments
                ),
            )
            .filter(Assessment.id == assessment_id)
            .first()
        )

        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        if not assessment.mlgoo_approved_at:
            raise ValueError(f"Assessment {assessment_id} has not been approved by MLGOO")

        # Get barangay name
        barangay_name = "Unknown"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Get assessment year
        assessment_year = str(assessment.mlgoo_approved_at.year)

        # Get compliance status
        compliance_status = (
            assessment.final_compliance_status.value
            if assessment.final_compliance_status
            else "Not classified"
        )

        # Get area results
        area_results = assessment.area_results or {}

        # Group indicators by governance area and status
        area_analysis = {}
        for response in assessment.responses:
            indicator = response.indicator
            if not indicator or not indicator.governance_area:
                continue

            area_name = indicator.governance_area.name
            area_type = indicator.governance_area.area_type.value

            if area_name not in area_analysis:
                area_analysis[area_name] = {
                    "area_type": area_type,
                    "passed_indicators": [],
                    "failed_indicators": [],
                    "assessor_feedback": [],
                }

            if response.validation_status in (ValidationStatus.PASS, ValidationStatus.CONDITIONAL):
                area_analysis[area_name]["passed_indicators"].append(indicator.name)
            else:
                area_analysis[area_name]["failed_indicators"].append({
                    "name": indicator.name,
                    "description": indicator.description,
                })

                # Collect feedback for failed indicators
                for comment in response.feedback_comments:
                    if not comment.is_internal_note:
                        area_analysis[area_name]["assessor_feedback"].append(comment.comment)

        # Get language instruction
        lang_instruction = LANGUAGE_INSTRUCTIONS.get(
            language, LANGUAGE_INSTRUCTIONS["ceb"]
        )

        # Build the prompt
        prompt = f"""{lang_instruction}

You are an expert consultant specializing in local governance capacity development for Philippine barangays. You are analyzing the SGLGB (Seal of Good Local Governance - Barangay) assessment results to generate comprehensive Capacity Development (CapDev) recommendations.

BARANGAY INFORMATION:
- Name: {barangay_name}
- Assessment Year: {assessment_year}
- Overall Compliance Status: {compliance_status}

AREA-LEVEL RESULTS:
"""
        for area_name, status in area_results.items():
            area_type = "Core" if area_name in CORE_AREAS else "Essential"
            prompt += f"- {area_name} ({area_type}): {status}\n"

        prompt += """

DETAILED AREA ANALYSIS:
"""
        for area_name, analysis in area_analysis.items():
            prompt += f"""
{area_name} ({analysis["area_type"]}):
  - Passed Indicators: {len(analysis["passed_indicators"])}
  - Failed Indicators: {len(analysis["failed_indicators"])}
"""
            if analysis["failed_indicators"]:
                prompt += "  - Failed Indicator Details:\n"
                for ind in analysis["failed_indicators"]:
                    desc = ind['description'] or "No description available"
                    prompt += f"    • {ind['name']}: {desc[:100]}...\n"

            if analysis["assessor_feedback"]:
                prompt += "  - Key Assessor Feedback:\n"
                for feedback in analysis["assessor_feedback"][:3]:  # Limit to 3 per area
                    prompt += f"    • {feedback[:150]}...\n"

        prompt += """

TASK:
Based on the assessment results above, generate a comprehensive CapDev (Capacity Development) analysis in the following JSON structure:

{
  "summary": "A comprehensive 3-4 sentence summary of the barangay's key governance strengths and weaknesses. Highlight the most critical areas needing improvement.",
  "governance_weaknesses": [
    "Specific weakness 1 identified from failed indicators",
    "Specific weakness 2 identified from failed indicators",
    "..."
  ],
  "recommendations": [
    "Actionable recommendation 1 - specific and implementable",
    "Actionable recommendation 2 - specific and implementable",
    "..."
  ],
  "capacity_development_needs": [
    {
      "category": "Training",
      "description": "Specific training need",
      "affected_indicators": ["Indicator 1", "Indicator 2"],
      "suggested_providers": ["DILG", "LGA", "Partner NGO"]
    },
    {
      "category": "Resources",
      "description": "Resource or equipment need",
      "affected_indicators": ["Indicator 1"],
      "suggested_providers": ["Municipal Government", "National Agency"]
    },
    {
      "category": "Technical Assistance",
      "description": "Technical support need",
      "affected_indicators": ["Indicator 1", "Indicator 2"],
      "suggested_providers": ["DILG Regional Office"]
    },
    {
      "category": "Policy",
      "description": "Policy or ordinance development need",
      "affected_indicators": ["Indicator 1"],
      "suggested_providers": ["Sangguniang Barangay"]
    }
  ],
  "suggested_interventions": [
    {
      "title": "Intervention title",
      "description": "Detailed description of the intervention",
      "governance_area": "Affected governance area",
      "priority": "Immediate",
      "estimated_duration": "1-2 weeks",
      "resource_requirements": "Brief description of resources needed"
    },
    {
      "title": "Another intervention",
      "description": "Description",
      "governance_area": "Governance area",
      "priority": "Short-term",
      "estimated_duration": "1-2 months",
      "resource_requirements": "Resources needed"
    }
  ],
  "priority_actions": [
    "Highest priority action 1 - the most critical immediate step",
    "Highest priority action 2",
    "Highest priority action 3",
    "Highest priority action 4",
    "Highest priority action 5"
  ]
}

GUIDELINES:
1. Focus on ROOT CAUSES of non-compliance, not just symptoms
2. Provide SPECIFIC, ACTIONABLE interventions tailored to Philippine barangay context
3. Categorize capacity development needs into: Training, Resources, Technical Assistance, Policy
4. For suggested_interventions priority, use: "Immediate" (within 1 month), "Short-term" (1-3 months), "Long-term" (3-6 months)
5. Include realistic resource requirements and suggested providers (DILG, LGA, municipal government, etc.)
6. Priority actions should be the 5 most critical steps the barangay should take immediately
7. Consider the "3+1" SGLGB rule: All 3 Core areas must pass + at least 1 Essential area
8. Recommendations should be practical for a barangay-level government
9. Use simple language that barangay officials can understand
"""

        return prompt

    def generate_capdev_insights(
        self, db: Session, assessment_id: int, language: str = "ceb"
    ) -> Dict[str, Any]:
        """
        Generate AI-powered CapDev insights for an approved assessment.

        Builds a comprehensive prompt from assessment data, calls Gemini API,
        and returns structured CapDev insights including:
        - Summary of governance weaknesses
        - Actionable recommendations
        - Categorized capacity development needs
        - Prioritized interventions

        Args:
            db: Database session
            assessment_id: ID of the approved assessment
            language: Language code for output (ceb=Bisaya, fil=Tagalog, en=English)

        Returns:
            Dictionary with CapDev insights structure

        Raises:
            ValueError: If assessment not found, not approved, or API key not configured
            Exception: If API call fails or response parsing fails
        """
        # Check if API key is configured
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured in environment")

        # Build the prompt
        prompt = self.build_capdev_prompt(db, assessment_id, language)

        # Configure Gemini
        genai.configure(api_key=settings.GEMINI_API_KEY)  # type: ignore

        # Initialize the model
        model = genai.GenerativeModel("gemini-2.5-flash")  # type: ignore

        try:
            # Call the API with generation configuration
            generation_config = {
                "temperature": 0.7,
                "max_output_tokens": 16384,  # Larger output for comprehensive CapDev
            }

            response = model.generate_content(
                prompt,
                generation_config=generation_config,  # type: ignore
            )

            # Parse the response text
            if not response or not hasattr(response, "text") or not response.text:
                raise Exception("Gemini API returned empty or invalid response")

            response_text = response.text

            # Extract JSON from the response
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                json_str = response_text[start:end].strip()
            elif "```" in response_text:
                start = response_text.find("```") + 3
                end = response_text.find("```", start)
                json_str = response_text[start:end].strip()
            else:
                json_str = response_text.strip()

            # Parse the JSON
            parsed_response = json.loads(json_str)

            # Validate the response structure
            required_keys = [
                "summary",
                "governance_weaknesses",
                "recommendations",
                "capacity_development_needs",
                "suggested_interventions",
                "priority_actions",
            ]
            if not all(key in parsed_response for key in required_keys):
                raise ValueError(
                    f"Gemini API response missing required keys. Got: {list(parsed_response.keys())}"
                )

            # Add metadata
            parsed_response["generated_at"] = datetime.now(UTC).isoformat()
            parsed_response["language"] = language
            parsed_response["assessment_id"] = assessment_id

            logger.info(
                f"Successfully generated CapDev insights for assessment {assessment_id} in {language}"
            )

            return parsed_response

        except json.JSONDecodeError as e:
            logger.error(
                f"Failed to parse Gemini API response as JSON for assessment {assessment_id}: {response_text}"
            )
            raise Exception(
                f"Failed to parse Gemini API response as JSON"
            ) from e
        except TimeoutError as e:
            logger.error(
                f"Gemini API request timed out for assessment {assessment_id}"
            )
            raise Exception(
                "Gemini API request timed out after waiting for response"
            ) from e
        except ValueError:
            raise
        except Exception as e:
            error_message = str(e).lower()
            if "quota" in error_message or "rate limit" in error_message:
                logger.error(f"Gemini API quota/rate limit hit: {str(e)}")
                raise Exception(
                    "Gemini API quota exceeded or rate limit hit. Please try again later."
                ) from e
            elif "network" in error_message or "connection" in error_message:
                logger.error(f"Network error calling Gemini API: {str(e)}")
                raise Exception(
                    "Network error connecting to Gemini API."
                ) from e
            elif "permission" in error_message or "unauthorized" in error_message:
                logger.error(f"Gemini API authentication failed: {str(e)}")
                raise Exception(
                    "Gemini API authentication failed. Please check your API key."
                ) from e
            else:
                logger.error(f"Gemini API call failed: {str(e)}")
                raise Exception(f"Gemini API call failed: {str(e)}") from e

    def generate_default_language_capdev_insights(
        self, db: Session, assessment_id: int
    ) -> Dict[str, Dict[str, Any]]:
        """
        Generate CapDev insights in default languages (Bisaya + English).

        This is called by the Celery worker when MLGOO approves an assessment.
        Generates insights in both Bisaya (ceb) and English (en) upfront.

        Args:
            db: Database session
            assessment_id: ID of the approved assessment

        Returns:
            Dictionary keyed by language code with insights data:
            {"ceb": {...}, "en": {...}}
        """
        insights = {}
        for lang in DEFAULT_LANGUAGES:
            try:
                logger.info(
                    f"Generating {lang} CapDev insights for assessment {assessment_id}"
                )
                insights[lang] = self.generate_capdev_insights(db, assessment_id, lang)
            except Exception as e:
                logger.error(
                    f"Failed to generate {lang} CapDev insights for assessment {assessment_id}: {e}"
                )
                # Continue with other languages even if one fails
        return insights

    def get_capdev_insights_with_caching(
        self, db: Session, assessment_id: int, language: str = "ceb"
    ) -> Dict[str, Any]:
        """
        Get CapDev insights with language-aware caching.

        First checks if capdev_insights already exists for the requested language.
        If cached data exists, returns it immediately without calling Gemini API.
        If not, calls Gemini API, stores the result, and returns it.

        Args:
            db: Database session
            assessment_id: ID of the assessment
            language: Language code for output (ceb=Bisaya, fil=Tagalog, en=English)

        Returns:
            Dictionary with CapDev insights

        Raises:
            ValueError: If assessment not found or not approved
            Exception: If API call fails
        """
        # Get assessment to check for cached insights
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        if not assessment.mlgoo_approved_at:
            raise ValueError(f"Assessment {assessment_id} has not been approved by MLGOO")

        # Check if capdev_insights already exists for this language
        if assessment.capdev_insights:
            if isinstance(assessment.capdev_insights, dict):
                if language in assessment.capdev_insights:
                    logger.info(
                        f"Returning cached CapDev insights for assessment {assessment_id} in {language}"
                    )
                    return assessment.capdev_insights[language]

        # No cached data for this language, generate new insights
        insights = self.generate_capdev_insights(db, assessment_id, language)

        # Store in database under the language key
        if not assessment.capdev_insights:
            assessment.capdev_insights = {}

        assessment.capdev_insights[language] = insights
        # Mark the JSON column as modified so SQLAlchemy detects the change
        flag_modified(assessment, "capdev_insights")
        assessment.capdev_insights_generated_at = datetime.now(UTC)
        assessment.capdev_insights_status = "completed"
        assessment.updated_at = datetime.now(UTC)
        db.commit()
        db.refresh(assessment)

        return insights


intelligence_service = IntelligenceService()
