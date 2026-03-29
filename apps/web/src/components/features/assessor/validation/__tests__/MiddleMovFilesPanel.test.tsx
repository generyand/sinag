import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMovAnnotations } from "@/hooks/useMovAnnotations";
import { useAuthStore } from "@/store/useAuthStore";
import { MiddleMovFilesPanel } from "../MiddleMovFilesPanel";

const mockUploadMutate = vi.fn();

vi.mock("@sinag/shared", () => ({
  getGetAssessorAssessmentsAssessmentIdQueryKey: vi.fn((assessmentId: number) => [
    "assessor-assessment",
    assessmentId,
  ]),
  getGetAssessorMovsMovFileIdFeedbackQueryKey: vi.fn(() => ["mov-feedback"]),
  useGetAssessorMovsMovFileIdFeedback: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  usePostMovsAssessmentsAssessmentIdIndicatorsIndicatorIdUpload: vi.fn(() => ({
    mutate: mockUploadMutate,
    isPending: false,
  })),
  usePatchAssessorMovsMovFileIdFeedback: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

vi.mock("@/hooks/useSignedUrl", () => ({
  fetchSignedUrl: vi.fn(),
  useSignedUrl: vi.fn(() => ({
    signedUrl: "https://example.com/mov.png",
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

vi.mock("@/hooks/useMovAnnotations", () => ({
  useMovAnnotations: vi.fn(() => ({
    annotations: [],
    isLoading: false,
    createAnnotation: vi.fn(),
    deleteAnnotation: vi.fn(),
  })),
}));

vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: vi.fn(() => ({
    user: { role: "ASSESSOR" },
  })),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/features/movs/FileList", () => ({
  FileList: ({ files, onPreview }: { files: Array<any>; onPreview: (file: any) => void }) => (
    <div>
      {files.map((file) => (
        <button key={file.id} type="button" onClick={() => onPreview(file)}>
          Preview {file.file_name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/components/features/movs/FileUpload", () => ({
  FileUpload: ({
    disabled,
    onFileSelect,
  }: {
    disabled?: boolean;
    onFileSelect: (file: File) => void;
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onFileSelect(new File(["test"], "validator.pdf", { type: "application/pdf" }))}
    >
      Mock File Upload
    </button>
  ),
}));

const wrap = (ui: React.ReactNode) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
};

const assessment = {
  assessment: {
    id: 1,
    status: "SUBMITTED",
    responses: [
      {
        id: 101,
        assessment_id: 1,
        indicator_id: 1,
        indicator: {
          name: "Indicator A",
          form_schema: {
            fields: [
              {
                field_id: "supporting_file",
                field_type: "file_upload",
                label: "Supporting File",
              },
            ],
          },
        },
        movs: [
          {
            id: 9,
            original_filename: "evidence.png",
            filename: "evidence.png",
            content_type: "image/png",
            file_size: 1024,
            uploaded_at: "2026-03-20T00:00:00.000Z",
          },
        ],
      },
    ],
  },
};

describe("MiddleMovFilesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadMutate.mockReset();
  });

  it("opens the shared image preview controls from the review panel", async () => {
    const user = userEvent.setup();

    render(wrap(<MiddleMovFilesPanel assessment={assessment as any} expandedId={101} />));

    await user.click(screen.getByRole("button", { name: /preview evidence\.png/i }));

    expect(await screen.findByRole("button", { name: /zoom in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /zoom out/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset view/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rotate left/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rotate right/i })).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("marks an annotation card as selected when clicked", async () => {
    const user = userEvent.setup();

    vi.mocked(useMovAnnotations).mockReturnValue({
      annotations: [
        {
          id: 77,
          rect: { x: 10, y: 15, w: 20, h: 25 },
          comment: "Focus this annotation",
          created_at: "2026-03-21T00:00:00.000Z",
        },
      ],
      isLoading: false,
      createAnnotation: vi.fn(),
      deleteAnnotation: vi.fn(),
    });

    render(wrap(<MiddleMovFilesPanel assessment={assessment as any} expandedId={101} />));

    await user.click(screen.getByRole("button", { name: /preview evidence\.png/i }));
    const locateButton = await screen.findByRole("button", { name: /locate annotation/i });

    expect(locateButton).toHaveAttribute("aria-pressed", "false");

    await user.click(locateButton);

    expect(locateButton).toHaveAttribute("aria-pressed", "true");
  });

  it("uses nested indicator.id for validator uploads when indicator_id is absent", async () => {
    const user = userEvent.setup();

    vi.mocked(useAuthStore).mockReturnValue({
      user: { role: "VALIDATOR" },
    });

    const validatorAssessment = {
      assessment: {
        id: 2,
        status: "SUBMITTED",
        responses: [
          {
            id: 101,
            assessment_id: 2,
            indicator: {
              id: 2,
              name: "Indicator A",
              form_schema: {
                fields: [
                  {
                    field_id: "upload_section_1",
                    field_type: "file_upload",
                    label: "BFDP Monitoring Form A",
                  },
                ],
              },
            },
            movs: [],
          },
        ],
      },
    };

    render(wrap(<MiddleMovFilesPanel assessment={validatorAssessment as any} expandedId={101} />));

    await user.click(screen.getByRole("button", { name: /mock file upload/i }));

    expect(mockUploadMutate).toHaveBeenCalledWith({
      assessmentId: 2,
      indicatorId: 2,
      data: expect.objectContaining({
        field_id: "upload_section_1",
        field_label: "BFDP Monitoring Form A",
      }),
    });
    expect(
      screen.queryByText(/this indicator has no file upload field to attach validator evidence to/i)
    ).not.toBeInTheDocument();
  });
});
