import { SubmissionsQueue } from "@/components/features";
import { PageHeader } from "@/components/shared";

export default async function AssessorDashboardPage() {
  // Server component shell; SubmissionsQueue fetches queue data client-side via useAssessorQueue hook
  return (
    <div className="space-y-6">
      <PageHeader title="Assessor Dashboard" description="Review BLGU submissions." />
      <SubmissionsQueue />
    </div>
  );
}
