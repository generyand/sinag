# BLGU Onboarding Tour - Implementation Plan

## Overview

An interactive onboarding tour for BLGU users to guide them through the assessment platform. The
tour will use **react-joyride** with spotlight effects, support multiple languages (English,
Filipino, Cebuano), and adapt dynamically based on assessment status.

## Key Decisions Summary

| Decision              | Choice                                                        |
| --------------------- | ------------------------------------------------------------- |
| Library               | react-joyride                                                 |
| Trigger               | Auto-start for new users + Help button to restart             |
| Scope                 | Full journey (Dashboard, Assessments, Indicator Form, Rework) |
| Mobile handling       | Same tour, responsive positioning                             |
| State storage         | Backend (user preferences)                                    |
| Contextual adaptation | Yes - dynamic based on assessment status                      |
| Visual style          | Spotlight focus (dim background, spotlight on target)         |
| Localization          | Multi-language (en, fil, ceb)                                 |
| Cross-page navigation | Auto-navigate to next page on "Next" click                    |
| Help button placement | Page-specific (in each BLGU page header)                      |
| Skip behavior         | Allow skipping steps with gentle encouragement to continue    |
| Analytics             | None                                                          |

---

## Architecture

### 1. Tour Provider & Context

```
apps/web/src/
├── contexts/
│   └── tour-context.tsx          # Tour state management
├── components/
│   └── tour/
│       ├── TourProvider.tsx      # Wraps app with joyride + context
│       ├── TourStep.tsx          # Individual step component
│       ├── TourTooltip.tsx       # Custom tooltip styling
│       ├── TourHelpButton.tsx    # Help button for page headers
│       └── tours/
│           ├── dashboard-tour.ts      # Dashboard tour steps
│           ├── assessments-tour.ts    # Assessments page steps
│           ├── indicator-form-tour.ts # Indicator form steps
│           └── rework-tour.ts         # Rework workflow steps
├── hooks/
│   └── use-tour.ts               # Hook to access tour context
└── lib/
    └── tour/
        ├── tour-config.ts        # Global tour configuration
        └── tour-translations.ts  # Multi-language step content
```

### 2. State Management

```typescript
interface TourState {
  // Which tours have been completed
  completedTours: {
    dashboard: boolean;
    assessments: boolean;
    indicatorForm: boolean;
    rework: boolean;
  };
  // Current active tour (if any)
  activeTour: "dashboard" | "assessments" | "indicatorForm" | "rework" | null;
  // Current step index within active tour
  currentStep: number;
  // User's preferred language for tour content
  tourLanguage: "en" | "fil" | "ceb";
  // Whether user has seen any tour (for first-time detection)
  hasSeenTour: boolean;
}
```

### 3. Backend Integration

#### New API Endpoints

```python
# GET /api/v1/users/me/preferences
# Returns user preferences including tour state

# PATCH /api/v1/users/me/preferences
# Updates tour completion status
{
  "tour_completed": {
    "dashboard": true,
    "assessments": false,
    ...
  },
  "tour_language": "en"
}
```

#### Database Schema Addition

```sql
-- Add to users table or create user_preferences table
ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}';
```

---

## Tour Content Structure

### Page 1: Dashboard Tour (5-7 steps)

| Step | Target Element        | Title (en)                     | Description                                                  |
| ---- | --------------------- | ------------------------------ | ------------------------------------------------------------ |
| 1    | (welcome, no target)  | Welcome to SINAG!              | Brief intro to the assessment platform                       |
| 2    | `.phase-timeline`     | Your Assessment Journey        | Explains 3 phases: Initial Assessment → Validation → Verdict |
| 3    | `.phase-1-section`    | Phase 1: Initial Assessment    | Where you fill out indicators and upload MOVs                |
| 4    | `.completion-metrics` | Track Your Progress            | Shows completed/total indicators                             |
| 5    | `.year-selector`      | Assessment Years               | Switch between years if you have multiple assessments        |
| 6    | `.submit-button`      | Ready to Submit?               | Submit when all indicators are complete                      |
| 7    | (transition step)     | Let's Fill Out Your Assessment | CTA to navigate to Assessments page                          |

### Page 2: Assessments Tour (6-8 steps)

