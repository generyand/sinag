"""
🏛️ BBI Service
Comprehensive BBI (Barangay-based Institutions) management service.

This service handles:
- Full CRUD operations for BBIs
- BBI compliance rate calculation based on sub-indicator checklist results (DILG MC 2024-417)
- Integration with assessment finalization workflow

Compliance Rate Calculation (DILG MC 2024-417):
- 75% - 100%: HIGHLY_FUNCTIONAL
- 50% - 74%: MODERATELY_FUNCTIONAL
- Below 50%: LOW_FUNCTIONAL
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from loguru import logger
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

from app.db.enums import BBIStatus, ValidationStatus
from app.db.models.assessment import Assessment, AssessmentResponse
from app.db.models.bbi import BBI, BBIResult
from app.db.models.governance_area import ChecklistItem, GovernanceArea, Indicator


class BBIService:
    """
    Service for managing BBI data and calculating BBI statuses.

    Follows the Fat Service pattern - all business logic lives here,
    routers are thin and just handle HTTP.
    """

    # ========================================================================
    # CRUD Operations
    # ========================================================================

    def create_bbi(
        self, db: Session, data: Dict[str, Any]
    ) -> BBI:
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

    def get_bbi(self, db: Session, bbi_id: int) -> Optional[BBI]:
        """
        Get a BBI by ID.

        Args:
            db: Database session
            bbi_id: BBI ID

        Returns:
            BBI instance or None if not found
        """
        return (
            db.query(BBI)
            .options(joinedload(BBI.governance_area))
            .filter(BBI.id == bbi_id)
            .first()
        )

    def list_bbis(
        self,
        db: Session,
        governance_area_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[BBI]:
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

    def update_bbi(
        self, db: Session, bbi_id: int, data: Dict[str, Any]
    ) -> BBI:
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
    ) -> Dict[str, Any]:
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
            # Check if the BBI indicator itself passes based on its response
            response = (
                db.query(AssessmentResponse)
                .filter(
                    and_(
                        AssessmentResponse.assessment_id == assessment_id,
                        AssessmentResponse.indicator_id == bbi_indicator.id,
                    )
                )
                .first()
            )

            passed = response and response.validation_status == ValidationStatus.PASS
            return {
                "compliance_percentage": 100.0 if passed else 0.0,
                "compliance_rating": BBIStatus.HIGHLY_FUNCTIONAL.value if passed else BBIStatus.LOW_FUNCTIONAL.value,
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
            result = self._evaluate_sub_indicator_compliance(
                db, assessment_id, sub_indicator
            )
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
    ) -> Dict[str, Any]:
        """
        Evaluate if a sub-indicator passes based on its checklist items.

        A sub-indicator PASSES if all required checklist items are satisfied.

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
                "checklist_summary": {
                    "item_id": {"label": "...", "required": True, "satisfied": True},
                    ...
                }
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

        response_data = response.response_data if response else {}

        # Get checklist items for this sub-indicator
        checklist_items = (
            db.query(ChecklistItem)
            .filter(ChecklistItem.indicator_id == sub_indicator.id)
            .order_by(ChecklistItem.display_order)
            .all()
        )

        checklist_summary = {}
        all_required_satisfied = True

        for item in checklist_items:
            satisfied = self._is_checklist_item_satisfied(item, response_data)
            checklist_summary[item.item_id] = {
                "label": item.label,
                "required": item.required,
                "satisfied": satisfied,
                "item_type": item.item_type,
            }

            # Check if required item is not satisfied
            if item.required and not satisfied:
                all_required_satisfied = False

        # Handle validation_rule for the sub-indicator
        # ALL_ITEMS_REQUIRED: all required items must be satisfied
        # ANY_ITEM_REQUIRED: at least one required item must be satisfied (OR logic)
        validation_rule = sub_indicator.validation_rule or "ALL_ITEMS_REQUIRED"

        if validation_rule == "ANY_ITEM_REQUIRED":
            # For OR logic, check if at least one required item is satisfied
            required_items = [
                item for item in checklist_items if item.required
            ]
            satisfied_required = [
                item for item in required_items
                if self._is_checklist_item_satisfied(item, response_data)
            ]
            passed = len(satisfied_required) > 0 if required_items else True
        else:
            # Default: ALL_ITEMS_REQUIRED
            passed = all_required_satisfied

        return {
            "code": sub_indicator.indicator_code,
            "name": sub_indicator.name,
            "passed": passed,
            "validation_rule": validation_rule,
            "checklist_summary": checklist_summary,
        }

    def _is_checklist_item_satisfied(
        self,
        item: ChecklistItem,
        response_data: Dict[str, Any],
    ) -> bool:
        """
        Check if a single checklist item is satisfied based on response data.

        Args:
            item: The checklist item to check
            response_data: The response data from AssessmentResponse

        Returns:
            True if the item is satisfied, False otherwise
        """
        item_id = item.item_id

        # Skip info_text items - they don't need validation
        if item.item_type == "info_text":
            return True

        # Check standard checkbox validation
        if item_id in response_data:
            value = response_data[item_id]
            if isinstance(value, bool):
                return value
            if isinstance(value, str):
                return value.lower() in ["true", "yes", "1"]

        # Check for YES/NO pattern (assessment_field)
        yes_key = f"{item_id}_yes"
        no_key = f"{item_id}_no"
        if yes_key in response_data or no_key in response_data:
            if response_data.get(yes_key):
                return True
            elif response_data.get(no_key):
                return False

        # Check for document_count or calculation_field - has value means satisfied
        if item.item_type in ["document_count", "calculation_field"]:
            if item_id in response_data and response_data[item_id]:
                return True

        return False

    def _get_compliance_rating(self, percentage: float) -> BBIStatus:
        """
        Map compliance percentage to 3-tier rating per DILG MC 2024-417.

        Args:
            percentage: Compliance percentage (0-100)

        Returns:
            BBIStatus rating
        """
        if percentage >= 75:
            return BBIStatus.HIGHLY_FUNCTIONAL
        elif percentage >= 50:
            return BBIStatus.MODERATELY_FUNCTIONAL
        else:
            return BBIStatus.LOW_FUNCTIONAL

    def calculate_all_bbi_compliance(
        self, db: Session, assessment_id: int
    ) -> List[BBIResult]:
        """
        Calculate compliance for all BBI indicators for an assessment.

        This method should be called when an assessment is finalized.
        It finds all indicators marked as BBIs (is_bbi=True), calculates
        their compliance rates, and stores the results.

        Args:
            db: Database session
            assessment_id: Assessment ID

        Returns:
            List of created BBIResult instances
        """
        # Get assessment
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment with ID {assessment_id} not found",
            )

        # Find all BBI indicators (is_bbi=True)
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

        logger.info(f"Found {len(bbi_indicators)} BBI indicators for assessment {assessment_id}")

        # Delete existing BBI results for this assessment (recalculation)
        db.query(BBIResult).filter(BBIResult.assessment_id == assessment_id).delete()

        # Calculate compliance for each BBI indicator
        bbi_results = []
        for bbi_indicator in bbi_indicators:
            try:
                # Get or create BBI record for this indicator
                bbi = self._get_or_create_bbi_for_indicator(db, bbi_indicator)

                # Calculate compliance
                compliance = self.calculate_bbi_compliance(
                    db, assessment_id, bbi_indicator
                )

                # Create BBIResult with compliance data
                bbi_result = BBIResult(
                    bbi_id=bbi.id,
                    assessment_id=assessment_id,
                    status=BBIStatus(compliance["compliance_rating"]),
                    compliance_percentage=compliance["compliance_percentage"],
                    compliance_rating=compliance["compliance_rating"],
                    sub_indicators_passed=compliance["sub_indicators_passed"],
                    sub_indicators_total=compliance["sub_indicators_total"],
                    sub_indicator_results=compliance["sub_indicator_results"],
                    calculation_details={
                        "indicator_code": bbi_indicator.indicator_code,
                        "indicator_name": bbi_indicator.name,
                        "calculation_method": "percentage_based",
                        "calculated_at": datetime.utcnow().isoformat(),
                    },
                )
                db.add(bbi_result)
                bbi_results.append(bbi_result)

                logger.info(
                    f"Calculated BBI compliance for {bbi_indicator.indicator_code} "
                    f"({bbi_indicator.name}): {compliance['compliance_percentage']}% "
                    f"= {compliance['compliance_rating']}"
                )
            except Exception as e:
                logger.error(
                    f"Error calculating BBI compliance for indicator "
                    f"{bbi_indicator.indicator_code}: {str(e)}"
                )
                # Continue with other BBIs even if one fails

        db.commit()
        return bbi_results

    def _get_or_create_bbi_for_indicator(
        self, db: Session, indicator: Indicator
    ) -> BBI:
        """
        Get or create a BBI record for a given BBI indicator.

        Args:
            db: Database session
            indicator: The BBI indicator

        Returns:
            BBI instance
        """
        # Try to find existing BBI by name/abbreviation
        bbi = (
            db.query(BBI)
            .filter(
                and_(
                    BBI.governance_area_id == indicator.governance_area_id,
                    BBI.abbreviation == indicator.indicator_code,
                )
            )
            .first()
        )

        if not bbi:
            # Create new BBI
            bbi = BBI(
                name=indicator.name,
                abbreviation=indicator.indicator_code,
                description=indicator.description,
                governance_area_id=indicator.governance_area_id,
                is_active=True,
                mapping_rules=None,  # Using percentage-based calculation instead
            )
            db.add(bbi)
            db.flush()  # Get the ID without committing
            logger.info(f"Created BBI for indicator {indicator.indicator_code}: {indicator.name}")

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

        Args:
            db: Database session
            bbi_id: BBI ID
            assessment_id: Assessment ID

        Returns:
            BBIStatus (FUNCTIONAL or NON_FUNCTIONAL)

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
            is_functional = self._evaluate_mapping_rules(
                bbi.mapping_rules, indicator_statuses
            )
            return BBIStatus.FUNCTIONAL if is_functional else BBIStatus.NON_FUNCTIONAL
        except Exception as e:
            logger.error(f"Error evaluating BBI mapping rules: {str(e)}")
            return BBIStatus.NON_FUNCTIONAL

    def _get_indicator_statuses(
        self, db: Session, assessment_id: int
    ) -> Dict[int, str]:
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
        self, mapping_rules: Dict[str, Any], indicator_statuses: Dict[int, str]
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

    def calculate_all_bbi_statuses(
        self, db: Session, assessment_id: int
    ) -> List[BBIResult]:
        """
        Calculate all BBI statuses for a finalized assessment.

        This method should be called when an assessment is finalized.
        It calculates the status of all active BBIs and stores the results.

        Args:
            db: Database session
            assessment_id: Assessment ID

        Returns:
            List of created BBIResult instances
        """
        # Get assessment
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment with ID {assessment_id} not found",
            )

        # Get all active BBIs (we can calculate for all areas, or filter by assessment's relevant areas)
        bbis = db.query(BBI).filter(BBI.is_active == True).all()

        # Calculate status for each BBI
        bbi_results = []
        for bbi in bbis:
            try:
                # Calculate BBI status
                bbi_status = self.calculate_bbi_status(db, bbi.id, assessment_id)

                # Store result
                bbi_result = BBIResult(
                    bbi_id=bbi.id,
                    assessment_id=assessment_id,
                    status=bbi_status,
                    calculation_details={
                        "mapping_rules": bbi.mapping_rules,
                        "calculated_at": datetime.utcnow().isoformat(),
                    },
                )
                db.add(bbi_result)
                bbi_results.append(bbi_result)

                logger.info(
                    f"Calculated BBI status for BBI {bbi.id} ({bbi.name}): {bbi_status.value}"
                )
            except Exception as e:
                logger.error(f"Error calculating BBI status for BBI {bbi.id}: {str(e)}")
                # Continue with other BBIs even if one fails

        db.commit()
        return bbi_results

    # ========================================================================
    # BBI Results
    # ========================================================================

    def get_bbi_results(
        self, db: Session, assessment_id: int
    ) -> List[BBIResult]:
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
            .options(joinedload(BBIResult.bbi))
            .filter(BBIResult.assessment_id == assessment_id)
            .all()
        )


# Singleton instance
bbi_service = BBIService()
