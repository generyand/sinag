"""
Hard-coded SGLGB Indicator Definitions.

This module exports all 29 SGLGB indicators defined as Python dataclasses.
Each indicator is defined in its own file for maintainability.
"""

from app.indicators.definitions.indicator_1_1 import INDICATOR_1_1
from app.indicators.definitions.indicator_1_2 import INDICATOR_1_2
from app.indicators.definitions.indicator_1_3 import INDICATOR_1_3
from app.indicators.definitions.indicator_1_4 import INDICATOR_1_4
from app.indicators.definitions.indicator_1_5 import INDICATOR_1_5
from app.indicators.definitions.indicator_1_6 import INDICATOR_1_6
from app.indicators.definitions.indicator_1_7 import INDICATOR_1_7
from app.indicators.definitions.indicator_2_1 import INDICATOR_2_1
from app.indicators.definitions.indicator_2_2 import INDICATOR_2_2
from app.indicators.definitions.indicator_2_3 import INDICATOR_2_3
from app.indicators.definitions.indicator_3_1 import INDICATOR_3_1
from app.indicators.definitions.indicator_3_2 import INDICATOR_3_2
from app.indicators.definitions.indicator_3_3 import INDICATOR_3_3
from app.indicators.definitions.indicator_3_4 import INDICATOR_3_4
from app.indicators.definitions.indicator_3_5 import INDICATOR_3_5
from app.indicators.definitions.indicator_3_6 import INDICATOR_3_6
from app.indicators.definitions.indicator_4_1 import INDICATOR_4_1
from app.indicators.definitions.indicator_4_2 import INDICATOR_4_2
from app.indicators.definitions.indicator_4_3 import INDICATOR_4_3
from app.indicators.definitions.indicator_4_4 import INDICATOR_4_4
from app.indicators.definitions.indicator_4_5 import INDICATOR_4_5
from app.indicators.definitions.indicator_4_6 import INDICATOR_4_6
from app.indicators.definitions.indicator_4_7 import INDICATOR_4_7
from app.indicators.definitions.indicator_4_8 import INDICATOR_4_8
from app.indicators.definitions.indicator_4_9 import INDICATOR_4_9
from app.indicators.definitions.indicator_5_1 import INDICATOR_5_1
from app.indicators.definitions.indicator_5_2 import INDICATOR_5_2
from app.indicators.definitions.indicator_5_3 import INDICATOR_5_3
from app.indicators.definitions.indicator_6_1 import INDICATOR_6_1
from app.indicators.definitions.indicator_6_2 import INDICATOR_6_2
from app.indicators.definitions.indicator_6_3 import INDICATOR_6_3

# Export all indicators as a list
ALL_INDICATORS = [
    INDICATOR_1_1,
    INDICATOR_1_2,
    INDICATOR_1_3,
    INDICATOR_1_4,
    INDICATOR_1_5,
    INDICATOR_1_6,
    INDICATOR_1_7,
    INDICATOR_2_1,
    INDICATOR_2_2,
    INDICATOR_2_3,
    INDICATOR_3_1,
    INDICATOR_3_2,
    INDICATOR_3_3,
    INDICATOR_3_4,
    INDICATOR_3_5,
    INDICATOR_3_6,
    INDICATOR_4_1,
    INDICATOR_4_2,
    INDICATOR_4_3,
    INDICATOR_4_4,
    INDICATOR_4_5,
    INDICATOR_4_6,
    INDICATOR_4_7,
    INDICATOR_4_8,
    INDICATOR_4_9,
    INDICATOR_5_1,
    INDICATOR_5_2,
    INDICATOR_5_3,
    INDICATOR_6_1,
    INDICATOR_6_2,
    INDICATOR_6_3,
    # All 29 SGLGB indicators completed!
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
