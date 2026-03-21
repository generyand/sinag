import type { ReactNode } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PdfAnnotator from "../PdfAnnotator";

const {
  mockViewer,
  mockHighlightPlugin,
  mockZoomPlugin,
  mockZoomTo,
  mockRotatePlugin,
  mockRotate,
  highlightPluginInstances,
  zoomPluginInstances,
  rotatePluginInstances,
} = vi.hoisted(() => ({
  mockViewer: vi.fn(),
  mockHighlightPlugin: vi.fn(),
  mockZoomPlugin: vi.fn(),
  mockZoomTo: vi.fn(),
  mockRotatePlugin: vi.fn(),
  mockRotate: vi.fn(),
  highlightPluginInstances: [] as Array<{ name: string }>,
  zoomPluginInstances: [] as Array<{ zoomTo: ReturnType<typeof vi.fn> }>,
  rotatePluginInstances: [] as Array<{
    Rotate: ({
      direction,
      children,
    }: {
      direction: string;
      children: (props: { onClick: () => void }) => ReactNode;
    }) => ReactNode;
  }>,
}));

vi.mock("@react-pdf-viewer/core", () => ({
  RotateDirection: {
    Backward: "Backward",
    Forward: "Forward",
  },
  SpecialZoomLevel: { PageWidth: "PageWidth" },
  Viewer: (props: Record<string, unknown>) => {
    mockViewer(props);
    const highlightOptions = mockHighlightPlugin.mock.calls.at(-1)?.[0] as
      | {
          renderHighlights?: (props: {
            pageIndex: number;
            getCssProperties: (rect: {
              left: number;
              top: number;
              width: number;
              height: number;
            }) => Record<string, string>;
          }) => ReactNode;
        }
      | undefined;
    return (
      <div data-testid="pdf-viewer">
        <div data-page-number="1" className="rpv-core__inner-page">
          <div className="rpv-core__page-layer" />
          {highlightOptions?.renderHighlights?.({
            pageIndex: 0,
            getCssProperties: ({ left, top, width, height }) => ({
              left: `${left}%`,
              top: `${top}%`,
              width: `${width}%`,
              height: `${height}%`,
            }),
          })}
        </div>
      </div>
    );
  },
  Worker: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@react-pdf-viewer/highlight", () => ({
  highlightPlugin: mockHighlightPlugin.mockImplementation(() => {
    const instance = { name: `highlight-plugin-${highlightPluginInstances.length}` };
    highlightPluginInstances.push(instance);
    return instance;
  }),
}));

vi.mock("@react-pdf-viewer/zoom", () => ({
  zoomPlugin: mockZoomPlugin.mockImplementation(() => {
    const instance = { zoomTo: mockZoomTo };
    zoomPluginInstances.push(instance);
    return instance;
  }),
}));

vi.mock("@react-pdf-viewer/rotate", () => ({
  rotatePlugin: mockRotatePlugin.mockImplementation(() => {
    const instance = {
      Rotate: ({
        direction,
        children,
      }: {
        direction: string;
        children: (props: { onClick: () => void }) => ReactNode;
      }) => children({ onClick: () => mockRotate(direction) }),
    };
    rotatePluginInstances.push(instance);
    return instance;
  }),
}));

