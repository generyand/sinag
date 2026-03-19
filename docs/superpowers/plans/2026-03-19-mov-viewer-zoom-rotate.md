# MOV Viewer Zoom and Rotate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add temporary zoom and rotation controls to the shared image and PDF MOV previewers so
assessors and validators can read uploaded files more clearly without modifying stored files.

**Architecture:** The feature should be implemented in the shared preview components, not in
role-specific pages. A small shared toolbar component can provide consistent controls, while
`ImageAnnotator` and `PdfAnnotator` each own their local view state and reset logic. Existing
assessor and validator preview entrypoints should only need minimal integration changes, mainly to
ensure per-file/per-open reset behavior remains correct.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Testing Library, `@react-pdf-viewer/core`,
`lucide-react`

---

## File Structure

- Create: `apps/web/src/components/shared/MovPreviewControls.tsx` Reusable toolbar UI for zoom
  in/out, reset, rotate left, rotate right, and the current zoom label.
- Create: `apps/web/src/components/shared/__tests__/ImageAnnotator.test.tsx` Unit tests for image
  preview controls, state reset, and transformed annotation behavior.
- Create: `apps/web/src/components/shared/__tests__/PdfAnnotator.test.tsx` Unit tests for PDF
  preview controls, state reset, and viewer prop wiring.
- Modify: `apps/web/src/components/shared/ImageAnnotator.tsx` Add local zoom/rotation state, toolbar
  integration, and transformed image/annotation layout.
- Modify: `apps/web/src/components/shared/PdfAnnotator.tsx` Add local zoom/rotation state, toolbar
  integration, and native PDF viewer zoom/rotation wiring.
- Optional modify: `apps/web/package.json` Add matching `@react-pdf-viewer` zoom/rotate packages if
  the current `core` install does not expose usable runtime controls by itself.
- Modify: `apps/web/src/components/features/assessor/validation/MiddleMovFilesPanel.tsx` Verify the
  annotator subtree remounts or resets cleanly when the selected file changes in assessor/validator
  validation.
- Modify: `apps/web/src/components/features/movs/FileList.tsx` Verify read-only preview dialogs also
  receive the new shared viewer behavior and reset semantics.
- Optional modify if test support is needed:
  `apps/web/src/components/features/forms/fields/__tests__/FileFieldComponent.test.tsx` Update any
  mocks if the shared preview component tree changes ripple into existing MOV preview tests.

## Constants and Behavior To Preserve

- Default zoom: `100`
- Zoom step: `25`
- Minimum zoom: `50`
- Maximum zoom: `300`
- Rotation sequence: `0`, `90`, `180`, `270`
- Reset conditions:
  - new file URL
  - preview close/reopen
- No persistence to backend, storage, or local storage
- No API or generated type changes

### Task 1: Add Shared Preview Controls

**Files:**

- Create: `apps/web/src/components/shared/MovPreviewControls.tsx`
- Test: `apps/web/src/components/shared/__tests__/ImageAnnotator.test.tsx`
- Test: `apps/web/src/components/shared/__tests__/PdfAnnotator.test.tsx`

- [ ] **Step 1: Write the failing tests for the toolbar contract**

Add test cases that expect both annotators to expose:

```tsx
expect(screen.getByRole("button", { name: /zoom in/i })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /zoom out/i })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /reset view/i })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /rotate left/i })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /rotate right/i })).toBeInTheDocument();
expect(screen.getByText("100%")).toBeInTheDocument();
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run:

```bash
cd apps/web && pnpm test -- --run src/components/shared/__tests__/ImageAnnotator.test.tsx src/components/shared/__tests__/PdfAnnotator.test.tsx
```

Expected: FAIL because the toolbar component and controls do not exist yet.

- [ ] **Step 3: Implement the reusable toolbar**

Create `MovPreviewControls.tsx` with a focused API such as:

```tsx
interface MovPreviewControlsProps {
  zoom: number;
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
}
```

Use compact button styling consistent with the existing validation dialogs and explicit
`aria-label`s for every action.

- [ ] **Step 4: Run the targeted tests to verify the toolbar contract passes**

Run:

```bash
cd apps/web && pnpm test -- --run src/components/shared/__tests__/ImageAnnotator.test.tsx src/components/shared/__tests__/PdfAnnotator.test.tsx
```

Expected: PASS for the control rendering assertions after wiring the toolbar into both annotators in
later tasks, or partial pass if the toolbar-only tests are isolated first.

- [ ] **Step 5: Commit the toolbar foundation**

```bash
git add apps/web/src/components/shared/MovPreviewControls.tsx apps/web/src/components/shared/__tests__/ImageAnnotator.test.tsx apps/web/src/components/shared/__tests__/PdfAnnotator.test.tsx
git commit -m "feat(web): add shared MOV preview controls"
```

### Task 2: Add Zoom and Rotation to Image Preview

**Files:**

- Modify: `apps/web/src/components/shared/ImageAnnotator.tsx`
- Test: `apps/web/src/components/shared/__tests__/ImageAnnotator.test.tsx`

- [ ] **Step 1: Write the failing image viewer behavior tests**

Add tests that cover:

```tsx
await user.click(screen.getByRole("button", { name: /zoom in/i }));
expect(screen.getByText("125%")).toBeInTheDocument();

