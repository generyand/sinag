# Tree Hierarchical Navigation - BLGU Assessments Implementation

**Implementation Date**: 2025-11-12 **Feature**: Tree-based navigation for BLGU assessment
indicators **Location**: `/blgu/assessments`

## Overview

Implemented a comprehensive tree hierarchical navigation layout for the BLGU assessments page,
transforming the previous tab-based interface into a split-panel design with a tree navigator on the
left and content panel on the right.

## File Structure

### New Components Created

```
apps/web/src/components/features/assessments/
├── tree-navigation/
│   ├── TreeNavigator.tsx              # Main tree component
│   ├── AssessmentTreeNode.tsx         # Individual tree node (area/indicator)
│   ├── TreeHeader.tsx                 # Sticky header with progress
│   ├── MobileTreeDrawer.tsx           # Bottom sheet drawer for mobile
│   ├── MobileNavButton.tsx            # FAB with progress ring
│   ├── tree-utils.ts                  # Utility functions
│   └── index.ts                       # Barrel exports
├── AssessmentContentPanel.tsx         # Right panel content wrapper
└── index.ts                           # Updated with new exports
```

### Updated Components

- **`apps/web/src/app/(app)/blgu/assessments/page.tsx`**: Main page component with split-panel
  layout

## Features Implemented

### 1. Desktop Layout (≥1024px)

- **Split-Panel Design**:
  - Left sidebar: 320px (lg), 384px (xl) - Fixed width tree navigator
  - Right panel: Flexible width content area
  - 1px border separation with `var(--border)` color

- **Tree Navigator**:
  - Sticky header with overall progress (circular progress indicator)
  - Hierarchical tree: Governance Areas → Indicators
  - Expand/collapse functionality with chevron icons
  - Progress indicators for each area (mini circular progress)
  - Status icons for indicators (Circle, CheckCircle, AlertCircle)
  - Active state highlighting with yellow accent border
  - Hover states with subtle background change
  - Custom scrollbar styling (8px width, yellow on hover)

- **Tree Node Specifications**:
  - Areas: 48px height, expandable/collapsible
  - Indicators: 40px height, clickable to load content
  - Active indicator: `bg-[var(--cityscape-yellow)]/10` with 3px left border
  - Minimum 44px touch target for accessibility
  - Proper indentation: 24px for indicators

### 2. Mobile Layout (<1024px)

- **Bottom Sheet Drawer**:
  - Slides up from bottom when FAB is clicked
  - Max height: 80vh
  - Rounded top corners (rounded-t-2xl)
  - Backdrop overlay (black/50)
  - Handle bar for visual affordance
  - Close button in header
  - Auto-closes on indicator selection
  - Escape key support

- **Floating Action Button (FAB)**:
  - Fixed position: bottom-right (24px from edges)
  - 56px diameter circular button
  - Yellow background (`var(--cityscape-yellow)`)
  - Progress ring around button (white stroke)
  - Progress badge (small white circle with percentage)
  - Menu icon in center
  - Shadow and hover effects

### 3. Interaction Patterns

- **Indicator Selection**:
  - Click indicator → Load form in right panel
  - Update URL: `/blgu/assessments?indicator={id}`
  - Auto-scroll to selected indicator (future enhancement)
  - Focus management for accessibility

- **Area Expansion**:
  - Click area → Toggle expand/collapse
  - State persisted in sessionStorage
  - Auto-expand first incomplete area on initial load
  - Preserve state across page refreshes

- **URL Integration**:
  - Query parameter: `?indicator={id}`
  - Deep linking support
  - Invalid indicator IDs redirect to base URL
  - Browser back/forward navigation support

### 4. Progress Calculation

```typescript
// Overall progress
completedIndicators / totalIndicators * 100

// Per-area progress
areaCompletedIndicators / areaIndicators.length * 100

// Indicator status logic
- Not started: No compliance answer
- In progress: Has compliance answer but missing required MOVs
- Completed: Has compliance answer + all required MOVs (if yes)
- Needs rework: Has assessor feedback comments
```

### 5. Accessibility (WCAG 2.1 AA)

- **ARIA Attributes**:
  - `role="tree"` on navigator
  - `role="treeitem"` on each node
  - `aria-expanded` for expandable areas
  - `aria-selected` for active indicator
  - `aria-level` for hierarchy depth
  - `aria-label` descriptive labels

