import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
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
    return <div data-testid="pdf-viewer" />;
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
});
