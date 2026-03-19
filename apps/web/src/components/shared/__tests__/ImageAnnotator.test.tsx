import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ImageAnnotator from "../ImageAnnotator";

describe("ImageAnnotator", () => {
  it("exposes shared preview controls", () => {
    render(<ImageAnnotator url="/test-image.png" annotateEnabled={false} />);

    expect(screen.getByRole("button", { name: /zoom in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /zoom out/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset view/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rotate left/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rotate right/i })).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("updates zoom and rotation controls and resets when the file changes", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ImageAnnotator url="/test-image.png" annotateEnabled={false} />);

    await user.click(screen.getByRole("button", { name: /zoom in/i }));
    expect(screen.getByText("125%")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /rotate right/i }));
    expect(screen.getByTestId("image-annotator-stage").style.transform).toContain("rotate(90deg)");

    rerender(<ImageAnnotator url="/second-image.png" annotateEnabled={false} />);

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByTestId("image-annotator-stage").style.transform).toContain("rotate(0deg)");
  });
});
