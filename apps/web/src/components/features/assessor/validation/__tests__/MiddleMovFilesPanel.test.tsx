import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMovAnnotations } from "@/hooks/useMovAnnotations";
import { useAuthStore } from "@/store/useAuthStore";
import { MiddleMovFilesPanel } from "../MiddleMovFilesPanel";

const mockUploadMutate = vi.fn();
const mockDeleteMutate = vi.fn();
const mockPatchFeedbackMutate = vi.fn();
let isUploadPending = false;

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
    isPending: isUploadPending,
  })),
  useDeleteMovsFilesFileId: vi.fn(() => ({
    mutate: mockDeleteMutate,
    isPending: false,
  })),
  usePatchAssessorMovsMovFileIdFeedback: vi.fn((options: any) => ({
    mutate: (variables: any) => {
      mockPatchFeedbackMutate(variables);
      options?.mutation?.onSuccess?.({}, variables);
    },
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
    user: { id: 99, role: "ASSESSOR" },
  })),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/features/movs/FileList", () => ({
  FileList: ({
    files,
    onPreview,
    onDelete,
    canDelete,
  }: {
    files: Array<any>;
    onPreview: (file: any) => void;
    onDelete?: (fileId: number) => void;
    canDelete?: boolean | ((file: any) => boolean);
  }) => (
    <div>
      {files.map((file) => (
        <div key={file.id}>
          <button type="button" onClick={() => onPreview(file)}>
            Preview {file.file_name}
          </button>
          {(typeof canDelete === "function" ? canDelete(file) : canDelete) ? (
            <button type="button" onClick={() => onDelete?.(file.id)}>
              Delete {file.file_name}
            </button>
          ) : null}
        </div>
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

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const wrap = (ui: React.ReactNode, client = createTestQueryClient()) => {
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

const multiFileAssessment = {
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
            original_filename: "evidence-1.png",
            filename: "evidence-1.png",
            content_type: "image/png",
            file_size: 1024,
            uploaded_at: "2026-03-20T00:00:00.000Z",
            upload_origin: "blgu",
          },
          {
            id: 10,
            original_filename: "evidence-2.png",
            filename: "evidence-2.png",
            content_type: "image/png",
            file_size: 2048,
            uploaded_at: "2026-03-19T00:00:00.000Z",
            upload_origin: "blgu",
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
    mockDeleteMutate.mockReset();
    mockPatchFeedbackMutate.mockReset();
    isUploadPending = false;
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
      user: { id: 42, role: "VALIDATOR" },
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

    await user.click(screen.getByRole("button", { name: /add file/i }));
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

  it("keeps validator upload controls collapsed until explicitly expanded", async () => {
    const user = userEvent.setup();

    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 42, role: "VALIDATOR" },
    });

    render(wrap(<MiddleMovFilesPanel assessment={assessment as any} expandedId={101} />));

    expect(screen.getByRole("button", { name: /add file/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mock file upload/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add file/i }));

    expect(screen.getByRole("button", { name: /mock file upload/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("shows a pending upload state while validator evidence is uploading", async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 42, role: "VALIDATOR" },
    });
    isUploadPending = true;

    const pendingAssessment = {
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

    render(wrap(<MiddleMovFilesPanel assessment={pendingAssessment as any} expandedId={101} />));

    expect(screen.getByRole("button", { name: /uploading\.\.\./i })).toBeDisabled();
  });

  it("keeps validator upload actions available during awaiting final validation", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 42, role: "VALIDATOR" },
    });

    const awaitingFinalValidationAssessment = {
      assessment: {
        id: 2,
        status: "AWAITING_FINAL_VALIDATION",
        responses: [
          {
            id: 101,
            assessment_id: 2,
            indicator_id: 2,
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
            movs: [
              {
                id: 11,
                original_filename: "validator-own.pdf",
                filename: "validator-own.pdf",
                content_type: "application/pdf",
                file_size: 1024,
                uploaded_at: "2026-03-20T00:00:00.000Z",
                upload_origin: "validator",
                uploaded_by: 42,
              },
            ],
          },
        ],
      },
    };

    render(
      wrap(
        <MiddleMovFilesPanel
          assessment={awaitingFinalValidationAssessment as any}
          expandedId={101}
        />
      )
    );

    expect(screen.getByRole("button", { name: /add file/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete validator-own\.pdf/i })).toBeInTheDocument();
  });

  it("shows all current barangay uploads without hiding sibling MOVs in history", () => {
    render(wrap(<MiddleMovFilesPanel assessment={multiFileAssessment as any} expandedId={101} />));

    expect(screen.getByRole("button", { name: /preview evidence-1\.png/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /preview evidence-2\.png/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /view barangay upload history/i })
    ).not.toBeInTheDocument();
  });

  it("patches cached assessment MOV feedback after validator feedback is saved", async () => {
    const user = userEvent.setup();
    const queryClient = createTestQueryClient();

    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 42, role: "VALIDATOR" },
    });
    queryClient.setQueryData(["assessor-assessment", 1], assessment);

    render(
      wrap(<MiddleMovFilesPanel assessment={assessment as any} expandedId={101} />, queryClient)
    );

    await user.click(screen.getByRole("button", { name: /preview evidence\.png/i }));
    await user.type(
      screen.getByPlaceholderText(/describe the specific issue with this file/i),
      "no signature"
    );
    await user.click(screen.getByRole("button", { name: /save feedback/i }));

    expect(mockPatchFeedbackMutate).toHaveBeenCalledWith({
      movFileId: 9,
      data: {
        assessor_notes: undefined,
        flagged_for_rework: undefined,
        validator_notes: "no signature",
        flagged_for_calibration: true,
      },
    });
    expect(queryClient.getQueryData<any>(["assessor-assessment", 1])).toMatchObject({
      assessment: {
        responses: [
          {
            movs: [
              {
                id: 9,
                validator_notes: "no signature",
                flagged_for_calibration: true,
              },
            ],
          },
        ],
      },
    });
  });

  it("lets validators remove only their own validator-uploaded files", async () => {
    const user = userEvent.setup();

    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 42, role: "VALIDATOR" },
    });

    const validatorFilesAssessment = {
      assessment: {
        id: 2,
        status: "SUBMITTED",
        responses: [
          {
            id: 101,
            assessment_id: 2,
            indicator_id: 1,
            indicator: {
              id: 1,
              name: "Indicator A",
              form_schema: { fields: [] },
            },
            movs: [
              {
                id: 11,
                original_filename: "validator-own.pdf",
                filename: "validator-own.pdf",
                content_type: "application/pdf",
                file_size: 1024,
                uploaded_at: "2026-03-20T00:00:00.000Z",
                upload_origin: "validator",
                uploaded_by: 42,
              },
              {
                id: 12,
                original_filename: "validator-other.pdf",
                filename: "validator-other.pdf",
                content_type: "application/pdf",
                file_size: 1024,
                uploaded_at: "2026-03-19T00:00:00.000Z",
                upload_origin: "validator",
                uploaded_by: 77,
              },
              {
                id: 13,
                original_filename: "barangay.pdf",
                filename: "barangay.pdf",
                content_type: "application/pdf",
                file_size: 1024,
                uploaded_at: "2026-03-18T00:00:00.000Z",
                upload_origin: "blgu",
                uploaded_by: 5,
              },
            ],
          },
        ],
      },
    };

    render(
      wrap(<MiddleMovFilesPanel assessment={validatorFilesAssessment as any} expandedId={101} />)
    );

    expect(screen.getByRole("button", { name: /delete validator-own\.pdf/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /delete validator-other\.pdf/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete barangay\.pdf/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /delete validator-own\.pdf/i }));
    expect(screen.getByText(/remove validator upload\?/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /this will remove the validator-uploaded file from the assessment evidence list/i
      )
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /remove file/i }));

    expect(mockDeleteMutate).toHaveBeenCalledWith({ fileId: 11 });
  });
});