await user.click(screen.getByRole("button", { name: /rotate right/i }));
expect(screen.getByTestId("image-annotator-stage")).toHaveStyle({
  transform: expect.stringContaining("rotate(90deg)"),
});

rerender(<ImageAnnotator url="second-image.jpg" annotations={[]} annotateEnabled={false} />);
expect(screen.getByText("100%")).toBeInTheDocument();
expect(screen.getByTestId("image-annotator-stage")).toHaveStyle({
  transform: expect.stringContaining("rotate(0deg)"),
});
```

- [ ] **Step 2: Run the image annotator test file to verify it fails**

Run:

```bash
cd apps/web && pnpm test -- --run src/components/shared/__tests__/ImageAnnotator.test.tsx
```

Expected: FAIL because `ImageAnnotator` currently has no toolbar, no zoom state, and no rotation
state.

- [ ] **Step 3: Implement image view state and transformed rendering**

Update `ImageAnnotator.tsx` to:

```tsx
const DEFAULT_ZOOM = 100;
const ZOOM_STEP = 25;
const MIN_ZOOM = 50;
const MAX_ZOOM = 300;

const [zoom, setZoom] = useState(DEFAULT_ZOOM);
const [rotation, setRotation] = useState(0);

useEffect(() => {
  setZoom(DEFAULT_ZOOM);
  setRotation(0);
  setCurrentRect(null);
  setPendingRect(null);
}, [url]);
```

Add a dedicated stage wrapper, for example:

```tsx
<div data-testid="image-annotator-stage" style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)` }}>
  <img ... />
  {/* overlays */}
</div>
```

Important implementation constraint:

- apply the transform to the same visual stage used by the image and overlay rectangles so
  annotations stay aligned
- refresh layout after zoom/rotation changes so percent-to-pixel math uses the transformed geometry
- reset all file-specific state on `url` change, not only `zoom` and `rotation`

Explicit reset checklist on `url` change:

```tsx
setZoom(DEFAULT_ZOOM);
setRotation(0);
setIsDrawing(false);
setCurrentRect(null);
setStartPoint(null);
setShowCommentInput(false);
setComment("");
setPendingRect(null);
setImageLoaded(false);
setLayout(null);
```

Do not leave stale overlays or comment modals attached to the previous file.

For rotation math, store annotation rectangles in the original unrotated image coordinate space and
map between rotated display coordinates and stored coordinates with explicit helpers.

Use forward transforms for rendering existing rectangles:

```ts
// clockwise rotation
0:   { x, y, w, h }
90:  { x: 100 - (y + h), y: x, w: h, h: w }
180: { x: 100 - (x + w), y: 100 - (y + h), w, h }
270: { x: y, y: 100 - (x + w), w: h, h: w }
```

Use the inverse of those transforms when converting pointer coordinates from the rotated display
back into the stored unrotated coordinate system before writing a new annotation rect.

Implementation note:

- compute pointer percentages from the visible rotated stage
- normalize those percentages back into the base orientation
- only then build `currentRect` and persisted annotation coordinates

- [ ] **Step 4: Run the image annotator test file to verify it passes**

Run:

```bash
cd apps/web && pnpm test -- --run src/components/shared/__tests__/ImageAnnotator.test.tsx
```

Expected: PASS for zoom, rotate, and reset behavior.

- [ ] **Step 5: Commit the image preview changes**

```bash
git add apps/web/src/components/shared/ImageAnnotator.tsx apps/web/src/components/shared/__tests__/ImageAnnotator.test.tsx apps/web/src/components/shared/MovPreviewControls.tsx
git commit -m "feat(web): add image MOV zoom and rotation controls"
```

### Task 3: Add Zoom and Rotation to PDF Preview

**Files:**

- Modify: `apps/web/src/components/shared/PdfAnnotator.tsx`
- Optional modify: `apps/web/package.json`
- Optional modify: `pnpm-lock.yaml`
- Test: `apps/web/src/components/shared/__tests__/PdfAnnotator.test.tsx`

- [ ] **Step 1: Write the failing PDF viewer behavior tests against plugin method calls**

Mock `@react-pdf-viewer/core`, `@react-pdf-viewer/zoom`, and `@react-pdf-viewer/rotate` so the test
can assert the integration contract without relying on a real PDF render:

