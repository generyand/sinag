import re


def clean_checklist_label(label: str, indicator_code: str = None) -> str:
    """
    Clean and format checklist item labels.
    Removes prefixes like "a)", "b)" for specific indicators.
    Transform labels for GAR/BBI display.
    """
    if not label:
        return ""

    # Clean up trailing semicolons and connectors
    cleaned_label = re.sub(r"[;,]\s*(and|or|and/or)?\s*$", "", label, flags=re.IGNORECASE).strip()

    # Specific label mappings for numbered checklist items
    numbered_label_map = {
        "4.1.7.1": "The barangay has a referral system flow chart",
        "4.1.7.2": "The barangay has a directory of agencies/individuals providing services to victim-survivors",
    }

    for prefix, mapped_label in numbered_label_map.items():
        if cleaned_label.startswith(prefix):
            return mapped_label

    if indicator_code == "4.2.2":
        label_lower = cleaned_label.lower()
        if "accredited barangay health worker" in label_lower:
            return "Has accredited Barangay Health Worker"
        if "barangay health officer" in label_lower:
            return "Has Barangay Health Officer/Barangay Health Assistant"

    if indicator_code == "4.5.5":
        label_lower = cleaned_label.lower()
        if "localized flow chart" in label_lower:
            return "Has an updated localized flow chart of referral system not earlier than 2020"
        if "comprehensive barangay juvenile" in label_lower:
            return "Has a Comprehensive Barangay Juvenile Intervention Program"
        if "children at risk" in label_lower or "cicl" in label_lower:
            return (
                "Has a Children at Risk (CAR) and Children in Conflict with the Law (CICL) Registry"
            )

    if indicator_code == "4.7.1":
        label_lower = cleaned_label.lower()
        if "rbi monitoring form" in label_lower:
            return "Has submitted RBI monitoring form C"
        if "list of barangays with rbi" in label_lower:
            return "Has an updated RBI in the BIS-BPS"

    if indicator_code == "4.8.3":
        label_lower = cleaned_label.lower()
        if "underweight" in label_lower:
            return "Decrease in prevalence rate for underweight and severe underweight"
        if "stunting" in label_lower:
            return "Decrease in prevalence rate for stunting and severe stunting"
        if "wasting" in label_lower:
            return "Decrease in prevalence rate for moderate wasting and severe wasting"

    # Indicators that use Physical/Financial Report labeling
    report_indicators = {"2.1.4", "3.2.3", "4.1.6", "4.3.4", "4.5.6", "4.8.4", "6.1.4"}

    if indicator_code == "1.6.1":
        # Remove a) and b) prefixes for 1.6.1
        return re.sub(r"^[a-z][\.\)]\s*", "", cleaned_label).strip()

    if indicator_code in report_indicators:
        label_lower = cleaned_label.strip().lower()
        if re.match(r"^a[\.\)\s]|^a$", label_lower):
            return "Physical Report"
        if re.match(r"^b[\.\)\s]|^b$", label_lower):
            return "Financial Report"

    return cleaned_label


def is_minimum_requirement(label: str, item_type: str, indicator_code: str = None) -> bool:
    """
    Filter to determine if a checklist item is a minimum requirement (for GAR/BBI).
    """
    if item_type == "info_text":
        return False

    # Indicators that should NOT show checklist items (only validation status)
    # 1.6.1 - Has 3 option groups, only validation status matters
    # 4.3.3 - Similar case
    if indicator_code in {"1.6.1", "4.3.3"}:
        return False

    lower_label = label.lower()

    # Exclude patterns (MOV methods, data entry fields)
    exclude_patterns = [
        "photo documentation",
        "were submitted",
        "was submitted",
        "signed by",
        "signed and stamped",
        "advisory covering",
        "received stamp",
        "annex b",
        "annex a",
        "total amount obtained",
        "date of approval",
        "sre for",
        "certification on",
        "certification for",
        "approved barangay appropriation ordinance",
        "annual investment program signed",
        "utilization report",
        "accomplishment report",
        "post-activity report",
        "monthly accomplishment",
    ]

    for pattern in exclude_patterns:
        if pattern in lower_label:
            return False

    # Include patterns (Minimum requirements)
    include_patterns = [
        r"^[a-z]\.\s",
        r"^[a-z]\)\s",
        r"^\d+\s+[a-z]",
        r"^barangay\s",
        r"^summary\s",
        r"^annual\s",
        r"^list\s+of",
        r"^itemized",
        r"^\d+%\s+component",
        r"^at\s+least\s+\d+%",
        r"^not\s+less\s+than",
        r"^gender\s+and\s+development",
        r"^senior\s+citizens",
        r"^persons\s+with\s+disabilities",
        r"^\d+%\s+from\s+general",
        r"^implementation\s+of",
        r"^ten\s+percent",
        r"physical\s+accomplishment",
        r"financial\s+accomplishment",
        r"^•\s*established\s+mrf",
        r"^•\s*mrs",
        r"^•\s*clustered\s+mrf",
        r"^\d+\.\d+\.\d+\.\d+\.",
        r"^accredited\s+barangay",
        r"^barangay\s+health\s+officer",
        r"^updated\s+localized\s+flow\s+chart",
        r"^copy\s+of\s+comprehensive\s+barangay\s+juvenile",
        r"^copy\s+of\s+juvenile\s+justice",
        r"^rbi\s+monitoring\s+form",
        r"^list\s+of\s+barangays\s+with\s+rbi",
        r"^\d+\.\s+with\s+decrease\s+in\s+prevalence",
    ]

    for pattern in include_patterns:
        if re.search(pattern, label, re.IGNORECASE):
            return True

    return False


