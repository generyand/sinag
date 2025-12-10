import { Assessment } from "@/types/assessment";
import {
  AssessmentResponseUpdate,
  AssessmentStatus,
  MOVCreate,
  deleteAssessmentsMovs$MovId,
  getGetAssessmentsMyAssessmentQueryKey,
  postAssessmentsResponses$ResponseIdMovs,
  postAssessmentsSubmit,
  putAssessmentsResponses$ResponseId,
  useGetAssessmentsMyAssessment,
} from "@sinag/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
// Custom debounce implementation
function debounce<TArgs extends unknown[], TReturn>(
  func: (...args: TArgs) => TReturn,
  wait: number,
  options = { maxWait: undefined as number | undefined }
): ((...args: TArgs) => TReturn) & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | undefined;
  let maxTimeoutId: NodeJS.Timeout | undefined;
  let lastCallTime: number | undefined;

  let lastArgs: TArgs | undefined;
  let result: TReturn;

  const debounced = ((...args: TArgs) => {
    const time = Date.now();
    lastArgs = args;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!lastCallTime && options.maxWait) {
      maxTimeoutId = setTimeout(() => {
        if (lastArgs) {
          lastArgs = undefined;
          lastCallTime = time;
          result = func(...args);
        }
      }, options.maxWait);
    }

    timeoutId = setTimeout(() => {
      if (lastArgs) {
        lastArgs = undefined;
        lastCallTime = time;
        result = func(...args);
      }
    }, wait);

    return result;
  }) as ((...args: TArgs) => TReturn) & { cancel: () => void };

  debounced.cancel = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (maxTimeoutId) {
      clearTimeout(maxTimeoutId);
    }
    lastArgs = undefined;
  };

  return debounced;
}

// Query keys for assessment data
const assessmentKeys = {
  all: ["assessment"] as const,
  current: () => [...assessmentKeys.all, "current"] as const,
  validation: () => [...assessmentKeys.all, "validation"] as const,
};

/**
 * Hook to fetch the current assessment data
 */
