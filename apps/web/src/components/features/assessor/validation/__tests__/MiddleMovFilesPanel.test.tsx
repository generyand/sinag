import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MiddleMovFilesPanel } from "../MiddleMovFilesPanel";

vi.mock("@sinag/shared", () => ({
  getGetAssessorMovsMovFileIdFeedbackQueryKey: vi.fn(() => ["mov-feedback"]),
  useGetAssessorMovsMovFileIdFeedback: vi.fn(() => ({
    data: null,
    isLoading: false,
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
    responses: [
      {
        id: 101,
        assessment_id: 1,
        indicator_id: 1,
        indicator: { name: "Indicator A" },
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
});
