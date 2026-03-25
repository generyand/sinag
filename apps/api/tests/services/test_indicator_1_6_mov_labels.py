from app.core.year_resolver import YearPlaceholderResolver
from app.indicators.definitions.indicator_1_6 import INDICATOR_1_6
from app.indicators.seeder import _generate_form_schema_from_checklist

EXPECTED_OPTION3_MOV_LABELS = [
    "Proof of transfer of the 10% 2023 SK funds to the trust fund of the Barangay such as Deposit Slip or Official Receipt;",
    (
        "Proof of transfer or corresponding legal forms/documents issued by the "
        "city/municipal treasurer if the barangay opted that the corresponding SK "
        "fund be kept as trust fund in the custody of the C/M treasurer."
    ),
]


def test_indicator_1_6_option3_upload_labels_match_sng_14_copy():
    """SNG-14: Option 3 upload labels must match the approved MOV wording exactly."""
    indicator_1_6_1 = INDICATOR_1_6.children[0]
    schema = _generate_form_schema_from_checklist(
        indicator_1_6_1.checklist_items,
        indicator_1_6_1.upload_instructions,
        indicator_1_6_1.validation_rule,
        indicator_1_6_1.notes,
    )
    resolved_schema = YearPlaceholderResolver(2023).resolve_schema(schema)

    option3_upload_fields = [
        field
        for field in resolved_schema["fields"]
        if field.get("field_type") == "file_upload" and field.get("option_group") == "Option 3"
    ]

    assert [field["label"] for field in option3_upload_fields] == EXPECTED_OPTION3_MOV_LABELS
    assert [field["description"] for field in option3_upload_fields] == EXPECTED_OPTION3_MOV_LABELS
