from app.core.year_resolver import YearPlaceholderResolver
from app.indicators.definitions.indicator_2_1 import INDICATOR_2_1
from app.indicators.seeder import _generate_form_schema_from_checklist


def test_indicator_2_1_option_b_uses_current_year_in_upload_header():
    """SNG-15: 2.1.4 Option B description must resolve to the active current year."""
    indicator_2_1_4 = INDICATOR_2_1.children[3]
    schema = _generate_form_schema_from_checklist(
        indicator_2_1_4.checklist_items,
        indicator_2_1_4.upload_instructions,
        indicator_2_1_4.validation_rule,
        indicator_2_1_4.notes,
    )
    resolved_schema = YearPlaceholderResolver(2025).resolve_schema(schema)

    option_b_header = next(
        field
        for field in resolved_schema["fields"]
        if field.get("field_type") == "section_header" and "OPTION B - FINANCIAL" in field["label"]
    )

    assert (
        option_b_header["label"]
        == "OPTION B - FINANCIAL: At least 50% fund utilization of the 70% component of CY 2025 "
        "BDRRMF - Preparedness component as of December 31, 2025"
    )