describe("PdfAnnotator", () => {
  beforeEach(() => {
    mockViewer.mockClear();
    mockHighlightPlugin.mockClear();
    mockZoomPlugin.mockClear();
    mockZoomTo.mockClear();
    mockRotatePlugin.mockClear();
    mockRotate.mockClear();
    highlightPluginInstances.length = 0;
    zoomPluginInstances.length = 0;
    rotatePluginInstances.length = 0;
  });

  it("recreates the pdf viewer state when resetting the view and when the file changes", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PdfAnnotator url="/test.pdf" annotateEnabled={false} annotations={[]} onAdd={vi.fn()} />
    );

    const initialHighlightCalls = mockHighlightPlugin.mock.calls.length;
    const initialZoomCalls = mockZoomPlugin.mock.calls.length;
    const initialRotateCalls = mockRotatePlugin.mock.calls.length;

    await user.click(screen.getByRole("button", { name: /rotate right/i }));
    await user.click(screen.getByRole("button", { name: /reset view/i }));

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(mockHighlightPlugin.mock.calls.length).toBeGreaterThan(initialHighlightCalls);
    expect(mockZoomPlugin.mock.calls.length).toBeGreaterThan(initialZoomCalls);
    expect(mockRotatePlugin.mock.calls.length).toBeGreaterThan(initialRotateCalls);

    const afterResetHighlightCalls = mockHighlightPlugin.mock.calls.length;
    const afterResetZoomCalls = mockZoomPlugin.mock.calls.length;
    const afterResetRotateCalls = mockRotatePlugin.mock.calls.length;

    rerender(
      <PdfAnnotator url="/second.pdf" annotateEnabled={false} annotations={[]} onAdd={vi.fn()} />
    );

    expect(mockHighlightPlugin.mock.calls.length).toBeGreaterThan(afterResetHighlightCalls);
    expect(mockZoomPlugin.mock.calls.length).toBeGreaterThan(afterResetZoomCalls);
    expect(mockRotatePlugin.mock.calls.length).toBeGreaterThan(afterResetRotateCalls);
  });

  it("calls plugin methods for zoom and rotation and resets when the file changes", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PdfAnnotator url="/test.pdf" annotateEnabled={false} annotations={[]} onAdd={vi.fn()} />
    );

    expect(screen.getByTestId("pdf-viewer")).toBeInTheDocument();
    expect(mockViewer).toHaveBeenCalledWith(
      expect.objectContaining({
        fileUrl: "/test.pdf",
        plugins: expect.arrayContaining([
          highlightPluginInstances[0],
          zoomPluginInstances[0],
          rotatePluginInstances[0],
        ]),
      })
    );

    await user.click(screen.getByRole("button", { name: /zoom in/i }));
    expect(screen.getByText("125%")).toBeInTheDocument();
    expect(mockZoomTo).toHaveBeenCalledWith(1.25);

    await user.click(screen.getByRole("button", { name: /rotate right/i }));
    expect(mockRotate).toHaveBeenCalledWith("Forward");

    rerender(
      <PdfAnnotator url="/second.pdf" annotateEnabled={false} annotations={[]} onAdd={vi.fn()} />
    );

    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("exposes shared preview controls", () => {
    render(
      <PdfAnnotator url="/test.pdf" annotateEnabled={false} annotations={[]} onAdd={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: /zoom in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /zoom out/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset view/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rotate left/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rotate right/i })).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("uses the branded comment dialog when adding a highlight annotation", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    render(<PdfAnnotator url="/test.pdf" annotateEnabled={true} annotations={[]} onAdd={onAdd} />);

    const highlightOptions = mockHighlightPlugin.mock.calls[0]?.[0] as {
      renderHighlightTarget: (props: Record<string, unknown>) => ReactNode;
    };

    render(
      <>
        {highlightOptions.renderHighlightTarget({
          selectionRegion: { left: 10, top: 20, width: 30, height: 5 },
          selectedText: { position: { pageIndex: 2 } },
        })}
      </>
    );

    await user.click(screen.getByRole("button", { name: /add comment/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Add highlight comment")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Highlight comment"), "Needs clearer label");
    await user.click(screen.getByRole("button", { name: /save comment/i }));

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "pdfRect",
        page: 2,
        comment: "Needs clearer label",
      })
    );
  });

  it("allows drawing a rectangle annotation on a PDF page", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    render(<PdfAnnotator url="/test.pdf" annotateEnabled annotations={[]} onAdd={onAdd} />);

    await user.click(screen.getByRole("button", { name: /draw box/i }));

    const drawLayer = screen.getByTestId("pdf-draw-layer");
    const page = document.querySelector('[data-page-number="1"]') as HTMLDivElement;

    vi.spyOn(drawLayer, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 600,
      right: 400,
      width: 400,
      height: 600,
      toJSON: () => ({}),
    });

    vi.spyOn(page, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 600,
      right: 400,
      width: 400,
      height: 600,
      toJSON: () => ({}),
    });

    Object.defineProperty(document, "elementsFromPoint", {
      configurable: true,
      value: vi.fn(() => [page]),
    });

    fireEvent.mouseDown(drawLayer, { clientX: 40, clientY: 60 });
    fireEvent.mouseMove(drawLayer, { clientX: 200, clientY: 240 });
    fireEvent.mouseUp(drawLayer, { clientX: 200, clientY: 240 });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Highlight comment"), "Box this section");
    await user.click(screen.getByRole("button", { name: /save comment/i }));

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "pdfRect",
        page: 0,
        comment: "Box this section",
        rect: expect.objectContaining({
          x: 10,
          y: 10,
          w: 40,
          h: 30,
        }),
      })
    );
  });

  it("re-locates the same annotation when a new focus request is issued", async () => {
    vi.useFakeTimers();
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    const annotations = [
      {
        id: "42",
        type: "pdfRect" as const,
        page: 0,
        rect: { x: 10, y: 20, w: 30, h: 5 },
        comment: "Repeated focus target",
        createdAt: "2026-03-21T00:00:00.000Z",
      },
    ];

    const { rerender } = render(
      <PdfAnnotator
        url="/test.pdf"
        annotateEnabled={false}
        annotations={annotations}
        onAdd={vi.fn()}
      />
    );

    rerender(
      <PdfAnnotator
        url="/test.pdf"
        annotateEnabled={false}
        annotations={annotations}
        onAdd={vi.fn()}
        focusAnnotationId="42"
        focusRequestNonce={1}
      />
    );

    await vi.runAllTimersAsync();
    const firstCallCount = scrollIntoView.mock.calls.length;

    rerender(
      <PdfAnnotator
        url="/test.pdf"
        annotateEnabled={false}
        annotations={annotations}
        onAdd={vi.fn()}
        focusAnnotationId="42"
        focusRequestNonce={2}
      />
    );

    await vi.runAllTimersAsync();

    expect(scrollIntoView.mock.calls.length).toBeGreaterThan(firstCallCount);

    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    vi.useRealTimers();
  });
});
