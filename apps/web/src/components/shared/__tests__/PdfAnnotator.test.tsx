import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PdfAnnotator from "../PdfAnnotator";

vi.mock("@react-pdf-viewer/core", () => ({
  SpecialZoomLevel: { PageWidth: "PageWidth" },
  Viewer: () => <div data-testid="pdf-viewer" />,
  Worker: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@react-pdf-viewer/highlight", () => ({
  highlightPlugin: vi.fn(() => ({})),
}));

describe("PdfAnnotator", () => {
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
