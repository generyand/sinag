'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { IndicatorResponse } from '@sinag/shared';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit, History, Ban, Eye } from 'lucide-react';

interface IndicatorTableRowProps {
  indicator: IndicatorResponse;
  onDeactivate?: (indicatorId: number) => void;
}

/**
 * IndicatorTableRow Component
 *
 * Displays an indicator in a table row format with actions dropdown.
 * Used in table-based indicator listings.
 *
 * Features:
 * - Clickable indicator name linking to detail page
 * - Status badges (active/inactive, auto-calculable, profiling)
 * - Version display
 * - Actions dropdown with Edit, View History, Deactivate options
 * - Confirmation dialog for deactivation
 */
export function IndicatorTableRow({ indicator, onDeactivate }: IndicatorTableRowProps) {
  const router = useRouter();
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

  const handleDeactivate = () => {
    if (onDeactivate) {
      onDeactivate(indicator.id);
    }
    setShowDeactivateDialog(false);
  };

  return (
    <>
      <tr className="hover:bg-muted/50 transition-colors">
        {/* Indicator Name */}
        <td className="px-6 py-4">
          <button
            onClick={() => router.push(`/mlgoo/indicators/${indicator.id}`)}
            className="text-sm font-medium text-foreground hover:text-primary hover:underline text-left"
          >
            {indicator.name}
          </button>
        </td>

        {/* Governance Area */}
        <td className="px-6 py-4">
          <div className="text-sm text-muted-foreground">
            {indicator.governance_area?.name || 'N/A'}
          </div>
        </td>

        {/* Active Status */}
        <td className="px-6 py-4">
          <Badge
            variant="outline"
            style={{
              backgroundColor: indicator.is_active
                ? 'var(--analytics-success-bg)'
                : 'var(--analytics-neutral-bg)',
              color: indicator.is_active
                ? 'var(--analytics-success-text)'
                : 'var(--analytics-neutral-text)',
              borderColor: indicator.is_active
                ? 'var(--analytics-success-border)'
                : 'var(--analytics-neutral-border)',
            }}
          >
            {indicator.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </td>

        {/* Auto-calculable */}
        <td className="px-6 py-4">
          {indicator.is_auto_calculable ? (
            <Badge
              variant="outline"
              style={{
                backgroundColor: 'var(--kpi-purple-from)',
                color: 'var(--kpi-purple-text)',
                borderColor: 'var(--kpi-purple-border, var(--border))',
              }}
            >
              ⚡ Yes
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">No</span>
          )}
        </td>

        {/* Profiling Only */}
        <td className="px-6 py-4">
          {indicator.is_profiling_only ? (
            <Badge
              variant="outline"
              style={{
                backgroundColor: 'var(--analytics-warning-bg)',
                color: 'var(--analytics-warning-text)',
                borderColor: 'var(--analytics-warning-border)',
              }}
            >
              Profiling
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </td>

        {/* Version */}
        <td className="px-6 py-4">
          <Badge
            variant="outline"
            style={{
              backgroundColor: 'var(--analytics-info-bg)',
              color: 'var(--analytics-info-text)',
              borderColor: 'var(--analytics-info-border)',
            }}
          >
            v{indicator.version}
          </Badge>
        </td>

        {/* Actions */}
        <td className="px-6 py-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => router.push(`/mlgoo/indicators/${indicator.id}`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/mlgoo/indicators/${indicator.id}/edit`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/mlgoo/indicators/${indicator.id}?tab=history`)}
              >
                <History className="mr-2 h-4 w-4" />
                View History
              </DropdownMenuItem>
              {indicator.is_active && (
                <DropdownMenuItem
                  onClick={() => setShowDeactivateDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Deactivate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Indicator?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{indicator.name}"? This indicator will no longer be
              available for new assessments, but existing assessment data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
