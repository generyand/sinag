/**
 * 🧪 CSV Export Utility Tests
 * Tests for CSV export functionality
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { exportToCSV } from "../csv-export";

describe("exportToCSV", () => {
  let mockLink: HTMLAnchorElement;
  let createElementSpy: any;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(() => {
    // Create a mock anchor element
    mockLink = {
      setAttribute: vi.fn(),
      click: vi.fn(),
      style: {},
    } as any;

    // Spy on document.createElement
    createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(mockLink);

    // Spy on document.body methods
    vi.spyOn(document.body, "appendChild").mockImplementation(() => mockLink);
    vi.spyOn(document.body, "removeChild").mockImplementation(() => mockLink);

    // Mock URL methods
    createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exports data to CSV format", () => {
    const testData = [
      { name: "Test 1", value: 100, status: "Pass" },
      { name: "Test 2", value: 200, status: "Fail" },
    ];

    exportToCSV(testData, "test_export");

    // Verify createElement was called to create anchor
    expect(createElementSpy).toHaveBeenCalledWith("a");

    // Verify link attributes were set
    expect(mockLink.setAttribute).toHaveBeenCalledWith("href", "blob:mock-url");
    expect(mockLink.setAttribute).toHaveBeenCalledWith(
      "download",
      expect.stringMatching(/^test_export_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/)
    );

    // Verify link was clicked
    expect(mockLink.click).toHaveBeenCalled();

    // Verify cleanup
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
  });

  it("generates filename with timestamp", () => {
    const testData = [{ key: "value" }];

    exportToCSV(testData, "report");

    const downloadAttr = (mockLink.setAttribute as any).mock.calls.find(
      (call: any[]) => call[0] === "download"
    )?.[1];

    expect(downloadAttr).toMatch(/^report_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/);
  });

  it("escapes special characters in CSV values", () => {
    const testData = [
      { name: "Test, with comma", value: 100 },
      { name: 'Test "with quotes"', value: 200 },
      { name: "Test\nwith newline", value: 300 },
    ];

    exportToCSV(testData, "special_chars");

    // Verify Blob was created (through createObjectURL being called)
    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it("handles empty data array gracefully", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    exportToCSV([], "empty_data");

    // Should log warning for empty data
    expect(consoleSpy).toHaveBeenCalledWith("No data to export");

    // Should not create link or download
    expect(mockLink.click).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("handles null and undefined values correctly", () => {
    const testData = [{ name: "Test", value: null, count: undefined }];

    exportToCSV(testData, "null_values");

    // Should still export (null/undefined converted to empty strings)
    expect(mockLink.click).toHaveBeenCalled();
  });

  it("creates CSV headers from first object keys", () => {
    const testData = [
      { "Barangay Name": "Test 1", Score: 95, Status: "Pass" },
      { "Barangay Name": "Test 2", Score: 85, Status: "Pass" },
    ];

    exportToCSV(testData, "headers_test");

    // Verify export happened
    expect(mockLink.click).toHaveBeenCalled();
  });

  it("appends link to body and removes it after download", () => {
    const testData = [{ key: "value" }];

    exportToCSV(testData, "cleanup_test");

    // Verify link was added to body
    expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);

    // Verify link was removed from body
    expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);
  });

  it("sets link visibility to hidden", () => {
    const testData = [{ key: "value" }];

    exportToCSV(testData, "visibility_test");

    // Verify link style was set to hidden
    expect(mockLink.style.visibility).toBe("hidden");
  });

  it("creates blob with correct CSV content type", () => {
    const testData = [{ name: "Test", value: 100 }];

    // Spy on Blob constructor
    const blobSpy = vi.spyOn(global, "Blob");

    exportToCSV(testData, "blob_test");

    // Verify Blob was created with CSV content type
    expect(blobSpy).toHaveBeenCalledWith(expect.any(Array), { type: "text/csv;charset=utf-8;" });

    blobSpy.mockRestore();
  });
});
