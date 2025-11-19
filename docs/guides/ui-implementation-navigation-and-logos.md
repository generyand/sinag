# Implementation: Indicator Navigation & Governance Area Logos

## Overview

This document describes the implementation of two new UX features for the BLGU assessments interface:

1. **Next/Previous Indicator Navigation**: Sequential navigation controls for moving between indicators
2. **Governance Area Logos**: Official DILG logos displayed in tree navigation

## Feature 1: Next/Previous Indicator Navigation

### Purpose

Provides sequential navigation through all leaf indicators in the assessment, enabling users to move through the assessment linearly without returning to the tree navigation.

### Components

#### 1. useIndicatorNavigation Hook

**Location**: `/apps/web/src/hooks/useIndicatorNavigation.ts`

**Purpose**: Builds a flat list of all leaf indicators in assessment order and provides navigation state/functions.

**Key Functions**:
- `flatIndicators`: Computed list of all leaf indicators across all governance areas
- `current`: Current indicator with position and area code
- `previous`/`next`: Previous and next indicators in sequence
- `navigatePrevious()`/`navigateNext()`: Navigation callbacks
- `hasPrevious`/`hasNext`: Boolean flags for button states

**Usage**:
```typescript
const navigation = useIndicatorNavigation(
  assessment,
  currentIndicatorId,
  onNavigate // Callback to update URL and tree state
);
```

#### 2. IndicatorNavigationFooter Component

**Location**: `/apps/web/src/components/features/assessments/IndicatorNavigationFooter.tsx`

**Purpose**: Sticky footer UI with navigation controls.

**Features**:
- **Previous Button**: Ghost style with ChevronLeft icon
- **Next Button**: Primary style with yellow background (cityscape-yellow) and ChevronRight icon
- **Position Label**: Shows indicator code + position (e.g., "SA 3.2.2 (32/45)")
- **Keyboard Shortcuts**:
  - `Alt+Left`: Previous indicator
  - `Alt+Right`: Next indicator
- **Responsive Design**:
  - Desktop: Full text labels + full position text
  - Mobile: Icon-only buttons + abbreviated position (e.g., "32/45")

**Styling**:
- Height: 64px
- Backdrop blur effect: `bg-[var(--card)]/80 backdrop-blur-md`
- Shadow: `shadow-lg`
- Sticky positioning at bottom

**Props**:
```typescript
interface IndicatorNavigationFooterProps {
  currentCode?: string;        // Indicator code (e.g., "SA 3.2.2")
  currentPosition: number;      // 1-indexed position
  totalIndicators: number;      // Total count
  hasPrevious: boolean;         // Enable previous button
  hasNext: boolean;             // Enable next button
  onPrevious: () => void;       // Previous callback
  onNext: () => void;           // Next callback
  isLocked?: boolean;           // Disable when assessment locked
}
```

### Integration

**Updated Files**:
1. `AssessmentContentPanel.tsx`:
   - Added navigation hook integration
   - Changed layout from single scrollable div to flex column with footer
   - Added padding-bottom to form content to prevent overlap

2. `page.tsx`:
   - Passed `handleIndicatorSelect` to AssessmentContentPanel as `onIndicatorSelect` prop

### Navigation Flow

1. User clicks "Next" or "Previous" button (or uses keyboard shortcut)
2. `useIndicatorNavigation` hook calls `onNavigate(indicatorId)`
3. Parent component updates URL with `?indicator={id}` parameter
4. Tree state automatically expands to show selected indicator
5. Content panel displays the new indicator form

### Accessibility

- Proper ARIA labels on buttons (e.g., "Previous indicator (Alt+Left)")
- Keyboard shortcuts for power users
- Disabled state with proper opacity and cursor
- Minimum touch target size (44px) for mobile
- Focus-visible ring for keyboard navigation

## Feature 2: Governance Area Logos

### Purpose

Display official DILG governance area logos in the tree navigation to improve visual identification and area recognition.

### Implementation

#### 1. Logo Utility

**Location**: `/apps/web/src/lib/governance-area-logos.ts`

**Purpose**: Centralized mapping of governance area codes to logo paths.

**Logo Mapping**:
```typescript
export const GOVERNANCE_AREA_LOGOS: Record<string, string> = {
  FI: "/Assessment_Areas/financialAdmin.png",
  DI: "/Assessment_Areas/disasterPreparedness.png",
  SA: "/Assessment_Areas/safetyPeaceAndOrder.png",
  SO: "/Assessment_Areas/socialProtectAndSensitivity.png",
  BU: "/Assessment_Areas/businessFriendliness.png",
  EN: "/Assessment_Areas/environmentalManagement.png",
};
```

**Helper Functions**:
- `getGovernanceAreaLogo(code: string)`: Returns logo path or null
- `hasGovernanceAreaLogo(code: string)`: Check if logo exists
- `getAvailableLogoCodes()`: Get all codes with logos

#### 2. Tree Node Update

