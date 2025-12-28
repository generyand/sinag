# 📊 Analytics Service
# Business logic for analytics and dashboard KPI calculations

import logging
from dataclasses import dataclass
from datetime import date, datetime
from typing import Literal

from sqlalchemy import case, desc, func, or_
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.cache import CACHE_TTL_DASHBOARD, cache

logger = logging.getLogger(__name__)

from app.db.enums import (
    AssessmentStatus,
    BBIStatus,
    ComplianceStatus,
    UserRole,
    ValidationStatus,
)
from app.db.models import (
    Assessment,
    AssessmentResponse,
    Barangay,
    GovernanceArea,
    Indicator,
    User,
)
from app.db.models.bbi import BBIResult
from app.schemas.analytics import (
    AffectedBarangay,
    AreaBreakdown,
    BarangayRanking,
    BBIAnalyticsData,
    BBIAnalyticsItem,
    BBIAnalyticsSummary,
    ComplianceRate,
    DashboardKPIResponse,
    FailedIndicator,
    ReportsDataResponse,
    ReworkStats,
    StatusDistributionItem,
    TopReworkReason,
    TopReworkReasons,
    TrendData,
)


@dataclass
class ReportsFilters:
    """Data class for reports filtering parameters."""

    assessment_year: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    governance_area_codes: list[str] | None = None
    barangay_ids: list[int] | None = None
    status: str | None = None


