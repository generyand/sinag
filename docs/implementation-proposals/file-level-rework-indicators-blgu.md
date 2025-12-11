# File-Level Rework Indicators Implementation Proposal (BLGU Side)

## Overview

This proposal outlines the implementation of file-level rework indicators for BLGU users viewing assessments in REWORK status. The goal is to clearly show which specific files need re-upload based on Assessor annotations.

## Current State Analysis

### Backend Data Structure (Already Available)

The backend already provides all necessary data:

1. **Indicator Response** (`annotated_mov_file_ids`):
   - Array of MOV file IDs that have annotations
   - Returned in indicator responses for assessor view
   - Location: `apps/api/app/services/assessor_service.py`

2. **Individual MOV File** (`has_annotations` flag):
   - Each MOV file object already includes annotation data
   - Available through annotations relationship
   - Can be used to identify files needing rework

3. **MOV Annotations** (`mov_annotations_by_indicator`):
   - Provided in dashboard API response
   - Filtered by indicator ID
   - Contains file-level annotation details

### Frontend Current Implementation

#### Key Files Involved:

1. **Indicator Form Page**
   - Location: `/home/asnari/Project/sinag/apps/web/src/app/(app)/blgu/assessment/[assessmentId]/indicator/[indicatorId]/page.tsx`
   - Already fetches and passes `movAnnotations` to components
   - Lines 95-96: Extracts annotations by indicator

2. **FileFieldComponent**
   - Location: `/home/asnari/Project/sinag/apps/web/src/components/features/forms/fields/FileFieldComponent.tsx`
   - Already implements hybrid logic for file separation
   - Lines 669-694: Filters files with annotations vs without
   - Lines 798-817: Shows alert when files have annotations

3. **FileList & FileListWithDelete**
   - Location: `/home/asnari/Project/sinag/apps/web/src/components/features/movs/`
   - Already displays annotation badges
   - Lines 320-326 (FileList.tsx): Shows badge with annotation count

4. **DynamicFormRenderer**
   - Location: `/home/asnari/Project/sinag/apps/web/src/components/features/forms/DynamicFormRenderer.tsx`
   - Passes `movAnnotations` and `reworkComments` to FileFieldComponent

## Current Behavior

### What Works:

1. **File Separation**: Files are correctly separated into:
   - **New Files**: Uploaded after rework request OR old files without annotations
   - **Previous Files**: Files uploaded before rework with annotations OR deleted files

2. **Annotation Badges**: Files with annotations show red badge with count (e.g., "2 notes")

3. **Alert Banner**: Shows when files have annotations at field level

4. **Preview with Annotations**: BLGU can view annotations in preview modal

### What's Missing/Needs Enhancement:

1. **Visual Clarity**: The distinction between "needs rework" and "still valid" files could be more prominent
2. **Upload Guidance**: Clearer instruction on which files need re-upload
3. **Progress Tracking**: No clear indication of which annotated files have been replaced

## Proposed Implementation

### Phase 1: Enhanced Visual Indicators (Immediate - Low Effort)

#### 1.1 Enhance File Card Visual States

**Location**: `FileList.tsx` (lines 299-378)

**Changes**:
```tsx
// Add visual state indicators to file cards
<div
  className={cn(
    "p-3 rounded-lg border transition-colors",
    hasAnnotations
      ? "border-orange-300 bg-orange-50/50 dark:border-orange-700 dark:bg-orange-900/20"
      : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--hover)]"
  )}
>
```

**Benefit**: Files needing rework stand out visually with orange/warning color scheme

#### 1.2 Add File-Level Action Hints

**Location**: `FileList.tsx` (after annotation badge)

**Changes**:
```tsx
{hasAnnotations && (
  <>
    <Badge variant="destructive" className="text-xs shrink-0">
      <MessageSquare className="h-3 w-3 mr-1" />
      {fileAnnotations.length} {fileAnnotations.length === 1 ? "note" : "notes"}
    </Badge>
    <Badge variant="outline" className="text-xs shrink-0 border-orange-500 text-orange-700">
      <AlertCircle className="h-3 w-3 mr-1" />
      Re-upload needed
    </Badge>
  </>
)}
```

**Benefit**: Clear action hint on each annotated file

