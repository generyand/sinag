# MOV Viewer Zoom and Rotate Design

## Summary

Add temporary zoom and rotation controls to the MOV preview experience used by both assessors and
validators. The feature is intended purely as a reading aid so reviewers can inspect uploaded MOVs
more clearly. Viewer state must be local to the current preview session and must reset when the user
switches files or closes the preview.

## Goals

- Let reviewers zoom in and out while previewing image and PDF MOVs.
- Let reviewers rotate image and PDF MOVs without modifying the stored file.
- Make the feature available in both assessor and validator validation flows.
- Keep shared read-only MOV previews that reuse the same annotators consistent with the new controls
  unless a specific integration constraint blocks that reuse.
- Preserve the current annotation and notes workflow.

## Non-Goals

- Persist zoom or rotation between preview sessions.
- Save rotation back to storage or mutate file metadata.
- Add new file editing capabilities beyond temporary preview transforms.
- Redesign the broader validation workspace layout.

## Current Context

The validator flow already reuses the assessor MOV viewer path.

- [`MiddleMovFilesPanel.tsx`](/home/kiedajhinn/Projects/sinag/apps/web/src/components/features/assessor/validation/MiddleMovFilesPanel.tsx)
  owns the main assessor/validator file preview modal.
- [`ValidatorValidationClient.tsx`](/home/kiedajhinn/Projects/sinag/apps/web/src/components/features/validator/ValidatorValidationClient.tsx)
  imports that shared panel, so improvements there will affect both roles.
- [`PdfAnnotator.tsx`](/home/kiedajhinn/Projects/sinag/apps/web/src/components/shared/PdfAnnotator.tsx)
  renders PDF previews and annotation highlights.
- [`ImageAnnotator.tsx`](/home/kiedajhinn/Projects/sinag/apps/web/src/components/shared/ImageAnnotator.tsx)
  renders image previews and annotation rectangles.
- [`FileList.tsx`](/home/kiedajhinn/Projects/sinag/apps/web/src/components/features/movs/FileList.tsx)
  also uses the annotators for read-only preview dialogs in related MOV experiences.

This makes the feature a shared viewer concern, not separate assessor and validator features.

## User Experience

When a reviewer opens a previewable MOV file:

- Images show controls for zoom in, zoom out, reset, rotate left, and rotate right.
- PDFs show the same controls.
- The controls affect only the current viewer state.
- Closing the preview or opening a different file resets zoom and rotation to defaults.

Default behavior:

- Zoom starts at 100%.
- Zoom uses 25% steps.
- Zoom is bounded between 50% and 300%.
- Rotation starts at `0deg`.
- Rotate actions move in `90deg` increments.

Expected outcome:

- Reviewers can re-orient sideways uploads.
- Reviewers can enlarge small text without downloading the file.
- Existing comment and note workflows remain intact.

## Recommended Approach

Implement the controls inside the shared annotator components rather than in route-specific
containers.

### Why this approach

- It automatically covers both assessor and validator flows because they already share the same
  preview stack.
- It avoids duplicating zoom and rotation state in multiple modal wrappers.
- It keeps preview behavior consistent anywhere the annotators are reused.

### Rejected alternatives

Add controls only inside assessor/validator modal containers:

- Would duplicate logic across modal entry points.
- Would make it easier for assessor and validator behavior to drift.
- Would still require extra work to keep annotations visually aligned with the transformed content.

Introduce a new wrapper component around both annotators:

- Reasonable long-term, but unnecessary for this feature alone.
- Adds an extra abstraction layer before there is evidence of broader preview-toolbar complexity.

## Design Details

### Shared Viewer Controls

Add a compact toolbar to both annotators with:

- `Zoom out`
- `Zoom in`
- `Reset view`
- `Rotate left`
- `Rotate right`

The toolbar should sit inside the preview region so it is available in all existing modal/dialog
contexts. Button labels and `aria-label`s should be explicit because these controls are functional,
not decorative.

