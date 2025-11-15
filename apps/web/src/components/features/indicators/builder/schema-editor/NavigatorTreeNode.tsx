'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Folder, FileText, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import type { IndicatorNode, SchemaStatus } from '@/store/useIndicatorBuilderStore';
import type { ParentStatusInfo } from '@/lib/indicator-tree-utils';

/**
 * NavigatorTreeNode Component
 *
 * Individual tree node displaying indicator with visual distinctions for parent vs leaf.
 * Supports expand/collapse for parent nodes and smart navigation.
 *
 * Visual Distinctions (Phase 6: Hierarchical Indicators):
 * - **Leaf Indicators** (data collection points):
 *   - 📄 FileText icon
 *   - Normal font weight
 *   - Status icons: ☑ complete, ○ incomplete, ⚠ error
 *
 * - **Parent Indicators** (organizational containers):
 *   - 📁 Folder icon
 *   - Semibold font weight
 *   - Aggregate status from descendant leaves
 *   - Smart navigation: clicking navigates to first incomplete leaf
 *
 * Smart Navigation:
 * - Clicking parent → auto-navigates to first incomplete leaf child
 * - Shift+Click parent → selects parent (shows aggregate dashboard)
 */

interface NavigatorTreeNodeProps {
  indicator: IndicatorNode & { children?: any[] };
  depth: number;
  isSelected: boolean;
  isLeaf: boolean;
  status?: SchemaStatus;
  parentStatus?: ParentStatusInfo;
  onClick: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}

