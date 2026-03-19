import { render, screen } from "@testing-library/react";
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
});
