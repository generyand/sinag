# 📋 Assessment Service
# Business logic for assessment management operations

import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status  # type: ignore[reportMissingImports]
from sqlalchemy import and_, func  # type: ignore[reportMissingImports]
from sqlalchemy.orm import Session, joinedload, selectinload  # type: ignore[reportMissingImports]

from app.db.enums import AssessmentStatus, MOVStatus
from app.db.models import (
    MOV,
    Assessment,
    AssessmentResponse,
    FeedbackComment,
    GovernanceArea,
    Indicator,
    User,
)
from app.schemas.assessment import (
    AssessmentCreate,
    AssessmentDashboardResponse,
    AssessmentDashboardStats,
    AssessmentResponseCreate,
    AssessmentResponseUpdate,
    AssessmentSubmissionValidation,
    FeedbackCommentCreate,
    FormSchemaValidation,
    GovernanceAreaProgress,
    MOVCreate,
    ProgressSummary,
)
from app.services.completeness_validation_service import completeness_validation_service
from app.services.year_config_service import indicator_snapshot_service


class AssessmentService:
    """Service for managing BLGU assessment submissions and validation workflow.

    This service handles the complete SGLGB assessment lifecycle including:
    - Assessment creation and retrieval for BLGU users
    - Response management (create, update, validate completion)
    - MOV (Means of Verification) file handling
    - Assessment submission and preliminary compliance checks
    - Dashboard data aggregation and progress tracking
    - Feedback comment management for assessor communications

    **SGLGB Workflow Stages**:
    1. DRAFT: Initial assessment creation
    2. SUBMITTED_FOR_REVIEW: BLGU submits for assessor review
    3. NEEDS_REWORK: Assessor requests changes (one rework cycle allowed)
    4. VALIDATED: Final assessor approval

    **Business Rules**:
    - Each BLGU user can have only one assessment
    - All indicators must have responses before submission
    - "YES" answers require MOVs (Means of Verification)
    - Assessments can be sent for rework only once (rework_count limit)
    - Response completion status is auto-calculated based on form_schema requirements

    See Also:
        - docs/workflows/blgu-assessment.md: BLGU submission workflow
        - docs/workflows/assessor-validation.md: Assessor review process
        - apps/api/app/api/v1/assessments.py: API endpoints
    """

    def __init__(self) -> None:
        """Initialize the AssessmentService with logging."""
        self.logger = logging.getLogger(__name__)

    # ----- Serialization helpers -----
    def _serialize_response_obj(self, response: AssessmentResponse | None) -> dict[str, Any] | None:
        """Serialize AssessmentResponse ORM model to dictionary for JSON responses.

        Args:
            response: AssessmentResponse instance to serialize, or None

        Returns:
            Dictionary with response fields (id, response_data, is_completed, etc.) or None
        """
        if response is None:
            return None
        return {
            "id": response.id,
            "response_data": response.response_data,
            "is_completed": response.is_completed,
            "requires_rework": response.requires_rework,
            "assessment_id": response.assessment_id,
            "indicator_id": response.indicator_id,
            "created_at": response.created_at.isoformat() + "Z" if response.created_at else None,
            "updated_at": response.updated_at.isoformat() + "Z" if response.updated_at else None,
        }

    def _serialize_mov_list(self, movs: list[MOV] | None) -> list[dict[str, Any]]:
        """Serialize list of MOV ORM models to dictionaries for JSON responses.

        Args:
            movs: List of MOV instances to serialize, or None

        Returns:
            List of dictionaries with MOV fields (id, filename, storage_path, etc.)
        """
        if not movs:
            return []
        return [
            {
                "id": mov.id,
                "filename": mov.filename,
                "original_filename": mov.original_filename,
                "file_size": mov.file_size,
                "content_type": mov.content_type,
                "storage_path": mov.storage_path,
                "status": mov.status.value if hasattr(mov.status, "value") else mov.status,
                "response_id": mov.response_id,
                "uploaded_at": (mov.uploaded_at.isoformat() + "Z") if mov.uploaded_at else None,
            }
            for mov in movs
        ]

    def get_assessment_for_blgu(
        self, db: Session, blgu_user_id: int, assessment_year: int | None = None
    ) -> Assessment | None:
        """
        Get the assessment for a specific BLGU user, optionally filtered by year.

        Args:
            db: Database session
            blgu_user_id: ID of the BLGU user
            assessment_year: Optional year filter. If not provided, gets the
                            assessment for the active year.

        Returns:
            Assessment object or None if not found
        """
        from app.services.assessment_year_service import assessment_year_service

        query = db.query(Assessment).filter(Assessment.blgu_user_id == blgu_user_id)

        if assessment_year is not None:
            query = query.filter(Assessment.assessment_year == assessment_year)
        else:
            # Default to active year
            try:
                active_year = assessment_year_service.get_active_year_number(db)
                query = query.filter(Assessment.assessment_year == active_year)
            except ValueError:
                # No active year configured, return None
                return None

        return query.first()

    def get_all_assessments_for_blgu(
        self, db: Session, blgu_user_id: int
    ) -> list[Assessment]:
        """
        Get all assessments for a BLGU user across all years.

        Args:
            db: Database session
            blgu_user_id: ID of the BLGU user

        Returns:
            List of Assessment objects ordered by year descending
        """
        return (
            db.query(Assessment)
            .filter(Assessment.blgu_user_id == blgu_user_id)
            .order_by(Assessment.assessment_year.desc())
            .all()
        )

    def get_assessment_with_responses(self, db: Session, assessment_id: int) -> Assessment | None:
        """
        Get assessment with all its responses and related data.

        Args:
            db: Database session
            assessment_id: ID of the assessment

        Returns:
            Assessment with responses or None if not found
        """
        return (
            db.query(Assessment)
            .options(
                joinedload(Assessment.responses).joinedload(AssessmentResponse.indicator),
                joinedload(Assessment.responses).joinedload(AssessmentResponse.movs),
                joinedload(Assessment.responses).joinedload(AssessmentResponse.feedback_comments),
                joinedload(Assessment.mov_files),  # Load new MOVFile model
            )
            .filter(Assessment.id == assessment_id)
            .first()
        )

    def get_assessment_for_blgu_with_full_data(
        self, db: Session, blgu_user_id: int, assessment_year: int | None = None
    ) -> dict[str, Any] | None:
        """
        Get complete assessment data for BLGU user including all governance areas,
        indicators, and responses.

        PERFORMANCE: Uses 3 simple queries instead of one mega query to avoid
        timeouts with the Supabase connection pooler. Each query is simple and fast,
        and the results are merged in Python (which is very fast).

        Query 1: User + Barangay + Assessment (with auto-create)
        Query 2: Static data - Governance areas + Indicators (cacheable)
        Query 3: User data - Responses + MOVs + Comments

        Args:
            db: Database session
            blgu_user_id: ID of the BLGU user
            assessment_year: Optional year filter. If not provided, uses active year.

        Returns:
            Dictionary with assessment and governance areas data
        """
        import logging
        import time

        logger = logging.getLogger(__name__)

        total_start = time.time()
        from sqlalchemy import text

        # Initialize year placeholder resolver for dynamic year resolution
        from app.core.year_resolver import get_year_resolver
        from app.services.assessment_year_service import assessment_year_service

        # Determine the assessment year to use
        if assessment_year is None:
            try:
                assessment_year = assessment_year_service.get_active_year_number(db)
            except ValueError:
                logger.error("No active assessment year configured")
                return None

        try:
            year_resolver = get_year_resolver(db, year=assessment_year)
        except ValueError:
            # If year resolution fails, continue without it
            year_resolver = None

        try:
            # QUERY 1a: Ensure assessment exists for this year (INSERT if not exists)
            step_start = time.time()
            q1a = text("""
                INSERT INTO assessments (
                    blgu_user_id, assessment_year, status, created_at, updated_at,
                    rework_count, is_calibration_rework, calibration_count,
                    is_mlgoo_recalibration, mlgoo_recalibration_count, is_locked_for_deadline
                )
                SELECT :user_id, :year, 'DRAFT', NOW(), NOW(),
                       0, false, 0, false, 0, false
                WHERE NOT EXISTS (
                    SELECT 1 FROM assessments
                    WHERE blgu_user_id = :user_id AND assessment_year = :year
                )
            """)
            db.execute(q1a, {"user_id": blgu_user_id, "year": assessment_year})
            db.commit()

            # QUERY 1b: Get user + barangay + assessment for specific year
            q1b = text("""
                SELECT
                    u.id as user_id, u.barangay_id, b.name as barangay_name,
                    a.id as assessment_id, a.status, a.created_at, a.updated_at,
                    a.submitted_at, a.validated_at, a.rework_requested_at,
                    a.is_mlgoo_recalibration, a.mlgoo_recalibration_requested_at,
                    a.mlgoo_recalibration_indicator_ids, a.mlgoo_recalibration_comments,
                    a.mlgoo_recalibration_count, a.assessment_year
                FROM users u
                LEFT JOIN barangays b ON u.barangay_id = b.id
                LEFT JOIN assessments a ON a.blgu_user_id = u.id AND a.assessment_year = :year
                WHERE u.id = :user_id
            """)
            result1 = db.execute(q1b, {"user_id": blgu_user_id, "year": assessment_year})
            row1 = result1.fetchone()
            logger.info(f"[PERF] Query 1 (user+assessment): {time.time() - step_start:.2f}s")

            if not row1:
                logger.error(f"User {blgu_user_id} not found")
                return None

            user_info = {
                "user_id": row1[0],
                "barangay_id": row1[1],
                "barangay_name": row1[2],
            }
            assessment_info = {
                "id": row1[3],
                "status": row1[4],
                "created_at": row1[5].isoformat() + "Z" if row1[5] else None,
                "updated_at": row1[6].isoformat() + "Z" if row1[6] else None,
                "submitted_at": row1[7].isoformat() + "Z" if row1[7] else None,
                "validated_at": row1[8].isoformat() + "Z" if row1[8] else None,
                "rework_requested_at": row1[9].isoformat() + "Z" if row1[9] else None,
                "is_mlgoo_recalibration": row1[10],
                "mlgoo_recalibration_requested_at": row1[11].isoformat() + "Z"
                if row1[11]
                else None,
                "mlgoo_recalibration_indicator_ids": row1[12],
                "mlgoo_recalibration_comments": row1[13],
                "mlgoo_recalibration_count": row1[14],
                "assessment_year": row1[15] if len(row1) > 15 else assessment_year,
            }

            if not assessment_info["id"]:
                logger.error(f"Assessment not created for user {blgu_user_id}")
                return None

            assessment_id = assessment_info["id"]

            # QUERY 2: Get static data - governance areas and indicators
            step_start = time.time()
            q2 = text("""
                SELECT
                    ga.id as ga_id, ga.name as ga_name, ga.area_type,
                    i.id as ind_id, i.name as ind_name, i.description,
                    i.indicator_code, i.form_schema, i.governance_area_id,
                    i.parent_id, i.sort_order
                FROM governance_areas ga
                LEFT JOIN indicators i ON i.governance_area_id = ga.id
                ORDER BY ga.id, i.sort_order, i.indicator_code
            """)
            result2 = db.execute(q2)
            rows2 = result2.fetchall()
            logger.info(f"[PERF] Query 2 (static data): {time.time() - step_start:.2f}s")

            # Build governance areas and indicators from static data
            governance_areas_raw = {}
            indicators_raw = []
            for row in rows2:
                ga_id = row[0]
                if ga_id not in governance_areas_raw:
                    governance_areas_raw[ga_id] = {
                        "id": ga_id,
                        "name": row[1],
                        "area_type": row[2],
                    }
                if row[3]:  # has indicator
                    # Apply year placeholder resolution to name, description, and form_schema
                    ind_name = row[4]
                    ind_description = row[5]
                    ind_form_schema = row[7]

                    if year_resolver:
                        ind_name = year_resolver.resolve_string(ind_name)
                        ind_description = year_resolver.resolve_string(ind_description)
                        ind_form_schema = year_resolver.resolve_schema(ind_form_schema)

                    indicators_raw.append(
                        {
                            "id": row[3],
                            "name": ind_name,
                            "description": ind_description,
                            "indicator_code": row[6],
                            "form_schema": ind_form_schema,
                            "governance_area_id": row[8],
                            "parent_id": row[9],
                            "sort_order": row[10],
                            # Will be filled in from query 3
                            "response_id": None,
                            "response_data": None,
                            "is_completed": None,
                            "requires_rework": None,
                            "generated_remark": None,
                            "movs": [],
                            "comments": [],
                        }
                    )

            # QUERY 3: Get user-specific data - responses, MOVs, comments
            step_start = time.time()
            q3 = text("""
                SELECT
                    ar.id as response_id, ar.indicator_id, ar.response_data,
                    ar.is_completed, ar.requires_rework, ar.generated_remark,
                    m.id as mov_id, m.original_filename, m.file_size,
                    m.storage_path, m.content_type, m.status as mov_status,
                    fc.id as comment_id, fc.comment, fc.comment_type,
                    fc.is_internal_note, fc.assessor_id, fc.created_at
                FROM assessment_responses ar
                LEFT JOIN movs m ON m.response_id = ar.id
                LEFT JOIN feedback_comments fc ON fc.response_id = ar.id AND fc.is_internal_note = false
                WHERE ar.assessment_id = :assessment_id
                ORDER BY ar.indicator_id
            """)
            result3 = db.execute(q3, {"assessment_id": assessment_id})
            rows3 = result3.fetchall()
            logger.info(f"[PERF] Query 3 (user data): {time.time() - step_start:.2f}s")

            # Build responses, MOVs, comments lookup
            responses_by_indicator = {}
            movs_by_response = {}
            comments_by_response = {}

            for row in rows3:
                response_id = row[0]
                indicator_id = row[1]

                # Build response entry
                if indicator_id not in responses_by_indicator:
                    responses_by_indicator[indicator_id] = {
                        "id": response_id,
                        "response_data": row[2],
                        "is_completed": row[3],
                        "requires_rework": row[4],
                        "generated_remark": row[5],
                    }

                # Build MOV entry
                mov_id = row[6]
                if mov_id and response_id not in movs_by_response:
                    movs_by_response[response_id] = {}
                if mov_id and mov_id not in movs_by_response.get(response_id, {}):
                    movs_by_response.setdefault(response_id, {})[mov_id] = {
                        "id": mov_id,
                        "name": row[7],
                        "size": row[8],
                        "storage_path": row[9],
                        "content_type": row[10],
                        "status": row[11],
                    }

                # Build comment entry
                comment_id = row[12]
                if comment_id and response_id not in comments_by_response:
                    comments_by_response[response_id] = {}
                if comment_id and comment_id not in comments_by_response.get(response_id, {}):
                    comments_by_response.setdefault(response_id, {})[comment_id] = {
                        "id": comment_id,
                        "comment": row[13],
                        "comment_type": row[14],
                        "is_internal_note": row[15],
                        "assessor_id": row[16],
                        "created_at": row[17].isoformat() + "Z" if row[17] else None,
                    }

            # Merge response data into indicators
            for ind in indicators_raw:
                ind_id = ind["id"]
                if ind_id in responses_by_indicator:
                    resp = responses_by_indicator[ind_id]
                    ind["response_id"] = resp["id"]
                    ind["response_data"] = resp["response_data"]
                    ind["is_completed"] = resp["is_completed"]
                    ind["requires_rework"] = resp["requires_rework"]
                    ind["generated_remark"] = resp["generated_remark"]
                    ind["movs"] = list(movs_by_response.get(resp["id"], {}).values())
                    ind["comments"] = list(comments_by_response.get(resp["id"], {}).values())

            governance_areas_list = list(governance_areas_raw.values())

        except Exception as e:
            logger.error(f"Error in get_assessment_for_blgu_with_full_data: {e}")
            import traceback

            logger.error(traceback.format_exc())
            raise

        # Process the JSON results (fast, in-memory)
        step_start = time.time()

        # Build assessment dict
        assessment_dict = {
            "id": assessment_info.get("id"),
            "status": assessment_info.get("status"),
            "blgu_user_id": blgu_user_id,
            "barangay_id": user_info.get("barangay_id"),
            "barangay_name": user_info.get("barangay_name"),
            "created_at": assessment_info.get("created_at"),
            "updated_at": assessment_info.get("updated_at"),
            "submitted_at": assessment_info.get("submitted_at"),
            "validated_at": assessment_info.get("validated_at"),
            "rework_requested_at": assessment_info.get("rework_requested_at"),
            "is_mlgoo_recalibration": assessment_info.get("is_mlgoo_recalibration"),
            "mlgoo_recalibration_requested_at": assessment_info.get(
                "mlgoo_recalibration_requested_at"
            ),
            "mlgoo_recalibration_indicator_ids": assessment_info.get(
                "mlgoo_recalibration_indicator_ids"
            ),
            "mlgoo_recalibration_comments": assessment_info.get("mlgoo_recalibration_comments"),
            "mlgoo_recalibration_count": assessment_info.get("mlgoo_recalibration_count"),
        }

        # Build lookup structures
        indicators_by_area: dict[int, list[dict]] = {}
        children_by_parent: dict[int | None, list[dict]] = {}

        for ind in indicators_raw:
            ga_id = ind.get("governance_area_id")
            parent_id = ind.get("parent_id")
            indicators_by_area.setdefault(ga_id, []).append(ind)
            children_by_parent.setdefault(parent_id, []).append(ind)

        def serialize_indicator_node(ind: dict) -> dict[str, Any]:
            """Serialize an indicator dict and attach nested children."""
            response_obj = None
            if ind.get("response_id") is not None:
                response_obj = {
                    "id": ind["response_id"],
                    "response_data": ind.get("response_data"),
                    "is_completed": ind.get("is_completed"),
                    "requires_rework": ind.get("requires_rework"),
                    "generated_remark": ind.get("generated_remark"),
                }

            movs_list = ind.get("movs") or []
            comments_list = ind.get("comments") or []

            node = {
                "id": ind["id"],
                "indicator_code": ind.get("indicator_code"),
                "name": ind.get("name"),
                "description": ind.get("description"),
                "form_schema": ind.get("form_schema"),
                "response": response_obj,
                "movs": movs_list,
                "feedback_comments": comments_list,
                "children": [],
            }

            children = children_by_parent.get(ind["id"], [])
            children_sorted = sorted(
                children, key=lambda x: (x.get("sort_order") or 0, x.get("indicator_code") or "")
            )
            for child in children_sorted:
                node["children"].append(serialize_indicator_node(child))
            return node

        # Build governance areas with nested indicators
        governance_areas_data = []
        for area in governance_areas_list:
            area_data = {
                "id": area["id"],
                "name": area["name"],
                "area_type": area["area_type"],
                "indicators": [],
            }

            top_level_inds = [
                ind
                for ind in indicators_by_area.get(area["id"], [])
                if ind.get("parent_id") is None
            ]
            top_level_inds.sort(
                key=lambda x: (x.get("sort_order") or 0, x.get("indicator_code") or "")
            )

            for ind in top_level_inds:
                area_data["indicators"].append(serialize_indicator_node(ind))

            governance_areas_data.append(area_data)

        logger.info(f"[PERF] Process results: {time.time() - step_start:.2f}s")
        logger.info(
            f"[PERF] TOTAL get_assessment_for_blgu_with_full_data: {time.time() - total_start:.2f}s"
        )

        return {
            "assessment": assessment_dict,
            "governance_areas": governance_areas_data,
        }

    def _ensure_governance_areas_exist(self, db: Session) -> None:
        """Ensure the 6 governance areas exist. Creates them if missing (dev use)."""
        from app.db.enums import AreaType
        from app.db.models.governance_area import GovernanceArea

        existing = {ga.name for ga in db.query(GovernanceArea).all()}
        required = [
            ("Financial Administration and Sustainability", AreaType.CORE),
            ("Disaster Preparedness", AreaType.CORE),
            ("Safety, Peace and Order", AreaType.CORE),
            ("Social Protection and Sensitivity", AreaType.ESSENTIAL),
            ("Business-Friendliness and Competitiveness", AreaType.ESSENTIAL),
            ("Environmental Management", AreaType.ESSENTIAL),
        ]

        created_any = False
        for name, area_type in required:
            if name not in existing:
                db.add(GovernanceArea(name=name, area_type=area_type))
                created_any = True

        if created_any:
            db.commit()

        # NOTE: Cleanup disabled due to foreign key constraint violations
        # The BBI table has a NOT NULL constraint on governance_area_id
        # Deleting governance areas would violate this constraint
        #
        # # Cleanup any non-required areas accidentally created in dev (e.g., Tourism)
        # allowed = {name for name, _ in required}
        # extras = (
        #     db.query(GovernanceArea)
        #     .filter(~GovernanceArea.name.in_(list(allowed)))
        #     .all()
        # )
        # if extras:
        #     for ga in extras:
        #         db.delete(ga)
        #     db.commit()

    def _build_fi_mock_subindicators(self, base_indicator, base_response) -> list[dict[str, Any]]:
        """
        Build 4 mock sub-indicators for Area 1 (for frontend testing only).
        These reuse the REAL assessment response (if any) of the base indicator
        so the frontend can POST MOVs using a valid response_id.
        """
        subs: list[dict[str, Any]] = []

        # Determine an id that the frontend can use for MOV upload. Prefer the
        # real response id; if none exists yet, fall back to the base indicator id
        # (upload will 404 until a real response is created by the client elsewhere).
        safe_id = base_response.id if base_response else base_indicator.id
        safe_movs = base_response.movs if base_response else []
        serialized_response = self._serialize_response_obj(base_response)
        serialized_movs = self._serialize_mov_list(safe_movs)

        # 1.1.1 – Posted documents (child indicator under 1.1 Compliance)
        subs.append(
            {
                "id": str(safe_id + 1000),  # Use unique ID for child
                # Backend indicator to use when creating/updating responses (existing DB row)
                "responseIndicatorId": base_indicator.id,
                "code": "1.1.1",
                "name": "Posted CY 2023 financial documents in the BFDP board",
                "description": "Posted the following CY 2023 financial documents in the BFDP board, pursuant to DILG MC No. 2014-81 and DILG MC No. 2022-027:",
                "technicalNotes": "See form schema for requirements",
                "governanceAreaId": "1",
                "status": "completed"
                if serialized_response and serialized_response.get("is_completed")
                else "not_started",
                "complianceAnswer": "yes"
                if serialized_response
                and serialized_response.get("response_data", {}).get("compliance") == "yes"
                else "no",
                "assessorComment": None,
                "responseData": serialized_response.get("response_data", {})
                if serialized_response
                else {},
                "requiresRework": serialized_response.get("requires_rework", False)
                if serialized_response
                else False,
                "responseId": serialized_response.get("id") if serialized_response else None,
                "response": serialized_response,
                "movs": serialized_movs,
                "feedback_comments": [],
                "children": [],  # Add children field for consistency
                "form_schema": {
                    "type": "object",
                    "title": "1.1.1 - Posted CY 2023 financial documents in the BFDP board",
                    "description": "Requirements for posting financial documents in the BFDP board",
                    "properties": {
                        "bfdp_monitoring_forms_compliance": {
                            "type": "string",
                            "title": "Three (3) BFDP Monitoring Form A of the DILG Advisory covering the 1st to 3rd quarter monitoring data signed by the City Director/C/MLGOO, Punong Barangay and Barangay Secretary",
                            "description": "Check this box if you have uploaded the required 3 BFDP Monitoring Forms",
                            "mov_upload_section": "bfdp_monitoring_forms",
                            "enum": ["yes", "no", "na"],
                        },
                        "photo_documentation_compliance": {
                            "type": "string",
                            "title": "Two (2) Photo Documentation of the BFDP board showing the name of the barangay",
                            "description": "Check this box if you have uploaded the required 2 photos of the BFDP board",
                            "mov_upload_section": "photo_documentation",
                            "enum": ["yes", "no", "na"],
                        },
                    },
                    "required": [
                        "bfdp_monitoring_forms_compliance",
                        "photo_documentation_compliance",
                    ],
                },
            }
        )

        # The additional sub-indicators (1.1.2, 1.2.1, 1.3.1) are disabled for now
        # to focus on a single assessment indicator in the UI.
        # Uncomment blocks below when ready to enable them again.
        #
        # subs.append({ ... 1.1.2 ... })
        # subs.append({ ... 1.2.1 ... })
        # subs.append({ ... 1.3.1 ... })

        return subs

    def _build_mock_subindicators_for_area(
        self, base_indicator, base_response, area_id: int
    ) -> list[dict[str, Any]]:
        """
        Build mock sub-indicators for areas 2-6 using the EXACT same structure as Area 1.
        These are mock/test indicators that reuse the REAL assessment response (if any) of the base indicator
        so the frontend can POST MOVs using a valid response_id.
        """
        subs: list[dict[str, Any]] = []

        # Determine an id that the frontend can use for MOV upload. Prefer the
        # real response id; if none exists yet, fall back to the base indicator id
        # (upload will 404 until a real response is created by the client elsewhere).
        safe_id = base_response.id if base_response else base_indicator.id
        safe_movs = base_response.movs if base_response else []
        serialized_response = self._serialize_response_obj(base_response)
        serialized_movs = self._serialize_mov_list(safe_movs)

        # Area-specific configurations (same structure as Area 1, but only 1 indicator per area 2-6)
        area_configs = {
            2: {
                "code": "2.1.1",
                "name": "Organized Barangay Disaster Risk Reduction and Management Council (BDRRMC)",
                "description": "BDRRMC is organized with proper documentation and regular meetings",
                "field1": {
                    "name": "bdrrmc_documents_compliance",
                    "title": "BDRRMC Documents: Barangay Resolution establishing BDRRMC, Minutes of meetings, and Documentation of composition",
                    "description": "Check this box if you have uploaded the required BDRRMC documents",
                    "section": "bdrrmc_documents",
                },
            },
            3: {
                "code": "3.1.1",
                "name": "Organized Barangay Peace and Order Council (BPOC)",
                "description": "BPOC is organized with proper documentation and functional activities",
                "field1": {
                    "name": "bpoc_documents_compliance",
                    "title": "BPOC Documents: Barangay Resolution establishing BPOC, Minutes of meetings, and Documentation of composition",
                    "description": "Check this box if you have uploaded the required BPOC documents",
                    "section": "bpoc_documents",
                },
            },
            4: {
                "code": "4.1.1",
                "name": "Social Welfare Programs Implementation",
                "description": "Comprehensive social welfare programs are implemented for vulnerable sectors",
                "field1": {
                    "name": "social_welfare_documents_compliance",
                    "title": "Social Welfare Documents: Documentation of programs for senior citizens, PWDs, and indigent families",
                    "description": "Check this box if you have uploaded the required social welfare documents",
                    "section": "social_welfare_documents",
                },
            },
            5: {
                "code": "5.1.1",
                "name": "Business Registration Process",
                "description": "Efficient and streamlined business registration process exists",
                "field1": {
                    "name": "business_registration_documents_compliance",
                    "title": "Business Registration Documents: Process documentation and registration forms",
                    "description": "Check this box if you have uploaded the required business registration documents",
                    "section": "business_registration_documents",
                },
            },
            6: {
                "code": "6.1.1",
                "name": "Organized Barangay Environment and Solid Waste Management Council (BESWMC)",
                "description": "BESWMC is organized with proper documentation and active programs",
                "field1": {
                    "name": "beswmc_documents_compliance",
                    "title": "BESWMC Documents: Barangay Resolution establishing BESWMC, Minutes of meetings, and Documentation of composition",
                    "description": "Check this box if you have uploaded the required BESWMC documents",
                    "section": "beswmc_documents",
                },
            },
        }

        config = area_configs.get(area_id)
        if not config:
            return subs

        # Build child indicator with EXACT same structure as Area 1
        subs.append(
            {
                "id": str(safe_id + 1000),  # Use unique ID for child
                # Backend indicator to use when creating/updating responses (existing DB row)
                "responseIndicatorId": base_indicator.id,
                "code": config["code"],
                "name": config["name"],
                "description": config["description"],
                "technicalNotes": "See form schema for requirements",
                "governanceAreaId": str(area_id),
                "status": "completed"
                if serialized_response and serialized_response.get("is_completed")
                else "not_started",
                "complianceAnswer": None,  # Will be derived from response_data
                "assessorComment": None,
                "responseData": serialized_response.get("response_data", {})
                if serialized_response
                else {},
                "requiresRework": serialized_response.get("requires_rework", False)
                if serialized_response
                else False,
                "responseId": serialized_response.get("id") if serialized_response else None,
                "response": serialized_response,
                "movs": serialized_movs,
                "feedback_comments": [],
                "children": [],
                "form_schema": {
                    "type": "object",
                    "title": f"{config['code']} - {config['name']}",
                    "description": config["description"],
                    "properties": {
                        config["field1"]["name"]: {  # type: ignore[index]
                            "type": "string",
                            "title": config["field1"]["title"],  # type: ignore[index]
                            "description": config["field1"]["description"],  # type: ignore[index]
                            "mov_upload_section": config["field1"]["section"],  # type: ignore[index]
                            "enum": ["yes", "no", "na"],
                        }
                    },
                    "required": [config["field1"]["name"]],  # type: ignore[index]
                },
            }
        )

        # Extract compliance answer if available (same logic as Area 1)
        child_data = subs[0]["responseData"]
        if child_data:
            # Check for any "yes" value in the response data
            for key, value in child_data.items():
                if isinstance(value, str) and value.lower() == "yes":
                    subs[0]["complianceAnswer"] = "yes"
                    break
                elif isinstance(value, bool) and value:
                    subs[0]["complianceAnswer"] = "yes"
                    break

        return subs

    def _create_sample_indicators(self, db: Session) -> None:
        """Create sample indicators for development/testing purposes."""

        # Sample indicators for each governance area
        sample_indicators = [
            # Financial Administration and Sustainability
            {
                "name": "Budget Planning and Execution",
                "description": "The barangay has a comprehensive budget plan that is properly executed and monitored.",
                "form_schema": {
                    "type": "object",
                    "properties": {
                        "has_budget_plan": {
                            "type": "boolean",
                            "title": "Has Budget Plan",
                        },
                        "budget_amount": {"type": "number", "title": "Budget Amount"},
                        "notes": {"type": "string", "title": "Additional Notes"},
                    },
                    "required": ["has_budget_plan"],
                },
                "governance_area_id": 1,
            },
            # Disaster Preparedness
            {
                "name": "Disaster Risk Reduction Plan",
                "description": "The barangay has a comprehensive disaster risk reduction and management plan.",
                "form_schema": {
                    "type": "object",
                    "properties": {
                        "has_drr_plan": {"type": "boolean", "title": "Has DRR Plan"},
                        "plan_year": {"type": "string", "title": "Plan Year"},
                        "evacuation_centers": {
                            "type": "number",
                            "title": "Number of Evacuation Centers",
                        },
                    },
                    "required": ["has_drr_plan"],
                },
                "governance_area_id": 2,
            },
            # Safety, Peace and Order
            {
                "name": "Peace and Order Committee",
                "description": "The barangay has an active peace and order committee with regular activities.",
                "form_schema": {
                    "type": "object",
                    "properties": {
                        "has_committee": {
                            "type": "boolean",
                            "title": "Has Peace and Order Committee",
                        },
                        "meetings_per_year": {
                            "type": "number",
                            "title": "Meetings per Year",
                        },
                        "activities": {"type": "string", "title": "Key Activities"},
                    },
                    "required": ["has_committee"],
                },
                "governance_area_id": 3,
            },
            # Social Protection and Sensitivity
            {
                "name": "Social Welfare Programs",
                "description": "The barangay implements social welfare programs for vulnerable sectors.",
                "form_schema": {
                    "type": "object",
                    "properties": {
                        "has_programs": {
                            "type": "boolean",
                            "title": "Has Social Welfare Programs",
                        },
                        "program_count": {
                            "type": "number",
                            "title": "Number of Programs",
                        },
                        "beneficiaries": {
                            "type": "number",
                            "title": "Number of Beneficiaries",
                        },
                    },
                    "required": ["has_programs"],
                },
                "governance_area_id": 4,
            },
            # Business-Friendliness and Competitiveness
            {
                "name": "Business Support Services",
                "description": "The barangay provides support services for local businesses and entrepreneurs.",
                "form_schema": {
                    "type": "object",
                    "properties": {
                        "has_services": {
                            "type": "boolean",
                            "title": "Has Business Support Services",
                        },
                        "service_types": {
                            "type": "string",
                            "title": "Types of Services",
                        },
                        "businesses_served": {
                            "type": "number",
                            "title": "Number of Businesses Served",
                        },
                    },
                    "required": ["has_services"],
                },
                "governance_area_id": 5,
            },
            # Environmental Management
            {
                "name": "Environmental Programs",
                "description": "The barangay implements environmental protection and sustainability programs.",
                "form_schema": {
                    "type": "object",
                    "properties": {
                        "has_programs": {
                            "type": "boolean",
                            "title": "Has Environmental Programs",
                        },
                        "program_types": {
                            "type": "string",
                            "title": "Types of Programs",
                        },
                        "trees_planted": {
                            "type": "number",
                            "title": "Trees Planted This Year",
                        },
                    },
                    "required": ["has_programs"],
                },
                "governance_area_id": 6,
            },
        ]

        for indicator_data in sample_indicators:
            indicator = Indicator(**indicator_data)
            db.add(indicator)

        db.commit()
        print(f"Created {len(sample_indicators)} sample indicators")

    def create_assessment(self, db: Session, assessment_create: AssessmentCreate) -> Assessment:
        """
        Create a new assessment for a BLGU user.

        The assessment will be created for:
        - The specified assessment_year if provided in assessment_create
        - Otherwise, the currently active assessment year

        Args:
            db: Database session
            assessment_create: Assessment creation data

        Returns:
            Created Assessment object

        Raises:
            HTTPException: If assessment already exists for this user/year combo,
                          or if no active year exists
        """
        from app.services.assessment_year_service import assessment_year_service

        # Determine the assessment year
        if assessment_create.assessment_year is not None:
            assessment_year = assessment_create.assessment_year
            # Verify the year exists
            year_record = assessment_year_service.get_year_by_number(db, assessment_year)
            if not year_record:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Assessment year {assessment_year} does not exist",
                )
        else:
            # Use the active year
            try:
                assessment_year = assessment_year_service.get_active_year_number(db)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No active assessment year configured. Cannot create assessment.",
                )

        # Check if assessment already exists for this user/year combination
        existing = self.get_assessment_for_blgu(
            db, assessment_create.blgu_user_id, assessment_year=assessment_year
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Assessment already exists for this BLGU user for year {assessment_year}",
            )

        db_assessment = Assessment(
            blgu_user_id=assessment_create.blgu_user_id,
            assessment_year=assessment_year,
            status=AssessmentStatus.DRAFT,
        )

        db.add(db_assessment)
        db.commit()
        db.refresh(db_assessment)
        return db_assessment

    def get_assessment_response(self, db: Session, response_id: int) -> AssessmentResponse | None:
        """
        Get an assessment response by ID.

        Args:
            db: Database session
            response_id: ID of the response

        Returns:
            AssessmentResponse object or None if not found
        """
        return (
            db.query(AssessmentResponse)
            .options(
                selectinload(AssessmentResponse.indicator),
                selectinload(AssessmentResponse.movs),
                selectinload(AssessmentResponse.feedback_comments),
            )
            .filter(AssessmentResponse.id == response_id)
            .first()
        )

    def create_assessment_response(
        self, db: Session, response_create: AssessmentResponseCreate
    ) -> AssessmentResponse:
        """
        Create a new assessment response.

        Args:
            db: Database session
            response_create: Response creation data

        Returns:
            Created AssessmentResponse object
        """
        # Check if response already exists for this assessment and indicator
        existing = (
            db.query(AssessmentResponse)
            .filter(
                and_(
                    AssessmentResponse.assessment_id == response_create.assessment_id,
                    AssessmentResponse.indicator_id == response_create.indicator_id,
                )
            )
            .first()
        )

        if existing:
            # Idempotent behavior: return the existing response instead of erroring
            return existing

        # Get assessment to check status and rework timestamp
        assessment = (
            db.query(Assessment).filter(Assessment.id == response_create.assessment_id).first()
        )

        initial_data = response_create.response_data or {}
        db_response = AssessmentResponse(
            response_data=initial_data,
            assessment_id=response_create.assessment_id,
            indicator_id=response_create.indicator_id,
        )

        # Initialize completion based on current schema if available
        try:
            if db_response.indicator and db_response.indicator.form_schema:
                db_response.is_completed = self._check_response_completion(
                    form_schema=db_response.indicator.form_schema,
                    response_data=initial_data,
                    movs=[],
                    assessment_status=assessment.status.value if assessment else None,
                    rework_requested_at=assessment.rework_requested_at if assessment else None,
                )
            else:
                db_response.is_completed = bool(initial_data)
        except Exception:
            db_response.is_completed = False

        db.add(db_response)
        db.commit()
        db.refresh(db_response)
        return db_response

    def update_assessment_response(
        self, db: Session, response_id: int, response_update: AssessmentResponseUpdate
    ) -> AssessmentResponse | None:
        """
        Update an assessment response with validation against form schema.

        Args:
            db: Database session
            response_id: ID of the response to update
            response_update: Response update data

        Returns:
            Updated AssessmentResponse object or None if not found
        """
        db_response = self.get_assessment_response(db, response_id)
        if not db_response:
            return None

        # Validate response_data against indicator's form_schema if provided
        if response_update.response_data is not None:
            validation_result = self.validate_response_data(
                db_response.indicator.form_schema, response_update.response_data
            )
            if not validation_result.is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Response data validation failed: {', '.join(validation_result.errors)}",
                )

        # Update fields that are provided
        update_data = response_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_response, field, value)

        # Get assessment to check status and rework timestamp
        assessment = db.query(Assessment).filter(Assessment.id == db_response.assessment_id).first()

        # Auto-set completion status based on response_data
        if response_update.response_data is not None:
            db_response.is_completed = self._check_response_completion(
                form_schema=db_response.indicator.form_schema,
                response_data=response_update.response_data,
                movs=db_response.movs,
                assessment_status=assessment.status.value if assessment else None,
                rework_requested_at=assessment.rework_requested_at if assessment else None,
            )

        # Generate remark if response is completed and indicator has calculation_schema
        if db_response.is_completed and db_response.indicator.calculation_schema:
            try:
                from app.services.intelligence_service import intelligence_service

                # Calculate indicator status
                indicator_status = intelligence_service.calculate_indicator_status(
                    db=db,
                    indicator_id=db_response.indicator_id,
                    assessment_data=db_response.response_data or {},
                )

                # Generate remark
                generated_remark = intelligence_service.generate_indicator_remark(
                    db=db,
                    indicator_id=db_response.indicator_id,
                    indicator_status=indicator_status,
                    assessment_data=db_response.response_data or {},
                )

                if generated_remark:
                    db_response.generated_remark = generated_remark
            except Exception as e:
                # Log error but don't fail the update
                print(f"Failed to generate remark for response {response_id}: {str(e)}")

        db.commit()
        db.refresh(db_response)
        return db_response

    def validate_response_data(
        self, form_schema: dict[str, Any], response_data: dict[str, Any]
    ) -> FormSchemaValidation:
        """
        Validate response data against the indicator's form schema.

        Args:
            form_schema: JSON schema defining the expected form structure
            response_data: User's response data to validate

        Returns:
            FormSchemaValidation with validation results
        """
        errors = []
        warnings: list[dict[str, Any]] = []

        try:
            # Basic validation - check if response_data matches schema structure
            if not isinstance(response_data, dict):
                errors.append("Response data must be a JSON object")
                return FormSchemaValidation(is_valid=False, errors=errors)

            # Check required fields from schema
            required_fields = form_schema.get("required", [])
            for field in required_fields:
                if field not in response_data:
                    errors.append(f"Required field '{field}' is missing")

            # Check field types and values
            properties = form_schema.get("properties", {})
            for field, value in response_data.items():
                if field in properties:
                    field_schema = properties[field]
                    field_errors = self._validate_field(field, value, field_schema)
                    errors.extend(field_errors)

            # Additional business logic validations
            self._validate_business_rules(response_data, form_schema, warnings)

        except (ValueError, TypeError, KeyError) as e:
            errors.append(f"Validation error: {str(e)}")

        return FormSchemaValidation(is_valid=len(errors) == 0, errors=errors, warnings=[])

    def _check_response_completion(
        self,
        form_schema: dict[str, Any],
        response_data: dict[str, Any],
        movs: list[MOV] | None = None,
        assessment_status: str | None = None,
        rework_requested_at: datetime | None = None,
    ) -> bool:
        """
        Check if a response is completed based on form schema requirements.

        For indicators with multiple requirements (like 1.1.1), all required fields
        must have valid compliance values (yes/no/na) for the response to be considered complete.

        During REWORK status, only MOV files uploaded AFTER rework_requested_at are counted.

        Args:
            form_schema: JSON schema defining the expected form structure
            response_data: User's response data to check (may be nested for areas 2-6, or flat for child indicators)
            movs: List of MOV files for this response
            assessment_status: Current assessment status (e.g., REWORK, DRAFT)
            rework_requested_at: Timestamp when rework was requested (for filtering files)

        Returns:
            True if response is completed, False otherwise
        """
        if not response_data or not isinstance(response_data, dict):
            # For new format with fields array, allow empty response_data
            # since completion is based on MOV uploads
            if not form_schema.get("fields"):
                return False

        # Filter MOVs during rework status - only count files uploaded AFTER rework was requested
        filtered_movs = movs or []
        if (
            assessment_status
            and assessment_status.upper() in ("REWORK", "NEEDS_REWORK")
            and rework_requested_at
            and movs
        ):
            filtered_movs = [
                mov for mov in movs if mov.uploaded_at and mov.uploaded_at >= rework_requested_at
            ]
            print(
                f"[DEBUG] _check_response_completion: REWORK mode - filtered {len(movs)} MOVs to {len(filtered_movs)} (uploaded after {rework_requested_at})"
            )

        # Check if this is the new Epic 4.0 format with 'fields' array
        # Use completeness_validation_service for these schemas
        if "fields" in form_schema and isinstance(form_schema.get("fields"), list):
            try:
                result = completeness_validation_service.validate_completeness(
                    form_schema=form_schema,
                    response_data=response_data or {},
                    uploaded_movs=filtered_movs,
                )
                print(
                    f"[DEBUG] _check_response_completion (new format): is_complete={result['is_complete']}, "
                    f"filled={result['filled_field_count']}/{result['required_field_count']}"
                )
                return result["is_complete"]
            except Exception as e:
                print(
                    f"[DEBUG] _check_response_completion: Error using completeness_validation_service: {e}"
                )
                return False

        # Use filtered_movs instead of movs for all MOV checks below
        movs = filtered_movs

        def extract_compliance_values(data: dict[str, Any]) -> list:
            """Recursively extract compliance values (yes/no/na) from nested structures."""
            values = []
            for v in data.values():
                if isinstance(v, dict):
                    values.extend(extract_compliance_values(v))
                elif isinstance(v, str) and v.lower() in {"yes", "no", "na"}:
                    values.append(v.lower())
            return values

        # Check if response_data contains flat compliance fields (like "bpoc_documents_compliance" or "bfdp_monitoring_forms_compliance")
        # This happens for areas 1-6 where child indicators save flat data to parent response
        # This check should run FIRST before checking form_schema, as it handles both Area 1 and areas 2-6
        flat_compliance_fields = {
            k: v
            for k, v in response_data.items()
            if isinstance(k, str)
            and k.endswith("_compliance")
            and isinstance(v, str)
            and v.lower() in {"yes", "no", "na"}
        }

        # If we have flat compliance fields, use the same logic as Area 1 (areas 2-6 follow same pattern)
        if flat_compliance_fields:
            # Handle flat structure for areas 2-6 child indicators (same as Area 1)
            # Only require MOVs for sections where the compliance answer is "yes"
            # Sections with "no" or "na" don't need MOVs

            # Check all compliance fields have valid values
            valid_compliance_values = {"yes", "no", "na"}
            for field_name, value in flat_compliance_fields.items():
                if value.lower() not in valid_compliance_values:
                    print(
                        f"[DEBUG] _check_response_completion: Invalid value '{value}' for field '{field_name}'"
                    )
                    return False

            # Extract sections that require MOVs (only those with "yes" answer)
            required_sections_flat = set()
            for field_name, value in flat_compliance_fields.items():
                if value.lower() == "yes":
                    # Extract section from field name: "bfdp_monitoring_forms_compliance" -> "bfdp_monitoring_forms"
                    section = field_name.replace("_compliance", "")
                    required_sections_flat.add(section)

            # Only check MOVs for sections that have "yes" answers
            if required_sections_flat:
                mov_section_hits = {s: False for s in required_sections_flat}
                for m in movs or []:
                    spath = getattr(m, "storage_path", "") or ""
                    # Storage path format: "assessmentId/responseId/section/filename" or "assessmentId/responseId/sectionSegmentfilename"
                    # Check if any required section appears in the path
                    for s in required_sections_flat:
                        # Check if section appears in path (e.g., "bfdp_monitoring_forms" in "1/207/bfdp_monitoring_forms/file.pdf")
                        if s in spath:
                            mov_section_hits[s] = True
                            print(
                                f"[DEBUG] _check_response_completion: Found MOV for section '{s}' in path '{spath}'"
                            )

                print(
                    f"[DEBUG] _check_response_completion: MOV section hits: {mov_section_hits}, required_sections_flat: {required_sections_flat}"
                )
                if not all(mov_section_hits.values()):
                    missing = [s for s, hit in mov_section_hits.items() if not hit]
                    print(
                        f"[DEBUG] _check_response_completion: Missing MOVs for 'yes' sections: {missing}"
                    )
                    return False

            print(
                f"[DEBUG] _check_response_completion: All checks passed for flat compliance fields: {flat_compliance_fields}"
            )
            return True

        # Get required fields from schema (original logic for Area 1 and nested structures)
        required_fields = form_schema.get("required", [])

        # If no explicit required fields, check all fields in response_data for "yes" answers with MOVs
        if not required_fields:
            # Recursively check nested structures for compliance values
            compliance_values = extract_compliance_values(response_data)
            has_any_yes = any(v == "yes" for v in compliance_values)
            mov_count = len(movs or [])
            if has_any_yes and mov_count <= 0:
                return False
            return bool(response_data)

        # Check that all required fields have valid compliance values
        # For nested structures (areas 2-6), recursively search for the fields
        def get_nested_value(data: dict[str, Any], field_path: str) -> Any:
            """Get a value from nested data structure using dot notation or direct key."""
            if field_path in data:
                return data[field_path]
            # Try nested search for areas 2-6 structure
            for v in data.values():
                if isinstance(v, dict):
                    result = get_nested_value(v, field_path)
                    if result is not None:
                        return result
            return None

        valid_compliance_values = {"yes", "no", "na"}

        for field in required_fields:
            value = get_nested_value(response_data, field)
            if not value or value not in valid_compliance_values:
                return False

        # Only require MOVs for sections where the answer is "yes"
        # Sections with "no" or "na" don't need MOVs
        props = form_schema.get("properties", {}) or {}

        # Build a map of field_name -> section for fields with mov_upload_section
        field_to_section: dict[str, str] = {}
        for field_name, field_props in props.items():
            section = (field_props or {}).get("mov_upload_section")
            if isinstance(section, str):
                field_to_section[field_name] = section

        # Only check MOVs for sections where the field answer is "yes"
        required_sections_with_yes: list[str] = []
        for field in required_fields:
            value = get_nested_value(response_data, field)
            if value == "yes" and field in field_to_section:
                required_sections_with_yes.append(field_to_section[field])

        # Only check MOVs for sections that have "yes" answers
        if required_sections_with_yes:
            section_set = set(required_sections_with_yes)
            mov_section_hits = {s: False for s in section_set}
            for m in movs or []:
                spath = getattr(m, "storage_path", "") or ""
                for s in section_set:
                    if s in spath:
                        mov_section_hits[s] = True
            if not all(mov_section_hits.values()):
                print(
                    f"[DEBUG] _check_response_completion: Missing MOVs for 'yes' sections: {[s for s, hit in mov_section_hits.items() if not hit]}"
                )
                return False
        else:
            # If no sections require MOVs (all "no" or "na"), check if there's at least one "yes" that needs general MOVs
            has_any_yes = any(
                get_nested_value(response_data, field) == "yes" for field in required_fields
            )
            if has_any_yes and not field_to_section:
                # Has "yes" but no section-based uploads, so require at least one MOV overall
                if len(movs or []) <= 0:
                    print(
                        "[DEBUG] _check_response_completion: Has 'yes' but no MOVs found (no section-based uploads)"
                    )
                    return False

        return True

    def recompute_response_completion(self, response: AssessmentResponse) -> bool:
        """
        Recomputes and sets the is_completed status of an AssessmentResponse in-place based on
        current response_data and number of valid MOVs attached (for atomic operations).
        Args:
            response: AssessmentResponse ORM object (with .indicator and .movs eager-loaded)
        Returns:
            new completion status (bool)
        """
        if not response or not response.indicator:
            response.is_completed = False
            return False
        form_schema = getattr(response.indicator, "form_schema", {}) or {}
        response_data = getattr(response, "response_data", None)
        if response_data is None:
            response_data = {}
        # Ensure response_data is a dict (not None)
        if not isinstance(response_data, dict):
            response_data = {}
        mov_count = len(getattr(response, "movs", []) or [])
        movs_list = getattr(response, "movs", []) or []

        # Debug: log input data
        try:
            mov_paths = [getattr(m, "storage_path", "") for m in movs_list]
            print(
                f"[DEBUG] recompute_response_completion: response_id={getattr(response, 'id', None)}, "
                f"indicator_id={getattr(response, 'indicator_id', None)}, "
                f"response_data={response_data}, mov_count={mov_count}, mov_paths={mov_paths}"
            )
        except Exception:
            pass

        completion = self._check_response_completion(form_schema, response_data, response.movs)

        # Debug: trace recompute outputs
        try:
            print(
                f"[DEBUG] recompute_response_completion: response_id={getattr(response, 'id', None)}, "
                f"new_is_completed={completion}"
            )
        except Exception:
            pass
        response.is_completed = completion
        return completion

    def _validate_field(
        self, field_name: str, value: Any, field_schema: dict[str, Any]
    ) -> list[str]:
        """Validate a single field against its schema."""
        errors = []

        # Check field type
        expected_type = field_schema.get("type")
        if expected_type:
            if expected_type == "string" and not isinstance(value, str):
                errors.append(f"Field '{field_name}' must be a string")
            elif expected_type == "number" and not isinstance(value, (int, float)):
                errors.append(f"Field '{field_name}' must be a number")
            elif expected_type == "boolean" and not isinstance(value, bool):
                errors.append(f"Field '{field_name}' must be a boolean")
            elif expected_type == "array" and not isinstance(value, list):
                errors.append(f"Field '{field_name}' must be an array")

        # Check enum values
        enum_values = field_schema.get("enum")
        if enum_values and value not in enum_values:
            errors.append(
                f"Field '{field_name}' must be one of: {', '.join(map(str, enum_values))}"
            )

        return errors

    def _validate_business_rules(
        self,
        response_data: dict[str, Any],
        form_schema: dict[str, Any],
        warnings: list[dict[str, Any]],
    ) -> None:
        """Apply business-specific validation rules."""
        # Example: Check if "YES" answers have corresponding MOVs
        # This would be implemented based on specific business requirements

    def submit_assessment(self, db: Session, assessment_id: int) -> AssessmentSubmissionValidation:
        """
        Submit an assessment for review with preliminary compliance check.

        Args:
            db: Database session
            assessment_id: ID of the assessment to submit

        Returns:
            AssessmentSubmissionValidation with submission results
        """
        assessment = self.get_assessment_with_responses(db, assessment_id)
        if not assessment:
            return AssessmentSubmissionValidation(
                is_valid=False, errors=[{"error": "Assessment not found"}]
            )

        # Check if assessment is in correct status for submission (Draft or Needs Rework)
        if assessment.status not in (
            AssessmentStatus.DRAFT,
            AssessmentStatus.NEEDS_REWORK,
        ):
            return AssessmentSubmissionValidation(
                is_valid=False,
                errors=[
                    {
                        "error": f"Assessment must be in DRAFT or NEEDS_REWORK status to submit. Current status: {assessment.status.value}"
                    }
                ],
            )

        # Run preliminary compliance check
        validation_result = self._run_preliminary_compliance_check(assessment)

        if validation_result.is_valid:
            # Check if this is a resubmission after rework
            is_resubmission = assessment.rework_requested_at is not None

            # Update assessment status
            assessment.status = AssessmentStatus.SUBMITTED_FOR_REVIEW
            assessment.submitted_at = datetime.utcnow()

            # CRITICAL: If resubmitting after rework, clear checklist data for reworked indicators
            # This ensures assessors review them with clean checklists
            if is_resubmission:
                for response in assessment.responses:
                    if response.requires_rework:
                        # Clear validation_status for fresh review
                        response.validation_status = None

                        # Mark as incomplete so assessor needs to review
                        response.is_completed = False

                        # Clear assessor checklist data (assessor_val_ prefix)
                        if response.response_data:
                            response.response_data = {
                                k: v
                                for k, v in response.response_data.items()
                                if not k.startswith("assessor_val_")
                            }
                        self.logger.info(
                            f"[RESUBMISSION] Cleared checklist & marked incomplete for response {response.id} (requires_rework=True)"
                        )

            db.commit()
            db.refresh(assessment)

            # Create indicator snapshots on FIRST submission only
            # Snapshots preserve the exact indicator definitions (with resolved year placeholders)
            # at the time of initial submission for historical integrity
            if not is_resubmission:
                try:
                    # Get all indicator IDs that have responses
                    indicator_ids = [r.indicator_id for r in assessment.responses]
                    if indicator_ids:
                        # Pass the assessment's year to ensure correct year placeholders are resolved
                        snapshots = indicator_snapshot_service.create_snapshot_for_assessment(
                            db=db,
                            assessment_id=assessment_id,
                            indicator_ids=indicator_ids,
                            assessment_year=assessment.assessment_year,
                        )
                        db.commit()
                        self.logger.info(
                            f"Created {len(snapshots)} indicator snapshots for assessment {assessment_id} (year={assessment.assessment_year})"
                        )
                except Exception as e:
                    # Log error but don't fail submission - snapshots are for historical record
                    self.logger.error(
                        f"Failed to create indicator snapshots for assessment {assessment_id}: {e}"
                    )

            # Trigger notification based on submission type
            try:
                if assessment.is_calibration_rework and assessment.calibration_validator_id:
                    # Notification #6: BLGU resubmits after calibration -> Same Validator
                    from app.workers.notifications import (
                        send_calibration_resubmission_notification,
                    )

                    send_calibration_resubmission_notification.delay(
                        assessment_id, assessment.calibration_validator_id
                    )
                    self.logger.info(
                        f"Triggered calibration resubmission notification for assessment {assessment_id}"
                    )
                elif is_resubmission:
                    # Notification #3: BLGU resubmits after rework -> All Assessors
                    from app.workers.notifications import (
                        send_rework_resubmission_notification,
                    )

                    send_rework_resubmission_notification.delay(assessment_id)
                    self.logger.info(
                        f"Triggered rework resubmission notification for assessment {assessment_id}"
                    )
                else:
                    # Notification #1: New submission -> All Assessors
                    from app.workers.notifications import (
                        send_new_submission_notification,
                    )

                    send_new_submission_notification.delay(assessment_id)
                    self.logger.info(
                        f"Triggered new submission notification for assessment {assessment_id}"
                    )
            except Exception as e:
                self.logger.error(f"Failed to queue submission notification: {e}")

        return validation_result

    def _run_preliminary_compliance_check(
        self, assessment: Assessment
    ) -> AssessmentSubmissionValidation:
        """
        Run preliminary compliance check on assessment.

        Business Rule: No "YES" answers without MOVs (Means of Verification).

        Checks both:
        - Legacy MOV model (movs table, linked via response_id)
        - New MOVFile model (mov_files table, linked via assessment_id + indicator_id)

        Args:
            db: Database session
            assessment: Assessment to validate

        Returns:
            AssessmentSubmissionValidation with validation results
        """
        errors = []
        warnings: list[dict[str, Any]] = []

        # Build a set of indicator IDs that have MOVFiles uploaded (new model)
        mov_file_indicator_ids = set()
        for mov_file in assessment.mov_files:
            # Only count non-deleted files
            if mov_file.deleted_at is None:
                mov_file_indicator_ids.add(mov_file.indicator_id)

        for response in assessment.responses:
            if not response.response_data:
                continue

            # Check for "YES" answers without MOVs
            has_yes_answer = self._has_yes_answer(response.response_data)

            # Check both legacy MOV model (response.movs) and new MOVFile model
            has_legacy_movs = len(response.movs) > 0
            has_new_mov_files = response.indicator_id in mov_file_indicator_ids
            has_movs = has_legacy_movs or has_new_mov_files

            if has_yes_answer and not has_movs:
                errors.append(
                    {
                        "indicator_id": response.indicator_id,
                        "indicator_name": response.indicator.name,
                        "error": "YES answer requires Means of Verification (MOV)",
                    }
                )

        return AssessmentSubmissionValidation(
            is_valid=len(errors) == 0, errors=errors, warnings=warnings
        )

    def _has_yes_answer(self, response_data: dict[str, Any]) -> bool:
        """Check if response data contains any "YES" answers."""
        for value in response_data.values():
            if isinstance(value, str) and value.upper() == "YES":
                return True
            elif isinstance(value, bool) and value:
                return True
        return False

    def create_mov(self, db: Session, mov_create: MOVCreate) -> MOV:
        """
        Create a new MOV (Means of Verification) record.
        Also recalculates parent AssessmentResponse's completion status.

        Args:
            db: Database session
            mov_create: MOV creation data

        Returns:
            Created MOV object
        """
        from sqlalchemy.orm import joinedload

        db_mov = MOV(
            filename=mov_create.filename,
            original_filename=mov_create.original_filename,
            file_size=mov_create.file_size,
            content_type=mov_create.content_type,
            storage_path=mov_create.storage_path,
            response_id=mov_create.response_id,
            status=MOVStatus.UPLOADED,
        )

        try:
            db.add(db_mov)
            db.flush()  # Flush to get the MOV ID before recalculating
            print(f"[DEBUG] MOV created with ID: {db_mov.id}, filename: {db_mov.filename}")
        except Exception as e:
            print(f"[ERROR] Failed to add/flush MOV: {str(e)}")
            db.rollback()
            raise

        # Recalculate parent response completion status
        if mov_create.response_id:
            # Refresh the response to ensure MOVs relationship includes the newly created MOV
            db_response = (
                db.query(AssessmentResponse)
                .options(
                    joinedload(AssessmentResponse.movs),
                    joinedload(AssessmentResponse.indicator),
                )
                .filter(AssessmentResponse.id == mov_create.response_id)
                .first()
            )
            if db_response:
                # Explicitly refresh to ensure the newly flushed MOV is included
                db.refresh(db_response, ["movs"])
                # Ensure the newly created MOV is in the movs list
                if db_mov not in db_response.movs:
                    db_response.movs.append(db_mov)

                prev = bool(db_response.is_completed)
                new = self.recompute_response_completion(db_response)
                print(
                    f"[DEBUG] After MOV create: response_id={db_response.id} prev={prev} new={new} movs={len(db_response.movs)}, storage_paths={[m.storage_path for m in db_response.movs]}"
                )
                db.add(db_response)

                # Touch the parent assessment's updated_at to bust frontend cache
                if db_response.assessment_id:
                    from datetime import datetime

                    db_assessment = (
                        db.query(Assessment)
                        .filter(Assessment.id == db_response.assessment_id)
                        .first()
                    )
                    if db_assessment:
                        db_assessment.updated_at = datetime.now(UTC)
                        db.add(db_assessment)

        try:
            db.commit()
            print(f"[DEBUG] MOV commit successful. ID={db_mov.id}")
        except Exception as e:
            print(f"[ERROR] MOV commit failed: {str(e)}")
            db.rollback()
            raise

        db.refresh(db_mov)
        return db_mov

    def delete_mov(self, db: Session, mov_id: int) -> bool:
        """
        Atomically delete a MOV record and its corresponding storage file.
        Also recalculates parent AssessmentResponse's completion status.
        """
        from app.db.base import supabase_admin

        db_mov = db.query(MOV).filter(MOV.id == mov_id).first()
        if not db_mov:
            return False
        # Always load parent response + movs eagerly.
        db_response = (
            db.query(AssessmentResponse)
            .options(
                joinedload(AssessmentResponse.movs),
                joinedload(AssessmentResponse.indicator),
            )
            .filter(AssessmentResponse.id == db_mov.response_id)
            .first()
        )
        if not db_response:
            # Possible data corruption, but MOV is useless, so delete just the file and MOV.
            db_response = None
        storage_path = db_mov.storage_path
        # Step 1: Synchronously delete storage file. Fail if deletion fails.
        if not supabase_admin:
            raise RuntimeError("Supabase admin client not configured")
        try:
            storage_res = supabase_admin.storage.from_("movs").remove([storage_path])
            # The supabase-py client raises on HTTP/storage network error, but check for errors in resp too
            if isinstance(storage_res, dict) and storage_res.get("error"):
                raise Exception(f"Supabase file delete error: {storage_res['error']}")
        except Exception as e:
            raise HTTPException(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                f"Failed to delete MOV file from storage: {str(e)}",
            )
        # Step 2: Delete MOV and update parent completion inside transaction
        try:
            db.delete(db_mov)
            if db_response is not None:
                # Remove the NOW deleted MOV from in-memory .movs list before recompute
                db_response.movs = [m for m in db_response.movs if m.id != db_mov.id]
                prev = bool(db_response.is_completed)
                new = self.recompute_response_completion(db_response)
                print(
                    f"[DEBUG] After MOV delete: response_id={db_response.id} prev={prev} new={new} movs={len(db_response.movs)}"
                )
                db.add(db_response)

                # Touch the parent assessment's updated_at to bust frontend cache
                if db_response.assessment_id:
                    from datetime import datetime

                    db_assessment = (
                        db.query(Assessment)
                        .filter(Assessment.id == db_response.assessment_id)
                        .first()
                    )
                    if db_assessment:
                        db_assessment.updated_at = datetime.now(UTC)
                        db.add(db_assessment)
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                f"Error deleting MOV and updating completion: {str(e)}",
            )
        return True

    def create_feedback_comment(
        self, db: Session, comment_create: FeedbackCommentCreate
    ) -> FeedbackComment:
        """
        Create a new feedback comment.

        Args:
            db: Database session
            comment_create: Comment creation data

        Returns:
            Created FeedbackComment object
        """
        db_comment = FeedbackComment(
            comment=comment_create.comment,
            comment_type=comment_create.comment_type,
            response_id=comment_create.response_id,
            assessor_id=comment_create.assessor_id,
        )

        db.add(db_comment)
        db.commit()
        db.refresh(db_comment)
        return db_comment

    def get_dashboard_data(self, db: Session, blgu_user_id: int) -> dict[str, Any]:
        """
        Get dashboard-specific data with progress calculations.

        Args:
            db: Database session
            blgu_user_id: ID of the BLGU user

        Returns:
            Dictionary with dashboard-specific data
        """
        # Get user information with barangay details
        from app.db.models.user import User

        user = (
            db.query(User)
            .options(joinedload(User.barangay))
            .filter(User.id == blgu_user_id)
            .first()
        )

        if not user:
            return {"error": "User not found"}

        # Get assessment
        assessment = self.get_assessment_for_blgu(db, blgu_user_id)
        if not assessment:
            assessment = self.create_assessment(db, AssessmentCreate(blgu_user_id=blgu_user_id))

        # Calculate progress metrics
        progress_metrics = self.calculate_progress_metrics(assessment.id, db)

        # Get governance area progress
        governance_area_progress = self.get_governance_area_progress(db, assessment.id)

        # Get barangay information
        barangay_name = getattr(user.barangay, "name", "Unknown") if user.barangay else "Unknown"

        # Get current year settings
        year_config = self.get_year_configuration()
        current_year = year_config["current_year"]
        performance_year = year_config["performance_year"]
        assessment_year = year_config["assessment_year"]

        return {
            "user": {
                "id": getattr(user, "id"),
                "name": getattr(user, "name", "Unknown"),
                "barangay_name": barangay_name,
                "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            },
            "assessment": {
                "id": assessment.id,
                "status": assessment.status.value
                if hasattr(assessment.status, "value")
                else str(assessment.status),
                "created_at": assessment.created_at.isoformat() + "Z",
                "updated_at": assessment.updated_at.isoformat() + "Z",
                "submitted_at": assessment.submitted_at.isoformat() + "Z"
                if assessment.submitted_at
                else None,
                "rework_requested_at": assessment.rework_requested_at.isoformat() + "Z"
                if assessment.rework_requested_at
                else None,
            },
            "years": {
                "current_year": current_year,
                "performance_year": performance_year,
                "assessment_year": assessment_year,
            },
            "year_configuration": year_config,
            "progress_metrics": progress_metrics,
            "governance_area_progress": governance_area_progress,
        }

    def calculate_progress_metrics(self, assessment_id: int, db: Session) -> dict[str, Any]:
        """
        Calculate progress statistics for dashboard.

        Args:
            assessment_id: ID of the assessment
            db: Database session

        Returns:
            Dictionary with progress metrics
        """
        # Get assessment with responses
        assessment = self.get_assessment_with_responses(db, assessment_id)
        if not assessment:
            return {
                "total_indicators": 0,
                "completed_indicators": 0,
                "completion_percentage": 0.0,
                "responses_requiring_rework": 0,
                "responses_with_feedback": 0,
                "responses_with_movs": 0,
                "progress": {
                    "current": 0,
                    "total": 0,
                    "percentage": 0.0,
                },
            }

        # Get all governance areas to count total indicators
        governance_areas = (
            db.query(GovernanceArea).options(joinedload(GovernanceArea.indicators)).all()
        )

        # Calculate total indicators
        total_indicators = sum(len(area.indicators) for area in governance_areas)

        # Calculate completed indicators
        completed_indicators = sum(1 for response in assessment.responses if response.is_completed)

        # Calculate completion percentage
        completion_percentage = (
            (completed_indicators / total_indicators * 100) if total_indicators > 0 else 0
        )

        # Count responses requiring rework
        responses_requiring_rework = sum(
            1 for response in assessment.responses if response.requires_rework
        )

        # Count responses with feedback
        responses_with_feedback = sum(
            1 for response in assessment.responses if len(response.feedback_comments) > 0
        )

        # Count responses with MOVs
        responses_with_movs = sum(1 for response in assessment.responses if len(response.movs) > 0)

        return {
            "total_indicators": total_indicators,
            "completed_indicators": completed_indicators,
            "completion_percentage": completion_percentage,
            "responses_requiring_rework": responses_requiring_rework,
            "responses_with_feedback": responses_with_feedback,
            "responses_with_movs": responses_with_movs,
            "progress": {
                "current": completed_indicators,
                "total": total_indicators,
                "percentage": completion_percentage,
            },
        }

    def get_governance_area_progress(self, db: Session, assessment_id: int) -> list[dict]:
        """
        Get progress data for each governance area.

        Args:
            db: Database session
            assessment_id: ID of the assessment

        Returns:
            List of dictionaries with governance area progress data
        """
        # Get assessment with responses
        assessment = self.get_assessment_with_responses(db, assessment_id)
        if not assessment:
            return []

        # Get all governance areas with indicators
        governance_areas = (
            db.query(GovernanceArea).options(joinedload(GovernanceArea.indicators)).all()
        )

        # Create response lookup
        response_lookup = {r.indicator_id: r for r in assessment.responses}

        # Build governance area progress
        governance_area_progress = []
        for area in governance_areas:
            # Filter out areas that are just containers (parent areas with no direct indicators)
            # Only include areas that have actual indicators or are leaf-level areas
            if not area.indicators:
                continue

            # Check if this area is just a container by looking for indicators with parent_id
            # If all indicators have parent_id, this area is just a container
            has_direct_indicators = any(
                indicator.parent_id is None for indicator in area.indicators
            )
            if not has_direct_indicators:
                continue

            area_responses = [
                response_lookup.get(indicator.id)
                for indicator in area.indicators
                if response_lookup.get(indicator.id)
            ]

            completed_in_area = sum(
                1 for response in area_responses if response and response.is_completed
            )
            rework_in_area = sum(
                1 for response in area_responses if response and response.requires_rework
            )

            area_completion_percentage = (
                (completed_in_area / len(area.indicators) * 100) if len(area.indicators) > 0 else 0
            )

            governance_area_progress.append(
                {
                    "id": getattr(area, "id"),
                    "name": getattr(area, "name"),
                    "area_type": area.area_type.value,
                    "total_indicators": len(area.indicators),
                    "completed_indicators": completed_in_area,
                    "completion_percentage": area_completion_percentage,
                    "requires_rework_count": rework_in_area,
                    "indicators": [
                        {
                            "id": getattr(indicator, "id"),
                            "name": indicator.name,
                            "description": indicator.description,
                            "has_response": indicator.id in response_lookup,
                            "is_completed": response_lookup.get(indicator.id, {}).is_completed
                            if indicator.id in response_lookup
                            else False,
                            "requires_rework": response_lookup.get(indicator.id, {}).requires_rework
                            if indicator.id in response_lookup
                            else False,
                        }
                        for indicator in area.indicators
                    ],
                }
            )

        return governance_area_progress

    def get_user_barangay_info(self, db: Session, user_id: int) -> dict[str, Any]:
        """
        Get user barangay information with performance and assessment year configuration.

        Args:
            db: Database session
            user_id: ID of the user

        Returns:
            Dictionary with user barangay information and year settings
        """
        from app.db.models.user import User

        user = db.query(User).options(joinedload(User.barangay)).filter(User.id == user_id).first()

        if not user:
            return {"error": "User not found"}

        # Get barangay information
        barangay_name = getattr(user.barangay, "name", "Unknown") if user.barangay else "Unknown"
        barangay_id = getattr(user.barangay, "id", None) if user.barangay else None

        # Get current year for configuration
        current_year = datetime.now().year

        # TODO: In the future, these could be configurable settings from a system settings table
        # For now, we'll use the current year
        performance_year = current_year
        assessment_year = current_year

        return {
            "user": {
                "id": getattr(user, "id"),
                "name": getattr(user, "name", "Unknown"),
                "email": getattr(user, "email", "Unknown"),
                "role": user.role.value if hasattr(user.role, "value") else str(user.role),
                "is_active": getattr(user, "is_active", True),
            },
            "barangay": {
                "id": barangay_id,
                "name": barangay_name,
            },
            "years": {
                "current_year": current_year,
                "performance_year": performance_year,
                "assessment_year": assessment_year,
            },
            "configuration": {
                "auto_create_assessment": True,  # TODO: Make configurable
                "allow_multiple_assessments": False,  # TODO: Make configurable
                "assessment_deadline": None,  # TODO: Implement deadline system
            },
        }

    def get_user_profile_with_barangay(self, db: Session, user_id: int) -> dict[str, Any]:
        """
        Get comprehensive user profile with barangay information and settings.

        Args:
            db: Database session
            user_id: ID of the user

        Returns:
            Dictionary with complete user profile and barangay information
        """
        from app.db.models.user import User

        user = db.query(User).options(joinedload(User.barangay)).filter(User.id == user_id).first()

        if not user:
            return {"error": "User not found"}

        # Get barangay information
        barangay_info = {}
        if user.barangay:
            barangay_info = {
                "id": getattr(user.barangay, "id"),
                "name": getattr(user.barangay, "name", "Unknown"),
            }
        else:
            barangay_info = {
                "id": None,
                "name": "No Barangay Assigned",
            }

        # Get year configuration
        year_config = self.get_year_configuration()

        # Get user's assessment information
        assessment = self.get_assessment_for_blgu(db, user_id)
        assessment_info = {}
        if assessment:
            assessment_info = {
                "id": assessment.id,
                "status": assessment.status.value
                if hasattr(assessment.status, "value")
                else str(assessment.status),
                "created_at": assessment.created_at.isoformat() + "Z",
                "updated_at": assessment.updated_at.isoformat() + "Z",
                "submitted_at": assessment.submitted_at.isoformat() + "Z"
                if assessment.submitted_at
                else None,
            }

        return {
            "user_profile": {
                "id": getattr(user, "id"),
                "name": getattr(user, "name", "Unknown"),
                "email": getattr(user, "email", "Unknown"),
                "role": user.role.value if hasattr(user.role, "value") else str(user.role),
                "is_active": getattr(user, "is_active", True),
                "is_superuser": getattr(user, "is_superuser", False),
                "must_change_password": getattr(user, "must_change_password", True),
                "created_at": user.created_at.isoformat() + "Z",
                "updated_at": user.updated_at.isoformat() + "Z",
            },
            "barangay": barangay_info,
            "assessment": assessment_info,
            "year_settings": {
                "performance_year": year_config["performance_year"],
                "assessment_year": year_config["assessment_year"],
                "current_year": year_config["current_year"],
            },
            "configuration": {
                "auto_create_assessment": True,
                "allow_multiple_assessments": False,
                "assessment_deadline": None,
            },
        }

    def get_year_configuration(self) -> dict[str, Any]:
        """
        Get performance year and assessment year configuration from system settings.

        Returns:
            Dictionary with year configuration
        """
        # TODO: In the future, this could query a system_settings table
        # For now, we'll return default configuration based on current year
        current_year = datetime.now().year

        return {
            "current_year": current_year,
            "performance_year": current_year,
            "assessment_year": current_year,
            "fiscal_year_start": 1,  # January
            "fiscal_year_end": 12,  # December
            "assessment_period_start": datetime(current_year, 1, 1).isoformat() + "Z",
            "assessment_period_end": datetime(current_year, 12, 31).isoformat() + "Z",
            "deadline_extensions": [],  # TODO: Implement deadline extension system
            "configuration_source": "default",  # Could be "database" or "config_file"
        }

    def get_all_assessor_feedback(self, db: Session, assessment_id: int) -> list[dict[str, Any]]:
        """
        Collect and format all assessor feedback comments for an assessment.

        Args:
            db: Database session
            assessment_id: ID of the assessment

        Returns:
            List of dictionaries with formatted feedback comments
        """
        # Get all feedback comments for the assessment (exclude internal notes for BLGU)
        feedback_comments = (
            db.query(FeedbackComment)
            .join(AssessmentResponse)
            .options(
                joinedload(FeedbackComment.assessor),
                joinedload(FeedbackComment.response).joinedload(AssessmentResponse.indicator),
            )
            .filter(AssessmentResponse.assessment_id == assessment_id)
            .filter(FeedbackComment.is_internal_note == False)
            .order_by(FeedbackComment.created_at.desc())
            .all()
        )

        # Format feedback comments
        formatted_feedback = []
        for comment in feedback_comments:
            formatted_feedback.append(
                {
                    "id": comment.id,
                    "comment": comment.comment,
                    "comment_type": comment.comment_type,
                    "created_at": comment.created_at.isoformat() + "Z",
                    "updated_at": comment.created_at.isoformat()
                    + "Z",  # Using created_at as updated_at for now
                    "assessor": {
                        "id": getattr(comment.assessor, "id"),
                        "name": f"{getattr(comment.assessor, 'first_name', '')} {getattr(comment.assessor, 'last_name', '')}".strip(),
                        "role": comment.assessor.role.value
                        if hasattr(comment.assessor.role, "value")
                        else str(comment.assessor.role),
                        "email": getattr(comment.assessor, "email", "Unknown"),
                    },
                    "indicator": {
                        "id": getattr(comment.response.indicator, "id"),
                        "name": comment.response.indicator.name,
                        "description": comment.response.indicator.description,
                        "governance_area": comment.response.indicator.governance_area.name,
                    },
                    "response": {
                        "id": comment.response.id,
                        "is_completed": comment.response.is_completed,
                        "requires_rework": comment.response.requires_rework,
                        "response_data": comment.response.response_data,
                    },
                }
            )

        return formatted_feedback

    def get_feedback_by_governance_area(
        self, db: Session, assessment_id: int
    ) -> dict[str, dict[str, Any]]:
        """
        Get feedback comments organized by governance area.

        Args:
            db: Database session
            assessment_id: ID of the assessment

        Returns:
            Dictionary with governance area names as keys and feedback lists as values
        """
        # Get all feedback comments
        all_feedback = self.get_all_assessor_feedback(db, assessment_id)

        # Group feedback by governance area
        feedback_by_area = {}
        for feedback in all_feedback:
            area_name = feedback["indicator"]["governance_area"]
            if area_name not in feedback_by_area:
                feedback_by_area[area_name] = []
            feedback_by_area[area_name].append(feedback)

        # Add summary statistics for each area
        area_summary = {}
        for area_name, feedback_list in feedback_by_area.items():
            area_summary[area_name] = {
                "area_name": area_name,
                "total_feedback": len(feedback_list),
                "feedback_by_type": self._count_feedback_by_type(feedback_list),
                "recent_feedback": sorted(
                    feedback_list, key=lambda x: x["created_at"], reverse=True
                )[:3],
                "all_feedback": feedback_list,
            }

        return area_summary

    def get_recent_feedback_with_timestamps(
        self, db: Session, assessment_id: int, limit: int = 10
    ) -> list[dict[str, Any]]:
        """
        Get recent feedback comments with detailed timestamps.

        Args:
            db: Database session
            assessment_id: ID of the assessment
            limit: Maximum number of recent feedback to return

        Returns:
            List of dictionaries with recent feedback and timestamp details
        """
        # Get recent public feedback comments (exclude internal notes for BLGU)
        recent_feedback = (
            db.query(FeedbackComment)
            .join(AssessmentResponse)
            .options(
                joinedload(FeedbackComment.assessor),
                joinedload(FeedbackComment.response).joinedload(AssessmentResponse.indicator),
            )
            .filter(AssessmentResponse.assessment_id == assessment_id)
            .filter(FeedbackComment.is_internal_note == False)
            .order_by(FeedbackComment.created_at.desc())
            .limit(limit)
            .all()
        )

        # Format with detailed timestamps
        formatted_recent_feedback = []
        for comment in recent_feedback:
            created_at = comment.created_at
            formatted_recent_feedback.append(
                {
                    "id": comment.id,
                    "comment": comment.comment,
                    "comment_type": comment.comment_type,
                    "timestamps": {
                        "created_at": created_at.isoformat() + "Z",
                        "created_at_human": self._format_human_timestamp(created_at),
                        "created_at_relative": self._format_relative_timestamp(created_at),
                        "day_of_week": created_at.strftime("%A"),
                        "time_of_day": created_at.strftime("%I:%M %p"),
                    },
                    "assessor": {
                        "id": getattr(comment.assessor, "id"),
                        "name": f"{getattr(comment.assessor, 'first_name', '')} {getattr(comment.assessor, 'last_name', '')}".strip(),
                        "role": comment.assessor.role.value
                        if hasattr(comment.assessor.role, "value")
                        else str(comment.assessor.role),
                    },
                    "indicator": {
                        "id": getattr(comment.response.indicator, "id"),
                        "name": comment.response.indicator.name,
                        "governance_area": comment.response.indicator.governance_area.name,
                    },
                    "response": {
                        "id": comment.response.id,
                        "is_completed": comment.response.is_completed,
                        "requires_rework": comment.response.requires_rework,
                    },
                }
            )

        return formatted_recent_feedback

    def _count_feedback_by_type(self, feedback_list: list[dict[str, Any]]) -> dict[str, int]:
        """Helper method to count feedback by comment type."""
        type_counts = {}
        for feedback in feedback_list:
            comment_type = feedback["comment_type"]
            type_counts[comment_type] = type_counts.get(comment_type, 0) + 1
        return type_counts

    def _format_human_timestamp(self, timestamp: datetime) -> str:
        """Helper method to format timestamp in human-readable format."""
        return timestamp.strftime("%B %d, %Y at %I:%M %p")

    def _format_relative_timestamp(self, timestamp: datetime) -> str:
        """Helper method to format timestamp as relative time."""
        now = datetime.now()
        diff = now - timestamp

        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days != 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        else:
            return "Just now"

    def get_comprehensive_feedback_summary(self, db: Session, assessment_id: int) -> dict[str, Any]:
        """
        Get comprehensive feedback summary including all feedback data.

        Args:
            db: Database session
            assessment_id: ID of the assessment

        Returns:
            Dictionary with comprehensive feedback summary
        """
        # Get all feedback data
        all_feedback = self.get_all_assessor_feedback(db, assessment_id)
        feedback_by_area = self.get_feedback_by_governance_area(db, assessment_id)
        recent_feedback = self.get_recent_feedback_with_timestamps(db, assessment_id, limit=10)

        # Calculate feedback statistics
        total_feedback = len(all_feedback)
        feedback_by_type = self._count_feedback_by_type(all_feedback)

        # Get unique assessors
        assessors = set()
        for feedback in all_feedback:
            assessors.add(feedback["assessor"]["name"])

        # Get feedback by governance area summary
        area_summary = {}
        for area_name, area_data in feedback_by_area.items():
            area_summary[area_name] = {
                "total_feedback": area_data["total_feedback"],
                "feedback_by_type": area_data["feedback_by_type"],
                "has_recent_feedback": len(area_data["recent_feedback"]) > 0,
            }

        return {
            "summary": {
                "total_feedback": total_feedback,
                "unique_assessors": len(assessors),
                "assessor_names": list(assessors),
                "feedback_by_type": feedback_by_type,
                "governance_areas_with_feedback": len(feedback_by_area),
            },
            "recent_feedback": recent_feedback,
            "feedback_by_area": area_summary,
            "all_feedback": all_feedback,
            "detailed_feedback_by_area": feedback_by_area,
        }

    def get_assessment_dashboard_data(
        self, db: Session, blgu_user_id: int, assessment_year: int | None = None
    ) -> AssessmentDashboardResponse | None:
        """
        Get dashboard data for a BLGU user's assessment.

        Args:
            db: Database session
            blgu_user_id: ID of the BLGU user
            assessment_year: Optional year filter. If not provided, uses active year.

        Returns:
            AssessmentDashboardResponse with dashboard data or None if not found
        """
        from app.services.assessment_year_service import assessment_year_service

        # Get user information to access barangay name
        from app.db.models.user import User

        user = (
            db.query(User)
            .options(joinedload(User.barangay))
            .filter(User.id == blgu_user_id)
            .first()
        )
        if not user:
            return None

        # Get barangay name
        barangay_name = getattr(user.barangay, "name", "Unknown") if user.barangay else "Unknown"

        # Determine the assessment year to use
        if assessment_year is None:
            try:
                assessment_year = assessment_year_service.get_active_year_number(db)
            except ValueError:
                # Fall back to calendar year
                assessment_year = datetime.now().year

        # Get current year for performance year
        current_year = datetime.now().year

        # Get or create assessment for the specific year
        assessment = self.get_assessment_for_blgu(db, blgu_user_id, assessment_year=assessment_year)
        if not assessment:
            assessment = self.create_assessment(
                db, AssessmentCreate(blgu_user_id=blgu_user_id, assessment_year=assessment_year)
            )

        # Get all governance areas with their indicators
        governance_areas = (
            db.query(GovernanceArea).options(joinedload(GovernanceArea.indicators)).all()
        )

        # Get all responses for this assessment
        responses = (
            db.query(AssessmentResponse)
            .options(
                joinedload(AssessmentResponse.indicator),
                joinedload(AssessmentResponse.movs),
                joinedload(AssessmentResponse.feedback_comments),
            )
            .filter(AssessmentResponse.assessment_id == assessment.id)
            .all()
        )

        # Create response lookup by indicator_id
        response_lookup = {r.indicator_id: r for r in responses}

        # Calculate overall statistics
        total_indicators = sum(len(area.indicators) for area in governance_areas)
        completed_indicators = sum(1 for response in responses if response.is_completed)
        completion_percentage = (
            (completed_indicators / total_indicators * 100) if total_indicators > 0 else 0
        )

        # Count responses requiring rework
        responses_requiring_rework = sum(1 for response in responses if response.requires_rework)

        # Count responses with feedback
        responses_with_feedback = sum(
            1 for response in responses if len(response.feedback_comments) > 0
        )

        # Count responses with MOVs
        responses_with_movs = sum(1 for response in responses if len(response.movs) > 0)

        # Build governance area progress
        governance_area_progress = []
        for area in governance_areas:
            # Filter out areas that are just containers (parent areas with no direct indicators)
            # Only include areas that have actual indicators or are leaf-level areas
            if not area.indicators:
                continue

            # Check if this area is just a container by looking for indicators with parent_id
            # If all indicators have parent_id, this area is just a container
            has_direct_indicators = any(
                indicator.parent_id is None for indicator in area.indicators
            )
            if not has_direct_indicators:
                continue

            area_responses = [
                response_lookup.get(indicator.id)
                for indicator in area.indicators
                if response_lookup.get(indicator.id)
            ]

            completed_in_area = sum(
                1 for response in area_responses if response and response.is_completed
            )
            rework_in_area = sum(
                1 for response in area_responses if response and response.requires_rework
            )

            area_completion_percentage = (
                (completed_in_area / len(area.indicators) * 100) if len(area.indicators) > 0 else 0
            )

            governance_area_progress.append(
                GovernanceAreaProgress(
                    id=getattr(area, "id"),
                    name=getattr(area, "name"),
                    area_type=area.area_type.value,
                    total_indicators=len(area.indicators),
                    completed_indicators=completed_in_area,
                    completion_percentage=area_completion_percentage,
                    requires_rework_count=rework_in_area,
                )
            )

        # Get recent feedback with enhanced formatting
        recent_feedback_data = self.get_recent_feedback_with_timestamps(db, assessment.id, limit=5)

        # Get comprehensive feedback summary (for future use)
        # feedback_summary = self.get_comprehensive_feedback_summary(db, assessment.id)

        # Create progress object
        progress = ProgressSummary(
            current=completed_indicators,
            total=total_indicators,
            percentage=completion_percentage,
        )

        # Build dashboard stats
        dashboard_stats = AssessmentDashboardStats(
            total_indicators=total_indicators,
            completed_indicators=completed_indicators,
            completion_percentage=completion_percentage,
            progress=progress,
            responses_requiring_rework=responses_requiring_rework,
            responses_with_feedback=responses_with_feedback,
            responses_with_movs=responses_with_movs,
            governance_areas=governance_area_progress,
            assessment_status=assessment.status,
            created_at=assessment.created_at,
            updated_at=assessment.updated_at,
            submitted_at=assessment.submitted_at,
        )

        return AssessmentDashboardResponse(
            assessment_id=assessment.id,
            blgu_user_id=blgu_user_id,
            barangay_name=barangay_name,
            performance_year=current_year,
            assessment_year=current_year,
            stats=dashboard_stats,
            feedback=recent_feedback_data,
            upcoming_deadlines=[],  # TODO: Implement deadline logic if needed
        )

    def get_assessment_stats(self, db: Session) -> dict[str, Any]:
        """
        Get assessment statistics for admin dashboard.

        Args:
            db: Database session

        Returns:
            Dictionary with assessment statistics
        """
        total_assessments = db.query(Assessment).count()

        # Assessments by status
        status_stats = (
            db.query(Assessment.status, func.count(Assessment.id)).group_by(Assessment.status).all()
        )

        # Responses by completion status
        total_responses = db.query(AssessmentResponse).count()
        completed_responses = (
            db.query(AssessmentResponse).filter(AssessmentResponse.is_completed).count()
        )
        responses_requiring_rework = (
            db.query(AssessmentResponse).filter(AssessmentResponse.requires_rework).count()
        )

        return {
            "total_assessments": total_assessments,
            "assessments_by_status": {status: count for status, count in status_stats},
            "total_responses": total_responses,
            "completed_responses": completed_responses,
            "responses_requiring_rework": responses_requiring_rework,
        }

    def get_all_validated_assessments(
        self,
        db: Session,
        status: AssessmentStatus | None = None,
        assessment_year: int | None = None,
    ) -> list[dict[str, Any]]:
        """
        Get all assessments with compliance status and area results (optionally filtered by status and year).

        Used for MLGOO reports page to display all barangay compliance statuses.

        Args:
            db: Database session
            status: Optional filter by assessment status (shows all if not provided)
            assessment_year: Optional filter by assessment year (defaults to active year)

        Returns:
            List of dictionaries with assessment details including compliance status
        """
        from app.services.assessment_year_service import assessment_year_service

        # Get active year if not specified
        if assessment_year is None:
            assessment_year = assessment_year_service.get_active_year_number(db)

        # Query assessments with related user and barangay data
        # Also eagerly load reviewer and calibration_validator for the validators list
        query = (
            db.query(Assessment)
            .join(User, Assessment.blgu_user_id == User.id)
            .options(
                joinedload(Assessment.blgu_user).joinedload(User.barangay),
                joinedload(Assessment.reviewer),
                joinedload(Assessment.calibration_validator),
            )
        )

        # Filter by assessment year
        if assessment_year is not None:
            query = query.filter(Assessment.assessment_year == assessment_year)

        # Filter by status if provided (otherwise return all assessments)
        if status is not None:
            query = query.filter(Assessment.status == status)

        # Order by updated_at descending
        query = query.order_by(Assessment.updated_at.desc())

        assessments = query.all()

        # Build response list
        assessment_list = []
        for assessment in assessments:
            # Get barangay name from relationship
            barangay_name = "Unknown"
            if assessment.blgu_user:
                if hasattr(assessment.blgu_user, "barangay") and assessment.blgu_user.barangay:
                    barangay_name = assessment.blgu_user.barangay.name

            # Get validators/assessors who worked on this assessment
            # Include: reviewed_by (assessor), calibration_validator_id (validator),
            # and users who left feedback comments
            try:
                validators_dict = {}  # Use dict to avoid duplicates by user ID

                # 1. Add the assessor who reviewed (if any)
                if assessment.reviewed_by and assessment.reviewer:
                    reviewer = assessment.reviewer
                    validators_dict[reviewer.id] = {
                        "id": reviewer.id,
                        "name": reviewer.name,
                        "email": reviewer.email,
                        "initials": "".join([word[0].upper() for word in reviewer.name.split()[:2]])
                        if reviewer.name
                        else "A",
                        "role": "assessor",
                    }

                # 2. Add the validator who calibrated (if any)
                if assessment.calibration_validator_id and assessment.calibration_validator:
                    validator = assessment.calibration_validator
                    validators_dict[validator.id] = {
                        "id": validator.id,
                        "name": validator.name,
                        "email": validator.email,
                        "initials": "".join(
                            [word[0].upper() for word in validator.name.split()[:2]]
                        )
                        if validator.name
                        else "V",
                        "role": "validator",
                    }

                # 3. Add users who left feedback comments (existing logic)
                feedback_users = (
                    db.query(User.id, User.name, User.email)
                    .join(FeedbackComment, FeedbackComment.assessor_id == User.id)
                    .join(
                        AssessmentResponse,
                        AssessmentResponse.id == FeedbackComment.response_id,
                    )
                    .filter(AssessmentResponse.assessment_id == assessment.id)
                    .distinct()
                    .all()
                )

                for v in feedback_users:
                    if v.id not in validators_dict:
                        validators_dict[v.id] = {
                            "id": v.id,
                            "name": v.name,
                            "email": v.email,
                            "initials": "".join([word[0].upper() for word in v.name.split()[:2]])
                            if v.name
                            else "?",
                        }

                validators = list(validators_dict.values())
            except Exception as e:
                print(f"ERROR getting validators for assessment {assessment.id}: {str(e)}")
                import traceback

                traceback.print_exc()
                validators = []

            assessment_list.append(
                {
                    "id": assessment.id,
                    "status": assessment.status.value if assessment.status else None,
                    "final_compliance_status": assessment.final_compliance_status.value
                    if assessment.final_compliance_status
                    else None,
                    "area_results": assessment.area_results,
                    "ai_recommendations": assessment.ai_recommendations,
                    "barangay_name": barangay_name,
                    "blgu_user_name": assessment.blgu_user.name
                    if assessment.blgu_user
                    else "Unknown",
                    "validated_at": assessment.validated_at.isoformat() + "Z"
                    if assessment.validated_at
                    else None,
                    "updated_at": assessment.updated_at.isoformat() + "Z"
                    if assessment.updated_at
                    else None,
                    "validators": validators,
                    # MLGOO RE-calibration flags
                    "is_mlgoo_recalibration": assessment.is_mlgoo_recalibration,
                    "mlgoo_recalibration_count": assessment.mlgoo_recalibration_count,
                }
            )

        return assessment_list


# Create service instance
assessment_service = AssessmentService()
