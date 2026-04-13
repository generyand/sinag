# SNG-28 General Feedback Reset Design

**Problem**

When a BLGU resubmits after rework or calibration, the reviewer's active `General Feedback` textarea
still hydrates from older validation comments. That makes the new review cycle look like it already
has current feedback, even though the old comment should only exist as archived history.

**Decision**

Clear the active `General Feedback` textarea on resubmission by filtering hydrated comments against
the latest review boundary.

- Assessor review uses `assessment.rework_requested_at` as the boundary for the new cycle.
- Validator review uses the latest calibration boundary available to the current review flow.
- Comments older than that boundary remain in `feedback_comments` and history payloads, but they do
  not populate the active textarea.
- Comments created during the current cycle continue to hydrate normally, so autosaved feedback
  still survives refreshes in the same cycle.

**Why This Approach**

This is the smallest safe fix. The bug is in active-form hydration, not in comment storage. Keeping
the fix in the reviewer UI avoids destructive data changes and does not require a new backend
archival workflow.

**Testing**

- Add reviewer-panel tests proving assessors and validators see a blank General Feedback textarea
  when only prior-cycle comments exist.
- Preserve existing integration coverage that same-cycle autosaved comments still rehydrate after a
  refresh.
- Run targeted Vitest suites for the review panel and validation client.
