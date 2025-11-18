import { ValidatorValidationClient } from '@/components/features/validator';
import { notFound } from 'next/navigation';

interface PageProps {
  params: { assessmentId: string };
}

export default async function ValidatorValidationPage({ params }: PageProps) {
  const numericId = Number(params.assessmentId);
  if (!Number.isFinite(numericId)) {
    notFound();
  }

  return <ValidatorValidationClient assessmentId={numericId} />;
}