| Step | Target Element           | Title (en)                  | Description                                          |
| ---- | ------------------------ | --------------------------- | ---------------------------------------------------- |
| 1    | `.assessment-header`     | Assessment Overview         | Your progress at a glance                            |
| 2    | `.tree-navigator`        | Browse Indicators           | Navigate governance areas and indicators             |
| 3    | `.indicator-status-icon` | Completion Status           | Icons show complete (✓), incomplete (○), in-progress |
| 4    | `.content-panel`         | Indicator Details           | This is where you answer questions                   |
| 5    | `.mobile-nav-button`     | Mobile Navigation (mobile)  | Tap here to see all indicators                       |
| 6    | (transition step)        | Let's Fill Out an Indicator | CTA to navigate to an indicator form                 |

### Page 3: Indicator Form Tour (5-6 steps)

| Step | Target Element     | Title (en)       | Description                                 |
| ---- | ------------------ | ---------------- | ------------------------------------------- |
| 1    | `.breadcrumb`      | Where You Are    | Navigation breadcrumb to go back            |
| 2    | `.technical-notes` | DILG Guidelines  | Official guidance for this indicator        |
| 3    | `.form-fields`     | Answer Questions | Fill out the required information           |
| 4    | `.mov-upload`      | Upload Evidence  | Attach documents as Means of Verification   |
| 5    | `.save-button`     | Save Your Work   | Don't forget to save!                       |
| 6    | (completion step)  | You're Ready!    | Return to dashboard to submit when complete |

### Page 4: Rework Tour (4-5 steps) - Conditional

_Only shown when assessment status is REWORK_

| Step | Target Element            | Title (en)        | Description                                 |
| ---- | ------------------------- | ----------------- | ------------------------------------------- |
| 1    | `.rework-alert`           | Feedback Received | Assessor has reviewed your submission       |
| 2    | `.ai-summary-panel`       | AI Summary        | Quick overview of what needs fixing         |
| 3    | `.rework-indicators-list` | Indicators to Fix | These specific indicators need attention    |
| 4    | `.priority-actions`       | Priority Actions  | Start with these items first                |
| 5    | `.start-fixing-button`    | Start Fixing      | Jump to the first indicator that needs work |

---

## Implementation Tasks

### Phase 1: Foundation (Backend + Core Setup)

1. **Backend: User Preferences API**
   - Add `preferences` JSONB column to users table (migration)
   - Create GET/PATCH endpoints for `/api/v1/users/me/preferences`
   - Define Pydantic schemas for preferences structure
   - Run `pnpm generate-types`

2. **Frontend: Install react-joyride**

   ```bash
   cd apps/web && pnpm add react-joyride
   ```

3. **Frontend: Tour Context & Provider**
   - Create `TourContext` with state management
   - Create `TourProvider` wrapper component
   - Create `useTour()` hook

### Phase 2: Tour Infrastructure

4. **Custom Tooltip Component**
   - Match shadcn/ui design system
   - Support multi-language content
   - Include progress indicator (Step X of Y)
   - Skip/Next/Back buttons
   - Close (X) button

5. **Tour Configuration**
   - Define step targeting selectors
   - Set up spotlight and overlay styling
   - Configure scroll behavior
   - Handle responsive positioning

6. **Translation System**
   - Create translation files for en/fil/ceb
   - Hook into existing language selector pattern
   - Dynamic content loading based on preference

### Phase 3: Tour Content

7. **Dashboard Tour Steps**
   - Add `data-tour` attributes to target elements
   - Create step definitions with translations
   - Handle dynamic content (status-based variations)

8. **Assessments Page Tour Steps**
   - Add target attributes
   - Desktop vs mobile step variations
   - Tree navigator highlighting

9. **Indicator Form Tour Steps**
   - Form field targeting
   - MOV upload section
   - Save button emphasis

10. **Rework Tour Steps (Conditional)**
    - Only render when status === 'REWORK'
    - AI summary panel targeting
    - Rework-specific guidance

### Phase 4: Integration & Polish

11. **Auto-Navigation Between Pages**
    - Implement router.push on cross-page steps
    - Preserve tour state during navigation
    - Resume tour on page load

