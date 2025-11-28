# GAR (Governance Assessment Report) Service
# Business logic for generating GAR data from assessments

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session, joinedload

from app.db.enums import AssessmentStatus, ValidationStatus
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


class GARService:
    """Service for generating Governance Assessment Reports."""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def get_completed_assessments(self, db: Session) -> GARAssessmentListResponse:
        """
        Get list of completed assessments available for GAR generation.

        Returns assessments with status COMPLETED or AWAITING_FINAL_VALIDATION
        (for preview purposes).
        """
        assessments = (
            db.query(Assessment)
            .join(User, Assessment.blgu_user_id == User.id)
            .options(joinedload(Assessment.blgu_user).joinedload(User.barangay))
            .filter(
                Assessment.status.in_([
                    AssessmentStatus.COMPLETED,
                    AssessmentStatus.AWAITING_FINAL_VALIDATION,
                ])
            )
            .order_by(Assessment.validated_at.desc().nullslast(), Assessment.submitted_at.desc())
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
        governance_area_id: Optional[int] = None,
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

        return GARResponse(
            assessment_id=assessment.id,
            barangay_name=barangay_name,
            municipality="Sulop",
            province="Davao del Sur",
            cycle_year=cycle_year,
            governance_areas=gar_areas,
            summary=summary,
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
        indicators = (
            db.query(Indicator)
            .filter(Indicator.governance_area_id == area.id)
            .order_by(Indicator.sort_order, Indicator.indicator_code)
            .all()
        )

        # Create a map of responses by indicator_id
        response_map: Dict[int, AssessmentResponse] = {}
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

            # Build checklist items with validation results
            gar_checklist = []
            for item in checklist_items:
                validation_result = self._get_checklist_validation_result(item, response)
                gar_checklist.append(
                    GARChecklistItem(
                        item_id=item.item_id,
                        label=item.label,
                        item_type=item.item_type or "checkbox",
                        group_name=item.group_name,
                        validation_result=validation_result,
                        display_order=item.display_order,
                    )
                )

            # Determine indicator validation status
            validation_status = None
            if response and response.validation_status:
                validation_status = response.validation_status.value

            # Determine indent level based on indicator code
            indent_level = self._get_indent_level(indicator.indicator_code)

            # Check if this is a header indicator (has children)
            # A header is ANY indicator that has child indicators, regardless of whether
            # it's a root indicator or a nested intermediate header (e.g., 1.6.1)
            is_header = any(i.parent_id == indicator.id for i in indicators)

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
            if not is_header and validation_status:
                if validation_status == "Pass":
                    met_count += 1
                elif validation_status == "Conditional":
                    considered_count += 1
                elif validation_status == "Fail":
                    unmet_count += 1

        # Determine overall area result
        # Area passes if ALL leaf indicators have Pass or Conditional status
        overall_result = None
        leaf_indicators = [i for i in gar_indicators if not i.is_header]
        if leaf_indicators:
            all_passed = all(
                i.validation_status in ["Pass", "Conditional"]
                for i in leaf_indicators
                if i.validation_status is not None
            )
            has_any_fail = any(i.validation_status == "Fail" for i in leaf_indicators)

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
        response: Optional[AssessmentResponse],
    ) -> Optional[str]:
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


# Singleton instance
gar_service = GARService()