export function NavigatorTreeNode({
  indicator,
  depth,
  isSelected,
  isLeaf,
  status,
  parentStatus,
  onClick,
  children,
}: NavigatorTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = indicator.children && indicator.children.length > 0;

  // Determine status icon and styling based on leaf vs parent
  const getStatusConfig = () => {
    // Selected state (both leaf and parent)
    if (isSelected) {
      return {
        StatusIcon: isLeaf ? Circle : Folder,
        statusIconProps: { className: cn('h-4 w-4', 'text-blue-600') },
        TypeIcon: isLeaf ? FileText : Folder,
        typeIconProps: { className: 'h-4 w-4 text-blue-600' },
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-l-blue-600',
        label: 'Currently editing',
      };
    }

    // LEAF INDICATOR STATUS
    if (isLeaf) {
      // Error state
      if (status?.errors && status.errors.length > 0) {
        return {
          StatusIcon: AlertCircle,
          statusIconProps: { className: 'h-4 w-4 text-amber-600' },
          TypeIcon: FileText,
          typeIconProps: { className: 'h-4 w-4 text-muted-foreground' },
          color: 'text-amber-600',
          bgColor: 'hover:bg-amber-50',
          borderColor: '',
          label: `Has ${status.errors.length} error(s)`,
        };
      }

      // Complete state
      if (status?.isComplete) {
        return {
          StatusIcon: CheckCircle2,
          statusIconProps: { className: 'h-4 w-4 text-green-600' },
          TypeIcon: FileText,
          typeIconProps: { className: 'h-4 w-4 text-muted-foreground' },
          color: 'text-green-600',
          bgColor: 'hover:bg-green-50',
          borderColor: '',
          label: 'Complete',
        };
      }

      // Incomplete state (default)
      return {
        StatusIcon: Circle,
        statusIconProps: { className: 'h-4 w-4 text-muted-foreground' },
        TypeIcon: FileText,
        typeIconProps: { className: 'h-4 w-4 text-muted-foreground' },
        color: 'text-muted-foreground',
        bgColor: 'hover:bg-accent',
        borderColor: '',
        label: 'Incomplete',
      };
    }

    // PARENT INDICATOR STATUS (aggregate from descendant leaves)
    if (parentStatus) {
      // All leaves complete
      if (parentStatus.status === 'complete') {
        return {
          StatusIcon: CheckCircle2,
          statusIconProps: { className: 'h-4 w-4 text-green-600' },
          TypeIcon: Folder,
          typeIconProps: { className: 'h-4 w-4 text-green-600' },
          color: 'text-green-600',
          bgColor: 'hover:bg-green-50',
          borderColor: '',
          label: `All ${parentStatus.totalLeaves} child indicators complete`,
        };
      }

      // Partial completion
      if (parentStatus.status === 'partial') {
        return {
          StatusIcon: AlertCircle,
          statusIconProps: { className: 'h-4 w-4 text-amber-500' },
          TypeIcon: Folder,
          typeIconProps: { className: 'h-4 w-4 text-amber-500' },
          color: 'text-amber-500',
          bgColor: 'hover:bg-amber-50',
          borderColor: '',
          label: `${parentStatus.completeLeaves}/${parentStatus.totalLeaves} child indicators complete`,
        };
      }

      // No leaves complete
      return {
        StatusIcon: Circle,
        statusIconProps: { className: 'h-4 w-4 text-muted-foreground' },
        TypeIcon: Folder,
        typeIconProps: { className: 'h-4 w-4 text-muted-foreground' },
        color: 'text-muted-foreground',
        bgColor: 'hover:bg-accent',
        borderColor: '',
        label: `0/${parentStatus.totalLeaves} child indicators complete`,
      };
    }

    // Default parent (no status info)
    return {
      StatusIcon: Circle,
      statusIconProps: { className: 'h-4 w-4 text-muted-foreground' },
      TypeIcon: Folder,
      typeIconProps: { className: 'h-4 w-4 text-muted-foreground' },
      color: 'text-muted-foreground',
      bgColor: 'hover:bg-accent',
      borderColor: '',
      label: 'Parent indicator',
    };
  };

  const statusConfig = getStatusConfig();
  const { StatusIcon, TypeIcon } = statusConfig;

  return (
    <div>
      {/* Node Button */}
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors group',
          statusConfig.bgColor,
          isSelected && `${statusConfig.bgColor} border-l-2 ${statusConfig.borderColor}`
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        aria-label={`${indicator.code || ''} ${indicator.name}. Status: ${statusConfig.label}${!isLeaf ? '. Click to navigate to first incomplete child, Shift+Click to view aggregate' : ''}`}
        aria-current={isSelected ? 'page' : undefined}
        title={!isLeaf ? 'Click to navigate to first incomplete child, Shift+Click to view aggregate' : undefined}
      >
        {/* Expand/Collapse Icon (for parent nodes) */}
        {hasChildren && (
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }
            }}
            className="shrink-0 hover:bg-accent rounded p-0.5 transition-colors cursor-pointer"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        )}

        {/* Spacer for leaf nodes (no expand/collapse) */}
        {!hasChildren && <div className="w-4 shrink-0" />}

        {/* Type Icon (Folder for parent, FileText for leaf) */}
        <TypeIcon {...statusConfig.typeIconProps} className={cn(statusConfig.typeIconProps.className, 'shrink-0')} />

        {/* Status Icon */}
        <StatusIcon {...statusConfig.statusIconProps} className={cn(statusConfig.statusIconProps.className, 'shrink-0')} />

        {/* Indicator Code & Name */}
        <div className="flex-1 min-w-0 flex items-baseline gap-2">
          {indicator.code && (
            <span className="text-xs font-mono text-muted-foreground shrink-0">
              {indicator.code}
            </span>
          )}
          <span
            className={cn(
              'text-sm truncate',
              isLeaf ? 'font-normal' : 'font-semibold',
              isSelected && 'font-medium'
            )}
          >
            {indicator.name}
          </span>
        </div>

        {/* Parent Progress Badge */}
        {!isLeaf && parentStatus && parentStatus.totalLeaves > 0 && (
          <span
            className={cn(
              'shrink-0 text-xs px-2 py-0.5 rounded-full',
              parentStatus.status === 'complete'
                ? 'bg-green-100 text-green-800'
                : parentStatus.status === 'partial'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-gray-100 text-gray-600'
            )}
          >
            {parentStatus.completeLeaves}/{parentStatus.totalLeaves}
          </span>
        )}

        {/* Error Count Badge (leaf only) */}
        {isLeaf && status?.errors && status.errors.length > 0 && (
          <span className="shrink-0 text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
            {status.errors.length}
          </span>
        )}

        {/* Selected Indicator */}
        {isSelected && (
          <div className="h-2 w-2 rounded-full bg-blue-600 shrink-0" aria-hidden="true" />
        )}
      </button>

      {/* Children (recursive) */}
      {hasChildren && isExpanded && <div>{children}</div>}
    </div>
  );
}
