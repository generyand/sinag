import { useState, useCallback } from "react";
import {
  AssessmentPeriod,
  AssessmentPeriodDeadlines,
  CreateAssessmentPeriodRequest,
  UpdateDeadlinesRequest,
} from "@/types/system-settings";

// Mock data for development
const mockAssessmentPeriods: AssessmentPeriod[] = [
  {
    id: "1",
    performanceYear: 2023,
    assessmentYear: 2024,
    status: "active",
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "2",
    performanceYear: 2022,
    assessmentYear: 2023,
    status: "archived",
    createdAt: "2023-01-15T00:00:00Z",
    updatedAt: "2023-12-31T00:00:00Z",
  },
  {
    id: "3",
    performanceYear: 2024,
    assessmentYear: 2025,
    status: "upcoming",
    createdAt: "2024-06-01T00:00:00Z",
    updatedAt: "2024-06-01T00:00:00Z",
  },
];

const mockDeadlines: AssessmentPeriodDeadlines = {
  id: "1",
  periodId: "1",
  blguSubmissionDeadline: "2024-03-31T23:59:59Z",
  reworkCompletionDeadline: "2024-04-30T23:59:59Z",
  createdAt: "2024-01-15T00:00:00Z",
  updatedAt: "2024-01-15T00:00:00Z",
};

export function useSystemSettings() {
  const [periods, setPeriods] = useState<AssessmentPeriod[]>(mockAssessmentPeriods);
  const [deadlines, setDeadlines] = useState<AssessmentPeriodDeadlines | undefined>(mockDeadlines);
  const [isLoading, setIsLoading] = useState(false);

  const createAssessmentPeriod = useCallback(async (data: CreateAssessmentPeriodRequest) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newPeriod: AssessmentPeriod = {
        id: Date.now().toString(),
        ...data,
        status: "upcoming",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setPeriods((prev) => [...prev, newPeriod]);
    } catch (error) {
      console.error("Error creating assessment period:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const activateAssessmentPeriod = useCallback(async (periodId: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setPeriods((prev) =>
        prev.map((period) => ({
          ...period,
          status:
            period.id === periodId
              ? "active"
              : period.status === "active"
                ? "archived"
                : period.status,
          updatedAt: new Date().toISOString(),
        }))
      );
    } catch (error) {
      console.error("Error activating assessment period:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const archiveAssessmentPeriod = useCallback(async (periodId: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setPeriods((prev) =>
        prev.map((period) =>
          period.id === periodId
            ? { ...period, status: "archived", updatedAt: new Date().toISOString() }
            : period
        )
      );
    } catch (error) {
      console.error("Error archiving assessment period:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteAssessmentPeriod = useCallback(async (periodId: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setPeriods((prev) => prev.filter((period) => period.id !== periodId));
    } catch (error) {
      console.error("Error deleting assessment period:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveDeadlines = useCallback(
    async (data: UpdateDeadlinesRequest) => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const updatedDeadlines: AssessmentPeriodDeadlines = {
          id: deadlines?.id || Date.now().toString(),
          periodId: deadlines?.periodId || "1",
          ...data,
          createdAt: deadlines?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setDeadlines(updatedDeadlines);
      } catch (error) {
        console.error("Error saving deadlines:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [deadlines]
  );

  const getActivePeriod = useCallback(() => {
    return periods.find((period) => period.status === "active");
  }, [periods]);

  return {
    periods,
    deadlines,
    isLoading,
    createAssessmentPeriod,
    activateAssessmentPeriod,
    archiveAssessmentPeriod,
    deleteAssessmentPeriod,
    saveDeadlines,
    getActivePeriod,
  };
}