### Image Preview Behavior

[`ImageAnnotator.tsx`](/home/kiedajhinn/Projects/sinag/apps/web/src/components/shared/ImageAnnotator.tsx)
should own:

- local `zoom` state
- local `rotation` state
- reset logic when `url` changes

The displayed image and its annotation overlay must remain in the same transformed coordinate space.
This means the transform should apply to the same visual container used to compute and render
annotation rectangles, not only to the raw `<img>` element.

Annotation mode must continue to work:

- existing annotations render in the correct spot after zoom/rotation
- drawing a new annotation uses the transformed viewer coordinates correctly
- read-only validator preview still benefits from the same controls

### PDF Preview Behavior

[`PdfAnnotator.tsx`](/home/kiedajhinn/Projects/sinag/apps/web/src/components/shared/PdfAnnotator.tsx)
should own:

- local `zoom` state
- local `rotation` state
- reset logic when `url` changes

Use the PDF viewer's own zoom and rotation support where possible instead of layering custom CSS
transforms over the entire rendered document. That keeps page layout, text selection, and highlight
placement consistent with the PDF engine.

Annotation highlights must remain aligned after zoom and rotation:

- existing highlight boxes still appear over the correct content
- selection-to-annotation flow continues to resolve the right page and bounds

### Reset Behavior

Viewer state resets when:

- the selected file changes
- the preview modal closes and reopens

Viewer state does not need to survive navigation between files in the same gallery. Each file starts
from the default reading orientation and zoom.

## Component Boundaries

Expected implementation surface:

- Modify
  [`PdfAnnotator.tsx`](/home/kiedajhinn/Projects/sinag/apps/web/src/components/shared/PdfAnnotator.tsx)
  for PDF controls and state.
- Modify
  [`ImageAnnotator.tsx`](/home/kiedajhinn/Projects/sinag/apps/web/src/components/shared/ImageAnnotator.tsx)
  for image controls and state.
- Make only minimal integration changes in
  [`MiddleMovFilesPanel.tsx`](/home/kiedajhinn/Projects/sinag/apps/web/src/components/features/assessor/validation/MiddleMovFilesPanel.tsx)
  and
  [`FileList.tsx`](/home/kiedajhinn/Projects/sinag/apps/web/src/components/features/movs/FileList.tsx)
  if needed for reset keys or layout fit.

No backend or generated shared contract changes are required.

## Error Handling

- If a file fails to load, existing loading and error states remain unchanged.
- If a file type is not previewable, existing fallback behavior remains unchanged.
- Control state should never block the existing "open in new tab" or download fallback paths.

## Testing Strategy

### Automated

Add or update frontend tests to cover:

- image viewer toolbar renders expected controls
- PDF viewer toolbar renders expected controls
- zoom and rotation state update through user interaction
- state resets when the viewer receives a different file URL
- validator and assessor preview flows both reach the same shared viewer behavior

### Manual

Manual verification is required for:

- image annotation rectangles staying aligned after zoom and rotation
- PDF highlight placement and selection still behaving correctly after zoom and rotation
- modal layout staying usable on common desktop and laptop sizes

## Risks

### Annotation alignment drift

This is the main technical risk. If transforms are applied at the wrong DOM layer, overlays can
drift away from the file content.

Mitigation:

- keep image transforms and annotation overlay in one coordinate system
- prefer PDF viewer native zoom/rotation APIs over external CSS transforms
- manually verify both existing and newly created annotations

### Layout crowding

The current dialogs already contain notes and sidebars in some flows. Toolbar placement must avoid
stealing too much vertical space or causing overflow regressions.

Mitigation:

- keep the toolbar compact
- reuse existing spacing tokens and button variants
- verify in both assessor and validator modal compositions

## Rollout Notes

Because this is a shared frontend-only enhancement with temporary state, rollout can ship as a
normal web change with no migration or API coordination.