export function useCurrentAssessment() {
  const {
    data: assessmentData,
    isLoading,
    error,
    refetch,
  } = useGetAssessmentsMyAssessment({
    query: {
      // Shorter staleTime for faster updates after file uploads
      // Invalidations will trigger immediate refetch when data is stale
      staleTime: 30 * 1000, // 30 seconds - faster updates for file uploads
      gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
      // Refetch on window focus to catch any missed updates
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    },
  } as any);

  // Transform API response to match frontend expectations
  interface APIAssessment {
    assessment: {
      id: number;
      status: string;
      barangay_id?: number;
      barangay_name?: string;
      created_at: string;
      updated_at: string;
      submitted_at?: string;
    };
    governance_areas: Array<{
      id: number;
      name: string;
      area_type: string;
      indicators: Array<IndicatorNode>;
    }>;
  }

  interface IndicatorNode {
    id: number;
    name: string;
    description: string;
    form_schema?: Record<string, unknown> & {
      required?: string[];
    };
    response?: {
      id?: number;
      is_completed?: boolean;
      requires_rework?: boolean;
      response_data?: Record<string, unknown>;
    };
    movs?: Array<{
      id: string;
      name: string;
      size: number;
      url?: string;
      storage_path?: string;
    }>;
    feedback_comments?: Array<{
      comment: string;
    }>;
    children?: Array<IndicatorNode>;
  }

  type MappedIndicator = Record<string, unknown> & {
    children?: MappedIndicator[];
  };

  const mapIndicatorTree = (areaId: number, indicator: IndicatorNode): MappedIndicator => {
    const mapped = {
      id: indicator.id.toString(),
      // Preserve backend link to real DB indicator for synthetic children
      responseIndicatorId:
        (indicator as any).responseIndicatorId ?? (indicator as any).response_indicator_id,
      code: (() => {
        // Use indicator_code from backend if it exists (CRITICAL FIX: field name is indicator_code not code)
        if ((indicator as any).indicator_code) {
          return (indicator as any).indicator_code;
        }
        // Fallback: try code field for compatibility
        if ((indicator as any).code) {
          return (indicator as any).code;
        }
        // If the indicator name already has a code pattern, extract it
        const full = indicator.name.match(/^(\d+(?:\.\d+)+)/)?.[1];
        if (full) {
          return full;
        }
        // For indicators without codes, generate a simple one
        return `${areaId}.${indicator.id}`;
      })(),
      name: indicator.name,
      description: indicator.description,
      technicalNotes: "See form schema for requirements",
      governanceAreaId: areaId.toString(),
      status: indicator.response
        ? (indicator.response as any).is_completed === true
          ? ("completed" as const)
          : ("in_progress" as const)
        : ("not_started" as const),
      // Try to infer a generalized compliance answer from various backend field names
      // For areas 1-6, check for fields ending in _compliance (like bpoc_documents_compliance)
      // For Area 1 with multiple fields, use "yes" if any field is "yes", otherwise check all are answered
      // Also check common compliance field names
      complianceAnswer: (() => {
        const data = indicator.response?.response_data as any;
        if (!data) return undefined;

        // First, check for fields ending in _compliance (for areas 1-6)
        const complianceFields: string[] = [];
        for (const key in data) {
          if (key.endsWith("_compliance") && typeof data[key] === "string") {
            const val = data[key].toLowerCase();
            if (val === "yes" || val === "no" || val === "na") {
              complianceFields.push(val);
            }
          }
        }

        // If we found compliance fields, determine the answer:
        // - If any field is "yes", return "yes" (need MOVs)
        // - If all fields are answered (yes/no/na), return the first one for compatibility
        // - Otherwise undefined (not all answered)
        if (complianceFields.length > 0) {
          // Check form schema to see how many compliance fields are required
          const formSchema = indicator.form_schema || {};
          const requiredFields = formSchema.required || [];
          const complianceRequiredFields = requiredFields.filter((f: string) =>
            f.endsWith("_compliance")
          );

          // If we have all required compliance fields answered, return based on content
          if (
            complianceFields.length >= complianceRequiredFields.length ||
            complianceRequiredFields.length === 0
          ) {
            // If any field is "yes", return "yes" (indicates MOVs needed)
            if (complianceFields.some((v) => v === "yes")) {
              return "yes" as any;
            }
            // All fields answered, return first one (for areas 2-6 with single field)
            return complianceFields[0] as any;
          }
          // Not all required fields answered yet
          return undefined;
        }

        // Fall back to common compliance field names
        const val =
          data.compliance ??
          data.is_compliant ??
          data.answer ??
          data.has_budget_plan ??
          data.is_compliance;
        if (typeof val === "string") return val as any;
        if (typeof val === "boolean") return (val ? "yes" : "no") as any;
        return undefined;
      })(),
      movFiles: (indicator.movs || []).map((m: any) => {
        const storagePath = m.storage_path || (m as any).storagePath || "";
        // Detect section from storage path (same logic as DynamicIndicatorForm)
        const section = (() => {
          if (typeof storagePath !== "string") return undefined;
          const sections = [
            "bfdp_monitoring_forms",
            "photo_documentation",
            "bdrrmc_documents",
            "bpoc_documents",
            "social_welfare_documents",
            "business_registration_documents",
            "beswmc_documents",
          ];
          for (const sec of sections) {
            const pathOnly = storagePath.split("?")[0]; // Remove query params if present
            const hasSection =
              pathOnly.includes(`/${sec}/`) ||
              pathOnly.endsWith(`/${sec}`) ||
              pathOnly.includes(`/${sec}-`) ||
              pathOnly.includes(`${sec}/`) ||
              new RegExp(`[/_-]${sec.replace(/_/g, "[_/]")}[_/-]`).test(pathOnly);

            if (hasSection) {
              return sec;
            }
          }
          return undefined;
        })();

        return {
          id: String(m.id),
          name: m.name ?? m.original_filename ?? m.filename,
          size: m.size ?? m.file_size,
          url: m.url ?? "",
          storagePath,
          section,
        };
      }),
      assessorComment: indicator.feedback_comments?.[0]?.comment,
      responseId: indicator.response?.id ?? null,
      requiresRework: indicator.response?.requires_rework === true,
      // Use form schema from backend, fallback to simple compliance if not available
      formSchema: indicator.form_schema || {
        properties: {
          compliance: {
            type: "string" as const,
            title: "Compliance",
            description: "Is this indicator compliant?",
            required: true,
            enum: ["yes", "no", "na"],
          },
        },
      },
      responseData: indicator.response?.response_data || {},
      children: (indicator.children || []).map((child) => mapIndicatorTree(areaId, child)),
    };
    return mapped;
  };

  const transformedData = assessmentData
    ? {
        id: (assessmentData as unknown as APIAssessment).assessment.id.toString(),
        barangayId:
          (assessmentData as unknown as APIAssessment).assessment.barangay_id?.toString() ||
          "unknown",
        barangayName:
          (assessmentData as unknown as APIAssessment).assessment.barangay_name ||
          "Unknown Barangay",
        status: (assessmentData as unknown as APIAssessment).assessment.status
          .toLowerCase()
          .replaceAll("_", "-") as AssessmentStatus,
        createdAt: (assessmentData as unknown as APIAssessment).assessment.created_at,
        updatedAt: (assessmentData as unknown as APIAssessment).assessment.updated_at,
        submittedAt: (assessmentData as unknown as APIAssessment).assessment.submitted_at,
        governanceAreas: (assessmentData as unknown as APIAssessment).governance_areas.map(
          (area) => ({
            id: area.id.toString(),
            name: area.name,
            code: area.name.substring(0, 2).toUpperCase(),
            description: `${area.name} governance area`,
            isCore: area.area_type === "Core",
            indicators: area.indicators
              .filter((i) => true) // top-level already from API
              .map((indicator) => mapIndicatorTree(area.id, indicator)),
          })
        ),
        totalIndicators: (() => {
          // Count only LEAF indicators (indicators without children)
          // For areas with parent-child structure (1-6), only count children
          const countLeafIndicators = (nodes: IndicatorNode[] | undefined): number =>
            (nodes || []).reduce((acc, n) => {
              // If node has children, count children instead of the parent
              if (n.children && n.children.length > 0) {
                return acc + countLeafIndicators(n.children);
              }
              // Count leaf indicators only
              return acc + 1;
            }, 0);
          return (assessmentData as unknown as APIAssessment).governance_areas.reduce(
            (total, area) => total + countLeafIndicators(area.indicators),
            0
          );
        })(),
        completedIndicators: (() => {
          // TRUST BACKEND'S is_completed FLAG
          // The backend handles ALL validation logic including:
          // - Legacy compliance-based indicators (areas 1-6)
          // - Grouped OR validation (e.g., 6.2.1 with option groups)
          // - Conditional MOV requirements
          // - All form schema validation types
          // Frontend should NOT recalculate - just count backend's is_completed flags
          const countCompleted = (nodes: IndicatorNode[] | undefined): number =>
            (nodes || []).reduce((acc, n) => {
              // If node has children, count children instead of the parent
              if (n.children && n.children.length > 0) {
                return acc + countCompleted(n.children);
              }

              // Trust backend's is_completed flag (set by completeness_validation_service.py)
              const isCompleted = n.response?.is_completed === true;
              return acc + (isCompleted ? 1 : 0);
            }, 0);
          return (assessmentData as unknown as APIAssessment).governance_areas.reduce(
            (total, area) => total + countCompleted(area.indicators),
            0
          );
        })(),
        needsReworkIndicators: (assessmentData as unknown as APIAssessment).governance_areas.reduce(
          (total, area) => {
            const countRework = (nodes: IndicatorNode[] | undefined): number =>
              (nodes || []).reduce(
                (acc, n) =>
                  acc + ((n.feedback_comments || []).length > 0 ? 1 : 0) + countRework(n.children),
                0
              );
            return total + countRework(area.indicators);
          },
          0
        ),
      }
    : null;

  // Keep a local editable copy so components can update progress immediately
  const [localAssessment, setLocalAssessment] = useState<Assessment | null>(
    transformedData as unknown as Assessment | null
  );

  // Sync local assessment whenever the server data changes
  // But preserve optimistic updates to prevent race conditions where server hasn't processed updates yet
  useEffect(() => {
    if (transformedData) {
      setLocalAssessment((prev) => {
        // If we have a previous state with optimistic updates, be smart about when to sync
        if (prev && transformedData) {
          const serverCompleted = (transformedData as any).completedIndicators || 0;
          const localCompleted = prev.completedIndicators || 0;
          const serverTotal = (transformedData as any).totalIndicators || 0;
          const localTotal = prev.totalIndicators || 0;

          // If totals don't match, always sync (schema might have changed)
          if (serverTotal !== localTotal) {
            return transformedData as unknown as Assessment;
          }

          // If local has higher completion count, preserve it (server might be stale)
          // Only sync if server count is higher or equal (meaning server caught up)
          if (serverCompleted >= localCompleted) {
            return transformedData as unknown as Assessment;
          }

          // If server is lower, keep optimistic update but merge other changes if needed
          // This prevents flickering when server hasn't finished processing yet
          return prev;
        }
        return transformedData as unknown as Assessment;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentData]);

  return {
    data: localAssessment,
    isLoading,
    error,
    refetch,
    updateAssessmentData: (updater: (data: Assessment) => Assessment) => {
      setLocalAssessment((prev) => {
        if (!prev) return prev;
        // Apply caller's changes
        const next = updater({ ...prev });
        // Recompute derived metrics so header updates immediately
        // Count only LEAF indicators (same logic as initial count)
        const countAll = (nodes: any[] | undefined): number =>
          (nodes || []).reduce((acc, n) => {
            // If node has children, count children instead of the parent
            if (n.children && n.children.length > 0) {
              return acc + countAll(n.children);
            }
            // Count leaf indicators only
            return acc + 1;
          }, 0);
        const countCompleted = (nodes: any[] | undefined): number =>
          (nodes || []).reduce((acc, n) => {
            // If node has children, count children instead of the parent
            if (n.children && n.children.length > 0) {
              return acc + countCompleted(n.children);
            }

            // TRUST BACKEND'S STATUS
            // Check the indicator's status field which is derived from backend's is_completed
            // status is set to "completed" only when backend validates it as complete
            const isCompleted = n.status === "completed";
            return acc + (isCompleted ? 1 : 0);
          }, 0);
        const total = (next.governanceAreas || []).reduce(
          (sum, area: any) => sum + countAll(area.indicators),
          0
        );
        const completed = (next.governanceAreas || []).reduce(
          (sum, area: any) => sum + countCompleted(area.indicators),
          0
        );
        (next as any).totalIndicators = total;
        (next as any).completedIndicators = completed;
        (next as any).updatedAt = new Date().toISOString();
        return next;
      });
    },
  };
}

/**
 * Hook to validate assessment completion
 */
export function useAssessmentValidation(assessment: Assessment | null) {
  return useMemo(() => {
    if (!assessment) {
      return {
        isComplete: false,
        missingIndicators: [],
        missingMOVs: [],
        canSubmit: false,
      };
    }

    const missingIndicators: string[] = [];
    const missingMOVs: string[] = []; // Intentionally left empty as we group everything under missingIndicators

    // Recursively check all indicators (including children) across all governance areas
    // Trust backend's status which handles all complex validation logic
    const checkIndicator = (indicator: any) => {
      // If indicator has children, check children instead of parent
      if (indicator.children && indicator.children.length > 0) {
        indicator.children.forEach((child: any) => checkIndicator(child));
        return;
      }

      // Check the indicator's status field (derived from backend is_completed)
      // "completed" means it passed all validations (structure, data, movs)
      if (indicator.status !== "completed") {
        missingIndicators.push(`${indicator.code} - ${indicator.name}`);
      }
    };

    // Check all indicators across all governance areas
    if (assessment.governanceAreas) {
      assessment.governanceAreas.forEach((area) => {
        if (area.indicators) {
          area.indicators.forEach((indicator) => {
            checkIndicator(indicator);
          });
        }
      });
    }

    const isComplete = assessment.completedIndicators === assessment.totalIndicators;

    // Status comparison should be case-insensitive since backend returns lowercase
    const normalizedStatus = (assessment.status || "").toLowerCase();
    const canSubmit =
      isComplete &&
      (normalizedStatus === "draft" ||
        normalizedStatus === "rework" ||
        normalizedStatus === "needs-rework");

    return {
      isComplete,
      missingIndicators,
      missingMOVs, // Always empty now
      canSubmit,
    };
  }, [assessment]);
}

/**
 * Hook to update indicator compliance answer
 */
export function useUpdateIndicatorAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      responseId,
      data,
    }: {
      responseId: number;
      data: AssessmentResponseUpdate;
    }) => {
      return putAssessmentsResponses$ResponseId(responseId, data);
    },
    onSuccess: () => {
      // Single invalidation triggers automatic refetch for active queries
      // No need to manually refetch multiple times - invalidation handles it
      queryClient.invalidateQueries({
        queryKey: getGetAssessmentsMyAssessmentQueryKey(),
        refetchType: "active", // Only refetch queries currently mounted
      });
    },
  });
}

