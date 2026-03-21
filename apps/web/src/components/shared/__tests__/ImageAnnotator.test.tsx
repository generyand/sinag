import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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

  it("stores drawn annotations in base image coordinates after rotation", async () => {
    const user = userEvent.setup();
    const handleAdd = vi.fn();

    render(<ImageAnnotator url="/test-image.png" annotateEnabled onAdd={handleAdd} />);

    const image = screen.getByAltText("Annotatable document");
    Object.defineProperty(image, "clientWidth", { configurable: true, value: 200 });
    Object.defineProperty(image, "clientHeight", { configurable: true, value: 100 });
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 200 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 100 });
    image.getBoundingClientRect = () =>
      ({
        x: 100,
        y: 100,
        left: 100,
        top: 100,
        right: 200,
        bottom: 300,
        width: 100,
        height: 200,
        toJSON: () => ({}),
      }) as DOMRect;

    fireEvent.load(image);
    await user.click(screen.getByRole("button", { name: /rotate right/i }));

    const container = screen.getByTestId("image-annotator-stage").parentElement as HTMLElement;
    fireEvent.mouseDown(container, { clientX: 180, clientY: 150 });
    fireEvent.mouseMove(container, { clientX: 120, clientY: 250 });
    fireEvent.mouseUp(container, { clientX: 120, clientY: 250 });

    await user.type(screen.getByPlaceholderText(/enter your comment/i), "Rotated note");
    await user.click(screen.getByRole("button", { name: /save annotation/i }));

    expect(handleAdd).toHaveBeenCalledTimes(1);
    expect(handleAdd.mock.calls[0][0].comment).toBe("Rotated note");
    expect(handleAdd.mock.calls[0][0].rect.x).toBeCloseTo(25, 5);
    expect(handleAdd.mock.calls[0][0].rect.y).toBeCloseTo(20, 5);
    expect(handleAdd.mock.calls[0][0].rect.w).toBeCloseTo(50, 5);
    expect(handleAdd.mock.calls[0][0].rect.h).toBeCloseTo(60, 5);
  });

  it("scrolls the selected annotation into view when focused from the sidebar", () => {
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    render(
      <ImageAnnotator
        url="/test-image.png"
        annotateEnabled={false}
        annotations={[
          {
            id: "ann-1",
            rect: { x: 25, y: 30, w: 20, h: 15 },
            comment: "Locate me",
            createdAt: "2026-03-21T00:00:00.000Z",
          },
        ]}
        focusAnnotationId="ann-1"
        focusRequestNonce={1}
      />
    );

    const image = screen.getByAltText("Annotatable document");
    fireEvent.load(image);

    expect(scrollIntoView).toHaveBeenCalled();

    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  });
});
