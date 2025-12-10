# GAR (Governance Assessment Report) Service
# Business logic for generating GAR data from assessments

import logging
import re
from datetime import datetime

from sqlalchemy.orm import Session, joinedload

from app.db.enums import AssessmentStatus
from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.models.governance_area import ChecklistItem, GovernanceArea, Indicator
from app.db.models.user import User
from app.schemas.gar import (
    GARAssessmentListItem,
    GARAssessmentListResponse,
    GARChecklistItem,
    GARGovernanceArea,
    GARIndicator,
    GARResponse,
    GARSummaryItem,
)
from app.services.bbi_service import bbi_service


class GARService:
    """Service for generating Governance Assessment Reports."""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def get_completed_assessments(
        self, db: Session, assessment_year: int | None = None
    ) -> GARAssessmentListResponse:
        """
        Get list of completed assessments available for GAR generation.

        Args:
            db: Database session
            assessment_year: Filter by assessment year (e.g., 2024, 2025).
                            Defaults to active year if not provided.

        Returns assessments with status COMPLETED or AWAITING_FINAL_VALIDATION
        (for preview purposes).
        """
        # Resolve assessment year if not provided
        if assessment_year is None:
            from app.services.assessment_year_service import assessment_year_service

            assessment_year = assessment_year_service.get_active_year_number(db)

        assessments = (
            db.query(Assessment)
            .join(User, Assessment.blgu_user_id == User.id)
            .options(joinedload(Assessment.blgu_user).joinedload(User.barangay))
            .filter(
                Assessment.status.in_(
                    [
                        AssessmentStatus.COMPLETED,
                        AssessmentStatus.AWAITING_FINAL_VALIDATION,
                    ]
                ),
                Assessment.assessment_year == assessment_year,
            )
            .order_by(
                Assessment.validated_at.desc().nullslast(),
                Assessment.submitted_at.desc(),
            )
            .all()
        )

        items = []
        for a in assessments:
            barangay_name = "Unknown"
            if a.blgu_user and a.blgu_user.barangay:
                barangay_name = a.blgu_user.barangay.name

            items.append(
                GARAssessmentListItem(
                    assessment_id=a.id,
                    barangay_name=barangay_name,
                    status=a.status.value,
                    submitted_at=a.submitted_at,
                    validated_at=a.validated_at,
                )
            )

        return GARAssessmentListResponse(assessments=items, total=len(items))

    def get_gar_data(
        self,
        db: Session,
        assessment_id: int,
        governance_area_id: int | None = None,
    ) -> GARResponse:
        """
        Generate GAR data for a specific assessment.

        Args:
            db: Database session
            assessment_id: ID of the assessment
            governance_area_id: Optional filter for specific governance area (1 = Financial Admin)

        Returns:
            GARResponse with full GAR data
        """
        # Get assessment with related data
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

        # Get barangay info
        barangay_name = "Unknown"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        # Get governance areas (filter if specified)
        areas_query = db.query(GovernanceArea).order_by(GovernanceArea.id)
        if governance_area_id:
            areas_query = areas_query.filter(GovernanceArea.id == governance_area_id)
        governance_areas = areas_query.all()

        # Build response data for each governance area
        gar_areas = []
        summary = []

        for area in governance_areas:
            gar_area = self._build_governance_area_data(db, assessment, area)
            gar_areas.append(gar_area)

            # Add to summary
            summary.append(
                GARSummaryItem(
                    area_name=area.name,
                    area_type=area.area_type or "Core",
                    result=gar_area.overall_result,
                )
            )

        # Determine cycle year from assessment or use default
        cycle_year = "CY 2025 SGLGB (PY 2024)"

        # Get BBI compliance data (DILG MC 2024-417)
        bbi_compliance = None
        try:
            bbi_compliance = bbi_service.get_assessment_bbi_compliance(
                db=db,
                assessment_id=assessment_id,
            )
        except Exception as e:
            self.logger.warning(
                f"Failed to get BBI compliance data for assessment {assessment_id}: {e}"
            )

        return GARResponse(
            assessment_id=assessment.id,
            barangay_name=barangay_name,
            municipality="Sulop",
            province="Davao del Sur",
            cycle_year=cycle_year,
            governance_areas=gar_areas,
            summary=summary,
            bbi_compliance=bbi_compliance,
            generated_at=datetime.utcnow(),
        )

    def _build_governance_area_data(
        self,
        db: Session,
        assessment: Assessment,
        area: GovernanceArea,
    ) -> GARGovernanceArea:
        """Build GAR data for a single governance area."""

        # Get all indicators for this area (including sub-indicators)
        all_indicators = db.query(Indicator).filter(Indicator.governance_area_id == area.id).all()

        # Sort indicators by hierarchical code (e.g., 1.1 < 1.1.1 < 1.1.2 < 1.2)
        all_indicators = sorted(
            all_indicators,
            key=lambda i: self._sort_key_for_indicator_code(i.indicator_code),
        )

        # Filter out depth 4+ indicators (like 1.6.1.1, 1.6.1.2) - GAR only shows up to depth 3
        indicators = [i for i in all_indicators if self._get_indicator_depth(i.indicator_code) <= 3]

        # Create a map of responses by indicator_id
        response_map: dict[int, AssessmentResponse] = {}
        for resp in assessment.responses:
            if resp.indicator and resp.indicator.governance_area_id == area.id:
                response_map[resp.indicator_id] = resp

        # Build indicator hierarchy
        gar_indicators = []
        met_count = 0
        considered_count = 0
        unmet_count = 0

        for indicator in indicators:
            # Get checklist items for this indicator
            checklist_items = (
                db.query(ChecklistItem)
                .filter(ChecklistItem.indicator_id == indicator.id)
                .order_by(ChecklistItem.display_order)
                .all()
            )

            # Get response for this indicator
            response = response_map.get(indicator.id)

            # Build checklist items with validation results - FILTER to only minimum requirements
            gar_checklist = []
            for item in checklist_items:
                # Filter: only include minimum requirements, not MOV items
                if not self._is_minimum_requirement(
                    item.label, item.item_type, indicator.indicator_code
                ):
                    continue

                validation_result = self._get_checklist_validation_result(item, response)

                # Transform label for GAR display (specific indicators only)
                display_label = self._get_gar_display_label(indicator.indicator_code, item.label)

                gar_checklist.append(
                    GARChecklistItem(
                        item_id=item.item_id,
                        label=display_label,
                        item_type=item.item_type or "checkbox",
                        group_name=item.group_name,
                        validation_result=validation_result,
                        display_order=item.display_order,
                    )
                )

            # Determine indicator validation status
            # Priority: Calculate from checklist items if available, else use stored validator decision
            validation_status = None

            if gar_checklist:
                # Has checklist items - calculate status from them
                validation_status = self._calculate_indicator_status_from_checklist(
                    gar_checklist=gar_checklist,
                    indicator_code=indicator.indicator_code,
                    validation_rule=indicator.validation_rule,
                )

            # Fallback to stored validator decision if no checklist items or calculation returned None
            if validation_status is None and response and response.validation_status:
                validation_status = response.validation_status.value

            # Determine indent level based on indicator code
            indent_level = self._get_indent_level(indicator.indicator_code)

            # Check if this is a header indicator (has children in FILTERED list)
            # Recalculate based on filtered indicators, not all_indicators
            is_header = any(
                i.indicator_code
                and i.indicator_code.startswith(indicator.indicator_code + ".")
                and self._get_indicator_depth(i.indicator_code)
                == self._get_indicator_depth(indicator.indicator_code) + 1
                for i in indicators
            )

            gar_indicators.append(
                GARIndicator(
                    indicator_id=indicator.id,
                    indicator_code=indicator.indicator_code,
                    indicator_name=indicator.name,
                    validation_status=validation_status,
                    checklist_items=gar_checklist,
                    is_header=is_header,
                    indent_level=indent_level,
                )
            )

            # Count validation statuses (only for leaf indicators)
            # Note: ValidationStatus enum values are uppercase (PASS, FAIL, CONDITIONAL)
            if not is_header and validation_status:
                if validation_status == "PASS":
                    met_count += 1
                elif validation_status == "CONDITIONAL":
                    considered_count += 1
                elif validation_status == "FAIL":
                    unmet_count += 1

        # Post-process: Calculate validation status for header indicators from their children
        # This handles indicators like 1.6.1 that have depth-4 children (hidden from GAR)
        # We need to look at ALL indicators (including hidden ones) to calculate the parent status
        self._calculate_header_validation_statuses(gar_indicators, all_indicators, response_map)

        # Determine overall area result
        # Area passes if ALL leaf indicators have Pass or Conditional status
        # Note: ValidationStatus enum values are uppercase (PASS, FAIL, CONDITIONAL)
        overall_result = None
        leaf_indicators = [i for i in gar_indicators if not i.is_header]
        if leaf_indicators:
            all_passed = all(
                i.validation_status in ["PASS", "CONDITIONAL"]
                for i in leaf_indicators
                if i.validation_status is not None
            )
            has_any_fail = any(i.validation_status == "FAIL" for i in leaf_indicators)

            if has_any_fail:
                overall_result = "Failed"
            elif all_passed and all(i.validation_status is not None for i in leaf_indicators):
                overall_result = "Passed"

        # Determine area type and number
        area_type = area.area_type or ("Core" if area.id <= 3 else "Essential")
        area_number = area.id

        # Map area code
        area_codes = {
            1: "FI",
            2: "DI",
            3: "SA",
            4: "SO",
            5: "BU",
            6: "EN",
        }
        area_code = area_codes.get(area.id, f"A{area.id}")

        return GARGovernanceArea(
            area_id=area.id,
            area_code=area_code,
            area_name=area.name,
            area_type=area_type,
            area_number=area_number,
            indicators=gar_indicators,
            overall_result=overall_result,
            met_count=met_count,
            considered_count=considered_count,
            unmet_count=unmet_count,
        )

    def _get_checklist_validation_result(
        self,
        item: ChecklistItem,
        response: AssessmentResponse | None,
    ) -> str | None:
        """
        Get validation result for a checklist item from response data.

        Checks assessor_val_{item_id} in response_data.
        Returns: 'met', 'considered', 'unmet', or None
        """
        if not response or not response.response_data:
            return None

        response_data = response.response_data
        item_id = item.item_id

        # Skip info_text items - they don't have validation
        if item.item_type == "info_text":
            return None

        # Check for assessor validation data
        val_key = f"assessor_val_{item_id}"

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
                # Has a value - consider it met
                return "met"

        return None

    def _get_indent_level(self, indicator_code: str) -> int:
        """
        Determine indent level from indicator code.

        Examples:
            "1.1" -> 0 (root level)
            "1.1.1" -> 1 (sub-indicator)
            "1.1.1.1" -> 2 (sub-sub-indicator)
        """
        if not indicator_code:
            return 0

        parts = indicator_code.split(".")
        # Root indicators (X.X) are level 0
        # Sub-indicators (X.X.X) are level 1
        # Sub-sub-indicators (X.X.X.X) are level 2
        return max(0, len(parts) - 2)

    def _get_indicator_depth(self, indicator_code: str) -> int:
        """
        Get the depth of an indicator code.

        Examples:
            "1.1" -> 2
            "1.1.1" -> 3
            "1.6.1.1" -> 4
        """
        if not indicator_code:
            return 0
        return len(indicator_code.split("."))

    def _is_minimum_requirement(
        self, label: str, item_type: str, indicator_code: str = None
    ) -> bool:
        """
        Filter to determine if a checklist item should appear in GAR.

        GAR shows "Minimum Requirements" from the LEFT side of DCF:
        - Document names (Barangay Financial Report, Barangay Budget, etc.)
        - Allocation requirements (At least 20% NTA, Not less than 5%, GAD, etc.)

        GAR does NOT show:
        - MOV items (Monitoring Forms, Photo Documentation, signatures)
        - Data entry fields (Total amount, Date of Approval, SRE, Certification)
        """
        # Skip info_text items entirely
        if item_type == "info_text":
            return False

        # Indicators that should NOT show any checklist items in GAR
        # (only the indicator itself is shown, no sub-items)
        # 1.6.1 - Has 3 option groups, only validation status matters for GAR
        # 4.3.3 - Similar case
        no_checklist_indicators = {"1.6.1", "4.3.3"}
        if indicator_code in no_checklist_indicators:
            return False

        lower_label = label.lower()

        # ===== EXCLUDE PATTERNS =====
        # MOV-specific items (for assessor verification, not for GAR)
        exclude_patterns = [
            # MOV verification items (but NOT "RBI Monitoring Form" which is needed for 4.7)
            "photo documentation",
            "were submitted",
            "was submitted",
            "signed by",
            "signed and stamped",
            "advisory covering",
            "received stamp",
            "annex b",
            "annex a",
            # Data entry / input fields (not shown in GAR)
            "total amount obtained",
            "date of approval",
            "sre for",
            "certification on",
            "certification for",
            "approved barangay appropriation ordinance",
            "annual investment program signed",
            # MOV report items (not minimum requirements)
            "utilization report",
            "accomplishment report",
            "post-activity report",
            "monthly accomplishment",
        ]

        for pattern in exclude_patterns:
            if pattern in lower_label:
                return False

        # ===== INCLUDE PATTERNS =====
        # Items that SHOULD appear in GAR (minimum requirements)
        include_patterns = [
            # Document list items (a., b., c., etc.)
            r"^[a-z]\.\s",
            r"^[a-z]\)\s",
            # Numbered documents
            r"^\d+\s+[a-z]",
            # Specific document types
            r"^barangay\s",
            r"^summary\s",
            r"^annual\s",
            r"^list\s+of",
            r"^itemized",
            r"^\d+%\s+component",
            # Allocation requirements (for 1.4.1)
            r"^at\s+least\s+\d+%",
            r"^not\s+less\s+than",
            r"^gender\s+and\s+development",
            r"^senior\s+citizens",
            r"^persons\s+with\s+disabilities",
            r"^\d+%\s+from\s+general",
            r"^implementation\s+of",
            r"^ten\s+percent",
            # Area 6 - Environmental Management (6.1.4 accomplishment reports)
            r"physical\s+accomplishment",
            r"financial\s+accomplishment",
            # MRF/MRS options for 6.2.1
            r"^•\s*established\s+mrf",
            r"^•\s*mrs",
            r"^•\s*clustered\s+mrf",
            # Numbered sub-indicator checklist items (e.g., 4.1.7.1., 4.1.7.2.)
            r"^\d+\.\d+\.\d+\.\d+\.",
            # Area 4 - Health Personnel items (4.2.2)
            r"^accredited\s+barangay",
            r"^barangay\s+health\s+officer",
            # Area 4 - BCPC System items (4.5.5)
            r"^updated\s+localized\s+flow\s+chart",
            r"^copy\s+of\s+comprehensive\s+barangay\s+juvenile",
            r"^copy\s+of\s+juvenile\s+justice",
            # Area 4 - RBI items (4.7.1)
            r"^rbi\s+monitoring\s+form",
            r"^list\s+of\s+barangays\s+with\s+rbi",
            # Area 4 - Prevalence Rate items (4.8.3)
            r"^\d+\.\s+with\s+decrease\s+in\s+prevalence",
        ]

        for pattern in include_patterns:
            if re.search(pattern, label, re.IGNORECASE):
                return True

        # Default: exclude items that don't match any include pattern
        return False

    def _get_gar_display_label(self, indicator_code: str, original_label: str) -> str:
        """
        Transform checklist item labels for GAR display.

        For specific indicators (2.1.4, 3.2.3, 4.1.6, 4.3.4, 4.5.6, 4.8.4, 6.1.4),
        transforms "a" and "b" labels to "Physical Report" and "Financial Report".

        For 4.1.7, transforms numbered checklist items to GAR-friendly labels.

        This transformation is GAR-only and does not affect validator/assessor checklists.
        """
        # Clean up trailing semicolons and connectors like "; and", "; or", "; AND/OR", etc.
        cleaned_label = re.sub(
            r"[;,]\s*(and|or|and/or)?\s*$", "", original_label, flags=re.IGNORECASE
        ).strip()

        # Specific label mappings for numbered checklist items (e.g., 4.1.7.1., 4.1.7.2.)
        numbered_label_map = {
            "4.1.7.1": "The barangay has a referral system flow chart",
            "4.1.7.2": "The barangay has a directory of agencies/individuals providing services to victim-survivors",
        }

        # Check if label starts with a known numbered prefix
        for prefix, gar_label in numbered_label_map.items():
            if cleaned_label.startswith(prefix):
                return gar_label

        # Label transformations for 4.2.2 health personnel items
        if indicator_code == "4.2.2":
            label_lower = cleaned_label.lower()
            if "accredited barangay health worker" in label_lower:
                return "Has accredited Barangay Health Worker"
            if "barangay health officer" in label_lower:
                return "Has Barangay Health Officer/Barangay Health Assistant"

        # Label transformations for 4.5.5 BCPC System items
        if indicator_code == "4.5.5":
            label_lower = cleaned_label.lower()
            if "localized flow chart" in label_lower:
                return (
                    "Has an updated localized flow chart of referral system not earlier than 2020"
                )
            if "comprehensive barangay juvenile" in label_lower:
                return "Has a Comprehensive Barangay Juvenile Intervention Program"
            if "children at risk" in label_lower or "cicl" in label_lower:
                return "Has a Children at Risk (CAR) and Children in Conflict with the Law (CICL) Registry"

        # Label transformations for 4.7.1 RBI items
        if indicator_code == "4.7.1":
            label_lower = cleaned_label.lower()
            if "rbi monitoring form" in label_lower:
                return "Has submitted RBI monitoring form C"
            if "list of barangays with rbi" in label_lower:
                return "Has an updated RBI in the BIS-BPS"

        # Label transformations for 4.8.3 Prevalence Rate items
        if indicator_code == "4.8.3":
            label_lower = cleaned_label.lower()
            if "underweight" in label_lower:
                return "Decrease in prevalence rate for underweight and severe underweight"
            if "stunting" in label_lower:
                return "Decrease in prevalence rate for stunting and severe stunting"
            if "wasting" in label_lower:
                return "Decrease in prevalence rate for moderate wasting and severe wasting"

        # Indicators that use Physical/Financial Report labeling in GAR
        report_indicators = {
            "2.1.4",
            "3.2.3",
            "4.1.6",
            "4.3.4",
            "4.5.6",
            "4.8.4",
            "6.1.4",
        }

        if indicator_code not in report_indicators:
            return cleaned_label

        # Normalize label for comparison
        label_lower = cleaned_label.strip().lower()

        # Map labels starting with "a" (a., a), a , or just a) to Physical Report
        if re.match(r"^a[\.\)\s]|^a$", label_lower):
            return "Physical Report"

        # Map labels starting with "b" (b., b), b , or just b) to Financial Report
        if re.match(r"^b[\.\)\s]|^b$", label_lower):
            return "Financial Report"

        return cleaned_label

    def _calculate_header_validation_statuses(
        self,
        gar_indicators: list[GARIndicator],
        all_indicators: list[Indicator],
        response_map: dict[int, AssessmentResponse],
    ) -> None:
        """
        Calculate validation status for header indicators from their children.

        For indicators like 1.6.1 that have children (1.6.1.1, 1.6.1.2, etc.),
        we need to derive the parent's status from the children's statuses.

        This method looks at ALL indicators (including hidden depth-4+ ones) to
        calculate the parent status correctly.

        Rules (using ValidationStatus enum values - uppercase):
        - If ANY child has "FAIL" -> parent is "FAIL"
        - If ANY child has "CONDITIONAL" (and no FAIL) -> parent is "CONDITIONAL"
        - If ALL children have "PASS" -> parent is "PASS"
        - If no children have status -> parent remains None
        """
        # Process GAR indicators that don't have validation status
        # These might be headers whose children are hidden (depth 4+)
        for gar_indicator in gar_indicators:
            # Skip if already has a validation status
            if gar_indicator.validation_status:
                continue

            # Find ALL children from all_indicators (including hidden depth-4+)
            children_indicators = [
                i
                for i in all_indicators
                if i.indicator_code
                and i.indicator_code.startswith(gar_indicator.indicator_code + ".")
                and i.indicator_code.count(".") == gar_indicator.indicator_code.count(".") + 1
            ]

            if not children_indicators:
                continue

            # Get validation statuses from response_map for hidden children
            child_statuses = []
            for child in children_indicators:
                response = response_map.get(child.id)
                if response and response.validation_status:
                    child_statuses.append(response.validation_status.value)

            if not child_statuses:
                continue

            # Calculate combined status (using ValidationStatus enum values - uppercase)
            if "FAIL" in child_statuses:
                gar_indicator.validation_status = "FAIL"
            elif "CONDITIONAL" in child_statuses:
                gar_indicator.validation_status = "CONDITIONAL"
            elif all(s == "PASS" for s in child_statuses):
                gar_indicator.validation_status = "PASS"

    def _calculate_indicator_status_from_checklist(
        self,
        gar_checklist: list[GARChecklistItem],
        indicator_code: str,
        validation_rule: str,
    ) -> str | None:
        """
        Calculate validation status for an indicator based on its checklist items.

        This method ensures GAR shows the correct status based on actual checklist
        validation results, not the stored validator decision.

        Validation Rules:
        - ALL_ITEMS_REQUIRED: All items must be "met" → PASS. Any "unmet" or all gray → FAIL
        - ANY_ITEM_REQUIRED / OR_LOGIC_AT_LEAST_1_REQUIRED: At least one "met" → PASS
        - ANY_OPTION_GROUP_REQUIRED: Handled by 1.6.1 special case (no checklist shown)
        - Physical/Financial indicators: At least one of Physical/Financial must be "met"

        Returns:
            "PASS", "FAIL", or None (if no checklist items or header indicator)
        """
        # No checklist items = header indicator or special case, return None
        if not gar_checklist:
            return None

        # Physical/Financial indicators (special OR logic)
        physical_financial_indicators = {
            "2.1.4",
            "3.2.3",
            "4.1.6",
            "4.3.4",
            "4.5.6",
            "4.8.4",
            "6.1.4",
        }
        if indicator_code in physical_financial_indicators:
            return self._calculate_physical_financial_status(gar_checklist)

        # Collect validation results
        met_count = 0
        unmet_count = 0
        no_data_count = 0

        for item in gar_checklist:
            if item.validation_result == "met":
                met_count += 1
            elif item.validation_result == "unmet":
                unmet_count += 1
            else:
                # None or any other value = no data (gray)
                no_data_count += 1

        total_items = len(gar_checklist)

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
                # Any explicit unmet = FAIL
                return "FAIL"
            else:
                # All gray (no data) = FAIL (can't pass without validation)
                return "FAIL"

        elif validation_rule == "SHARED_PLUS_OR_LOGIC":
            # Complex: some shared items + OR logic
            # For now, treat as: at least one met = PASS
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

    def _calculate_physical_financial_status(self, gar_checklist: list[GARChecklistItem]) -> str:
        """
        Calculate validation status for Physical/Financial OR-logic indicators.

        These indicators (2.1.4, 3.2.3, 4.1.6, 4.3.4, 4.5.6, 4.8.4, 6.1.4) pass
        if at least ONE of Physical Report or Financial Report is met.

        Returns:
            "PASS" if at least one report is met
            "FAIL" if neither report is met
        """
        physical_met = False
        financial_met = False

        for item in gar_checklist:
            if item.label == "Physical Report" and item.validation_result == "met":
                physical_met = True
            elif item.label == "Financial Report" and item.validation_result == "met":
                financial_met = True

        # OR logic: at least one must be met
        if physical_met or financial_met:
            return "PASS"
        else:
            return "FAIL"

    def _sort_key_for_indicator_code(self, indicator_code: str) -> tuple:
        """
        Generate a sort key for hierarchical indicator codes.

        Converts indicator codes like "1.1.2" into tuples of integers (1, 1, 2)
        for proper numerical sorting.

        Examples:
            "1.1" -> (1, 1)
            "1.1.1" -> (1, 1, 1)
            "1.1.2" -> (1, 1, 2)
            "1.2" -> (1, 2)
            "1.10" -> (1, 10) -- correctly sorts after (1, 9)
        """
        if not indicator_code:
            return (0,)

        parts = indicator_code.split(".")
        result = []
        for part in parts:
            try:
                result.append(int(part))
            except ValueError:
                # Handle non-numeric parts (shouldn't happen, but be safe)
                result.append(0)
        return tuple(result)


# Singleton instance
gar_service = GARService()
