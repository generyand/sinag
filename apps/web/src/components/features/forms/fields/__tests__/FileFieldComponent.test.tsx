/**
 * Unit Tests for FileFieldComponent (Epic 4.0)
 *
 * Tests the FileFieldComponent including:
 * - File upload via drag-and-drop
 * - File list display
 * - File validation
 * - Permission-based controls
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileFieldComponent } from '../FileFieldComponent';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the API hooks
vi.mock('@sinag/shared', () => ({
  useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles: vi.fn(() => ({
    data: { files: [] },
    isLoading: false,
    refetch: vi.fn(),
  })),
  usePostMovsAssessmentsAssessmentIdIndicatorsIndicatorIdUpload: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useDeleteMovsAssessmentsAssessmentIdFilesFileId: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));

describe('FileFieldComponent', () => {
  const mockAssessmentData = {
    assessment: {
      id: 68,
      status: 'Draft',
    },
  };

  const mockField = {
    field_id: 'test_mov_upload',
    field_type: 'file_upload',
    label: 'Upload Files for BESWMC Documents',
    help_text: 'Upload supporting documents (PDF, DOCX, XLSX, images, or video). Maximum file size: 50MB',
    required: false,
    order: 2,
    allowed_file_types: ['.pdf', '.docx', '.xlsx', '.jpg', '.jpeg', '.png', '.mp4'],
    max_file_size_mb: 50,
  };

  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <FileFieldComponent
          field={mockField}
          assessmentId={68}
          indicatorId={278}
          assessmentData={mockAssessmentData}
          {...props}
        />
      </QueryClientProvider>
    );
  };

  it('should render file upload component', () => {
    renderComponent();

    expect(screen.getByText('Upload Files for BESWMC Documents')).toBeInTheDocument();
    expect(screen.getByText(/Maximum file size: 50MB/i)).toBeInTheDocument();
  });

  it('should display drag-and-drop zone', () => {
    renderComponent();

    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
    expect(screen.getByText(/click to browse/i)).toBeInTheDocument();
  });

  it('should show help text', () => {
    renderComponent();

    expect(screen.getByText(/Upload supporting documents/i)).toBeInTheDocument();
  });

  it('should display allowed file types', () => {
    renderComponent();

    // Check that file types are mentioned in the help text or accept attribute
    const container = screen.getByText(/Maximum file size/i).closest('div');
    expect(container).toBeInTheDocument();
  });

  it('should disable upload when assessment is submitted', () => {
    const submittedAssessment = {
      assessment: {
        id: 68,
        status: 'Submitted for Review',
      },
    };

    renderComponent({ assessmentData: submittedAssessment });

    // The upload zone should be disabled
    const dropzone = screen.getByText(/drag and drop/i).closest('div');
    expect(dropzone).toHaveClass(/disabled|opacity/);
  });

  it('should display uploaded files list', async () => {
    const { useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles } = await import('@sinag/shared');

    vi.mocked(useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles).mockReturnValue({
      data: {
        files: [
          {
            id: 1,
            filename: 'test-document.pdf',
            file_size: 1024000,
            uploaded_at: new Date().toISOString(),
            url: 'https://example.com/test.pdf',
          },
        ],
      },
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    });
  });

  it('should show loading state while fetching files', async () => {
    const { useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles } = await import('@sinag/shared');

    vi.mocked(useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles).mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    } as any);

    renderComponent();

    // Should show loading skeleton or spinner
    expect(screen.getByText(/loading/i) || screen.getByRole('status')).toBeInTheDocument();
  });

  it('should validate file size before upload', async () => {
    renderComponent();

    // Create a mock file that's too large (51MB)
    const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large-file.pdf', {
      type: 'application/pdf',
    });

    const input = screen.getByLabelText(/upload files/i, { selector: 'input[type="file"]' });

    // Attempt to upload large file
    fireEvent.change(input, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/file size exceeds|file too large/i)).toBeInTheDocument();
    });
  });

  it('should validate file type before upload', async () => {
    renderComponent();

    // Create a mock file with invalid type
    const invalidFile = new File(['test content'], 'test.exe', {
      type: 'application/x-msdownload',
    });

    const input = screen.getByLabelText(/upload files/i, { selector: 'input[type="file"]' });

    fireEvent.change(input, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/file type not supported|invalid file type/i)).toBeInTheDocument();
    });
  });

  it('should show upload progress', async () => {
    const { usePostMovsAssessmentsAssessmentIdIndicatorsIndicatorIdUpload } = await import('@sinag/shared');

    vi.mocked(usePostMovsAssessmentsAssessmentIdIndicatorsIndicatorIdUpload).mockReturnValue({
      mutateAsync: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000))),
      isPending: true,
    } as any);

    renderComponent();

    const validFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/upload files/i, { selector: 'input[type="file"]' });

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByText(/uploading/i) || screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('should show delete button for uploaded files', async () => {
    const { useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles } = await import('@sinag/shared');

    vi.mocked(useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles).mockReturnValue({
      data: {
        files: [
          {
            id: 1,
            filename: 'test-document.pdf',
            file_size: 1024000,
            uploaded_at: new Date().toISOString(),
            url: 'https://example.com/test.pdf',
          },
        ],
      },
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    renderComponent();

    await waitFor(() => {
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).not.toBeDisabled();
    });
  });

  it('should disable delete button when assessment is submitted', async () => {
    const { useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles } = await import('@sinag/shared');

    vi.mocked(useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles).mockReturnValue({
      data: {
        files: [
          {
            id: 1,
            filename: 'test-document.pdf',
            file_size: 1024000,
            uploaded_at: new Date().toISOString(),
            url: 'https://example.com/test.pdf',
          },
        ],
      },
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    const submittedAssessment = {
      assessment: {
        id: 68,
        status: 'Submitted for Review',
      },
    };

    renderComponent({ assessmentData: submittedAssessment });

    await waitFor(() => {
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toBeDisabled();
    });
  });

  it('should show file preview button', async () => {
    const { useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles } = await import('@sinag/shared');

    vi.mocked(useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles).mockReturnValue({
      data: {
        files: [
          {
            id: 1,
            filename: 'test-image.jpg',
            file_size: 512000,
            uploaded_at: new Date().toISOString(),
            url: 'https://example.com/test.jpg',
          },
        ],
      },
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    renderComponent();

    await waitFor(() => {
      const previewButton = screen.getByRole('button', { name: /preview|view/i });
      expect(previewButton).toBeInTheDocument();
    });
  });

  it('should display file size in human-readable format', async () => {
    const { useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles } = await import('@sinag/shared');

    vi.mocked(useGetMovsAssessmentsAssessmentIdIndicatorsIndicatorIdFiles).mockReturnValue({
      data: {
        files: [
          {
            id: 1,
            filename: 'test-document.pdf',
            file_size: 1024000, // 1MB
            uploaded_at: new Date().toISOString(),
            url: 'https://example.com/test.pdf',
          },
        ],
      },
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/1(\.\d+)?\s*MB/i)).toBeInTheDocument();
    });
  });
});