```tsx
const mockZoomTo = vi.fn();
const mockRotate = vi.fn();

await user.click(screen.getByRole("button", { name: /zoom in/i }));
expect(screen.getByText("125%")).toBeInTheDocument();
expect(mockZoomTo).toHaveBeenCalledWith(1.25);

await user.click(screen.getByRole("button", { name: /rotate right/i }));
expect(mockRotate).toHaveBeenCalledWith("Forward");
```

Also add assertions that:

- `Viewer` still renders for the requested `fileUrl`
- the `highlightPlugin`, `zoomPluginInstance`, and `rotatePluginInstance` are all included in the
  `plugins` array
- rerendering with a new `url` resets the toolbar label to `100%`

- [ ] **Step 2: Run the PDF annotator test file to verify it fails**

Run:

```bash
cd apps/web && pnpm test -- --run src/components/shared/__tests__/PdfAnnotator.test.tsx
```

Expected: FAIL because `PdfAnnotator` currently does not manage zoom/rotation state or forward
rotation props. Expected: FAIL because `PdfAnnotator` currently does not manage zoom/rotation state
or call the PDF viewer zoom/rotate plugin methods.

- [ ] **Step 3: Implement PDF view state with native viewer APIs**

Update `PdfAnnotator.tsx` to:

```tsx
const [zoom, setZoom] = React.useState(100);
const [rotation, setRotation] = React.useState(0);

React.useEffect(() => {
  setZoom(100);
  setRotation(0);
}, [url]);
```

Prefer wiring `Viewer` with native `@react-pdf-viewer` controls instead of wrapping the full PDF DOM
in CSS transforms.

Concrete implementation path:

- keep the existing `highlightPlugin`
- add matching-version `@react-pdf-viewer/zoom` and `@react-pdf-viewer/rotate` packages if they are
  not already installed
- if those packages are missing, install them from `apps/web` and commit both
  `apps/web/package.json` and `pnpm-lock.yaml`
- initialize the plugin instances inside `PdfAnnotator`
- route toolbar actions through the plugin APIs so scale and rotation happen inside the PDF viewer,
  not outside it

Example shape:

```tsx
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import { rotatePlugin, RotateDirection } from "@react-pdf-viewer/rotate";

const zoomPluginInstance = zoomPlugin();
const rotatePluginInstance = rotatePlugin();

<Viewer
  fileUrl={url}
  plugins={[highlightPluginInstance, zoomPluginInstance, rotatePluginInstance]}
/>;
```

Expected toolbar wiring contract:

```tsx
const handleZoomOut = () => {
  const nextZoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP);
  setZoom(nextZoom);
  zoomPluginInstance.zoomTo(nextZoom / 100);
};

const handleZoomIn = () => {
  const nextZoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP);
  setZoom(nextZoom);
  zoomPluginInstance.zoomTo(nextZoom / 100);
};

const handleRotateLeft = () => {
  const nextRotation = (rotation + 270) % 360;
  setRotation(nextRotation);
  rotatePluginInstance.rotate(RotateDirection.Backward);
};

const handleRotateRight = () => {
  const nextRotation = (rotation + 90) % 360;
  setRotation(nextRotation);
  rotatePluginInstance.rotate(RotateDirection.Forward);
};

const handleReset = () => {
  setZoom(DEFAULT_ZOOM);
  setRotation(0);
  zoomPluginInstance.zoomTo(DEFAULT_ZOOM / 100);
};
```

Keep local `zoom` and `rotation` state as the source of truth for the toolbar label and reset
behavior. The tests for Task 3 should mirror this contract exactly by asserting the matching
`zoomTo(...)` and `rotate(...)` calls for each toolbar action. Do not fall back to CSS rotation for
PDFs.

Important implementation constraint:

- do not break selection-based annotation capture or highlight rendering
- keep the highlight plugin instance lifecycle unchanged unless a real bug requires adjustment
- if plugin installation is required, pin package versions to the same `3.12.0` family as
  `@react-pdf-viewer/core`

- [ ] **Step 4: Run the PDF annotator test file to verify it passes**

Run:

```bash
cd apps/web && pnpm test -- --run src/components/shared/__tests__/PdfAnnotator.test.tsx
```

Expected: PASS for zoom, rotate, and reset behavior.