def filter_checklist_options(checklist_items: list, indicator_code: str) -> list:
    """
    Filter checklist items based on met options.
    Specifically for 1.6.1 and 1.6.2 to show only the active/met option group.

    Args:
        checklist_items: List of objects with 'group_name' and 'validation_result' attributes.
    """
    if indicator_code != "1.6.1":
        return checklist_items

    # Group items
    groups = {}
    for item in checklist_items:
        # accessing attributes or dictionary keys depending on object type
        group = (
            getattr(item, "group_name", None)
            or (item.get("group_name") if isinstance(item, dict) else "default")
            or "default"
        )
        if group not in groups:
            groups[group] = []
        groups[group].append(item)

    # Determine met group
    met_group = None

    # Option 1: All met
    if "Option 1" in groups:
        items = groups["Option 1"]
        if all(_is_item_met(i) for i in items):
            met_group = "Option 1"

    # Option 2: All met (only 1 item usually)
    if not met_group and "Option 2" in groups:
        items = groups["Option 2"]
        if all(_is_item_met(i) for i in items):
            met_group = "Option 2"

    # Option 3: Any met
    if not met_group and "Option 3" in groups:
        items = groups["Option 3"]
        if any(_is_item_met(i) for i in items):
            met_group = "Option 3"

    if met_group:
        return groups[met_group]

    return checklist_items


def _is_item_met(item) -> bool:
    val = getattr(item, "validation_result", None) or (
        item.get("validation_result") if isinstance(item, dict) else None
    )
    return val == "met"


def get_checklist_validation_result(item, response) -> str | None:
    """
    Get validation result for a checklist item from response data.

    Priority: validator_val_{item_id} (final decision) > assessor_val_{item_id} (initial)
    This ensures validator overrides are respected in BBI calculations.

    Returns: 'met', 'considered', 'unmet', or None
    """
    if not response or not response.response_data:
        return None

    response_data = response.response_data
    item_id = item.item_id

    # Skip info_text items
    if item.item_type == "info_text":
        return None

    # Priority: Use validator data (final decision), fallback to assessor data
    for prefix in ["validator_val_", "assessor_val_"]:
        val_key = f"{prefix}{item_id}"

        # Check standard checkbox validation
        if val_key in response_data:
            value = response_data[val_key]
            if isinstance(value, bool):
                return "met" if value else "unmet"
            if isinstance(value, str):
                return "met" if value.lower() in ["true", "yes", "1"] else "unmet"

        # Check yes/no pattern (assessment_field type)
        yes_key = f"{val_key}_yes"
        no_key = f"{val_key}_no"

        if yes_key in response_data or no_key in response_data:
            if response_data.get(yes_key):
                return "met"
            elif response_data.get(no_key):
                return "unmet"

        # Check for document_count or calculation_field
        if item.item_type in ["document_count", "calculation_field"]:
            if val_key in response_data and response_data[val_key]:
                return "met"

        # If we found validator data, use it (don't fallback to assessor)
        if prefix == "validator_val_" and any(
            k.startswith(f"validator_val_{item_id}") for k in response_data.keys()
        ):
            break

    return None


