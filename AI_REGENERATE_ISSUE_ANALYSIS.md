# AI-Generated Content Not Updating - Root Cause Analysis

## Problem Statement

When users click "Regenerate" on the "Top Reasons for Rework/Calibration" card in the MLGOO
dashboard, the content doesn't change even though:

- Multiple reworks and calibrations have occurred
- The toast says "AI analysis refreshed successfully"
- Redis cache is being invalidated

## Investigation Summary

### 1. Data Flow Architecture

```
User clicks "Regenerate"
    ↓
POST /api/v1/analytics/dashboard/refresh-analysis?year={year}
    ↓
Router: analytics.py:228 (refresh_dashboard_analysis)
    ↓
Invalidates Redis cache: dashboard_kpis:year_{year}
    ↓
Calls: analytics_service._calculate_top_rework_reasons(db, year)
    ↓
Extracts key_issues from database:
  - assessment.rework_summary (JSON field)
  - assessment.calibration_summary (JSON field)
  - assessment.calibration_summaries_by_area (JSON field)
    ↓
Returns RefreshAnalysisResponse with top_rework_reasons
```

**Confirmed Endpoint**: `/api/v1/analytics/dashboard/refresh-analysis` (analytics.py:228)

### 2. Verified Data Structures

**Database Storage (Confirmed via SQL query)**:

```json
{
  "ceb": {
    "indicator_summaries": [
      {
        "indicator_id": 1,
        "key_issues": [
          "Ang Accomplished and signed BFR wala ma-upload...",
          "..."
        ]
      }
    ]
  },
  "en": { ... }
}
```

**Extraction Logic (analytics_service.py:686-717)**:

```python
def extract_key_issues_from_summary(summary: dict) -> list[str]:
    # Check for language keys (ceb, en, fil) at top level ✓
    for lang_key in ["ceb", "en", "fil"]:
        lang_data = summary.get(lang_key)
        if isinstance(lang_data, dict):
            indicator_summaries = lang_data.get("indicator_summaries", [])
            for ind_summary in indicator_summaries:
                key_issues = ind_summary.get("key_issues", [])
                issues.extend(key_issues)  # ✓ Correctly extracting
```

### 3. Root Causes Identified

#### **ROOT CAUSE #1: Data Staleness - Summaries Never Change**

**The Critical Issue**: The AI summaries (rework_summary, calibration_summary) are **ONLY generated
ONCE** when rework/calibration is first requested. They are **NEVER regenerated** even when new
reworks/calibrations occur.

**Evidence**:

1. **Intelligence Worker (lines 240-251)**: Skips generation if summaries already exist

   ```python
   if isinstance(assessment.rework_summary, dict) and "ceb" in assessment.rework_summary:
       logger.info("Rework summaries already exist, skipping generation")
       return {"success": True, "skipped": True}
   ```

2. **Workflow Analysis**:
   - **First Rework** (rework_count=0→1): AI summary generated ✓
   - **First Calibration** (calibration_count=0→1): AI summary generated ✓
   - **Subsequent Reworks/Calibrations**: Summaries **NOT regenerated** ✗

3. **Assessment Lifecycle**:

   ```
   DRAFT → SUBMITTED → (Rework #1) → REWORK [AI Generated] → SUBMITTED
       → IN_REVIEW → (Calibration Area 1) → REWORK [AI Generated]
       → SUBMITTED → (Calibration Area 2) → REWORK [AI Generated - NEW SUMMARY]
       → SUBMITTED → AWAITING_MLGOO_APPROVAL
   ```

   **Problem**: When an assessment goes through multiple calibration cycles (different governance
   areas), each new calibration generates a NEW summary that **overwrites or supplements** previous
   ones. BUT the `key_issues` from the FIRST rework/calibration never change to reflect the NEW
   issues.

#### **ROOT CAUSE #2: Misaligned Expectations**

**User Expectation**: "Regenerate" should re-analyze ALL current rework/calibration feedback and
generate fresh insights.

