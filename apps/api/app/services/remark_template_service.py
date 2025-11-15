"""
Remark Template Service

This service handles the rendering of remark templates using Jinja2.
It supports conditional template selection based on assessment results
and variable substitution from assessment data.
"""

from typing import Dict, Any, Optional
from jinja2 import Template, TemplateSyntaxError, UndefinedError
from app.schemas.remark_schema import RemarkSchema, ConditionalRemark


class RemarkTemplateService:
    """
    Service for rendering remark templates with Jinja2.

    Supports:
    - Template variable substitution
    - Conditional template selection
    - Safe handling of missing variables
    """

    def render_template(self, template_text: str, context: Dict[str, Any]) -> str:
        """
        Render a Jinja2 template with the provided context data.

        Args:
            template_text: Jinja2 template string with {{ variable }} placeholders
            context: Dictionary of variables to substitute in the template

        Returns:
            Rendered template string with variables substituted

        Raises:
            ValueError: If template syntax is invalid or rendering fails

        Example:
            >>> service = RemarkTemplateService()
            >>> template = "{{ indicator_name }} score: {{ score }}%"
            >>> context = {"indicator_name": "BDRRMC", "score": 85}
            >>> service.render_template(template, context)
            'BDRRMC score: 85%'
        """
        try:
            template = Template(template_text)
            rendered = template.render(**context)
            return rendered
        except TemplateSyntaxError as e:
            raise ValueError(f"Invalid template syntax: {str(e)}")
        except UndefinedError as e:
            # Handle missing variables gracefully by returning template as-is
            # This allows templates to be saved even if not all variables are available yet
            raise ValueError(f"Missing template variable: {str(e)}")
        except Exception as e:
            raise ValueError(f"Template rendering failed: {str(e)}")

    def select_template(
        self,
        conditional_remarks: list[ConditionalRemark],
        context: Dict[str, Any]
    ) -> Optional[str]:
        """
        Select the appropriate conditional template based on the context.

        Args:
            conditional_remarks: List of conditional remark templates
            context: Dictionary containing assessment data (must include 'status' key)

        Returns:
            The template string of the first matching condition, or None if no match

        Example:
            >>> service = RemarkTemplateService()
            >>> remarks = [
            ...     ConditionalRemark(condition="pass", template="Success!"),
            ...     ConditionalRemark(condition="fail", template="Needs work.")
            ... ]
            >>> context = {"status": "pass"}
            >>> service.select_template(remarks, context)
            'Success!'
        """
        status = context.get("status", "").lower()

        for remark in conditional_remarks:
            # Match condition against status
            # Common conditions: "pass", "fail", "pending"
            if remark.condition.lower() == status:
                return remark.template

        return None

    def generate_remark(
        self,
        remark_schema: RemarkSchema,
        submission_data: Dict[str, Any],
        calculation_result: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate the final remark for an assessment submission.

        This is the main entry point for remark generation. It:
        1. Prepares the context from submission and calculation data
        2. Selects the appropriate template (conditional or default)
        3. Renders the template with the context

        Args:
            remark_schema: The remark schema configuration with templates
            submission_data: Assessment submission data (form fields, metadata)
            calculation_result: Optional calculation result with status and score

        Returns:
            Rendered remark string

        Example:
            >>> service = RemarkTemplateService()
            >>> schema = RemarkSchema(
            ...     conditional_remarks=[
            ...         ConditionalRemark(
            ...             condition="pass",
            ...             template="{{ indicator_name }} passed with {{ score }}%"
            ...         )
            ...     ],
            ...     default_template="{{ indicator_name }} is under review"
            ... )
            >>> submission = {"indicator_name": "BDRRMC"}
            >>> result = {"status": "pass", "score": 90}
            >>> service.generate_remark(schema, submission, result)
            'BDRRMC passed with 90%'
        """
        # Build context from submission data and calculation result
        context: Dict[str, Any] = {}

        # Add submission data (form fields, metadata)
        context.update(submission_data)

        # Add calculation result data if available
        if calculation_result:
            context.update({
                "status": calculation_result.get("status", "pending"),
                "score": calculation_result.get("score"),
            })
        else:
            context["status"] = "pending"

        # Select template: try conditional first, fall back to default
        template_text = None
        if remark_schema.conditional_remarks:
            template_text = self.select_template(
                remark_schema.conditional_remarks,
                context
            )

        # Use default template if no conditional matched
        if template_text is None:
            template_text = remark_schema.default_template

        # Render the selected template
        return self.render_template(template_text, context)

    def validate_template_syntax(self, template_text: str) -> tuple[bool, Optional[str]]:
        """
        Validate Jinja2 template syntax without rendering.

        Args:
            template_text: Template string to validate

        Returns:
            Tuple of (is_valid, error_message)

        Example:
            >>> service = RemarkTemplateService()
            >>> service.validate_template_syntax("{{ valid }}")
            (True, None)
            >>> service.validate_template_syntax("{{ unclosed")
            (False, "Invalid template syntax: ...")
        """
        try:
            Template(template_text)
            return (True, None)
        except TemplateSyntaxError as e:
            return (False, f"Invalid template syntax: {str(e)}")
        except Exception as e:
            return (False, f"Template validation failed: {str(e)}")


# Export singleton instance
remark_template_service = RemarkTemplateService()