**Location**: `/apps/web/src/components/features/assessments/tree-navigation/AssessmentTreeNode.tsx`

**Changes**:
1. Import Next.js `Image` component for optimization
2. Import Folder icon as fallback
3. Update `getStatusIcon()` for area nodes:
   - If logo exists: Display 24x24px logo with hover scale effect
   - Show completion badge overlay if 100% complete
   - Fallback to folder icon or progress indicator if no logo

**Logo Display**:
```typescript
<div className="relative h-6 w-6 flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
  <Image
    src={logoPath}
    alt={`${area.name} icon`}
    width={24}
    height={24}
    className="object-contain"
    priority
  />
  {/* Completion badge overlay */}
  {progress && progress.percentage === 100 && (
    <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-[var(--card)]">
      <CheckCircle className="h-full w-full text-white" />
    </div>
  )}
</div>
```

### Logo Assets

**Location**: `/apps/web/public/Assessment_Areas/`

**Available Files**:
- `financialAdmin.png`
- `disasterPreparedness.png`
- `safetyPeaceAndOrder.png`
- `socialProtectAndSensitivity.png`
- `businessFriendliness.png`
- `environmentalManagement.png`

### Visual Effects

1. **Hover Effect**: Logo scales to 1.05x on hover (200ms transition)
2. **Completion Badge**: Green circular badge with checkmark overlay for 100% complete areas
3. **Fallback Behavior**: If logo missing, shows folder icon instead

## Testing Checklist

### Navigation Testing

- [ ] Previous button navigates to correct previous indicator
- [ ] Next button navigates to correct next indicator
- [ ] Previous disabled on first indicator
- [ ] Next disabled on last indicator
- [ ] Position label shows correct code and position
- [ ] Keyboard shortcut Alt+Left works
- [ ] Keyboard shortcut Alt+Right works
- [ ] Navigation updates URL parameter
- [ ] Tree state expands to show navigated indicator
- [ ] Navigation disabled when assessment locked
- [ ] Mobile: Buttons show icon-only
- [ ] Mobile: Position label abbreviated
- [ ] Desktop: Full text labels shown

### Logo Testing

- [ ] Logos display correctly for all 6 governance areas
- [ ] Logos are 24x24px size
- [ ] Hover effect scales logo smoothly
- [ ] Completion badge shows on 100% complete areas
- [ ] Fallback icon shows if logo missing
- [ ] Logos load quickly (Next.js optimization)
- [ ] Logos are visually distinct and recognizable

### Accessibility Testing

- [ ] Screen reader announces button labels correctly
- [ ] Keyboard focus visible on buttons
- [ ] Disabled states properly announced
- [ ] Alt text provided for logos
- [ ] Minimum touch target size maintained
- [ ] Color contrast meets WCAG AA standards

## File Changes Summary

### New Files Created
1. `/apps/web/src/lib/governance-area-logos.ts` - Logo mapping utility
2. `/apps/web/src/hooks/useIndicatorNavigation.ts` - Navigation hook
3. `/apps/web/src/components/features/assessments/IndicatorNavigationFooter.tsx` - Footer component

### Modified Files
1. `/apps/web/src/components/features/assessments/tree-navigation/AssessmentTreeNode.tsx` - Logo display
2. `/apps/web/src/components/features/assessments/AssessmentContentPanel.tsx` - Navigation integration
3. `/apps/web/src/app/(app)/blgu/assessments/page.tsx` - Props passing
4. `/apps/web/src/components/features/assessments/index.ts` - Export updates
5. `/apps/web/src/hooks/index.ts` - Export updates

## Future Enhancements

### Navigation
- Auto-save current indicator before navigating
- Progress bar showing overall completion
- Jump-to-indicator dropdown for quick access
- Swipe gestures for mobile navigation

### Logos
- Display larger logo (32x32px) in content panel header
- Animated logo transitions
- Logo loading states and skeleton screens
- Admin UI for uploading/managing logos

## Technical Notes

### Performance Considerations
1. **Logo Loading**: Next.js Image component provides automatic optimization
2. **Navigation Hook**: Uses useMemo to prevent unnecessary recalculations
3. **Keyboard Events**: Properly cleaned up on unmount to prevent memory leaks
4. **Sticky Footer**: CSS-only positioning for smooth scrolling performance

### Browser Compatibility
- Backdrop blur: Modern browsers (Chrome 76+, Firefox 103+, Safari 9+)
- Keyboard shortcuts: All modern browsers
- Next.js Image: Requires Next.js 13+ (using App Router)

### Known Limitations
1. Navigation only works with leaf indicators (no parent nodes)
2. Logos must be pre-loaded in public folder (no dynamic upload)
3. Keyboard shortcuts may conflict with browser shortcuts (use Alt instead of Ctrl)
4. Mobile drawer does not include navigation footer (only main content panel)

## Related Documentation
- `/docs/architecture/frontend-patterns.md` - Component patterns
- `/docs/guides/adding-features.md` - Feature development guide
- `README.md` - Project setup and development commands
