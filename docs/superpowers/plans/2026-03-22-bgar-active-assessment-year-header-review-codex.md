# Plan Review: BGAR Active Assessment Year Header

**Reviewed by:** Codex **Date:** 2026-03-22 **Plan:**
`docs/superpowers/plans/2026-03-22-bgar-active-assessment-year-header.md`

---

## Findings

1. **The proposed regression test setup is not feasible as written because it violates the
   `Assessment.assessment_year` foreign key.**

   The plan’s sample test creates an active `AssessmentYear` for `2026` and an `Assessment` with
   `assessment_year=2025`, but it does not also create an `AssessmentYear` row for `2025`. In the
   model, `Assessment.assessment_year` is a foreign key to `assessment_years.year`, so the test
   fixture will fail before it reaches the BGAR logic.

   Relevant files:
   - `apps/api/app/db/models/assessment.py` (`assessment_year` foreign key)
   - `apps/api/tests/services/test_gar_service.py`
   - `docs/superpowers/plans/2026-03-22-bgar-active-assessment-year-header.md`

   Suggested fix:
   - Update the plan so the active-year-precedence test creates two `AssessmentYear` rows:
     - one inactive/published row for `2025`
     - one active/published row for `2026`
   - Then create the `Assessment` with `assessment_year=2025`.

2. **The plan leaves a likely product-consistency gap around placeholder year resolution inside the
   report body.**

   In `apps/api/app/services/gar_service.py`, year placeholders for indicator/checklist text are
   currently resolved using `assessment.assessment_year` via
   `get_year_resolver(db, year=assessment.assessment_year)`. The plan explicitly says to keep that
   path unchanged while changing only `cycle_year`.

   That is technically feasible, but it may produce mixed-year output:
   - header shows `CY 2026 SGLGB (PY 2025)`
   - indicator/checklist text may still resolve against `2025`

   This may be acceptable if the bug is strictly “header years only,” but the plan should not leave
   that assumption implicit.

   Relevant files:
   - `apps/api/app/services/gar_service.py`
   - `apps/api/app/core/year_resolver.py`
   - `apps/web/src/components/features/gar/GARReportDisplay.tsx`

   Suggested fix:
   - Add an explicit scope decision to the plan:
     - either “change header only; body placeholder years remain tied to
       `assessment.assessment_year`”
     - or “change both header and GAR body placeholder resolution to active year”
   - Add a test matching that decision.

3. **The manual verification step is underspecified for the actual MLGOO GAR page behavior.**

   The plan says to open the BGAR tab for “a completed assessment stored under the prior year,” but
   the page fetches completed assessments for the currently selected/effective year. That means
   manual reproduction depends on how the tester reaches a prior-year assessment in the UI.

   Relevant files:
   - `apps/web/src/app/(app)/mlgoo/gar/page.tsx`

   Suggested fix:
   - Make the manual verification step explicit:
     - select year `2025` in the GAR page if needed
     - choose a completed 2025 assessment
     - confirm the header now reflects active year `2026`
   - Or state that verification will be API/test-driven only if UI setup is not stable enough.

## Open Questions

1. Is the requirement strictly limited to the BGAR/PDF header, or should all report year references
   inside indicator/checklist text also follow the active assessment year?
2. When there is no active assessment year configured, is fallback to `assessment.assessment_year`
   the desired behavior, or should GAR generation fail loudly because the system configuration is
   invalid?

## Recommendation

Needs revision before execution.

The plan is directionally correct and keeps the fix appropriately narrow, but it should be updated
to:

- correct the test data setup for the `assessment_year` foreign key,
- make the header-vs-body year-source decision explicit,
- tighten the manual verification instructions to match the GAR page’s year-filtered assessment
  list.

---

## Next Steps

- [ ] Revise the plan to include a valid dual-year test fixture (`2025` assessment year row + active
      `2026` year row)
- [ ] Clarify whether year placeholder resolution in GAR body content should remain assessment-based
      or switch to active-year-based
- [ ] Update the verification section to reflect the actual GAR page flow
