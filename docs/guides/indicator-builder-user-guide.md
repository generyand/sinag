# Indicator Builder User Guide

**Version**: 1.0
**Last Updated**: 2025-01-14
**For**: VANTAGE Indicator Builder v1.4

---

## Overview

This guide provides step-by-step instructions for creating hierarchical indicators in the VANTAGE Indicator Builder. We'll use **Indicator 1.1 (Compliance with the Barangay Full Disclosure Policy)** as a comprehensive example.

---

## Example: Building Indicator 1.1 (BFDP Compliance)

### What We'll Build

```
1.1 COMPLIANCE WITH THE BARANGAY FULL DISCLOSURE POLICY (BFDP) BOARD
├── 1.1.1 Posted CY 2023 financial documents in BFDP board
│   └── MOV Checklist (18 items in 3 groups)
└── 1.1.2 Accomplished and signed BFR with received stamp
    └── MOV Checklist (1 item)
```

---

## STEP 1: Access the Indicator Builder

1. Navigate to: **`/mlgoo/indicators/builder`**
2. The **Indicator Builder Wizard** loads
3. Wait for governance areas to load

---

## STEP 2: Select Mode (Wizard Step 1)

### 2.1 Select Governance Area

1. From the **Governance Area** dropdown, select:
   ```
   Core Governance Area 1: Financial Administration and Sustainability
   ```

### 2.2 Select Creation Mode

1. Choose: **"Build from scratch"**
2. Click **"Next"** button

You'll now proceed to Step 2: **Build & Configure**

---

## STEP 3: Build & Configure (Wizard Step 2)

You're now in the combined Build & Configure interface:
- **Left panel (30%)**: Tree navigator with Navigate/Edit mode toggle
- **Right panel (70%)**: Schema editor with 4 tabs (Basic Info, Calculation, MOV Checklist, Preview)

### Understanding the Interface

#### Left Panel Modes

| Mode | Icon | Purpose | Actions Available |
|------|------|---------|-------------------|
| **Edit Mode** | ✏️ Editing | Build tree structure | Add, delete, reorder, drag-drop |
| **Navigate Mode** | ⚙️ Configuring | Configure schemas | Click to select, view status |

**Important**: The tree **automatically starts in Edit Mode** when empty (contextual smart defaulting).

#### Auto-Save Behavior

- **Edit Mode**: Auto-save **pauses** (prevents conflicts during structure changes)
- **Navigate Mode**: Auto-save **active** (saves schema changes every 3 seconds)
- **Status Indicator**: Shows "Saving..." or "X unsaved" at bottom of layout

---

### 3.1: Add Parent Indicator (1.1)

Since the tree is empty, you should be in **Edit Mode** automatically.

#### 3.1.1: Add Root Indicator

1. In the **left panel**, click the **"Add Root Indicator"** button
2. A new indicator appears in the tree with temporary name: `"New Indicator"`
3. The **right panel** automatically switches to show this indicator's **Basic Info** tab

#### 3.1.2: Configure Basic Info

In the **right panel**, **Basic Info** tab:

| Field | Value |
|-------|-------|
| **Code** | `1.1` (or leave empty for auto-generation) |
| **Name** | `COMPLIANCE WITH THE BARANGAY FULL DISCLOSURE POLICY (BFDP) BOARD` |
| **Description** | See below |
| **Parent** | (none - this is a root indicator) |
| **Display Order** | `1` |

**Description Text:**
```
Posted the following CY 2023 financial documents in the BFDP board,
pursuant to DILG MC No. 2014-81 and DILG MC No. 2022-027:

a) Barangay Financial Report
b) Barangay Budget
c) Summary of Income and Expenditures
d) 20% CoUtilization
e) Annual Procurement Plan or Procuremponent of the NTA ment List
f) List of Notices of Award (1st - 3rd Quarter of CY 2023)
g) Itemized Monthly Collections and Disbursements (January to September 2023)
```

3. The indicator name updates in the tree as you type

#### 3.1.3: Configure Calculation

1. Click the **"Calculation"** tab
2. Fill in:

