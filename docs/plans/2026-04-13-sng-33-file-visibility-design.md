# SNG-33 File Visibility Design

**Problem**

Reviewer and BLGU file views currently collapse older uploads behind history toggles. In the rework
and calibration flows this hides still-valid evidence, especially in the assessor and validator
panel where unmodified files are moved into `View existing file history`.

**Decision**

Keep the existing section boundaries, but stop collapsing file lists inside those sections.

- Reviewer panel keeps semantic groupings such as `Latest File`, `Existing File`, `Previous File`,
  `Barangay Uploads`, and `Validator Uploads`.
- BLGU file field keeps current uploads inline and continues to show special rework/reference
  sections separately.
- Validator-origin uploads remain separated from barangay uploads.
- No file-history toggle is shown for these surfaces.

**Why This Approach**

This is the smallest safe change. It removes the confusing behavior without changing backend
contracts or the logic that determines whether a file is current, previous, validator-origin, or
replacement evidence.

**Validation**

- Update review-panel tests to assert unmodified files stay visible inline and no history button is
  rendered.
- Update file-field tests to assert all uploads render immediately and no history button is
  rendered.
- Run the targeted Vitest suites for both components.