# Indicators that use Physical/Financial OR-logic
PHYSICAL_FINANCIAL_INDICATORS = {"2.1.4", "3.2.3", "4.1.6", "4.3.4", "4.5.6", "4.8.4", "6.1.4"}


def calculate_indicator_status_from_checklist(
    checklist_items: list,
    indicator_code: str,
    validation_rule: str,
) -> str | None:
    """
    Calculate validation status for an indicator based on its checklist items.

    This ensures correct status based on actual checklist validation results.

    Validation Rules:
    - ALL_ITEMS_REQUIRED: All items must be "met" → PASS. Any "unmet" or all gray → FAIL
    - ANY_ITEM_REQUIRED / OR_LOGIC_AT_LEAST_1_REQUIRED: At least one "met" → PASS
    - Physical/Financial indicators: At least one of Physical/Financial must be "met"

    Returns:
        "PASS", "FAIL", or None (if no checklist items)
    """
    if not checklist_items:
        return None

    # Physical/Financial indicators (special OR logic)
    if indicator_code in PHYSICAL_FINANCIAL_INDICATORS:
        return calculate_physical_financial_status(checklist_items)

    # Collect validation results
    met_count = 0
    unmet_count = 0
    no_data_count = 0

    for item in checklist_items:
        val_result = getattr(item, "validation_result", None) or (
            item.get("validation_result") if isinstance(item, dict) else None
        )
        if val_result == "met":
            met_count += 1
        elif val_result == "unmet":
            unmet_count += 1
        else:
            no_data_count += 1

    total_items = len(checklist_items)

    # Apply validation rule logic
    if validation_rule in ("ANY_ITEM_REQUIRED", "OR_LOGIC_AT_LEAST_1_REQUIRED"):
        # OR logic: at least one item must be met
        if met_count >= 1:
            return "PASS"
        else:
            return "FAIL"

    elif validation_rule == "ALL_ITEMS_REQUIRED":
        # AND logic: all items must be met
        if met_count == total_items:
            return "PASS"
        elif unmet_count > 0:
            return "FAIL"
        else:
            # All gray (no data) = FAIL
            return "FAIL"

    elif validation_rule == "SHARED_PLUS_OR_LOGIC":
        # Complex: at least one met = PASS
        if met_count >= 1:
            return "PASS"
        else:
            return "FAIL"

    else:
        # Default: ALL_ITEMS_REQUIRED behavior
        if met_count == total_items:
            return "PASS"
        elif unmet_count > 0 or no_data_count > 0:
            return "FAIL"
        else:
            return None


def calculate_physical_financial_status(checklist_items: list) -> str:
    """
    Calculate validation status for Physical/Financial OR-logic indicators.

    These indicators pass if at least ONE of Physical Report or Financial Report is met.

    Args:
        checklist_items: List of checklist items with 'label' and 'validation_result'

    Returns:
        "PASS" if at least one report is met
        "FAIL" if neither report is met
    """
    physical_met = False
    financial_met = False

    for item in checklist_items:
        label = getattr(item, "label", None) or (
            item.get("label") if isinstance(item, dict) else None
        )
        val_result = getattr(item, "validation_result", None) or (
            item.get("validation_result") if isinstance(item, dict) else None
        )

        if label == "Physical Report" and val_result == "met":
            physical_met = True
        elif label == "Financial Report" and val_result == "met":
            financial_met = True

    # OR logic: at least one must be met
    if physical_met or financial_met:
        return "PASS"
    else:
        return "FAIL"


def calculate_governance_area_result(indicator_statuses: list[str | None]) -> str:
    """
    Calculate governance area result from indicator validation statuses.

    A governance area passes if ALL leaf indicators have PASS or CONDITIONAL status.
    If ANY indicator has FAIL status, the area fails.

    Args:
        indicator_statuses: List of validation statuses ("PASS", "FAIL", "CONDITIONAL", or None)

    Returns:
        "Passed" or "Failed"
    """
    if not indicator_statuses:
        return "Failed"

    # Check for any FAIL status
    has_any_fail = any(status == "FAIL" for status in indicator_statuses if status)

    if has_any_fail:
        return "Failed"

    # Check if all have PASS or CONDITIONAL (and not None)
    all_passed = all(
        status in ("PASS", "CONDITIONAL") for status in indicator_statuses if status is not None
    )

    # Also check that we have at least some non-None statuses
    has_any_status = any(status is not None for status in indicator_statuses)

    if all_passed and has_any_status:
        return "Passed"
    else:
        return "Failed"
