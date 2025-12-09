# Phase 1 Testing Guide - Split-Pane Schema Configuration

**Date:** January 10, 2025 **Version:** 1.0 **Status:** Ready for Testing

---

## Test Environment Setup

### Prerequisites

1. ✅ All UI components installed (scroll-area, sheet)
2. ✅ Backend API running on `http://localhost:8000`
3. ✅ Frontend running on `http://localhost:3000`
4. ✅ User logged in with appropriate permissions

### Test Data Requirements

- At least one governance area with indicators
- Ideally 5-10 indicators in a hierarchical structure (parents and children)
- Mix of complete and incomplete schemas

---

## Test Scenarios

### Test 1: Split-Pane Layout on Desktop ✅

**Objective:** Verify split-pane layout renders correctly on desktop viewports

**Steps:**

1. Navigate to `/mlgoo/indicators/builder`
2. Create or load a draft with indicators
3. Click "Continue" to reach Step 3 (Configure Schemas)
4. Observe the layout

**Expected Results:**

- [ ] Left panel (tree navigator) is visible and takes ~300-350px width
- [ ] Right panel (schema editor) takes remaining space
- [ ] Border separator between panels is visible
- [ ] No horizontal scrollbar appears
- [ ] Layout is responsive at 1920x1080, 1366x768, 1024x768

**Pass Criteria:** All checkboxes checked

**Notes:** _Record any issues here_

---

### Test 2: Mobile Drawer Functionality ✅

**Objective:** Verify mobile drawer opens and closes correctly

**Steps:**

1. Resize browser window to mobile size (<768px) or use DevTools mobile emulation
2. Navigate to Step 3 (Configure Schemas)
3. Click the "Indicators (X/Y)" button in the header
4. Observe the drawer opening
5. Click an indicator in the drawer
6. Observe the drawer closing

**Expected Results:**

- [ ] On mobile, tree navigator is hidden by default
- [ ] "Indicators (X/Y)" button shows in header with current progress
- [ ] Clicking button opens Sheet drawer from left
- [ ] Drawer shows full tree navigator with search and filter
- [ ] Clicking an indicator closes the drawer automatically
- [ ] Schema editor shows in full width after drawer closes

**Pass Criteria:** All checkboxes checked

**Notes:** _Record any issues here_

---

### Test 3: Tree Navigator Display ✅

**Objective:** Verify tree navigator displays indicators hierarchically

**Steps:**

1. Navigate to Step 3 with a draft containing hierarchical indicators
2. Observe the tree structure in left panel

**Expected Results:**

- [ ] Indicators display in hierarchical tree structure
- [ ] Parent indicators show expand/collapse chevron icon
- [ ] Child indicators are indented correctly (16px per level)
- [ ] Indicator codes display correctly (1, 1.1, 1.1.1, 1.2, 2, etc.)
- [ ] Indicator names display next to codes
- [ ] Status icons display for each indicator (☑, ○, ⚠, ◉)
- [ ] Currently selected indicator has blue filled circle (◉)
- [ ] Tree scrolls smoothly when there are many indicators

**Pass Criteria:** All checkboxes checked

**Notes:** _Record any issues here_

---

### Test 4: Status Icons Update Real-Time ✅

**Objective:** Verify status icons update when schemas are modified

**Steps:**

1. Select an indicator with incomplete schemas (gray circle ○)
2. Switch to Form tab
3. Add at least one field to the form schema
4. Switch to Calculation tab
5. Add a formula (e.g., "field1 + field2")
6. Switch to Remark tab
7. Add remark text (e.g., "Test remark")
8. Observe status icon changes in tree navigator

**Expected Results:**

- [ ] Initially shows ○ (gray, incomplete)
- [ ] After completing form schema, form tab badge shows checkmark
- [ ] After completing calculation schema, calculation tab badge shows checkmark
- [ ] After completing remark schema, remark tab badge shows checkmark
- [ ] Tree navigator updates icon to ☑ (green, complete) when all three schemas done
- [ ] Status updates appear without page refresh
- [ ] Progress percentage in footer updates correctly

**Pass Criteria:** All checkboxes checked

**Notes:** _Record any issues here_

---

### Test 5: Click-to-Switch Navigation ✅

**Objective:** Verify clicking indicators switches the schema editor

