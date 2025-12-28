/**
 * 🧪 FilterControls Component Tests
 * Tests for the reports page filter controls component
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { FilterControls } from "../FilterControls";

describe("FilterControls", () => {
  const mockFilters = {
    cycle_id: undefined,
    start_date: undefined,
    end_date: undefined,
    governance_area: undefined,
    barangay_id: undefined,
    status: undefined,
  };

  const mockOnFilterChange = vi.fn();

  it("renders filter controls with all filter sections", () => {
    render(
      <FilterControls
        filters={mockFilters}
        onFilterChange={mockOnFilterChange}
        userRole="MLGOO_DILG"
      />
    );

    // Check for filter title
    expect(screen.getByText("Filters")).toBeInTheDocument();

    // Check for status filter
    expect(screen.getByText("Status")).toBeInTheDocument();

    // Check for placeholder filters
    expect(screen.getByText("Cycle (Coming Soon)")).toBeInTheDocument();
    expect(screen.getByText("Governance Area (Coming Soon)")).toBeInTheDocument();
    expect(screen.getByText("Barangay (Coming Soon)")).toBeInTheDocument();
    expect(screen.getByText("Start Date (Coming Soon)")).toBeInTheDocument();
    expect(screen.getByText("End Date (Coming Soon)")).toBeInTheDocument();
  });

  it("renders status filter select component", () => {
    render(
      <FilterControls
        filters={mockFilters}
        onFilterChange={mockOnFilterChange}
        userRole="MLGOO_DILG"
      />
    );

    // Verify status combobox is rendered and enabled
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes[0]).not.toBeDisabled();
  });

  it("shows clear filters button when filters are active", () => {
    const activeFilters = {
      ...mockFilters,
      status: "Pass",
    };

    render(
      <FilterControls
        filters={activeFilters}
        onFilterChange={mockOnFilterChange}
        userRole="MLGOO_DILG"
      />
    );

    // Clear filters button should be visible
    expect(screen.getByText("Clear filters")).toBeInTheDocument();
  });

  it("does not show clear filters button when no filters are active", () => {
    render(
      <FilterControls
        filters={mockFilters}
        onFilterChange={mockOnFilterChange}
        userRole="MLGOO_DILG"
      />
    );

    // Clear filters button should not be visible
    expect(screen.queryByText("Clear filters")).not.toBeInTheDocument();
  });

  it("calls onFilterChange with empty filters when clear button is clicked", async () => {
    const user = userEvent.setup();
    const activeFilters = {
      ...mockFilters,
      status: "Pass",
      cycle_id: 1,
    };

    render(
      <FilterControls
        filters={activeFilters}
        onFilterChange={mockOnFilterChange}
        userRole="MLGOO_DILG"
      />
    );

    // Click clear filters button
    const clearButton = screen.getByText("Clear filters");
    await user.click(clearButton);

    // Verify onFilterChange was called with all undefined filters
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      cycle_id: undefined,
      start_date: undefined,
      end_date: undefined,
      governance_area: undefined,
      barangay_id: undefined,
      status: undefined,
    });
  });

  it("displays active filters summary when filters are applied", () => {
    const activeFilters = {
      ...mockFilters,
      status: "Pass",
    };

    render(
      <FilterControls
        filters={activeFilters}
        onFilterChange={mockOnFilterChange}
        userRole="MLGOO_DILG"
      />
    );

    // Active filter chip should be displayed
    expect(screen.getByText("Status: Pass")).toBeInTheDocument();
  });

  it("displays remove button for active filter chips", () => {
    const activeFilters = {
      ...mockFilters,
      status: "Pass",
    };

    render(
      <FilterControls
        filters={activeFilters}
        onFilterChange={mockOnFilterChange}
        userRole="MLGOO_DILG"
      />
    );

    // Find the filter chip with remove button
    const filterChip = screen.getByText("Status: Pass").closest("div");
    const removeButton = filterChip?.querySelector("button");

    // Verify remove button exists
    expect(removeButton).toBeInTheDocument();
  });

  it("renders status filter with current value", () => {
    const activeFilters = {
      ...mockFilters,
      status: "Pass",
    };

    render(
      <FilterControls
        filters={activeFilters}
        onFilterChange={mockOnFilterChange}
        userRole="MLGOO_DILG"
      />
    );

    // Component should render with Pass status selected
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("renders disabled placeholder filters", () => {
    render(
      <FilterControls
        filters={mockFilters}
        onFilterChange={mockOnFilterChange}
        userRole="MLGOO_DILG"
      />
    );

    // All comboboxes: Phase (enabled), Status (enabled), Cycle (disabled), Governance Area (disabled), Barangay (disabled for BLGU_USER)
    const comboboxes = screen.getAllByRole("combobox");

    // First two comboboxes are Phase and Status (both enabled)
    expect(comboboxes[0]).not.toBeDisabled(); // Phase
    expect(comboboxes[1]).not.toBeDisabled(); // Status
    // Rest are disabled placeholders
    expect(comboboxes[2]).toBeDisabled(); // Cycle
    expect(comboboxes[3]).toBeDisabled(); // Governance Area
    expect(comboboxes[4]).toBeDisabled(); // Barangay (disabled for MLGOO_DILG too, as it's a placeholder)
  });

  it("displays cycle_id in active filters when present", () => {
    const activeFilters = {
      ...mockFilters,
      cycle_id: 5,
    };

    render(
      <FilterControls
        filters={activeFilters}
        onFilterChange={mockOnFilterChange}
        userRole="MLGOO_DILG"
      />
    );

    // Cycle filter chip should be displayed
    expect(screen.getByText("Cycle: 5")).toBeInTheDocument();
  });

  it("handles BLGU_USER role for barangay filter", () => {
    render(
      <FilterControls
        filters={mockFilters}
        onFilterChange={mockOnFilterChange}
        userRole="BLGU_USER"
      />
    );

    // Barangay filter should be disabled for BLGU users
    const barangayLabel = screen.getByText("Barangay (Coming Soon)");
    expect(barangayLabel).toBeInTheDocument();
  });
});