- **Keyboard Navigation**:
  - Tab: Focus navigation
  - Enter/Space: Activate node
  - Arrow keys: Navigate tree (TODO in TreeNavigator.tsx)
  - Escape: Close mobile drawer

- **Touch Targets**:
  - Minimum 44px height for all interactive elements
  - Adequate spacing between clickable areas

- **Visual Indicators**:
  - Focus visible rings (2px yellow)
  - Clear active states
  - Status icons with text alternatives

### 6. Visual Design

- **Colors**:
  - Active state: `var(--cityscape-yellow)/10` background, `var(--cityscape-yellow)` border
  - Hover state: `var(--hover)` background
  - Borders: `var(--border)`
  - Text: `var(--foreground)`, `var(--text-secondary)`

- **Typography**:
  - Area codes: 14px semibold
  - Indicator codes: 12px monospace
  - Indicator names: 14px normal (active: medium weight)

- **Icons** (lucide-react):
  - ChevronRight/ChevronDown: Expand/collapse
  - Circle: Not started
  - CheckCircle: Complete
  - AlertCircle: Needs rework
  - Target: Progress header
  - Menu: Mobile nav button

### 7. State Management

```typescript
// Local state
const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);
const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
const [expandedAreas, setExpandedAreas] = useState<Set<string>>(() => {
  // Load from sessionStorage or auto-expand first incomplete
  return loadExpandedState(assessmentId) || getInitialExpandedAreas(assessment);
});

// Sync with URL
useEffect(() => {
  const indicatorParam = searchParams.get("indicator");
  if (indicatorParam) {
    setSelectedIndicatorId(indicatorParam);
  }
}, [searchParams]);
```

### 8. Responsive Breakpoints

```css
/* Mobile */
< 768px: Bottom sheet drawer + FAB

/* Tablet */
768px - 1023px: Bottom sheet drawer + FAB

/* Desktop */
≥ 1024px: Split-panel layout
  - lg (1024px): 320px sidebar
  - xl (1280px): 384px sidebar
```

## Utility Functions

### `tree-utils.ts`

- **`calculateAreaProgress(area)`**: Calculate area completion metrics
- **`getAllLeafIndicators(indicators)`**: Flatten indicator tree to leaf nodes only
- **`findIndicatorById(assessment, id)`**: Find indicator and parent area by ID
- **`getParentAreaId(assessment, id)`**: Get area ID for an indicator
- **`getFirstIncompleteIndicator(assessment)`**: Find first incomplete indicator
- **`loadExpandedState(assessmentId)`**: Load expanded areas from sessionStorage
- **`saveExpandedState(assessmentId, expanded)`**: Save expanded areas to sessionStorage
- **`getInitialExpandedAreas(assessment)`**: Auto-expand first incomplete area

## Integration with Existing Components

### Reused Components

- **`AssessmentHeader`**: Top header with assessment metadata
- **`AssessmentLockedBanner`**: Banner for locked assessments
- **`RecursiveIndicator`**: Existing indicator accordion for form rendering
- **`DynamicIndicatorForm`**: Form component for legacy indicators
- **`DynamicFormRenderer`**: Form component for Epic 3/4 indicators
- **`ReworkCommentsPanel`**: Panel for assessor feedback

### Preserved Functionality

- All existing form rendering logic
- Validation rules and progress calculation
- MOV upload and deletion
- Auto-save functionality
- Rework workflow
- Status management (Draft, Submitted, Validated, Needs Rework)

## Content Panel Features

### Empty State

When no indicator is selected:

- Centered message with icon
- Instructions to select an indicator
- Clean, minimal design

### Indicator View

When indicator is selected:

- Header card with:
  - Status icon (10px circle)
  - Indicator code badge
  - Status badge (colored)
  - Name (20px font, bold)
  - Description
- Rework comments panel (if applicable)
- Form content (accordion from IndicatorAccordion)

## Performance Considerations

1. **State Persistence**: sessionStorage for expanded state (lightweight)
2. **Conditional Rendering**: Mobile components only render on mobile
3. **Memoization**: Consider adding useMemo for expensive calculations
4. **Lazy Loading**: Forms only render when indicator is expanded
5. **Scroll Optimization**: Custom scrollbar with CSS (no JS)

