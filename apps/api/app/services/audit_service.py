# 🔒 Audit Service
# Business logic for audit logging and tracking administrative actions

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.db.models.admin import AuditLog


class AuditService:
    """Service class for audit logging operations."""

    def log_audit_event(
        self,
        db: Session,
        user_id: int,
        entity_type: str,
        entity_id: int | None,
        action: str,
        changes: dict[str, Any] | None = None,
        ip_address: str | None = None,
    ) -> AuditLog:
        """
        Log an audit event to the database.

        Args:
            db: Database session
            user_id: ID of the user performing the action
            entity_type: Type of entity being modified (e.g., "indicator", "bbi", "deadline_override")
            entity_id: ID of the entity being modified (optional for bulk operations)
            action: Action performed (e.g., "create", "update", "delete", "deactivate")
            changes: Dictionary of changes with before/after values
            ip_address: IP address of the request

        Returns:
            AuditLog: Created audit log entry
        """
        audit_log = AuditLog(
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            changes=changes,
            ip_address=ip_address,
            created_at=datetime.utcnow(),
        )

        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)

        return audit_log

    def calculate_json_diff(
        self, before: dict[str, Any] | None, after: dict[str, Any] | None
    ) -> dict[str, dict[str, Any]]:
        """
        Calculate the difference between two JSON objects (before and after states).

        Args:
            before: State before the change
            after: State after the change

        Returns:
            Dict with structure: {"field_name": {"before": value, "after": value}}
        """
        changes = {}

        # Handle case where before is None (creation)
        if before is None:
            before = {}

        # Handle case where after is None (deletion)
        if after is None:
            after = {}

        # Get all unique keys from both objects
        all_keys = set(before.keys()) | set(after.keys())

        for key in all_keys:
            before_value = before.get(key)
            after_value = after.get(key)

            # Only record if there's a difference
            if before_value != after_value:
                changes[key] = {"before": before_value, "after": after_value}

        return changes

    def get_audit_logs(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        user_id: int | None = None,
        entity_type: str | None = None,
        entity_id: int | None = None,
        action: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> tuple[list[AuditLog], int]:
        """
        Get audit logs with optional filtering and pagination.

        Args:
            db: Database session
            skip: Number of records to skip (for pagination)
            limit: Maximum number of records to return
            user_id: Filter by user ID
            entity_type: Filter by entity type
            entity_id: Filter by entity ID
            action: Filter by action
            start_date: Filter by start date (inclusive)
            end_date: Filter by end date (inclusive)

        Returns:
            tuple: (audit_logs, total_count)
        """
        query = db.query(AuditLog)

        # Apply filters
        if user_id is not None:
            query = query.filter(AuditLog.user_id == user_id)

        if entity_type:
            query = query.filter(AuditLog.entity_type == entity_type)

        if entity_id is not None:
            query = query.filter(AuditLog.entity_id == entity_id)

        if action:
            query = query.filter(AuditLog.action == action)

        if start_date:
            query = query.filter(AuditLog.created_at >= start_date)

        if end_date:
            query = query.filter(AuditLog.created_at <= end_date)

        # Get total count before pagination
        total = query.count()

        # Order by most recent first
        query = query.order_by(AuditLog.created_at.desc())

        # Apply pagination
        audit_logs = query.offset(skip).limit(limit).all()

        return audit_logs, total

    def get_audit_log_by_id(self, db: Session, log_id: int) -> AuditLog | None:
        """Get a single audit log by ID."""
        return db.query(AuditLog).filter(AuditLog.id == log_id).first()

    def get_entity_history(self, db: Session, entity_type: str, entity_id: int) -> list[AuditLog]:
        """
        Get the complete audit history for a specific entity.

        Args:
            db: Database session
            entity_type: Type of entity
            entity_id: ID of the entity

        Returns:
            List of audit logs for the entity, ordered chronologically
        """
        return (
            db.query(AuditLog)
            .filter(AuditLog.entity_type == entity_type, AuditLog.entity_id == entity_id)
            .order_by(AuditLog.created_at.desc())
            .all()
        )


# Singleton instance for global use
audit_service = AuditService()
