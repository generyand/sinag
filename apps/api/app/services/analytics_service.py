# 📊 Analytics Service
# Business logic for analytics and dashboard KPI calculations

from dataclasses import dataclass
from datetime import date, datetime
from typing import List, Optional

from app.db.enums import ComplianceStatus, UserRole
from app.db.models import Assessment, AssessmentResponse, Barangay, GovernanceArea, Indicator, User
from app.schemas.analytics import (
    AreaBreakdown,
    BarangayRanking,
    ComplianceRate,
    DashboardKPIResponse,
    FailedIndicator,
    ReportsDataResponse,
    TrendData,
)
from sqlalchemy import case, desc, func
from sqlalchemy.orm import Session, joinedload


@dataclass
class ReportsFilters:
    """Data class for reports filtering parameters."""

    cycle_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    governance_area_codes: Optional[List[str]] = None
    barangay_ids: Optional[List[int]] = None
    status: Optional[str] = None


class AnalyticsService:
    """Service class for analytics and dashboard KPI calculations."""

    def get_dashboard_kpis(
        self, db: Session, cycle_id: Optional[int] = None
    ) -> DashboardKPIResponse:
        """
        Get all dashboard KPIs for the MLGOO-DILG dashboard.

        Args:
            db: Database session
            cycle_id: Optional assessment cycle ID (defaults to latest cycle if None)

        Returns:
            DashboardKPIResponse containing all KPI data
        """
        # TODO: When cycle_id is None, fetch the latest cycle from the database
        # For now, we'll use None as a valid filter (all assessments)

        # Calculate all KPIs
        overall_compliance = self._calculate_overall_compliance(db, cycle_id)
        completion_status = self._calculate_completion_status(db, cycle_id)
        area_breakdown = self._calculate_area_breakdown(db, cycle_id)
        top_failed = self._calculate_top_failed_indicators(db, cycle_id)
        rankings = self._calculate_barangay_rankings(db, cycle_id)
        trends = self._calculate_trends(db)

        return DashboardKPIResponse(
            overall_compliance_rate=overall_compliance,
            completion_status=completion_status,
            area_breakdown=area_breakdown,
            top_failed_indicators=top_failed,
            barangay_rankings=rankings,
            trends=trends,
        )

    def _calculate_overall_compliance(
        self, db: Session, cycle_id: Optional[int] = None
    ) -> ComplianceRate:
        """
        Calculate overall compliance rate (pass/fail statistics).

        Args:
            db: Database session
            cycle_id: Optional assessment cycle ID

        Returns:
            ComplianceRate schema with total, passed, failed counts and percentage
        """
        # Build base query for validated assessments
        query = db.query(Assessment).filter(
            Assessment.final_compliance_status.isnot(None)
        )

        # TODO: Add cycle_id filter when cycle field is added to Assessment model
        # if cycle_id is not None:
        #     query = query.filter(Assessment.cycle_id == cycle_id)

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
        passed = sum(
            1 for a in assessments if a.final_compliance_status == ComplianceStatus.PASSED
        )
        failed = sum(
            1 for a in assessments if a.final_compliance_status == ComplianceStatus.FAILED
        )

        # Calculate percentage (handle division by zero)
        pass_percentage = (passed / total_barangays * 100) if total_barangays > 0 else 0.0

        return ComplianceRate(
            total_barangays=total_barangays,
            passed=passed,
            failed=failed,
            pass_percentage=round(pass_percentage, 2),
        )

    def _calculate_completion_status(
        self, db: Session, cycle_id: Optional[int] = None
    ) -> ComplianceRate:
        """
        Calculate completion status (validated vs in-progress assessments).

        Args:
            db: Database session
            cycle_id: Optional assessment cycle ID

        Returns:
            ComplianceRate schema representing completion statistics
        """
        # For completion status, we consider all assessments
        query = db.query(Assessment)

        # TODO: Add cycle_id filter when cycle field is added
        # if cycle_id is not None:
        #     query = query.filter(Assessment.cycle_id == cycle_id)

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
        self, db: Session, cycle_id: Optional[int] = None
    ) -> List[AreaBreakdown]:
        """
        Calculate compliance breakdown by governance area.

        Args:
            db: Database session
            cycle_id: Optional assessment cycle ID

        Returns:
            List of AreaBreakdown schemas, one per governance area
        """
        # Get all governance areas
        governance_areas = db.query(GovernanceArea).all()

        if not governance_areas:
            return []

        # Get validated assessments
        assessment_query = db.query(Assessment).filter(
            Assessment.final_compliance_status.isnot(None)
        )

        # TODO: Add cycle_id filter
        # if cycle_id is not None:
        #     assessment_query = assessment_query.filter(Assessment.cycle_id == cycle_id)

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

            # For each assessment, check if all indicators in this area are completed
            passed_count = 0
            failed_count = 0

            for assessment in validated_assessments:
                # Get responses for this area's indicators
                area_responses = [
                    r for r in assessment.responses
                    if r.indicator_id in indicator_ids
                ]

                if not area_responses:
                    continue

                # Check if all indicators in this area are completed
                all_completed = all(r.is_completed for r in area_responses)

                if all_completed:
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
        self, db: Session, cycle_id: Optional[int] = None
    ) -> List[FailedIndicator]:
        """
        Calculate top 5 most frequently failed indicators.

        Args:
            db: Database session
            cycle_id: Optional assessment cycle ID

        Returns:
            List of FailedIndicator schemas (max 5)
        """
        # Build query for incomplete responses
        query = (
            db.query(
                Indicator.id,
                Indicator.name,
                func.count(AssessmentResponse.id).label("failure_count"),
            )
            .join(AssessmentResponse, AssessmentResponse.indicator_id == Indicator.id)
            .filter(AssessmentResponse.is_completed == False)
        )

        # TODO: Add cycle_id filter via Assessment join
        # if cycle_id is not None:
        #     query = query.join(Assessment).filter(Assessment.cycle_id == cycle_id)

        # Group by indicator, order by count descending, limit to 5
        results = (
            query.group_by(Indicator.id, Indicator.name)
            .order_by(desc("failure_count"))
            .limit(5)
            .all()
        )

        if not results:
            return []

        # Calculate total failures for percentage calculation
        total_failures = sum(r.failure_count for r in results)

        failed_indicators = []
        for result in results:
            percentage = (
                (result.failure_count / total_failures * 100) if total_failures > 0 else 0.0
            )
            failed_indicators.append(
                FailedIndicator(
                    indicator_id=result.id,
                    indicator_name=result.name,
                    failure_count=result.failure_count,
                    percentage=round(percentage, 2),
                )
            )

        return failed_indicators

    def _calculate_barangay_rankings(
        self, db: Session, cycle_id: Optional[int] = None
    ) -> List[BarangayRanking]:
        """
        Calculate barangay rankings based on compliance scores.

        Args:
            db: Database session
            cycle_id: Optional assessment cycle ID

        Returns:
            List of BarangayRanking schemas, ordered by score (descending)
        """
        # Get all assessments with their associated barangays
        query = (
            db.query(
                Barangay.id,
                Barangay.name,
                Assessment.id.label("assessment_id"),
            )
            .join(User, User.barangay_id == Barangay.id)
            .join(Assessment, Assessment.blgu_user_id == User.id)
            .filter(Assessment.final_compliance_status.isnot(None))
        )

        # TODO: Add cycle_id filter
        # if cycle_id is not None:
        #     query = query.filter(Assessment.cycle_id == cycle_id)

        results = query.all()

        if not results:
            return []

        # Calculate score for each barangay
        barangay_scores = {}

        for result in results:
            barangay_id = result.id
            barangay_name = result.name
            assessment_id = result.assessment_id

            # Get all responses for this assessment
            responses = (
                db.query(AssessmentResponse)
                .filter(AssessmentResponse.assessment_id == assessment_id)
                .all()
            )

            if not responses:
                continue

            # Calculate completion percentage as score
            completed = sum(1 for r in responses if r.is_completed)
            total = len(responses)
            score = (completed / total * 100) if total > 0 else 0.0

            barangay_scores[barangay_id] = {
                "name": barangay_name,
                "score": round(score, 2),
            }

        # Convert to list and sort by score
        rankings = [
            {"id": barangay_id, **data}
            for barangay_id, data in barangay_scores.items()
        ]
        rankings.sort(key=lambda x: x["score"], reverse=True)

        # Assign ranks
        barangay_rankings = []
        for rank, item in enumerate(rankings, start=1):
            barangay_rankings.append(
                BarangayRanking(
                    barangay_id=item["id"],
                    barangay_name=item["name"],
                    score=item["score"],
                    rank=rank,
                )
            )

        return barangay_rankings

    def _calculate_trends(self, db: Session) -> List[TrendData]:
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
            cycle_id=filters.cycle_id,
            start_date=datetime.combine(filters.start_date, datetime.min.time()) if filters.start_date else None,
            end_date=datetime.combine(filters.end_date, datetime.min.time()) if filters.end_date else None,
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
            BarChartData,
            ChartData,
            PieChartData,
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

    def _aggregate_bar_chart(self, db: Session, assessments: List[Assessment]) -> List:
        """
        Aggregate bar chart data: pass/fail rates by governance area.

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
            # Get indicator IDs for this governance area
            indicator_ids = [ind.id for ind in area.indicators]

            if not indicator_ids:
                continue

            passed_count = 0
            failed_count = 0

            # For each assessment, check if this governance area passed or failed
            for assessment in assessments:
                if assessment.final_compliance_status is None:
                    # Skip in-progress assessments for bar chart
                    continue

                # Get responses for this area's indicators
                area_responses = [
                    r for r in assessment.responses
                    if r.indicator_id in indicator_ids
                ]

                if not area_responses:
                    continue

                # Check if all indicators in this area are completed
                all_completed = all(r.is_completed for r in area_responses)

                if all_completed:
                    passed_count += 1
                else:
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

    def _aggregate_pie_chart(self, assessments: List[Assessment]) -> List:
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

        # Count assessments by status
        passed_count = sum(
            1 for a in assessments
            if a.final_compliance_status == ComplianceStatus.PASSED
        )
        failed_count = sum(
            1 for a in assessments
            if a.final_compliance_status == ComplianceStatus.FAILED
        )
        in_progress_count = sum(
            1 for a in assessments
            if a.final_compliance_status is None
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

    def _aggregate_line_chart(self, assessments: List[Assessment]) -> List:
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
            month_key = assessment.submitted_at.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

            monthly_data[month_key]["total"] += 1
            if assessment.final_compliance_status == ComplianceStatus.PASSED:
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
        from app.schemas.analytics import BarangayMapPoint, MapData

        # Get all assessments from the filtered query
        assessments = query.all()

        if not assessments:
            return MapData(barangays=[])

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

            # Determine status
            if assessment.final_compliance_status == ComplianceStatus.PASSED:
                status = "Pass"
            elif assessment.final_compliance_status == ComplianceStatus.FAILED:
                status = "Fail"
            else:
                status = "In Progress"

            # Calculate score (completion percentage)
            score = None
            if assessment.responses:
                completed = sum(1 for r in assessment.responses if r.is_completed)
                total = len(assessment.responses)
                score = round((completed / total * 100), 2) if total > 0 else 0.0

            # Get coordinates (handle missing lat/lng fields gracefully)
            lat = getattr(barangay, 'latitude', None) or getattr(barangay, 'lat', None)
            lng = getattr(barangay, 'longitude', None) or getattr(barangay, 'lng', None)

            barangay_map[barangay_id] = BarangayMapPoint(
                barangay_id=barangay_id,
                name=barangay.name,
                lat=lat,
                lng=lng,
                status=status,
                score=score,
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
        from app.schemas.analytics import AssessmentRow, TableData

        # Get total count before pagination
        total_count = query.count()

        # Apply pagination
        offset = (page - 1) * page_size
        assessments = query.offset(offset).limit(page_size).all()

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
            if hasattr(barangay, 'governance_area') and barangay.governance_area:
                governance_area = barangay.governance_area.name
            elif hasattr(barangay, 'governance_area_id') and barangay.governance_area_id:
                # Look up the governance area
                from app.db.models import GovernanceArea
                area = db.query(GovernanceArea).filter(
                    GovernanceArea.id == barangay.governance_area_id
                ).first()
                if area:
                    governance_area = area.name

            # Determine status
            if assessment.final_compliance_status == ComplianceStatus.PASSED:
                status = "Pass"
            elif assessment.final_compliance_status == ComplianceStatus.FAILED:
                status = "Fail"
            else:
                status = "In Progress"

            # Calculate score (completion percentage)
            score = None
            if assessment.responses:
                completed = sum(1 for r in assessment.responses if r.is_completed)
                total = len(assessment.responses)
                score = round((completed / total * 100), 2) if total > 0 else 0.0

            rows.append(
                AssessmentRow(
                    barangay_id=barangay.id,
                    barangay_name=barangay.name,
                    governance_area=governance_area,
                    status=status,
                    score=score,
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
                if hasattr(Barangay, 'governance_area_id'):
                    query = query.filter(Barangay.governance_area_id == current_user.governance_area_id)
        elif current_user.role == UserRole.BLGU_USER:
            # BLGU sees only their own barangay's assessment
            if current_user.barangay_id is not None:
                query = query.filter(User.barangay_id == current_user.barangay_id)

        # Apply dynamic filters (only if provided)

        # Filter by cycle_id
        # TODO: Uncomment when cycle_id field is added to Assessment model
        # if filters.cycle_id is not None:
        #     query = query.filter(Assessment.cycle_id == filters.cycle_id)

        # Filter by date range
        if filters.start_date is not None:
            query = query.filter(Assessment.submitted_at >= filters.start_date)
        if filters.end_date is not None:
            query = query.filter(Assessment.submitted_at <= filters.end_date)

        # Filter by governance area codes
        if filters.governance_area_codes is not None and len(filters.governance_area_codes) > 0:
            # Need to join with Barangay and GovernanceArea if not already joined
            if not any(isinstance(mapper.class_, type(Barangay)) for mapper in query.column_descriptions):
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
            if area_ids and hasattr(Barangay, 'governance_area_id'):
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
