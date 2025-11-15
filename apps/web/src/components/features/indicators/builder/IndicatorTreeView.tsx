'use client';

import React from 'react';
import { Tree, NodeApi } from 'react-arborist';
import { useIndicatorBuilderStore } from '@/store/useIndicatorBuilderStore';
import type { IndicatorNode } from '@/store/useIndicatorBuilderStore';
import { IndicatorTreeNode } from './IndicatorTreeNode';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

/**
 * Indicator Tree View Component
 *
 * Visual tree editor for hierarchical indicators using react-arborist.
 * Supports drag-and-drop reordering and tree manipulation.
 *
 * Features:
 * - Drag-and-drop node reordering
 * - Expand/collapse nodes
 * - Context menu actions
 * - Visual hierarchy display
 * - Code auto-calculation on changes
 */

interface IndicatorTreeViewProps {
  /** Optional height for the tree container */
  height?: number | string;

  /** Whether drag-and-drop is enabled */
  enableDragDrop?: boolean;

  /** Callback when a node is selected */
  onNodeSelect?: (node: IndicatorNode | null) => void;

  /** Callback when a node is double-clicked */
  onNodeDoubleClick?: (node: IndicatorNode) => void;

  /** Custom class name */
  className?: string;
}

export function IndicatorTreeView({
  height = 600,
  enableDragDrop = true,
  onNodeSelect,
  onNodeDoubleClick,
  className = '',
}: IndicatorTreeViewProps) {
  const { tree, moveNode, recalculateCodes, addNode, selectNode, selectedNodeId } =
    useIndicatorBuilderStore();

  // Convert flat Map to nested tree structure for react-arborist
  const treeData = React.useMemo(() => {
    const buildTree = (parentId: string | null): any[] => {
      return Array.from(tree.nodes.values())
        .filter((node) => node.parent_temp_id === parentId)
        .sort((a, b) => a.order - b.order)
        .map((node) => ({
          id: node.temp_id,
          name: node.name,
          code: node.code,
          children: buildTree(node.temp_id),
          data: node,
        }));
    };

    return buildTree(null);
  }, [tree.nodes]);

  /**
   * Debounced code recalculation
   * Delays recalculation until 300ms after the last drag operation
   * to prevent expensive recalculations during continuous dragging
   */
  const debouncedRecalculateCodes = useDebouncedCallback(recalculateCodes, 300);

  /**
   * Handle drag-and-drop move
   */
  const handleMove = React.useCallback(
    (args: {
      dragIds: string[];
      parentId: string | null;
      index: number;
    }) => {
      const { dragIds, parentId, index } = args;

      // Only handle single node drag for now
      if (dragIds.length === 1) {
        const draggedId = dragIds[0];
        moveNode(draggedId, parentId, index);
        // Use debounced version to prevent excessive recalculations during drag
        debouncedRecalculateCodes();
      }
    },
    [moveNode, debouncedRecalculateCodes]
  );

  /**
   * Handle node selection
   */
  const handleSelect = React.useCallback(
    (nodes: NodeApi[]) => {
      const node = nodes[0];
      if (node) {
        const indicatorNode = tree.nodes.get(node.id);
        selectNode(node.id);
        if (onNodeSelect && indicatorNode) {
          onNodeSelect(indicatorNode);
        }
      } else {
        selectNode(null);
        onNodeSelect?.(null);
      }
    },
    [tree.nodes, selectNode, onNodeSelect]
  );

  /**
   * Handle node double-click (edit)
   */
  const handleActivate = React.useCallback(
    (node: NodeApi) => {
      const indicatorNode = tree.nodes.get(node.id);
      if (indicatorNode && onNodeDoubleClick) {
        onNodeDoubleClick(indicatorNode);
      }
    },
    [tree.nodes, onNodeDoubleClick]
  );

  /**
   * Handle add root indicator
   */
  const handleAddRoot = React.useCallback(() => {
    const newId = addNode({
      name: 'New Indicator',
      is_active: true,
      is_auto_calculable: false,
      is_profiling_only: false,
    });
    selectNode(newId);
  }, [addNode, selectNode]);

  // Empty state
  if (treeData.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg ${className}`}>
        <div className="text-center space-y-4">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium">No indicators yet</p>
            <p className="text-sm">Create your first indicator to get started</p>
          </div>
          <Button onClick={handleAddRoot} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Add Root Indicator
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Add Root Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-muted-foreground">
          Indicator Hierarchy ({tree.nodes.size} total)
        </h3>
        <Button onClick={handleAddRoot} size="sm" variant="outline">
          <Plus className="mr-2 h-3 w-3" />
          Add Root Indicator
        </Button>
      </div>

      {/* Tree View */}
      <div
        className="border rounded-lg bg-card overflow-hidden"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        <Tree
          data={treeData}
          openByDefault={false}
          width="100%"
          height={typeof height === 'number' ? height : 600}
          indent={24}
          rowHeight={40}
          overscanCount={1}
          disableDrag={!enableDragDrop}
          disableDrop={!enableDragDrop}
          onMove={handleMove}
          onSelect={handleSelect}
          onActivate={handleActivate}
          selection={selectedNodeId || undefined}
        >
          {({ node, style, dragHandle }) => (
            <IndicatorTreeNode
              node={node}
              style={style}
              dragHandle={dragHandle}
              isSelected={node.id === selectedNodeId}
            />
          )}
        </Tree>
      </div>

      {/* Help Text */}
      <p className="text-xs text-muted-foreground">
        {enableDragDrop
          ? 'Drag and drop indicators to reorganize. Double-click to edit.'
          : 'Click to select. Double-click to edit.'}
      </p>
    </div>
  );
}
