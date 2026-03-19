import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PdfAnnotator from "../PdfAnnotator";

const {
  mockViewer,
  mockHighlightPlugin,
  mockHighlightPluginInstance,
  mockZoomPlugin,
  mockZoomPluginInstance,
  mockZoomTo,
  mockRotatePlugin,
  mockRotatePluginInstance,
  mockRotate,
} = vi.hoisted(() => ({
  mockViewer: vi.fn(),
  mockHighlightPlugin: vi.fn(),
  mockHighlightPluginInstance: { name: "highlight-plugin" },
  mockZoomPlugin: vi.fn(),
  mockZoomPluginInstance: { zoomTo: vi.fn() },
  mockZoomTo: vi.fn(),
  mockRotatePlugin: vi.fn(),
  mockRotatePluginInstance: { rotate: vi.fn() },
  mockRotate: vi.fn(),
}));

vi.mock("@react-pdf-viewer/core", () => ({
  SpecialZoomLevel: { PageWidth: "PageWidth" },
  Viewer: (props: Record<string, unknown>) => {
    mockViewer(props);
    return <div data-testid="pdf-viewer" />;
  },
  Worker: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@react-pdf-viewer/highlight", () => ({
  highlightPlugin: mockHighlightPlugin.mockReturnValue(mockHighlightPluginInstance),
}));

vi.mock("@react-pdf-viewer/zoom", () => ({
  zoomPlugin: mockZoomPlugin.mockImplementation(() => {
    mockZoomPluginInstance.zoomTo = mockZoomTo;
    return mockZoomPluginInstance;
  }),
}));

vi.mock("@react-pdf-viewer/rotate", () => ({
  RotateDirection: {
    Backward: "Backward",
    Forward: "Forward",
  },
  rotatePlugin: mockRotatePlugin.mockImplementation(() => {
    mockRotatePluginInstance.rotate = mockRotate;
    return mockRotatePluginInstance;
  }),
}));

describe("PdfAnnotator", () => {
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
          mockHighlightPluginInstance,
          mockZoomPluginInstance,
          mockRotatePluginInstance,
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
