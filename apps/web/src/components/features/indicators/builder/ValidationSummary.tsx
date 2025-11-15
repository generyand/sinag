'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  FileText,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Validation Summary Component
 *
 * Displays validation results for indicator tree with error/warning details.
 *
 * Features:
 * - Summary statistics (total, complete, incomplete, errors, warnings)
 * - Progress visualization
 * - Grouped errors by indicator
 * - Severity color coding
 * - Navigation to specific indicators
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: ValidationSeverity;
  code?: string; // Error code for i18n
}

export interface IndicatorValidationResult {
  indicatorId: string;
  indicatorCode?: string;
  indicatorName: string;
  isValid: boolean;
  isComplete: boolean;
  issues: ValidationIssue[];
}

export interface ValidationSummary {
  totalIndicators: number;
  completeIndicators: number;
  incompleteIndicators: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  results: IndicatorValidationResult[];
}

interface ValidationSummaryProps {
  /** Validation summary data */
  summary: ValidationSummary;

  /** Callback when user clicks on an indicator to fix issues */
  onNavigateToIndicator?: (indicatorId: string) => void;

  /** Whether validation is in progress */
  isValidating?: boolean;

  /** Custom class name */
  className?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get severity icon and color
 */
function getSeverityConfig(severity: ValidationSeverity): {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  textColor: string;
} {
  switch (severity) {
    case 'error':
      return {
        icon: <XCircle className="h-4 w-4" />,
        color: 'text-destructive',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        textColor: 'text-red-700 dark:text-red-400',
      };
    case 'warning':
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'text-yellow-600 dark:text-yellow-500',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
        textColor: 'text-yellow-700 dark:text-yellow-400',
      };
    case 'info':
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        color: 'text-blue-600 dark:text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-950/20',
        textColor: 'text-blue-700 dark:text-blue-400',
      };
    default:
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        color: 'text-muted-foreground dark:text-gray-400',
        bgColor: 'bg-muted dark:bg-gray-700',
        textColor: 'text-muted-foreground dark:text-gray-400',
      };
  }
}

/**
 * Get indicator status badge
 */
function getIndicatorStatusBadge(result: IndicatorValidationResult): {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  icon: React.ReactNode;
} {
  if (result.isComplete && result.isValid) {
    return {
      label: 'Complete',
      variant: 'default',
      icon: <CheckCircle2 className="h-3 w-3" />,
    };
  } else if (result.issues.some((i) => i.severity === 'error')) {
    return {
      label: 'Error',
      variant: 'destructive',
      icon: <XCircle className="h-3 w-3" />,
    };
  } else if (result.issues.some((i) => i.severity === 'warning')) {
    return {
      label: 'Warning',
      variant: 'outline',
      icon: <AlertTriangle className="h-3 w-3" />,
    };
  } else {
    return {
      label: 'Incomplete',
      variant: 'secondary',
      icon: <AlertCircle className="h-3 w-3" />,
    };
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Summary Statistics Cards
 */
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
      <div className={cn('flex-shrink-0', color)}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold dark:text-gray-100">{value}</div>
        <div className="text-xs text-muted-foreground dark:text-gray-400 truncate">{title}</div>
      </div>
    </div>
  );
}

/**
 * Indicator Validation Item
 */
interface IndicatorValidationItemProps {
  result: IndicatorValidationResult;
  onNavigate?: (indicatorId: string) => void;
}

