import { ComplianceOverviewClient } from "@/components/features/validator";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ assessmentId: string }>;
}

export default async function ValidatorCompliancePage({ params }: PageProps) {
  const { assessmentId } = await params;
  const numericId = Number(assessmentId);
  if (!Number.isFinite(numericId)) {
    notFound();
  }

  return <ComplianceOverviewClient assessmentId={numericId} />;
}
