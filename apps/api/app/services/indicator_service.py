"""
🧪 Indicator Service
Comprehensive indicator management with versioning support.

This service handles:
- Full CRUD operations for indicators
- Versioning logic to preserve historical data integrity
- Seed/utility methods for development/testing
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from loguru import logger
from sqlalchemy.orm import Session, joinedload

from app.db.models.governance_area import GovernanceArea, Indicator, IndicatorHistory
from app.db.models.user import User
from app.schemas.form_schema import FormSchema
from app.schemas.calculation_schema import CalculationSchema
from app.services.form_schema_validator import (
    generate_validation_errors,
    validate_calculation_schema_field_references,
)
from app.core.security import sanitize_rich_text, sanitize_text_input


class IndicatorService:
    """
    Service for managing indicator data with versioning support.

    Follows the Fat Service pattern - all business logic lives here,
    routers are thin and just handle HTTP.
    """

    # ========================================================================
    # CRUD Operations with Versioning
    # ========================================================================

    def create_indicator(
        self, db: Session, data: Dict[str, Any], user_id: int
    ) -> Indicator:
        """
        Create a new indicator with version 1.

        Args:
            db: Database session
            data: Indicator data (name, description, governance_area_id, etc.)
            user_id: ID of user creating the indicator

        Returns:
            Created Indicator instance

        Raises:
            HTTPException: If governance area doesn't exist or parent_id is circular
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

        # Validate parent_id if provided
        parent_id = data.get("parent_id")
        if parent_id:
            parent = db.query(Indicator).filter(Indicator.id == parent_id).first()
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Parent indicator with ID {parent_id} not found",
                )

        # Validate form_schema if provided
        form_schema = data.get("form_schema")
        if form_schema:
            # Convert dict to Pydantic model for validation
            try:
                form_schema_obj = FormSchema(**form_schema)
                validation_errors = generate_validation_errors(form_schema_obj)
                if validation_errors:
                    raise ValueError(
                        f"Form schema validation failed: {'; '.join(validation_errors)}"
                    )
            except Exception as e:
                raise ValueError(f"Invalid form schema format: {str(e)}")

        # Validate calculation_schema if provided
        calculation_schema = data.get("calculation_schema")
        if calculation_schema:
            # Convert dict to Pydantic model for validation
            try:
                calculation_schema_obj = CalculationSchema(**calculation_schema)
                # Pydantic validation already happened, schema structure is valid
            except Exception as e:
                raise ValueError(f"Invalid calculation schema format: {str(e)}")

            # Validate that calculation_schema field references exist in form_schema
            if form_schema:
                try:
                    form_schema_obj = FormSchema(**form_schema)
                    field_ref_errors = validate_calculation_schema_field_references(
                        form_schema_obj, calculation_schema
                    )
                    if field_ref_errors:
                        raise ValueError(
                            f"Calculation schema validation failed: {'; '.join(field_ref_errors)}"
                        )
                except ValueError:
                    # Re-raise our validation errors
                    raise
                except Exception as e:
                    raise ValueError(f"Error validating calculation schema field references: {str(e)}")

        # Sanitize text fields to prevent XSS
        sanitized_description = sanitize_text_input(data.get("description"))
        sanitized_technical_notes = sanitize_rich_text(data.get("technical_notes_text"))

        # Create indicator with version 1
        indicator = Indicator(
            name=data["name"],
            description=sanitized_description,
            version=1,
            is_active=data.get("is_active", True),
            is_auto_calculable=data.get("is_auto_calculable", False),
            is_profiling_only=data.get("is_profiling_only", False),
            form_schema=data.get("form_schema"),
            calculation_schema=data.get("calculation_schema"),
            remark_schema=data.get("remark_schema"),
            technical_notes_text=sanitized_technical_notes,
            governance_area_id=data["governance_area_id"],
            parent_id=parent_id,
        )

        db.add(indicator)
        db.commit()
        db.refresh(indicator)

        logger.info(
            f"Created indicator '{indicator.name}' (ID: {indicator.id}) by user {user_id}"
        )

        return indicator

    def get_indicator(self, db: Session, indicator_id: int) -> Optional[Indicator]:
        """
        Get an indicator by ID with relationships loaded.

        Args:
            db: Database session
            indicator_id: ID of indicator to retrieve

        Returns:
            Indicator instance or None if not found
        """
        return (
            db.query(Indicator)
            .options(
                joinedload(Indicator.governance_area),
                joinedload(Indicator.parent),
                joinedload(Indicator.children),
            )
            .filter(Indicator.id == indicator_id)
            .first()
        )

    def list_indicators(
        self,
        db: Session,
        governance_area_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Indicator]:
        """
        List indicators with optional filtering and pagination.

        Args:
            db: Database session
            governance_area_id: Filter by governance area
            is_active: Filter by active status
            search: Search in name (case-insensitive)
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return

        Returns:
            List of Indicator instances
        """
        query = db.query(Indicator).options(
            joinedload(Indicator.governance_area)
        )

        # Apply filters
        if governance_area_id is not None:
            query = query.filter(Indicator.governance_area_id == governance_area_id)

        if is_active is not None:
            query = query.filter(Indicator.is_active == is_active)

        if search:
            query = query.filter(Indicator.name.ilike(f"%{search}%"))

        # Order by governance_area_id, then name
        query = query.order_by(Indicator.governance_area_id, Indicator.name)

        # Apply pagination
        indicators = query.offset(skip).limit(limit).all()

        return indicators

    def update_indicator(
        self, db: Session, indicator_id: int, data: Dict[str, Any], user_id: int
    ) -> Indicator:
        """
        Update an indicator with versioning logic.

        If schemas are changed, creates a new version and archives the old one.
        If only metadata is changed, updates in place without versioning.

        Args:
            db: Database session
            indicator_id: ID of indicator to update
            data: Updated indicator data
            user_id: ID of user making the update

        Returns:
            Updated Indicator instance

        Raises:
            HTTPException: If indicator not found or validation fails
        """
        indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
        if not indicator:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Indicator with ID {indicator_id} not found",
            )

        # Validate form_schema if being updated
        form_schema = data.get("form_schema")
        if form_schema is not None:
            try:
                form_schema_obj = FormSchema(**form_schema)
                validation_errors = generate_validation_errors(form_schema_obj)
                if validation_errors:
                    raise ValueError(
                        f"Form schema validation failed: {'; '.join(validation_errors)}"
                    )
            except Exception as e:
                raise ValueError(f"Invalid form schema format: {str(e)}")

        # Validate calculation_schema if being updated
        calculation_schema = data.get("calculation_schema")
        if calculation_schema is not None:
            try:
                calculation_schema_obj = CalculationSchema(**calculation_schema)
                # Pydantic validation already happened, schema structure is valid
            except Exception as e:
                raise ValueError(f"Invalid calculation schema format: {str(e)}")

            # Validate that calculation_schema field references exist in form_schema
            # Use updated form_schema if provided, otherwise use existing
            active_form_schema = form_schema if form_schema is not None else indicator.form_schema
            if active_form_schema:
                try:
                    form_schema_obj = FormSchema(**active_form_schema)
                    field_ref_errors = validate_calculation_schema_field_references(
                        form_schema_obj, calculation_schema
                    )
                    if field_ref_errors:
                        raise ValueError(
                            f"Calculation schema validation failed: {'; '.join(field_ref_errors)}"
                        )
                except ValueError:
                    # Re-raise our validation errors
                    raise
                except Exception as e:
                    raise ValueError(f"Error validating calculation schema field references: {str(e)}")

        # Check if schema fields changed (requiring versioning)
        schema_changed = any(
            [
                data.get("form_schema") is not None
                and data.get("form_schema") != indicator.form_schema,
                data.get("calculation_schema") is not None
                and data.get("calculation_schema") != indicator.calculation_schema,
                data.get("remark_schema") is not None
                and data.get("remark_schema") != indicator.remark_schema,
            ]
        )

        if schema_changed:
            # Archive current version
            history = IndicatorHistory(
                indicator_id=indicator.id,
                version=indicator.version,
                name=indicator.name,
                description=indicator.description,
                is_active=indicator.is_active,
                is_auto_calculable=indicator.is_auto_calculable,
                is_profiling_only=indicator.is_profiling_only,
                form_schema=indicator.form_schema,
                calculation_schema=indicator.calculation_schema,
                remark_schema=indicator.remark_schema,
                technical_notes_text=indicator.technical_notes_text,
                governance_area_id=indicator.governance_area_id,
                parent_id=indicator.parent_id,
                created_at=indicator.created_at,
                updated_at=indicator.updated_at,
                archived_at=datetime.utcnow(),
                archived_by=user_id,
            )
            db.add(history)

            # Increment version
            indicator.version += 1
            logger.info(
                f"Creating version {indicator.version} of indicator '{indicator.name}' (ID: {indicator.id})"
            )

        # Update fields with sanitization
        if "name" in data:
            indicator.name = data["name"]
        if "description" in data:
            indicator.description = sanitize_text_input(data["description"])
        if "is_active" in data:
            indicator.is_active = data["is_active"]
        if "is_auto_calculable" in data:
            indicator.is_auto_calculable = data["is_auto_calculable"]
        if "is_profiling_only" in data:
            indicator.is_profiling_only = data["is_profiling_only"]
        if "form_schema" in data:
            indicator.form_schema = data["form_schema"]
        if "calculation_schema" in data:
            indicator.calculation_schema = data["calculation_schema"]
        if "remark_schema" in data:
            indicator.remark_schema = data["remark_schema"]
        if "technical_notes_text" in data:
            indicator.technical_notes_text = sanitize_rich_text(data["technical_notes_text"])

        db.commit()
        db.refresh(indicator)

        logger.info(f"Updated indicator '{indicator.name}' (ID: {indicator.id})")

        return indicator

    def deactivate_indicator(
        self, db: Session, indicator_id: int, user_id: int
    ) -> Indicator:
        """
        Soft delete an indicator by setting is_active to False.

        Args:
            db: Database session
            indicator_id: ID of indicator to deactivate
            user_id: ID of user making the deactivation

        Returns:
            Deactivated Indicator instance

        Raises:
            HTTPException: If indicator not found or has active children
        """
        indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
        if not indicator:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Indicator with ID {indicator_id} not found",
            )

        # Prevent deletion if indicator has active children
        active_children = (
            db.query(Indicator)
            .filter(Indicator.parent_id == indicator_id, Indicator.is_active == True)
            .count()
        )
        if active_children > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot deactivate indicator with {active_children} active child indicators",
            )

        indicator.is_active = False
        db.commit()
        db.refresh(indicator)

        logger.info(
            f"Deactivated indicator '{indicator.name}' (ID: {indicator.id}) by user {user_id}"
        )

        return indicator

    def get_indicator_history(
        self, db: Session, indicator_id: int
    ) -> List[IndicatorHistory]:
        """
        Get all historical versions of an indicator.

        Args:
            db: Database session
            indicator_id: ID of indicator

        Returns:
            List of IndicatorHistory instances ordered by version DESC
        """
        # Get current indicator to verify it exists
        indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()
        if not indicator:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Indicator with ID {indicator_id} not found",
            )

        # Get all archived versions
        history = (
            db.query(IndicatorHistory)
            .options(joinedload(IndicatorHistory.archived_by_user))
            .filter(IndicatorHistory.indicator_id == indicator_id)
            .order_by(IndicatorHistory.version.desc())
            .all()
        )

        return history

    def _check_circular_parent(
        self, db: Session, indicator_id: int, parent_id: int
    ) -> bool:
        """
        Helper to recursively check for circular parent relationships.

        Args:
            db: Database session
            indicator_id: ID of indicator being checked
            parent_id: Proposed parent ID

        Returns:
            True if circular relationship detected

        Raises:
            ValueError: If circular relationship detected
        """
        if indicator_id == parent_id:
            raise ValueError("An indicator cannot be its own parent")

        # Recursively check if parent_id eventually leads back to indicator_id
        current_id = parent_id
        visited = set()

        while current_id is not None:
            if current_id in visited:
                # Infinite loop detected in parent chain (shouldn't happen with proper data)
                raise ValueError("Circular parent chain detected in database")

            if current_id == indicator_id:
                raise ValueError(
                    f"Circular relationship: indicator {indicator_id} cannot have "
                    f"parent {parent_id} as it would create a cycle"
                )

            visited.add(current_id)

            # Get next parent
            parent = db.query(Indicator).filter(Indicator.id == current_id).first()
            if parent:
                current_id = parent.parent_id
            else:
                break

        return False

    # ========================================================================
    # Bulk Operations (Phase 6: Hierarchical Indicator Creation)
    # ========================================================================

    def bulk_create_indicators(
        self,
        db: Session,
        governance_area_id: int,
        indicators_data: List[Dict[str, Any]],
        user_id: int
    ) -> tuple[List[Indicator], Dict[str, int], List[Dict[str, str]]]:
        """
        Create multiple indicators in bulk with proper dependency ordering.

        Uses topological sorting to ensure parents are created before children.
        All operations are wrapped in a transaction for atomicity.

        Args:
            db: Database session
            governance_area_id: Governance area ID for all indicators
            indicators_data: List of indicator dictionaries with temp_id, parent_temp_id, order
            user_id: ID of user creating the indicators

        Returns:
            tuple of (created_indicators, temp_id_mapping, errors)
            - created_indicators: List of created Indicator instances
            - temp_id_mapping: Dict mapping temp_id to real database ID
            - errors: List of error dictionaries with temp_id and error message

        Raises:
            HTTPException: If governance area doesn't exist or circular dependencies detected
        """
        # Validate governance area exists
        governance_area = (
            db.query(GovernanceArea)
            .filter(GovernanceArea.id == governance_area_id)
            .first()
        )
        if not governance_area:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Governance area with ID {governance_area_id} not found",
            )

        created_indicators: List[Indicator] = []
        temp_id_mapping: Dict[str, int] = {}
        errors: List[Dict[str, str]] = []

        try:
            # Topological sort by dependency
            sorted_indicators = self._topological_sort_indicators(indicators_data)

            # Create indicators in dependency order
            for indicator_data in sorted_indicators:
                temp_id = indicator_data.get("temp_id")
                parent_temp_id = indicator_data.get("parent_temp_id")

                try:
                    # Resolve parent_id if parent_temp_id is provided
                    parent_id = None
                    if parent_temp_id:
                        parent_id = temp_id_mapping.get(parent_temp_id)
                        if parent_id is None:
                            raise ValueError(
                                f"Parent temp_id {parent_temp_id} not found in mapping"
                            )

                    # Prepare indicator data
                    create_data = {
                        "name": indicator_data["name"],
                        "description": indicator_data.get("description"),
                        "governance_area_id": governance_area_id,
                        "parent_id": parent_id,
                        "is_active": indicator_data.get("is_active", True),
                        "is_auto_calculable": indicator_data.get("is_auto_calculable", False),
                        "is_profiling_only": indicator_data.get("is_profiling_only", False),
                        "form_schema": indicator_data.get("form_schema"),
                        "calculation_schema": indicator_data.get("calculation_schema"),
                        "remark_schema": indicator_data.get("remark_schema"),
                        "technical_notes_text": indicator_data.get("technical_notes_text"),
                    }

                    # Create the indicator (reusing existing validation logic)
                    indicator = self.create_indicator(db, create_data, user_id)

                    # Store mapping
                    temp_id_mapping[temp_id] = indicator.id
                    created_indicators.append(indicator)

                    logger.info(
                        f"Created indicator '{indicator.name}' (temp_id: {temp_id}, real_id: {indicator.id})"
                    )

                except Exception as e:
                    logger.error(f"Error creating indicator with temp_id {temp_id}: {str(e)}")
                    errors.append({"temp_id": temp_id, "error": str(e)})
                    # Continue processing other indicators if possible
                    # Or raise to rollback all if strict atomicity is required
                    # For now, we'll continue and report errors

            # If any errors occurred, rollback the transaction
            if errors:
                db.rollback()
                logger.warning(f"Bulk creation failed with {len(errors)} errors, transaction rolled back")
                return [], {}, errors

            # Commit transaction
            db.commit()
            logger.info(f"Successfully created {len(created_indicators)} indicators in bulk")

            return created_indicators, temp_id_mapping, errors

        except Exception as e:
            db.rollback()
            logger.error(f"Bulk creation failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Bulk indicator creation failed: {str(e)}",
            )

    def _topological_sort_indicators(
        self, indicators_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Topologically sort indicators by parent-child dependencies.

        Args:
            indicators_data: List of indicator dictionaries with temp_id and parent_temp_id

        Returns:
            Sorted list where parents always appear before children

        Raises:
            ValueError: If circular dependencies are detected
        """
        # Build adjacency list and in-degree count
        graph: Dict[str, List[str]] = {}
        in_degree: Dict[str, int] = {}
        node_data: Dict[str, Dict[str, Any]] = {}

        # Initialize
        for indicator in indicators_data:
            temp_id = indicator["temp_id"]
            parent_temp_id = indicator.get("parent_temp_id")

            node_data[temp_id] = indicator
            in_degree[temp_id] = 0
            graph[temp_id] = []

        # Build graph
        for indicator in indicators_data:
            temp_id = indicator["temp_id"]
            parent_temp_id = indicator.get("parent_temp_id")

            if parent_temp_id:
                if parent_temp_id not in graph:
                    raise ValueError(
                        f"Parent temp_id {parent_temp_id} not found for indicator {temp_id}"
                    )
                graph[parent_temp_id].append(temp_id)
                in_degree[temp_id] += 1

        # Kahn's algorithm for topological sort
        queue = [node for node in in_degree if in_degree[node] == 0]
        sorted_nodes = []

        while queue:
            current = queue.pop(0)
            sorted_nodes.append(current)

            for neighbor in graph[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        # Check for circular dependencies
        if len(sorted_nodes) != len(indicators_data):
            raise ValueError(
                "Circular dependency detected in indicator hierarchy"
            )

        # Return sorted indicator data
        return [node_data[temp_id] for temp_id in sorted_nodes]

    def reorder_indicators(
        self,
        db: Session,
        reorder_data: List[Dict[str, Any]],
        user_id: int
    ) -> List[Indicator]:
        """
        Reorder indicators by updating codes and parent_ids in batch.

        Args:
            db: Database session
            reorder_data: List of dicts with {id, code, parent_id}
            user_id: ID of user performing the reorder

        Returns:
            List of updated Indicator instances

        Raises:
            HTTPException: If circular references are detected
        """
        updated_indicators: List[Indicator] = []

        try:
            # Validate no circular references
            self._validate_no_circular_references(db, reorder_data)

            # Update each indicator
            for update in reorder_data:
                indicator_id = update["id"]
                indicator = db.query(Indicator).filter(Indicator.id == indicator_id).first()

                if not indicator:
                    logger.warning(f"Indicator ID {indicator_id} not found, skipping")
                    continue

                # Update fields
                if "code" in update:
                    # Assuming we add a 'code' field to indicators later
                    # For now, we can update the name to include the code
                    pass

                if "parent_id" in update:
                    indicator.parent_id = update["parent_id"]

                updated_indicators.append(indicator)

            db.commit()
            logger.info(f"Reordered {len(updated_indicators)} indicators")

            return updated_indicators

        except Exception as e:
            db.rollback()
            logger.error(f"Reorder failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Indicator reorder failed: {str(e)}",
            )

    def _validate_no_circular_references(
        self, db: Session, reorder_data: List[Dict[str, Any]]
    ) -> None:
        """
        Validate that the proposed reorder doesn't create circular references.

        Args:
            db: Database session
            reorder_data: List of dicts with {id, parent_id}

        Raises:
            ValueError: If circular references are detected
        """
        # Build parent map from reorder data
        parent_map: Dict[int, Optional[int]] = {}
        for update in reorder_data:
            parent_map[update["id"]] = update.get("parent_id")

        # Check each node for cycles
        for indicator_id in parent_map:
            visited = set()
            current = indicator_id

            while current is not None:
                if current in visited:
                    raise ValueError(
                        f"Circular reference detected: indicator {indicator_id}"
                    )

                visited.add(current)
                current = parent_map.get(current)

    def validate_tree_structure(
        self,
        db: Session,
        governance_area_id: int,
        indicators_data: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Validate indicator tree structure before bulk creation.

        Checks for:
        - Circular references
        - Valid calculation schema field references
        - Weight sum validation (if applicable)

        Args:
            db: Database session
            governance_area_id: Governance area ID
            indicators_data: List of indicator dictionaries

        Returns:
            List of validation error messages (empty if valid)
        """
        errors: List[str] = []

        try:
            # Check circular references via topological sort
            try:
                self._topological_sort_indicators(indicators_data)
            except ValueError as e:
                errors.append(f"Circular reference detected: {str(e)}")

            # Validate calculation schema field references
            for indicator_data in indicators_data:
                form_schema = indicator_data.get("form_schema")
                calculation_schema = indicator_data.get("calculation_schema")

                if form_schema and calculation_schema:
                    try:
                        form_schema_obj = FormSchema(**form_schema)
                        field_ref_errors = validate_calculation_schema_field_references(
                            form_schema_obj, calculation_schema
                        )
                        if field_ref_errors:
                            errors.extend([
                                f"Indicator {indicator_data.get('temp_id')}: {err}"
                                for err in field_ref_errors
                            ])
                    except Exception as e:
                        errors.append(
                            f"Indicator {indicator_data.get('temp_id')}: Invalid schema - {str(e)}"
                        )

            # TODO: Add weight sum validation if needed

        except Exception as e:
            errors.append(f"Validation failed: {str(e)}")

        return errors

    def get_indicator_tree(
        self,
        db: Session,
        governance_area_id: int
    ) -> List[Dict[str, Any]]:
        """
        Get hierarchical tree structure of indicators for a governance area.

        Returns indicators organized in tree structure with parent-child relationships.
        Each node includes children nested under it.

        Args:
            db: Database session
            governance_area_id: Governance area ID to filter indicators

        Returns:
            List of root indicator dictionaries with nested children

        Example return structure:
        [
            {
                "id": 1,
                "name": "Root Indicator",
                "indicator_code": "1.1",
                "children": [
                    {
                        "id": 2,
                        "name": "Child Indicator",
                        "indicator_code": "1.1.1",
                        "children": []
                    }
                ]
            }
        ]
        """
        # Get all indicators for governance area with relationships loaded
        indicators = (
            db.query(Indicator)
            .options(joinedload(Indicator.children))
            .filter(
                Indicator.governance_area_id == governance_area_id,
                Indicator.is_active == True
            )
            .order_by(Indicator.sort_order)
            .all()
        )

        # Build indicator map
        indicator_map: Dict[int, Dict[str, Any]] = {}
        for indicator in indicators:
            indicator_map[indicator.id] = {
                "id": indicator.id,
                "name": indicator.name,
                "description": indicator.description,
                "indicator_code": indicator.indicator_code,
                "sort_order": indicator.sort_order,
                "selection_mode": indicator.selection_mode,
                "parent_id": indicator.parent_id,
                "is_active": indicator.is_active,
                "is_auto_calculable": indicator.is_auto_calculable,
                "is_profiling_only": indicator.is_profiling_only,
                "form_schema": indicator.form_schema,
                "calculation_schema": indicator.calculation_schema,
                "remark_schema": indicator.remark_schema,
                "mov_checklist_items": indicator.mov_checklist_items,
                "version": indicator.version,
                "created_at": indicator.created_at.isoformat() if indicator.created_at else None,
                "updated_at": indicator.updated_at.isoformat() if indicator.updated_at else None,
                "children": []
            }

        # Build tree structure
        root_nodes: List[Dict[str, Any]] = []
        for indicator_dict in indicator_map.values():
            parent_id = indicator_dict["parent_id"]
            if parent_id is None:
                # Root node
                root_nodes.append(indicator_dict)
            else:
                # Child node - add to parent's children
                if parent_id in indicator_map:
                    indicator_map[parent_id]["children"].append(indicator_dict)

        return root_nodes

    def recalculate_codes(
        self,
        db: Session,
        governance_area_id: int,
        user_id: int
    ) -> List[Indicator]:
        """
        Recalculate indicator codes for a governance area after reordering.

        Generates hierarchical codes like "1.1", "1.1.1", "1.2" based on
        tree structure and sort_order.

        Args:
            db: Database session
            governance_area_id: Governance area ID to recalculate codes for
            user_id: ID of user performing the recalculation

        Returns:
            List of updated Indicator instances

        Raises:
            HTTPException: If indicators cannot be loaded or updated
        """
        # Get all indicators for governance area ordered by sort_order
        indicators = (
            db.query(Indicator)
            .filter(
                Indicator.governance_area_id == governance_area_id,
                Indicator.is_active == True
            )
            .order_by(Indicator.sort_order)
            .all()
        )

        if not indicators:
            return []

        # Build parent-child map
        children_map: Dict[Optional[int], List[Indicator]] = {}
        for indicator in indicators:
            parent_id = indicator.parent_id
            if parent_id not in children_map:
                children_map[parent_id] = []
            children_map[parent_id].append(indicator)

        # Sort children by sort_order
        for children_list in children_map.values():
            children_list.sort(key=lambda x: x.sort_order or 0)

        updated_indicators: List[Indicator] = []

        def assign_codes(parent_id: Optional[int], prefix: str = "") -> None:
            """Recursively assign codes to indicators."""
            if parent_id not in children_map:
                return

            children = children_map[parent_id]
            for index, indicator in enumerate(children, start=1):
                if prefix:
                    new_code = f"{prefix}.{index}"
                else:
                    new_code = str(index)

                # Update indicator code
                indicator.indicator_code = new_code
                updated_indicators.append(indicator)

                logger.info(
                    f"Assigned code '{new_code}' to indicator '{indicator.name}' (ID: {indicator.id})"
                )

                # Recursively assign codes to children
                assign_codes(indicator.id, new_code)

        # Start from root nodes (parent_id = None)
        assign_codes(None)

        # Commit changes
        db.commit()
        logger.info(
            f"Recalculated {len(updated_indicators)} indicator codes for governance area {governance_area_id}"
        )

        return updated_indicators

    # ========================================================================
    # Seed & Utility Methods (Legacy - preserved for development/testing)
    # ========================================================================

    def seed_mock_indicators(self, db: Session) -> None:
        """
        Seed a small set of mock indicators if none exist.

        This creates simple, frontend-friendly `form_schema` payloads.
        """
        # Avoid duplicate seeding
        existing_count = db.query(Indicator).count()
        if existing_count > 0:
            return

        sample_indicators: List[Dict[str, Any]] = [
            {
                "name": "Budget Planning and Execution",
                "description": "Barangay maintains an annual budget plan and tracks execution.",
                "form_schema": {
                    "type": "object",
                    "properties": {
                        "has_budget_plan": {"type": "boolean", "title": "Has Budget Plan"},
                        "budget_amount": {"type": "number", "title": "Budget Amount"},
                        "notes": {"type": "string", "title": "Notes"},
                    },
                    "required": ["has_budget_plan"],
                },
                "governance_area_id": 1,
            },
            {
                "name": "Disaster Risk Reduction Plan",
                "description": "Comprehensive DRR plan in place and updated.",
                "form_schema": {
                    "type": "object",
                    "properties": {
                        "has_drr_plan": {"type": "boolean", "title": "Has DRR Plan"},
                        "plan_year": {"type": "string", "title": "Plan Year"},
                    },
                    "required": ["has_drr_plan"],
                },
                "governance_area_id": 2,
            },
            {
                "name": "Peace and Order Council",
                "description": "Functional Barangay Peace and Order Council.",
                "form_schema": {
                    "type": "object",
                    "properties": {
                        "meets_quarterly": {"type": "boolean", "title": "Meets Quarterly"},
                        "num_meetings": {"type": "number", "title": "Meetings Held"},
                    },
                    "required": ["meets_quarterly"],
                },
                "governance_area_id": 3,
            },
        ]

        for data in sample_indicators:
            db.add(Indicator(**data))

        db.commit()

    def seed_area1_financial_indicators(self, db: Session) -> None:
        """
        Seed the Core Governance Area 1 (Financial Administration and Sustainability)
        indicators based on the provided checklist.

        Creates the following indicators if none exist for area 1:
        1.1 Compliance with the Barangay Full Disclosure Policy (BFDPP) Board
        1.2 Innovations on Revenue Generation or Exercise of Corporate Powers
        1.3 Approval of the Barangay Budget on the Specified Timeframe
        """
        # Desired indicators for Area 1
        area1_indicators = [
            {
                "name": "1.1 - Compliance with the Barangay Full Disclosure Policy (BFDP) Board",
                "description": (
                    "Posted CY 2023 financial documents in the BFDP board as per DILG MCs."
                ),
                "form_schema": {
                    "type": "object",
                    "title": "1.1 Minimum Requirements and MOVs",
                    "properties": {
                        "section_1_1_1": {
                            "type": "object",
                            "title": "1.1.1 Posted CY 2023 financial documents",
                            "properties": {
                                "barangay_financial_report": {"type": "boolean", "title": "a) Barangay Financial Report"},
                                "barangay_budget": {"type": "boolean", "title": "b) Barangay Budget"},
                                "summary_income_exp": {"type": "boolean", "title": "c) Summary of Income and Expenditures"},
                                "twenty_percent_cout": {"type": "boolean", "title": "d) 20% CoUtilization"},
                                "annual_proc_plan": {"type": "boolean", "title": "e) Annual Procurement Plan / NTA component List"},
                                "list_notices_award": {"type": "boolean", "title": "f) List of Notices of Award (1st-3rd Qtr 2023)"},
                                "itemized_collections": {"type": "boolean", "title": "g) Itemized Monthly Collections & Disbursements (Jan-Sep 2023)"}
                            },
                            "required": []
                        },
                        "movs_1_1_1": {
                            "type": "array",
                            "title": "Required MOVs (1.1.1)",
                            "items": {"type": "string"},
                            "default": [
                                "Three (3) BFDP Monitoring Form A (1st-3rd quarter) signed by C/MLGOO, Punong Barangay, Barangay Secretary",
                                "Two (2) photos of BFDP board with barangay name (1 distant, 1 close-up)"
                            ],
                            "readOnly": True
                        },
                        "section_1_1_2": {
                            "type": "object",
                            "title": "1.1.2 Accomplished and signed BFR with received stamp",
                            "properties": {
                                "bfr_signed": {"type": "boolean", "title": "BFR signed and stamped by C/M Accountant"}
                            }
                        },
                        "movs_1_1_2": {
                            "type": "array",
                            "title": "Required MOV (1.1.2)",
                            "items": {"type": "string"},
                            "default": [
                                "Annex B of DBM-DOF-DILG JMC No. 2018-1"
                            ],
                            "readOnly": True
                        },
                        "notes": {"type": "string", "title": "Notes / Remarks"}
                    }
                },
                "governance_area_id": 1,
            },
            {
                "name": "1.2 - Innovations on Revenue Generation or Exercise of Corporate Powers",
                "description": (
                    "Increase in local resources for CY 2023 with supporting certifications."
                ),
                "form_schema": {
                    "type": "object",
                    "title": "1.2 Minimum Requirement and MOVs",
                    "properties": {
                        "increase_local_resources": {
                            "type": "boolean",
                            "title": "1.2.1 Increase in local resources in CY 2023"
                        },
                        "movs": {
                            "type": "array",
                            "title": "Required MOVs",
                            "items": {"type": "string"},
                            "default": [
                                "SRE for 2022 and 2023, signed by Barangay Treasurer and Punong Barangay",
                                "Certification on Increase in Local Resources signed by City/Municipal Treasurer or Budget Officer"
                            ],
                            "readOnly": True
                        },
                        "details": {"type": "string", "title": "Details"}
                    }
                },
                "governance_area_id": 1,
            },
            {
                "name": "1.3 - Approval of the Barangay Budget on the Specified Timeframe",
                "description": (
                    "Barangay Appropriation Ordinance approved on/before Dec 31, 2022 (considerations apply)."
                ),
                "form_schema": {
                    "type": "object",
                    "title": "1.3 Minimum Requirement and MOV",
                    "properties": {
                        "ordinance_approved": {
                            "type": "boolean",
                            "title": "1.3.1 Appropriation Ordinance approved on/before Dec 31, 2022 (or by Mar 31, 2023 consideration)"
                        },
                        "approval_date": {"type": "string", "title": "Approval Date"},
                        "movs": {
                            "type": "array",
                            "title": "Required MOV",
                            "items": {"type": "string"},
                            "default": [
                                "Approved Barangay Appropriation Ordinance signed by SBMs, SK Chairperson, Barangay Secretary, and Punong Barangay"
                            ],
                            "readOnly": True
                        },
                        "notes": {"type": "string", "title": "Notes / Remarks"}
                    }
                },
                "governance_area_id": 1,
            },
        ]
        # Fetch existing names for Area 1
        existing = (
            db.query(Indicator)
            .filter(Indicator.governance_area_id == 1)
            .all()
        )
        existing_names = {i.name for i in existing}

        created = 0
        for data in area1_indicators:
            if data["name"] in existing_names:
                continue
            db.add(Indicator(**data))
            created += 1

        if created:
            db.commit()

    def normalize_area1_and_cleanup(self, db: Session) -> None:
        """Cleanup old sample indicators and normalize Area 1 names/schemas.

        - Removes the original sample "Budget Planning and Execution" in Area 1
        - Upgrades pre-existing Area 1 indicators without numeric prefixes to the
          canonical names and schemas defined in `seed_area1_financial_indicators`.
        """
        # Build the canonical specs we want to enforce
        canonical_specs: Dict[str, Dict[str, Any]] = {}
        # Reuse builder from seed method
        tmp_session_list: List[Dict[str, Any]] = []
        # construct same list as seed
        tmp_session_list.extend([
            {
                "name": "1.1 - Compliance with the Barangay Full Disclosure Policy (BFDP) Board",
                "description": "Posted CY 2023 financial documents in the BFDP board as per DILG MCs.",
                "form_schema": {
                    "type": "object",
                    "title": "1.1 Minimum Requirements and MOVs",
                    "properties": {
                        "section_1_1_1": {
                            "type": "object",
                            "title": "1.1.1 Posted CY 2023 financial documents",
                            "properties": {
                                "barangay_financial_report": {"type": "boolean", "title": "a) Barangay Financial Report"},
                                "barangay_budget": {"type": "boolean", "title": "b) Barangay Budget"},
                                "summary_income_exp": {"type": "boolean", "title": "c) Summary of Income and Expenditures"},
                                "twenty_percent_cout": {"type": "boolean", "title": "d) 20% CoUtilization"},
                                "annual_proc_plan": {"type": "boolean", "title": "e) Annual Procurement Plan / NTA component List"},
                                "list_notices_award": {"type": "boolean", "title": "f) List of Notices of Award (1st-3rd Qtr 2023)"},
                                "itemized_collections": {"type": "boolean", "title": "g) Itemized Monthly Collections & Disbursements (Jan-Sep 2023)"}
                            },
                        },
                        "movs_1_1_1": {
                            "type": "array",
                            "items": {"type": "string"},
                            "default": [
                                "Three (3) BFDP Monitoring Form A (1st-3rd quarter) signed by C/MLGOO, Punong Barangay, Barangay Secretary",
                                "Two (2) photos of BFDP board with barangay name (1 distant, 1 close-up)"
                            ],
                        },
                        "section_1_1_2": {
                            "type": "object",
                            "title": "1.1.2 Accomplished and signed BFR with received stamp",
                            "properties": {"bfr_signed": {"type": "boolean", "title": "BFR signed and stamped by C/M Accountant"}},
                        },
                        "movs_1_1_2": {
                            "type": "array",
                            "items": {"type": "string"},
                            "default": ["Annex B of DBM-DOF-DILG JMC No. 2018-1"],
                        },
                    },
                },
                "governance_area_id": 1,
            },
            {
                "name": "1.2 - Innovations on Revenue Generation or Exercise of Corporate Powers",
                "description": "Increase in local resources for CY 2023 with supporting certifications.",
                "form_schema": {
                    "type": "object",
                    "title": "1.2 Minimum Requirement and MOVs",
                    "properties": {
                        "increase_local_resources": {"type": "boolean", "title": "1.2.1 Increase in local resources in CY 2023"},
                        "movs": {
                            "type": "array",
                            "items": {"type": "string"},
                            "default": [
                                "SRE for 2022 and 2023, signed by Barangay Treasurer and Punong Barangay",
                                "Certification on Increase in Local Resources signed by City/Municipal Treasurer or Budget Officer",
                            ],
                        },
                    },
                },
                "governance_area_id": 1,
            },
            {
                "name": "1.3 - Approval of the Barangay Budget on the Specified Timeframe",
                "description": "Barangay Appropriation Ordinance approved on/before Dec 31, 2022 (considerations apply).",
                "form_schema": {
                    "type": "object",
                    "title": "1.3 Minimum Requirement and MOV",
                    "properties": {
                        "ordinance_approved": {"type": "boolean", "title": "1.3.1 Appropriation Ordinance approved on/before Dec 31, 2022 (or by Mar 31, 2023 consideration)"},
                        "approval_date": {"type": "string", "title": "Approval Date"},
                        "movs": {
                            "type": "array",
                            "items": {"type": "string"},
                            "default": [
                                "Approved Barangay Appropriation Ordinance signed by SBMs, SK Chairperson, Barangay Secretary, and Punong Barangay",
                            ],
                        },
                    },
                },
                "governance_area_id": 1,
            },
        ])
        for spec in tmp_session_list:
            canonical_specs[spec["name"]] = spec

        # Delete the old sample indicator in area 1 if it exists
        old_sample = (
            db.query(Indicator)
            .filter(Indicator.governance_area_id == 1, Indicator.name == "Budget Planning and Execution")
            .first()
        )
        if old_sample:
            db.delete(old_sample)

        # Upgrade legacy names (without numeric prefixes) to canonical ones
        legacy_map = {
            "Compliance with the Barangay Full Disclosure Policy (BFDPP) Board": "1.1 - Compliance with the Barangay Full Disclosure Policy (BFDP) Board",
            "Innovations on Revenue Generation or Exercise of Corporate Powers": "1.2 - Innovations on Revenue Generation or Exercise of Corporate Powers",
            "Approval of the Barangay Budget on the Specified Timeframe": "1.3 - Approval of the Barangay Budget on the Specified Timeframe",
        }

        area1_existing = (
            db.query(Indicator)
            .filter(Indicator.governance_area_id == 1)
            .all()
        )
        for ind in area1_existing:
            if ind.name in legacy_map:
                new_name = legacy_map[ind.name]
                spec = canonical_specs[new_name]
                ind.name = new_name
                ind.description = spec["description"]
                ind.form_schema = spec["form_schema"]

        db.commit()

    def enforce_area1_canonical_indicators(self, db: Session) -> None:
        """Ensure only the exact 1.1, 1.2, 1.3 indicators exist for Area 1.

        - Deletes any Area 1 indicators not matching the canonical names
        - Re-seeds missing canonical indicators with correct schema
        """
        allowed_names = {
            "1.1 - Compliance with the Barangay Full Disclosure Policy (BFDP) Board",
            "1.2 - Innovations on Revenue Generation or Exercise of Corporate Powers",
            "1.3 - Approval of the Barangay Budget on the Specified Timeframe",
        }

        # Delete any non-canonical indicators in Area 1
        area1_all = (
            db.query(Indicator)
            .filter(Indicator.governance_area_id == 1)
            .all()
        )
        for ind in area1_all:
            if ind.name not in allowed_names:
                db.delete(ind)

        db.commit()

        # Seed missing canonical ones
        self.seed_area1_financial_indicators(db)

    def enforce_area1_as_single_indicator(self, db: Session) -> None:
        """
        Collapse Area 1 into a SINGLE indicator that encapsulates 1.1, 1.2, 1.3
        as sub-sections in `form_schema` (no separate rows in DB).
        """
        # Remove all existing Area 1 indicators first
        existing = (
            db.query(Indicator)
            .filter(Indicator.governance_area_id == 1)
            .all()
        )
        for ind in existing:
            db.delete(ind)
        db.commit()

        # Create a single consolidated indicator for Area 1
        consolidated = Indicator(
            name="Financial Administration and Sustainability",
            description=(
                "The barangay has a comprehensive budget plan that is properly executed and monitored."
            ),
            form_schema={
                "type": "object",
                "title": "Financial Administration and Sustainability (1.1, 1.2, 1.3)",
                "properties": {
                    # 1.1
                    "section_1_1": {
                        "type": "object",
                        "title": "1.1 Compliance with the Barangay Full Disclosure Policy (BFDP) Board",
                        "properties": {
                            "section_1_1_1": {
                                "type": "object",
                                "title": "1.1.1 Posted CY 2023 financial documents",
                                "properties": {
                                    "barangay_financial_report": {"type": "boolean", "title": "a) Barangay Financial Report"},
                                    "barangay_budget": {"type": "boolean", "title": "b) Barangay Budget"},
                                    "summary_income_exp": {"type": "boolean", "title": "c) Summary of Income and Expenditures"},
                                    "twenty_percent_cout": {"type": "boolean", "title": "d) 20% CoUtilization"},
                                    "annual_proc_plan": {"type": "boolean", "title": "e) Annual Procurement Plan / NTA component List"},
                                    "list_notices_award": {"type": "boolean", "title": "f) List of Notices of Award (1st-3rd Qtr 2023)"},
                                    "itemized_collections": {"type": "boolean", "title": "g) Itemized Monthly Collections & Disbursements (Jan-Sep 2023)"},
                                },
                            },
                            "movs_1_1_1": {
                                "type": "array",
                                "items": {"type": "string"},
                                "default": [
                                    "Three (3) BFDP Monitoring Form A (1st-3rd quarter) signed by C/MLGOO, Punong Barangay, Barangay Secretary",
                                    "Two (2) photos of BFDP board with barangay name (1 distant, 1 close-up)",
                                ],
                                "readOnly": True,
                            },
                            "section_1_1_2": {
                                "type": "object",
                                "title": "1.1.2 Accomplished and signed BFR with received stamp",
                                "properties": {"bfr_signed": {"type": "boolean", "title": "BFR signed and stamped by C/M Accountant"}},
                            },
                            "movs_1_1_2": {
                                "type": "array",
                                "items": {"type": "string"},
                                "default": ["Annex B of DBM-DOF-DILG JMC No. 2018-1"],
                                "readOnly": True,
                            },
                        },
                    },
                    # 1.2
                    "section_1_2": {
                        "type": "object",
                        "title": "1.2 Innovations on Revenue Generation or Exercise of Corporate Powers",
                        "properties": {
                            "increase_local_resources": {"type": "boolean", "title": "1.2.1 Increase in local resources in CY 2023"},
                            "movs": {
                                "type": "array",
                                "items": {"type": "string"},
                                "default": [
                                    "SRE for 2022 and 2023, signed by Barangay Treasurer and Punong Barangay",
                                    "Certification on Increase in Local Resources signed by City/Municipal Treasurer or Budget Officer",
                                ],
                                "readOnly": True,
                            },
                        },
                    },
                    # 1.3
                    "section_1_3": {
                        "type": "object",
                        "title": "1.3 Approval of the Barangay Budget on the Specified Timeframe",
                        "properties": {
                            "ordinance_approved": {"type": "boolean", "title": "1.3.1 Appropriation Ordinance approved on/before Dec 31, 2022 (or by Mar 31, 2023 consideration)"},
                            "approval_date": {"type": "string", "title": "Approval Date"},
                            "movs": {
                                "type": "array",
                                "items": {"type": "string"},
                                "default": [
                                    "Approved Barangay Appropriation Ordinance signed by SBMs, SK Chairperson, Barangay Secretary, and Punong Barangay",
                                ],
                                "readOnly": True,
                            },
                        },
                    },
                },
            },
            governance_area_id=1,
        )

        db.add(consolidated)
        db.commit()

    def standardize_indicator_area_names(self, db: Session) -> None:
        """Rename indicators to match the official governance area names (1-6)
        and align descriptions to the standard format.
        """
        mapping = {
            1: "Financial Administration and Sustainability",
            2: "Disaster Preparedness",
            3: "Safety, Peace and Order",
            4: "Social Protection and Sensitivity",
            5: "Business-Friendliness and Competitiveness",
            6: "Environmental Management",
        }

        for area_id, official_name in mapping.items():
            ind = (
                db.query(Indicator)
                .filter(Indicator.governance_area_id == area_id)
                .first()
            )
            if ind:
                ind.name = official_name
                if area_id == 1:
                    ind.description = (
                        "The barangay has a comprehensive budget plan that is properly executed and monitored."
                    )
        db.commit()

    def ensure_environmental_indicator(self, db: Session) -> None:
        """Ensure Area 6 environmental indicator exists following other format."""
        exists = (
            db.query(Indicator)
            .filter(Indicator.governance_area_id == 6)
            .first()
        )
        if exists:
            return

        env = Indicator(
            name="Environmental Management",
            description="The barangay implements environmental protection and sustainability programs.",
            form_schema={
                "type": "object",
                "properties": {
                    "has_programs": {"type": "boolean", "title": "Has Environmental Programs"},
                    "program_types": {"type": "string", "title": "Types of Programs"},
                    "trees_planted": {"type": "number", "title": "Trees Planted This Year"},
                },
                "required": ["has_programs"],
            },
            governance_area_id=6,
        )
        db.add(env)
        db.commit()

    def seed_areas_2_to_6_indicators(self, db: Session) -> None:
        """
        Seed indicators for governance areas 2-6 following the same pattern as Area 1.
        Each area gets a SINGLE indicator with nested form_schema containing sections.
        
        - Area 2 (Disaster Preparedness): 2.1 -> 2.1.1 - Organized BDRRMC
        - Area 3 (Safety, Peace and Order): 3.1 -> 3.1.1 - Organized BPOC
        - Area 4 (Social Protection): 4.1 -> 4.1.1 - Social Welfare Programs Implementation
        - Area 5 (Business-Friendliness): 5.1 -> 5.1.1 - Business Registration Process Efficiency
        - Area 6 (Environmental Management): 6.1 -> 6.1.1 - Organized BESWMC
        """
        # First, delete ALL existing indicators for areas 2-6
        any_deleted = False
        for area_id in range(2, 7):  # Areas 2-6
            existing_indicators = (
                db.query(Indicator)
                .filter(Indicator.governance_area_id == area_id)
                .all()
            )
            if existing_indicators:
                any_deleted = True
                for ind in existing_indicators:
                    db.delete(ind)
        
        if any_deleted:
            db.commit()

        # Area 2: Disaster Preparedness
        area2_indicator = Indicator(
            name="Disaster Preparedness",
            description="Disaster risk reduction and management capabilities",
            form_schema={
                "type": "object",
                "title": "Disaster Preparedness (2.1)",
                "properties": {
                    "section_2_1": {
                        "type": "object",
                        "title": "2.1 Disaster Preparedness",
                        "properties": {
                            "section_2_1_1": {
                                "type": "object",
                                "title": "2.1.1 Organized Barangay Disaster Risk Reduction and Management Council (BDRRMC)",
                                "properties": {
                                    "bdrrmc_organized": {
                                        "type": "boolean",
                                        "title": "BDRRMC is organized with proper documentation and regular meetings",
                                    },
                                },
                            },
                            "movs_2_1_1": {
                                "type": "array",
                                "items": {"type": "string"},
                                "default": [
                                    "Barangay Resolution establishing BDRRMC",
                                    "Minutes of BDRRMC meetings (at least quarterly)",
                                    "Documentation of BDRRMC composition with representatives from key sectors",
                                ],
                                "readOnly": True,
                            },
                        },
                    },
                },
            },
            governance_area_id=2,
        )

        # Area 3: Safety, Peace and Order
        area3_indicator = Indicator(
            name="Safety, Peace and Order",
            description="Public safety and peace maintenance",
            form_schema={
                "type": "object",
                "title": "Safety, Peace and Order (3.1)",
                "properties": {
                    "section_3_1": {
                        "type": "object",
                        "title": "3.1 Safety, Peace and Order",
                        "properties": {
                            "section_3_1_1": {
                                "type": "object",
                                "title": "3.1.1 Organized Barangay Peace and Order Council (BPOC)",
                                "properties": {
                                    "bpoc_organized": {
                                        "type": "boolean",
                                        "title": "BPOC is organized with proper documentation and functional activities",
                                    },
                                },
                            },
                            "movs_3_1_1": {
                                "type": "array",
                                "items": {"type": "string"},
                                "default": [
                                    "Barangay Resolution establishing BPOC",
                                    "Minutes of BPOC meetings (at least quarterly)",
                                    "Documentation of peace and order programs and activities",
                                ],
                                "readOnly": True,
                            },
                        },
                    },
                },
            },
            governance_area_id=3,
        )

        # Area 4: Social Protection and Sensitivity
        area4_indicator = Indicator(
            name="Social Protection and Sensitivity",
            description="Social welfare and community sensitivity programs",
            form_schema={
                "type": "object",
                "title": "Social Protection and Sensitivity (4.1)",
                "properties": {
                    "section_4_1": {
                        "type": "object",
                        "title": "4.1 Social Protection and Sensitivity",
                        "properties": {
                            "section_4_1_1": {
                                "type": "object",
                                "title": "4.1.1 Social Welfare Programs Implementation",
                                "properties": {
                                    "programs_implemented": {
                                        "type": "boolean",
                                        "title": "Comprehensive social welfare programs are implemented for vulnerable sectors",
                                    },
                                },
                            },
                            "movs_4_1_1": {
                                "type": "array",
                                "items": {"type": "string"},
                                "default": [
                                    "Documentation of social welfare programs (senior citizens, PWDs, indigent families)",
                                    "Beneficiary lists and registration records",
                                    "Implementation reports and impact assessments",
                                ],
                                "readOnly": True,
                            },
                        },
                    },
                },
            },
            governance_area_id=4,
        )

        # Area 5: Business-Friendliness and Competitiveness
        area5_indicator = Indicator(
            name="Business-Friendliness and Competitiveness",
            description="Support for local business development",
            form_schema={
                "type": "object",
                "title": "Business-Friendliness and Competitiveness (5.1)",
                "properties": {
                    "section_5_1": {
                        "type": "object",
                        "title": "5.1 Business-Friendliness and Competitiveness",
                        "properties": {
                            "section_5_1_1": {
                                "type": "object",
                                "title": "5.1.1 Business Registration Process Efficiency",
                                "properties": {
                                    "efficient_process": {
                                        "type": "boolean",
                                        "title": "Efficient and streamlined business registration process exists",
                                    },
                                },
                            },
                            "movs_5_1_1": {
                                "type": "array",
                                "items": {"type": "string"},
                                "default": [
                                    "Documented step-by-step business registration procedures",
                                    "Published processing timeframes",
                                    "Evidence of efficient service delivery (processing logs, feedback forms)",
                                ],
                                "readOnly": True,
                            },
                        },
                    },
                },
            },
            governance_area_id=5,
        )

        # Area 6: Environmental Management
        area6_indicator = Indicator(
            name="Environmental Management",
            description="Environmental protection and sustainability",
            form_schema={
                "type": "object",
                "title": "Environmental Management (6.1)",
                "properties": {
                    "section_6_1": {
                        "type": "object",
                        "title": "6.1 Environmental Management",
                        "properties": {
                            "section_6_1_1": {
                                "type": "object",
                                "title": "6.1.1 Organized Barangay Environmental and Solid Waste Management Committee (BESWMC)",
                                "properties": {
                                    "beswmc_organized": {
                                        "type": "boolean",
                                        "title": "BESWMC is organized with proper documentation and active programs",
                                    },
                                },
                            },
                            "movs_6_1_1": {
                                "type": "array",
                                "items": {"type": "string"},
                                "default": [
                                    "Barangay Resolution establishing BESWMC",
                                    "Minutes of BESWMC meetings (at least quarterly)",
                                    "Documentation of solid waste management and environmental protection programs",
                                ],
                                "readOnly": True,
                            },
                        },
                    },
                },
            },
            governance_area_id=6,
        )

        # Add all indicators
        db.add(area2_indicator)
        db.add(area3_indicator)
        db.add(area4_indicator)
        db.add(area5_indicator)
        db.add(area6_indicator)
        db.commit()


indicator_service = IndicatorService()


