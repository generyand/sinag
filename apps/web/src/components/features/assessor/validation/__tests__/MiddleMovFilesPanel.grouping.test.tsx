import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MiddleMovFilesPanel } from "../MiddleMovFilesPanel";

vi.mock("@/components/features/movs/FileList", () => ({
  FileList: ({
    files,
    emptyMessage,
  }: {
    files: Array<{ id: number; file_name: string }>;
    emptyMessage: string;
  }) => (
    <div>
      {files.length > 0 ? (
        files.map((file) => <div key={file.id}>{file.file_name}</div>)
      ) : (
        <div>{emptyMessage}</div>
      )}
    </div>
  ),
}));

vi.mock("@/hooks/useMovAnnotations", () => ({
  useMovAnnotations: () => ({
    annotations: [],
    isLoading: false,
    createAnnotation: vi.fn(),
    deleteAnnotation: vi.fn(),
  }),
}));

vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: () => ({
    user: { id: 2, role: "VALIDATOR" },
  }),
}));

vi.mock("@sinag/shared", async () => {
  const actual = await vi.importActual<typeof import("@sinag/shared")>("@sinag/shared");

  return {
    ...actual,
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
      mutate: vi.fn(),
      isPending: false,
    })),
    usePatchAssessorMovsMovFileIdFeedback: vi.fn(() => ({
      mutate: vi.fn(),
    })),
  };
});

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

function buildAssessment(movs: Array<Record<string, unknown>>) {
  return {
    assessment: {
      id: 1,
      status: "SUBMITTED",
      responses: [
        {
          id: 101,
          assessment_id: 1,
          indicator_id: 77,
          validation_status: null,
          indicator: {
            name: "Indicator A",
            form_schema: {
              fields: [
                {
                  field_id: "validator_upload",
                  field_type: "file_upload",
                  label: "Validator Upload",
                },
              ],
            },
          },
          movs,
        },
      ],
    },
  } as any;
}

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

function getSectionContainer(title: RegExp | string): HTMLElement {
  const header = screen.getByText(title).closest("div");
  const section = header?.parentElement;

  if (!section) {
    throw new Error(`Section container not found for ${title}`);
  }

  return section;
}

describe("MiddleMovFilesPanel MOV grouping in validator mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the validator-reviewed file in Existing Files until a newer upload replaces it", () => {
    const assessment = buildAssessment([
      {
        id: 1,
        filename: "assessor-old.pdf",
        original_filename: "assessor-old.pdf",
        file_size: 100,
        content_type: "application/pdf",
        storage_path: "/old",
        uploaded_at: "2026-03-01T10:00:00Z",
        assessor_notes: "Needs correction",
        flagged_for_rework: true,
      },
      {
        id: 2,
        filename: "validator-current.pdf",
        original_filename: "validator-current.pdf",
        file_size: 100,
        content_type: "application/pdf",
        storage_path: "/current",
        uploaded_at: "2026-03-12T10:00:00Z",
        validator_notes: "Check this revision",
        flagged_for_calibration: true,
      },
    ]);

    render(
      wrap(
        <MiddleMovFilesPanel
          assessment={assessment}
          expandedId={101}
          calibrationRequestedAt="2026-03-10T10:00:00Z"
        />
      )
    );

    const existingSection = getSectionContainer("Existing File");
    const previousSection = getSectionContainer("Previous File");

    expect(within(existingSection).getByText("validator-current.pdf")).toBeInTheDocument();
    expect(within(previousSection).getByText("assessor-old.pdf")).toBeInTheDocument();
  });

  it("moves the validator-reviewed file to Previous Files once a newer upload exists", () => {
    const assessment = buildAssessment([
      {
        id: 1,
        filename: "assessor-old.pdf",
        original_filename: "assessor-old.pdf",
        file_size: 100,
        content_type: "application/pdf",
        storage_path: "/old",
        uploaded_at: "2026-03-01T10:00:00Z",
        assessor_notes: "Needs correction",
        flagged_for_rework: true,
      },
      {
        id: 2,
        filename: "validator-current.pdf",
        original_filename: "validator-current.pdf",
        file_size: 100,
        content_type: "application/pdf",
        storage_path: "/current",
        uploaded_at: "2026-03-12T10:00:00Z",
        validator_notes: "Check this revision",
        flagged_for_calibration: true,
      },
      {
        id: 3,
        filename: "latest-upload.pdf",
        original_filename: "latest-upload.pdf",
        file_size: 100,
        content_type: "application/pdf",
        storage_path: "/latest",
        uploaded_at: "2026-03-14T10:00:00Z",
      },
    ]);

    render(
      wrap(
        <MiddleMovFilesPanel
          assessment={assessment}
          expandedId={101}
          calibrationRequestedAt="2026-03-10T10:00:00Z"
        />
      )
    );

    const previousSection = getSectionContainer("Previous File");

    fireEvent.click(screen.getByRole("button", { name: /view previous file history/i }));

    expect(within(previousSection).getByText("assessor-old.pdf")).toBeInTheDocument();
    expect(within(previousSection).getByText("validator-current.pdf")).toBeInTheDocument();
  });

  it("shows validator uploads in a separate provenance section", () => {
    const assessment = buildAssessment([
      {
        id: 1,
        filename: "barangay-file.pdf",
        original_filename: "barangay-file.pdf",
        file_size: 100,
        content_type: "application/pdf",
        storage_path: "/barangay",
        uploaded_at: "2026-03-10T10:00:00Z",
        upload_origin: "blgu",
      },
      {
        id: 2,
        filename: "validator-file.pdf",
        original_filename: "validator-file.pdf",
        file_size: 100,
        content_type: "application/pdf",
        storage_path: "/validator",
        uploaded_at: "2026-03-11T10:00:00Z",
        upload_origin: "validator",
      },
    ]);

    render(wrap(<MiddleMovFilesPanel assessment={assessment} expandedId={101} />));

    const barangaySection = getSectionContainer("Barangay Uploads");
    const validatorSection = getSectionContainer("Validator Uploads");

    expect(within(barangaySection).getByText("barangay-file.pdf")).toBeInTheDocument();
    expect(within(validatorSection).getByText("validator-file.pdf")).toBeInTheDocument();
  });
});
