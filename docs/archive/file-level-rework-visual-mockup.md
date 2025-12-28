# File-Level Rework Indicators - Visual Mockup

## Current State vs. Proposed State

### Scenario: BLGU User Views Indicator in REWORK Status

**Context**: Assessor has annotated 2 out of 4 uploaded files for Indicator 1.1.1

---

## CURRENT STATE

### File Upload Field Display

```
┌─────────────────────────────────────────────────────────────────┐
│ 📎 Upload Proof of Barangay Officials                          │
│ Required *                                                       │
│                                                                  │
│ ⚠️ Assessor feedback on your files                             │
│ The assessor has left 3 comments on specific files.             │
│ Please review the feedback and upload corrected versions        │
│ for the flagged files. Unflagged files are still valid.        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ✅ Uploaded Files (4 files uploaded)                           │
│                                                                  │
│ 📄 barangay-resolution-2024.pdf                                │
│    2.3 MB • 2 days ago                                          │
│    🔴 2 notes                                                   │
│    [👁️ Preview] [⬇️ Download] [🗑️ Delete]                      │
│                                                                  │
│ 📄 list-of-officials.pdf                                       │
│    1.8 MB • 2 days ago                                          │
│    [👁️ Preview] [⬇️ Download] [🗑️ Delete]                      │
│                                                                  │
│ 📄 oath-of-office.pdf                                          │
│    1.2 MB • 2 days ago                                          │
│    🔴 1 note                                                    │
│    [👁️ Preview] [⬇️ Download] [🗑️ Delete]                      │
│                                                                  │
│ 📄 id-copies.pdf                                               │
│    3.1 MB • 2 days ago                                          │
│    [👁️ Preview] [⬇️ Download] [🗑️ Delete]                      │
└─────────────────────────────────────────────────────────────────┘
```

**Problems**:

- Hard to distinguish which files need action
- "2 notes" badge is subtle
- No clear visual hierarchy
- Unclear what "unflagged files are still valid" means
- No guidance on workflow

---

## PROPOSED STATE (PHASE 1)

### File Upload Field Display with Enhanced Indicators

```
┌─────────────────────────────────────────────────────────────────┐
│ 📎 Upload Proof of Barangay Officials                          │
│ Required *                                                       │
│                                                                  │
│ ⚠️ Action Required: File Re-upload                             │
│ The assessor has left 3 comments on 2 specific files.          │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ What you need to do:                                      │  │
│ │ 1. Review the assessor's comments on the highlighted     │  │
│ │    files below                                            │  │
│ │ 2. Click "Preview" to see annotations directly on the    │  │
│ │    documents                                              │  │
│ │ 3. Upload corrected versions of the flagged files        │  │
│ │ 4. Files without comments are still valid - no need to   │  │
│ │    re-upload them                                         │  │
│ └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ✅ Uploaded Files (4 files uploaded)                           │
│                                                                  │
│ ╔═══════════════════════════════════════════════════════════╗  │
│ ║ 📄 barangay-resolution-2024.pdf                          ║  │ <- ORANGE HIGHLIGHT
│ ║    2.3 MB • 2 days ago                                    ║  │
│ ║    🔴 2 notes  ⚠️ Re-upload needed                       ║  │
│ ║    [👁️ Preview] [⬇️ Download] [🗑️ Delete]               ║  │
│ ╚═══════════════════════════════════════════════════════════╝  │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ 📄 list-of-officials.pdf                                 │  │ <- NORMAL STYLING
│ │    1.8 MB • 2 days ago                                    │  │
│ │    [👁️ Preview] [⬇️ Download] [🗑️ Delete]               │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ╔═══════════════════════════════════════════════════════════╗  │
│ ║ 📄 oath-of-office.pdf                                    ║  │ <- ORANGE HIGHLIGHT
│ ║    1.2 MB • 2 days ago                                    ║  │
│ ║    🔴 1 note  ⚠️ Re-upload needed                        ║  │
│ ║    [👁️ Preview] [⬇️ Download] [🗑️ Delete]               ║  │
│ ╚═══════════════════════════════════════════════════════════╝  │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ 📄 id-copies.pdf                                         │  │ <- NORMAL STYLING
│ │    3.1 MB • 2 days ago                                    │  │
│ │    [👁️ Preview] [⬇️ Download] [🗑️ Delete]               │  │
│ └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Improvements**: ✅ Clear visual distinction (orange background) for files needing rework ✅
"Re-upload needed" badge adds explicit action hint ✅ Step-by-step instructions in alert ✅ Specific
count: "2 files" instead of vague message ✅ Clear separation between action items and valid files

---

## PROPOSED STATE (PHASE 2) - WITH REPLACEMENT TRACKING

### Additional Enhancement: Progress Tracking

```
┌─────────────────────────────────────────────────────────────────┐
│ 📎 Upload Proof of Barangay Officials                          │
│ Required *                                                       │
│                                                                  │
│ ⚠️ Action Required: File Re-upload                             │
│ The assessor has left 3 comments on 2 specific files.          │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ 📋 File Replacement Progress                             │  │
│ │                                                           │  │
│ │ ✅ barangay-resolution-2024.pdf (2 notes) - Replaced     │  │
│ │ ⚠️ oath-of-office.pdf (1 note) - Needs replacement       │  │
│ └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ✅ Uploaded Files (5 files uploaded)                           │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ 📄 barangay-resolution-2024-v2.pdf                       │  │ <- NEW FILE
│ │    2.5 MB • 1 hour ago                                    │  │    (UPLOADED AFTER REWORK)
│ │    [👁️ Preview] [⬇️ Download] [🗑️ Delete]               │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ 📄 list-of-officials.pdf                                 │  │ <- VALID FILE
│ │    1.8 MB • 2 days ago                                    │  │    (NO ANNOTATIONS)
│ │    [👁️ Preview] [⬇️ Download] [🗑️ Delete]               │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ╔═══════════════════════════════════════════════════════════╗  │
│ ║ 📄 oath-of-office.pdf                                    ║  │ <- STILL NEEDS REWORK
│ ║    1.2 MB • 2 days ago                                    ║  │    (NOT REPLACED YET)
│ ║    🔴 1 note  ⚠️ Re-upload needed                        ║  │
│ ║    [👁️ Preview] [⬇️ Download] [🔄 Replace] [🗑️ Delete] ║  │ <- NEW "REPLACE" BUTTON
│ ╚═══════════════════════════════════════════════════════════╝  │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ 📄 id-copies.pdf                                         │  │ <- VALID FILE
│ │    3.1 MB • 2 days ago                                    │  │    (NO ANNOTATIONS)
│ │    [👁️ Preview] [⬇️ Download] [🗑️ Delete]               │  │
│ └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ Previous Files (shown for reference)                        │
│                                                                  │
│ 📄 barangay-resolution-2024.pdf (REPLACED)                     │
│    2.3 MB • 2 days ago                                          │
│    🔴 2 notes                                                   │
│    [👁️ Preview] [⬇️ Download]                                  │
│                                                                  │
│ These are files from your previous submission. They are shown   │
│ here so you can review the assessor's feedback.                 │
└─────────────────────────────────────────────────────────────────┘
```

**Additional Improvements (Phase 2)**: ✅ Progress tracker shows at-a-glance status ✅ "Replace"
button for quick workflow ✅ Clear indication of which files have been addressed ✅ Previous files
section shows replaced versions for reference

---

## PROPOSED STATE (PHASE 3) - SMART UPLOAD GUIDANCE

### Context-Aware Upload Prompts

```
┌─────────────────────────────────────────────────────────────────┐
│ [UPLOAD AREA]                                                   │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ ✨ Upload Reminder                                        │  │
│ │                                                           │  │
│ │ You have 2 files with assessor feedback.                 │  │
│ │ Make sure to upload corrected versions:                  │  │
│ │                                                           │  │
│ │ 📄 barangay-resolution-2024.pdf                          │  │
│ │ 📄 oath-of-office.pdf                                    │  │
│ │                                                           │  │
│ │ ℹ️ View assessor feedback summary before uploading ▼     │  │ <- COLLAPSIBLE
│ └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│ [Drag and drop or browse files]                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Color Coding Legend

