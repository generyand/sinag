import html2canvas from "html2canvas";

/**
 * Exports a DOM element as PNG image
 * @param elementId The ID of the DOM element to capture
 * @param filename Base filename (without extension)
 */
export async function exportToPNG(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);

  if (!element) {
    console.error(`Element with ID "${elementId}" not found`);
    throw new Error(`Element with ID "${elementId}" not found`);
  }

  try {
    // Capture the element as canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true, // Allow cross-origin images
      backgroundColor: "#ffffff",
      logging: false,
    });

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error("Failed to create image blob");
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const fullFilename = `${filename}_${timestamp}.png`;

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
    }, "image/png");
  } catch (error) {
    console.error("Error exporting PNG:", error);
    throw error;
  }
}