class AnalyticsService:
    """Service class for analytics and dashboard KPI calculations."""

    def get_dashboard_kpis(
        self, db: Session, assessment_year: int | None = None
    ) -> DashboardKPIResponse:
        """
        Get all dashboard KPIs for the MLGOO-DILG dashboard.

        Args:
            db: Database session
            assessment_year: Optional assessment year (defaults to active year if None)

        Returns:
            DashboardKPIResponse containing all KPI data

        PERFORMANCE: Results are cached in Redis for 30 minutes to reduce
        database load and improve response times for the dashboard.
        """
        # Get active year if not specified
        if assessment_year is None:
            from app.services.assessment_year_service import assessment_year_service

            assessment_year = assessment_year_service.get_active_year_number(db)

        # Build cache key based on assessment_year
        cache_key = f"dashboard_kpis:year_{assessment_year or 'all'}"

        # Try to get from cache first
        if cache.is_available:
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                logger.info(f"🎯 Dashboard KPIs cache HIT for {cache_key}")
                return DashboardKPIResponse(**cached_data)

        logger.info(f"📊 Computing dashboard KPIs (cache miss for {cache_key})")

        # Calculate all KPIs
        overall_compliance = self._calculate_overall_compliance(db, assessment_year)
        completion_status = self._calculate_completion_status(db, assessment_year)
        area_breakdown = self._calculate_area_breakdown(db, assessment_year)
        top_failed = self._calculate_top_failed_indicators(db, assessment_year)
        trends = self._calculate_trends(db)
        barangay_rankings = self._calculate_barangay_rankings(db, assessment_year)
        status_distribution = self._calculate_status_distribution(db, assessment_year)
        rework_stats = self._calculate_rework_stats(db, assessment_year)
        top_rework_reasons = self._calculate_top_rework_reasons(db, assessment_year)
        bbi_analytics = self._calculate_bbi_analytics(db, assessment_year)
        total_barangays = self._get_total_barangays(db)

        response = DashboardKPIResponse(
            overall_compliance_rate=overall_compliance,
            completion_status=completion_status,
            area_breakdown=area_breakdown,
            top_failed_indicators=top_failed,
            trends=trends,
            barangay_rankings=barangay_rankings,
            status_distribution=status_distribution,
            rework_stats=rework_stats,
            top_rework_reasons=top_rework_reasons,
            bbi_analytics=bbi_analytics,
            total_barangays=total_barangays,
        )

        # Cache the result for 30 minutes
        if cache.is_available:
            try:
                # Convert Pydantic model to dict for caching
                cache.set(cache_key, response.model_dump(), ttl=CACHE_TTL_DASHBOARD)
                logger.info(
                    f"💾 Dashboard KPIs cached for {cache_key} (TTL: {CACHE_TTL_DASHBOARD}s)"
                )
            except Exception as e:
                logger.warning(f"⚠️  Failed to cache dashboard KPIs: {e}")

        return response

    def calculate_top_rework_reasons(
        self, db: Session, assessment_year: int | None = None
    ) -> TopReworkReasons | None:
        """
        Calculate top reasons for rework and calibration from AI-generated summaries.

        Public API method for refreshing rework/calibration analysis.

        Args:
            db: Database session
            assessment_year: Optional assessment year

        Returns:
            TopReworkReasons or None if no rework/calibration data available
        """
        return self._calculate_top_rework_reasons(db, assessment_year)

    def _calculate_overall_compliance(
        self, db: Session, assessment_year: int | None = None
    ) -> ComplianceRate:
        """
        Calculate overall compliance rate (pass/fail statistics).

        Only counts COMPLETED assessments for compliance statistics.

        Args:
            db: Database session
            assessment_year: Optional assessment year

        Returns:
            ComplianceRate schema with total, passed, failed counts and percentage
        """
        # Build base query for COMPLETED assessments only
        query = db.query(Assessment).filter(Assessment.status == AssessmentStatus.COMPLETED)

        # Filter by assessment year
        if assessment_year is not None:
            query = query.filter(Assessment.assessment_year == assessment_year)

        # Get all assessments with final compliance status
        assessments = query.all()

        total_barangays = len(assessments)

        # Handle edge case: no assessments
        if total_barangays == 0:
            return ComplianceRate(
                total_barangays=0,
                passed=0,
                failed=0,
                pass_percentage=0.0,
            )

        # Count passed and failed
        passed = sum(1 for a in assessments if a.final_compliance_status == ComplianceStatus.PASSED)
        failed = sum(1 for a in assessments if a.final_compliance_status == ComplianceStatus.FAILED)

        # Calculate percentage (handle division by zero)
        pass_percentage = (passed / total_barangays * 100) if total_barangays > 0 else 0.0

        return ComplianceRate(
            total_barangays=total_barangays,
            passed=passed,
            failed=failed,
            pass_percentage=round(pass_percentage, 2),
        )

    def _calculate_completion_status(
        self, db: Session, assessment_year: int | None = None
    ) -> ComplianceRate:
        """
        Calculate completion status (validated vs in-progress assessments).

        Args:
            db: Database session
            assessment_year: Optional assessment year

        Returns:
            ComplianceRate schema representing completion statistics
        """
        # For completion status, we consider all assessments
        query = db.query(Assessment)

        # Filter by assessment year
        if assessment_year is not None:
            query = query.filter(Assessment.assessment_year == assessment_year)

        assessments = query.all()
        total = len(assessments)

        # "Passed" = validated (has final_compliance_status)
        # "Failed" = in progress (no final_compliance_status yet)
        validated = sum(1 for a in assessments if a.final_compliance_status is not None)
        in_progress = total - validated

        completion_percentage = (validated / total * 100) if total > 0 else 0.0

        return ComplianceRate(
            total_barangays=total,
            passed=validated,
            failed=in_progress,
            pass_percentage=round(completion_percentage, 2),
        )

    def _calculate_area_breakdown(
        self, db: Session, assessment_year: int | None = None
    ) -> list[AreaBreakdown]:
        """
        Calculate compliance breakdown by governance area.

        Args:
            db: Database session
            assessment_year: Optional assessment year

        Returns:
            List of AreaBreakdown schemas, one per governance area
        """
        # Get all governance areas with eager loaded indicators
        # PERFORMANCE FIX: Eager load indicators to prevent N+1 queries
        governance_areas = (
            db.query(GovernanceArea).options(selectinload(GovernanceArea.indicators)).all()
        )

        if not governance_areas:
            return []

        # Get COMPLETED assessments with eager loaded responses
        # Only completed assessments count for governance area performance
        # PERFORMANCE FIX: Eager load responses to prevent N+1 queries
        assessment_query = (
            db.query(Assessment)
            .options(selectinload(Assessment.responses))
            .filter(Assessment.status == AssessmentStatus.COMPLETED)
        )

        # Filter by assessment year
        if assessment_year is not None:
            assessment_query = assessment_query.filter(
                Assessment.assessment_year == assessment_year
            )

        validated_assessments = assessment_query.all()

        if not validated_assessments:
            # Return areas with zero counts
            return [
                AreaBreakdown(
                    area_code=f"GA-{area.id}",
                    area_name=area.name,
                    passed=0,
                    failed=0,
                    percentage=0.0,
                )
                for area in governance_areas
            ]

        area_breakdown = []

        for area in governance_areas:
            # Get all indicators for this governance area
            indicator_ids = [ind.id for ind in area.indicators]

            if not indicator_ids:
                area_breakdown.append(
                    AreaBreakdown(
                        area_code=f"GA-{area.id}",
                        area_name=area.name,
                        passed=0,
                        failed=0,
                        percentage=0.0,
                    )
                )
                continue

            # For each assessment, check if this governance area passed or failed
            # based on validation status (aligned with GAR methodology)
            passed_count = 0
            failed_count = 0

            for assessment in validated_assessments:
                # Get responses for this area's indicators
                area_responses = [
                    r for r in assessment.responses if r.indicator_id in indicator_ids
                ]

                if not area_responses:
                    continue

                # Count indicators by validation status
                met_count = sum(
                    1
                    for r in area_responses
                    if r.validation_status in (ValidationStatus.PASS, ValidationStatus.CONDITIONAL)
                )
                total_validated = sum(1 for r in area_responses if r.validation_status is not None)

                # Skip if no indicators have been validated yet
                if total_validated == 0:
                    continue

                # A barangay "passes" this area if ALL validated indicators are met (Pass/Conditional)
                # This aligns with GAR methodology where all indicators must pass for area compliance
                if met_count == total_validated:
                    passed_count += 1
                else:
                    failed_count += 1

            total = passed_count + failed_count
            percentage = (passed_count / total * 100) if total > 0 else 0.0

            area_breakdown.append(
                AreaBreakdown(
                    area_code=f"GA-{area.id}",
                    area_name=area.name,
                    passed=passed_count,
                    failed=failed_count,
                    percentage=round(percentage, 2),
                )
            )

        return area_breakdown

    def _calculate_top_failed_indicators(
        self, db: Session, assessment_year: int | None = None
    ) -> list[FailedIndicator]:
        """
        Calculate top 5 most frequently failed indicators.

        Uses validation_status (FAIL) to determine failed indicators,
        aligned with GAR methodology. Only considers COMPLETED assessments.

        Args:
            db: Database session
            assessment_year: Optional assessment year

        Returns:
            List of FailedIndicator schemas (max 5)
        """
        # Build query for FAILED validation status responses from COMPLETED assessments
        # Include indicator_code and governance_area for richer data
        query = (
            db.query(
                Indicator.id,
                Indicator.name,
                Indicator.indicator_code,
                GovernanceArea.name.label("governance_area_name"),
                func.count(AssessmentResponse.id).label("failure_count"),
            )
            .join(AssessmentResponse, AssessmentResponse.indicator_id == Indicator.id)
            .join(Assessment, AssessmentResponse.assessment_id == Assessment.id)
            .join(GovernanceArea, Indicator.governance_area_id == GovernanceArea.id)
            .filter(AssessmentResponse.validation_status == ValidationStatus.FAIL)
            .filter(Assessment.status == AssessmentStatus.COMPLETED)
        )

        # Filter by assessment year
        if assessment_year is not None:
            query = query.filter(Assessment.assessment_year == assessment_year)

        # Group by indicator and governance area, order by count descending, limit to 5
        results = (
            query.group_by(
                Indicator.id,
                Indicator.name,
                Indicator.indicator_code,
                GovernanceArea.name,
            )
            .order_by(desc("failure_count"))
            .limit(5)
            .all()
        )

        if not results:
            return []

        # Get total barangays for accurate percentage calculation
        # This gives us the actual failure rate (failures / total barangays)
        total_barangays = self._get_total_barangays(db)

        failed_indicators = []
        for result in results:
            # Calculate actual failure rate as percentage of total barangays
            percentage = (
                (result.failure_count / total_barangays * 100) if total_barangays > 0 else 0.0
            )
            failed_indicators.append(
                FailedIndicator(
                    indicator_id=result.id,
                    indicator_name=result.name,
                    indicator_code=result.indicator_code,
                    governance_area=result.governance_area_name,
                    failure_count=result.failure_count,
                    percentage=round(percentage, 2),
                )
            )

        return failed_indicators

    def _calculate_trends(self, db: Session) -> list[TrendData]:
        """
        Calculate historical trend data across last 3 cycles.

        Args:
            db: Database session

        Returns:
            List of TrendData schemas (max 3, chronologically ordered)
        """
        # TODO: Implement when cycle table and relationship are added
        # For now, return empty list as cycles are not yet in the schema

        # Placeholder implementation:
        # 1. Query last 3 cycles ordered by date DESC
        # 2. For each cycle, calculate pass rate
        # 3. Return chronologically ordered (oldest to newest)

        return []

    def _calculate_barangay_rankings(
        self, db: Session, assessment_year: int | None = None
    ) -> list[BarangayRanking]:
        """
        Calculate barangay rankings by compliance score.

        Only considers COMPLETED assessments for rankings.

        Args:
            db: Database session
            assessment_year: Optional assessment year

        Returns:
            List of BarangayRanking schemas ordered by score (highest first)
        """
        # Build base query for COMPLETED assessments with scores
        query = (
            db.query(
                Barangay.id.label("barangay_id"),
                Barangay.name.label("barangay_name"),
                func.avg(
                    case(
                        (
                            Assessment.final_compliance_status == ComplianceStatus.PASSED,
                            100.0,
                        ),
                        (
                            Assessment.final_compliance_status == ComplianceStatus.FAILED,
                            0.0,
                        ),
                        else_=None,
                    )
                ).label("score"),
            )
            .join(User, Assessment.blgu_user_id == User.id)
            .join(Barangay, User.barangay_id == Barangay.id)
            .filter(Assessment.status == AssessmentStatus.COMPLETED)
            .group_by(Barangay.id, Barangay.name)
        )

        # Filter by assessment year
        if assessment_year is not None:
            query = query.filter(Assessment.assessment_year == assessment_year)

        # Get results ordered by score descending
        results = query.order_by(desc("score")).all()

        # Convert to BarangayRanking schemas with rank
        rankings = []
        for rank, result in enumerate(results, start=1):
            if result.score is not None:
                rankings.append(
                    BarangayRanking(
                        barangay_id=result.barangay_id,
                        barangay_name=result.barangay_name,
                        score=round(result.score, 2),
                        rank=rank,
                    )
                )

        return rankings

    def _calculate_status_distribution(
        self, db: Session, assessment_year: int | None = None
    ) -> list[StatusDistributionItem]:
        """
        Calculate distribution of assessments by workflow status.

        Args:
            db: Database session
            assessment_year: Optional assessment year

        Returns:
            List of StatusDistributionItem schemas with count and percentage per status
        """
        # Query all assessments grouped by status
        query = db.query(Assessment)

        # Filter by assessment year
        if assessment_year is not None:
            query = query.filter(Assessment.assessment_year == assessment_year)

        assessments = query.all()
        total = len(assessments)

        if total == 0:
            return []

        # Count by status
        status_counts = {}
        for assessment in assessments:
            status = assessment.status.value if assessment.status else "UNKNOWN"
            status_counts[status] = status_counts.get(status, 0) + 1

        # Define display order and friendly names
        status_display = {
            AssessmentStatus.DRAFT.value: "Not Started",
            AssessmentStatus.SUBMITTED.value: "Submitted",
            AssessmentStatus.IN_REVIEW.value: "In Review",
            AssessmentStatus.REWORK.value: "In Rework",
            AssessmentStatus.AWAITING_FINAL_VALIDATION.value: "Awaiting Validation",
            AssessmentStatus.AWAITING_MLGOO_APPROVAL.value: "Awaiting MLGOO Approval",
            AssessmentStatus.COMPLETED.value: "Completed",
        }

        # Build distribution list in workflow order
        distribution = []
        for status_enum in [
            AssessmentStatus.DRAFT,
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.IN_REVIEW,
            AssessmentStatus.REWORK,
            AssessmentStatus.AWAITING_FINAL_VALIDATION,
            AssessmentStatus.AWAITING_MLGOO_APPROVAL,
            AssessmentStatus.COMPLETED,
        ]:
            count = status_counts.get(status_enum.value, 0)
            percentage = (count / total * 100) if total > 0 else 0.0

            distribution.append(
                StatusDistributionItem(
                    status=status_display.get(status_enum.value, status_enum.value),
                    count=count,
                    percentage=round(percentage, 2),
                )
            )

        return distribution

    def _calculate_rework_stats(
        self, db: Session, assessment_year: int | None = None
    ) -> ReworkStats:
        """
        Calculate rework and calibration usage statistics.

        Args:
            db: Database session
            assessment_year: Optional assessment year

        Returns:
            ReworkStats schema with rework and calibration rates
        """
        # Query all assessments
        query = db.query(Assessment)

        # Filter by assessment year
        if assessment_year is not None:
            query = query.filter(Assessment.assessment_year == assessment_year)

        assessments = query.all()
        total = len(assessments)

        if total == 0:
            return ReworkStats(
                total_assessments=0,
                assessments_with_rework=0,
                rework_rate=0.0,
                assessments_with_calibration=0,
                calibration_rate=0.0,
            )

        # Count assessments with rework (rework_count > 0)
        assessments_with_rework = sum(
            1 for a in assessments if a.rework_count and a.rework_count > 0
        )

        # Count assessments with calibration (calibration_count > 0)
        assessments_with_calibration = sum(
            1 for a in assessments if a.calibration_count and a.calibration_count > 0
        )

        # Calculate rates
        rework_rate = (assessments_with_rework / total * 100) if total > 0 else 0.0
        calibration_rate = (assessments_with_calibration / total * 100) if total > 0 else 0.0

        return ReworkStats(
            total_assessments=total,
            assessments_with_rework=assessments_with_rework,
            rework_rate=round(rework_rate, 2),
            assessments_with_calibration=assessments_with_calibration,
            calibration_rate=round(calibration_rate, 2),
        )

    def _calculate_top_rework_reasons(
        self, db: Session, assessment_year: int | None = None
    ) -> TopReworkReasons | None:
        """
        Calculate top reasons for adjustment from AI-generated summaries.

        Aggregates key_issues from rework_summary and calibration_summary
        fields across all assessments to identify the most common adjustment reasons.

        Args:
            db: Database session
            assessment_year: Optional assessment year

        Returns:
            TopReworkReasons or None if no adjustment data available
        """

        from app.db.models.assessment import FeedbackComment

        # PERFORMANCE FIX: Use SQL COUNT instead of loading all assessments
        # Build year filter condition
        year_filter = (
            Assessment.assessment_year == assessment_year if assessment_year is not None else True
        )

        # Count assessments with adjustments (rework OR calibration) at database level
        # Use DISTINCT count to avoid double-counting assessments with both
        adjustment_count = (
            db.query(func.count(Assessment.id))
            .filter(
                or_(Assessment.rework_count > 0, Assessment.calibration_count > 0),
                year_filter,
            )
            .scalar()
            or 0
        )

        if adjustment_count == 0:
            return None

        # PERFORMANCE FIX: Only query assessments that actually have rework OR calibration
        # This avoids loading all assessments into memory
        # Eager load blgu_user->barangay chain to avoid N+1 queries when building affected_barangays
        assessments = (
            db.query(Assessment)
            .options(joinedload(Assessment.blgu_user).joinedload(User.barangay))
            .filter(
                or_(Assessment.rework_count > 0, Assessment.calibration_count > 0),
                year_filter,
            )
            .all()
        )

        # Debug logging: track which assessments have summaries
        assessments_with_summary = sum(
            1
            for a in assessments
            if a.rework_summary is not None
            or a.calibration_summary is not None
            or a.calibration_summaries_by_area
        )
        logger.info(
            f"📊 Top adjustment reasons: Found {len(assessments)} assessments with adjustments for year {assessment_year}. "
            f"Assessments with summaries: {assessments_with_summary}/{adjustment_count}"
        )

        # Collect REASONS (key_issues) from AI summaries - NOT actions/recommendations
        # key_issues = the actual problems identified (reasons for adjustment)
        # priority_actions = what to do to fix them (NOT what we want here)
        #
        # Summary structure is multi-language:
        # {"ceb": {"indicator_summaries": [{"key_issues": [...]}]}, "en": {...}}
        #
        # Track reason -> list of assessments mapping to show affected barangays
        # Key: reason_text, Value: list of assessment objects
        from collections import defaultdict

        reason_to_assessments: dict[str, list[Assessment]] = defaultdict(list)

        def extract_key_issues_from_summary(summary: dict) -> list[str]:
            """Extract key_issues from a multi-language summary structure."""
            issues: list[str] = []
            if not isinstance(summary, dict):
                return issues

            # Check for language keys (ceb, en, fil) at top level
            for lang_key in ["ceb", "en", "fil"]:
                lang_data = summary.get(lang_key)
                if isinstance(lang_data, dict):
                    indicator_summaries = lang_data.get("indicator_summaries", [])
                    if isinstance(indicator_summaries, list):
                        for ind_summary in indicator_summaries:
                            if isinstance(ind_summary, dict):
                                key_issues = ind_summary.get("key_issues", [])
                                if isinstance(key_issues, list):
                                    issues.extend(key_issues)
                    # Only use one language to avoid duplicates
                    if issues:
                        break

            # Fallback: check for indicator_summaries at top level (legacy format)
            if not issues:
                indicator_summaries = summary.get("indicator_summaries", [])
                if isinstance(indicator_summaries, list):
                    for ind_summary in indicator_summaries:
                        if isinstance(ind_summary, dict):
                            key_issues = ind_summary.get("key_issues", [])
                            if isinstance(key_issues, list):
                                issues.extend(key_issues)

            return issues

        for assessment in assessments:
            # Extract key_issues from rework_summary
            if assessment.rework_summary and isinstance(assessment.rework_summary, dict):
                issues = extract_key_issues_from_summary(assessment.rework_summary)
                for issue in issues:
                    if issue and issue.strip():
                        reason_to_assessments[issue.strip()].append(assessment)

            # Extract key_issues from calibration_summary
            if assessment.calibration_summary and isinstance(assessment.calibration_summary, dict):
                issues = extract_key_issues_from_summary(assessment.calibration_summary)
                for issue in issues:
                    if issue and issue.strip():
                        reason_to_assessments[issue.strip()].append(assessment)

            # Extract key_issues from calibration_summaries_by_area
            if assessment.calibration_summaries_by_area and isinstance(
                assessment.calibration_summaries_by_area, dict
            ):
                for area_id, area_summary in assessment.calibration_summaries_by_area.items():
                    if isinstance(area_summary, dict):
                        issues = extract_key_issues_from_summary(area_summary)
                        for issue in issues:
                            if issue and issue.strip():
                                reason_to_assessments[issue.strip()].append(assessment)

        # Debug logging: track extracted reasons
        total_reasons = sum(len(v) for v in reason_to_assessments.values())
        logger.info(
            f"📊 Extracted {total_reasons} adjustment reasons from AI summaries across {len(reason_to_assessments)} unique issues"
        )

        # If no AI-generated reasons, fall back to feedback comments
        if not reason_to_assessments:
            # Get feedback comments from assessments with adjustments
            assessment_ids_with_adjustments = [a.id for a in assessments]
            if assessment_ids_with_adjustments:
                # Create a mapping of assessment_id -> assessment for quick lookup
                assessment_map = {a.id: a for a in assessments}

                feedback_comments = (
                    db.query(FeedbackComment)
                    .join(AssessmentResponse)
                    .filter(AssessmentResponse.assessment_id.in_(assessment_ids_with_adjustments))
                    .filter(FeedbackComment.is_internal_note == False)  # noqa: E712
                    .limit(50)
                    .all()
                )
                for fc in feedback_comments:
                    if fc.comment and fc.comment.strip():
                        assessment_id = fc.response.assessment_id
                        if assessment_id in assessment_map:
                            reason_to_assessments[fc.comment.strip()].append(
                                assessment_map[assessment_id]
                            )

        # Build TopReworkReason objects with affected barangays
        all_reasons: list[TopReworkReason] = []

        # Sort by occurrence count and take top reasons
        sorted_reasons = sorted(
            reason_to_assessments.items(), key=lambda x: len(x[1]), reverse=True
        )

        for reason_text, assessment_list in sorted_reasons[:10]:
            # Deduplicate assessments (same assessment may appear multiple times)
            seen_assessment_ids: set[int] = set()
            unique_assessments: list[Assessment] = []
            for assessment in assessment_list:
                if assessment.id not in seen_assessment_ids:
                    seen_assessment_ids.add(assessment.id)
                    unique_assessments.append(assessment)

            # Build affected barangays list (max 10)
            # Access barangay through blgu_user relationship: assessment.blgu_user.barangay
            affected_barangays: list[AffectedBarangay] = []
            for assessment in unique_assessments[:10]:
                barangay = assessment.blgu_user.barangay if assessment.blgu_user else None
                if barangay:
                    affected_barangays.append(
                        AffectedBarangay(
                            barangay_id=barangay.id,
                            barangay_name=barangay.name,
                            assessment_id=assessment.id,
                        )
                    )

            all_reasons.append(
                TopReworkReason(
                    reason=reason_text,
                    count=len(unique_assessments),
                    source="adjustment",
                    governance_area=None,
                    affected_barangays=affected_barangays,
                )
            )

        return TopReworkReasons(
            reasons=all_reasons,
            total_adjustment_assessments=adjustment_count,
            generated_by_ai=bool(reason_to_assessments),
        )

    def _get_total_barangays(self, db: Session) -> int:
        """
        Get total number of barangays in the municipality.

        Args:
            db: Database session

        Returns:
            Total count of barangays
        """
        return db.query(Barangay).count()

    def _calculate_bbi_analytics(
        self, db: Session, assessment_year: int | None = None
    ) -> BBIAnalyticsData | None:
        """
        Calculate BBI (Barangay-based Institutions) compliance analytics.

        Aggregates BBI results across all assessments to provide:
        - Summary statistics (overall averages, tier counts)
        - Per-BBI breakdown with functional status distribution

        Per DILG MC 2024-417:
        - 75%+: HIGHLY_FUNCTIONAL
        - 50-74%: MODERATELY_FUNCTIONAL
        - <50%: LOW_FUNCTIONAL

        Args:
            db: Database session
            assessment_year: Optional assessment year

        Returns:
            BBIAnalyticsData or None if no BBI data available
        """
        # Get all BBI results with their BBI metadata
        query = (
            db.query(BBIResult)
            .options(joinedload(BBIResult.bbi))
            .join(Assessment, BBIResult.assessment_id == Assessment.id)
        )

        # Filter by assessment year
        if assessment_year is not None:
            query = query.filter(Assessment.assessment_year == assessment_year)

        bbi_results = query.all()

        if not bbi_results:
            return None

        # Group results by BBI
        bbi_data: dict = {}
        for result in bbi_results:
            if not result.bbi:
                continue

            bbi_id = result.bbi_id
            if bbi_id not in bbi_data:
                bbi_data[bbi_id] = {
                    "bbi": result.bbi,
                    "results": [],
                }
            bbi_data[bbi_id]["results"].append(result)

        if not bbi_data:
            return None

        # Calculate per-BBI analytics
        bbi_breakdown = []
        total_highly = 0
        total_moderately = 0
        total_low = 0
        total_compliance_sum = 0.0
        total_result_count = 0

        for bbi_id, data in bbi_data.items():
            bbi = data["bbi"]
            results = data["results"]

            # Count by tier (compliance_rating is a string matching BBIStatus values)
            highly_count = sum(
                1 for r in results if r.compliance_rating == BBIStatus.HIGHLY_FUNCTIONAL.value
            )
            moderately_count = sum(
                1 for r in results if r.compliance_rating == BBIStatus.MODERATELY_FUNCTIONAL.value
            )
            low_count = sum(
                1 for r in results if r.compliance_rating == BBIStatus.LOW_FUNCTIONAL.value
            )

            # Calculate average compliance for this BBI
            compliance_values = [
                r.compliance_percentage for r in results if r.compliance_percentage is not None
            ]
            avg_compliance = (
                sum(compliance_values) / len(compliance_values) if compliance_values else 0.0
            )

            total_barangays = len(results)

            bbi_breakdown.append(
                BBIAnalyticsItem(
                    bbi_id=bbi.id,
                    bbi_name=bbi.name,
                    bbi_abbreviation=bbi.abbreviation or bbi.name[:5].upper(),
                    average_compliance=round(avg_compliance, 2),
                    highly_functional_count=highly_count,
                    moderately_functional_count=moderately_count,
                    low_functional_count=low_count,
                    total_barangays=total_barangays,
                )
            )

            # Accumulate for summary
            total_highly += highly_count
            total_moderately += moderately_count
            total_low += low_count
            total_compliance_sum += sum(compliance_values)
            total_result_count += len(compliance_values)

        # Calculate overall summary
        overall_avg = total_compliance_sum / total_result_count if total_result_count > 0 else 0.0

        # Count unique assessments with BBI results
        unique_assessments = len(set(r.assessment_id for r in bbi_results))

        summary = BBIAnalyticsSummary(
            total_assessments=unique_assessments,
            overall_average_compliance=round(overall_avg, 2),
            total_highly_functional=total_highly,
            total_moderately_functional=total_moderately,
            total_low_functional=total_low,
        )

        return BBIAnalyticsData(
            summary=summary,
            bbi_breakdown=bbi_breakdown,
        )

    def get_reports_data(
        self,
        db: Session,
        filters: ReportsFilters,
        current_user: User,
        page: int = 1,
        page_size: int = 50,
    ) -> ReportsDataResponse:
        """
        Get comprehensive reports data with dynamic filtering and RBAC.

        Args:
            db: Database session
            filters: ReportsFilters dataclass with optional filter parameters
            current_user: Current authenticated user for RBAC
            page: Page number for table pagination (default: 1)
            page_size: Number of rows per page (default: 50)

        Returns:
            ReportsDataResponse containing all visualization data
        """
        # Build base query with dynamic filters
        query = self._build_filtered_query(db, filters, current_user)

        # Aggregate chart data
        chart_data = self._aggregate_chart_data(db, query)

        # Aggregate map data
        map_data = self._aggregate_map_data(db, query)

        # Aggregate table data with pagination
        table_data = self._aggregate_table_data(db, query, page, page_size)

        from app.schemas.analytics import ReportMetadata

        metadata = ReportMetadata(
            generated_at=datetime.utcnow(),
            assessment_year=filters.assessment_year,
            start_date=datetime.combine(filters.start_date, datetime.min.time())
            if filters.start_date
            else None,
            end_date=datetime.combine(filters.end_date, datetime.min.time())
            if filters.end_date
            else None,
            governance_areas=filters.governance_area_codes,
            barangay_ids=filters.barangay_ids,
            status=filters.status,
        )

        return ReportsDataResponse(
            chart_data=chart_data,
            map_data=map_data,
            table_data=table_data,
            metadata=metadata,
        )

    def _aggregate_chart_data(self, db: Session, query):
        """
        Aggregate data for bar, pie, and line charts.

        Args:
            db: Database session
            query: Filtered SQLAlchemy query

        Returns:
            ChartData schema with bar_chart, pie_chart, and line_chart populated
        """
        from app.schemas.analytics import (
            ChartData,
        )

        # Get all assessments from the filtered query
        assessments = query.all()

        # 1. BAR CHART: Pass/Fail rates by governance area
        bar_chart_data = self._aggregate_bar_chart(db, assessments)

        # 2. PIE CHART: Overall compliance status distribution
        pie_chart_data = self._aggregate_pie_chart(assessments)

        # 3. LINE CHART: Trends over cycles (using submitted dates)
        line_chart_data = self._aggregate_line_chart(assessments)

        return ChartData(
            bar_chart=bar_chart_data,
            pie_chart=pie_chart_data,
            line_chart=line_chart_data,
        )

    def _aggregate_bar_chart(self, db: Session, assessments: list[Assessment]) -> list:
        """
        Aggregate bar chart data: pass/fail rates by governance area.

        Shows how many barangays passed vs failed each governance area based on
        the stored area_results from the GAR classification algorithm.
        This ensures consistency with the official GAR determination.

        Args:
            db: Database session
            assessments: List of filtered assessments

        Returns:
            List of BarChartData
        """
        from app.schemas.analytics import BarChartData

        if not assessments:
            return []

        # Get all governance areas
        governance_areas = db.query(GovernanceArea).all()

        if not governance_areas:
            return []

        bar_data = []

        for area in governance_areas:
            passed_count = 0
            failed_count = 0

            # For each assessment, check if this governance area passed or failed
            # using the stored area_results (source of truth from GAR classification)
            for assessment in assessments:
                if not assessment.area_results:
                    continue

                # area_results is stored with area names as keys and "Passed"/"Failed" as values
                # Try matching by area name (the primary key format used by intelligence_service)
                area_result = assessment.area_results.get(area.name)

                if area_result is not None:
                    # Case-insensitive comparison for defensive coding
                    if area_result.lower() == "passed":
                        passed_count += 1
                    elif area_result.lower() == "failed":
                        failed_count += 1

            total = passed_count + failed_count
            pass_percentage = (passed_count / total * 100) if total > 0 else 0.0

            bar_data.append(
                BarChartData(
                    area_code=f"GA-{area.id}",
                    area_name=area.name,
                    passed=passed_count,
                    failed=failed_count,
                    pass_percentage=round(pass_percentage, 2),
                )
            )

        return bar_data

    def _aggregate_pie_chart(self, assessments: list[Assessment]) -> list:
        """
        Aggregate pie chart data: overall compliance status distribution.

        Args:
            assessments: List of filtered assessments

        Returns:
            List of PieChartData
        """
        from app.schemas.analytics import PieChartData

        if not assessments:
            return []

        # Count assessments by status - only count Pass/Fail for COMPLETED assessments
        passed_count = sum(
            1
            for a in assessments
            if a.status == AssessmentStatus.COMPLETED
            and a.final_compliance_status == ComplianceStatus.PASSED
        )
        failed_count = sum(
            1
            for a in assessments
            if a.status == AssessmentStatus.COMPLETED
            and a.final_compliance_status == ComplianceStatus.FAILED
        )
        # In progress includes: non-completed OR completed without final status
        in_progress_count = sum(
            1
            for a in assessments
            if a.status != AssessmentStatus.COMPLETED or a.final_compliance_status is None
        )

        total = len(assessments)

        if total == 0:
            return []

        pie_data = []

        # Only include statuses that have data
        if passed_count > 0:
            pie_data.append(
                PieChartData(
                    status="Pass",
                    count=passed_count,
                    percentage=round((passed_count / total * 100), 2),
                )
            )

        if failed_count > 0:
            pie_data.append(
                PieChartData(
                    status="Fail",
                    count=failed_count,
                    percentage=round((failed_count / total * 100), 2),
                )
            )

        if in_progress_count > 0:
            pie_data.append(
                PieChartData(
                    status="In Progress",
                    count=in_progress_count,
                    percentage=round((in_progress_count / total * 100), 2),
                )
            )

        return pie_data

    def _aggregate_line_chart(self, assessments: list[Assessment]) -> list:
        """
        Aggregate line chart data: trends over time/cycles.

        Groups assessments by month if date range filter is used.

        Args:
            assessments: List of filtered assessments

        Returns:
            List of TrendData
        """
        if not assessments:
            return []

        # Group assessments by month based on submitted_at
        from collections import defaultdict

        monthly_data = defaultdict(lambda: {"total": 0, "passed": 0})

        for assessment in assessments:
            if assessment.submitted_at is None:
                continue

            # Group by year-month
            month_key = assessment.submitted_at.replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )

            monthly_data[month_key]["total"] += 1
            # Only count as passed if assessment is COMPLETED
            if (
                assessment.status == AssessmentStatus.COMPLETED
                and assessment.final_compliance_status == ComplianceStatus.PASSED
            ):
                monthly_data[month_key]["passed"] += 1

        # Convert to TrendData objects
        trend_data = []
        for month_date in sorted(monthly_data.keys()):
            data = monthly_data[month_date]
            total = data["total"]
            passed = data["passed"]
            pass_rate = (passed / total * 100) if total > 0 else 0.0

            trend_data.append(
                TrendData(
                    cycle_id=0,  # Placeholder - will be proper cycle_id when cycles are implemented
                    cycle_name=month_date.strftime("%B %Y"),  # e.g., "January 2025"
                    pass_rate=round(pass_rate, 2),
                    date=month_date,
                )
            )

        return trend_data

    def _aggregate_map_data(self, db: Session, query):
        """
        Aggregate geographic map data for barangays.

        Args:
            db: Database session
            query: Filtered SQLAlchemy query

        Returns:
            MapData schema with list of barangay map points
        """
        from app.db.enums import ValidationStatus
        from app.schemas.analytics import (
            AssessmentStatusDetail,
            BarangayMapPoint,
            GovernanceAreaBreakdown,
            GovernanceAreaIndicator,
            MapData,
            WorkflowStatusDetail,
        )

        # Get all assessments from the filtered query
        assessments = query.all()

        if not assessments:
            return MapData(barangays=[])

        # Define governance area mappings
        # Core: FAS (1), DP (2), SPO (3)
        # Essential: SPS (4), BFC (5), EM (6)
        GOVERNANCE_AREAS: dict[str, list[dict[str, str | int]]] = {
            "core": [
                {"id": 1, "code": "FAS", "name": "Financial Administration and Sustainability"},
                {"id": 2, "code": "DP", "name": "Disaster Preparedness"},
                {"id": 3, "code": "SPO", "name": "Safety, Peace and Order"},
            ],
            "essential": [
                {"id": 4, "code": "SPS", "name": "Social Protection and Sensitivity"},
                {"id": 5, "code": "BFC", "name": "Business-Friendliness and Competitiveness"},
                {"id": 6, "code": "EM", "name": "Environmental Management"},
            ],
        }

        # Build map of barangay_id to assessment data
        barangay_map = {}

        for assessment in assessments:
            # Get barangay from the assessment's user
            if not assessment.blgu_user or not assessment.blgu_user.barangay:
                continue

            barangay = assessment.blgu_user.barangay
            barangay_id = barangay.id

            # Skip if we already processed this barangay (use most recent assessment)
            if barangay_id in barangay_map:
                continue

            # Determine status - only show Pass/Fail if assessment is COMPLETED
            if (
                assessment.status == AssessmentStatus.COMPLETED
                and assessment.final_compliance_status == ComplianceStatus.PASSED
            ):
                status = "Pass"
            elif (
                assessment.status == AssessmentStatus.COMPLETED
                and assessment.final_compliance_status == ComplianceStatus.FAILED
            ):
                status = "Fail"
            else:
                status = "In Progress"

            # Calculate score based on indicators met (Pass/Conditional) vs total validated
            # This aligns with GAR methodology
            score = None
            if assessment.responses:
                # Count indicators by validation status
                met_count = sum(
                    1
                    for r in assessment.responses
                    if r.validation_status in (ValidationStatus.PASS, ValidationStatus.CONDITIONAL)
                )
                total_validated = sum(
                    1 for r in assessment.responses if r.validation_status is not None
                )

                if total_validated > 0:
                    score = round((met_count / total_validated * 100), 2)
                else:
                    # Fallback to completion percentage if no validation status yet
                    completed = sum(1 for r in assessment.responses if r.is_completed)
                    total = len(assessment.responses)
                    score = round((completed / total * 100), 2) if total > 0 else 0.0

            # Get coordinates (handle missing lat/lng fields gracefully)
            lat = getattr(barangay, "latitude", None) or getattr(barangay, "lat", None)
            lng = getattr(barangay, "longitude", None) or getattr(barangay, "lng", None)

            # Build assessment status from area_results
            # If area_results is missing but assessment is completed, compute it on-the-fly
            assessment_status = None
            area_results_data = assessment.area_results

            # For completed assessments without area_results, compute from responses
            if not area_results_data and assessment.status in [
                AssessmentStatus.COMPLETED,
                AssessmentStatus.AWAITING_MLGOO_APPROVAL,
                AssessmentStatus.AWAITING_FINAL_VALIDATION,
            ]:
                from app.services.intelligence_service import intelligence_service

                try:
                    area_results_data = intelligence_service.get_all_area_results(db, assessment.id)
                except Exception:
                    # If computation fails, continue without area_results
                    pass

            if area_results_data:
                # Build Core indicators
                core_indicators: list[GovernanceAreaIndicator] = []
                core_passed = 0
                for area in GOVERNANCE_AREAS["core"]:
                    # area_results uses full area name as key
                    area_name = str(area["name"])
                    area_code = str(area["code"])
                    area_result = area_results_data.get(area_name)
                    indicator_status: Literal["passed", "failed", "pending"]
                    if area_result is not None:
                        indicator_status = "passed" if area_result.lower() == "passed" else "failed"
                        if indicator_status == "passed":
                            core_passed += 1
                    else:
                        indicator_status = "pending"
                    core_indicators.append(
                        GovernanceAreaIndicator(
                            code=area_code, name=area_name, status=indicator_status
                        )
                    )

                # Build Essential indicators
                essential_indicators: list[GovernanceAreaIndicator] = []
                essential_passed = 0
                for area in GOVERNANCE_AREAS["essential"]:
                    area_name = str(area["name"])
                    area_code = str(area["code"])
                    area_result = area_results_data.get(area_name)
                    indicator_status_e: Literal["passed", "failed", "pending"]
                    if area_result is not None:
                        indicator_status_e = (
                            "passed" if area_result.lower() == "passed" else "failed"
                        )
                        if indicator_status_e == "passed":
                            essential_passed += 1
                    else:
                        indicator_status_e = "pending"
                    essential_indicators.append(
                        GovernanceAreaIndicator(
                            code=area_code, name=area_name, status=indicator_status_e
                        )
                    )

                assessment_status = AssessmentStatusDetail(
                    core=GovernanceAreaBreakdown(
                        passed=core_passed, total=3, indicators=core_indicators
                    ),
                    essential=GovernanceAreaBreakdown(
                        passed=essential_passed, total=3, indicators=essential_indicators
                    ),
                )

            # Build workflow status based on assessment status
            workflow_status = None
            if assessment.status != AssessmentStatus.DRAFT:
                # Determine current phase based on assessment status
                phase_map = {
                    AssessmentStatus.SUBMITTED: "Phase 1: Assessor Review",
                    AssessmentStatus.IN_REVIEW: "Phase 1: Assessor Review",
                    AssessmentStatus.REWORK: "Phase 1: BLGU Rework",
                    AssessmentStatus.AWAITING_FINAL_VALIDATION: "Phase 2: Table Validation",
                    AssessmentStatus.AWAITING_MLGOO_APPROVAL: "Phase 3: MLGOO Approval",
                    AssessmentStatus.COMPLETED: "Completed",
                }
                current_phase = phase_map.get(assessment.status, "Unknown")

                # Determine action needed
                action_needed = "None"
                if assessment.status == AssessmentStatus.REWORK:
                    action_needed = "Rework Required"
                elif assessment.status == AssessmentStatus.SUBMITTED:
                    action_needed = "Awaiting Review"
                elif assessment.status == AssessmentStatus.IN_REVIEW:
                    action_needed = "Under Review"
                elif assessment.status == AssessmentStatus.AWAITING_FINAL_VALIDATION:
                    # Check if any calibration is pending
                    if assessment.pending_calibrations:
                        action_needed = "Waiting for Calibration"
                    elif assessment.is_calibration_rework:
                        action_needed = "Calibration Rework"
                    else:
                        action_needed = "Awaiting Validation"
                elif assessment.status == AssessmentStatus.AWAITING_MLGOO_APPROVAL:
                    if assessment.is_mlgoo_recalibration:
                        action_needed = "RE-calibration Rework"
                    else:
                        action_needed = "Awaiting MLGOO Approval"
                elif assessment.status == AssessmentStatus.COMPLETED:
                    action_needed = "None - Assessment Finalized"

                workflow_status = WorkflowStatusDetail(
                    current_phase=current_phase, action_needed=action_needed
                )

            barangay_map[barangay_id] = BarangayMapPoint(
                barangay_id=barangay_id,
                name=barangay.name,
                lat=lat,
                lng=lng,
                status=status,
                score=score,
                assessment_status=assessment_status,
                workflow_status=workflow_status,
            )

        # Convert to list
        barangay_points = list(barangay_map.values())

        return MapData(barangays=barangay_points)

    def _aggregate_table_data(self, db: Session, query, page: int = 1, page_size: int = 50):
        """
        Aggregate paginated table data for assessments.

        Args:
            db: Database session
            query: Filtered SQLAlchemy query
            page: Page number (1-indexed)
            page_size: Number of rows per page

        Returns:
            TableData schema with paginated rows
        """
        from app.db.enums import ValidationStatus
        from app.schemas.analytics import AssessmentRow, TableData

        # Get total count before pagination
        total_count = query.count()

        # Apply pagination with eager loading for responses and indicators
        # This is critical for calculating governance areas and indicators passed
        offset = (page - 1) * page_size
        assessments = (
            query.options(
                selectinload(Assessment.responses).selectinload(AssessmentResponse.indicator)
            )
            .offset(offset)
            .limit(page_size)
            .all()
        )

        if not assessments:
            return TableData(
                rows=[],
                total_count=total_count,
                page=page,
                page_size=page_size,
            )

        # Build table rows
        rows = []

        for assessment in assessments:
            # Get barangay info
            if not assessment.blgu_user or not assessment.blgu_user.barangay:
                continue

            barangay = assessment.blgu_user.barangay

            # Determine governance area
            # Try to get from barangay or from assessment responses
            governance_area = "N/A"
            if hasattr(barangay, "governance_area") and barangay.governance_area:
                governance_area = barangay.governance_area.name
            elif hasattr(barangay, "governance_area_id") and barangay.governance_area_id:
                # Look up the governance area
                from app.db.models import GovernanceArea

                area = (
                    db.query(GovernanceArea)
                    .filter(GovernanceArea.id == barangay.governance_area_id)
                    .first()
                )
                if area:
                    governance_area = area.name

            # Determine status - only show Pass/Fail if assessment is COMPLETED
            # This ensures consistency with overview tab
            if (
                assessment.status == AssessmentStatus.COMPLETED
                and assessment.final_compliance_status == ComplianceStatus.PASSED
            ):
                status = "Pass"
            elif (
                assessment.status == AssessmentStatus.COMPLETED
                and assessment.final_compliance_status == ComplianceStatus.FAILED
            ):
                status = "Fail"
            else:
                status = "In Progress"

            # Calculate score and metrics based on indicators
            # Only calculate detailed metrics for COMPLETED assessments
            # For in-progress assessments, these fields should remain None/0
            score = None
            indicators_passed = 0
            total_indicators = 0
            governance_areas_passed = 0
            total_governance_areas = 0

            # Only calculate metrics if assessment is COMPLETED
            if assessment.status == AssessmentStatus.COMPLETED and assessment.responses:
                total_indicators = len(assessment.responses)

                # Count indicators passed
                for r in assessment.responses:
                    if r.validation_status in (ValidationStatus.PASS, ValidationStatus.CONDITIONAL):
                        indicators_passed += 1

                # Use stored area_results for governance area counts (source of truth from GAR)
                # This ensures consistency with the overview tab and GAR classification
                if assessment.area_results:
                    total_governance_areas = len(assessment.area_results)
                    # Case-insensitive comparison for defensive coding
                    governance_areas_passed = sum(
                        1
                        for result in assessment.area_results.values()
                        if result and result.lower() == "passed"
                    )

                # Score calculation
                total_validated = sum(
                    1 for r in assessment.responses if r.validation_status is not None
                )

                if total_validated > 0:
                    score = round((indicators_passed / total_validated * 100), 2)
                else:
                    # Fallback to completion percentage if no validation status yet
                    completed = sum(1 for r in assessment.responses if r.is_completed)
                    score = (
                        round((completed / total_indicators * 100), 2)
                        if total_indicators > 0
                        else 0.0
                    )

            rows.append(
                AssessmentRow(
                    barangay_id=barangay.id,
                    barangay_name=barangay.name,
                    governance_area=governance_area,
                    status=status,
                    score=score,
                    governance_areas_passed=governance_areas_passed,
                    total_governance_areas=total_governance_areas,
                    indicators_passed=indicators_passed,
                    total_indicators=total_indicators,
                )
            )

        return TableData(
            rows=rows,
            total_count=total_count,
            page=page,
            page_size=page_size,
        )

    def _build_filtered_query(
        self,
        db: Session,
        filters: ReportsFilters,
        current_user: User,
    ):
        """
        Build dynamic SQLAlchemy query with filters and RBAC.

        Args:
            db: Database session
            filters: ReportsFilters with optional parameters
            current_user: Current user for RBAC filtering

        Returns:
            SQLAlchemy query object with all filters applied
        """
        # Start with base query for assessments
        query = db.query(Assessment).join(User, Assessment.blgu_user_id == User.id)

        # Apply RBAC filtering based on user role
        if current_user.role == UserRole.MLGOO_DILG:
            # MLGOO_DILG sees all data - no additional filters
            pass
        elif current_user.role == UserRole.ASSESSOR:
            # Area Assessor sees only assessments from their assigned governance area
            if current_user.governance_area_id is not None:
                # Join with Barangay to filter by governance area
                query = query.join(Barangay, User.barangay_id == Barangay.id)
                # Note: Assuming Barangay has governance_area_id field
                # If the relationship is different, adjust accordingly
                if hasattr(Barangay, "governance_area_id"):
                    query = query.filter(
                        Barangay.governance_area_id == current_user.governance_area_id
                    )
        elif current_user.role == UserRole.BLGU_USER:
            # BLGU sees only their own barangay's assessment
            if current_user.barangay_id is not None:
                query = query.filter(User.barangay_id == current_user.barangay_id)

        # Apply dynamic filters (only if provided)

        # Filter by assessment year
        if filters.assessment_year is not None:
            query = query.filter(Assessment.assessment_year == filters.assessment_year)
        else:
            # Default to active year if not specified
            from app.services.assessment_year_service import assessment_year_service

            active_year = assessment_year_service.get_active_year_number(db)
            if active_year:
                query = query.filter(Assessment.assessment_year == active_year)

        # Filter by date range
        if filters.start_date is not None:
            query = query.filter(Assessment.submitted_at >= filters.start_date)
        if filters.end_date is not None:
            query = query.filter(Assessment.submitted_at <= filters.end_date)

        # Filter by governance area codes
        if filters.governance_area_codes is not None and len(filters.governance_area_codes) > 0:
            # Need to join with Barangay and GovernanceArea if not already joined
            if not any(
                isinstance(mapper.class_, type(Barangay)) for mapper in query.column_descriptions
            ):
                query = query.join(Barangay, User.barangay_id == Barangay.id)
            # Assuming governance areas are identified by their ID
            # Parse area codes like "GA-1" to extract IDs
            area_ids = []
            for code in filters.governance_area_codes:
                # Handle both "GA-1" format and plain integer strings
                if code.startswith("GA-"):
                    area_ids.append(int(code.split("-")[1]))
                else:
                    try:
                        area_ids.append(int(code))
                    except ValueError:
                        pass
            if area_ids and hasattr(Barangay, "governance_area_id"):
                query = query.filter(Barangay.governance_area_id.in_(area_ids))

        # Filter by barangay IDs
        if filters.barangay_ids is not None and len(filters.barangay_ids) > 0:
            query = query.filter(User.barangay_id.in_(filters.barangay_ids))

        # Filter by status
        if filters.status is not None:
            status_map = {
                "Pass": ComplianceStatus.PASSED,
                "Fail": ComplianceStatus.FAILED,
                "In Progress": None,  # Assessments without final status
            }
            if filters.status in status_map:
                status_value = status_map[filters.status]
                if status_value is None:
                    # In Progress = no final compliance status
                    query = query.filter(Assessment.final_compliance_status.is_(None))
                else:
                    query = query.filter(Assessment.final_compliance_status == status_value)

        return query


# Export singleton instance
analytics_service = AnalyticsService()
