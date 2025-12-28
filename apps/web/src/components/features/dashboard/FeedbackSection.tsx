"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssessorFeedback } from "@/types/dashboard";
import { AlertTriangle, ArrowRight, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";

interface FeedbackSectionProps {
  feedback: AssessorFeedback[];
}

export function FeedbackSection({ feedback }: FeedbackSectionProps) {
  const router = useRouter();

  if (feedback.length === 0) {
    return null;
  }

  const truncateComment = (comment: string, maxLength: number = 90) => {
    if (comment.length <= maxLength) return comment;
    return comment.substring(0, maxLength) + "...";
  };

  return (
    <Card className="w-full bg-[var(--card)] border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow duration-200 rounded-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-[var(--foreground)]">
          <AlertTriangle className="h-5 w-5 text-[var(--cityscape-yellow)]" />
          Action Required: Address Assessor&apos;s Feedback
        </CardTitle>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Review and address the following items to proceed with your assessment.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {feedback.slice(0, 3).map((item) => (
            <div
              key={String(item.id)}
              className="bg-[var(--hover)] backdrop-blur-sm rounded-sm p-4 border border-[var(--border)] shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <MessageSquare className="h-4 w-4 text-[var(--cityscape-yellow)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="inline-flex items-center px-2 py-1 rounded-sm bg-[var(--cityscape-yellow)]/20 text-[var(--cityscape-yellow)] text-xs font-medium font-mono border border-[var(--cityscape-yellow)]/30">
                      {typeof (item as any).indicator === "string"
                        ? String((item as any).indicator)
                        : String((item as any).indicator?.name ?? "Indicator")}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">•</span>
                    <span className="text-xs text-[var(--text-secondary)] font-medium">
                      {String((item as any).governance_area)}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--foreground)] leading-relaxed">
                    {truncateComment(String((item as any).comment))}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {feedback.length > 3 && (
            <div className="text-center py-2">
              <span className="text-xs text-[var(--cityscape-yellow)] bg-[var(--cityscape-yellow)]/10 px-3 py-1 rounded-sm border border-[var(--cityscape-yellow)]/20">
                +{feedback.length - 3} more items require attention
              </span>
            </div>
          )}

          <div className="flex justify-center pt-4">
            <Button
              onClick={() => router.push("/blgu/assessments")}
              className="bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow-dark)] text-[var(--cityscape-accent-foreground)] flex items-center gap-2 rounded-sm font-medium shadow-sm transition-all duration-200"
            >
              View all feedback and begin rework
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
