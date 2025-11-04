/**
 * 🧪 PNG Export Utility Tests
 * Tests for PNG export functionality using html2canvas
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { exportToPNG } from '../png-export';

// Mock html2canvas
vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

describe('exportToPNG', () => {
  let mockCanvas: any;
  let mockElement: HTMLElement;
  let mockLink: HTMLAnchorElement;
  let html2canvas: any;

  beforeEach(async () => {
    // Import mocked html2canvas
    const module = await import('html2canvas');
    html2canvas = module.default;

    // Create mock canvas with toBlob method
    mockCanvas = {
      toBlob: vi.fn((callback) => {
        const mockBlob = new Blob(['mock image data'], { type: 'image/png' });
        callback(mockBlob);
      }),
    };

    // Mock html2canvas to return our mock canvas
    html2canvas.mockResolvedValue(mockCanvas);

    // Create a mock element
    mockElement = document.createElement('div');
    mockElement.id = 'test-chart';
    document.body.appendChild(mockElement);

    // Create a mock anchor element
    mockLink = {
      setAttribute: vi.fn(),
      click: vi.fn(),
      style: {},
    } as any;

    // Spy on document.createElement
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink);

    // Spy on document.body methods
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink);

    // Mock URL methods
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.removeChild(mockElement);
    vi.restoreAllMocks();
  });

  it('exports element as PNG', async () => {
    await exportToPNG('test-chart', 'chart_export');

    // Verify html2canvas was called with correct element
    expect(html2canvas).toHaveBeenCalledWith(mockElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // Verify canvas.toBlob was called
    expect(mockCanvas.toBlob).toHaveBeenCalled();

    // Verify link was clicked
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('generates filename with timestamp', async () => {
    await exportToPNG('test-chart', 'my_chart');

    const downloadAttr = (mockLink.setAttribute as any).mock.calls.find(
      (call: any[]) => call[0] === 'download'
    )?.[1];

    expect(downloadAttr).toMatch(/^my_chart_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.png$/);
  });

  it('throws error when element is not found', async () => {
    await expect(exportToPNG('non-existent-element', 'test')).rejects.toThrow(
      'Element with ID "non-existent-element" not found'
    );
  });

  it('uses high quality settings for html2canvas', async () => {
    await exportToPNG('test-chart', 'quality_test');

    expect(html2canvas).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        scale: 2, // Higher quality
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })
    );
  });

  it('cleans up object URL after download', async () => {
    const revokeURLSpy = vi.spyOn(URL, 'revokeObjectURL');

    await exportToPNG('test-chart', 'cleanup_test');

    expect(revokeURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('handles canvas toBlob failure', async () => {
    // Mock toBlob to call callback with null
    mockCanvas.toBlob = vi.fn((callback) => {
      callback(null);
    });

    html2canvas.mockResolvedValue(mockCanvas);

    // Should throw error when blob creation fails
    await expect(exportToPNG('test-chart', 'fail_test')).rejects.toThrow(
      'Failed to create image blob'
    );
  });

  it('logs error when element not found', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(exportToPNG('missing-element', 'test')).rejects.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Element with ID "missing-element" not found'
    );

    consoleErrorSpy.mockRestore();
  });

  it('creates PNG blob with correct content type', async () => {
    await exportToPNG('test-chart', 'blob_test');

    // Verify toBlob was called with PNG type
    expect(mockCanvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/png'
    );
  });

  it('appends and removes link from document', async () => {
    await exportToPNG('test-chart', 'link_test');

    // Verify link was added and removed
    expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
    expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);
  });

  it('sets link visibility to hidden', async () => {
    await exportToPNG('test-chart', 'visibility_test');

    expect(mockLink.style.visibility).toBe('hidden');
  });
});
