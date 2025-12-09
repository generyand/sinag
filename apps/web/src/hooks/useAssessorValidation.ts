import { useGetAssessorAssessmentsAssessmentId } from "@sinag/shared";

type AnyRecord = Record<string, any>;

export function useAssessorAssessmentDetails(assessmentId: number) {
  const query = useGetAssessorAssessmentsAssessmentId(assessmentId);
  const data = query.data as unknown as AnyRecord | undefined;
  const core = (data?.assessment as AnyRecord) ?? data ?? {};
  const responses: AnyRecord[] = (core.responses as AnyRecord[]) ?? [];
  const reworkCount: number = core.rework_count ?? 0;
  return { ...query, responses, reworkCount };
}