| Field | Value | Notes |
|-------|-------|-------|
| **Auto-calc Method** | `AUTO` | Parent will aggregate from children |
| **Logical Operator** | `AND` | All children must pass for parent to pass |
| **Selection Mode** | `all` | All children are required |
| **BBI Association** | (none) | Not a BBI functionality indicator |

#### 3.1.4: Skip MOV Checklist

1. Click **"MOV Checklist"** tab
2. **Leave it empty** - parent indicators don't have MOV checklists (only leaf indicators do)

✅ Parent indicator `1.1` is now configured!

---

### 3.2: Add First Child Indicator (1.1.1)

#### 3.2.1: Add Child

1. In the **left panel**, ensure you're still in **Edit Mode** (badge shows "✏️ Editing")
2. **Right-click** on indicator `1.1` in the tree
3. From the context menu, select **"Add Child Indicator"**
4. A new child appears under `1.1`
5. The right panel automatically switches to this new indicator

#### 3.2.2: Configure Basic Info

**Basic Info** tab:

| Field | Value |
|-------|-------|
| **Code** | `1.1.1` (or auto-generated) |
| **Name** | `Posted the following CY 2023 financial documents in the BFDP board` |
| **Description** | (same text as parent's full requirement) |
| **Parent** | `1.1 COMPLIANCE WITH THE BARANGAY FULL DISCLOSURE POLICY (BFDP) BOARD` |
| **Display Order** | `1` |

#### 3.2.3: Configure Calculation

**Calculation** tab:

| Field | Value | Notes |
|-------|-------|-------|
| **Auto-calc Method** | `MANUAL` | Leaf indicator - validator determines pass/fail |
| **Logical Operator** | (disabled) | No children |
| **Selection Mode** | (disabled) | No children |
| **BBI Association** | (none) | |

#### 3.2.4: Configure MOV Checklist

This is the complex part! We'll build a checklist with **18 items organized in 3 groups**.

1. Click **"MOV Checklist"** tab
2. You should see the **MOVChecklistBuilder** component

---

#### Add Item 1: BFDP Monitoring Form

1. Click **"+ Add Item"** button
2. Fill in the form:

| Field | Value |
|-------|-------|
| **Type** | `Checkbox` |
| **Label** | `Three (3) BFDP Monitoring Form A of the DILG Advisory covering the 1st to 3rd quarter monitoring data signed by the City Director/CMLGOO, Punong Barangay and Barangay Secretary` |
| **Required** | ✅ Yes |
| **Requires Count** | ❌ No |
| **Help Text** | (leave empty) |

3. Click **"Save"** or **"Add"** button

---

#### Add Item 2: Photo Documentation

1. Click **"+ Add Item"** button
2. Fill in:

| Field | Value |
|-------|-------|
| **Type** | `Checkbox` |
| **Label** | `Two (2) Photo Documentation of the BFDP board showing the name of the barangay` |
| **Required** | ✅ Yes |
| **Requires Count** | ✅ Yes |
| **Min Count** | `2` |
| **Count Label** | `Number of photos submitted` |
| **Help Text** | See below |

**Help Text:**
```
Photo Requirements:
One (1) photo with Distant View; and
One (1) photo with Close-up View
```

3. Click **"Save"**

---

#### Add Group 1: ANNUAL REPORT

1. Click **"+ Add Item"** button
2. Fill in:

| Field | Value |
|-------|-------|
| **Type** | `Group` |
| **Label** | `ANNUAL REPORT` |
| **Required** | ✅ Yes |

3. Click **"Save"**

Now add **5 children** to this group:

**For each child below**, locate the ANNUAL REPORT group item in the list, then click **"Add Child"** within that group:

**Child a: Barangay Financial Report**
- Type: `Checkbox`
- Label: `a. Barangay Financial Report`
- Required: ✅ Yes

**Child b: Barangay Budget**
- Type: `Checkbox`
- Label: `b. Barangay Budget`
- Required: ✅ Yes

**Child c: Summary of Income and Expenditures**
- Type: `Checkbox`
- Label: `c. Summary of Income and Expenditures`
- Required: ✅ Yes

**Child d: 20% Component of NTA Utilization**
- Type: `Checkbox`
- Label: `d. 20% Component of the NTA Utilization`
- Required: ✅ Yes

**Child e: Annual Procurement Plan**
- Type: `Checkbox`
- Label: `e. Annual Procurement Plan or Procurement List`
- Required: ✅ Yes

---

#### Add Group 2: QUARTERLY REPORT

1. Click **"+ Add Item"** button
2. Fill in:

| Field | Value |
|-------|-------|
| **Type** | `Group` |
| **Label** | `QUARTERLY REPORT` |
| **Required** | ✅ Yes |

3. Add **1 child** to this group:

**Child f: List of Notices of Award**
- Type: `Checkbox`
- Label: `f. List of Notices of Award (1st - 3rd Quarter of CY 2023)`
- Required: ✅ Yes
- Requires Count: ✅ Yes
- Min Count: `1`
- Help Text:
  ```
  Please supply the number of documents submitted:
  List of Notices of Award were submitted
  ```

---

#### Add Group 3: MONTHLY REPORT

1. Click **"+ Add Item"** button
2. Fill in:

| Field | Value |
|-------|-------|
| **Type** | `Group` |
| **Label** | `MONTHLY REPORT` |
| **Required** | ✅ Yes |

3. Add **1 child** to this group:

**Child g: Itemized Monthly Collections and Disbursements**
- Type: `Checkbox`
- Label: `g. Itemized Monthly Collections and Disbursements (January to September 2023)`
- Required: ✅ Yes
- Requires Count: ✅ Yes
- Min Count: `1`
- Help Text:
  ```
  Please supply the number of documents submitted:
  Itemized Monthly Collections and Disbursements were submitted
  ```

---

✅ **Indicator 1.1.1 is now complete with 18 MOV checklist items!**

You should see the checklist organized as:
```
☐ Three (3) BFDP Monitoring Form A...
☐ Two (2) Photo Documentation...
▼ ANNUAL REPORT
  ☐ a. Barangay Financial Report
  ☐ b. Barangay Budget
  ☐ c. Summary of Income and Expenditures
  ☐ d. 20% Component of the NTA Utilization
  ☐ e. Annual Procurement Plan or Procurement List
▼ QUARTERLY REPORT
  ☐ f. List of Notices of Award (1st-3rd Quarter of CY 2023)
▼ MONTHLY REPORT
  ☐ g. Itemized Monthly Collections and Disbursements
```

---

### 3.3: Add Second Child Indicator (1.1.2)

#### 3.3.1: Add Child

1. In **left panel**, ensure you're in **Edit Mode**
2. **Right-click** on indicator `1.1` (the parent) again
3. Select **"Add Child Indicator"**
4. A new child appears under `1.1` (below `1.1.1`)

#### 3.3.2: Configure Basic Info

**Basic Info** tab:

| Field | Value |
|-------|-------|
| **Code** | `1.1.2` (or auto-generated) |
| **Name** | `Accomplished and signed BFR with received stamp from the Office of the C/M Accountant` |
| **Description** | (same as name) |
| **Parent** | `1.1 COMPLIANCE WITH THE BARANGAY FULL DISCLOSURE POLICY (BFDP) BOARD` |
| **Display Order** | `2` |

#### 3.3.3: Configure Calculation

**Calculation** tab:

| Field | Value |
|-------|-------|
| **Auto-calc Method** | `MANUAL` |
| **BBI Association** | (none) |

#### 3.3.4: Configure MOV Checklist

This one is simple - just 1 item:

1. Click **"MOV Checklist"** tab
2. Click **"+ Add Item"**
3. Fill in:

| Field | Value |
|-------|-------|
| **Type** | `Checkbox` |
| **Label** | `Annex B of DBM-DOF-DILG JMC No. 2018-1` |
| **Required** | ✅ Yes |

4. Click **"Save"**

✅ **Indicator 1.1.2 is now complete!**

---

### 3.4: Switch to Navigate Mode

Now that the structure is built, switch to **Navigate Mode** to review your work:

1. In **left panel**, click the **"✓ Done Editing"** button
2. The panel switches to **Navigate Mode** (badge changes to "⚙️ Configuring")
3. Auto-save automatically **resumes** (you may see "Saving..." briefly)

---

### 3.5: Review Your Work

#### Tree Structure

You should now see in the left panel:

```
1.1 COMPLIANCE WITH THE BARANGAY FULL DISCLOSURE POLICY (BFDP) BOARD (○)
├── 1.1.1 Posted the following CY 2023 financial documents... (○ incomplete)
└── 1.1.2 Accomplished and signed BFR... (○ incomplete)
```

**Status Icons:**
- ○ = Incomplete (schema not fully configured)
- ◉ = Current (selected indicator)
- ☑ = Complete (all required fields filled)
- ⚠ = Error (validation issues)

#### Preview Indicators

1. Click on **1.1.1** in the tree
2. In the right panel, switch to **"Preview"** tab
3. Toggle between **"BLGU View"** and **"Validator View"** tabs
4. Verify the MOV checklist displays correctly

Repeat for **1.1.2**

---

## STEP 4: Review & Publish (Wizard Step 3)

### 4.1: Navigate to Review Step

1. In the wizard header, click **"Next"** button
2. You're now on the **Review & Publish** step

### 4.2: Review Structure

The review page shows:

- **Indicator Tree**: Full hierarchical view
- **Validation Status**: Per-indicator validation results
- **Schema Completeness**: Progress bars

### 4.3: Validation Checks

Expected validation results:

| Indicator | Status | Notes |
|-----------|--------|-------|
| 1.1 | ✅ Valid | Parent with 2 children, AUTO calculation |
| 1.1.1 | ✅ Valid | Has 18 MOV checklist items |
| 1.1.2 | ✅ Valid | Has 1 MOV checklist item |

### 4.4: Publish

1. Review all indicators
2. Click **"Publish"** button
3. Confirmation dialog appears
4. Click **"Confirm"**
5. Success message: "Indicators have been published successfully"
6. You're redirected to `/mlgoo/indicators`

---

## Key UI Features Reference

### Tree Panel Actions

| Action | How to Access | Description |
|--------|---------------|-------------|
| Add Root Indicator | Edit Mode → "Add Root Indicator" button | Creates top-level indicator |
| Add Child Indicator | Edit Mode → Right-click parent → "Add Child Indicator" | Creates nested indicator under selected parent |
| Delete Indicator | Edit Mode → Right-click indicator → "Delete" | Removes indicator and all children |
| Duplicate Indicator | Edit Mode → Right-click indicator → "Duplicate" | Creates copy of indicator |
| Drag to Reorder | Edit Mode → Drag indicator up/down | Changes display order |
| Drag to Reparent | Edit Mode → Drag indicator to new parent | Moves indicator under different parent |
| Toggle Mode | Click "Edit Structure" or "Done Editing" | Switches between Navigate/Edit modes |

### Schema Editor Tabs

| Tab | Purpose | Available For |
|-----|---------|---------------|
| **Basic Info** | Code, name, description, parent, order | All indicators |
| **Calculation** | Auto-calc method, logical operator, BBI | All indicators |
| **MOV Checklist** | Checklist items, groups, validation rules | **Leaf indicators only** |
| **Preview** | BLGU/Validator view simulation | All indicators |

### MOV Checklist Item Types

| Type | Use Case | Features |
|------|----------|----------|
| **Checkbox** | Standard verification item | Required flag, document count, help text |
| **Group** | Organize related items | Contains nested children, collapsible |
| **Currency Input** | Money amounts (PHP) | Validation rules, comparison, thresholds |
| **Number Input** | Counts, percentages | Min/max, comparisons, calculations |
| **Text Input** | Names, descriptions | Pattern validation |
| **Date Input** | Dates, deadlines | Deadline validation, grace periods |
| **Assessment** | YES/NO validator judgment | Radio buttons for binary choices |

### Auto-Save Indicators

| Status | Location | Meaning |
|--------|----------|---------|
| "Saving..." | Bottom of layout | Delta save in progress |
| "X unsaved" | Bottom of layout | Number of dirty indicators pending save |
| "Saved just now" | Bottom of layout | Last save was < 5 seconds ago |
| "Saved Xm ago" | Bottom of layout | Last save timestamp |

### Mode Indicators

| Badge | Mode | Description |
|-------|------|-------------|
| "✏️ Editing" | Edit Mode | Tree structure editing enabled |
| "⚙️ Configuring" | Navigate Mode | Schema configuration mode |

---

## Tips and Best Practices

### 1. Building Tree Structure

✅ **DO:**
- Build the entire tree structure first in Edit Mode
- Use descriptive names (they appear in tree and forms)
- Set display order to control indicator sequence
- Use "Done Editing" when structure is complete

❌ **DON'T:**
- Switch modes frequently (causes context loss)
- Forget to set parent-child relationships
- Delete parent indicators without backing up children

### 2. Configuring MOV Checklists

✅ **DO:**
- Use groups to organize related items (ANNUAL REPORT, QUARTERLY REPORT, etc.)
- Add help text for complex requirements (photo requirements, document formats)
- Use document counts when specific quantities required
- Test in Preview tab before publishing

❌ **DON'T:**
- Add MOV checklists to parent indicators (only leaves need them)
- Skip required items (they must be checked for PASS)
- Forget to set min_count when requires_count is enabled

### 3. Performance Optimization

The interface includes several performance optimizations:

- **Lazy Loading**: Only the active tab renders (saves memory)
- **Debounced Code Recalculation**: Smooth drag-drop (300ms delay)
- **Auto-Save Pause**: Prevents conflicts during tree editing
- **Unified Selection**: Navigate/Edit modes stay in sync

### 4. Auto-Save Behavior

Understanding auto-save timing:

| Event | Auto-Save Behavior |
|-------|-------------------|
| Edit Mode active | ⏸️ **Paused** (structure changes don't trigger saves) |
| Navigate Mode active | ▶️ **Active** (saves after 3 seconds of inactivity) |
| Switch modes | ⏸️→▶️ Auto-resumes after mode switch |
| Manual save (Ctrl/Cmd+S) | 💾 Immediate save bypass |

---

## Troubleshooting

### Issue: Auto-save shows "X unsaved" but not saving

**Cause**: You're in Edit Mode (auto-save paused)

**Solution**: Click "Done Editing" to resume auto-save

---

### Issue: Can't add MOV checklist items

**Cause 1**: You're on a parent indicator (parents don't have MOV checklists)

**Solution**: Navigate to a leaf indicator

**Cause 2**: MOVChecklistBuilder hasn't loaded

**Solution**: Refresh the page, check browser console for errors

---

### Issue: Tree structure disappeared after refresh

**Cause**: Draft wasn't saved before closing

**Solution**:
1. Check `/mlgoo/indicators/builder?draftId=xxx` in recent browser history
2. Resume from draft if available
3. Auto-save runs every 3 seconds, so minimal data loss if you were in Navigate Mode

---

### Issue: Indicator codes aren't auto-generating

**Cause**: Manual override in Code field

**Solution**: Leave Code field empty for automatic hierarchical numbering (1, 1.1, 1.1.1, etc.)

---

## Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `↑` / `↓` | Navigate previous/next indicator | Navigate Mode |
| `Alt + ←` / `Alt + →` | Navigate previous/next indicator | Alternative navigation |
| `Ctrl/Cmd + S` | Save immediately (bypass debounce) | Any mode |
| `Ctrl/Cmd + N` | Navigate to next incomplete indicator | Navigate Mode |
| `Esc` | Blur current input (unfocus) | Any mode |

---

## Next Steps

After publishing your indicators:

1. **Test in BLGU View**: Navigate to `/blgu/assessments` to see submission form
2. **Test in Validator View**: Navigate to `/assessor/validation` to see review form
3. **Monitor Submissions**: Check `/mlgoo/analytics` for submission statistics
4. **Iterate**: Edit published indicators via `/mlgoo/indicators/{id}/edit`

---

## Additional Resources

- **Specification**: `/docs/indicator-builder-specification.md` - Technical spec (v1.4)
- **Architecture**: `/docs/architecture.md` - System architecture
- **API Documentation**: `/docs/api/` - Backend API reference
- **PRD**: `/docs/prds/prd-phase6-administrative-features.md` - Product requirements

---

## Changelog

### Version 1.0 (2025-01-14)
- Initial release
- Step-by-step guide for Indicator 1.1 (BFDP Compliance)
- Covers Edit/Navigate mode workflow
- Documents MOV Checklist builder with groups
- Includes troubleshooting and keyboard shortcuts