**Actual Behavior**: "Regenerate" only invalidates cache and re-displays the SAME stale AI summaries
from the database.

**The Problem**: The summaries stored in the database are historical snapshots from when
rework/calibration was FIRST requested, not a live reflection of the current state.

### 4. Why the Extraction Logic Works BUT Shows Stale Data

**The extraction logic in `_calculate_top_rework_reasons()` is CORRECT**, but it's extracting from
stale data:

```python
# Line 719-737: This code WORKS perfectly
for assessment in assessments:
    # Extract from rework_summary (STALE - generated once)
    if assessment.rework_summary:
        rework_reasons.extend(extract_key_issues_from_summary(assessment.rework_summary))

    # Extract from calibration_summary (STALE - last calibration only)
    if assessment.calibration_summary:
        calibration_reasons.extend(extract_key_issues_from_summary(assessment.calibration_summary))

    # Extract from calibration_summaries_by_area (BETTER - per-area history)
    if assessment.calibration_summaries_by_area:
        for area_id, area_summary in assessment.calibration_summaries_by_area.items():
            calibration_reasons.extend(extract_key_issues_from_summary(area_summary))
```

**Database Reality**:

- Assessment #73 had rework_count=1, calibration_count=2
- rework_summary: Contains issues from the FIRST rework (may be outdated)
- calibration_summary: Contains issues from the LAST calibration only
- calibration_summaries_by_area: Contains per-area calibrations (BETTER)

### 5. Additional Issues

#### Issue A: Fallback to Feedback Comments is Ineffective

**Code (lines 738-753)**:

```python
# If no AI-generated reasons, fall back to feedback comments
if not rework_reasons and not calibration_reasons:
    feedback_comments = (
        db.query(FeedbackComment)
        .join(AssessmentResponse)
        .filter(AssessmentResponse.assessment_id.in_(assessment_ids_with_rework))
        .filter(FeedbackComment.is_internal_note == False)
        .limit(50)
        .all()
    )
```

**Problem**: This fallback only runs if **BOTH** rework_reasons AND calibration_reasons are empty.
If there's even ONE stale AI summary, the fallback never runs.

#### Issue B: No Aggregation Across Time

The current approach aggregates key_issues across different assessments BUT doesn't aggregate issues
across MULTIPLE rework/calibration cycles within the SAME assessment.

**Example Scenario**:

- Assessment #73:
  - Rework #1 (Day 1): "Missing BFR signature" → AI summary generated
  - Calibration #1 (Day 5): "Missing evacuation center" → AI summary generated
  - Calibration #2 (Day 10): "Missing GAD budget" → AI summary generated

**Current Behavior**: Dashboard shows issues from Calibration #2 only (most recent)

**Expected Behavior**: Dashboard should show ALL unique issues from ALL cycles

## Recommended Solutions

### **Solution 1: Re-generate Summaries on Demand (RECOMMENDED)**

**Implementation**:

```python
# In analytics_service.py - Add new method
def _regenerate_ai_summaries_for_assessment(
    self, db: Session, assessment_id: int
) -> None:
    """Force regeneration of AI summaries for an assessment."""
    from app.workers.intelligence_worker import (
        generate_rework_summary_sync,
        generate_calibration_summary_sync
    )

    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        return

    # Regenerate rework summary if rework occurred
    if assessment.rework_count > 0:
        # Clear existing summary to force regeneration
        assessment.rework_summary = None
        db.commit()
        generate_rework_summary_sync(db, assessment_id)

    # Regenerate calibration summaries if calibration occurred
    if assessment.calibration_count > 0:
        # Clear existing summaries
        assessment.calibration_summary = None
        assessment.calibration_summaries_by_area = None
        db.commit()

        # Regenerate for each calibrated area
        for area_id in assessment.calibrated_area_ids or []:
            generate_calibration_summary_sync(db, assessment_id, area_id)

# Modify regenerate_ai_analysis endpoint
def regenerate_ai_analysis(self, db: Session, assessment_year: int | None = None):
    # 1. Get all assessments with rework/calibration
    assessments = (
        db.query(Assessment)
        .filter(or_(Assessment.rework_count > 0, Assessment.calibration_count > 0))
        .all()
    )

    # 2. Regenerate AI summaries for each assessment
    for assessment in assessments:
        self._regenerate_ai_summaries_for_assessment(db, assessment.id)

    # 3. Invalidate cache
    cache.delete_pattern("dashboard_kpis:*")

    return {"success": True, "regenerated_count": len(assessments)}
```

