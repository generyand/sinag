# Explicit BLGU lock service
# Keeps deadline/grace/manual lock behavior separate from workflow status.

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.enums import NotificationType
from app.db.models.assessment import Assessment
from app.db.models.system import AssessmentYear
from app.db.models.user import User
from app.services.notification_service import notification_service

logger = logging.getLogger(__name__)


class AssessmentLockService:
    DEFAULT_UNLOCK_GRACE_PERIOD_DAYS = 3
    LOCK_REASON_DEADLINE_EXPIRED = "deadline_expired"
    LOCK_REASON_GRACE_PERIOD_EXPIRED = "grace_period_expired"
    LOCK_REASON_MLGOO_MANUAL_LOCK = "mlgoo_manual_lock"

    def _to_naive_utc(self, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is not None:
            return value.astimezone(UTC).replace(tzinfo=None)
        return value

    def _resolve_now(self, now: datetime | None = None) -> datetime:
        return self._to_naive_utc(now or datetime.now(UTC)) or datetime.utcnow()

    def _get_assessment_year(self, db: Session, assessment: Assessment) -> AssessmentYear | None:
        if getattr(assessment, "year_config", None) is not None:
            return assessment.year_config
        return (
            db.query(AssessmentYear)
            .filter(AssessmentYear.year == assessment.assessment_year)
            .first()
        )

    def get_phase1_deadline(self, db: Session, assessment: Assessment) -> datetime | None:
        year = self._get_assessment_year(db, assessment)
        return self._to_naive_utc(year.phase1_deadline if year else None)

    def get_default_unlock_grace_period_days(self, db: Session, assessment: Assessment) -> int:
        year = self._get_assessment_year(db, assessment)
        if year and year.default_unlock_grace_period_days:
            return year.default_unlock_grace_period_days
        return self.DEFAULT_UNLOCK_GRACE_PERIOD_DAYS

    def get_default_unlock_expiry(
        self, db: Session, assessment: Assessment, now: datetime | None = None
    ) -> datetime:
        resolved_now = self._resolve_now(now)
        return resolved_now + timedelta(
            days=self.get_default_unlock_grace_period_days(db, assessment)
        )

    def get_effective_lock_state(
        self, db: Session, assessment: Assessment, now: datetime | None = None
    ) -> dict[str, Any]:
        resolved_now = self._resolve_now(now)
        grace_period_expires_at = self._to_naive_utc(assessment.grace_period_expires_at)
        phase1_deadline = self.get_phase1_deadline(db, assessment)

        if assessment.is_locked_for_deadline:
            return {
                "is_locked": True,
                "lock_reason": assessment.lock_reason or self.LOCK_REASON_DEADLINE_EXPIRED,
                "locked_at": self._to_naive_utc(assessment.locked_at)
                or grace_period_expires_at
                or phase1_deadline,
                "grace_period_expires_at": grace_period_expires_at,
                "phase1_deadline": phase1_deadline,
            }

        if grace_period_expires_at is not None:
            if grace_period_expires_at > resolved_now:
                return {
                    "is_locked": False,
                    "lock_reason": None,
                    "locked_at": None,
                    "grace_period_expires_at": grace_period_expires_at,
                    "phase1_deadline": phase1_deadline,
                }
            return {
                "is_locked": True,
                "lock_reason": self.LOCK_REASON_GRACE_PERIOD_EXPIRED,
                "locked_at": grace_period_expires_at,
                "grace_period_expires_at": grace_period_expires_at,
                "phase1_deadline": phase1_deadline,
            }

        if phase1_deadline is not None and resolved_now >= phase1_deadline:
            return {
                "is_locked": True,
                "lock_reason": self.LOCK_REASON_DEADLINE_EXPIRED,
                "locked_at": phase1_deadline,
                "grace_period_expires_at": None,
                "phase1_deadline": phase1_deadline,
            }

        return {
            "is_locked": False,
            "lock_reason": None,
            "locked_at": None,
            "grace_period_expires_at": grace_period_expires_at,
            "phase1_deadline": phase1_deadline,
        }

    def lock_for_blgu(
        self,
        db: Session,
        assessment: Assessment,
        reason: str,
        locked_at: datetime | None = None,
        actor: User | None = None,
        clear_grace_period: bool = False,
    ) -> None:
        resolved_locked_at = self._resolve_now(locked_at)
        assessment.is_locked_for_deadline = True
        assessment.lock_reason = reason
        assessment.locked_at = resolved_locked_at
        if clear_grace_period:
            assessment.grace_period_expires_at = None
        db.add(assessment)

        if actor:
            logger.info(
                "Assessment %s locked for BLGU by %s (%s)",
                assessment.id,
                actor.name,
                reason,
            )

    def unlock_for_blgu(
        self,
        db: Session,
        assessment: Assessment,
        mlgoo_user: User,
        grace_period_expires_at: datetime,
        now: datetime | None = None,
    ) -> None:
        resolved_now = self._resolve_now(now)
        assessment.is_locked_for_deadline = False
        assessment.lock_reason = None
        assessment.locked_at = None
        assessment.grace_period_expires_at = self._to_naive_utc(grace_period_expires_at)
        assessment.grace_period_set_by = mlgoo_user.id
        assessment.unlocked_at = resolved_now
        assessment.unlocked_by = mlgoo_user.id
        db.add(assessment)

    def sync_effective_lock_state(
        self,
        db: Session,
        assessment: Assessment,
        now: datetime | None = None,
        notify: bool = False,
    ) -> dict[str, Any]:
        state = self.get_effective_lock_state(db, assessment, now=now)
        if state["is_locked"] and not assessment.is_locked_for_deadline:
            self.lock_for_blgu(
                db,
                assessment,
                reason=state["lock_reason"],
                locked_at=state["locked_at"],
                clear_grace_period=False,
            )
            if notify:
                self.notify_assessment_locked(
                    db,
                    assessment,
                    reason=state["lock_reason"],
                    grace_period_expires_at=state["grace_period_expires_at"],
                )
        return state

    def ensure_blgu_write_allowed(
        self, db: Session, assessment: Assessment, action: str = "modify this assessment"
    ) -> None:
        state = self.sync_effective_lock_state(db, assessment, notify=False)
        if state["is_locked"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=self.get_lock_message(state["lock_reason"], action),
            )

    def get_lock_message(self, reason: str | None, action: str) -> str:
        if reason == self.LOCK_REASON_GRACE_PERIOD_EXPIRED:
            return (
                f"This assessment is locked because the MLGOO grace period expired. "
                f"You cannot {action} until MLGOO reopens editing."
            )
        if reason == self.LOCK_REASON_MLGOO_MANUAL_LOCK:
            return f"This assessment is locked by MLGOO. You cannot {action} until MLGOO reopens editing."
        return (
            f"This assessment is locked because the submission deadline expired. "
            f"You cannot {action} until MLGOO reopens editing."
        )

    def process_expired_assessment_locks(
        self, db: Session, now: datetime | None = None
    ) -> dict[str, int]:
        resolved_now = self._resolve_now(now)
        deadline_locked = 0
        grace_relocked = 0

        active_year = db.query(AssessmentYear).filter(AssessmentYear.is_active == True).first()
        if active_year:
            assessments = (
                db.query(Assessment).filter(Assessment.assessment_year == active_year.year).all()
            )
            for assessment in assessments:
                state = self.get_effective_lock_state(db, assessment, now=resolved_now)
                if state["is_locked"] and not assessment.is_locked_for_deadline:
                    self.lock_for_blgu(
                        db,
                        assessment,
                        reason=state["lock_reason"],
                        locked_at=state["locked_at"],
                        clear_grace_period=False,
                    )
                    self.notify_assessment_locked(
                        db,
                        assessment,
                        reason=state["lock_reason"],
                        grace_period_expires_at=state["grace_period_expires_at"],
                    )
                    if state["lock_reason"] == self.LOCK_REASON_GRACE_PERIOD_EXPIRED:
                        grace_relocked += 1
                    elif state["lock_reason"] == self.LOCK_REASON_DEADLINE_EXPIRED:
                        deadline_locked += 1

        other_grace_assessments = (
            db.query(Assessment)
            .filter(
                Assessment.is_locked_for_deadline == False,  # noqa: E712
                Assessment.grace_period_expires_at.is_not(None),
            )
            .all()
        )
        for assessment in other_grace_assessments:
            state = self.get_effective_lock_state(db, assessment, now=resolved_now)
            if (
                state["is_locked"]
                and state["lock_reason"] == self.LOCK_REASON_GRACE_PERIOD_EXPIRED
                and not assessment.is_locked_for_deadline
            ):
                self.lock_for_blgu(
                    db,
                    assessment,
                    reason=self.LOCK_REASON_GRACE_PERIOD_EXPIRED,
                    locked_at=state["locked_at"],
                    clear_grace_period=False,
                )
                self.notify_assessment_locked(
                    db,
                    assessment,
                    reason=self.LOCK_REASON_GRACE_PERIOD_EXPIRED,
                    grace_period_expires_at=state["grace_period_expires_at"],
                )
                grace_relocked += 1

        if deadline_locked or grace_relocked:
            db.commit()

        return {
            "deadline_locked": deadline_locked,
            "grace_relocked": grace_relocked,
        }

    def notify_assessment_locked(
        self,
        db: Session,
        assessment: Assessment,
        reason: str,
        grace_period_expires_at: datetime | None = None,
    ) -> None:
        barangay_name = "Unknown Barangay"
        if assessment.blgu_user and assessment.blgu_user.barangay:
            barangay_name = assessment.blgu_user.barangay.name

        if reason == self.LOCK_REASON_GRACE_PERIOD_EXPIRED:
            title = "Assessment Locked Again"
            message = (
                "The grace period for your assessment has expired. "
                "Your assessment is locked again and can only be reopened by MLGOO."
            )
        elif reason == self.LOCK_REASON_MLGOO_MANUAL_LOCK:
            title = "Assessment Locked by MLGOO"
            message = (
                "MLGOO locked your assessment again. "
                "You can still view your data, but editing and submission actions are disabled."
            )
        else:
            title = "Assessment Locked After Deadline"
            message = (
                "The assessment deadline has expired. "
                "Your assessment is now read-only until MLGOO reopens editing."
            )

        if assessment.blgu_user_id:
            notification_service.notify_blgu_user(
                db=db,
                notification_type=NotificationType.ASSESSMENT_LOCKED,
                title=title,
                message=message,
                blgu_user_id=assessment.blgu_user_id,
                assessment_id=assessment.id,
            )

        if reason != self.LOCK_REASON_MLGOO_MANUAL_LOCK:
            notification_service.notify_all_mlgoo_users(
                db=db,
                notification_type=NotificationType.ASSESSMENT_LOCKED,
                title=f"Assessment Locked: {barangay_name}",
                message=(
                    f"{barangay_name}'s assessment is locked for BLGU editing "
                    f"because {reason.replace('_', ' ')}."
                ),
                assessment_id=assessment.id,
            )

    def notify_assessment_unlocked(
        self,
        db: Session,
        assessment: Assessment,
        grace_period_expires_at: datetime,
    ) -> None:
        if not assessment.blgu_user_id:
            return

        formatted_expiry = self._to_naive_utc(grace_period_expires_at)
        expiry_text = (
            formatted_expiry.isoformat() if formatted_expiry is not None else "the selected time"
        )
        notification_service.notify_blgu_user(
            db=db,
            notification_type=NotificationType.ASSESSMENT_UNLOCKED,
            title="Assessment Reopened by MLGOO",
            message=(
                "MLGOO reopened your assessment for editing. "
                f"You may make changes until {expiry_text}."
            ),
            blgu_user_id=assessment.blgu_user_id,
            assessment_id=assessment.id,
        )


assessment_lock_service = AssessmentLockService()
