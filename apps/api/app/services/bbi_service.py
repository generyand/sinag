"""
🏛️ BBI Service
Comprehensive BBI (Barangay-based Institutions) management service.

This service handles:
- Full CRUD operations for BBIs
- BBI compliance rate calculation based on validator decisions (DILG MC 2024-417)
- Integration with assessment finalization workflow
- Triggered when assessment reaches COMPLETED status

Compliance Rate Calculation (DILG MC 2024-417) - 4-tier system:
- 75% - 100%: HIGHLY_FUNCTIONAL
- 50% - 74%: MODERATELY_FUNCTIONAL
- 1% - 49%: LOW_FUNCTIONAL
- 0%: NON_FUNCTIONAL

Source of truth: AssessmentResponse.validation_status (validator decisions)
"""

from datetime import datetime
from typing import Any

from fastapi import HTTPException, status
from loguru import logger
from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload

from app.core.cache import CACHE_TTL_INTERNAL_ANALYTICS, cache
from app.db.enums import AssessmentStatus, BBIStatus
from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.models.bbi import BBI, BBIResult
from app.db.models.governance_area import ChecklistItem, GovernanceArea, Indicator
from app.services.checklist_utils import (
    calculate_indicator_status_from_checklist,
    clean_checklist_label,
    get_checklist_validation_result,
    is_minimum_requirement,
)

# BBI metadata configuration - maps indicator codes to BBI details
# Includes count-based thresholds for functionality levels per DILG specifications
BBI_CONFIG = {
    "2.1": {
        "abbreviation": "BDRRMC",
        "name": "Barangay Disaster Risk Reduction and Management Committee",
        "thresholds": {
            "highly_functional": {"min": 3, "max": 4},
            "moderately_functional": {"min": 2, "max": 2},
            "low_functional": {"min": 1, "max": 1},
            "non_functional": {"min": 0, "max": 0},
        },
    },
    "3.1": {
        "abbreviation": "BADAC",
        "name": "Barangay Anti-Drug Abuse Council",
        "thresholds": {
            "highly_functional": {"min": 7, "max": 10},
            "moderately_functional": {"min": 5, "max": 6},
            "low_functional": {"min": 1, "max": 4},
            "non_functional": {"min": 0, "max": 0},
        },
    },
    "3.2": {
        "abbreviation": "BPOC",
        "name": "Barangay Peace and Order Committee",
        "thresholds": {
            "highly_functional": {"min": 3, "max": 3},
            "moderately_functional": {"min": 2, "max": 2},
            "low_functional": {"min": 1, "max": 1},
            "non_functional": {"min": 0, "max": 0},
        },
    },
    "4.1": {
        "abbreviation": "VAW Desk",
        "name": "Barangay Violence Against Women Desk",
        "thresholds": {
            "highly_functional": {"min": 5, "max": 7},
            "moderately_functional": {"min": 3, "max": 4},
            "low_functional": {"min": 1, "max": 2},
            "non_functional": {"min": 0, "max": 0},
        },
    },
    "4.3": {
        "abbreviation": "BDC",
        "name": "Barangay Development Council",
        "thresholds": {
            "highly_functional": {"min": 3, "max": 4},
            "moderately_functional": {"min": 2, "max": 2},
            "low_functional": {"min": 1, "max": 1},
            "non_functional": {"min": 0, "max": 0},
        },
    },
    "4.5": {
        "abbreviation": "BCPC",
        "name": "Barangay Council for the Protection of Children",
        "thresholds": {
            "highly_functional": {"min": 4, "max": 6},
            "moderately_functional": {"min": 3, "max": 3},
            "low_functional": {"min": 1, "max": 2},
            "non_functional": {"min": 0, "max": 0},
        },
    },
    "6.1": {
        "abbreviation": "BESWMC",
        "name": "Barangay Ecological Solid Waste Management Committee",
        "thresholds": {
            "highly_functional": {"min": 3, "max": 4},
            "moderately_functional": {"min": 2, "max": 2},
            "low_functional": {"min": 1, "max": 1},
            "non_functional": {"min": 0, "max": 0},
        },
    },
}


