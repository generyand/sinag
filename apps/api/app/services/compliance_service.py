"""
Compliance Overview Service

Handles calculation of parent-level compliance based on sub-indicator validation status.

Hybrid Approach:
- Auto-calculate Met/Unmet based on checklist completion
- Use validation_status as override if explicitly set by validator
"""

from loguru import logger
from sqlalchemy.orm import Session, joinedload

from app.db.enums import ValidationStatus
from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.models.governance_area import ChecklistItem, GovernanceArea, Indicator
from app.db.models.user import User
from app.schemas.compliance import (
    ComplianceOverviewResponse,
    GovernanceAreaCompliance,
    ParentIndicatorCompliance,
    SubIndicatorStatus,
)
from app.services.bbi_service import BBI_CONFIG, get_bbi_rating_by_count


class ComplianceService:
    """
    Service for managing compliance overview data.

    Follows the Fat Service pattern - all business logic lives here.
    """

    def __init__(self) -> None:
        self.logger = logger.bind(service="compliance_service")

    def _is_checklist_complete(
        self,
        db: Session,
        indicator: Indicator,
        response: AssessmentResponse | None,
    ) -> tuple[bool, bool]:
        """
        Check if validator's checklist is complete for an indicator.

        Returns:
            tuple: (is_complete, has_any_checked)
            - is_complete: True if checklist requirements are satisfied
            - has_any_checked: True if any checklist item has been checked/filled

        Validation Rules:
        - ANY_OPTION_GROUP_REQUIRED: Complete ALL items in at least ONE option group
          (Items within a group = AND, Groups = OR)
          Example: (Resolution AND ABYIP) OR (Certification)
        - ANY_ITEM_REQUIRED: At least one checkbox checked = complete
        - ALL_ITEMS_REQUIRED: All required items must be completed
        """
        if not response or not response.response_data:
            return False, False

        response_data = response.response_data or {}

        # Find all validator checklist items with meaningful values
        # Key format: validator_val_{item_id} (e.g., validator_val_1_2_1_a)
        # Include:
        # - Checkboxes: v is True
        # - Input fields: v is non-empty string
        def has_value(v: any) -> bool:
            if v is True:
                return True
            if isinstance(v, str) and v.strip():
                return True
            if isinstance(v, (int, float)) and v != 0:
                return True
            return False

        def normalize_item_id(raw: str) -> str:
            """
            Normalizes validator checkbox keys:
            - validator_val_2_3_2_a_yes -> 2_3_2_a
            - validator_val_2_3_2_a_no  -> 2_3_2_a
            - validator_val_1_2_1_a     -> 1_2_1_a
            """
            if raw.endswith("_yes") or raw.endswith("_no"):
                return raw.rsplit("_", 1)[0]
            return raw

        # Keys with any meaningful value (for has_any_checked)
        completed_keys_raw = [
            k for k, v in response_data.items() if k.startswith("validator_val_") and has_value(v)
        ]

        # Keys where the checkbox/value is True (used for checkbox-only checks)
        true_keys_raw = [
            k for k, v in response_data.items() if k.startswith("validator_val_") and v is True
        ]

        # Keys with meaningful values (including numbers/strings) to satisfy required fields
        completed_keys_normalized = {
            normalize_item_id(k.replace("validator_val_", ""))
            for k in completed_keys_raw
            if not k.endswith("_no")  # explicit No should not count as completed
        }

        has_any_checked = len(true_keys_raw) > 0 or len(completed_keys_raw) > 0

        if not has_any_checked:
            self.logger.debug(
                f"No checked items for indicator {indicator.indicator_code}. "
                f"Response data keys: {[k for k in response_data.keys() if k.startswith('validator_val_')]}"
            )
            return False, False

        self.logger.debug(
            f"Indicator {indicator.indicator_code}: completed_keys={completed_keys_raw}"
        )

        # Get checklist items from mov_checklist_items JSON or ChecklistItem table
        checklist_items_data = []

        # First try mov_checklist_items JSON field
        if indicator.mov_checklist_items:
            checklist_items_data = [
                item
                for item in indicator.mov_checklist_items
                if item.get("item_type") == "checkbox"
            ]

        # If no JSON items, try ChecklistItem table
        if not checklist_items_data:
            db_items = (
                db.query(ChecklistItem)
                .filter(
                    ChecklistItem.indicator_id == indicator.id,
                    ChecklistItem.item_type == "checkbox",
                )
                .all()
            )
            checklist_items_data = [
                {
                    "item_id": item.item_id,
                    "required": item.required,
                    "option_group": item.option_group,
                }
                for item in db_items
            ]

        # If still no checklist definition, assume complete if any item checked
        if not checklist_items_data:
            return True, True

        validation_rule = indicator.validation_rule or "ALL_ITEMS_REQUIRED"

        if validation_rule == "ANY_OPTION_GROUP_REQUIRED":
            # OR logic with option groups: at least one COMPLETE option group
            # Items in the same option_group must ALL be completed for that group to count
            option_groups: dict[str, list[str]] = {}
            items_without_group: list[str] = []

            for item in checklist_items_data:
                item_id = item.get("item_id")
                option_group = item.get("option_group")

                # If no explicit option_group, try to infer from item_id pattern
                # e.g., "1_6_2_5above_a" -> group "5above", "1_6_2_4below_cert" -> group "4below"
                if not option_group and item_id:
                    parts = item_id.split("_")
                    # Look for pattern like X_Y_Z_GROUP_suffix where GROUP contains letters
                    if len(parts) >= 4:
                        # Check if the 4th part (index 3) looks like a group identifier
                        potential_group = parts[3]
                        # Group identifiers typically have letters (like "5above", "4below", "opt1")
                        if any(c.isalpha() for c in potential_group):
                            option_group = potential_group

                if option_group:
                    if option_group not in option_groups:
                        option_groups[option_group] = []
                    option_groups[option_group].append(item_id)
                else:
                    items_without_group.append(item_id)

            completed_item_ids = completed_keys_normalized

            # Check if any option group is fully completed
            any_group_complete = False
            for group_name, group_items in option_groups.items():
                group_item_set = set(group_items)
                if group_item_set.issubset(completed_item_ids):
                    any_group_complete = True
                    self.logger.debug(
                        f"Indicator {indicator.indicator_code}: Option group '{group_name}' is complete"
                    )
                    break

            # Also check standalone items (items without option_group)
            standalone_complete = any(
                item_id in completed_item_ids for item_id in items_without_group
            )

            is_complete = any_group_complete or standalone_complete
            self.logger.debug(
                f"Indicator {indicator.indicator_code}: option_groups={option_groups}, "
                f"completed={completed_item_ids}, any_group_complete={any_group_complete}"
            )
        elif validation_rule == "ANY_ITEM_REQUIRED":
            # Simple OR logic: at least one checkbox checked = complete
            is_complete = has_any_checked
        else:
            # ALL_ITEMS_REQUIRED: all required checkboxes must be checked
            required_items = [item for item in checklist_items_data if item.get("required", True)]
            if not required_items:
                is_complete = has_any_checked
            else:
                # Check if all required items are in the completed keys
                # Key format: validator_val_{item_id} → extract item_id
                required_item_ids = {item.get("item_id") for item in required_items}
                completed_item_ids = completed_keys_normalized
                is_complete = required_item_ids.issubset(completed_item_ids)
                self.logger.debug(
                    f"Indicator {indicator.indicator_code}: required={required_item_ids}, "
                    f"completed={completed_item_ids}, is_complete={is_complete}"
                )

        self.logger.debug(
            f"Indicator {indicator.indicator_code}: validation_rule={validation_rule}, "
            f"is_complete={is_complete}, has_any_checked={has_any_checked}, "
            f"required_items={len([i for i in checklist_items_data if i.get('required', True)])}"
        )
        return is_complete, has_any_checked

    def get_compliance_overview(
        self,
        db: Session,
        assessment_id: int,
        validator: User | None = None,
    ) -> ComplianceOverviewResponse:
        """
        Get compliance overview for an assessment.

        Returns parent indicators (2-level) grouped by governance area,
        with sub-indicator (3-level) validation status summaries.

        Args:
            db: Database session
            assessment_id: ID of the assessment
            validator: Optional validator user (to filter by governance area)

        Returns:
            ComplianceOverviewResponse with all compliance data
        """
        # Get assessment with responses
        assessment = (
            db.query(Assessment)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                joinedload(Assessment.responses).joinedload(AssessmentResponse.indicator),
            )
            .filter(Assessment.id == assessment_id)
            .first()
        )

        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        # Build a map of indicator_id -> response for quick lookup
        response_map: dict[int, AssessmentResponse] = {
            r.indicator_id: r for r in assessment.responses
        }

        # Get all governance areas
        governance_areas_query = db.query(GovernanceArea).order_by(GovernanceArea.id)

        # If validator is provided, filter to their assigned area
        if validator and validator.validator_area_id:
            governance_areas_query = governance_areas_query.filter(
                GovernanceArea.id == validator.validator_area_id
            )

        governance_areas = governance_areas_query.all()

        # Build compliance data for each governance area
        governance_areas_data: list[GovernanceAreaCompliance] = []
        all_sub_indicators_validated = True

        for ga in governance_areas:
            # Get parent indicators (2-level) for this governance area
            parent_indicators = (
                db.query(Indicator)
                .filter(
                    Indicator.governance_area_id == ga.id,
                    Indicator.parent_id == None,  # noqa: E711 - Only root/parent indicators
                    Indicator.is_active == True,  # noqa: E712
                )
                .options(joinedload(Indicator.children))
                .order_by(Indicator.sort_order, Indicator.indicator_code)
                .all()
            )

            if not parent_indicators:
                continue

            indicators_data: list[ParentIndicatorCompliance] = []

            for parent in parent_indicators:
                # Get sub-indicators and their validation status
                sub_indicators_data: list[SubIndicatorStatus] = []
                passed_count = 0
                failed_count = 0
                pending_count = 0

                # Sort children by sort_order and indicator_code
                sorted_children = sorted(
                    parent.children,
                    key=lambda x: (x.sort_order or 0, x.indicator_code or ""),
                )

                for child in sorted_children:
                    if not child.is_active:
                        continue

                    # Find the assessment response for this sub-indicator
                    response = response_map.get(child.id)

                    # Two-step approach:
                    # 1. validation_status = actual confirmed status from database (validator clicked)
                    # 2. recommended_status = auto-calculated suggestion based on checklist (glow)
                    validation_status = None
                    recommended_status = None
                    has_checklist_data = False

                    # Get actual confirmed status from database
                    if response and response.validation_status is not None:
                        validation_status = response.validation_status.value
                        if response.validation_status == ValidationStatus.PASS:
                            passed_count += 1
                        elif response.validation_status == ValidationStatus.FAIL:
                            failed_count += 1
                        else:
                            # CONDITIONAL counts as pending for compliance
                            pending_count += 1
                    else:
                        # Not yet confirmed - counts as pending
                        pending_count += 1

                    # Calculate recommended status from checklist (for glowing button)
                    is_complete, has_any_checked = self._is_checklist_complete(db, child, response)
                    has_checklist_data = has_any_checked

                    # Always suggest a status if not confirmed yet:
                    # - Checklist complete → suggest PASS (Met)
                    # - Checklist incomplete or no data → suggest FAIL (Unmet)
                    if is_complete:
                        recommended_status = "PASS"
                    else:
                        # No checklist data OR incomplete = suggest Unmet
                        recommended_status = "FAIL"

                    sub_indicators_data.append(
                        SubIndicatorStatus(
                            indicator_id=child.id,
                            indicator_code=child.indicator_code or "",
                            name=child.name or "",
                            response_id=response.id if response else None,
                            validation_status=validation_status,
                            recommended_status=recommended_status,
                            has_checklist_data=has_checklist_data,
                        )
                    )

                # Calculate compliance status
                total = len(sub_indicators_data)
                all_validated = pending_count == 0 and total > 0

                if not all_validated:
                    all_sub_indicators_validated = False

                indicator_data = ParentIndicatorCompliance(
                    indicator_id=parent.id,
                    indicator_code=parent.indicator_code or "",
                    name=parent.name or "",
                    is_bbi=parent.is_bbi,
                    sub_indicators_total=total,
                    sub_indicators_passed=passed_count,
                    sub_indicators_failed=failed_count,
                    sub_indicators_pending=pending_count,
                    all_validated=all_validated,
                    sub_indicators=sub_indicators_data,
                    bbi_functionality_level=None,
                    bbi_abbreviation=None,
                    compliance_status=None,
                )

                if parent.is_bbi:
                    # BBI: Use count-based thresholds
                    bbi_config = BBI_CONFIG.get(parent.indicator_code or "", {})
                    indicator_data.bbi_abbreviation = bbi_config.get(
                        "abbreviation", parent.indicator_code
                    )

                    if all_validated:
                        bbi_status = get_bbi_rating_by_count(
                            parent.indicator_code or "", passed_count
                        )
                        indicator_data.bbi_functionality_level = bbi_status.value
                else:
                    # Non-BBI: MET only if ALL sub-indicators PASS
                    if all_validated:
                        indicator_data.compliance_status = "MET" if failed_count == 0 else "UNMET"

                indicators_data.append(indicator_data)

            if indicators_data:
                governance_areas_data.append(
                    GovernanceAreaCompliance(
                        governance_area_id=ga.id,
                        governance_area_name=ga.name,
                        governance_area_code=ga.code,
                        indicators=indicators_data,
                    )
                )

        # Get barangay name
        barangay_name = ""
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        return ComplianceOverviewResponse(
            assessment_id=assessment_id,
            barangay_name=barangay_name,
            assessment_year=assessment.assessment_year,
            assessment_status=assessment.status.value if assessment.status else "",
            all_sub_indicators_validated=all_sub_indicators_validated,
            governance_areas=governance_areas_data,
        )


# Singleton instance
compliance_service = ComplianceService()
