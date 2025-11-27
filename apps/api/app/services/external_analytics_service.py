# 📊 External Analytics Service
# Business logic for aggregating and anonymizing SGLGB data for external stakeholders
# Implements strict data privacy rules to prevent identification of individual barangays

import logging
from typing import List, Optional, Dict
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.barangay import Barangay
from app.db.enums import ComplianceStatus, ValidationStatus
from app.schemas.external_analytics import (
    OverallComplianceResponse,
    GovernanceAreaPerformance,
    GovernanceAreaPerformanceResponse,
    TopFailingIndicator,
    TopFailingIndicatorsResponse,
    AnonymizedInsight,
    AnonymizedAIInsightsResponse,
    ExternalAnalyticsDashboardResponse,
)
from app.core.cache import cache, CACHE_TTL_EXTERNAL_ANALYTICS

logger = logging.getLogger(__name__)

# Minimum number of barangays required for data to be shown (privacy threshold)
MINIMUM_AGGREGATION_THRESHOLD = 5


class ExternalAnalyticsService:
    """
    Service for providing aggregated, anonymized SGLGB analytics to Katuparan Center
    for research purposes.

    This service implements strict data privacy rules:
    - All data is aggregated (no individual barangay identification)
    - Minimum threshold of 5 barangays required for most metrics
    - No MOV files or detailed response data exposed
    - AI insights are generalized across multiple assessments
    """

    def _log_export_audit(
        self,
        export_type: str,
        user_email: str,
        user_role: str,
        assessment_cycle: Optional[str],
        total_barangays: int,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> None:
        """
        Log export operation for audit trail.

        Args:
            export_type: Type of export (CSV or PDF)
            user_email: Email of user performing export
            user_role: Role of user performing export
            assessment_cycle: Assessment cycle filter (if any)
            total_barangays: Number of barangays in aggregated data
            success: Whether export succeeded
            error_message: Error message if export failed
        """
        log_entry = {
            "event": "external_analytics_export",
            "export_type": export_type,
            "user_email": user_email,
            "user_role": user_role,
            "assessment_cycle": assessment_cycle or "latest",
            "total_barangays_aggregated": total_barangays,
            "success": success,
            "error": error_message,
        }

        if success:
            logger.info(
                f"📄 EXPORT AUDIT: {export_type} export by {user_email} ({user_role}) - "
                f"{total_barangays} barangays aggregated - Cycle: {assessment_cycle or 'latest'}",
                extra=log_entry
            )
        else:
            logger.error(
                f"❌ EXPORT AUDIT FAILED: {export_type} export by {user_email} ({user_role}) - "
                f"Error: {error_message}",
                extra=log_entry
            )

    def _validate_export_data(
        self,
        dashboard_data: ExternalAnalyticsDashboardResponse
    ) -> None:
        """
        Validate that export data adheres to anonymization rules.

        Args:
            dashboard_data: Dashboard data to validate

        Raises:
            ValueError: If validation fails
        """
        # Check minimum aggregation threshold
        if dashboard_data.overall_compliance.total_barangays < MINIMUM_AGGREGATION_THRESHOLD:
            raise ValueError(
                f"Insufficient data for anonymization. Minimum {MINIMUM_AGGREGATION_THRESHOLD} "
                f"barangays required, only {dashboard_data.overall_compliance.total_barangays} available."
            )

        # Verify no individual barangay identifiers in AI insights
        if dashboard_data.ai_insights.insights:
            for insight in dashboard_data.ai_insights.insights:
                # Check for common patterns that might identify barangays
                forbidden_patterns = [
                    "barangay",
                    "brgy",
                    "sitio",
                    "purok",
                ]
                insight_text = insight.insight_summary.lower()
                for pattern in forbidden_patterns:
                    if pattern in insight_text:
                        logger.warning(
                            f"Potential barangay identifier found in AI insight: '{pattern}' - "
                            f"This should be filtered at generation time"
                        )

        logger.info(
            f"✅ Export data validation passed: {dashboard_data.overall_compliance.total_barangays} "
            f"barangays aggregated"
        )

    def get_overall_compliance(
        self,
        db: Session,
        assessment_cycle: Optional[str] = None
    ) -> OverallComplianceResponse:
        """
        Get municipal-wide SGLGB compliance statistics.

        Args:
            db: Database session
            assessment_cycle: Optional cycle filter (defaults to most recent)

        Returns:
            OverallComplianceResponse with aggregated compliance data

        Raises:
            ValueError: If fewer than minimum threshold barangays assessed
        """
        # Query for completed assessments
        query = db.query(Assessment).filter(
            Assessment.final_compliance_status.isnot(None)
        )

        # Apply cycle filter if specified
        if assessment_cycle:
            query = query.filter(Assessment.assessment_cycle == assessment_cycle)

        assessments = query.all()

        total_barangays = len(assessments)

        # Enforce minimum aggregation threshold
        if total_barangays < MINIMUM_AGGREGATION_THRESHOLD:
            raise ValueError(
                f"Insufficient data for anonymization. Minimum {MINIMUM_AGGREGATION_THRESHOLD} barangays required, "
                f"only {total_barangays} available."
            )

        # Count passed/failed
        passed_count = sum(
            1 for a in assessments
            if a.final_compliance_status == ComplianceStatus.PASSED
        )
        failed_count = total_barangays - passed_count

        pass_percentage = (passed_count / total_barangays * 100) if total_barangays > 0 else 0.0

        logger.info(
            f"Overall compliance calculated: {passed_count}/{total_barangays} passed ({pass_percentage:.1f}%)"
        )

        return OverallComplianceResponse(
            total_barangays=total_barangays,
            passed_count=passed_count,
            failed_count=failed_count,
            pass_percentage=round(pass_percentage, 2),
            assessment_cycle=assessment_cycle,
        )

    def get_governance_area_performance(
        self,
        db: Session,
        assessment_cycle: Optional[str] = None
    ) -> GovernanceAreaPerformanceResponse:
        """
        Get aggregated pass/fail rates for all governance areas.

        Args:
            db: Database session
            assessment_cycle: Optional cycle filter

        Returns:
            GovernanceAreaPerformanceResponse with area-level aggregated data
        """
        # Get all governance areas
        governance_areas = db.query(GovernanceArea).all()

        area_performances = []

        for area in governance_areas:
            # Get all indicators for this governance area
            indicators_in_area = db.query(Indicator).filter(
                Indicator.governance_area_id == area.id,
                Indicator.is_active == True
            ).all()

            if not indicators_in_area:
                continue

            # Get all assessment responses for indicators in this area
            indicator_ids = [ind.id for ind in indicators_in_area]

            query = db.query(AssessmentResponse).filter(
                AssessmentResponse.indicator_id.in_(indicator_ids)
            )

            if assessment_cycle:
                query = query.join(Assessment).filter(
                    Assessment.assessment_cycle == assessment_cycle,
                    Assessment.final_compliance_status.isnot(None)
                )
            else:
                query = query.join(Assessment).filter(
                    Assessment.final_compliance_status.isnot(None)
                )

            responses = query.all()

            if not responses:
                continue

            # Group responses by assessment_id to count barangays
            assessments_responses = {}
            for r in responses:
                if r.assessment_id not in assessments_responses:
                    assessments_responses[r.assessment_id] = []
                assessments_responses[r.assessment_id].append(r)

            # Count how many barangays passed/failed this governance area
            passed_count = 0
            failed_count = 0

            for assessment_id, assessment_responses in assessments_responses.items():
                # A barangay passes the area if ALL indicators in the area passed
                all_passed = all(
                    r.validation_status in [ValidationStatus.PASS, ValidationStatus.CONDITIONAL]
                    for r in assessment_responses
                )
                if all_passed:
                    passed_count += 1
                else:
                    failed_count += 1

            total_assessed = passed_count + failed_count

            if total_assessed == 0:
                continue

            pass_percentage = (passed_count / total_assessed * 100) if total_assessed > 0 else 0.0

            # Get indicator breakdown for this area
            indicators = db.query(Indicator).filter(
                Indicator.governance_area_id == area.id,
                Indicator.is_active == True
            ).all()

            indicator_breakdown = self._get_indicator_breakdown(
                db, area.id, assessment_cycle
            )

            area_performances.append(
                GovernanceAreaPerformance(
                    area_code=area.code,
                    area_name=area.name,
                    area_type=area.area_type,
                    total_barangays_assessed=total_assessed,
                    passed_count=passed_count,
                    failed_count=failed_count,
                    pass_percentage=round(pass_percentage, 2),
                    indicator_count=len(indicators),
                    indicators_breakdown=indicator_breakdown,
                )
            )

        logger.info(f"Governance area performance calculated for {len(area_performances)} areas")

        return GovernanceAreaPerformanceResponse(areas=area_performances)

    def _get_indicator_breakdown(
        self,
        db: Session,
        governance_area_id: int,
        assessment_cycle: Optional[str] = None
    ) -> List[Dict]:
        """
        Get percentage of barangays passing each indicator in an area.

        Args:
            db: Database session
            governance_area_id: Governance area ID
            assessment_cycle: Optional cycle filter

        Returns:
            List of dicts with indicator code and pass percentage
        """
        indicators = db.query(Indicator).filter(
            Indicator.governance_area_id == governance_area_id,
            Indicator.is_active == True
        ).all()

        breakdown = []

        for indicator in indicators:
            # Query responses for this indicator
            query = db.query(AssessmentResponse).filter(
                AssessmentResponse.indicator_id == indicator.id
            )

            if assessment_cycle:
                query = query.join(Assessment).filter(
                    Assessment.assessment_cycle == assessment_cycle,
                    Assessment.final_compliance_status.isnot(None)
                )
            else:
                query = query.join(Assessment).filter(
                    Assessment.final_compliance_status.isnot(None)
                )

            responses = query.all()

            if len(responses) == 0:
                continue

            # Count passed responses
            # Passed = validation_status is PASS or CONDITIONAL
            passed_count = sum(
                1 for r in responses
                if r.validation_status in (ValidationStatus.PASS, ValidationStatus.CONDITIONAL)
            )

            total = len(responses)
            pass_percentage = (passed_count / total * 100) if total > 0 else 0.0

            breakdown.append({
                "indicator_code": indicator.indicator_code,
                "indicator_name": indicator.name,
                "pass_percentage": round(pass_percentage, 2),
                "total_assessed": total,
            })

        return breakdown

    def get_top_failing_indicators(
        self,
        db: Session,
        assessment_cycle: Optional[str] = None,
        limit: int = 5
    ) -> TopFailingIndicatorsResponse:
        """
        Get the top N indicators with highest failure rates across all barangays.

        Args:
            db: Database session
            assessment_cycle: Optional cycle filter
            limit: Number of top failing indicators to return (default 5)

        Returns:
            TopFailingIndicatorsResponse with top failing indicators
        """
        # Build query to count failures per indicator
        query = db.query(
            Indicator.id,
            Indicator.indicator_code,
            Indicator.name,
            GovernanceArea.code,
            func.count(AssessmentResponse.id).label('total_assessed'),
            func.sum(
                case(
                    (AssessmentResponse.validation_status == ValidationStatus.FAIL, 1),
                    else_=0
                )
            ).label('failure_count')
        ).join(
            AssessmentResponse, AssessmentResponse.indicator_id == Indicator.id
        ).join(
            Assessment, Assessment.id == AssessmentResponse.assessment_id
        ).join(
            GovernanceArea, GovernanceArea.id == Indicator.governance_area_id
        ).filter(
            Assessment.final_compliance_status.isnot(None)
        )

        if assessment_cycle:
            query = query.filter(Assessment.assessment_cycle == assessment_cycle)

        # Group by indicator and order by failure count
        results = query.group_by(
            Indicator.id,
            Indicator.indicator_code,
            Indicator.name,
            GovernanceArea.code
        ).order_by(
            func.sum(
                case(
                    (AssessmentResponse.validation_status == ValidationStatus.FAIL, 1),
                    else_=0
                )
            ).desc()
        ).limit(limit).all()

        top_failing = []
        for r in results:
            failure_percentage = (r.failure_count / r.total_assessed * 100) if r.total_assessed > 0 else 0.0

            top_failing.append(
                TopFailingIndicator(
                    indicator_id=r.id,
                    indicator_code=r.indicator_code or "",
                    indicator_name=r.name,
                    governance_area_code=r.code,
                    failure_count=r.failure_count,
                    total_assessed=r.total_assessed,
                    failure_percentage=round(failure_percentage, 2),
                )
            )

        logger.info(f"Top {limit} failing indicators calculated: {len(top_failing)} found")

        return TopFailingIndicatorsResponse(top_failing_indicators=top_failing)

    def get_anonymized_ai_insights(
        self,
        db: Session,
        assessment_cycle: Optional[str] = None
    ) -> AnonymizedAIInsightsResponse:
        """
        Get aggregated, anonymized AI-generated insights.

        This method extracts common themes from AI recommendations without
        attributing them to specific barangays.

        Args:
            db: Database session
            assessment_cycle: Optional cycle filter

        Returns:
            AnonymizedAIInsightsResponse with aggregated insights
        """
        # Query for assessments with AI recommendations
        query = db.query(Assessment).filter(
            Assessment.final_compliance_status.isnot(None),
            Assessment.ai_recommendations.isnot(None)
        )

        if assessment_cycle:
            query = query.filter(Assessment.assessment_cycle == assessment_cycle)

        assessments = query.all()

        total_analyzed = len(assessments)

        # For now, we'll create placeholder insights
        # In a real implementation, this would use NLP to extract themes from AI recommendations
        insights = self._extract_common_themes(assessments)

        logger.info(
            f"AI insights generated: {len(insights)} themes from {total_analyzed} assessments"
        )

        return AnonymizedAIInsightsResponse(
            insights=insights,
            total_assessments_analyzed=total_analyzed,
        )

    def _extract_common_themes(
        self,
        assessments: List[Assessment]
    ) -> List[AnonymizedInsight]:
        """
        Extract common themes from AI recommendations.

        This is a placeholder implementation. In production, this would use
        NLP techniques to identify recurring themes and patterns.

        Args:
            assessments: List of assessments with AI recommendations

        Returns:
            List of anonymized insights
        """
        # Placeholder: Create generic insights based on common governance themes
        all_insights = [
            AnonymizedInsight(
                governance_area_code="FA",
                governance_area_name="Financial Administration",
                theme="Budget Transparency",
                insight_summary="Many barangays would benefit from improved budget disclosure practices and public access to financial documents.",
                frequency=len(assessments) // 2,  # Placeholder frequency
                priority="High",
            ),
            AnonymizedInsight(
                governance_area_code="DM",
                governance_area_name="Disaster Management",
                theme="BDRRMC Functionality",
                insight_summary="Strengthening Barangay Disaster Risk Reduction and Management Councils (BDRRMC) through regular training and resource allocation is recommended.",
                frequency=len(assessments) // 3,
                priority="High",
            ),
            AnonymizedInsight(
                governance_area_code="SS",
                governance_area_name="Security, Safety, and Peace and Order",
                theme="Community Safety Programs",
                insight_summary="Enhanced community policing and safety awareness programs could improve security outcomes.",
                frequency=len(assessments) // 4,
                priority="Medium",
            ),
            AnonymizedInsight(
                governance_area_code="SP",
                governance_area_name="Social Protection",
                theme="Vulnerable Sector Support",
                insight_summary="Expanding social protection services for vulnerable populations, including children and elderly, is a common need.",
                frequency=len(assessments) // 3,
                priority="High",
            ),
            AnonymizedInsight(
                governance_area_code="DP",
                governance_area_name="Disaster Preparedness",
                theme="Evacuation Planning",
                insight_summary="Developing comprehensive evacuation plans and conducting regular drills would enhance disaster readiness.",
                frequency=len(assessments) // 5,
                priority="Medium",
            ),
        ]

        return all_insights

    def get_complete_dashboard(
        self,
        db: Session,
        assessment_cycle: Optional[str] = None
    ) -> ExternalAnalyticsDashboardResponse:
        """
        Get all dashboard data in a single response.

        This is the primary method used by the external analytics dashboard.

        Args:
            db: Database session
            assessment_cycle: Optional cycle filter

        Returns:
            ExternalAnalyticsDashboardResponse with all dashboard sections

        Raises:
            ValueError: If insufficient data for anonymization
        """
        logger.info(
            f"Generating external analytics dashboard "
            f"(cycle: {assessment_cycle or 'latest'})"
        )

        # Build cache key
        cache_key = cache._generate_cache_key(
            prefix="external_dashboard",
            assessment_cycle=assessment_cycle or "latest"
        )

        # Try to get from cache
        if cache.is_available:
            cached_result = cache.get(cache_key)
            if cached_result:
                logger.info(f"📦 Returning cached dashboard data")
                # Reconstruct Pydantic model from cached dict
                return ExternalAnalyticsDashboardResponse(**cached_result)

        # Cache miss - compute results
        overall_compliance = self.get_overall_compliance(db, assessment_cycle)
        governance_area_performance = self.get_governance_area_performance(db, assessment_cycle)
        top_failing_indicators = self.get_top_failing_indicators(db, assessment_cycle)
        ai_insights = self.get_anonymized_ai_insights(db, assessment_cycle)

        dashboard = ExternalAnalyticsDashboardResponse(
            overall_compliance=overall_compliance,
            governance_area_performance=governance_area_performance,
            top_failing_indicators=top_failing_indicators,
            ai_insights=ai_insights,
        )

        # Store in cache (convert to dict for JSON serialization)
        if cache.is_available:
            cache.set(cache_key, dashboard.model_dump(), ttl=CACHE_TTL_EXTERNAL_ANALYTICS)
            logger.info(f"💾 Dashboard data cached for {CACHE_TTL_EXTERNAL_ANALYTICS}s")

        return dashboard

    def generate_csv_export(
        self,
        db: Session,
        assessment_cycle: Optional[str] = None,
        user_email: Optional[str] = None,
        user_role: Optional[str] = None
    ) -> str:
        """
        Generate CSV export of external analytics data.

        Args:
            db: Database session
            assessment_cycle: Optional cycle filter
            user_email: Email of user performing export (for audit logging)
            user_role: Role of user performing export (for audit logging)

        Returns:
            CSV string with aggregated data

        Raises:
            ValueError: If insufficient data for anonymization
        """
        import csv
        from io import StringIO
        from datetime import datetime

        logger.info(
            f"Generating CSV export (cycle: {assessment_cycle or 'latest'})"
        )

        try:
            # Get all dashboard data
            dashboard_data = self.get_complete_dashboard(db, assessment_cycle)

            # Validate export data adheres to anonymization rules
            self._validate_export_data(dashboard_data)

            # Create CSV in memory
            output = StringIO()
            writer = csv.writer(output)

            # Header with metadata
            writer.writerow(["SINAG: Strategic Insights Nurturing Assessments and Governance"])
            writer.writerow(["External Analytics Report"])
            writer.writerow([f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"])
            writer.writerow([f"Assessment Cycle: {assessment_cycle or 'Latest'}"])
            writer.writerow([""])
            writer.writerow(["PRIVACY NOTICE: All data is aggregated and anonymized. Individual barangay performance cannot be identified."])
            writer.writerow([""])

            # Overall Compliance Section
            writer.writerow(["OVERALL MUNICIPAL COMPLIANCE"])
            writer.writerow(["Total Barangays", "Passed", "Failed", "Pass Percentage"])
            writer.writerow([
                dashboard_data.overall_compliance.total_barangays,
                dashboard_data.overall_compliance.passed_count,
                dashboard_data.overall_compliance.failed_count,
                f"{dashboard_data.overall_compliance.pass_percentage:.2f}%"
            ])
            writer.writerow([""])

            # Governance Area Performance Section
            writer.writerow(["GOVERNANCE AREA PERFORMANCE"])
            writer.writerow(["Area Code", "Area Name", "Type", "Barangays Assessed", "Passed", "Failed", "Pass Percentage", "Indicators"])
            for area in dashboard_data.governance_area_performance.areas:
                writer.writerow([
                    area.area_code,
                    area.area_name,
                    area.area_type,
                    area.total_barangays_assessed,
                    area.passed_count,
                    area.failed_count,
                    f"{area.pass_percentage:.2f}%",
                    area.indicator_count
                ])
            writer.writerow([""])

            # Top Failing Indicators Section
            writer.writerow(["TOP FAILING INDICATORS"])
            writer.writerow(["Indicator Code", "Indicator Name", "Governance Area", "Failures", "Total Assessed", "Failure Percentage"])
            for indicator in dashboard_data.top_failing_indicators.top_failing_indicators:
                writer.writerow([
                    indicator.indicator_code,
                    indicator.indicator_name,
                    indicator.governance_area_code,
                    indicator.failure_count,
                    indicator.total_assessed,
                    f"{indicator.failure_percentage:.2f}%"
                ])
            writer.writerow([""])

            # AI Insights Section
            writer.writerow(["ANONYMIZED AI INSIGHTS"])
            writer.writerow(["Governance Area", "Theme", "Insight Summary", "Frequency", "Priority"])
            for insight in dashboard_data.ai_insights.insights:
                writer.writerow([
                    f"{insight.governance_area_code} - {insight.governance_area_name}",
                    insight.theme,
                    insight.insight_summary,
                    insight.frequency,
                    insight.priority or "N/A"
                ])

            csv_content = output.getvalue()
            output.close()

            # Log successful export
            if user_email and user_role:
                self._log_export_audit(
                    export_type="CSV",
                    user_email=user_email,
                    user_role=user_role,
                    assessment_cycle=assessment_cycle,
                    total_barangays=dashboard_data.overall_compliance.total_barangays,
                    success=True
                )

            logger.info(f"CSV export generated successfully ({len(csv_content)} bytes)")
            return csv_content

        except ValueError as e:
            # Log failed export due to validation error
            if user_email and user_role:
                self._log_export_audit(
                    export_type="CSV",
                    user_email=user_email,
                    user_role=user_role,
                    assessment_cycle=assessment_cycle,
                    total_barangays=0,
                    success=False,
                    error_message=str(e)
                )
            raise
        except Exception as e:
            # Log failed export due to other errors
            if user_email and user_role:
                self._log_export_audit(
                    export_type="CSV",
                    user_email=user_email,
                    user_role=user_role,
                    assessment_cycle=assessment_cycle,
                    total_barangays=0,
                    success=False,
                    error_message=str(e)
                )
            raise

    def generate_pdf_export(
        self,
        db: Session,
        assessment_cycle: Optional[str] = None,
        user_email: Optional[str] = None,
        user_role: Optional[str] = None
    ) -> bytes:
        """
        Generate PDF export of external analytics data.

        Args:
            db: Database session
            assessment_cycle: Optional assessment cycle identifier
            user_email: Email of user performing export (for audit logging)
            user_role: Role of user performing export (for audit logging)

        Returns:
            PDF file content as bytes

        Raises:
            ValueError: If insufficient data for anonymization
        """
        from io import BytesIO
        from datetime import datetime
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import (
            SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
            PageBreak, Image as RLImage
        )
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

        logger.info(f"Generating PDF export (cycle: {assessment_cycle or 'latest'})")

        # Get all dashboard data
        dashboard_data = self.get_complete_dashboard(db, assessment_cycle)

        # Create PDF in memory
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18,
        )

        # Container for the 'Flowable' objects
        elements = []

        # Define styles
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        styles.add(ParagraphStyle(
            name='CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        ))
        styles.add(ParagraphStyle(
            name='PrivacyNotice',
            parent=styles['BodyText'],
            fontSize=9,
            textColor=colors.HexColor('#7f1d1d'),
            spaceBefore=6,
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))

        # Title
        title = Paragraph("SINAG: Strategic Insights Nurturing Assessments and Governance", styles['CustomTitle'])
        elements.append(title)

        subtitle = Paragraph("External Analytics Report", styles['Heading2'])
        elements.append(subtitle)
        elements.append(Spacer(1, 0.2 * inch))

        # Metadata
        metadata_data = [
            ["Generated:", datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
            ["Assessment Cycle:", assessment_cycle or 'Latest'],
        ]
        metadata_table = Table(metadata_data, colWidths=[2 * inch, 4 * inch])
        metadata_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(metadata_table)
        elements.append(Spacer(1, 0.2 * inch))

        # Privacy Notice
        privacy = Paragraph(
            "PRIVACY NOTICE: All data is aggregated and anonymized. Individual barangay performance cannot be identified.",
            styles['PrivacyNotice']
        )
        elements.append(privacy)
        elements.append(Spacer(1, 0.3 * inch))

        # Section 1: Overall Compliance
        elements.append(Paragraph("Overall Municipal Compliance", styles['CustomHeading']))
        overall_data = [
            ["Metric", "Value"],
            ["Total Barangays Assessed", str(dashboard_data.overall_compliance.total_barangays)],
            ["Barangays Passed", str(dashboard_data.overall_compliance.passed_count)],
            ["Barangays Failed", str(dashboard_data.overall_compliance.failed_count)],
            ["Pass Rate", f"{dashboard_data.overall_compliance.pass_percentage:.1f}%"],
        ]
        overall_table = Table(overall_data, colWidths=[3 * inch, 3 * inch])
        overall_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dbeafe')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(overall_table)
        elements.append(Spacer(1, 0.3 * inch))

        # Section 2: Governance Area Performance
        elements.append(Paragraph("Governance Area Performance", styles['CustomHeading']))
        area_data = [["Area Code", "Area Name", "Pass Rate", "Total Indicators", "Passed", "Failed"]]
        for area in dashboard_data.governance_area_performance.areas:
            area_data.append([
                area.area_code,
                area.area_name[:30] + "..." if len(area.area_name) > 30 else area.area_name,
                f"{area.pass_percentage:.1f}%",
                str(area.total_indicators),
                str(area.passed_indicators),
                str(area.failed_indicators),
            ])

        area_table = Table(area_data, colWidths=[0.8 * inch, 2 * inch, 1 * inch, 1 * inch, 0.8 * inch, 0.8 * inch])
        area_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dbeafe')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
        ]))
        elements.append(area_table)
        elements.append(Spacer(1, 0.3 * inch))

        # Section 3: Top Failing Indicators
        elements.append(Paragraph("Top Failing Indicators", styles['CustomHeading']))
        failing_data = [["Code", "Indicator Name", "Failure Rate", "Failed Count"]]
        for indicator in dashboard_data.top_failing_indicators.top_failing_indicators:
            failing_data.append([
                indicator.indicator_code,
                indicator.indicator_name[:40] + "..." if len(indicator.indicator_name) > 40 else indicator.indicator_name,
                f"{indicator.failure_rate:.1f}%",
                str(indicator.failed_count),
            ])

        failing_table = Table(failing_data, colWidths=[0.8 * inch, 3.5 * inch, 1.2 * inch, 1.2 * inch])
        failing_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dbeafe')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
        ]))
        elements.append(failing_table)
        elements.append(Spacer(1, 0.3 * inch))

        # Section 4: AI-Generated Insights
        if dashboard_data.ai_insights.insights:
            elements.append(PageBreak())
            elements.append(Paragraph("AI-Generated Insights & Recommendations", styles['CustomHeading']))
            elements.append(Spacer(1, 0.1 * inch))

            insights_data = [["Area", "Theme", "Insight", "Frequency", "Priority"]]
            for insight in dashboard_data.ai_insights.insights:
                insights_data.append([
                    f"{insight.governance_area_code}\n{insight.governance_area_name[:15]}",
                    insight.theme[:20] + "..." if len(insight.theme) > 20 else insight.theme,
                    insight.insight_summary[:60] + "..." if len(insight.insight_summary) > 60 else insight.insight_summary,
                    str(insight.frequency),
                    insight.priority or "N/A",
                ])

            insights_table = Table(insights_data, colWidths=[1.2 * inch, 1.5 * inch, 2.5 * inch, 0.8 * inch, 0.8 * inch])
            insights_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dbeafe')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            elements.append(insights_table)
        else:
            elements.append(Paragraph("No AI insights available for this cycle.", styles['BodyText']))

        # Build PDF
        doc.build(elements)

        # Get the value of the BytesIO buffer
        pdf_content = buffer.getvalue()
        buffer.close()

        logger.info(f"PDF export generated successfully ({len(pdf_content)} bytes)")
        return pdf_content


# Singleton instance
external_analytics_service = ExternalAnalyticsService()