**Steps:**

1. Navigate to Step 3 with multiple indicators
2. Click on Indicator "1" in tree navigator
3. Observe schema editor loads for Indicator "1"
4. Click on Indicator "1.1" in tree navigator
5. Observe schema editor switches to Indicator "1.1"
6. Verify indicator name displays in editor header

**Expected Results:**

- [ ] Clicking indicator in tree switches editor context
- [ ] Schema editor header shows correct indicator code and name
- [ ] Tab content loads correct schemas for selected indicator
- [ ] Previous/Next buttons enable/disable correctly
- [ ] Currently selected indicator has ◉ (blue filled circle) icon
- [ ] Previous indicator's icon reverts to status icon (☑, ○, or ⚠)
- [ ] Editor resets to Form tab on indicator switch

**Pass Criteria:** All checkboxes checked

**Notes:** _Record any issues here_

---

### Test 6: Search and Filter Functionality ✅

**Objective:** Verify search and filter features work correctly

**Steps:**

1. Navigate to Step 3 with multiple indicators
2. Type "budget" in search box
3. Observe filtered results
4. Clear search
5. Click Filter dropdown
6. Select "Incomplete Only"
7. Observe filtered results
8. Select "Show All" filter

**Expected Results:**

- [ ] Typing in search filters indicators by name/code
- [ ] Search is case-insensitive
- [ ] Filtered results maintain hierarchical structure
- [ ] "No results" message shows when no matches
- [ ] "Clear filters" button appears when filtered
- [ ] "Incomplete Only" filter shows only ○ and ⚠ indicators
- [ ] "Complete" filter shows only ☑ indicators
- [ ] "Errors" filter shows only ⚠ indicators
- [ ] "Show All" restores full tree
- [ ] Progress percentage reflects filtered/total indicators

**Pass Criteria:** All checkboxes checked

**Notes:** _Record any issues here_

---

### Test 7: Keyboard Shortcuts ✅

**Objective:** Verify all keyboard shortcuts work correctly

**Steps:**

1. Navigate to Step 3 with multiple indicators
2. Select an indicator
3. Press **↓** (Arrow Down)
4. Verify next indicator is selected
5. Press **↑** (Arrow Up)
6. Verify previous indicator is selected
7. Press **Ctrl/Cmd + N**
8. Verify next incomplete indicator is selected
9. Click in a text input field
10. Press **↑** (should NOT navigate, should move cursor)
11. Press **Esc**
12. Verify input loses focus
13. Press **↑** again (should now navigate)

**Expected Results:**

- [ ] **↑** navigates to previous indicator (when not in input)
- [ ] **↓** navigates to next indicator (when not in input)
- [ ] **Alt + ←** navigates to previous indicator
- [ ] **Alt + →** navigates to next indicator
- [ ] **Ctrl/Cmd + N** jumps to next incomplete indicator
- [ ] **Esc** removes focus from input/editor
- [ ] Keyboard shortcuts don't interfere with typing in inputs
- [ ] Shortcuts work with focus on schema editor
- [ ] Previous/Next buttons match keyboard navigation
- [ ] "Shortcuts" button in footer displays help panel

**Pass Criteria:** All checkboxes checked

**Notes:** _Record any issues here_

---

### Test 8: Progress Tracking ✅

**Objective:** Verify progress tracking displays correctly

**Steps:**

1. Navigate to Step 3 with draft containing 10 indicators
2. Complete schemas for 3 indicators (form + calculation + remark)
3. Observe progress display in tree footer
4. Leave 7 indicators incomplete
5. Verify progress percentage

**Expected Results:**

- [ ] Footer shows "X/Y complete (Z%)" format
- [ ] Numerator (X) matches completed indicators
- [ ] Denominator (Y) matches total indicators
- [ ] Percentage (Z%) is accurate (X/Y \* 100)
- [ ] Progress bar fills proportionally to completion
- [ ] "Next Incomplete" button is enabled when incomplete indicators exist
- [ ] "Next Incomplete" button is disabled when all complete
- [ ] Mobile header button shows progress: "Indicators (X/Y)"

**Pass Criteria:** All checkboxes checked

**Notes:** _Record any issues here_

---

### Test 9: Schema Validation Errors ✅

**Objective:** Verify validation errors display correctly