## Future Enhancements

### Planned Features

1. **Arrow Key Navigation**: Implement full keyboard navigation in tree
2. **Auto-scroll**: Scroll selected indicator into view
3. **Search/Filter**: Add search box to filter indicators
4. **Drag-to-resize**: Resizable sidebar width
5. **Collapse All/Expand All**: Buttons in tree header
6. **Keyboard Shortcuts**: Global shortcuts (e.g., Cmd+K for search)
7. **Progress Animations**: Animate progress changes
8. **Breadcrumbs**: Show current location in content panel header

### Technical Debt

1. **TypeScript strictness**: Add stricter types for tree utilities
2. **Unit tests**: Add tests for tree components
3. **E2E tests**: Add Playwright tests for tree navigation
4. **Performance profiling**: Profile with large datasets (100+ indicators)
5. **Error boundaries**: Add error boundaries around tree components

## Testing Checklist

### Manual Testing

- [ ] Desktop: Tree navigation works correctly
- [ ] Desktop: Indicator selection updates content panel
- [ ] Desktop: URL updates on selection
- [ ] Desktop: Direct URL navigation works
- [ ] Desktop: Expand/collapse persists on refresh
- [ ] Desktop: Hover states work correctly
- [ ] Desktop: Active states highlight correctly
- [ ] Mobile: FAB displays with correct progress
- [ ] Mobile: Drawer opens and closes
- [ ] Mobile: Drawer closes on selection
- [ ] Mobile: Drawer closes on backdrop click
- [ ] Mobile: Drawer closes on Escape key
- [ ] Accessibility: Keyboard navigation (Tab, Enter, Space)
- [ ] Accessibility: Screen reader announces correctly
- [ ] Accessibility: Focus visible indicators
- [ ] Progress: Updates after form submission
- [ ] Progress: Area progress calculates correctly
- [ ] Empty state: Shows when no indicator selected
- [ ] Locked state: Respects assessment status

### Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Migration Notes

### Breaking Changes

None. This is a layout transformation, not a functionality change.

### Deployment Steps

1. Deploy code to staging
2. Verify all existing functionality works
3. Test on multiple devices and screen sizes
4. Get UX approval
5. Deploy to production
6. Monitor for errors in Sentry
7. Collect user feedback

### Rollback Plan

If issues arise:

1. Revert the main page component (`page.tsx`)
2. Assessment data and backend remain unchanged
3. No database migrations required
4. Tree components can be removed independently

## Technical Specifications

### Component Props

```typescript
// TreeNavigator
interface TreeNavigatorProps {
  assessment: Assessment;
  selectedIndicatorId: string | null;
  onIndicatorSelect: (indicatorId: string) => void;
}

// AssessmentTreeNode
interface AssessmentTreeNodeProps {
  type: "area" | "indicator";
  item: GovernanceArea | Indicator;
  isExpanded?: boolean;
  isSelected?: boolean;
  isActive?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  level?: number;
  progress?: { completed: number; total: number; percentage: number };
}

// AssessmentContentPanel
interface AssessmentContentPanelProps {
  assessment: Assessment;
  selectedIndicator: Indicator | null;
  isLocked: boolean;
  updateAssessmentData?: (updater: (data: Assessment) => Assessment) => void;
}

// MobileTreeDrawer
interface MobileTreeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment;
  selectedIndicatorId: string | null;
  onIndicatorSelect: (indicatorId: string) => void;
}

// MobileNavButton
interface MobileNavButtonProps {
  progress: number;
  onClick: () => void;
}
```

### Dependencies

No new dependencies added. All components use existing dependencies:

- React 19
- Next.js 15
- lucide-react (icons)
- Tailwind CSS
- Existing type definitions from `@/types/assessment`

## Known Issues

None at the time of implementation.

## References

- Design mockups: (Link to Figma/design files)
- PRD: `docs/prds/` (if applicable)
- Related tickets: (Link to issues/tickets)
- UX Consultation: 2025-11-12 (Designer Agent)

## Contributors

- Frontend Architect: Claude Code (Sonnet 4.5)
- Implementation Date: 2025-11-12