function IndicatorValidationItem({ result, onNavigate }: IndicatorValidationItemProps) {
  const statusBadge = getIndicatorStatusBadge(result);
  const hasIssues = result.issues.length > 0;

  return (
    <AccordionItem value={result.indicatorId} className="border dark:border-gray-700 rounded-lg px-4 dark:bg-gray-800">
      <AccordionTrigger className="hover:no-underline py-3">
        <div className="flex items-center gap-3 flex-1 text-left">
          {/* Status Badge */}
          <Badge variant={statusBadge.variant} className="gap-1 flex-shrink-0">
            {statusBadge.icon}
            {statusBadge.label}
          </Badge>

          {/* Indicator Info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate dark:text-gray-100">
              {result.indicatorCode && (
                <span className="text-muted-foreground dark:text-gray-400 mr-2">{result.indicatorCode}</span>
              )}
              {result.indicatorName}
            </div>
            {hasIssues && (
              <div className="text-xs text-muted-foreground dark:text-gray-400 mt-1">
                {result.issues.length} issue{result.issues.length !== 1 ? 's' : ''} found
              </div>
            )}
          </div>

          {/* Navigate Button */}
          {onNavigate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(result.indicatorId);
              }}
              className="flex-shrink-0 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Go to Indicator
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </AccordionTrigger>

      {hasIssues && (
        <AccordionContent className="pb-3">
          <div className="space-y-2 pt-2">
            {result.issues.map((issue, index) => {
              const config = getSeverityConfig(issue.severity);
              return (
                <div
                  key={index}
                  className={cn(
                    'flex items-start gap-2 p-3 rounded-lg',
                    config.bgColor
                  )}
                >
                  <div className={cn('flex-shrink-0 mt-0.5', config.textColor)}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-sm font-medium', config.textColor)}>
                      {issue.field}
                    </div>
                    <div className={cn('text-sm mt-1', config.textColor)}>
                      {issue.message}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </AccordionContent>
      )}
    </AccordionItem>
  );
}

// ============================================================================
// Main Validation Summary Component
// ============================================================================

export function ValidationSummary({
  summary,
  onNavigateToIndicator,
  isValidating = false,
  className = '',
}: ValidationSummaryProps) {
  const completionPercentage = React.useMemo(() => {
    if (summary.totalIndicators === 0) return 0;
    return Math.round((summary.completeIndicators / summary.totalIndicators) * 100);
  }, [summary.totalIndicators, summary.completeIndicators]);

  // Group results by status
  const { errored, warned, incomplete } = React.useMemo(() => {
    const errored: IndicatorValidationResult[] = [];
    const warned: IndicatorValidationResult[] = [];
    const incomplete: IndicatorValidationResult[] = [];
    const complete: IndicatorValidationResult[] = [];

    summary.results.forEach((result) => {
      if (result.isComplete && result.isValid) {
        complete.push(result);
      } else if (result.issues.some((i) => i.severity === 'error')) {
        errored.push(result);
      } else if (result.issues.some((i) => i.severity === 'warning')) {
        warned.push(result);
      } else {
        incomplete.push(result);
      }
    });

    return { errored, warned, incomplete };
  }, [summary.results]);

  if (isValidating) {
    return (
      <Card className={cn(className, 'dark:bg-gray-800 dark:border-gray-700')}>
        <CardContent className="py-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm text-muted-foreground dark:text-gray-400">Validating indicators...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Statistics */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-gray-100">Validation Summary</CardTitle>
          <CardDescription className="dark:text-gray-400">
            Overview of indicator completion and validation status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium dark:text-gray-200">Overall Completion</span>
              <span className="text-muted-foreground dark:text-gray-400">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-3" />
            <div className="text-xs text-muted-foreground dark:text-gray-400">
              {summary.completeIndicators} of {summary.totalIndicators} indicators complete
            </div>
          </div>

          <Separator className="dark:bg-gray-700" />

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Indicators"
              value={summary.totalIndicators}
              icon={<FileText className="h-5 w-5" />}
              color="text-muted-foreground"
            />
            <StatCard
              title="Complete"
              value={summary.completeIndicators}
              icon={<CheckCircle2 className="h-5 w-5" />}
              color="text-green-600"
            />
            <StatCard
              title="Errors"
              value={summary.errorCount}
              icon={<XCircle className="h-5 w-5" />}
              color="text-destructive"
            />
            <StatCard
              title="Warnings"
              value={summary.warningCount}
              icon={<AlertTriangle className="h-5 w-5" />}
              color="text-yellow-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      {(errored.length > 0 || warned.length > 0 || incomplete.length > 0) && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">Issues Requiring Attention</CardTitle>
            <CardDescription className="dark:text-gray-400">
              Fix these issues to complete the indicator set
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="space-y-2">
              {/* Errors First */}
              {errored.length > 0 && (
                <>
                  <div className="text-sm font-semibold text-destructive dark:text-red-400 mb-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Errors ({errored.length})
                  </div>
                  {errored.map((result) => (
                    <IndicatorValidationItem
                      key={result.indicatorId}
                      result={result}
                      onNavigate={onNavigateToIndicator}
                    />
                  ))}
                </>
              )}

              {/* Warnings */}
              {warned.length > 0 && (
                <>
                  <div className="text-sm font-semibold text-yellow-600 dark:text-yellow-500 mb-2 flex items-center gap-2 mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    Warnings ({warned.length})
                  </div>
                  {warned.map((result) => (
                    <IndicatorValidationItem
                      key={result.indicatorId}
                      result={result}
                      onNavigate={onNavigateToIndicator}
                    />
                  ))}
                </>
              )}

              {/* Incomplete */}
              {incomplete.length > 0 && (
                <>
                  <div className="text-sm font-semibold text-muted-foreground dark:text-gray-400 mb-2 flex items-center gap-2 mt-4">
                    <AlertCircle className="h-4 w-4" />
                    Incomplete ({incomplete.length})
                  </div>
                  {incomplete.map((result) => (
                    <IndicatorValidationItem
                      key={result.indicatorId}
                      result={result}
                      onNavigate={onNavigateToIndicator}
                    />
                  ))}
                </>
              )}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {errored.length === 0 && warned.length === 0 && incomplete.length === 0 && summary.totalIndicators > 0 && (
        <Card className="border-green-500 dark:border-green-600 dark:bg-gray-800">
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center gap-3">
              <CheckCircle2 className="h-16 w-16 text-green-500 dark:text-green-400" />
              <div>
                <h3 className="text-xl font-semibold mb-1 dark:text-gray-100">All Indicators Valid!</h3>
                <p className="text-sm text-muted-foreground dark:text-gray-400">
                  All {summary.totalIndicators} indicators are complete and ready for publication
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {summary.totalIndicators === 0 && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="py-12 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground dark:text-gray-400" />
            <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">No Indicators to Validate</h3>
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              Add indicators to your hierarchy to see validation results
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
