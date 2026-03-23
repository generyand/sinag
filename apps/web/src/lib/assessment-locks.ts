export type LockReason = "deadline_expired" | "grace_period_expired" | "mlgoo_manual_lock";

export interface BlguLockStateLike {
  is_locked_for_blgu?: boolean | null;
  lock_reason?: string | null;
  grace_period_expires_at?: string | null;
  unlocked_at?: string | null;
}

export function isBlguLocked(state: BlguLockStateLike | null | undefined): boolean {
  return state?.is_locked_for_blgu === true;
}

export function hasActiveGracePeriod(state: BlguLockStateLike | null | undefined): boolean {
  if (!state?.grace_period_expires_at || isBlguLocked(state)) {
    return false;
  }

  const expiry = new Date(state.grace_period_expires_at);
  return !Number.isNaN(expiry.getTime()) && expiry.getTime() > Date.now();
}

export function getLockReasonLabel(reason: string | null | undefined): string {
  switch (reason) {
    case "grace_period_expired":
      return "Grace Period Expired";
    case "mlgoo_manual_lock":
      return "Locked by MLGOO";
    case "deadline_expired":
    default:
      return "Deadline Expired";
  }
}

export function getLockMessage(reason: string | null | undefined): string {
  switch (reason) {
    case "grace_period_expired":
      return "Editing is locked because the MLGOO grace period expired. Only MLGOO can reopen this assessment.";
    case "mlgoo_manual_lock":
      return "Editing is locked by MLGOO. You can still review your data, but only MLGOO can reopen editing.";
    case "deadline_expired":
    default:
      return "Editing is locked because the assessment deadline expired. You can still review your data, but only MLGOO can reopen editing.";
  }
}

export function getGracePeriodMessage(gracePeriodExpiresAt: string | null | undefined): string {
  if (!gracePeriodExpiresAt) {
    return "MLGOO temporarily reopened this assessment for editing.";
  }

  return `MLGOO temporarily reopened this assessment for editing until ${new Date(
    gracePeriodExpiresAt
  ).toLocaleString()}.`;
}
