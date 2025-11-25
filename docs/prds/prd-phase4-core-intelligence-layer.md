# PRD: The Core Intelligence Layer

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.1 | November 12, 2025 | VANTAGE Development Team | **Phase 4 PRD Alignment**: Aligned with Indicator Builder Specification v1.4<br/>- Enhanced [Section 4.2 (Classification Algorithm)](#42-the-classification-algorithm) to handle "Considered" validation status (equivalent to "Passed" for compliance determination)<br/>- Updated algorithm logic to treat both "Passed" and "Considered" statuses as successful for 3+1 rule<br/>- Added Indicator Builder Specification v1.4 reference to [Section 7 (Technical Considerations)](#7-technical-considerations)<br/>- Clarified validation status types including grace period compliance |
| 1.0 | Initial | - | Original PRD for Core Intelligence Layer |

---

### 1. Introduction & Overview

**Project Title:** SGLGB Analytics System: Strategic Insights Nurturing Assessments and Governance (SINAG) To Assess And Assist Barangays utilizing a Large Language Model and Classification Algorithm

This document outlines the product requirements for **Phase 4: The Core Intelligence Layer**. This phase implements the "smart" features that automate scoring and generate AI-powered insights based on the final, validated assessment data.

This phase consists of two integrated features:

1. **The Classification Algorithm:** An automated backend module that applies the "3+1" SGLGB logic to validated assessment data to calculate the official compliance status (Pass/Fail).
2. **Gemini API Integration:** A backend service that generates written recommendations and capacity development insights using Google's Gemini AI.

The goal is to transform raw validation data into actionable intelligence that helps MLGOO-DILG staff and local governments understand compliance status and identify improvement opportunities.

### 2. Goals

- **Automated Compliance Determination:** Eliminate manual calculation errors by automatically determining SGLGB compliance status based on the official "3+1" rule.
- **Actionable Insights Generation:** Provide MLGOO-DILG supervisors with AI-generated, data-driven recommendations to guide capacity development programs.
- **Strategic Decision Support:** Enable leadership to quickly identify which barangays need assistance and where to allocate training resources.
- **Historical Tracking:** Store both compliance status and AI recommendations for trend analysis and program evaluation over time.
- **Performance & Efficiency:** Ensure the entire intelligence layer processes assessments quickly and cost-effectively.

### 3. User Stories

- **As an MLGOO-DILG user, I want to:**

  - See the final SGLGB Compliance Status (Passed/Failed) displayed prominently on my dashboard next to each barangay name.
  - Click a button on a validated assessment report to generate AI-powered insights with recommendations.
  - View a structured report showing the specific areas where a barangay passed or failed.
  - Read AI-generated recommendations that directly address the failed indicators.
  - Access a list of specific capacity development programs that would help improve compliance.
  - See a one-paragraph summary of the barangay's key governance weaknesses.

- **As the system, I want to:**
  - Automatically calculate and store compliance status immediately after an assessor finalizes validation.
  - Group failed indicators by governance area to identify patterns and gaps.
  - Store both the compliance status and area results in the database for historical tracking.
  - Only call the Gemini API when explicitly requested by the user (to manage costs).
  - Cache Gemini API results to avoid duplicate API calls for the same assessment.
  - Handle API failures gracefully without breaking the user interface.

### 4. Functional Requirements

#### 4.1. Database Schema Changes

**1.1** The `assessments` table must be extended with three new columns:

- `final_compliance_status`: An `Enum` field with values `PASSED` and `FAILED`, defaulting to `None` (nullable).
- `area_results`: A `JSONB` column to store the pass/fail status of each governance area. Format: `{"Financial": "Passed", "Disaster Prep": "Failed", "Safety, Peace and Order": "Passed", "Social Protection": "Passed", "Business-Friendly": "Failed", "Environmental": "Failed"}`.
- `ai_recommendations`: A `JSONB` column to store the structured JSON response from Gemini API. Format: `{"summary": "...", "recommendations": [...], "capacity_development_needs": [...]}`.

**1.2** The new enum `ComplianceStatus` must be added to `apps/api/app/db/enums.py` with values `PASSED` and `FAILED`.

**1.3** A database migration must be created to add these columns to the `assessments` table.

#### 4.2. The Classification Algorithm

**2.1** The algorithm must run automatically and immediately after an Area Assessor clicks "Finalize Validation" on an assessment. This occurs in the background as part of the finalization process.

**2.2** The algorithm must query all `assessment_responses` for the assessment, filtering those with successful validation statuses.

**Validation Status Handling:**
- **"Passed"**: Indicator met all compliance criteria
- **"Considered"**: Indicator met compliance criteria with grace period or alternative evidence acceptance (functionally equivalent to "Passed")
- **"Conditional"**: Minor issues to resolve (treated as successful for classification)
- **"Failed"**: Indicator did not meet compliance criteria
- **"Not Applicable"**: Indicator does not apply to this barangay

For classification purposes, indicators with **"Passed"**, **"Considered"**, or **"Conditional"** statuses are counted as successful. Only **"Failed"** status prevents an area from passing.

**2.3** The algorithm must identify which governance areas have passed based on the following logic:

- For each of the six governance areas, retrieve all indicators within that area.
- An area is considered **"Passed"** only if **ALL** indicators within that area have a `validation_status` of `Pass`, `Considered`, or `Conditional` (100% compliance within the area).
- If even one indicator within an area has a status of `Fail`, that entire area is marked as **"Failed"**.
- Indicators marked as `Not Applicable` should be excluded from the calculation for that area.

**2.4** The algorithm must apply the "3+1" SGLGB rule:

- A barangay **PASSES** the SGLGB if:
  - All three (3) Core governance areas are marked as "Passed" **AND**
  - At least one (1) Essential governance area is marked as "Passed"
- A barangay **FAILS** the SGLGB if:
  - Any one of the three Core areas is failed, **OR**
  - All three Essential areas are failed.

**2.5** The algorithm must store the results:

- Write the overall `final_compliance_status` (PASSED or FAILED) to the `assessments` table.
- Write the individual area results as a JSONB object to the `area_results` column.

**2.6** The algorithm must handle edge cases:

- If an area has zero indicators marked as "Pass" or "Fail", it should be treated as "Failed".
- All calculations must complete within 5 seconds to ensure real-time user experience.

#### 4.3. Display of Compliance Status

**3.1** The MLGOO-DILG dashboard must display a prominent badge showing the `final_compliance_status` (PASSED/FAILED) next to each barangay's name in the assessment list.

**3.2** The badge must use distinct visual styles:

- Green color scheme with "PASSED" text for passed assessments.
- Red color scheme with "FAILED" text for failed assessments.

**3.3** The badge must be clickable and navigate to the detailed assessment report page.

**3.4** The detailed report page must display the `area_results` JSON in a user-friendly format, showing:

- The name of each governance area.
- The pass/fail status for each area in a tabular or grid layout.
- A visual indicator (icon or color) for each area's status.

#### 4.4. Gemini API Integration

**4.1** The backend must integrate with the Google Gemini API to generate recommendations and insights.

**4.2** A new service module must be created at `apps/api/app/services/intelligence_service.py` to handle:

- Building the structured prompt to send to Gemini API.
- Making the API call and handling responses.
- Parsing and validating the returned JSON structure.
- Error handling for API failures and timeouts.

**4.3** The Gemini API input must include:

- Barangay name.
- Performance year.
- List of **FAILED** indicators (indicator names, codes, and their corresponding governance areas).
- The assessor's feedback comment for each failed indicator.

**4.4** The Gemini API must return a structured JSON object with exactly three keys:

- `summary`: A single, concise paragraph (2-4 sentences) describing the barangay's primary governance weaknesses.
- `recommendations`: An array of 3-5 specific, actionable recommendations in bullet-point format.
- `capacity_development_needs`: An array of specific training programs or topics that directly address the identified gaps (e.g., "Budget Preparation Workshop", "Disaster Risk Reduction Planning Seminar").

**4.5** The Gemini API integration must run on-demand:

- A "Generate AI-Powered Insights" button must be visible on the detailed assessment report page.
- This button must only be visible to users with `MLGOO_DILG` or `SUPERADMIN` roles.
- The button must only be enabled if the assessment has a status of `Validated`.

**4.6** The backend must cache Gemini API results:

- Check if `ai_recommendations` already contains data before making an API call.
- If data exists, return the stored data immediately.
- Only call the Gemini API if `ai_recommendations` is `None` or empty.

**4.7** The frontend must handle API errors gracefully:

- Display a user-friendly error message: "Could not generate AI insights at this time. Please try again later."
- Enable the "Generate AI-Powered Insights" button again after a short delay (5-10 seconds).
- Never show a broken UI or stack trace to the user.

**4.8** The generated insights must be displayed in a dedicated section on the assessment report page, showing:

- The summary paragraph at the top.
- The recommendations as a bulleted list in the middle.
- The capacity development needs as a separate bulleted list at the bottom.

**4.9** The Gemini API response must be stored in the `ai_recommendations` column of the `assessments` table immediately after a successful API call.

#### 4.5. API Endpoints

**5.1** A new endpoint must be created:

- `POST /api/v1/assessments/{assessment_id}/classify`: Triggers the classification algorithm manually (for testing) or as part of the finalization process.

**5.2** A new endpoint must be created:

- `POST /api/v1/assessments/{assessment_id}/generate-insights`: Triggers the Gemini API call to generate insights.

**5.3** Both endpoints must:

- Require authentication (only `MLGOO_DILG` and `SUPERADMIN` roles).
- Return a 404 if the assessment does not exist.
- Return a 400 if the assessment is not in `Validated` status.
- Return appropriate error messages and status codes.

### 5. Non-Goals (Out of Scope)

- **User-facing analytics dashboards:** The higher-level analytics and reporting features are part of Epic 5 (MLGOO Dashboard & Analytics).
- **Real-time notifications:** While results are calculated instantly, push notifications to users about status changes are out of scope.
- **Historical trend analysis:** While data is stored for this purpose, tools to analyze trends over multiple years are out of scope.
- **Custom AI prompts:** Users cannot modify the structure or content of prompts sent to Gemini API.
- **Multi-language support:** Gemini responses will be generated in English only.
- **Integration with other AI services:** Only Google Gemini API will be integrated.
- **Batch processing of multiple assessments:** Each assessment is processed individually.
- **Export of AI recommendations to external formats:** Insights will only be viewable within the application (export functionality is out of scope).

### 6. Design & UX Considerations

- **Visual Hierarchy:** The compliance status badge must be prominently displayed and immediately visible on the dashboard.
- **Loading States:** The "Generate AI-Powered Insights" button must show a loading spinner while the Gemini API call is in progress.
- **Error States:** All error messages must be clear, user-friendly, and actionable.
- **Data Formatting:** The AI recommendations section must use consistent formatting with proper typography and spacing.
- **Accessibility:** All status indicators and recommendations must be accessible via screen readers and keyboard navigation.

### 7. Technical Considerations

**Reference Documentation:**

For complete validation status specifications, MOV checklist validation patterns, and grace period handling that determine "Considered" status, see:
**📄 [Indicator Builder Specification v1.4](/docs/indicator-builder-specification.md)**

This specification defines:
- Complete validation status types (Passed, Considered, Failed, Not Applicable, Pending)
- Grace period validation logic that produces "Considered" status
- MOV checklist validation patterns used by Assessors/Validators
- Alternative evidence acceptance that results in "Considered" status
- Database schema for validation statuses

**Key Alignment Note**: The "Considered" validation status (introduced for grace period compliance and alternative evidence) is functionally equivalent to "Passed" for the purposes of the 3+1 classification algorithm. Both indicate successful indicator compliance.

---

- **Background Processing:** The classification algorithm must run as a synchronous operation during the finalization process. It should not block the user interface for more than 5 seconds.
- **Celery Task:** Consider implementing the Gemini API call as a Celery background task if API response times exceed 10 seconds to prevent frontend timeouts.
- **API Configuration:** Gemini API key must be stored in environment variables and never committed to version control.
- **Rate Limiting:** Implement rate limiting on the Gemini API endpoint to prevent abuse and manage costs.
- **Cost Management:** The on-demand pattern and caching mechanism are critical for controlling API costs.
- **Testing:** Unit tests must verify the correctness of the "3+1" logic across all possible combinations of passed/failed areas.
- **Migration Rollback:** The database migration must be reversible to allow rollback if issues occur.

### 8. Success Metrics

- **Algorithm Accuracy:** The Classification Algorithm correctly determines the SGLGB Compliance Status with 100% accuracy when tested against a manual calculation on a set of 10+ test assessments with various pass/fail combinations.
- **API Integration Success:** The Gemini API successfully generates and returns a well-structured JSON object with all three required keys (`summary`, `recommendations`, `capacity_development_needs`) for 95% of API calls.
- **Performance:** The entire process from finalization to compliance status determination completes within 5 seconds for 99% of assessments.
- **User Adoption:** 80% of MLGOO-DILG users generate AI insights for at least one assessment within the first week of the feature being deployed.
- **Data Persistence:** Both compliance status and AI recommendations are correctly stored in the database and persist across application restarts.
- **Error Handling:** Zero frontend crashes occur when the Gemini API fails or times out.

### 9. Open Questions

- Should the Gemini API have a timeout limit (e.g., 30 seconds), and what should happen if it times out?
- Should the compliance status badge be clickable to show a brief explanation of the "3+1" rule in a tooltip or modal?
- Should the system support re-running the classification algorithm for an assessment that has already been validated (in case of data corrections)?
- What level of detail should be included in the prompt sent to Gemini (e.g., should it include specific indicator descriptions or just names and assessment results)?
- Should there be an option to regenerate AI insights with a different prompt or refresh the recommendations periodically?
