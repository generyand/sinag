import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MovPreviewHelp } from "../MovPreviewHelp";

const mockUseAuthStore = vi.fn();

vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: (selector: (state: { user: { id: number } | null }) => unknown) =>
    mockUseAuthStore(selector),
}));

describe("MovPreviewHelp", () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseAuthStore.mockImplementation((selector) => selector({ user: { id: 42 } }));
  });

  it("auto-opens once per user and mode", () => {
    render(<MovPreviewHelp mode="pdf" />);

    expect(screen.getByText("PDF preview help")).toBeInTheDocument();
    expect(localStorage.getItem("mov-preview-help:v1:42:pdf")).toBe("seen");
  });

  it("does not auto-open after the mode has already been seen", () => {
    localStorage.setItem("mov-preview-help:v1:42:pdf", "seen");

    render(<MovPreviewHelp mode="pdf" />);

    expect(screen.queryByText("PDF preview help")).not.toBeInTheDocument();
  });

  it("does not auto-open while disabled", () => {
    render(<MovPreviewHelp mode="pdf" enabled={false} />);

    expect(screen.queryByText("PDF preview help")).not.toBeInTheDocument();
    expect(localStorage.getItem("mov-preview-help:v1:42:pdf")).toBeNull();
  });

  it("can be reopened from the help button", async () => {
    const user = userEvent.setup();
    localStorage.setItem("mov-preview-help:v1:42:video", "seen");

    render(<MovPreviewHelp mode="video" />);

    await user.click(screen.getByRole("button", { name: /open video preview help/i }));

    expect(screen.getByText("Video preview help")).toBeInTheDocument();
    expect(screen.getByText(/video previews let you review motion/i)).toBeInTheDocument();
  });
});
