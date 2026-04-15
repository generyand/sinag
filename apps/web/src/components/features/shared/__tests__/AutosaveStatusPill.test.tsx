import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AutosaveStatusPill } from "../AutosaveStatusPill";

describe("AutosaveStatusPill", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows saving feedback without retry controls", () => {
    render(<AutosaveStatusPill state="saving" />);

    expect(screen.getByText("Saving...")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry save/i })).not.toBeInTheDocument();
  });

  it("calls onRetry when the dirty status action is clicked", () => {
    const onRetry = vi.fn();

    render(<AutosaveStatusPill state="dirty" onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: /save changes now/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not offer manual save while already saving", () => {
    render(<AutosaveStatusPill state="saving" onRetry={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /save changes now/i })).not.toBeInTheDocument();
  });

  it("shows an inline retry action when autosave fails", () => {
    const onRetry = vi.fn();

    render(<AutosaveStatusPill state="error" onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: /retry save/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("switches to icon-only after repeated autosaves and shows details on hover", async () => {
    const { rerender } = render(<AutosaveStatusPill state="saved" completedSaveCount={2} />);

    rerender(<AutosaveStatusPill state="idle" completedSaveCount={3} />);
    await act(async () => {
      vi.advanceTimersByTime(2300);
    });

    expect(screen.queryByText("Autosave on")).not.toBeInTheDocument();

    fireEvent.focus(screen.getByRole("button", { name: /autosave status/i }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getAllByText("Changes save automatically while you work.").length
    ).toBeGreaterThan(0);
  });
});