def get_bbi_rating_by_count(indicator_code: str, passed_count: int) -> BBIStatus:
    """
    Get BBI rating based on count thresholds (not percentage).

    Uses the count-based thresholds from BBI_CONFIG.

    Args:
        indicator_code: The indicator code (e.g., "2.1", "3.1")
        passed_count: Number of sub-indicators that passed

    Returns:
        BBIStatus enum value
    """
    config = BBI_CONFIG.get(indicator_code)
    if not config or "thresholds" not in config:
        # Fallback for unmapped BBIs
        if passed_count >= 3:
            return BBIStatus.HIGHLY_FUNCTIONAL
        elif passed_count >= 2:
            return BBIStatus.MODERATELY_FUNCTIONAL
        elif passed_count >= 1:
            return BBIStatus.LOW_FUNCTIONAL
        return BBIStatus.NON_FUNCTIONAL

    thresholds = config["thresholds"]

    if (
        thresholds["highly_functional"]["min"]
        <= passed_count
        <= thresholds["highly_functional"]["max"]
    ):
        return BBIStatus.HIGHLY_FUNCTIONAL
    elif (
        thresholds["moderately_functional"]["min"]
        <= passed_count
        <= thresholds["moderately_functional"]["max"]
    ):
        return BBIStatus.MODERATELY_FUNCTIONAL
    elif thresholds["low_functional"]["min"] <= passed_count <= thresholds["low_functional"]["max"]:
        return BBIStatus.LOW_FUNCTIONAL
    return BBIStatus.NON_FUNCTIONAL