### Proposed Visual States:

| State                                        | Background     | Border              | Badge                                |
| -------------------------------------------- | -------------- | ------------------- | ------------------------------------ |
| **Needs Rework** (has annotations)           | `bg-orange-50` | `border-orange-300` | `🔴 X notes` + `⚠️ Re-upload needed` |
| **Valid** (no annotations)                   | `bg-card`      | `border-border`     | None                                 |
| **Replaced** (new upload after rework)       | `bg-card`      | `border-border`     | None (shows in "Uploaded Files")     |
| **Previous** (old file, shown for reference) | `bg-gray-50`   | `border-gray-200`   | None (shows in "Previous Files")     |

---

## Mobile Responsive Considerations

On mobile devices (< 640px):

1. Stack action buttons vertically
2. Collapse file metadata to single line with ellipsis
3. Make "Re-upload needed" badge more prominent
4. Simplify instructions in alert to bullet points

---

## Accessibility Features

1. **ARIA Labels**:
   - `aria-label="File with assessor comments requiring re-upload"`
   - `aria-describedby="rework-instructions"`

2. **Screen Reader Announcements**:
   - "2 files require re-upload based on assessor feedback"
   - "File barangay-resolution-2024.pdf has 2 assessor notes and needs re-upload"

3. **Keyboard Navigation**:
   - Tab order: Preview → Download → Replace → Delete
   - Enter/Space to activate actions

4. **Color Independence**:
   - Not relying solely on orange color
   - Icon indicators (⚠️) accompany color
   - Text badges ("Re-upload needed")

---

## Animation/Transition Ideas

1. **File Upload Success**:
   - Newly uploaded file slides into "Uploaded Files" with subtle green highlight
   - Progress tracker updates with checkmark animation

2. **Replace Action**:
   - Smooth scroll to upload area
   - Upload area pulses briefly to draw attention

3. **Status Change**:
   - When all annotated files replaced, alert changes from warning to success
   - "All feedback addressed! You can submit when ready."

---

## User Flow Example

### Before (Current):

1. BLGU opens indicator form
2. Sees generic "assessor feedback" alert
3. Scrolls through files trying to find which ones need rework
4. Clicks preview on each to check for annotations
5. Gets confused about which files to re-upload

**Result**: Inefficient, high cognitive load

### After (Proposed):

1. BLGU opens indicator form
2. Sees clear "2 files need re-upload" with step-by-step instructions
3. Immediately identifies orange-highlighted files
4. Clicks "Preview" on highlighted files to view annotations
5. Uses "Replace" button or uploads new versions
6. Progress tracker shows 1/2 done
7. Uploads second file
8. Sees "All feedback addressed!" confirmation

**Result**: Efficient, clear, confidence-inspiring

---

**Note**: This mockup uses text-based visual representation. Actual implementation will use Tailwind
CSS classes and shadcn/ui components for proper styling.
