# 📅 Year Placeholder Resolver
# Utility for resolving dynamic year placeholders in indicator definitions

import copy
import re
from typing import Any

from sqlalchemy.orm import Session

from app.db.models.system import AssessmentYear


class YearPlaceholderResolver:
    """
    Resolves dynamic year placeholders in indicator schemas and text content.

    This utility handles the annual rollover of assessment years by replacing
    placeholders like {CURRENT_YEAR} with concrete values (e.g., 2025).

    Supported Placeholders:
    - {CURRENT_YEAR} → The current assessment year (e.g., "2025")
    - {PREVIOUS_YEAR} → The year before current (e.g., "2024")
    - {JAN_OCT_CURRENT_YEAR} → "January to October 2025"
    - {JAN_TO_OCT_CURRENT_YEAR} → "January to October 2025" (alias)
    - {JUL_SEP_CURRENT_YEAR} → "July-September 2025"
    - {JUL_TO_SEP_CURRENT_YEAR} → "July-September 2025" (alias)
    - {Q1_Q3_CURRENT_YEAR} → "1st to 3rd quarter of CY 2025"
    - {DEC_31_CURRENT_YEAR} → "December 31, 2025"
    - {DEC_31_PREVIOUS_YEAR} → "December 31, 2024"
    - {CY_CURRENT_YEAR} → "CY 2025"
    - {CY_PREVIOUS_YEAR} → "CY 2024"
    - {MARCH_CURRENT_YEAR} → "March 2025"
    - {OCT_31_CURRENT_YEAR} → "October 31, 2025"

    Usage:
        resolver = YearPlaceholderResolver(2025)  # or from database
        resolved_text = resolver.resolve_string("Posted CY {CURRENT_YEAR} documents")
        resolved_schema = resolver.resolve_schema(form_schema_dict)
    """

    # Pattern to match all supported placeholders
    PLACEHOLDER_PATTERN = re.compile(
        r"\{("
        r"CURRENT_YEAR|"
        r"PREVIOUS_YEAR|"
        r"JAN_OCT_CURRENT_YEAR|"
        r"JAN_TO_OCT_CURRENT_YEAR|"
        r"JUL_SEP_CURRENT_YEAR|"
        r"JUL_TO_SEP_CURRENT_YEAR|"
        r"Q1_Q3_CURRENT_YEAR|"
        r"DEC_31_CURRENT_YEAR|"
        r"DEC_31_PREVIOUS_YEAR|"
        r"CY_CURRENT_YEAR|"
        r"CY_PREVIOUS_YEAR|"
        r"MARCH_CURRENT_YEAR|"
        r"OCT_31_CURRENT_YEAR"
        r")\}"
    )

    def __init__(self, assessment_year: int):
        """
        Initialize the resolver with a specific assessment year.

        Args:
            assessment_year: The current assessment year (e.g., 2025)
        """
        self.current_year = assessment_year
        self.previous_year = assessment_year - 1

        # Pre-build replacement mapping
        self._replacements = {
            "{CURRENT_YEAR}": str(self.current_year),
            "{PREVIOUS_YEAR}": str(self.previous_year),
            "{JAN_OCT_CURRENT_YEAR}": f"January to October {self.current_year}",
            "{JAN_TO_OCT_CURRENT_YEAR}": f"January to October {self.current_year}",
            "{JUL_SEP_CURRENT_YEAR}": f"July-September {self.current_year}",
            "{JUL_TO_SEP_CURRENT_YEAR}": f"July-September {self.current_year}",
            "{Q1_Q3_CURRENT_YEAR}": f"1st to 3rd quarter of CY {self.current_year}",
            "{DEC_31_CURRENT_YEAR}": f"December 31, {self.current_year}",
            "{DEC_31_PREVIOUS_YEAR}": f"December 31, {self.previous_year}",
            "{CY_CURRENT_YEAR}": f"CY {self.current_year}",
            "{CY_PREVIOUS_YEAR}": f"CY {self.previous_year}",
            "{MARCH_CURRENT_YEAR}": f"March {self.current_year}",
            "{OCT_31_CURRENT_YEAR}": f"October 31, {self.current_year}",
        }

    @classmethod
    def from_database(cls, db: Session) -> "YearPlaceholderResolver":
        """
        Create a resolver using the currently active assessment year from the database.

        Args:
            db: Database session

        Returns:
            YearPlaceholderResolver configured with the active assessment year

        Raises:
            ValueError: If no active assessment year configuration exists
        """
        active_year = db.query(AssessmentYear).filter(AssessmentYear.is_active == True).first()

        if not active_year:
            raise ValueError(
                "No active assessment year found. Please activate an assessment year in the system."
            )

        return cls(active_year.year)

    @classmethod
    def get_current_year(cls, db: Session) -> int:
        """
        Get the current active assessment year from the database.

        Args:
            db: Database session

        Returns:
            The current assessment year (e.g., 2025)

        Raises:
            ValueError: If no active assessment year configuration exists
        """
        active_year = db.query(AssessmentYear).filter(AssessmentYear.is_active == True).first()

        if not active_year:
            raise ValueError(
                "No active assessment year found. Please activate an assessment year in the system."
            )

        return active_year.year

    def resolve_string(self, text: str | None) -> str | None:
        """
        Resolve all year placeholders in a string.

        Args:
            text: String that may contain year placeholders

        Returns:
            String with all placeholders replaced, or None if input was None
        """
        if text is None:
            return None

        result = text
        for placeholder, replacement in self._replacements.items():
            result = result.replace(placeholder, replacement)

        return result

    def resolve_dict(self, data: dict[str, Any] | None) -> dict[str, Any] | None:
        """
        Recursively resolve year placeholders in a dictionary.

        Args:
            data: Dictionary that may contain year placeholders in values

        Returns:
            New dictionary with all placeholders resolved, or None if input was None
        """
        if data is None:
            return None

        return self._resolve_value(copy.deepcopy(data))

    def resolve_list(self, data: list[Any] | None) -> list[Any] | None:
        """
        Recursively resolve year placeholders in a list.

        Args:
            data: List that may contain year placeholders

        Returns:
            New list with all placeholders resolved, or None if input was None
        """
        if data is None:
            return None

        return self._resolve_value(copy.deepcopy(data))

    def resolve_schema(self, schema: dict[str, Any] | None) -> dict[str, Any] | None:
        """
        Resolve all year placeholders in a form/calculation/remark schema.

        This is the primary method for resolving indicator schemas.
        It handles nested structures like form fields, validation rules, etc.

        Args:
            schema: Schema dictionary (form_schema, calculation_schema, remark_schema)

        Returns:
            New schema with all placeholders resolved, or None if input was None
        """
        return self.resolve_dict(schema)

    def resolve_checklist_items(
        self, items: list[dict[str, Any]] | None
    ) -> list[dict[str, Any]] | None:
        """
        Resolve year placeholders in checklist items.

        Handles the label, mov_description, and field_notes fields.

        Args:
            items: List of checklist item dictionaries

        Returns:
            New list with all placeholders resolved, or None if input was None
        """
        if items is None:
            return None

        resolved_items = []
        for item in items:
            resolved_item = copy.deepcopy(item)

            # Resolve string fields
            if "label" in resolved_item:
                resolved_item["label"] = self.resolve_string(resolved_item["label"])
            if "mov_description" in resolved_item:
                resolved_item["mov_description"] = self.resolve_string(
                    resolved_item["mov_description"]
                )
            if "group_name" in resolved_item:
                resolved_item["group_name"] = self.resolve_string(resolved_item["group_name"])

            # Resolve nested field_notes
            if "field_notes" in resolved_item and resolved_item["field_notes"]:
                resolved_item["field_notes"] = self.resolve_dict(resolved_item["field_notes"])

            resolved_items.append(resolved_item)

        return resolved_items

    def _resolve_value(self, value: Any) -> Any:
        """
        Recursively resolve year placeholders in any value type.

        Args:
            value: Any value (string, dict, list, etc.)

        Returns:
            Value with all placeholders resolved
        """
        if isinstance(value, str):
            return self.resolve_string(value)
        elif isinstance(value, dict):
            return {k: self._resolve_value(v) for k, v in value.items()}
        elif isinstance(value, list):
            return [self._resolve_value(item) for item in value]
        else:
            # Numbers, booleans, None, etc. - return as is
            return value

    def has_placeholders(self, text: str | None) -> bool:
        """
        Check if a string contains any year placeholders.

        Args:
            text: String to check

        Returns:
            True if placeholders are found, False otherwise
        """
        if text is None:
            return False

        return bool(self.PLACEHOLDER_PATTERN.search(text))

    def find_placeholders(self, text: str) -> list[str]:
        """
        Find all year placeholders in a string.

        Args:
            text: String to search

        Returns:
            List of placeholder names found (e.g., ["CURRENT_YEAR", "PREVIOUS_YEAR"])
        """
        return self.PLACEHOLDER_PATTERN.findall(text)


def get_year_resolver(db: Session, year: int | None = None) -> YearPlaceholderResolver:
    """
    Factory function to get a YearPlaceholderResolver for a specific assessment year.

    Args:
        db: Database session
        year: Specific year to use. If not provided, uses the active year from database.

    Returns:
        Configured YearPlaceholderResolver

    Raises:
        ValueError: If no active assessment year configuration exists and no year specified
    """
    if year is not None:
        return YearPlaceholderResolver(year)
    return YearPlaceholderResolver.from_database(db)


def resolve_indicator_text(
    db: Session, text: str | None, assessment_year: int | None = None
) -> str | None:
    """
    Convenience function to resolve year placeholders in a single string.

    Args:
        db: Database session
        text: String to resolve
        assessment_year: Optional specific year (uses active config if not provided)

    Returns:
        Resolved string or None
    """
    if text is None:
        return None

    if assessment_year:
        resolver = YearPlaceholderResolver(assessment_year)
    else:
        resolver = get_year_resolver(db)

    return resolver.resolve_string(text)
