/**
 * Exports data to CSV format and triggers browser download
 * @param data Array of objects to export
 * @param filename Base filename (without extension)
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string
): void {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Get headers from the first object
  const headers = Object.keys(data[0]);

  // Helper function to escape CSV values
  const escapeCSVValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return "";
    }

    const stringValue = String(value);

    // If value contains comma, newline, or double quote, wrap in quotes and escape quotes
    if (
      stringValue.includes(",") ||
      stringValue.includes("\n") ||
      stringValue.includes('"')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  };

  // Create CSV content
  const csvRows: string[] = [];

  // Add header row
  csvRows.push(headers.map((header) => escapeCSVValue(header)).join(","));

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => escapeCSVValue(row[header]));
    csvRows.push(values.join(","));
  }

  const csvContent = csvRows.join("\n");

  // Create blob
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const fullFilename = `${filename}_${timestamp}.csv`;

  // Create temporary anchor element for download
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", fullFilename);
  link.style.visibility = "hidden";

  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Cleanup object URL
  URL.revokeObjectURL(url);
}
