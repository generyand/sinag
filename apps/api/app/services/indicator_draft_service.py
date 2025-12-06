"""
📝 Indicator Draft Service
Manages indicator draft creation, saving, and locking for the wizard workflow.

This service handles:
- Draft creation and persistence
- Optimistic locking to prevent concurrent edit conflicts
- Draft lock acquisition and release
- Draft listing and retrieval
"""

from datetime import datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from loguru import logger
from sqlalchemy.orm import Session, joinedload

from app.db.models.governance_area import GovernanceArea, IndicatorDraft
from app.db.models.user import User


class IndicatorDraftService:
    """
    Service for managing indicator drafts with optimistic locking.

    Follows the Fat Service pattern - all business logic lives here.
    """

    # Lock expiration time (30 minutes)
    LOCK_EXPIRATION_MINUTES = 30

    def create_draft(
        self,
        db: Session,
        user_id: int,
        governance_area_id: int,
        creation_mode: str,
        title: str | None = None,
        data: list[dict[str, Any]] | None = None,
    ) -> IndicatorDraft:
        """
        Create a new indicator draft.

        Args:
            db: Database session
            user_id: ID of user creating the draft
            governance_area_id: Governance area ID
            creation_mode: Creation mode (e.g., 'incremental', 'bulk_import')
            title: Optional draft title
            data: Optional initial draft data

        Returns:
            Created IndicatorDraft instance

        Raises:
            HTTPException: If governance area doesn't exist or user not found
        """
        # Validate governance area exists
        governance_area = (
            db.query(GovernanceArea).filter(GovernanceArea.id == governance_area_id).first()
        )
        if not governance_area:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Governance area with ID {governance_area_id} not found",
            )

        # Validate user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found",
            )

        # Create draft
        draft = IndicatorDraft(
            user_id=user_id,
            governance_area_id=governance_area_id,
            creation_mode=creation_mode,
            title=title,
            data=data or [],
            current_step=1,
            status="in_progress",
            version=1,
        )

        db.add(draft)
        db.commit()
        db.refresh(draft)

        logger.info(
            f"Created draft {draft.id} for user {user_id} in governance area {governance_area_id}"
        )

        return draft

    def save_draft(
        self,
        db: Session,
        draft_id: UUID,
        user_id: int,
        update_data: dict[str, Any],
        version: int,
    ) -> IndicatorDraft:
        """
        Save draft with optimistic locking.

        Args:
            db: Database session
            draft_id: Draft UUID
            user_id: ID of user saving the draft
            update_data: Dict with fields to update (current_step, status, data, title)
            version: Expected version number (for optimistic locking)

        Returns:
            Updated IndicatorDraft instance

        Raises:
            HTTPException: If draft not found, version conflict, or lock violation
        """
        # Get draft with lock for update
        draft = (
            db.query(IndicatorDraft).filter(IndicatorDraft.id == draft_id).with_for_update().first()
        )

        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Draft with ID {draft_id} not found",
            )

        # Check if draft belongs to user
        if draft.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to edit this draft",
            )

        # Optimistic locking: check version
        if draft.version != version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Version conflict: expected {version}, found {draft.version}. "
                "Draft may have been modified by another process.",
            )

        # Check if draft is locked by another user
        if draft.locked_by_user_id and draft.locked_by_user_id != user_id:
            # Check if lock is expired
            if draft.locked_at:
                lock_expiry = draft.locked_at + timedelta(minutes=self.LOCK_EXPIRATION_MINUTES)
                if datetime.utcnow() < lock_expiry:
                    raise HTTPException(
                        status_code=status.HTTP_423_LOCKED,
                        detail=f"Draft is locked by user {draft.locked_by_user_id}",
                    )
                else:
                    # Lock expired, release it
                    logger.info(f"Lock on draft {draft_id} expired, releasing lock")
                    draft.lock_token = None
                    draft.locked_by_user_id = None
                    draft.locked_at = None

        # Acquire lock if not already locked by this user
        if not draft.locked_by_user_id or draft.locked_by_user_id != user_id:
            draft.lock_token = uuid4()
            draft.locked_by_user_id = user_id
            draft.locked_at = datetime.utcnow()

        # Update fields
        if "current_step" in update_data:
            draft.current_step = update_data["current_step"]
        if "status" in update_data:
            draft.status = update_data["status"]
        if "data" in update_data:
            draft.data = update_data["data"]
        if "title" in update_data:
            draft.title = update_data["title"]

        # Update timestamps and version
        draft.updated_at = datetime.utcnow()
        draft.last_accessed_at = datetime.utcnow()
        draft.version += 1

        db.commit()
        db.refresh(draft)

        logger.info(f"Saved draft {draft_id} (version {draft.version}) for user {user_id}")

        return draft

    def save_draft_delta(
        self,
        db: Session,
        draft_id: UUID,
        user_id: int,
        changed_indicators: list[dict[str, Any]],
        changed_ids: list[str],
        version: int,
        metadata: dict[str, Any] | None = None,
    ) -> IndicatorDraft:
        """
        Save draft with delta-based update (only changed indicators).

        This is a performance-optimized version of save_draft that only updates
        the indicators that have changed, reducing payload size by ~95%.

        Args:
            db: Database session
            draft_id: Draft UUID
            user_id: ID of user saving the draft
            changed_indicators: List of changed indicator dictionaries
            changed_ids: List of temp_ids for changed indicators
            version: Expected version number (for optimistic locking)
            metadata: Optional metadata (current_step, status, title, etc.)

        Returns:
            Updated IndicatorDraft instance

        Raises:
            HTTPException: If draft not found, version conflict, or lock violation

        Example:
            >>> draft = service.save_draft_delta(
            ...     db=db,
            ...     draft_id=draft_id,
            ...     user_id=1,
            ...     changed_indicators=[
            ...         {"temp_id": "abc123", "name": "Updated Indicator", ...},
            ...         {"temp_id": "def456", "name": "Another Update", ...},
            ...     ],
            ...     changed_ids=["abc123", "def456"],
            ...     version=5,
            ...     metadata={"current_step": 3}
            ... )
        """
        # Get draft with lock for update
        draft = (
            db.query(IndicatorDraft).filter(IndicatorDraft.id == draft_id).with_for_update().first()
        )

        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Draft with ID {draft_id} not found",
            )

        # Check if draft belongs to user
        if draft.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to edit this draft",
            )

        # Optimistic locking: check version
        if draft.version != version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Version conflict: expected {version}, found {draft.version}. "
                "Draft may have been modified by another process.",
            )

        # Check if draft is locked by another user
        if draft.locked_by_user_id and draft.locked_by_user_id != user_id:
            # Check if lock is expired
            if draft.locked_at:
                lock_expiry = draft.locked_at + timedelta(minutes=self.LOCK_EXPIRATION_MINUTES)
                if datetime.utcnow() < lock_expiry:
                    raise HTTPException(
                        status_code=status.HTTP_423_LOCKED,
                        detail=f"Draft is locked by user {draft.locked_by_user_id}",
                    )
                else:
                    # Lock expired, release it
                    logger.info(f"Lock on draft {draft_id} expired, releasing lock")
                    draft.lock_token = None
                    draft.locked_by_user_id = None
                    draft.locked_at = None

        # Acquire lock if not already locked by this user
        if not draft.locked_by_user_id or draft.locked_by_user_id != user_id:
            draft.lock_token = uuid4()
            draft.locked_by_user_id = user_id
            draft.locked_at = datetime.utcnow()

        # Delta merge: Update only changed indicators
        # Build a lookup dictionary from existing data
        existing_indicators = {
            ind.get("temp_id"): ind
            for ind in draft.data
            if isinstance(ind, dict) and "temp_id" in ind
        }

        # Update changed indicators in the lookup
        for changed_ind in changed_indicators:
            temp_id = changed_ind.get("temp_id")
            if temp_id:
                existing_indicators[temp_id] = changed_ind
                logger.debug(f"Updated indicator {temp_id} in draft {draft_id}")

        # Convert back to list
        draft.data = list(existing_indicators.values())

        # Update metadata fields if provided
        if metadata:
            if "current_step" in metadata:
                draft.current_step = metadata["current_step"]
            if "status" in metadata:
                draft.status = metadata["status"]
            if "title" in metadata:
                draft.title = metadata["title"]

        # Update timestamps and version
        draft.updated_at = datetime.utcnow()
        draft.last_accessed_at = datetime.utcnow()
        draft.version += 1

        db.commit()
        db.refresh(draft)

        logger.info(
            f"Saved draft {draft_id} (version {draft.version}) with delta update: "
            f"{len(changed_ids)} indicators changed out of {len(draft.data)} total"
        )

        return draft

    def get_user_drafts(
        self,
        db: Session,
        user_id: int,
        governance_area_id: int | None = None,
        status: str | None = None,
    ) -> list[IndicatorDraft]:
        """
        Get all drafts for a user with optional filtering.

        Args:
            db: Database session
            user_id: ID of user
            governance_area_id: Optional filter by governance area
            status: Optional filter by status

        Returns:
            List of IndicatorDraft instances
        """
        query = (
            db.query(IndicatorDraft)
            .options(joinedload(IndicatorDraft.governance_area))
            .filter(IndicatorDraft.user_id == user_id)
        )

        if governance_area_id:
            query = query.filter(IndicatorDraft.governance_area_id == governance_area_id)

        if status:
            query = query.filter(IndicatorDraft.status == status)

        # Order by last accessed (most recent first)
        drafts = query.order_by(IndicatorDraft.last_accessed_at.desc()).all()

        return drafts

    def load_draft(
        self,
        db: Session,
        draft_id: UUID,
        user_id: int,
    ) -> IndicatorDraft:
        """
        Load a draft by ID and update last_accessed_at.

        Args:
            db: Database session
            draft_id: Draft UUID
            user_id: ID of user loading the draft

        Returns:
            IndicatorDraft instance

        Raises:
            HTTPException: If draft not found or access denied
        """
        draft = (
            db.query(IndicatorDraft)
            .options(joinedload(IndicatorDraft.governance_area))
            .filter(IndicatorDraft.id == draft_id)
            .first()
        )

        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Draft with ID {draft_id} not found",
            )

        # Check if draft belongs to user
        if draft.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this draft",
            )

        # Update last accessed time
        draft.last_accessed_at = datetime.utcnow()
        db.commit()
        db.refresh(draft)

        return draft

    def delete_draft(
        self,
        db: Session,
        draft_id: UUID,
        user_id: int,
    ) -> None:
        """
        Delete a draft.

        Args:
            db: Database session
            draft_id: Draft UUID
            user_id: ID of user deleting the draft

        Raises:
            HTTPException: If draft not found or access denied
        """
        draft = db.query(IndicatorDraft).filter(IndicatorDraft.id == draft_id).first()

        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Draft with ID {draft_id} not found",
            )

        # Check if draft belongs to user
        if draft.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this draft",
            )

        db.delete(draft)
        db.commit()

        logger.info(f"Deleted draft {draft_id} for user {user_id}")

    def release_lock(
        self,
        db: Session,
        draft_id: UUID,
        user_id: int,
    ) -> IndicatorDraft:
        """
        Release lock on a draft.

        Args:
            db: Database session
            draft_id: Draft UUID
            user_id: ID of user releasing the lock

        Returns:
            Updated IndicatorDraft instance

        Raises:
            HTTPException: If draft not found, access denied, or lock not held
        """
        draft = db.query(IndicatorDraft).filter(IndicatorDraft.id == draft_id).first()

        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Draft with ID {draft_id} not found",
            )

        # Check if draft belongs to user
        if draft.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to release this lock",
            )

        # Check if lock is held by this user
        if draft.locked_by_user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lock is not held by you",
            )

        # Release lock
        draft.lock_token = None
        draft.locked_by_user_id = None
        draft.locked_at = None

        db.commit()
        db.refresh(draft)

        logger.info(f"Released lock on draft {draft_id} for user {user_id}")

        return draft

    def cleanup_expired_locks(self, db: Session) -> int:
        """
        Cleanup expired locks (for scheduled tasks).

        Args:
            db: Database session

        Returns:
            Number of locks released
        """
        expiry_time = datetime.utcnow() - timedelta(minutes=self.LOCK_EXPIRATION_MINUTES)

        # Find drafts with expired locks
        expired_drafts = (
            db.query(IndicatorDraft)
            .filter(
                IndicatorDraft.locked_at.isnot(None),
                IndicatorDraft.locked_at < expiry_time,
            )
            .all()
        )

        count = len(expired_drafts)

        for draft in expired_drafts:
            draft.lock_token = None
            draft.locked_by_user_id = None
            draft.locked_at = None

        if count > 0:
            db.commit()
            logger.info(f"Cleaned up {count} expired draft locks")

        return count


# Singleton instance
indicator_draft_service = IndicatorDraftService()