/**
 * Hook to upload MOV files
 */
export function useUploadMOV() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ responseId, data }: { responseId: number; data: MOVCreate }) => {
      return postAssessmentsResponses$ResponseIdMovs(responseId, data);
    },
    onSuccess: () => {
      // Invalidate queries - React Query handles refetching active queries automatically
      // No artificial delay needed - backend processes synchronously
      queryClient.invalidateQueries({
        queryKey: getGetAssessmentsMyAssessmentQueryKey(),
        refetchType: "active", // Only refetch queries currently mounted
      });
    },
  });
}

/**
 * Hook to delete MOV files
 */
export function useDeleteMOV() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ movId, storagePath }: { movId: number; storagePath?: string }) => {
      // Try deleting from Supabase first if we have a storage path
      if (storagePath) {
        try {
          const { deleteMovFile } = await import("@/lib/uploadMov");
          await deleteMovFile(storagePath);
        } catch (err) {
          // Continue with DB deletion even if storage deletion fails

          console.warn("Failed to delete file from storage:", err);
        }
      }
      // Remove DB record
      return deleteAssessmentsMovs$MovId(movId);
    },
    onSuccess: () => {
      // Invalidate queries - React Query handles refetching active queries automatically
      // No artificial delay needed - backend processes synchronously
      queryClient.invalidateQueries({
        queryKey: getGetAssessmentsMyAssessmentQueryKey(),
        refetchType: "active", // Only refetch queries currently mounted
      });
    },
  });
}

