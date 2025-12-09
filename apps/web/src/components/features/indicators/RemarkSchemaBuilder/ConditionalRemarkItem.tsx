"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { TemplateEditor } from "./TemplateEditor";

interface ConditionalRemark {
  condition: string;
  template: string;
  description?: string;
}

interface ConditionalRemarkItemProps {
  remark: ConditionalRemark;
  index: number;
  onUpdate: (remark: ConditionalRemark) => void;
  onDelete: () => void;
}

/**
 * ConditionalRemarkItem - Individual conditional remark editor
 *
 * Features:
 * - Condition selector dropdown (pass/fail)
 * - Template editor with placeholder support
 * - Optional description field
 * - Delete button
 */
export function ConditionalRemarkItem({
  remark,
  index,
  onUpdate,
  onDelete,
}: ConditionalRemarkItemProps) {
  const handleConditionChange = (condition: string) => {
    onUpdate({ ...remark, condition });
  };

  const handleTemplateChange = (template: string) => {
    onUpdate({ ...remark, template });
  };

  const handleDescriptionChange = (description: string) => {
    onUpdate({ ...remark, description });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this conditional remark?")) {
      onDelete();
    }
  };

  return (
    <Card className="border-2 border-purple-200 bg-purple-50/30">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header with Delete Button */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Conditional Remark {index + 1}</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="text-red-600 hover:bg-red-100 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Condition Selector */}
          <div className="space-y-2">
            <Label htmlFor={`condition-${index}`}>Condition</Label>
            <Select value={remark.condition} onValueChange={handleConditionChange}>
              <SelectTrigger id={`condition-${index}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">
                  <div className="space-y-1">
                    <div className="font-medium">Pass</div>
                    <div className="text-xs text-muted-foreground">
                      Use this template when indicator passes
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="fail">
                  <div className="space-y-1">
                    <div className="font-medium">Fail</div>
                    <div className="text-xs text-muted-foreground">
                      Use this template when indicator fails
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              When should this remark template be used?
            </p>
          </div>

          {/* Template Editor */}
          <TemplateEditor
            label="Remark Template"
            value={remark.template}
            onChange={handleTemplateChange}
            placeholder="Enter remark template with placeholders like {{ indicator_name }}"
          />

          {/* Description (Optional) */}
          <div className="space-y-2">
            <Label htmlFor={`description-${index}`}>Description (Optional)</Label>
            <Input
              id={`description-${index}`}
              type="text"
              placeholder="Brief description of this remark"
              value={remark.description || ""}
              onChange={(e) => handleDescriptionChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Helps other users understand when this remark is used
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
