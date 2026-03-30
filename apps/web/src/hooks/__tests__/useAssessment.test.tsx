import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCurrentAssessment } from "../useAssessment";

vi.mock("@sinag/shared", async () => {
  const actual = await vi.importActual("@sinag/shared");
  return {
    ...actual,
    useGetAssessmentsMyAssessment: vi.fn(),
  };
});

import { useGetAssessmentsMyAssessment } from "@sinag/shared";

describe("useCurrentAssessment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetAssessmentsMyAssessment).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  });

  it("requests a fresh assessment snapshot on mount", () => {
    renderHook(() => useCurrentAssessment());

    expect(useGetAssessmentsMyAssessment).toHaveBeenCalledWith({
      query: expect.objectContaining({
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnWindowFocus: true,
      }),
    });
  });
});
