import { AssessorValidationClient } from '@/components/features/assessor/validation';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ assessmentId: string }>;
}

export default async function ValidationPage({ params }: PageProps) {
  const { assessmentId } = await params;
  const numericId = Number(assessmentId);
  if (!Number.isFinite(numericId)) {
    notFound();
  }

  return <AssessorValidationClient assessmentId={numericId} />;
}