**Pros**:

- Fresh, up-to-date AI analysis reflecting current state
- Aligns with user expectations
- Gemini API re-analyzes all feedback

**Cons**:

- API costs (Gemini API calls)
- Slower response time
- Requires Celery workers

### **Solution 2: Aggregate Across Historical Feedback Comments (FASTER)**

**Implementation**:

```python
# Modify _calculate_top_rework_reasons to always use feedback comments
# This bypasses stale AI summaries and uses raw feedback data

def _calculate_top_rework_reasons(self, db: Session, assessment_year: int | None = None):
    # ... existing code ...

    # ALWAYS extract from feedback comments (not just as fallback)
    all_feedback_reasons = []

    for assessment in assessments:
        # Get all public feedback comments for this assessment
        feedback_comments = (
            db.query(FeedbackComment)
            .join(AssessmentResponse)
            .filter(AssessmentResponse.assessment_id == assessment.id)
            .filter(FeedbackComment.is_internal_note == False)
            .all()
        )

        for fc in feedback_comments:
            if fc.comment:
                all_feedback_reasons.append({
                    'comment': fc.comment,
                    'assessment_id': assessment.id,
                    'response_id': fc.response_id
                })

    # Use NLP/keyword extraction to identify top issues
    # (Or simply use raw comments if acceptable)
```

**Pros**:

- No API costs
- Fast (no Gemini calls)
- Always current (uses live feedback data)

**Cons**:

- Raw feedback comments may be less structured
- Loses AI summarization benefits
- May require additional NLP processing

### **Solution 3: Incremental Summary Updates (COMPLEX)**

**Implementation**: Store a history of all summaries and merge them when displaying.

**Database Schema Change**:

```python
# Add new fields to Assessment model
summary_history: Mapped[list | None] = mapped_column(JSON, nullable=True)
# Structure: [
#   {"type": "rework", "generated_at": "...", "summary": {...}},
#   {"type": "calibration", "area_id": 1, "generated_at": "...", "summary": {...}}
# ]
```

**Pros**:

- Maintains full history
- No data loss
- Can show trends over time

**Cons**:

- Database migration required
- Complex merging logic
- Increased storage

## Immediate Fix (Band-aid Solution)

While implementing a full solution, add a note to the UI:

```typescript
// In the dashboard component
<Alert>
  <AlertDescription>
    Note: AI analysis reflects issues from the most recent rework/calibration cycle.
    Click "Regenerate" to refresh with latest feedback data.
  </AlertDescription>
</Alert>
```

## Testing Recommendations

1. **Create test assessment with multiple cycles**:
   - Trigger rework with different issues
   - Trigger calibration in different areas
   - Verify summaries update correctly

2. **Verify extraction logic**:
   - SQL query to check summary structure
   - Unit test for `extract_key_issues_from_summary()`

3. **Load test regeneration**:
   - Simulate 100+ assessments
   - Measure API response time
   - Check Gemini API costs

## Conclusion

The "regenerate" feature is correctly invalidating cache and extracting data, but the underlying AI
summaries in the database are **stale snapshots** that don't reflect the current state. The fix
requires either:

1. Re-generating AI summaries on demand (best UX, higher cost)
2. Using raw feedback data instead (faster, lower quality)
3. Maintaining summary history (complex, most comprehensive)

**Recommended Approach**: Implement Solution #1 with async Celery tasks to keep it performant.
