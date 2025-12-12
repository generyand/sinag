"""
BLGU Dashboard API endpoints.

This module provides endpoints for BLGU users to:
- View completion metrics for their assessments
- Navigate to incomplete indicators
- View assessor rework comments

IMPORTANT: These endpoints show COMPLETION status only (complete/incomplete).
Compliance status (PASS/FAIL/CONDITIONAL) is NEVER exposed to BLGU users.
"""

from collections import defaultdict
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload, selectinload

from app.api import deps
from app.db.enums import AssessmentStatus, UserRole
from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from app.schemas.blgu_dashboard import (
    AISummary,
    AISummaryIndicator,
    BLGUDashboardResponse,
    IndicatorNavigationItem,
)

router = APIRouter(tags=["blgu-dashboard"])


@router.get("/{assessment_id}", response_model=BLGUDashboardResponse)
def get_blgu_dashboard(
    assessment_id: int,
    language: str | None = Query(
        None,
        description="Language code for AI summary: ceb (Bisaya), fil (Tagalog), en (English). Defaults to user's preferred language.",
    ),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get BLGU dashboard with completion metrics for an assessment.

    Returns completion tracking data including:
    - Total indicators, completed count, incomplete count
    - Completion percentage
    - Grouped indicators by governance area and section
    - Rework comments (if assessment status is REWORK)

    **Security**: Only shows completion status (complete/incomplete).
    Compliance status (PASS/FAIL/CONDITIONAL) is never exposed.

    **Access**: BLGU users can only access their own assessment data.
    """
    # Check user role is BLGU_USER
    if current_user.role != UserRole.BLGU_USER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,  # noqa: F823 - status is imported from fastapi
            detail="Only BLGU users can access the dashboard",
        )

    # Retrieve assessment with eager loading to prevent N+1 queries
    # PERFORMANCE FIX: Load all related data upfront in a single query
    from app.db.models.assessment import FeedbackComment

    assessment = (
        db.query(Assessment)
        .options(
            # Eager load responses with their indicators and feedback comments
            selectinload(Assessment.responses)
            .joinedload(AssessmentResponse.indicator)
            .joinedload(Indicator.governance_area),
            selectinload(Assessment.responses)
            .selectinload(AssessmentResponse.feedback_comments)
            .joinedload(FeedbackComment.assessor),
            # Eager load MOV files for annotation processing
            selectinload(Assessment.mov_files),
        )
        .filter(Assessment.id == assessment_id)
        .first()
    )

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with id {assessment_id} not found",
        )

    # Check ownership: assessment must belong to current user
    if assessment.blgu_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this assessment",
        )

    # Calculate completion metrics and group by governance area
    # We need to count ALL indicators, not just those with responses

    try:
        # Get all indicators with eager loading of governance_area, sorted by sort_order and indicator_code
        all_indicators = (
            db.query(Indicator)
            .options(joinedload(Indicator.governance_area))
            .order_by(
                Indicator.governance_area_id,
                Indicator.sort_order,
                Indicator.indicator_code,
            )
            .all()
        )

        # Build response lookup for O(1) access
        response_lookup = {r.indicator_id: r for r in assessment.responses}

        # Build parent-child relationships (children inherit sort order from query)
        children_by_parent: dict[int | None, list[Indicator]] = {}
        for ind in all_indicators:
            parent_id = ind.parent_id
            children_by_parent.setdefault(parent_id, []).append(ind)

        # Initialize year placeholder resolver for dynamic year resolution
        # Use the assessment's year so historical assessments show correct dates
        from app.core.year_resolver import get_year_resolver

        try:
            # Pass the assessment's year to resolve placeholders correctly
            # This ensures viewing 2024 assessment shows "CY 2024" not "CY 2025"
            year_resolver = get_year_resolver(db, year=assessment.assessment_year)
        except ValueError:
            # If no active assessment year config, skip resolution
            year_resolver = None

    except Exception as e:
        import traceback

        print(f"Error loading indicators: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error loading indicators: {str(e)}",
        )

    # Structure to group indicators by governance area
    governance_area_groups: dict[int, dict[str, Any]] = defaultdict(
        lambda: {"governance_area_id": 0, "governance_area_name": "", "indicators": []}
    )

    def count_leaf_indicators(indicator: Indicator) -> int:
        """Recursively count leaf indicators (indicators without children)."""
        children = children_by_parent.get(indicator.id, [])
        if not children:
            return 1  # This is a leaf indicator
        # If has children, count children instead
        return sum(count_leaf_indicators(child) for child in children)

    def process_indicator(indicator: Indicator) -> None:
        """Process an indicator and its children for completion metrics."""
        nonlocal completed_indicators, incomplete_indicators

        children = children_by_parent.get(indicator.id, [])

        # If this indicator has children, process children instead
        if children:
            for child in children:
                process_indicator(child)
            return

        # This is a leaf indicator - check completion status
        response = response_lookup.get(indicator.id)

        if response:
            # TRUST DATABASE's is_completed FLAG
            # This flag is already calculated and stored by storage_service.py
            # after every MOV upload/delete using completeness_validation_service
            is_complete = response.is_completed if response.is_completed is not None else False
        else:
            # No response yet - indicator is incomplete
            is_complete = False

        if is_complete:
            completed_indicators += 1
        else:
            incomplete_indicators += 1

        # Group by governance area
        governance_area = indicator.governance_area
        area_id = governance_area.id

        # Initialize governance area data if first time
        if governance_area_groups[area_id]["governance_area_id"] == 0:
            governance_area_groups[area_id]["governance_area_id"] = area_id
            governance_area_groups[area_id]["governance_area_name"] = governance_area.name

        # Add indicator data to the group
        # Calculate feedback counts for this indicator
        text_comment_count = 0
        if response:
            text_comment_count = len(
                [c for c in response.feedback_comments if not c.is_internal_note]
            )

        # MOV annotation count will be calculated after we load all annotations
        # We'll update this in a second pass below

        # Resolve year placeholders in indicator name
        resolved_name = (
            year_resolver.resolve_string(indicator.name) if year_resolver else indicator.name
        )

        governance_area_groups[area_id]["indicators"].append(
            {
                "indicator_id": indicator.id,
                "indicator_name": resolved_name,
                "is_complete": is_complete,
                "response_id": response.id if response else None,
                # NEW: Add validation status and feedback counts for rework workflow
                "validation_status": response.validation_status.value
                if response and response.validation_status
                else None,
                "text_comment_count": text_comment_count,
                "mov_annotation_count": 0,  # Will be updated in second pass
            }
        )

    # Get all governance areas
    governance_areas = db.query(GovernanceArea).all()

    # Process all top-level indicators in each governance area
    completed_indicators = 0
    incomplete_indicators = 0

    try:
        for area in governance_areas:
            # Get top-level indicators for this area (indicators without parents)
            top_level_indicators = [
                ind
                for ind in all_indicators
                if ind.governance_area_id == area.id and ind.parent_id is None
            ]

            # NOTE: All hardcoded SGLGB indicators are now properly seeded with sub-indicators
            # Parent indicators (1.1, 1.2, etc.) don't have form_schema - their children do
            # We should show ALL parent indicators, not filter them
            # The previous filtering logic (keeping only legacy_indicators[:1]) was for backward
            # compatibility during development, but is no longer needed

            # Skip the legacy filtering - show all parent indicators
            # top_level_indicators is already correct (all parents for this governance area)

            for indicator in top_level_indicators:
                process_indicator(indicator)
    except Exception as e:
        import traceback

        print(f"Error processing indicators: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing indicators: {str(e)}",
        )

    # Calculate total from completed + incomplete
    total_indicators = completed_indicators + incomplete_indicators

    # Calculate completion percentage
    completion_percentage = (
        (completed_indicators / total_indicators * 100) if total_indicators > 0 else 0.0
    )

    # Convert governance area groups to list
    governance_areas_list = list(governance_area_groups.values())

    # Epic 5.0: Include assessor comments AND MOV annotations if assessment status is REWORK
    # Note: Also check legacy NEEDS_REWORK for backward compatibility
    rework_comments = None
    mov_annotations_by_indicator = None
    addressed_indicator_ids = (
        None  # Indicators with feedback that have been re-addressed with new uploads
    )
    if assessment.status in [AssessmentStatus.REWORK, AssessmentStatus.NEEDS_REWORK]:
        # Collect all feedback comments from all responses (excluding internal notes)
        comments_list = []
        for response in assessment.responses:
            for feedback in response.feedback_comments:
                # Only include non-internal feedback (public comments for BLGU)
                if not feedback.is_internal_note:
                    # Resolve year placeholders in indicator name
                    resolved_ind_name = (
                        year_resolver.resolve_string(response.indicator.name)
                        if year_resolver
                        else response.indicator.name
                    )
                    comments_list.append(
                        {
                            "comment": feedback.comment,
                            "comment_type": feedback.comment_type,
                            "indicator_id": response.indicator_id,
                            "indicator_name": resolved_ind_name,
                            "created_at": feedback.created_at.isoformat() + "Z"
                            if feedback.created_at
                            else None,
                        }
                    )

        rework_comments = comments_list if comments_list else None

        # Collect MOV annotations grouped by indicator
        # This shows BLGU users which MOVs the assessor highlighted/commented on
        # PERFORMANCE FIX: Fetch all annotations upfront with a single query to avoid N+1
        from app.db.models.assessment import MOVAnnotation

        # Get all MOV file IDs for this assessment
        mov_file_ids = [mf.id for mf in assessment.mov_files]

        # Fetch ALL annotations for this assessment's MOV files in ONE query
        all_annotations = []
        if mov_file_ids:
            all_annotations = (
                db.query(MOVAnnotation).filter(MOVAnnotation.mov_file_id.in_(mov_file_ids)).all()
            )

        # Build lookup dict: mov_file_id -> list of annotations
        annotations_by_mov_file: dict[int, list[MOVAnnotation]] = defaultdict(list)
        for annotation in all_annotations:
            annotations_by_mov_file[annotation.mov_file_id].append(annotation)

        # Now process indicators and group annotations by indicator_id
        annotations_by_indicator_dict: dict[int, list[dict[str, Any]]] = defaultdict(list)

        for response in assessment.responses:
            # Get all MOV files for this indicator (MOV files are linked to assessment+indicator, not response)
            mov_files_for_indicator = [
                mf for mf in assessment.mov_files if mf.indicator_id == response.indicator_id
            ]

            for mov_file in mov_files_for_indicator:
                # Use preloaded annotations from lookup dict (NO database query!)
                for annotation in annotations_by_mov_file.get(mov_file.id, []):
                    annotations_by_indicator_dict[response.indicator_id].append(
                        {
                            "annotation_id": annotation.id,
                            "mov_file_id": mov_file.id,
                            "mov_filename": mov_file.file_name,  # Use file_name attribute
                            "mov_file_type": mov_file.file_type,
                            "annotation_type": annotation.annotation_type,
                            "page": annotation.page,
                            "rect": annotation.rect,
                            "rects": annotation.rects,
                            "comment": annotation.comment,
                            "created_at": annotation.created_at.isoformat() + "Z"
                            if annotation.created_at
                            else None,
                            "indicator_id": response.indicator_id,
                            "indicator_name": year_resolver.resolve_string(response.indicator.name)
                            if year_resolver
                            else response.indicator.name,
                        }
                    )

        mov_annotations_by_indicator = (
            dict(annotations_by_indicator_dict) if annotations_by_indicator_dict else None
        )

        # Epic 5.0: Calculate addressed_indicator_ids - indicators with feedback that have new uploads
        # This tells the frontend which rework indicators have been re-addressed by BLGU
        addressed_indicator_ids = []
        rework_requested_at = assessment.rework_requested_at

        if rework_requested_at:
            # Get all indicator IDs that have feedback (comments or annotations)
            feedback_indicator_ids = set()

            # From comments
            for comment_data in comments_list:
                if comment_data.get("indicator_id"):
                    feedback_indicator_ids.add(comment_data["indicator_id"])

            # From annotations
            for indicator_id in annotations_by_indicator_dict.keys():
                feedback_indicator_ids.add(indicator_id)

            # Check which feedback indicators have new files uploaded after rework_requested_at
            for indicator_id in feedback_indicator_ids:
                # Check if there are any MOV files uploaded after rework_requested_at
                has_new_files = any(
                    mf.indicator_id == indicator_id
                    and mf.uploaded_at
                    and mf.uploaded_at > rework_requested_at
                    and mf.deleted_at is None  # Not soft-deleted
                    for mf in assessment.mov_files
                )
                if has_new_files:
                    addressed_indicator_ids.append(indicator_id)

        # SECOND PASS: Update mov_annotation_count in governance_area_groups
        # Now that we have annotations_by_indicator_dict, update the counts
        for area_id, area_data in governance_area_groups.items():
            for indicator_data in area_data["indicators"]:
                indicator_id = indicator_data["indicator_id"]
                annotation_count = len(annotations_by_indicator_dict.get(indicator_id, []))
                indicator_data["mov_annotation_count"] = annotation_count

    # PARALLEL CALIBRATION: Get all pending calibration info
    # pending_calibrations is a list of calibration requests from different validators
    pending_calibrations = assessment.pending_calibrations or []
    calibration_governance_area_id = None
    calibration_governance_area_name = None
    calibration_governance_areas = []  # List of all pending calibration areas

    if assessment.is_calibration_rework:
        # Build list of all governance areas with pending calibrations
        for pc in pending_calibrations:
            calibration_governance_areas.append(
                {
                    "governance_area_id": pc.get("governance_area_id"),
                    "governance_area_name": pc.get("governance_area_name"),
                    "validator_name": pc.get("validator_name"),
                    "requested_at": pc.get("requested_at"),
                    "approved": pc.get("approved", False),
                }
            )

        # Legacy single calibration info (for backward compatibility)
        if assessment.calibration_validator_id:
            calibration_validator = (
                db.query(User).filter(User.id == assessment.calibration_validator_id).first()
            )
            if calibration_validator and calibration_validator.validator_area_id:
                cal_area = (
                    db.query(GovernanceArea)
                    .filter(GovernanceArea.id == calibration_validator.validator_area_id)
                    .first()
                )
                if cal_area:
                    calibration_governance_area_id = cal_area.id
                    calibration_governance_area_name = cal_area.name

    # AI Summary: Include rework or calibration summary if available
    # PARALLEL CALIBRATION: Combine summaries from all governance areas
    ai_summary = None
    ai_summary_available_languages = None
    ai_summaries_by_area = []  # List of summaries from each governance area

    if assessment.status in [AssessmentStatus.REWORK, AssessmentStatus.NEEDS_REWORK]:
        # Determine target language (parameter > user preference > default)
        target_lang = language or current_user.preferred_language or "ceb"

        # Validate language code
        if target_lang not in ["ceb", "fil", "en"]:
            target_lang = "ceb"  # Default to Bisaya if invalid

        # Check if this is a calibration rework with parallel summaries
        if assessment.is_calibration_rework and assessment.calibration_summaries_by_area:
            # PARALLEL CALIBRATION: Combine summaries from all governance areas
            summary_type = "calibration"
            combined_indicator_summaries = []
            combined_priority_actions = []
            combined_overall_parts = []
            all_languages = set()

            for (
                area_id_str,
                area_summary_data,
            ) in assessment.calibration_summaries_by_area.items():
                if not isinstance(area_summary_data, dict):
                    continue

                # Track available languages
                all_languages.update(
                    lang for lang in ["ceb", "en", "fil"] if lang in area_summary_data
                )

                # Get the summary in target language
                lang_summary = None
                if target_lang in area_summary_data:
                    lang_summary = area_summary_data[target_lang]
                else:
                    # Fallback to any available language
                    for fallback_lang in ["ceb", "en", "fil"]:
                        if fallback_lang in area_summary_data:
                            lang_summary = area_summary_data[fallback_lang]
                            break

                if lang_summary:
                    # Add area summary to combined list for UI grouping
                    area_info = {
                        "governance_area_id": lang_summary.get("governance_area_id"),
                        "governance_area": lang_summary.get("governance_area"),
                        "overall_summary": lang_summary.get("overall_summary", ""),
                        "indicator_summaries": lang_summary.get("indicator_summaries", []),
                        "priority_actions": lang_summary.get("priority_actions", []),
                        "estimated_time": lang_summary.get("estimated_time"),
                    }
                    ai_summaries_by_area.append(area_info)

                    # Combine for single unified summary
                    if lang_summary.get("overall_summary"):
                        area_name = lang_summary.get("governance_area", f"Area {area_id_str}")
                        combined_overall_parts.append(
                            f"**{area_name}**: {lang_summary['overall_summary']}"
                        )

                    for ind_sum in lang_summary.get("indicator_summaries", []):
                        indicator_name = ind_sum.get("indicator_name", "")
                        if year_resolver:
                            indicator_name = year_resolver.resolve_string(indicator_name)
                        combined_indicator_summaries.append(
                            AISummaryIndicator(
                                indicator_id=ind_sum.get("indicator_id", 0),
                                indicator_name=indicator_name,
                                key_issues=ind_sum.get("key_issues", []),
                                suggested_actions=ind_sum.get("suggested_actions", []),
                                affected_movs=ind_sum.get("affected_movs", []),
                            )
                        )

                    combined_priority_actions.extend(lang_summary.get("priority_actions", []))

            ai_summary_available_languages = list(all_languages) if all_languages else None

            if combined_indicator_summaries:
                # Create combined AI summary
                combined_overall = (
                    "\n\n".join(combined_overall_parts) if combined_overall_parts else ""
                )

                ai_summary = AISummary(
                    overall_summary=combined_overall,
                    governance_area=None,  # Multiple areas
                    governance_area_id=None,  # Multiple areas
                    indicator_summaries=combined_indicator_summaries,
                    priority_actions=combined_priority_actions,
                    estimated_time=None,  # Combined estimate not meaningful
                    generated_at=datetime.utcnow(),
                    language=target_lang,
                    summary_type=summary_type,
                )

        elif assessment.is_calibration_rework and assessment.calibration_summary:
            # Legacy single calibration summary (backward compatibility)
            summary_data = assessment.calibration_summary
            summary_type = "calibration"

            if summary_data:
                # Get available languages
                if isinstance(summary_data, dict):
                    ai_summary_available_languages = [
                        lang for lang in ["ceb", "en", "fil"] if lang in summary_data
                    ]

                # Get the summary in the requested language
                lang_summary = None
                if isinstance(summary_data, dict):
                    if target_lang in summary_data:
                        lang_summary = summary_data[target_lang]
                    elif "overall_summary" in summary_data:
                        lang_summary = summary_data
                    else:
                        for fallback_lang in ["ceb", "en", "fil"]:
                            if fallback_lang in summary_data:
                                lang_summary = summary_data[fallback_lang]
                                break

                if lang_summary:
                    indicator_summaries = []
                    for ind_sum in lang_summary.get("indicator_summaries", []):
                        indicator_name = ind_sum.get("indicator_name", "")
                        if year_resolver:
                            indicator_name = year_resolver.resolve_string(indicator_name)
                        indicator_summaries.append(
                            AISummaryIndicator(
                                indicator_id=ind_sum.get("indicator_id", 0),
                                indicator_name=indicator_name,
                                key_issues=ind_sum.get("key_issues", []),
                                suggested_actions=ind_sum.get("suggested_actions", []),
                                affected_movs=ind_sum.get("affected_movs", []),
                            )
                        )

                    generated_at = None
                    if lang_summary.get("generated_at"):
                        try:
                            generated_at_str = lang_summary["generated_at"]
                            if isinstance(generated_at_str, str):
                                if generated_at_str.endswith("Z"):
                                    generated_at_str = generated_at_str[:-1] + "+00:00"
                                generated_at = datetime.fromisoformat(generated_at_str)
                        except (ValueError, TypeError):
                            pass

                    ai_summary = AISummary(
                        overall_summary=lang_summary.get("overall_summary", ""),
                        governance_area=lang_summary.get("governance_area"),
                        governance_area_id=lang_summary.get("governance_area_id"),
                        indicator_summaries=indicator_summaries,
                        priority_actions=lang_summary.get("priority_actions", []),
                        estimated_time=lang_summary.get("estimated_time"),
                        generated_at=generated_at,
                        language=lang_summary.get("language", target_lang),
                        summary_type=summary_type,
                    )

        elif assessment.rework_summary:
            # Use rework summary (assessor rework, not validator calibration)
            summary_data = assessment.rework_summary
            summary_type = "rework"

            if summary_data:
                # Get available languages
                if isinstance(summary_data, dict):
                    ai_summary_available_languages = [
                        lang for lang in ["ceb", "en", "fil"] if lang in summary_data
                    ]

                # Get the summary in the requested language
                lang_summary = None
                if isinstance(summary_data, dict):
                    if target_lang in summary_data:
                        lang_summary = summary_data[target_lang]
                    elif "overall_summary" in summary_data:
                        lang_summary = summary_data
                    else:
                        for fallback_lang in ["ceb", "en", "fil"]:
                            if fallback_lang in summary_data:
                                lang_summary = summary_data[fallback_lang]
                                break

                if lang_summary:
                    indicator_summaries = []
                    for ind_sum in lang_summary.get("indicator_summaries", []):
                        indicator_name = ind_sum.get("indicator_name", "")
                        if year_resolver:
                            indicator_name = year_resolver.resolve_string(indicator_name)
                        indicator_summaries.append(
                            AISummaryIndicator(
                                indicator_id=ind_sum.get("indicator_id", 0),
                                indicator_name=indicator_name,
                                key_issues=ind_sum.get("key_issues", []),
                                suggested_actions=ind_sum.get("suggested_actions", []),
                                affected_movs=ind_sum.get("affected_movs", []),
                            )
                        )

                    generated_at = None
                    if lang_summary.get("generated_at"):
                        try:
                            generated_at_str = lang_summary["generated_at"]
                            if isinstance(generated_at_str, str):
                                if generated_at_str.endswith("Z"):
                                    generated_at_str = generated_at_str[:-1] + "+00:00"
                                generated_at = datetime.fromisoformat(generated_at_str)
                        except (ValueError, TypeError):
                            pass

                    ai_summary = AISummary(
                        overall_summary=lang_summary.get("overall_summary", ""),
                        governance_area=lang_summary.get("governance_area"),
                        governance_area_id=lang_summary.get("governance_area_id"),
                        indicator_summaries=indicator_summaries,
                        priority_actions=lang_summary.get("priority_actions", []),
                        estimated_time=lang_summary.get("estimated_time"),
                        generated_at=generated_at,
                        language=lang_summary.get("language", target_lang),
                        summary_type=summary_type,
                    )

    # Verdict data - ONLY expose when assessment is COMPLETED
    # This ensures BLGU users never see Pass/Fail status prematurely
    final_compliance_status = None
    area_results = None
    ai_recommendations = None

    if assessment.status == AssessmentStatus.COMPLETED:
        # Parse area_results - CALCULATE from checklist items (same as GAR)
        # This ensures BLGU dashboard shows same results as GAR
        if assessment.area_results:
            from app.db.models.governance_area import ChecklistItem
            from app.services.checklist_utils import (
                calculate_governance_area_result,
                calculate_indicator_status_from_checklist,
                clean_checklist_label,
                get_checklist_validation_result,
                is_minimum_requirement,
            )

            # Get all governance areas for lookup
            all_governance_areas = db.query(GovernanceArea).all()
            governance_area_by_name = {ga.name: ga for ga in all_governance_areas}

            # Build response lookup
            response_by_indicator_id = {r.indicator_id: r for r in assessment.responses}

            # Calculate indicator statuses from checklist items (same logic as GAR)
            area_indicator_counts: dict[str, dict[str, int]] = {}
            area_indicator_statuses: dict[str, list[str | None]] = {}

            for area_name in assessment.area_results.keys():
                area_indicator_counts[area_name] = {
                    "total": 0,
                    "passed": 0,
                    "failed": 0,
                    "conditional": 0,
                }
                area_indicator_statuses[area_name] = []

                # Get governance area
                ga = governance_area_by_name.get(area_name)
                if not ga:
                    continue

                # Get all indicators for this area
                area_indicators = (
                    db.query(Indicator).filter(Indicator.governance_area_id == ga.id).all()
                )

                # Build parent IDs to identify leaf indicators
                parent_ids = {ind.parent_id for ind in area_indicators if ind.parent_id}
                leaf_indicators = [ind for ind in area_indicators if ind.id not in parent_ids]

                for indicator in leaf_indicators:
                    response = response_by_indicator_id.get(indicator.id)

                    # Get checklist items for this indicator
                    checklist_items = (
                        db.query(ChecklistItem)
                        .filter(ChecklistItem.indicator_id == indicator.id)
                        .order_by(ChecklistItem.display_order)
                        .all()
                    )

                    # Filter to minimum requirements only (same as GAR)
                    gar_checklist = []
                    for item in checklist_items:
                        if not is_minimum_requirement(
                            item.label, item.item_type, indicator.indicator_code
                        ):
                            continue
                        validation_result = get_checklist_validation_result(item, response)
                        display_label = clean_checklist_label(item.label, indicator.indicator_code)
                        gar_checklist.append(
                            {
                                "item_id": item.item_id,
                                "label": display_label,
                                "validation_result": validation_result,
                            }
                        )

                    # Calculate indicator status from checklist items
                    calculated_status = None
                    if gar_checklist:
                        calculated_status = calculate_indicator_status_from_checklist(
                            gar_checklist,
                            indicator.indicator_code,
                            indicator.validation_rule,
                        )

                    # Fallback to stored validator decision if no checklist items
                    if calculated_status is None and response and response.validation_status:
                        calculated_status = (
                            response.validation_status.value
                            if hasattr(response.validation_status, "value")
                            else response.validation_status
                        )

                    # Count the calculated status
                    area_indicator_counts[area_name]["total"] += 1
                    if calculated_status == "PASS":
                        area_indicator_counts[area_name]["passed"] += 1
                    elif calculated_status == "FAIL":
                        area_indicator_counts[area_name]["failed"] += 1
                    elif calculated_status == "CONDITIONAL":
                        area_indicator_counts[area_name]["conditional"] += 1

                    area_indicator_statuses[area_name].append(calculated_status)

            # Build area_results_list with CALCULATED governance area results
            area_results_list = []
            for area_name in assessment.area_results.keys():
                counts = area_indicator_counts.get(
                    area_name,
                    {"total": 0, "passed": 0, "failed": 0, "conditional": 0},
                )
                ga = governance_area_by_name.get(area_name)

                # Calculate governance area result from indicator statuses (same as GAR)
                indicator_statuses = area_indicator_statuses.get(area_name, [])
                calculated_area_result = calculate_governance_area_result(indicator_statuses)

                area_results_list.append(
                    {
                        "area_id": ga.id if ga else None,
                        "area_name": area_name,
                        "area_type": ga.area_type.value
                        if ga and ga.area_type
                        else (
                            "Core"
                            if area_name
                            in [
                                "Financial Administration and Sustainability",
                                "Disaster Preparedness",
                                "Safety, Peace and Order",
                            ]
                            else "Essential"
                        ),
                        "passed": calculated_area_result == "Passed",
                        "total_indicators": counts["total"],
                        # SGLGB Rule: Conditional = Considered = PASS (counts toward passing)
                        "passed_indicators": counts["passed"] + counts["conditional"],
                        "failed_indicators": counts["failed"],
                    }
                )
            area_results = area_results_list

            # Recalculate final_compliance_status using 3+1 rule based on calculated area results
            # 3+1 Rule: ALL 3 CORE areas must pass + at least 1 ESSENTIAL area must pass
            core_areas = [
                "Financial Administration and Sustainability",
                "Disaster Preparedness",
                "Safety, Peace and Order",
            ]
            essential_areas = [
                "Social Protection and Sensitivity",
                "Business-Friendliness and Competitiveness",
                "Environmental Management",
            ]

            # Check core areas (all 3 must pass)
            core_results = {
                r["area_name"]: r["passed"]
                for r in area_results_list
                if r["area_name"] in core_areas
            }
            all_core_passed = all(core_results.get(area, False) for area in core_areas)

            # Check essential areas (at least 1 must pass)
            essential_results = {
                r["area_name"]: r["passed"]
                for r in area_results_list
                if r["area_name"] in essential_areas
            }
            at_least_one_essential_passed = any(
                essential_results.get(area, False) for area in essential_areas
            )

            # Apply 3+1 rule
            if all_core_passed and at_least_one_essential_passed:
                final_compliance_status = "PASS"
            else:
                final_compliance_status = "FAIL"

        # AI recommendations (CapDev)
        ai_recommendations = assessment.ai_recommendations

    # BBI Compliance data - ONLY expose when assessment is COMPLETED
    bbi_compliance = None
    if assessment.status == AssessmentStatus.COMPLETED:
        from app.services.bbi_service import bbi_service

        # Recalculate BBI results to ensure consistency with GAR checklist-based validation
        # This updates stored BBI results using the same calculation logic as GAR
        try:
            bbi_service.calculate_all_bbi_compliance(db, assessment)
            db.commit()
        except Exception as e:
            db.rollback()
            # Log but don't fail - continue with potentially stale results
            import logging

            logging.getLogger(__name__).warning(
                f"Failed to recalculate BBI results for assessment {assessment_id}: {e}"
            )

        bbi_results = bbi_service.get_bbi_results(db, assessment_id)
        if bbi_results:
            # Calculate summary
            highly_functional = sum(
                1 for r in bbi_results if r.compliance_rating == "HIGHLY_FUNCTIONAL"
            )
            moderately_functional = sum(
                1 for r in bbi_results if r.compliance_rating == "MODERATELY_FUNCTIONAL"
            )
            low_functional = sum(1 for r in bbi_results if r.compliance_rating == "LOW_FUNCTIONAL")
            avg_compliance = (
                sum(r.compliance_percentage for r in bbi_results) / len(bbi_results)
                if bbi_results
                else 0
            )

            bbi_compliance = {
                "assessment_id": assessment_id,
                "bbi_results": [
                    {
                        "bbi_id": r.bbi_id,
                        "bbi_name": r.bbi.name if r.bbi else "Unknown",
                        "bbi_abbreviation": r.bbi.abbreviation if r.bbi else "",
                        "governance_area_id": r.bbi.governance_area_id if r.bbi else None,
                        "assessment_id": r.assessment_id,
                        "compliance_percentage": r.compliance_percentage or 0,
                        "compliance_rating": r.compliance_rating or "LOW_FUNCTIONAL",
                        "sub_indicators_passed": r.sub_indicators_passed or 0,
                        "sub_indicators_total": r.sub_indicators_total or 0,
                        # sub_indicator_results is stored as dict in DB, transform to list format
                        # or return empty list since BLGU view doesn't need detailed breakdown
                        "sub_indicator_results": [],
                        "calculation_date": r.calculated_at.isoformat() + "Z"
                        if r.calculated_at
                        else None,
                    }
                    for r in bbi_results
                ],
                "summary": {
                    "total_bbis": len(bbi_results),
                    "highly_functional_count": highly_functional,
                    "moderately_functional_count": moderately_functional,
                    "low_functional_count": low_functional,
                    "average_compliance_percentage": round(avg_compliance, 2),
                },
                "calculated_at": bbi_results[0].calculated_at.isoformat() + "Z"
                if bbi_results and bbi_results[0].calculated_at
                else None,
            }

    # Epic 5.0: Return status and rework tracking fields
    return {
        "assessment_id": assessment_id,
        "status": assessment.status.value,  # Epic 5.0: Assessment workflow status
        "rework_count": assessment.rework_count,  # Epic 5.0: Rework cycle count (0 or 1)
        "rework_requested_at": assessment.rework_requested_at.isoformat() + "Z"
        if assessment.rework_requested_at
        else None,  # Epic 5.0
        "rework_requested_by": assessment.rework_requested_by,  # Epic 5.0: Assessor who requested rework
        # Calibration tracking (Phase 2 Validator workflow)
        "is_calibration_rework": assessment.is_calibration_rework,  # True if Validator calibrated (BLGU should submit back to Validator)
        "calibration_validator_id": assessment.calibration_validator_id,  # Legacy: single validator who requested calibration
        "calibration_governance_area_id": calibration_governance_area_id,  # Legacy: single governance area that was calibrated
        "calibration_governance_area_name": calibration_governance_area_name,  # Legacy: name of calibrated area
        # PARALLEL CALIBRATION: Multiple validators can request calibration
        "pending_calibrations_count": len(
            pending_calibrations
        ),  # Total pending calibration requests
        "calibration_governance_areas": calibration_governance_areas,  # List of all pending calibration areas with details
        "ai_summaries_by_area": ai_summaries_by_area
        if ai_summaries_by_area
        else None,  # Summaries grouped by governance area
        # MLGOO RE-calibration tracking (distinct from Validator calibration)
        "is_mlgoo_recalibration": assessment.is_mlgoo_recalibration,  # True if MLGOO requested RE-calibration
        "mlgoo_recalibration_indicator_ids": assessment.mlgoo_recalibration_indicator_ids,  # Specific indicators to address
        "mlgoo_recalibration_mov_file_ids": assessment.mlgoo_recalibration_mov_file_ids,  # Specific MOV files flagged
        "mlgoo_recalibration_comments": assessment.mlgoo_recalibration_comments,  # MLGOO's explanation
        "mlgoo_recalibration_count": assessment.mlgoo_recalibration_count,  # Count of RE-calibrations (max 1)
        "mlgoo_recalibration_requested_at": assessment.mlgoo_recalibration_requested_at.isoformat()
        + "Z"
        if assessment.mlgoo_recalibration_requested_at
        else None,  # Timestamp for timeline
        "total_indicators": total_indicators,
        "completed_indicators": completed_indicators,
        "incomplete_indicators": incomplete_indicators,
        "completion_percentage": round(completion_percentage, 2),
        "governance_areas": governance_areas_list,
        "rework_comments": rework_comments,
        "rework_submitted_at": assessment.rework_submitted_at.isoformat() + "Z"
        if assessment.rework_submitted_at
        else None,  # When BLGU resubmitted after rework (locks resubmit button)
        "calibration_submitted_at": assessment.calibration_submitted_at.isoformat() + "Z"
        if assessment.calibration_submitted_at
        else None,  # When BLGU resubmitted after calibration (locks resubmit button)
        "mov_annotations_by_indicator": mov_annotations_by_indicator,  # MOV annotations grouped by indicator
        "addressed_indicator_ids": addressed_indicator_ids,  # Indicators with feedback that have new uploads after rework
        # AI Summary for rework/calibration guidance
        "ai_summary": ai_summary,
        "ai_summary_available_languages": ai_summary_available_languages,
        # Timeline dates for phase tracking
        "submitted_at": assessment.submitted_at.isoformat() + "Z"
        if assessment.submitted_at
        else None,
        "validated_at": assessment.validated_at.isoformat() + "Z"
        if assessment.validated_at
        else None,
        # Verdict data - ONLY populated when COMPLETED
        "final_compliance_status": final_compliance_status,
        "area_results": area_results,
        "ai_recommendations": ai_recommendations,
        # BBI Compliance data - ONLY populated when COMPLETED
        "bbi_compliance": bbi_compliance,
    }


@router.get(
    "/{assessment_id}/indicators/navigation",
    response_model=list[IndicatorNavigationItem],
)
def get_indicator_navigation(
    assessment_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get indicator navigation list with completion status and route paths.

    Returns a list of all indicators for the assessment with:
    - Indicator ID, title, and governance area
    - Completion status (complete/incomplete)
    - Frontend route path for navigation

    **Security**: Only shows completion status (complete/incomplete).
    Compliance status (PASS/FAIL/CONDITIONAL) is never exposed.

    **Access**: BLGU users can only access their own assessment data.
    """
    # Check user role is BLGU_USER
    if current_user.role != UserRole.BLGU_USER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only BLGU users can access indicator navigation",
        )

    # Retrieve assessment with eager loading of responses and indicators
    assessment = (
        db.query(Assessment)
        .filter(Assessment.id == assessment_id)
        .options(
            joinedload(Assessment.responses)
            .joinedload(AssessmentResponse.indicator)
            .joinedload(Indicator.governance_area)
        )
        .first()
    )

    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with id {assessment_id} not found",
        )

    # Check ownership: assessment must belong to current user
    if assessment.blgu_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this assessment",
        )

    # Build navigation list with completion status and route paths
    navigation_list = []

    # Initialize year placeholder resolver with the assessment's year
    # This ensures historical assessments show correct year in indicator names
    from app.core.year_resolver import get_year_resolver

    try:
        year_resolver = get_year_resolver(db, year=assessment.assessment_year)
    except ValueError:
        year_resolver = None

    for response in assessment.responses:
        # TRUST DATABASE's is_completed FLAG
        # This flag is already calculated and stored by storage_service.py
        # after every MOV upload/delete using completeness_validation_service
        is_complete = response.is_completed if response.is_completed is not None else False
        completion_status = "complete" if is_complete else "incomplete"

        # Generate frontend route path
        route_path = f"/blgu/assessment/{assessment_id}/indicator/{response.indicator.id}"

        # Resolve year placeholders in indicator name
        resolved_title = (
            year_resolver.resolve_string(response.indicator.name)
            if year_resolver
            else response.indicator.name
        )

        navigation_list.append(
            {
                "indicator_id": response.indicator.id,
                "title": resolved_title,
                "completion_status": completion_status,
                "route_path": route_path,
                "governance_area_name": response.indicator.governance_area.name,
                "governance_area_id": response.indicator.governance_area.id,
            }
        )

    return navigation_list
