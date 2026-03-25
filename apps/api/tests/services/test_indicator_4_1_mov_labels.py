from app.core.year_resolver import YearPlaceholderResolver
from app.indicators.definitions.indicator_4_1 import INDICATOR_4_1
from app.indicators.seeder import _generate_form_schema_from_checklist


def test_indicator_4_1_mov_name_matches_sng_16_copy():
    """SNG-16: 4.1.4 upload label must match the approved MOV name."""
    indicator_4_1_4 = INDICATOR_4_1.children[3]
    schema = _generate_form_schema_from_checklist(
        indicator_4_1_4.checklist_items,
        indicator_4_1_4.upload_instructions,
        indicator_4_1_4.validation_rule,
        indicator_4_1_4.notes,
    )
    resolved_schema = YearPlaceholderResolver(2025).resolve_schema(schema)

    upload_field = next(
        field for field in resolved_schema["fields"] if field.get("field_type") == "file_upload"
    )

    expected_label = (
        "Accomplishment Report covering 1st to 3rd quarter of CY 2025 with received stamp "
        "by the C/MSWDO and C/MLGOO"
    )
    assert upload_field["label"] == expected_label
