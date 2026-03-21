"use client";

import * as React from "react";
import { MessageSquareQuote } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface AnnotationCommentDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  defaultValue?: string;
  onOpenChange: (open: boolean) => void;
  onSave: (comment: string) => void;
}

export function AnnotationCommentDialog({
  open,
  title = "Add highlight comment",
  description = "Add an optional note so the issue is clear when this annotation is reviewed later.",
  defaultValue = "",
  onOpenChange,
  onSave,
}: AnnotationCommentDialogProps) {
  const [comment, setComment] = React.useState(defaultValue);

  React.useEffect(() => {
    if (open) {
      setComment(defaultValue);
    }
  }, [defaultValue, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-[var(--border)] bg-[var(--card)] p-0 shadow-2xl">
        <div className="overflow-hidden rounded-[inherit]">
          <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--cityscape-yellow)]/18 via-white to-[var(--cityscape-yellow)]/8 px-6 py-4">
            <DialogHeader className="gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[var(--cityscape-yellow)] text-[var(--foreground)] shadow-sm">
                  <MessageSquareQuote className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-base font-semibold text-[var(--foreground)]">
                    {title}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-[var(--text-secondary)]">
                    {description}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="space-y-4 px-6 py-5">
            <label
              htmlFor="annotation-comment"
              className="text-sm font-medium text-[var(--foreground)]"
            >
              Highlight comment
            </label>
            <Textarea
              id="annotation-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Describe what should be corrected or checked in this highlighted section."
              className="min-h-28 border-[var(--border)] bg-white text-[var(--foreground)] placeholder:text-[var(--text-secondary)]"
              shape="boxy"
            />
          </div>

          <DialogFooter className="border-t border-[var(--border)] bg-[var(--background)] px-6 py-4 sm:justify-between">
            <p className="text-xs text-[var(--text-secondary)]">
              Comments are optional, but they help reviewers move faster.
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => onSave(comment.trim())}
                className="bg-[var(--cityscape-yellow)] text-[var(--foreground)] hover:bg-[var(--cityscape-yellow-dark)]"
              >
                Save comment
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