class BBIService:
    """
    Service for managing BBI data and calculating BBI statuses.

    Follows the Fat Service pattern - all business logic lives here,
    routers are thin and just handle HTTP.
    """

    # ========================================================================
    # CRUD Operations
    # ========================================================================

    def create_bbi(self, db: Session, data: dict[str, Any]) -> BBI:
        """
        Create a new BBI.

        Args:
            db: Database session
            data: BBI data (name, abbreviation, description, governance_area_id)

        Returns:
            Created BBI instance

        Raises:
            HTTPException: If governance area doesn't exist or name/abbreviation already exists
        """
        # Validate governance_area_id exists
        governance_area = (
            db.query(GovernanceArea)
            .filter(GovernanceArea.id == data.get("governance_area_id"))
            .first()
        )
        if not governance_area:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Governance area with ID {data.get('governance_area_id')} not found",
            )

        # Check for duplicate name
        existing_bbi = (
            db.query(BBI)
            .filter(
                and_(
                    BBI.name == data.get("name"),
                    BBI.governance_area_id == data.get("governance_area_id"),
                )
            )
            .first()
        )
        if existing_bbi:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"BBI with name '{data.get('name')}' already exists in this governance area",
            )

        # Check for duplicate abbreviation
        existing_bbi_abbr = (
            db.query(BBI)
            .filter(
                and_(
                    BBI.abbreviation == data.get("abbreviation"),
                    BBI.governance_area_id == data.get("governance_area_id"),
                )
            )
            .first()
        )
        if existing_bbi_abbr:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"BBI with abbreviation '{data.get('abbreviation')}' already exists in this governance area",
            )

        # Create BBI
        bbi = BBI(
            name=data.get("name"),
            abbreviation=data.get("abbreviation"),
            description=data.get("description"),
            governance_area_id=data.get("governance_area_id"),
            mapping_rules=data.get("mapping_rules"),
            is_active=True,
        )

        db.add(bbi)
        db.commit()
        db.refresh(bbi)

        logger.info(f"Created BBI: {bbi.name} (ID: {bbi.id})")
        return bbi

    def get_bbi(self, db: Session, bbi_id: int) -> BBI | None:
        """
        Get a BBI by ID.

        Args:
            db: Database session
            bbi_id: BBI ID

        Returns:
            BBI instance or None if not found
        """
        return (
            db.query(BBI).options(joinedload(BBI.governance_area)).filter(BBI.id == bbi_id).first()
        )

    def list_bbis(
        self,
        db: Session,
        governance_area_id: int | None = None,
        is_active: bool | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[BBI]:
        """
        List BBIs with optional filters.

        Args:
            db: Database session
            governance_area_id: Filter by governance area
            is_active: Filter by active status
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return

        Returns:
            List of BBI instances
        """
        query = db.query(BBI).options(joinedload(BBI.governance_area))

        # Apply filters
        if governance_area_id is not None:
            query = query.filter(BBI.governance_area_id == governance_area_id)
        if is_active is not None:
            query = query.filter(BBI.is_active == is_active)

        # Apply pagination and return
        return query.offset(skip).limit(limit).all()

    def update_bbi(self, db: Session, bbi_id: int, data: dict[str, Any]) -> BBI:
        """
        Update a BBI.

        Args:
            db: Database session
            bbi_id: BBI ID
            data: Updated BBI data

        Returns:
            Updated BBI instance

        Raises:
            HTTPException: If BBI not found or validation fails
        """
        bbi = self.get_bbi(db, bbi_id)
        if not bbi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"BBI with ID {bbi_id} not found",
            )

        # Check for duplicate name if name is being updated
        if "name" in data and data["name"] != bbi.name:
            existing_bbi = (
                db.query(BBI)
                .filter(
                    and_(
                        BBI.name == data["name"],
                        BBI.governance_area_id == bbi.governance_area_id,
                        BBI.id != bbi_id,
                    )
                )
                .first()
            )
            if existing_bbi:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"BBI with name '{data['name']}' already exists in this governance area",
                )

        # Check for duplicate abbreviation if abbreviation is being updated
        if "abbreviation" in data and data["abbreviation"] != bbi.abbreviation:
            existing_bbi_abbr = (
                db.query(BBI)
                .filter(
                    and_(
                        BBI.abbreviation == data["abbreviation"],
                        BBI.governance_area_id == bbi.governance_area_id,
                        BBI.id != bbi_id,
                    )
                )
                .first()
            )
            if existing_bbi_abbr:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"BBI with abbreviation '{data['abbreviation']}' already exists in this governance area",
                )

        # Validate mapping_rules if provided
        if "mapping_rules" in data and data["mapping_rules"] is not None:
            if not isinstance(data["mapping_rules"], dict):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="mapping_rules must be a valid JSON object",
                )

        # Update fields
        for key, value in data.items():
            if hasattr(bbi, key):
                setattr(bbi, key, value)

        db.commit()
        db.refresh(bbi)

        logger.info(f"Updated BBI: {bbi.name} (ID: {bbi.id})")
        return bbi

    def deactivate_bbi(self, db: Session, bbi_id: int) -> BBI:
        """
        Deactivate a BBI (soft delete).

        Args:
            db: Database session
            bbi_id: BBI ID

        Returns:
            Deactivated BBI instance

        Raises:
            HTTPException: If BBI not found
        """
        bbi = self.get_bbi(db, bbi_id)
        if not bbi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"BBI with ID {bbi_id} not found",
            )

        bbi.is_active = False
        db.commit()
        db.refresh(bbi)

        logger.info(f"Deactivated BBI: {bbi.name} (ID: {bbi.id})")
        return bbi

    # ========================================================================
    # BBI Compliance Rate Calculation (DILG MC 2024-417)
    # ========================================================================

    def calculate_bbi_compliance(
        self,
        db: Session,
        assessment_id: int,
        bbi_indicator: Indicator,
    ) -> dict[str, Any]:
        """
        Calculate BBI compliance rate based on sub-indicator checklist results.

        Per DILG MC 2024-417:
        - 75% - 100%: HIGHLY_FUNCTIONAL
        - 50% - 74%: MODERATELY_FUNCTIONAL
        - Below 50%: LOW_FUNCTIONAL

        Args:
            db: Database session
            assessment_id: Assessment ID
            bbi_indicator: The BBI indicator (is_bbi=True) with children

        Returns:
            Dictionary with compliance calculation results:
            {
                "compliance_percentage": float,
                "compliance_rating": str,
                "sub_indicators_passed": int,
                "sub_indicators_total": int,
                "sub_indicator_results": [
                    {"code": "2.1.1", "name": "Structure", "passed": True, ...},
                    ...
                ]
            }
        """
        # Get sub-indicators (children of the BBI indicator)
        sub_indicators = (
            db.query(Indicator)
            .filter(
                and_(
                    Indicator.parent_id == bbi_indicator.id,
                    Indicator.is_active == True,
                )
            )
            .order_by(Indicator.sort_order, Indicator.indicator_code)
            .all()
        )

        if not sub_indicators:
            # No sub-indicators - treat as single indicator
            # Use same checklist-based calculation as _evaluate_sub_indicator_compliance
            result = self._evaluate_sub_indicator_compliance(db, assessment_id, bbi_indicator)
            passed = result["passed"]

            return {
                "compliance_percentage": 100.0 if passed else 0.0,
                # 0% is NON_FUNCTIONAL per DILG MC 2024-417 (not LOW_FUNCTIONAL)
                "compliance_rating": BBIStatus.HIGHLY_FUNCTIONAL.value
                if passed
                else BBIStatus.NON_FUNCTIONAL.value,
                "sub_indicators_passed": 1 if passed else 0,
                "sub_indicators_total": 1,
                "sub_indicator_results": [
                    {
                        "code": bbi_indicator.indicator_code,
                        "name": bbi_indicator.name,
                        "passed": passed,
                        "checklist_summary": {},
                    }
                ],
            }

        # Evaluate each sub-indicator
        sub_indicator_results = []
        passed_count = 0

        for sub_indicator in sub_indicators:
            result = self._evaluate_sub_indicator_compliance(db, assessment_id, sub_indicator)
            sub_indicator_results.append(result)
            if result["passed"]:
                passed_count += 1

        total_count = len(sub_indicators)
        compliance_percentage = (passed_count / total_count * 100) if total_count > 0 else 0.0
        compliance_rating = self._get_compliance_rating(compliance_percentage)

        return {
            "compliance_percentage": round(compliance_percentage, 2),
            "compliance_rating": compliance_rating.value,
            "sub_indicators_passed": passed_count,
            "sub_indicators_total": total_count,
            "sub_indicator_results": sub_indicator_results,
        }

    def _evaluate_sub_indicator_compliance(
        self,
        db: Session,
        assessment_id: int,
        sub_indicator: Indicator,
    ) -> dict[str, Any]:
        """
        Evaluate if a sub-indicator passes based on validator decision.

        Priority:
        1. Use stored validation_status (set by Validator/MLGOO) - authoritative source
        2. Fall back to calculating from checklist items if no validation_status

        This ensures BBI status respects validator decisions and MLGOO overrides.

        Args:
            db: Database session
            assessment_id: Assessment ID
            sub_indicator: The sub-indicator to evaluate

        Returns:
            Dictionary with evaluation results:
            {
                "code": "2.1.1",
                "name": "Structure",
                "passed": True/False,
                "validation_status": "PASS" or "FAIL" or None
            }
        """
        # Get the assessment response for this sub-indicator
        response = (
            db.query(AssessmentResponse)
            .filter(
                and_(
                    AssessmentResponse.assessment_id == assessment_id,
                    AssessmentResponse.indicator_id == sub_indicator.id,
                )
            )
            .first()
        )

        # PRIORITY 1: Use stored validation_status (validator/MLGOO decision)
        # This is the authoritative source of truth
        calculated_status = None
        if response and response.validation_status:
            calculated_status = response.validation_status.value

        # FALLBACK: Calculate from checklist items only if no validation_status
        if calculated_status is None:
            # Get checklist items for this sub-indicator
            checklist_items = (
                db.query(ChecklistItem)
                .filter(ChecklistItem.indicator_id == sub_indicator.id)
                .order_by(ChecklistItem.display_order)
                .all()
            )

            # Filter to minimum requirements and get validation results
            gar_checklist = []
            for item in checklist_items:
                if not is_minimum_requirement(
                    item.label, item.item_type, sub_indicator.indicator_code, item.is_profiling_only
                ):
                    continue
                validation_result = get_checklist_validation_result(item, response)
                display_label = clean_checklist_label(item.label, sub_indicator.indicator_code)
                gar_checklist.append(
                    {
                        "item_id": item.item_id,
                        "label": display_label,
                        "validation_result": validation_result,
                    }
                )

            # Calculate status from checklist items if available
            if gar_checklist:
                calculated_status = calculate_indicator_status_from_checklist(
                    gar_checklist,
                    sub_indicator.indicator_code,
                    sub_indicator.validation_rule,
                )

        # Sub-indicator passes if calculated status is PASS or CONDITIONAL
        passed = calculated_status in ("PASS", "CONDITIONAL")

        return {
            "code": sub_indicator.indicator_code,
            "name": sub_indicator.name,
            "passed": passed,
            "validation_status": calculated_status,
        }

    def _get_compliance_rating(self, percentage: float) -> BBIStatus:
        """
        Map compliance percentage to 4-tier rating per DILG MC 2024-417.

        | Compliance Rate | Rating               |
        |-----------------|----------------------|
        | 75% - 100%      | HIGHLY_FUNCTIONAL    |
        | 50% - 74%       | MODERATELY_FUNCTIONAL|
        | 1% - 49%        | LOW_FUNCTIONAL       |
        | 0%              | NON_FUNCTIONAL       |

        Args:
            percentage: Compliance percentage (0-100)

        Returns:
            BBIStatus rating
        """
        if percentage >= 75:
            return BBIStatus.HIGHLY_FUNCTIONAL
        elif percentage >= 50:
            return BBIStatus.MODERATELY_FUNCTIONAL
        elif percentage > 0:
            return BBIStatus.LOW_FUNCTIONAL
        else:
            return BBIStatus.NON_FUNCTIONAL

    def calculate_all_bbi_compliance(self, db: Session, assessment: Assessment) -> list[BBIResult]:
        """
        Calculate compliance for all BBI indicators for an assessment.

        This method should be called when an assessment reaches COMPLETED status.
        It finds all indicators marked as BBIs (is_bbi=True), calculates
        their compliance rates, and stores/updates the results.

        Source of truth: AssessmentResponse.validation_status (validator decisions)

        Args:
            db: Database session
            assessment: Assessment instance (must have blgu_user loaded)

        Returns:
            List of created/updated BBIResult instances
        """
        # Get barangay_id from the assessment's BLGU user
        if not assessment.blgu_user or not assessment.blgu_user.barangay_id:
            logger.error(
                f"Assessment {assessment.id} has no associated barangay. Skipping BBI calculation."
            )
            return []

        barangay_id = assessment.blgu_user.barangay_id
        assessment_year = assessment.assessment_year

        # Find all BBI indicators (is_bbi=True)
        # Note: Only the official 7 BBIs per DILG MC 2024-417 should have is_bbi=True:
        # BDRRMC (2.1), BADAC (3.1), BPOC (3.2), VAW Desk (4.1), BDC (4.3), BCPC (4.5), BESWMC (6.1)
        bbi_indicators = (
            db.query(Indicator)
            .filter(
                and_(
                    Indicator.is_bbi == True,
                    Indicator.is_active == True,
                )
            )
            .options(joinedload(Indicator.governance_area))
            .all()
        )

        logger.info(
            f"Calculating BBI compliance for assessment {assessment.id} "
            f"(barangay_id={barangay_id}, year={assessment_year}): "
            f"found {len(bbi_indicators)} BBI indicators"
        )

        # Calculate compliance for each BBI indicator
        bbi_results = []
        for bbi_indicator in bbi_indicators:
            try:
                # Get or create BBI record for this indicator
                bbi = self._get_or_create_bbi_for_indicator(db, bbi_indicator)

                # Calculate compliance based on validator decisions
                compliance = self.calculate_bbi_compliance(db, assessment.id, bbi_indicator)

                # Upsert BBIResult (update if exists, create if not)
                bbi_result = (
                    db.query(BBIResult)
                    .filter(
                        BBIResult.barangay_id == barangay_id,
                        BBIResult.assessment_year == assessment_year,
                        BBIResult.bbi_id == bbi.id,
                    )
                    .first()
                )

                if bbi_result:
                    # Update existing
                    bbi_result.assessment_id = assessment.id
                    bbi_result.indicator_id = bbi_indicator.id
                    bbi_result.compliance_percentage = compliance["compliance_percentage"]
                    bbi_result.compliance_rating = compliance["compliance_rating"]
                    bbi_result.sub_indicators_passed = compliance["sub_indicators_passed"]
                    bbi_result.sub_indicators_total = compliance["sub_indicators_total"]
                    bbi_result.sub_indicator_results = compliance["sub_indicator_results"]
                    bbi_result.calculated_at = datetime.utcnow()
                    logger.info(
                        f"Updated BBI result for {bbi_indicator.indicator_code}: "
                        f"{compliance['compliance_percentage']}% = {compliance['compliance_rating']}"
                    )
                else:
                    # Create new
                    bbi_result = BBIResult(
                        barangay_id=barangay_id,
                        assessment_year=assessment_year,
                        assessment_id=assessment.id,
                        bbi_id=bbi.id,
                        indicator_id=bbi_indicator.id,
                        compliance_percentage=compliance["compliance_percentage"],
                        compliance_rating=compliance["compliance_rating"],
                        sub_indicators_passed=compliance["sub_indicators_passed"],
                        sub_indicators_total=compliance["sub_indicators_total"],
                        sub_indicator_results=compliance["sub_indicator_results"],
                    )
                    db.add(bbi_result)
                    logger.info(
                        f"Created BBI result for {bbi_indicator.indicator_code}: "
                        f"{compliance['compliance_percentage']}% = {compliance['compliance_rating']}"
                    )

                bbi_results.append(bbi_result)

            except Exception as e:
                logger.error(
                    f"Error calculating BBI compliance for indicator "
                    f"{bbi_indicator.indicator_code}: {str(e)}"
                )
                # Continue with other BBIs even if one fails

        db.flush()
        return bbi_results

    def _get_or_create_bbi_for_indicator(self, db: Session, indicator: Indicator) -> BBI:
        """
        Get or create a BBI record for a given BBI indicator.

        Uses BBI_CONFIG to get the proper abbreviation and name for the BBI.
        Falls back to indicator data if not found in config.

        Args:
            db: Database session
            indicator: The BBI indicator

        Returns:
            BBI instance
        """
        # Get BBI config or use indicator data as fallback
        bbi_config = BBI_CONFIG.get(indicator.indicator_code, {})
        abbreviation = bbi_config.get("abbreviation", indicator.indicator_code)
        name = bbi_config.get("name", indicator.name)

        # Try to find existing BBI by abbreviation in the same governance area
        bbi = (
            db.query(BBI)
            .filter(
                and_(
                    BBI.governance_area_id == indicator.governance_area_id,
                    BBI.abbreviation == abbreviation,
                )
            )
            .first()
        )

        if not bbi:
            # Create new BBI using config data
            bbi = BBI(
                name=name,
                abbreviation=abbreviation,
                description=indicator.description,
                governance_area_id=indicator.governance_area_id,
                is_active=True,
                mapping_rules=None,  # Using percentage-based calculation instead
            )
            db.add(bbi)
            db.flush()  # Get the ID without committing
            logger.info(
                f"Created BBI for indicator {indicator.indicator_code}: {abbreviation} ({name})"
            )

        return bbi

    # ========================================================================
    # Legacy BBI Status Calculation (Backward Compatibility)
    # ========================================================================

    def calculate_bbi_status(
        self,
        db: Session,
        bbi_id: int,
        assessment_id: int,
    ) -> BBIStatus:
        """
        Calculate the BBI status (Functional/Non-Functional) for an assessment.

        This method evaluates the BBI's mapping_rules against the indicator
        statuses in the assessment to determine if the BBI is functional.

        Note: This is a legacy method. The new 4-tier system uses calculate_bbi_compliance.
        Returns HIGHLY_FUNCTIONAL for functional BBIs (backward compatibility).

        Args:
            db: Database session
            bbi_id: BBI ID
            assessment_id: Assessment ID

        Returns:
            BBIStatus (HIGHLY_FUNCTIONAL if functional, NON_FUNCTIONAL otherwise)

        Raises:
            HTTPException: If BBI or assessment not found
        """
        # Get BBI with mapping rules
        bbi = self.get_bbi(db, bbi_id)
        if not bbi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"BBI with ID {bbi_id} not found",
            )

        if not bbi.mapping_rules:
            logger.warning(f"BBI {bbi_id} has no mapping_rules, defaulting to NON_FUNCTIONAL")
            return BBIStatus.NON_FUNCTIONAL

        # Get assessment
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment with ID {assessment_id} not found",
            )

        # Get all indicator statuses for this assessment
        indicator_statuses = self._get_indicator_statuses(db, assessment_id)

        # Evaluate mapping rules
        try:
            is_functional = self._evaluate_mapping_rules(bbi.mapping_rules, indicator_statuses)
            # Use HIGHLY_FUNCTIONAL for backward compatibility (replaces old FUNCTIONAL)
            return BBIStatus.HIGHLY_FUNCTIONAL if is_functional else BBIStatus.NON_FUNCTIONAL
        except Exception as e:
            logger.error(f"Error evaluating BBI mapping rules: {str(e)}")
            return BBIStatus.NON_FUNCTIONAL

    def _get_indicator_statuses(self, db: Session, assessment_id: int) -> dict[int, str]:
        """
        Get all indicator validation statuses for an assessment.

        Args:
            db: Database session
            assessment_id: Assessment ID

        Returns:
            Dictionary mapping indicator_id to validation status (Pass/Fail)
        """
        responses = (
            db.query(AssessmentResponse)
            .filter(AssessmentResponse.assessment_id == assessment_id)
            .all()
        )

        indicator_statuses = {}
        for response in responses:
            if response.validation_status:
                indicator_statuses[response.indicator_id] = response.validation_status.value

        return indicator_statuses

    def _evaluate_mapping_rules(
        self, mapping_rules: dict[str, Any], indicator_statuses: dict[int, str]
    ) -> bool:
        """
        Evaluate mapping rules to determine if BBI is functional.

        Expected mapping_rules structure:
        {
            "operator": "AND" or "OR",
            "conditions": [
                {"indicator_id": 1, "required_status": "PASS"},
                {"indicator_id": 2, "required_status": "PASS"},
                ...
            ]
        }
        Note: required_status must match ValidationStatus enum values (uppercase: "PASS", "FAIL", "CONDITIONAL")

        Args:
            mapping_rules: BBI mapping rules (JSON)
            indicator_statuses: Dictionary of indicator_id -> status

        Returns:
            True if BBI is functional, False otherwise
        """
        operator = mapping_rules.get("operator", "AND")
        conditions = mapping_rules.get("conditions", [])

        if not conditions:
            return False

        results = []
        for condition in conditions:
            indicator_id = condition.get("indicator_id")
            required_status = condition.get("required_status")

            # Get actual status from assessment
            actual_status = indicator_statuses.get(indicator_id)

            # Check if status matches
            if actual_status == required_status:
                results.append(True)
            else:
                results.append(False)

        # Apply operator logic
        if operator == "AND":
            return all(results)
        elif operator == "OR":
            return any(results)
        else:
            logger.warning(f"Unknown operator '{operator}', defaulting to AND logic")
            return all(results)

    def calculate_all_bbi_statuses(self, db: Session, assessment_id: int) -> list[BBIResult]:
        """
        DEPRECATED: Use calculate_all_bbi_compliance instead.

        This legacy method is kept for backward compatibility but redirects
        to the new 4-tier compliance calculation method.

        Args:
            db: Database session
            assessment_id: Assessment ID

        Returns:
            List of created BBIResult instances
        """
        logger.warning(
            "calculate_all_bbi_statuses is deprecated. Use calculate_all_bbi_compliance instead."
        )
        # Get assessment and delegate to new method
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment with ID {assessment_id} not found",
            )
        return self.calculate_all_bbi_compliance(db, assessment)

    # ========================================================================
    # BBI Results
    # ========================================================================

    def get_bbi_results(self, db: Session, assessment_id: int) -> list[BBIResult]:
        """
        Get all BBI results for an assessment.

        Args:
            db: Database session
            assessment_id: Assessment ID

        Returns:
            List of BBIResult instances
        """
        return (
            db.query(BBIResult)
            .options(joinedload(BBIResult.bbi), joinedload(BBIResult.barangay))
            .filter(BBIResult.assessment_id == assessment_id)
            .all()
        )

    def get_bbi_results_by_barangay(
        self,
        db: Session,
        barangay_id: int,
        year: int | None = None,
    ) -> list[BBIResult]:
        """
        Get all BBI results for a specific barangay.

        Args:
            db: Database session
            barangay_id: Barangay ID
            year: Optional assessment year filter

        Returns:
            List of BBIResult instances
        """
        query = (
            db.query(BBIResult)
            .options(joinedload(BBIResult.bbi), joinedload(BBIResult.indicator))
            .filter(BBIResult.barangay_id == barangay_id)
        )

        if year is not None:
            query = query.filter(BBIResult.assessment_year == year)

        return query.order_by(BBIResult.assessment_year.desc()).all()

    def get_bbi_compliance_summary(
        self,
        db: Session,
        barangay_id: int,
        year: int,
    ) -> dict[str, Any]:
        """
        Get a summary of BBI compliance for a barangay in a specific year.

        Args:
            db: Database session
            barangay_id: Barangay ID
            year: Assessment year

        Returns:
            Dictionary with compliance summary for all BBIs
        """
        results = self.get_bbi_results_by_barangay(db, barangay_id, year)

        summary = {
            "barangay_id": barangay_id,
            "assessment_year": year,
            "total_bbis": len(results),
            "highly_functional_count": 0,
            "moderately_functional_count": 0,
            "low_functional_count": 0,
            "non_functional_count": 0,
            "bbi_results": [],
        }

        for result in results:
            rating = result.compliance_rating
            if rating == BBIStatus.HIGHLY_FUNCTIONAL.value:
                summary["highly_functional_count"] += 1
            elif rating == BBIStatus.MODERATELY_FUNCTIONAL.value:
                summary["moderately_functional_count"] += 1
            elif rating == BBIStatus.LOW_FUNCTIONAL.value:
                summary["low_functional_count"] += 1
            elif rating == BBIStatus.NON_FUNCTIONAL.value:
                summary["non_functional_count"] += 1

            summary["bbi_results"].append(
                {
                    "bbi_id": result.bbi_id,
                    "bbi_name": result.bbi.name if result.bbi else None,
                    "bbi_abbreviation": result.bbi.abbreviation if result.bbi else None,
                    "indicator_code": result.indicator.indicator_code if result.indicator else None,
                    "compliance_percentage": result.compliance_percentage,
                    "compliance_rating": result.compliance_rating,
                    "sub_indicators_passed": result.sub_indicators_passed,
                    "sub_indicators_total": result.sub_indicators_total,
                    "calculated_at": result.calculated_at.isoformat()
                    if result.calculated_at
                    else None,
                }
            )

        return summary

    def get_municipality_bbi_analytics(
        self,
        db: Session,
        year: int,
    ) -> dict[str, Any]:
        """
        Get BBI analytics across all barangays for a municipality in a given year.

        This provides the data needed for the MLGOO BBI Status tab:
        - Matrix of barangays × BBIs with compliance ratings
        - Per-BBI breakdown with distribution counts
        - Overall summary statistics

        IMPORTANT: Only includes data from COMPLETED assessments to ensure
        accuracy and consistency. Assessments in other states (DRAFT, SUBMITTED,
        IN_REVIEW, etc.) are excluded from the analytics.

        PERFORMANCE: Results are cached in Redis for 15 minutes to reduce
        database load. Cache is invalidated when new BBI results are calculated.

        Args:
            db: Database session
            year: Assessment year

        Returns:
            Dictionary with municipality-wide BBI analytics:
            {
                "assessment_year": 2025,
                "bbis": [
                    {"bbi_id": 1, "abbreviation": "BDRRMC", "name": "...", "indicator_code": "2.1"},
                    ...
                ],
                "barangays": [
                    {
                        "barangay_id": 1,
                        "barangay_name": "Poblacion",
                        "bbi_statuses": {
                            "BDRRMC": {"rating": "HIGHLY_FUNCTIONAL", "percentage": 100.0},
                            "BADAC": {"rating": "LOW_FUNCTIONAL", "percentage": 30.0},
                            ...
                        }
                    },
                    ...
                ],
                "bbi_distributions": {
                    "BDRRMC": {
                        "highly_functional": [{"barangay_id": 1, "barangay_name": "..."}],
                        "moderately_functional": [...],
                        "low_functional": [...],
                        "non_functional": [...]
                    },
                    ...
                },
                "summary": {
                    "total_barangays": 25,
                    "total_bbis": 7,
                    "overall_highly_functional": 50,
                    "overall_moderately_functional": 30,
                    "overall_low_functional": 15,
                    "overall_non_functional": 5
                }
            }
        """
        # Check cache first
        cache_key = f"bbi_municipality_analytics:year_{year}"
        if cache.is_available:
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                logger.info(f"🎯 BBI municipality analytics cache HIT for {cache_key}")
                return cached_data

        logger.info(f"📊 Computing BBI municipality analytics (cache miss for {cache_key})")

        # Get all BBIResults for the year with eager loading
        # IMPORTANT: Only include results from COMPLETED assessments
        results = (
            db.query(BBIResult)
            .join(Assessment, BBIResult.assessment_id == Assessment.id)
            .options(
                joinedload(BBIResult.bbi),
                joinedload(BBIResult.barangay),
                joinedload(BBIResult.indicator),
            )
            .filter(
                and_(
                    BBIResult.assessment_year == year,
                    Assessment.status == AssessmentStatus.COMPLETED,
                )
            )
            .all()
        )

        # Initialize data structures
        bbis_map: dict[int, dict[str, Any]] = {}
        barangays_map: dict[int, dict[str, Any]] = {}
        bbi_distributions: dict[str, dict[str, list[dict[str, Any]]]] = {}

        # Single pass through results to build all data structures
        for result in results:
            # Build BBIs map and initialize distribution
            if result.bbi and result.bbi_id not in bbis_map:
                abbr = result.bbi.abbreviation
                bbis_map[result.bbi_id] = {
                    "bbi_id": result.bbi_id,
                    "abbreviation": abbr,
                    "name": result.bbi.name,
                    "indicator_code": result.indicator.indicator_code if result.indicator else None,
                }
                # Initialize distribution for this BBI
                bbi_distributions[abbr] = {
                    "highly_functional": [],
                    "moderately_functional": [],
                    "low_functional": [],
                    "non_functional": [],
                }

            if not result.barangay or not result.bbi:
                continue

            barangay_id = result.barangay_id
            abbr = result.bbi.abbreviation

            # Build barangays map
            if barangay_id not in barangays_map:
                barangays_map[barangay_id] = {
                    "barangay_id": barangay_id,
                    "barangay_name": result.barangay.name,
                    "bbi_statuses": {},
                }

            barangays_map[barangay_id]["bbi_statuses"][abbr] = {
                "rating": result.compliance_rating,
                "percentage": result.compliance_percentage,
            }

            # Build distribution
            barangay_info = {
                "barangay_id": barangay_id,
                "barangay_name": result.barangay.name,
                "percentage": result.compliance_percentage,
            }

            rating = result.compliance_rating
            if rating == BBIStatus.HIGHLY_FUNCTIONAL.value:
                bbi_distributions[abbr]["highly_functional"].append(barangay_info)
            elif rating == BBIStatus.MODERATELY_FUNCTIONAL.value:
                bbi_distributions[abbr]["moderately_functional"].append(barangay_info)
            elif rating == BBIStatus.LOW_FUNCTIONAL.value:
                bbi_distributions[abbr]["low_functional"].append(barangay_info)
            elif rating == BBIStatus.NON_FUNCTIONAL.value:
                bbi_distributions[abbr]["non_functional"].append(barangay_info)

        # Sort BBIs by indicator_code for consistent ordering
        bbis = sorted(bbis_map.values(), key=lambda x: x.get("indicator_code") or "")

        # Sort barangays by name
        barangays = sorted(barangays_map.values(), key=lambda x: x["barangay_name"])

        # Sort barangays within each distribution by name
        for abbr in bbi_distributions:
            for rating_key in bbi_distributions[abbr]:
                bbi_distributions[abbr][rating_key].sort(key=lambda x: x["barangay_name"])

        # Calculate summary statistics
        total_highly = sum(
            len(bbi_distributions[abbr]["highly_functional"]) for abbr in bbi_distributions
        )
        total_moderately = sum(
            len(bbi_distributions[abbr]["moderately_functional"]) for abbr in bbi_distributions
        )
        total_low = sum(
            len(bbi_distributions[abbr]["low_functional"]) for abbr in bbi_distributions
        )
        total_non = sum(
            len(bbi_distributions[abbr]["non_functional"]) for abbr in bbi_distributions
        )

        summary = {
            "total_barangays": len(barangays),
            "total_bbis": len(bbis),
            "overall_highly_functional": total_highly,
            "overall_moderately_functional": total_moderately,
            "overall_low_functional": total_low,
            "overall_non_functional": total_non,
        }

        result = {
            "assessment_year": year,
            "bbis": bbis,
            "barangays": barangays,
            "bbi_distributions": bbi_distributions,
            "summary": summary,
        }

        # Cache the result for 15 minutes
        if cache.is_available:
            try:
                cache.set(cache_key, result, ttl=CACHE_TTL_INTERNAL_ANALYTICS)
                logger.info(f"💾 Cached BBI municipality analytics for {cache_key}")
            except Exception as e:
                logger.warning(f"⚠️ Failed to cache BBI municipality analytics: {e}")

        return result


# Singleton instance
bbi_service = BBIService()