12. **Help Button Component**
    - Create `TourHelpButton` component
    - Add to BLGU page headers
    - Style to match existing UI

13. **First-Time User Detection**
    - Check `hasSeenTour` on login
    - Auto-start dashboard tour for new users
    - Save completion state to backend

14. **Mobile Responsiveness**
    - Test all steps on mobile viewports
    - Adjust tooltip positioning
    - Handle mobile-specific elements (FAB, drawer)

### Phase 5: Testing & Refinement

15. **Manual Testing**
    - Test full tour flow on desktop
    - Test full tour flow on mobile
    - Test all three languages
    - Test status-based variations (DRAFT, REWORK, etc.)

16. **Edge Cases**
    - Tour interrupted (user navigates away)
    - Page elements not rendered yet
    - Multiple assessments/years
    - Error states

---

## Technical Specifications

### react-joyride Configuration

```typescript
const joyrideOptions: Props = {
  continuous: true,
  showProgress: true,
  showSkipButton: true,
  spotlightClicks: false,
  disableOverlayClose: true,
  floaterProps: {
    disableAnimation: false,
  },
  styles: {
    options: {
      primaryColor: "#2563eb", // Match your primary color
      zIndex: 10000,
    },
    spotlight: {
      borderRadius: 8,
    },
  },
};
```

### Target Element Strategy

Add `data-tour="step-name"` attributes to elements:

```tsx
<div data-tour="phase-timeline" className="...">
  <PhaseTimeline />
</div>
```

Then target in steps:

```typescript
{
  target: '[data-tour="phase-timeline"]',
  content: '...',
  placement: 'right',
}
```

### Cross-Page Navigation

```typescript
const handleStepChange = (data: CallBackProps) => {
  if (data.action === "next" && data.step.data?.navigateTo) {
    router.push(data.step.data.navigateTo);
    // Tour will resume on the new page via useEffect
  }
};
```

---

## File Changes Summary

### New Files

```
apps/web/src/
├── contexts/tour-context.tsx
├── components/tour/
│   ├── TourProvider.tsx
│   ├── TourTooltip.tsx
│   ├── TourHelpButton.tsx
│   └── tours/
│       ├── dashboard-tour.ts
│       ├── assessments-tour.ts
│       ├── indicator-form-tour.ts
│       └── rework-tour.ts
├── hooks/use-tour.ts
└── lib/tour/
    ├── tour-config.ts
    └── tour-translations.ts

apps/api/
├── app/schemas/user_preferences.py
├── app/services/user_preferences_service.py
└── app/api/v1/user_preferences.py

alembic/versions/
└── xxxx_add_user_preferences.py
```

### Modified Files

```
apps/web/src/
├── app/(app)/layout.tsx           # Wrap with TourProvider
├── app/(app)/blgu/dashboard/
│   └── page.tsx                   # Add data-tour attributes
├── app/(app)/blgu/assessments/
│   └── page.tsx                   # Add data-tour attributes
├── components/features/blgu/
│   ├── dashboard/                 # Add data-tour attributes
│   ├── assessments/               # Add data-tour attributes
│   └── ...
```

---

## Estimated Effort

| Phase | Description            | Complexity |
| ----- | ---------------------- | ---------- |
| 1     | Backend + Core Setup   | Medium     |
| 2     | Tour Infrastructure    | Medium     |
| 3     | Tour Content (4 pages) | Medium     |
| 4     | Integration & Polish   | Medium     |
| 5     | Testing & Refinement   | Low        |

---

## Open Questions / Decisions Needed

1. **Translation Content**: Who will provide Filipino and Cebuano translations for tour steps?
2. **Design Review**: Should we create mockups for the custom tooltip before implementation?
3. **Rollout Strategy**: Should we feature-flag the tour for gradual rollout?
4. **User Testing**: Do we want to conduct user testing before full release?

---

## Success Criteria

- [ ] New BLGU users see the tour automatically on first login
- [ ] Tour completes successfully across all 4 pages
- [ ] Help button allows users to restart tour at any time
- [ ] Tour adapts based on assessment status (shows rework tour only when relevant)
- [ ] All three languages display correctly
- [ ] Tour works smoothly on both desktop and mobile
- [ ] Tour state persists across sessions via backend