/**
 * Hook to submit assessment for review
 */
export function useSubmitAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return postAssessmentsSubmit();
    },
    onSuccess: () => {
      // Invalidate queries - React Query handles refetching active queries automatically
      queryClient.invalidateQueries({
        queryKey: getGetAssessmentsMyAssessmentQueryKey(),
        refetchType: "active", // Only refetch queries currently mounted
      });
    },
  });
}

/**
 * Hook to get indicator by ID
 */
export function useIndicator(indicatorId: string) {
  const { data: assessment } = useCurrentAssessment();

  return useMemo(() => {
    if (!assessment) return null;

    const findInTree = (nodes: any[]): any | null => {
      for (const n of nodes) {
        if (n.id === indicatorId) return n;
        const found = n.children && findInTree(n.children);
        if (found) return found;
      }
      return null;
    };

    if (assessment.governanceAreas && Array.isArray(assessment.governanceAreas)) {
      for (const area of assessment.governanceAreas) {
        if (area.indicators && Array.isArray(area.indicators)) {
          const indicator = findInTree(area.indicators as any);
          if (indicator) return indicator;
        }
      }
    }

    return null;
  }, [assessment, indicatorId]);
}

/**
 * Hook to get governance area by ID
 */
export function useGovernanceArea(areaId: string) {
  const { data: assessment } = useCurrentAssessment();

  return useMemo(() => {
    if (!assessment || !assessment.governanceAreas || !Array.isArray(assessment.governanceAreas))
      return null;

    return assessment.governanceAreas.find((area) => area.id === areaId) || null;
  }, [assessment, areaId]);
}

/**
 * Hook to update indicator response data with debouncing
 */
export function useUpdateResponse() {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: async ({
      responseId,
      data,
    }: {
      responseId: number;
      data: AssessmentResponseUpdate;
    }) => {
      return putAssessmentsResponses$ResponseId(responseId, data);
    },
    onSuccess: () => {
      // Invalidate queries - React Query handles refetching active queries automatically
      // No artificial delay needed - backend processes synchronously
      queryClient.invalidateQueries({
        queryKey: getGetAssessmentsMyAssessmentQueryKey(),
        refetchType: "active", // Only refetch queries currently mounted
      });
    },
  });

  // Create a debounced version of the mutation
  const debouncedUpdate = useMemo(
    () =>
      debounce(
        (responseId: number, data: AssessmentResponseUpdate) => {
          updateMutation.mutate({ responseId, data });
        },
        1000, // 1 second delay
        { maxWait: 5000 } // Maximum 5 seconds wait
      ),
    [updateMutation]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  return {
    updateResponse: debouncedUpdate,
    isLoading: updateMutation.isPending,
    error: updateMutation.error,
  };
}
