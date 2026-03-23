# BGAR Active Assessment Year Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the BGAR tab and exported BGAR PDF derive the header `CY/PY` from the current active
assessment year instead of the selected assessment record's stored year.

**Architecture:** Keep `apps/api/app/services/gar_service.py` as the single source of truth for BGAR
header text by resolving the active assessment year before building `GARResponse.cycle_year`. The
web BGAR tab and PDF export should continue consuming `gar_data.cycle_year` unchanged so one backend
fix corrects both surfaces. This plan intentionally limits the behavior change to the BGAR header
string only; indicator and checklist placeholder resolution remains tied to
`assessment.assessment_year` unless a separate requirement expands scope.

**Tech Stack:** FastAPI, SQLAlchemy, pytest, Next.js, shared GAR response contract

---

### Task 1: Move BGAR Header Year Resolution to the Active Assessment Year

**Files:**

- Modify: `apps/api/app/services/gar_service.py`
- Reference: `apps/api/app/services/assessment_year_service.py`
- Reference: `apps/web/src/components/features/gar/GARReportDisplay.tsx`
- Reference: `apps/api/app/services/gar_export_service.py`

- [ ] **Step 1: Inspect the current BGAR year construction and active-year helper**

Read:

- `apps/api/app/services/gar_service.py`
- `apps/api/app/services/assessment_year_service.py`

Confirm:

- `cycle_year` is currently built from `assessment.assessment_year`
- `assessment_year_service.get_active_year(db)` already returns the active `AssessmentYear`

- [ ] **Step 2: Write the failing regression test for active-year precedence**

Update `apps/api/tests/services/test_gar_service.py` with a new test that creates:

- an inactive or non-active `AssessmentYear` row for `2025`
- an active `AssessmentYear` for `2026`
- a completed `Assessment` whose `assessment_year` is `2025`

Use a test body shaped like:

```python
def test_get_gar_data_uses_active_assessment_year_for_cycle_header(db_session):
    prior_year = AssessmentYear(
        year=2025,
        assessment_period_start=datetime(2025, 1, 1),
        assessment_period_end=datetime(2025, 10, 31),
        is_active=False,
        is_published=True,
    )
    active_year = AssessmentYear(
        year=2026,
        assessment_period_start=datetime(2026, 1, 1),
        assessment_period_end=datetime(2026, 10, 31),
        is_active=True,
        is_published=True,
    )
    db_session.add_all([prior_year, active_year])
    ...
    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        assessment_year=2025,
        status=AssessmentStatus.COMPLETED,
    )
    ...
    gar_data = gar_service.get_gar_data(db_session, assessment.id)
    assert gar_data.cycle_year == "CY 2026 SGLGB (PY 2025)"
```

- [ ] **Step 3: Run the new test and verify it fails for the right reason**

Run:

```bash
cd apps/api && uv run pytest tests/services/test_gar_service.py -k active_assessment_year_for_cycle_header -v
```

Expected:

- FAIL because `gar_service` still returns `CY 2025 SGLGB (PY 2024)` from
  `assessment.assessment_year`

- [ ] **Step 4: Implement the minimal backend fix in `gar_service`**

Import and use `assessment_year_service` near the `cycle_year` construction so the logic becomes:

```python
from app.services.assessment_year_service import assessment_year_service

active_year = assessment_year_service.get_active_year(db)
header_year = active_year.year if active_year else assessment.assessment_year
cycle_year = f"CY {header_year} SGLGB (PY {header_year - 1})"
```

Implementation notes:

- Keep the fallback to `assessment.assessment_year` if no active year exists so GAR generation still
  works in misconfigured environments.
- Do not change the response schema or the web/PDF rendering code in this fix.
- Keep year placeholder resolution untouched for indicator text and checklist text in this fix.
  Mixed output is expected by design for now: the header should use active year, while body
  placeholder resolution remains assessment-based.

