/**
 * ReworkSummaryCard Component
 *
 * Displays the AI-generated summary for a single indicator requiring rework.
 * Shows key issues, suggested actions, and affected MOV files.
 */

import { AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { IndicatorSummary } from '@/types/rework-summary';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReworkSummaryCardProps {
  /** Indicator summary data */
  summary: IndicatorSummary;
  /** Whether to show in collapsed mode (brief view) */
  collapsed?: boolean;
}

export function ReworkSummaryCard({
  summary,
  collapsed = false,
}: ReworkSummaryCardProps) {
  if (collapsed) {
    return (
      <div className="p-3 border border-amber-200 bg-amber-50 rounded-sm">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900">
              {summary.indicator_name}
            </p>
            {summary.key_issues.length > 0 && (
              <p className="text-xs text-amber-700 mt-1 line-clamp-2">
                {summary.key_issues[0]}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <span>{summary.indicator_name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Issues */}
        {summary.key_issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Key Issues
            </h4>
            <ul className="space-y-1.5 pl-6">
              {summary.key_issues.map((issue, index) => (
                <li
                  key={index}
                  className="text-sm text-gray-700 list-disc marker:text-red-500"
                >
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Actions */}
        {summary.suggested_actions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Suggested Actions
            </h4>
            <ul className="space-y-1.5 pl-6">
              {summary.suggested_actions.map((action, index) => (
                <li
                  key={index}
                  className="text-sm text-gray-700 list-decimal marker:text-green-600 marker:font-semibold"
                >
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Affected MOV Files */}
        {summary.affected_movs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Affected Documents
            </h4>
            <div className="flex flex-wrap gap-2">
              {summary.affected_movs.map((filename, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs font-normal"
                >
                  {filename}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
