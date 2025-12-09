# Municipal Analytics Service
# Business logic for MLGOO municipal performance overview dashboard
# Provides detailed analytics for internal DILG use (not anonymized)

import logging
from collections import Counter
from datetime import UTC, datetime

from sqlalchemy import and_, case, func
from sqlalchemy.orm import Session, joinedload

from app.db.enums import AreaType, AssessmentStatus, ComplianceStatus, ValidationStatus
from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.models.barangay import Barangay
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from app.schemas.municipal_insights import (
    AggregatedCapDevSummary,
    BarangayAssessmentStatus,
    BarangayStatusList,
    FailingIndicator,
    GovernanceAreaPerformance,
    GovernanceAreaPerformanceList,
    MunicipalComplianceSummary,
    MunicipalOverviewDashboard,
    TopFailingIndicatorsList,
)

logger = logging.getLogger(__name__)


class MunicipalAnalyticsService:
    """
    Service for providing municipal performance analytics to MLGOO.

    Unlike the ExternalAnalyticsService, this service provides detailed,
    non-anonymized data since it's for internal DILG use only.
    """

    def get_compliance_summary(
        self,
        db: Session,
        year: int | None = None,
    ) -> MunicipalComplianceSummary:
        """
        Get municipal-wide compliance summary statistics.

        Args:
            db: Database session
            year: Optional year filter (e.g., 2024, 2025)

        Returns:
            MunicipalComplianceSummary with compliance statistics
        """
        # Count total barangays
        total_barangays = db.query(func.count(Barangay.id)).scalar() or 0

        # Base query for completed assessments
        base_query = db.query(Assessment).filter(Assessment.status == AssessmentStatus.COMPLETED)

        # Filter by year if provided
        if year is not None:
            base_query = base_query.filter(Assessment.assessment_year == year)

        # Get completed assessments with compliance status
        completed_assessments = base_query.all()

        passed_count = sum(
            1 for a in completed_assessments if a.final_compliance_status == ComplianceStatus.PASSED
        )
        failed_count = sum(
            1 for a in completed_assessments if a.final_compliance_status == ComplianceStatus.FAILED
        )
        assessed_count = len(completed_assessments)

        # Count pending MLGOO approval
        pending_mlgoo_query = db.query(func.count(Assessment.id)).filter(
            Assessment.status == AssessmentStatus.AWAITING_MLGOO_APPROVAL
        )
        if year is not None:
            pending_mlgoo_query = pending_mlgoo_query.filter(Assessment.assessment_year == year)
        pending_mlgoo = pending_mlgoo_query.scalar() or 0

        # Count in-progress (draft, submitted, rework, etc.)
        in_progress_statuses = [
            AssessmentStatus.DRAFT,
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.IN_REVIEW,
            AssessmentStatus.REWORK,
            AssessmentStatus.AWAITING_FINAL_VALIDATION,
        ]
        in_progress_query = db.query(func.count(Assessment.id)).filter(
            Assessment.status.in_(in_progress_statuses)
        )
        if year is not None:
            in_progress_query = in_progress_query.filter(Assessment.assessment_year == year)
        in_progress = in_progress_query.scalar() or 0

        # Calculate rates
        compliance_rate = (passed_count / assessed_count * 100) if assessed_count > 0 else 0.0
        assessment_rate = (assessed_count / total_barangays * 100) if total_barangays > 0 else 0.0

        return MunicipalComplianceSummary(
            total_barangays=total_barangays,
            assessed_barangays=assessed_count,
            passed_barangays=passed_count,
            failed_barangays=failed_count,
            compliance_rate=round(compliance_rate, 2),
            assessment_rate=round(assessment_rate, 2),
            pending_mlgoo_approval=pending_mlgoo,
            in_progress=in_progress,
        )

    def get_governance_area_performance(
        self,
        db: Session,
        year: int | None = None,
    ) -> GovernanceAreaPerformanceList:
        """
        Get performance breakdown by governance area.

        Args:
            db: Database session
            year: Optional year filter (e.g., 2024, 2025)

        Returns:
            GovernanceAreaPerformanceList with area-by-area performance
        """
        # Get all governance areas
        governance_areas = db.query(GovernanceArea).order_by(GovernanceArea.id).all()

        # Get completed assessments
        completed_query = db.query(Assessment).filter(
            Assessment.status == AssessmentStatus.COMPLETED
        )
        if year is not None:
            completed_query = completed_query.filter(Assessment.assessment_year == year)
        completed_assessments = completed_query.all()

        if not completed_assessments:
            # Return empty performance if no completed assessments
            areas = [
                GovernanceAreaPerformance(
                    id=ga.id,
                    name=ga.name,
                    area_type=ga.area_type.value if ga.area_type else "CORE",
                    total_indicators=db.query(func.count(Indicator.id))
                    .filter(Indicator.governance_area_id == ga.id)
                    .scalar()
                    or 0,
                    passed_count=0,
                    failed_count=0,
                    pass_rate=0.0,
                    common_weaknesses=[],
                )
                for ga in governance_areas
            ]
            return GovernanceAreaPerformanceList(
                areas=areas,
                core_areas_pass_rate=0.0,
                essential_areas_pass_rate=0.0,
            )

        areas_performance = []
        core_pass_rates = []
        essential_pass_rates = []

        for ga in governance_areas:
            # Get total indicators for this area
            total_indicators = (
                db.query(func.count(Indicator.id))
                .filter(Indicator.governance_area_id == ga.id)
                .scalar()
                or 0
            )

            # Calculate pass/fail counts from area_results in assessments
            passed_count = 0
            failed_count = 0

            for assessment in completed_assessments:
                if assessment.area_results and str(ga.id) in assessment.area_results:
                    area_result = assessment.area_results[str(ga.id)]
                    if area_result.get("passed", False):
                        passed_count += 1
                    else:
                        failed_count += 1

            total_assessed = passed_count + failed_count
            pass_rate = (passed_count / total_assessed * 100) if total_assessed > 0 else 0.0

            # Collect common weaknesses from CapDev insights
            common_weaknesses = self._extract_area_weaknesses(db, ga.id, completed_assessments)

            area_performance = GovernanceAreaPerformance(
                id=ga.id,
                name=ga.name,
                area_type=ga.area_type.value if ga.area_type else "CORE",
                total_indicators=total_indicators,
                passed_count=passed_count,
                failed_count=failed_count,
                pass_rate=round(pass_rate, 2),
                common_weaknesses=common_weaknesses[:3],  # Top 3 weaknesses
            )
            areas_performance.append(area_performance)

            # Track core vs essential rates
            if ga.area_type == AreaType.CORE:
                core_pass_rates.append(pass_rate)
            else:
                essential_pass_rates.append(pass_rate)

        # Calculate average pass rates
        core_avg = sum(core_pass_rates) / len(core_pass_rates) if core_pass_rates else 0.0
        essential_avg = (
            sum(essential_pass_rates) / len(essential_pass_rates) if essential_pass_rates else 0.0
        )

        return GovernanceAreaPerformanceList(
            areas=areas_performance,
            core_areas_pass_rate=round(core_avg, 2),
            essential_areas_pass_rate=round(essential_avg, 2),
        )

    def _extract_area_weaknesses(
        self,
        db: Session,
        governance_area_id: int,
        assessments: list[Assessment],
    ) -> list[str]:
        """Extract common weaknesses for a governance area from CapDev insights."""
        weaknesses = []

        for assessment in assessments:
            if not assessment.capdev_insights:
                continue

            # Check both language variants
            for lang in ["ceb", "en"]:
                if lang not in assessment.capdev_insights:
                    continue

                insights = assessment.capdev_insights[lang]
                if not isinstance(insights, dict):
                    continue

                # Get governance weaknesses that match this area
                for weakness in insights.get("governance_weaknesses", []):
                    if isinstance(weakness, dict):
                        # Match by area name (case-insensitive)
                        area_name = weakness.get("area_name", "")
                        if area_name:
                            weaknesses.append(weakness.get("description", ""))

        # Count frequency and return most common
        counter = Counter(weaknesses)
        return [w for w, _ in counter.most_common(5) if w]

    def get_top_failing_indicators(
        self,
        db: Session,
        limit: int = 10,
        year: int | None = None,
    ) -> TopFailingIndicatorsList:
        """
        Get the most frequently failed indicators.

        Args:
            db: Database session
            limit: Maximum number of indicators to return
            year: Optional year filter (e.g., 2024, 2025)

        Returns:
            TopFailingIndicatorsList with top failing indicators
        """
        # Build base filter conditions
        filter_conditions = [Assessment.status == AssessmentStatus.COMPLETED]
        if year is not None:
            filter_conditions.append(Assessment.assessment_year == year)

        # Query for fail counts per indicator
        fail_counts = (
            db.query(
                AssessmentResponse.indicator_id,
                func.count(
                    case(
                        (
                            AssessmentResponse.validation_status == ValidationStatus.FAIL,
                            1,
                        ),
                        else_=None,
                    )
                ).label("fail_count"),
                func.count(AssessmentResponse.id).label("total_count"),
            )
            .join(Assessment, Assessment.id == AssessmentResponse.assessment_id)
            .filter(and_(*filter_conditions))
            .group_by(AssessmentResponse.indicator_id)
            .having(
                func.count(
                    case(
                        (
                            AssessmentResponse.validation_status == ValidationStatus.FAIL,
                            1,
                        ),
                        else_=None,
                    )
                )
                > 0
            )
            .order_by(
                func.count(
                    case(
                        (
                            AssessmentResponse.validation_status == ValidationStatus.FAIL,
                            1,
                        ),
                        else_=None,
                    )
                ).desc()
            )
            .limit(limit)
            .all()
        )

        failing_indicators = []
        total_unique_query = (
            db.query(func.count(func.distinct(AssessmentResponse.indicator_id)))
            .join(Assessment, Assessment.id == AssessmentResponse.assessment_id)
            .filter(and_(*filter_conditions))
        )
        total_unique_indicators = total_unique_query.scalar() or 0

        for indicator_id, fail_count, total_count in fail_counts:
            # Get indicator details
            indicator = (
                db.query(Indicator)
                .options(joinedload(Indicator.governance_area))
                .filter(Indicator.id == indicator_id)
                .first()
            )

            if not indicator:
                continue

            fail_rate = (fail_count / total_count * 100) if total_count > 0 else 0.0

            # Get common issues from assessor remarks
            common_issues = self._extract_common_issues(db, indicator_id)

            failing_indicators.append(
                FailingIndicator(
                    indicator_id=indicator.id,
                    indicator_code=indicator.indicator_code or f"IND-{indicator.id}",
                    indicator_name=indicator.name,
                    governance_area=indicator.governance_area.name
                    if indicator.governance_area
                    else "Unknown",
                    governance_area_id=indicator.governance_area_id,
                    fail_count=fail_count,
                    total_assessed=total_count,
                    fail_rate=round(fail_rate, 2),
                    common_issues=common_issues[:3],
                )
            )

        return TopFailingIndicatorsList(
            indicators=failing_indicators,
            total_indicators_assessed=total_unique_indicators,
        )

    def _extract_common_issues(
        self,
        db: Session,
        indicator_id: int,
        limit: int = 5,
    ) -> list[str]:
        """Extract common issues from assessor remarks for an indicator."""
        # Get failed responses with remarks
        failed_responses = (
            db.query(AssessmentResponse.assessor_remarks)
            .join(Assessment, Assessment.id == AssessmentResponse.assessment_id)
            .filter(
                and_(
                    AssessmentResponse.indicator_id == indicator_id,
                    AssessmentResponse.validation_status == ValidationStatus.FAIL,
                    AssessmentResponse.assessor_remarks.isnot(None),
                    Assessment.status == AssessmentStatus.COMPLETED,
                )
            )
            .all()
        )

        # Extract and count issues
        issues = [r[0] for r in failed_responses if r[0]]
        counter = Counter(issues)
        return [issue for issue, _ in counter.most_common(limit)]

    def get_aggregated_capdev_summary(
        self,
        db: Session,
        year: int | None = None,
    ) -> AggregatedCapDevSummary:
        """
        Get aggregated capacity development summary across all completed assessments.

        Args:
            db: Database session
            year: Optional year filter (e.g., 2024, 2025)

        Returns:
            AggregatedCapDevSummary with aggregated CapDev data
        """
        # Build filter conditions
        filter_conditions = [
            Assessment.status == AssessmentStatus.COMPLETED,
            Assessment.capdev_insights.isnot(None),
            Assessment.capdev_insights_status == "completed",
        ]
        if year is not None:
            filter_conditions.append(Assessment.assessment_year == year)

        # Get assessments with CapDev insights
        assessments_with_capdev = db.query(Assessment).filter(and_(*filter_conditions)).all()

        total_with_capdev = len(assessments_with_capdev)

        # Aggregate recommendations
        all_recommendations = []
        all_weaknesses_by_area: dict[str, list[str]] = {}
        all_interventions = []
        all_skills = []

        for assessment in assessments_with_capdev:
            if not assessment.capdev_insights:
                continue

            # Process English insights (or fall back to Cebuano)
            insights = assessment.capdev_insights.get(
                "en", assessment.capdev_insights.get("ceb", {})
            )

            if not isinstance(insights, dict):
                continue

            # Aggregate recommendations
            for rec in insights.get("recommendations", []):
                if isinstance(rec, dict) and rec.get("title"):
                    all_recommendations.append(
                        {
                            "title": rec.get("title"),
                            "description": rec.get("description", ""),
                            "priority": rec.get("priority", "medium"),
                            "governance_area": rec.get("governance_area"),
                        }
                    )

            # Aggregate weaknesses by area
            for weakness in insights.get("governance_weaknesses", []):
                if isinstance(weakness, dict):
                    area = weakness.get("area_name", "Other")
                    desc = weakness.get("description", "")
                    if area not in all_weaknesses_by_area:
                        all_weaknesses_by_area[area] = []
                    if desc:
                        all_weaknesses_by_area[area].append(desc)

            # Aggregate interventions
            for intervention in insights.get("suggested_interventions", []):
                if isinstance(intervention, dict) and intervention.get("title"):
                    all_interventions.append(
                        {
                            "type": intervention.get("intervention_type", "training"),
                            "title": intervention.get("title"),
                            "description": intervention.get("description", ""),
                            "target_audience": intervention.get("target_audience", ""),
                        }
                    )

            # Aggregate skills needs
            for need in insights.get("capacity_development_needs", []):
                if isinstance(need, dict):
                    skills = need.get("skills_required", [])
                    if isinstance(skills, list):
                        all_skills.extend(skills)

        # Count frequencies
        rec_counter = Counter(
            (r.get("title", ""), r.get("governance_area")) for r in all_recommendations
        )
        top_recommendations = [
            {
                "title": title,
                "governance_area": area,
                "frequency": count,
            }
            for (title, area), count in rec_counter.most_common(10)
            if title
        ]

        intervention_counter = Counter(i.get("title", "") for i in all_interventions)
        priority_interventions = [
            {
                "title": title,
                "frequency": count,
            }
            for title, count in intervention_counter.most_common(5)
            if title
        ]

        skills_counter = Counter(all_skills)
        skills_gap = dict(skills_counter.most_common(10))

        # Dedupe weaknesses per area
        common_weaknesses_by_area = {}
        for area, weaknesses in all_weaknesses_by_area.items():
            counter = Counter(weaknesses)
            common_weaknesses_by_area[area] = [w for w, _ in counter.most_common(3)]

        return AggregatedCapDevSummary(
            total_assessments_with_capdev=total_with_capdev,
            top_recommendations=top_recommendations,
            common_weaknesses_by_area=common_weaknesses_by_area,
            priority_interventions=priority_interventions,
            skills_gap_analysis=skills_gap,
        )

    def get_barangay_status_list(
        self,
        db: Session,
        include_draft: bool = False,
        year: int | None = None,
    ) -> BarangayStatusList:
        """
        Get assessment status for all barangays.

        Args:
            db: Database session
            include_draft: Whether to include draft assessments
            year: Optional year filter (e.g., 2024, 2025)

        Returns:
            BarangayStatusList with status of each barangay
        """
        # Get all barangays
        barangays = db.query(Barangay).order_by(Barangay.name).all()

        # Get latest assessment for each barangay via BLGU user
        barangay_statuses = []

        for barangay in barangays:
            # Find the BLGU user for this barangay
            blgu_user = db.query(User).filter(User.barangay_id == barangay.id).first()

            if not blgu_user:
                # No user assigned to this barangay
                barangay_statuses.append(
                    BarangayAssessmentStatus(
                        barangay_id=barangay.id,
                        barangay_name=barangay.name,
                        assessment_id=None,
                        status="NO_USER_ASSIGNED",
                        compliance_status=None,
                        submitted_at=None,
                        mlgoo_approved_at=None,
                        overall_score=None,
                        has_capdev_insights=False,
                        capdev_status=None,
                    )
                )
                continue

            # Get the assessment for this BLGU user (filtered by year if specified)
            query = db.query(Assessment).filter(Assessment.blgu_user_id == blgu_user.id)

            # Filter by year if provided
            if year is not None:
                query = query.filter(Assessment.assessment_year == year)

            query = query.order_by(Assessment.created_at.desc())

            if not include_draft:
                # Exclude drafts unless requested
                query = query.filter(Assessment.status != AssessmentStatus.DRAFT)

            assessment = query.first()

            if not assessment:
                barangay_statuses.append(
                    BarangayAssessmentStatus(
                        barangay_id=barangay.id,
                        barangay_name=barangay.name,
                        assessment_id=None,
                        status="NO_ASSESSMENT",
                        compliance_status=None,
                        submitted_at=None,
                        mlgoo_approved_at=None,
                        overall_score=None,
                        has_capdev_insights=False,
                        capdev_status=None,
                    )
                )
                continue

            # Only calculate detailed metrics for COMPLETED assessments
            # For in-progress assessments, these fields should remain None
            overall_score = None
            governance_areas_passed = None
            total_governance_areas = None
            pass_count = None
            conditional_count = None
            total_responses = None

            if assessment.status == AssessmentStatus.COMPLETED:
                # Calculate governance areas from area_results
                # area_results is a dict with area names as keys and "Passed"/"Failed" as values
                if assessment.area_results:
                    passed_areas = sum(
                        1 for result in assessment.area_results.values() if result == "Passed"
                    )
                    total_areas = len(assessment.area_results)
                    if total_areas > 0:
                        overall_score = round(passed_areas / total_areas * 100, 2)
                        governance_areas_passed = passed_areas
                        total_governance_areas = total_areas

                # Calculate indicator counts from assessment responses
                responses = (
                    db.query(AssessmentResponse)
                    .filter(AssessmentResponse.assessment_id == assessment.id)
                    .all()
                )

                if responses:
                    pass_count = sum(
                        1 for r in responses if r.validation_status == ValidationStatus.PASS
                    )
                    conditional_count = sum(
                        1 for r in responses if r.validation_status == ValidationStatus.CONDITIONAL
                    )
                    total_responses = len(responses)

            barangay_statuses.append(
                BarangayAssessmentStatus(
                    barangay_id=barangay.id,
                    barangay_name=barangay.name,
                    assessment_id=assessment.id,
                    status=assessment.status.value,
                    compliance_status=(
                        assessment.final_compliance_status.value
                        if assessment.final_compliance_status
                        else None
                    ),
                    submitted_at=assessment.submitted_at,
                    mlgoo_approved_at=assessment.mlgoo_approved_at,
                    overall_score=overall_score,
                    has_capdev_insights=bool(assessment.capdev_insights),
                    capdev_status=assessment.capdev_insights_status,
                    governance_areas_passed=governance_areas_passed,
                    total_governance_areas=total_governance_areas,
                    pass_count=pass_count,
                    conditional_count=conditional_count,
                    total_responses=total_responses,
                )
            )

        return BarangayStatusList(
            barangays=barangay_statuses,
            total_count=len(barangays),
        )

    def get_municipal_overview_dashboard(
        self,
        db: Session,
        year: int | None = None,
        include_draft: bool = False,
    ) -> MunicipalOverviewDashboard:
        """
        Get complete municipal overview dashboard data.

        Args:
            db: Database session
            year: Optional year filter (e.g., 2024, 2025)
            include_draft: Whether to include draft assessments

        Returns:
            MunicipalOverviewDashboard with all dashboard sections
        """
        logger.info(f"Generating municipal overview dashboard (year: {year or 'latest'})")

        # Gather all dashboard sections
        compliance_summary = self.get_compliance_summary(db, year)
        governance_area_performance = self.get_governance_area_performance(db, year)
        top_failing_indicators = self.get_top_failing_indicators(db, limit=10, year=year)
        capdev_summary = self.get_aggregated_capdev_summary(db, year)
        barangay_statuses = self.get_barangay_status_list(db, include_draft, year)

        return MunicipalOverviewDashboard(
            compliance_summary=compliance_summary,
            governance_area_performance=governance_area_performance,
            top_failing_indicators=top_failing_indicators,
            capdev_summary=capdev_summary,
            barangay_statuses=barangay_statuses,
            generated_at=datetime.now(UTC),
            assessment_cycle=str(year) if year else None,
        )


# Singleton instance
municipal_analytics_service = MunicipalAnalyticsService()