- [ ] **Step 5: Run the focused regression test again**

Run:

```bash
cd apps/api && uv run pytest tests/services/test_gar_service.py -k active_assessment_year_for_cycle_header -v
```

Expected:

- PASS

- [ ] **Step 6: Commit the service fix**

```bash
git add apps/api/app/services/gar_service.py apps/api/tests/services/test_gar_service.py
git commit -m "fix(api): use active year for bgar header"
```

### Task 2: Cover Fallback Behavior and Existing Contract Expectations

**Files:**

- Modify: `apps/api/tests/services/test_gar_service.py`
- Reference: `apps/api/app/services/gar_service.py`

- [ ] **Step 1: Add a fallback test for missing active assessment year**

Extend `apps/api/tests/services/test_gar_service.py` with a test that creates:

- no active `AssessmentYear`
- a non-active or unpublished `AssessmentYear` row for `2025` so the `Assessment.assessment_year`
  foreign key remains valid
- a completed `Assessment` with `assessment_year=2025`

Use a test body shaped like:

```python
def test_get_gar_data_falls_back_to_assessment_year_when_no_active_year(db_session):
    prior_year = AssessmentYear(
        year=2025,
        assessment_period_start=datetime(2025, 1, 1),
        assessment_period_end=datetime(2025, 10, 31),
        is_active=False,
        is_published=True,
    )
    db_session.add(prior_year)
    db_session.flush()

    assessment = Assessment(
        blgu_user_id=blgu_user.id,
        assessment_year=2025,
        status=AssessmentStatus.COMPLETED,
    )
    ...
    gar_data = gar_service.get_gar_data(db_session, assessment.id)
    assert gar_data.cycle_year == "CY 2025 SGLGB (PY 2024)"
```

- [ ] **Step 2: Align the existing year-header assertion with the new source-of-truth rule**

Review the current header assertion in `test_get_gar_data_resolves_year_placeholders`.

Expected update:

- keep the active year in that test at `2026`
- keep the assertion as `CY 2026 SGLGB (PY 2025)`
- keep the indicator/checklist placeholder assertions tied to `assessment.assessment_year=2026` in
  that test, since this plan does not change body placeholder behavior

- [ ] **Step 3: Run the GAR service test file**

Run:

```bash
cd apps/api && uv run pytest tests/services/test_gar_service.py -v
```

Expected:

- All GAR service tests PASS

- [ ] **Step 4: Commit the test coverage**

```bash
git add apps/api/tests/services/test_gar_service.py
git commit -m "test(api): cover bgar active-year header logic"
```

### Task 3: Verify Both Consumer Paths Still Read the Shared Header

**Files:**

- Reference: `apps/web/src/components/features/gar/GARReportDisplay.tsx`
- Reference: `apps/api/app/services/gar_export_service.py`

- [ ] **Step 1: Reconfirm both renderers still use `cycle_year` directly**

Verify:

- `GARReportDisplay` renders `data.cycle_year`
- `GARExportService` renders `gar_data.cycle_year` for PDF/Excel headers

No code change should be needed if Task 1 is implemented correctly.

- [ ] **Step 2: Run a targeted smoke check for the API tests plus optional app checks**

Run:

```bash
cd apps/api && uv run pytest tests/services/test_gar_service.py -v
```

Optional manual smoke check if local services are available:

```bash
pnpm dev
```

Then:

- open the MLGOO BGAR tab
- set the GAR page year selector to `2025` if the effective year defaults to the active year
- select a completed 2025 assessment from the filtered list
- export the BGAR PDF
- confirm both show `CY 2026 SGLGB (PY 2025)` when the active assessment year is `2026`
- confirm the selected assessment remains a 2025 assessment even though the header now shows the
  active-year-based BGAR cycle header

- [ ] **Step 3: Commit verification-safe final state**

```bash
git status --short
```

Expected:

- only intended `gar_service` and GAR test changes are pending or committed
