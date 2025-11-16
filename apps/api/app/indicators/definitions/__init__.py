"""
Hard-coded SGLGB Indicator Definitions.

This module exports all 29 SGLGB indicators defined as Python dataclasses.
Each indicator is defined in its own file for maintainability.
"""

from app.indicators.definitions.indicator_1_1 import INDICATOR_1_1

# Export all indicators as a list
ALL_INDICATORS = [
    INDICATOR_1_1,
    # TODO: Add remaining 28 indicators (1.2 - 6.X)
]

# Export indicators as a dictionary by code for easy lookup
INDICATORS_BY_CODE = {indicator.code: indicator for indicator in ALL_INDICATORS}


def get_indicator_definition(code: str):
    """
    Get indicator definition by code.

    Args:
        code: Indicator code (e.g., "1.1", "2.3")

    Returns:
        Indicator definition or None if not found
    """
    return INDICATORS_BY_CODE.get(code)
