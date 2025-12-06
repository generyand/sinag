"""
Indicator Validation Service

Validates hierarchical indicator tree structure, relationships, and integrity
before publishing. Includes cycle detection, parent-child validation, and
code format checking.
"""

import re
from dataclasses import dataclass


@dataclass
class ValidationResult:
    """Result of tree structure validation"""

    is_valid: bool
    errors: list[str]
    warnings: list[str]


@dataclass
class SchemaValidationResult:
    """Result of schema validation for a single indicator"""

    is_valid: bool
    errors: dict[str, list[str]]  # schema_type -> list of errors


@dataclass
class WeightValidationResult:
    """Result of weight sum validation"""

    is_valid: bool
    errors: dict[str, str]  # parent_id -> error message


class IndicatorValidationService:
    """
    Service for validating indicator tree structures and relationships.

    Validates:
    - Tree structure (no circular references)
    - Parent-child relationships
    - Indicator code format
    - Sort order consistency
    - Schema completeness
    - Weight sums for sibling groups
    """

    def validate_tree_structure(self, indicators: list[dict]) -> ValidationResult:
        """
        Main validation entry point for tree structure.

        Args:
            indicators: List of indicator dictionaries with keys: id, parent_id, code, sort_order

        Returns:
            ValidationResult with errors and warnings
        """
        errors = []
        warnings = []

        # Check for circular references
        circular_errors = self.check_circular_references(indicators)
        errors.extend(circular_errors)

        # Validate parent-child relationships
        relationship_errors = self.validate_parent_child_relationships(indicators)
        errors.extend(relationship_errors)

        # Validate indicator codes
        code_errors, code_warnings = self.validate_indicator_codes(indicators)
        errors.extend(code_errors)
        warnings.extend(code_warnings)

        # Validate sort order
        sort_errors = self.validate_sort_order(indicators)
        errors.extend(sort_errors)

        return ValidationResult(is_valid=len(errors) == 0, errors=errors, warnings=warnings)

    def check_circular_references(self, indicators: list[dict]) -> list[str]:
        """
        Detect circular references in indicator tree using DFS.

        A circular reference occurs when an indicator is its own ancestor.
        Example: A -> B -> C -> A (circular)

        Args:
            indicators: List of indicators

        Returns:
            List of error messages for circular references found
        """
        errors = []

        # Build adjacency list: child_id -> parent_id
        parent_map = {}
        for ind in indicators:
            if ind.get("parent_id"):
                parent_map[ind["id"]] = ind["parent_id"]

        # Track visited nodes for each DFS traversal
        def has_cycle(node_id: str, visited: set[str], path: list[str]) -> list[str] | None:
            """DFS to detect cycle from node_id"""
            if node_id in visited:
                # Found cycle, return the path
                cycle_start = path.index(node_id)
                return path[cycle_start:] + [node_id]

            if node_id not in parent_map:
                # Reached root, no cycle
                return None

            visited.add(node_id)
            path.append(node_id)

            parent_id = parent_map[node_id]
            cycle = has_cycle(parent_id, visited, path)

            if cycle:
                return cycle

            path.pop()
            visited.remove(node_id)
            return None

        # Check each indicator for cycles
        checked = set()
        for ind in indicators:
            node_id = ind["id"]
            if node_id not in checked:
                cycle = has_cycle(node_id, set(), [])
                if cycle:
                    # Get indicator codes for error message
                    cycle_codes = []
                    for nid in cycle:
                        ind_data = next((i for i in indicators if i["id"] == nid), None)
                        if ind_data:
                            cycle_codes.append(ind_data.get("indicator_code", str(nid)))
                    errors.append(f"Circular reference detected: {' → '.join(cycle_codes)}")
                    # Mark all nodes in cycle as checked to avoid duplicate errors
                    checked.update(cycle)
                else:
                    checked.add(node_id)

        return errors

    def validate_parent_child_relationships(self, indicators: list[dict]) -> list[str]:
        """
        Validate that all parent_id references exist in the indicator tree.

        Args:
            indicators: List of indicators

        Returns:
            List of error messages for invalid parent references
        """
        errors = []

        # Build set of all indicator IDs
        indicator_ids = {ind["id"] for ind in indicators}

        for ind in indicators:
            parent_id = ind.get("parent_id")
            if parent_id and parent_id not in indicator_ids:
                code = ind.get("indicator_code", ind["id"])
                errors.append(f"Indicator {code} references non-existent parent ID: {parent_id}")

        return errors

    def validate_indicator_codes(self, indicators: list[dict]) -> tuple[list[str], list[str]]:
        """
        Validate indicator code format matches pattern ^\\d+(\\.\\d+)*$

        Valid codes: "1", "1.1", "1.1.1", "2.3.4"
        Invalid codes: "1.", "1.1.", "A.1", "1.a", ""

        Args:
            indicators: List of indicators

        Returns:
            Tuple of (errors, warnings)
        """
        errors = []
        warnings = []

        # Regex pattern for valid indicator codes
        code_pattern = re.compile(r"^\d+(\.\d+)*$")

        # Track used codes for uniqueness check
        used_codes = set()

        for ind in indicators:
            code = ind.get("indicator_code")
            indicator_id = ind.get("id", "unknown")

            # Check if code exists
            if not code:
                warnings.append(f"Indicator {indicator_id} has no indicator_code set")
                continue

            # Check format
            if not code_pattern.match(code):
                errors.append(
                    f"Indicator {code} has invalid code format (must match pattern: 1, 1.1, 1.1.1, etc.)"
                )

            # Check uniqueness
            if code in used_codes:
                errors.append(f"Duplicate indicator code: {code}")
            used_codes.add(code)

        return errors, warnings

    def validate_sort_order(self, indicators: list[dict]) -> list[str]:
        """
        Validate that sibling indicators have sequential sort_order values.

        Sort order should start at 0 and increment by 1 for each sibling.

        Args:
            indicators: List of indicators

        Returns:
            List of error messages
        """
        errors = []

        # Group indicators by parent_id
        by_parent: dict[str | None, list[dict]] = {}
        for ind in indicators:
            parent_id = ind.get("parent_id")
            if parent_id not in by_parent:
                by_parent[parent_id] = []
            by_parent[parent_id].append(ind)

        # Check sort order for each sibling group
        for parent_id, siblings in by_parent.items():
            # Sort by sort_order
            siblings_sorted = sorted(siblings, key=lambda x: x.get("sort_order", 0))

            # Check if sort_order is sequential starting from 0
            expected_order = 0
            for ind in siblings_sorted:
                actual_order = ind.get("sort_order")
                code = ind.get("indicator_code", ind.get("id"))

                if actual_order != expected_order:
                    parent_desc = f"parent {parent_id}" if parent_id else "root level"
                    errors.append(
                        f"Indicator {code} has sort_order {actual_order}, expected {expected_order} ({parent_desc})"
                    )

                expected_order += 1

        return errors

    def validate_schemas(self, indicator: dict) -> SchemaValidationResult:
        """
        Validate that all required schemas are complete for an indicator.

        Checks:
        - Form schema: all fields have labels
        - MOV checklist: all items have labels
        - Calculation schema: field references exist in form_schema
        - Remark schema: template variables are valid

        Args:
            indicator: Single indicator dictionary

        Returns:
            SchemaValidationResult with errors by schema type
        """
        errors = {}

        # Validate form schema
        form_errors = self.validate_form_schema(indicator.get("form_schema"))
        if form_errors:
            errors["form_schema"] = form_errors

        # Validate MOV checklist
        mov_errors = self.validate_mov_checklist(indicator.get("mov_checklist_items"))
        if mov_errors:
            errors["mov_checklist"] = mov_errors

        # Validate calculation schema
        calc_errors = self.validate_calculation_schema(
            indicator.get("calculation_schema"), indicator.get("form_schema")
        )
        if calc_errors:
            errors["calculation_schema"] = calc_errors

        # Validate remark schema
        remark_errors = self.validate_remark_schema(
            indicator.get("remark_schema"), indicator.get("form_schema")
        )
        if remark_errors:
            errors["remark_schema"] = remark_errors

        return SchemaValidationResult(is_valid=len(errors) == 0, errors=errors)

    def validate_form_schema(self, form_schema: dict | None) -> list[str]:
        """Validate form schema completeness"""
        errors = []

        if not form_schema:
            return errors

        fields = form_schema.get("fields", [])
        for i, field in enumerate(fields):
            # Check required fields
            if not field.get("label"):
                field_id = field.get("field_id", f"field_{i}")
                errors.append(f"Field {field_id} missing label")

            # Check file upload fields have allowed_types
            if field.get("field_type") == "file_upload":
                if not field.get("allowed_file_types"):
                    field_id = field.get("field_id", f"field_{i}")
                    errors.append(f"File upload field {field_id} missing allowed_file_types")

        return errors

    def validate_mov_checklist(self, mov_checklist: dict | None) -> list[str]:
        """Validate MOV checklist completeness"""
        errors = []

        if not mov_checklist:
            return errors

        items = mov_checklist.get("items", [])
        for i, item in enumerate(items):
            # Check required fields
            if not item.get("label"):
                item_id = item.get("id", f"item_{i}")
                errors.append(f"MOV item {item_id} missing label")

            # Check groups have children
            if item.get("type") == "group":
                children = item.get("children", [])
                if not children:
                    item_id = item.get("id", f"item_{i}")
                    errors.append(f"MOV group {item_id} has no children")

        return errors

    def validate_calculation_schema(
        self, calculation_schema: dict | None, form_schema: dict | None
    ) -> list[str]:
        """Validate calculation schema field references"""
        errors = []

        if not calculation_schema or not form_schema:
            return errors

        # Extract field IDs from form schema
        form_field_ids = set()
        if form_schema:
            for field in form_schema.get("fields", []):
                form_field_ids.add(field.get("field_id"))

        # Check calculation rules reference valid fields
        # This is a simplified check - full implementation would recursively check all rules
        condition_groups = calculation_schema.get("condition_groups", [])
        for group in condition_groups:
            rules = group.get("rules", [])
            for rule in rules:
                field_id = rule.get("field_id")
                if field_id and field_id not in form_field_ids:
                    errors.append(f"Calculation rule references non-existent field: {field_id}")

        return errors

    def validate_remark_schema(
        self, remark_schema: dict | None, form_schema: dict | None
    ) -> list[str]:
        """Validate remark schema template variables"""
        errors = []

        if not remark_schema:
            return errors

        # Available variables: barangay_name, indicator_name, score, status, form fields
        available_vars = {
            "barangay_name",
            "indicator_name",
            "indicator_title",
            "score",
            "status",
        }

        # Add form field IDs as available variables
        if form_schema:
            for field in form_schema.get("fields", []):
                available_vars.add(f"form.{field.get('field_id')}")

        # Check template variables (simplified - full implementation would parse Jinja2)
        templates = remark_schema.get("conditional_remarks", [])
        for template in templates:
            template_text = template.get("template", "")
            # Simple check for {{ variable }} patterns
            import re

            var_pattern = re.compile(r"\{\{\s*(\w+(?:\.\w+)?)\s*\}\}")
            for match in var_pattern.finditer(template_text):
                var_name = match.group(1)
                if var_name not in available_vars:
                    errors.append(f"Remark template references unknown variable: {var_name}")

        return errors

    def validate_weights(self, indicators: list[dict]) -> WeightValidationResult:
        """
        Validate that sibling indicator weights sum to 100%.

        Args:
            indicators: List of indicators with 'weight' field

        Returns:
            WeightValidationResult with errors by parent_id
        """
        errors = {}

        # Group indicators by parent_id
        by_parent: dict[str | None, list[dict]] = {}
        for ind in indicators:
            parent_id = ind.get("parent_id")
            if parent_id not in by_parent:
                by_parent[parent_id] = []
            by_parent[parent_id].append(ind)

        # Check weight sum for each sibling group
        for parent_id, siblings in by_parent.items():
            # Sum weights
            total_weight = sum(ind.get("weight", 0) for ind in siblings)

            # Allow tolerance for floating point precision
            if not (99.9 <= total_weight <= 100.1):
                codes = [ind.get("indicator_code", ind.get("id")) for ind in siblings]
                parent_desc = f"parent {parent_id}" if parent_id else "root level"
                errors[str(parent_id)] = (
                    f"Weights for indicators {', '.join(codes)} sum to {total_weight}%, "
                    f"must be 100% ({parent_desc})"
                )

        return WeightValidationResult(is_valid=len(errors) == 0, errors=errors)


# Export singleton instance
indicator_validation_service = IndicatorValidationService()