#### 1.3 Enhanced Field-Level Alert

**Location**: `FileFieldComponent.tsx` (lines 798-817)

**Changes**:
```tsx
{hasAnnotations && (normalizedStatus === "REWORK" || normalizedStatus === "NEEDS_REWORK") && (
  <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
    <AlertCircle className="h-4 w-4 text-orange-600" />
    <AlertDescription className="text-orange-900 dark:text-orange-200 space-y-2">
      <p className="font-medium mb-1">Action Required: File Re-upload</p>
      <p className="text-sm">
        The assessor has left {fieldAnnotations.length} comment
        {fieldAnnotations.length !== 1 ? "s" : ""} on {annotatedFileCount} specific file
        {annotatedFileCount !== 1 ? "s" : ""}.
      </p>
      <div className="bg-white dark:bg-gray-800 p-3 rounded-md border border-orange-200">
        <p className="text-sm font-semibold mb-2">What you need to do:</p>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          <li>Review the assessor's comments on the highlighted files below</li>
          <li>Click "Preview" to see annotations directly on the documents</li>
          <li>Upload corrected versions of the flagged files</li>
          <li>Files without comments are still valid - no need to re-upload them</li>
        </ol>
      </div>
    </AlertDescription>
  </Alert>
)}
```

**Benefit**: Clear step-by-step guidance for BLGU users

### Phase 2: Upload Guidance Enhancement (Medium Effort)

#### 2.1 Add "Replace This File" Action

**Location**: `FileList.tsx` (action buttons section)

**New Feature**:
```tsx
{hasAnnotations && canDelete && (
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={() => handleReplaceFile(file)}
    className="text-orange-600 border-orange-300 hover:bg-orange-50"
    title="Delete and upload new version"
  >
    <RefreshCw className="h-4 w-4 mr-1" />
    Replace
  </Button>
)}
```

**Implementation**:
- Combines delete + scroll to upload area
- Provides clear workflow for replacement

#### 2.2 File Replacement Tracking

**New Component**: `FileReplacementTracker.tsx`

**Purpose**: Track which annotated files have been replaced with new uploads

**Data Structure**:
```typescript
interface FileReplacementStatus {
  originalFileId: number;
  fileName: string;
  annotationCount: number;
  replacedAt?: string;
  replacementFileId?: number;
  status: 'needs_replacement' | 'replaced';
}
```

**Visual**:
```tsx
<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
  <h4 className="font-medium text-sm mb-2">File Replacement Progress</h4>
  <div className="space-y-2">
    {replacementStatuses.map((status) => (
      <div key={status.originalFileId} className="flex items-center gap-2">
        {status.status === 'replaced' ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <AlertCircle className="h-4 w-4 text-orange-600" />
        )}
        <span className="text-sm">{status.fileName}</span>
        <span className="text-xs text-muted-foreground">
          ({status.annotationCount} {status.annotationCount === 1 ? 'note' : 'notes'})
        </span>
        {status.status === 'replaced' && (
          <Badge variant="outline" className="text-xs">Replaced</Badge>
        )}
      </div>
    ))}
  </div>
</div>
```

**Benefit**: BLGU can see at a glance which files still need attention

### Phase 3: Smart Upload Suggestions (Advanced - Optional)

#### 3.1 Context-Aware Upload Prompts

When upload area is shown for a field with annotated files:

```tsx
{annotatedFiles.length > 0 && canUpload && (
  <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
    <div className="flex items-start gap-3">
      <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
      <div>
        <p className="font-medium text-sm text-blue-900">Upload Reminder</p>
        <p className="text-sm text-blue-800 mt-1">
          You have {annotatedFiles.length} file{annotatedFiles.length !== 1 ? 's' : ''}
          with assessor feedback. Make sure to upload corrected versions:
        </p>
        <ul className="mt-2 space-y-1">
          {annotatedFiles.slice(0, 3).map((file) => (
            <li key={file.id} className="text-sm text-blue-700 flex items-center gap-2">
              <FileText className="h-3 w-3" />
              {file.file_name}
            </li>
          ))}
          {annotatedFiles.length > 3 && (
            <li className="text-sm text-blue-600 italic">
              ...and {annotatedFiles.length - 3} more
            </li>
          )}
        </ul>
      </div>
    </div>
  </div>
)}
```

