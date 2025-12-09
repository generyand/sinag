"use client";

import { ConditionalRemarkItem } from "./ConditionalRemarkItem";

interface ConditionalRemark {
  condition: string;
  template: string;
  description?: string;
}

interface ConditionalRemarkListProps {
  remarks: ConditionalRemark[];
  onUpdate: (index: number, remark: ConditionalRemark) => void;
  onDelete: (index: number) => void;
}

/**
 * ConditionalRemarkList - Renders all conditional remarks
 *
 * Displays the list of conditional remarks with edit and delete capabilities.
 */
export function ConditionalRemarkList({ remarks, onUpdate, onDelete }: ConditionalRemarkListProps) {
  return (
    <div className="space-y-4">
      {remarks.map((remark, index) => (
        <ConditionalRemarkItem
          key={index}
          remark={remark}
          index={index}
          onUpdate={(updated) => onUpdate(index, updated)}
          onDelete={() => onDelete(index)}
        />
      ))}
    </div>
  );
}