**Steps:**

1. Select an indicator
2. Go to Form tab
3. Add a field but leave "Field Name" empty
4. Go to Calculation tab
5. Add formula with unmatched parentheses: "(field1 + field2"
6. Go to Remark tab
7. Leave it empty
8. Observe validation error displays

**Expected Results:**

- [ ] Tree navigator shows ⚠ (amber warning) icon for indicator
- [ ] Error count badge shows next to indicator name
- [ ] SchemaEditorPanel footer shows error count: "X error(s)"
- [ ] Footer shows amber alert icon instead of green check
- [ ] Tab completion badges reflect incomplete/error state
- [ ] Errors are field-specific (form, calculation, remark)
- [ ] Filter "Errors" shows only indicators with validation errors

**Pass Criteria:** All checkboxes checked

**Notes:** _Record any issues here_

---

### Test 10: Tab Switching in SchemaEditorPanel ✅

**Objective:** Verify tabs switch correctly and preserve content

**Steps:**

1. Select an indicator
2. Go to Form tab, add 2 fields
3. Switch to Calculation tab, add formula
4. Switch to Remark tab, add text
5. Switch back to Form tab
6. Verify fields are still there
7. Switch to Calculation tab
8. Verify formula is still there

**Expected Results:**

- [ ] Clicking tab header switches tab content
- [ ] Tab content displays correct schema builder for each type
- [ ] Form tab shows FormSchemaBuilder with drag-and-drop fields
- [ ] Calculation tab shows CalculationSchemaBuilder with formula editor
- [ ] Remark tab shows RichTextEditor with formatting toolbar
- [ ] Content persists when switching tabs
- [ ] Active tab is highlighted visually
- [ ] Checkmarks show on completed tabs
- [ ] Tab completion badges in header reflect status

**Pass Criteria:** All checkboxes checked

**Notes:** _Record any issues here_

---

## Regression Testing

### Verify No Breaking Changes

**Test existing functionality:**

- [ ] Step 1 (Select Governance Area) still works
- [ ] Step 2 (Build Structure) tree editor still works
- [ ] Adding/removing/editing indicators in Step 2 still works
- [ ] Step 4 (Review & Submit) still works
- [ ] Draft saving/loading still works
- [ ] Existing indicator data loads correctly in Step 3

**Pass Criteria:** All checkboxes checked

---

## Performance Testing

### Load Time & Responsiveness

**Test with 50 indicators:**

1. Create draft with 50 indicators (5 levels deep)
2. Navigate to Step 3
3. Measure initial render time
4. Click different indicators
5. Measure indicator switch time

**Expected Results:**

- [ ] Initial render < 500ms
- [ ] Indicator switch < 150ms
- [ ] Tree search filters < 100ms
- [ ] No UI freezing or stuttering
- [ ] Smooth scrolling with 50+ indicators

**Notes:** _Record performance measurements here_

---

## Browser Compatibility

Test on multiple browsers:

- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest, if available)
- [ ] Edge (latest)

**Expected:** All features work consistently across browsers

---

## Accessibility Testing

### Keyboard Navigation

- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical (tree → editor → footer)
- [ ] Focus indicators are visible
- [ ] Esc, Enter, Arrow keys work as expected

### Screen Reader Compatibility

- [ ] Status icons have ARIA labels
- [ ] Navigation buttons have descriptive titles
- [ ] Form inputs have associated labels
- [ ] Error messages are announced

---

## Test Summary

**Total Tests:** 10 core scenarios + regression + performance + accessibility

**Status:**

- ✅ Passed: \_\_\_ / 10
- ❌ Failed: \_\_\_ / 10
- ⚠️ Partial: \_\_\_ / 10

**Critical Issues Found:**

1. _List critical bugs here_
2.
3.

**Minor Issues Found:**

1. _List minor bugs here_
2.
3.

**Suggestions for Improvement:**

1. _List enhancement ideas here_
2.
3.

---

## Sign-Off

**Tested By:** **\*\*\*\***\_**\*\*\*\*** **Date:** **\*\*\*\***\_**\*\*\*\*** **Environment:**
Development / Staging **Overall Status:** ✅ Pass / ❌ Fail / ⚠️ Needs Fixes

**Notes:** _Final testing comments_