- [ ] **Step 5: Commit the PDF preview changes**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/components/shared/PdfAnnotator.tsx apps/web/src/components/shared/__tests__/PdfAnnotator.test.tsx apps/web/src/components/shared/MovPreviewControls.tsx
git commit -m "feat(web): add PDF MOV zoom and rotation controls"
```

### Task 4: Verify Assessor and Validator Preview Integration

**Files:**

- Modify: `apps/web/src/components/features/assessor/validation/MiddleMovFilesPanel.tsx`
- Modify: `apps/web/src/components/features/movs/FileList.tsx`
- Optional modify:
  `apps/web/src/components/features/forms/fields/__tests__/FileFieldComponent.test.tsx`

- [ ] **Step 1: Write or extend integration tests for shared preview reset behavior**

Add tests around whichever entrypoint is easiest to exercise without excessive mocking. The minimum
useful assertions are:

```tsx
// Open first file preview, change controls, close, reopen another file
expect(screen.getByText("100%")).toBeInTheDocument();
expect(screen.getByRole("button", { name: /rotate right/i })).toBeInTheDocument();
```

If existing validation integration tests are too heavy, add focused assertions around `FileList`
dialog behavior instead and document that `MiddleMovFilesPanel` inherits the same annotator
behavior.

- [ ] **Step 2: Run the targeted integration test slice to verify it fails**

Run either the new targeted preview test or the smallest existing affected test file, for example:

```bash
cd apps/web && pnpm test -- --run src/components/features/forms/fields/__tests__/FileFieldComponent.test.tsx
```

Expected: FAIL only if existing mocks or dialog assumptions no longer match the new shared preview
structure.

- [ ] **Step 3: Make the minimal integration updates**

Use keyed remounts only if reset-by-URL is insufficient in one of the dialogs. For example:

```tsx
<ImageAnnotator key={file.id} ... />
<PdfAnnotator key={file.id} ... />
```

or at the preview container level:

```tsx
<SecureFileViewer key={`${file.id}-${dialogOpen ? "open" : "closed"}`} ... />
```

Prefer the smallest possible integration change and keep preview ownership in the shared annotators.

- [ ] **Step 4: Run the affected integration tests to verify they pass**

Run:

```bash
cd apps/web && pnpm test -- --run src/components/features/forms/fields/__tests__/FileFieldComponent.test.tsx
```

Expected: PASS for the affected preview entrypoint tests after mocks and reset behavior are updated.

- [ ] **Step 5: Commit the integration adjustments**

```bash
git add apps/web/src/components/features/assessor/validation/MiddleMovFilesPanel.tsx apps/web/src/components/features/movs/FileList.tsx apps/web/src/components/features/forms/fields/__tests__/FileFieldComponent.test.tsx
git commit -m "fix(web): reset shared MOV preview state across dialogs"
```

### Task 5: Full Validation and Manual Review

**Files:**

- Modify: `apps/web/src/components/shared/MovPreviewControls.tsx`
- Modify: `apps/web/src/components/shared/ImageAnnotator.tsx`
- Modify: `apps/web/src/components/shared/PdfAnnotator.tsx`
- Optional modify: `apps/web/package.json`
- Modify: `apps/web/src/components/features/assessor/validation/MiddleMovFilesPanel.tsx`
- Modify: `apps/web/src/components/features/movs/FileList.tsx`
- Test: `apps/web/src/components/shared/__tests__/ImageAnnotator.test.tsx`
- Test: `apps/web/src/components/shared/__tests__/PdfAnnotator.test.tsx`

- [ ] **Step 1: Run the focused frontend test suite for all affected files**

Run:

```bash
cd apps/web && pnpm test -- --run src/components/shared/__tests__/ImageAnnotator.test.tsx src/components/shared/__tests__/PdfAnnotator.test.tsx src/components/features/forms/fields/__tests__/FileFieldComponent.test.tsx
```

Expected: PASS

- [ ] **Step 2: Run lint for the frontend workspace**

Run:

```bash
cd apps/web && pnpm lint
```

Expected: PASS

- [ ] **Step 3: Perform manual validation in both review flows**

Check all of the following in the running app:

- assessor preview can zoom images
- assessor preview can rotate images
- assessor preview can zoom PDFs
- assessor preview can rotate PDFs
- validator preview shows the same controls
- switching files resets to `100%` and `0deg`
- closing and reopening a preview resets to `100%` and `0deg`
- existing annotations still line up after zoom/rotation
- creating a new annotation still lands in the correct place after zoom/rotation

- [ ] **Step 4: Run a final repo-level frontend test command from the monorepo root**

Run:

```bash
pnpm test:web
```

Expected: PASS

- [ ] **Step 5: Commit the verified feature**

```bash
git add apps/web/package.json apps/web/src/components/shared/MovPreviewControls.tsx apps/web/src/components/shared/ImageAnnotator.tsx apps/web/src/components/shared/PdfAnnotator.tsx apps/web/src/components/features/assessor/validation/MiddleMovFilesPanel.tsx apps/web/src/components/features/movs/FileList.tsx apps/web/src/components/shared/__tests__/ImageAnnotator.test.tsx apps/web/src/components/shared/__tests__/PdfAnnotator.test.tsx apps/web/src/components/features/forms/fields/__tests__/FileFieldComponent.test.tsx
git commit -m "feat(web): add MOV viewer zoom and rotation controls"
```
