import { describe, expect, it } from "vitest";

import {
  getGracePeriodMessage,
  getLockMessage,
  getLockReasonLabel,
  hasActiveGracePeriod,
  isBlguLocked,
} from "../assessment-locks";

describe("assessment-locks", () => {
  it("treats explicit BLGU lock state as locked", () => {
    expect(isBlguLocked({ is_locked_for_blgu: true })).toBe(true);
    expect(isBlguLocked({ is_locked_for_blgu: false })).toBe(false);
  });

  it("treats future grace periods as active only while unlocked", () => {
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    expect(
      hasActiveGracePeriod({
        is_locked_for_blgu: false,
        grace_period_expires_at: futureExpiry,
      })
    ).toBe(true);

    expect(
      hasActiveGracePeriod({
        is_locked_for_blgu: true,
        grace_period_expires_at: futureExpiry,
      })
    ).toBe(false);
  });

  it("maps lock reasons to user-facing labels and messages", () => {
    expect(getLockReasonLabel("deadline_expired")).toBe("Deadline Expired");
    expect(getLockReasonLabel("grace_period_expired")).toBe("Grace Period Expired");
    expect(getLockReasonLabel("mlgoo_manual_lock")).toBe("Locked by MLGOO");

    expect(getLockMessage("deadline_expired")).toContain("deadline expired");
    expect(getLockMessage("grace_period_expired")).toContain("grace period expired");
    expect(getLockMessage("mlgoo_manual_lock")).toContain("locked by MLGOO");
  });

  it("formats grace-period reopen messaging with the selected expiry", () => {
    expect(getGracePeriodMessage(undefined)).toContain("temporarily reopened");
    expect(getGracePeriodMessage("2026-03-24T12:00:00.000Z")).toContain("2026");
  });
});