#### 3.2 Annotation Summary in Upload Area

Show a collapsed summary of annotations when user is about to upload:

```tsx
<Collapsible>
  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
    <Info className="h-4 w-4" />
    View assessor feedback summary before uploading
  </CollapsibleTrigger>
  <CollapsibleContent className="mt-2 p-3 bg-white border border-blue-200 rounded-md">
    {annotatedFiles.map((file) => {
      const fileAnnotations = movAnnotations.filter(
        (ann) => ann.mov_file_id === file.id
      );
      return (
        <div key={file.id} className="mb-3 last:mb-0">
          <p className="font-medium text-sm">{file.file_name}</p>
          <ul className="mt-1 space-y-1 pl-4">
            {fileAnnotations.map((ann, idx) => (
              <li key={ann.id} className="text-xs text-gray-700 list-disc">
                {ann.comment || "(No comment)"}
              </li>
            ))}
          </ul>
        </div>
      );
    })}
  </CollapsibleContent>
</Collapsible>
```

**Benefit**: Prevents BLGU from uploading without reviewing feedback

## Implementation Priority

### High Priority (Implement First):
1. ✅ Enhanced visual states for annotated files (Phase 1.1)
2. ✅ "Re-upload needed" badge (Phase 1.2)
3. ✅ Enhanced field-level alert with step-by-step guidance (Phase 1.3)

### Medium Priority:
4. Replace action button (Phase 2.1)
5. File replacement tracking (Phase 2.2)

### Low Priority (Nice to Have):
6. Context-aware upload prompts (Phase 3.1)
7. Annotation summary in upload area (Phase 3.2)

## Files to Modify

### Primary Changes:
1. `/home/asnari/Project/sinag/apps/web/src/components/features/movs/FileList.tsx`
   - Add enhanced visual states
   - Add "Re-upload needed" badge
   - Add replace action button

2. `/home/asnari/Project/sinag/apps/web/src/components/features/forms/fields/FileFieldComponent.tsx`
   - Enhance field-level alert with guidance
   - Add context-aware upload prompts (optional)

### New Components (Optional):
3. `/home/asnari/Project/sinag/apps/web/src/components/features/rework/FileReplacementTracker.tsx`
   - Track replacement status
   - Show progress

## Testing Checklist

- [ ] Files with annotations show orange/warning styling
- [ ] "Re-upload needed" badge appears on annotated files
- [ ] Enhanced alert shows correct file count and clear instructions
- [ ] Preview modal still works for viewing annotations
- [ ] Download functionality unaffected
- [ ] Delete and re-upload workflow smooth
- [ ] File separation (new vs previous) still works correctly
- [ ] Progress indicators update when files are replaced
- [ ] Works across different validation rules (AND, OR, ANY_OPTION_GROUP)

## Accessibility Considerations

- All visual states have text equivalents (not just color)
- ARIA labels for icon-only buttons
- Keyboard navigation for all interactive elements
- Screen reader announcements for file status changes

## Performance Considerations

- No additional API calls required (all data already fetched)
- Minimal re-renders (use useMemo for computed values)
- Lazy load preview modal components

## Migration Notes

- No database migrations needed
- No backend changes required
- All changes are frontend-only
- Backward compatible with existing data

## Related Documentation

- Assessment Workflow: `/home/asnari/Project/sinag/docs/workflows/assessor-validation.md`
- BLGU Workflow: `/home/asnari/Project/sinag/docs/workflows/blgu-assessment.md`
- Calibration Rework: See existing implementation in FileFieldComponent.tsx (lines 605-703)

## Success Metrics

1. BLGU users can identify which files need re-upload within 5 seconds of viewing the form
2. Reduced back-and-forth between BLGU and Assessor due to missed rework files
3. Increased completion rate of rework submissions on first attempt
4. Positive user feedback on clarity of rework requirements

## Next Steps

1. Review and approve this proposal
2. Implement Phase 1 (High Priority) changes
3. Test with sample BLGU users
4. Gather feedback and iterate
5. Consider Phase 2 and 3 based on user feedback

---

**Prepared by**: Claude Code (Frontend Architect)
**Date**: 2025-12-11
**Status**: Awaiting Review
