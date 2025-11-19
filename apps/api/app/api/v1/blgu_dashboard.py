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
from typing import Dict, List, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api import deps
from app.db.enums import AssessmentStatus, UserRole
from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.models.governance_area import GovernanceArea, Indicator
from app.db.models.user import User
from app.schemas.blgu_dashboard import BLGUDashboardResponse, IndicatorNavigationItem
from app.services.completeness_validation_service import completeness_validation_service

router = APIRouter(tags=["blgu-dashboard"])


@router.get("/{assessment_id}", response_model=BLGUDashboardResponse)
def get_blgu_dashboard(
    assessment_id: int,
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
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only BLGU users can access the dashboard",
        )

    # Retrieve assessment with eager loading of responses and indicators
    assessment = (
        db.query(Assessment)
        .filter(Assessment.id == assessment_id)
        .options(
            joinedload(Assessment.responses)
            .joinedload(AssessmentResponse.indicator)
            .joinedload(Indicator.governance_area),
            joinedload(Assessment.responses).joinedload(AssessmentResponse.feedback_comments),
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

    # Calculate completion metrics and group by governance area
    # We need to count ALL indicators, not just those with responses

    try:
        # Get all indicators with eager loading of governance_area (same logic as get_assessment_for_blgu_with_full_data)
        all_indicators = db.query(Indicator).options(joinedload(Indicator.governance_area)).all()

        # Build response lookup for O(1) access
        response_lookup = {r.indicator_id: r for r in assessment.responses}

        # Build parent-child relationships
        children_by_parent: Dict[int | None, list[Indicator]] = {}
        for ind in all_indicators:
            parent_id = ind.parent_id
            children_by_parent.setdefault(parent_id, []).append(ind)
    except Exception as e:
        import traceback
        print(f"Error loading indicators: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error loading indicators: {str(e)}",
        )

    # Structure to group indicators by governance area
    governance_area_groups: Dict[int, Dict[str, Any]] = defaultdict(
        lambda: {
            "governance_area_id": 0,
            "governance_area_name": "",
            "indicators": []
        }
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
        governance_area_groups[area_id]["indicators"].append({
            "indicator_id": indicator.id,
            "indicator_name": indicator.name,
            "is_complete": is_complete,
            "response_id": response.id if response else None,
        })

    # Get all governance areas
    governance_areas = db.query(GovernanceArea).all()

    # Process all top-level indicators in each governance area
    completed_indicators = 0
    incomplete_indicators = 0

    try:
        for area in governance_areas:
            # Get top-level indicators for this area (indicators without parents)
            top_level_indicators = [
                ind for ind in all_indicators
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

    # Epic 5.0: Include assessor comments if assessment status is REWORK
    # Note: Also check legacy NEEDS_REWORK for backward compatibility
    rework_comments = None
    if assessment.status in [AssessmentStatus.REWORK, AssessmentStatus.NEEDS_REWORK]:
        # Collect all feedback comments from all responses (excluding internal notes)
        comments_list = []
        for response in assessment.responses:
            for feedback in response.feedback_comments:
                # Only include non-internal feedback (public comments for BLGU)
                if not feedback.is_internal_note:
                    comments_list.append({
                        "comment": feedback.comment,
                        "comment_type": feedback.comment_type,
                        "indicator_id": response.indicator_id,
                        "indicator_name": response.indicator.name,
                        "created_at": feedback.created_at.isoformat() if feedback.created_at else None,
                    })

        rework_comments = comments_list if comments_list else None

    # Epic 5.0: Return status and rework tracking fields
    return {
        "assessment_id": assessment_id,
        "status": assessment.status.value,  # Epic 5.0: Assessment workflow status
        "rework_count": assessment.rework_count,  # Epic 5.0: Rework cycle count (0 or 1)
        "rework_requested_at": assessment.rework_requested_at.isoformat() if assessment.rework_requested_at else None,  # Epic 5.0
        "rework_requested_by": assessment.rework_requested_by,  # Epic 5.0: Assessor who requested rework
        "total_indicators": total_indicators,
        "completed_indicators": completed_indicators,
        "incomplete_indicators": incomplete_indicators,
        "completion_percentage": round(completion_percentage, 2),
        "governance_areas": governance_areas_list,
        "rework_comments": rework_comments,
    }


@router.get("/{assessment_id}/indicators/navigation", response_model=List[IndicatorNavigationItem])
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

    for response in assessment.responses:
        # TRUST DATABASE's is_completed FLAG
        # This flag is already calculated and stored by storage_service.py
        # after every MOV upload/delete using completeness_validation_service
        is_complete = response.is_completed if response.is_completed is not None else False
        completion_status = "complete" if is_complete else "incomplete"

        # Generate frontend route path
        route_path = f"/blgu/assessment/{assessment_id}/indicator/{response.indicator.id}"

        navigation_list.append({
            "indicator_id": response.indicator.id,
            "title": response.indicator.name,
            "completion_status": completion_status,
            "route_path": route_path,
            "governance_area_name": response.indicator.governance_area.name,
            "governance_area_id": response.indicator.governance_area.id,
        })

    return navigation_list
