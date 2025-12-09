"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDeleteDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  onConfirm: () => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
  confirmingText?: string;
}

export function ConfirmDeleteDialog({
  open,
  title = "Delete file",
  description = "This action cannot be undone.",
  onConfirm,
  onOpenChange,
  confirmingText = "Delete",
}: ConfirmDeleteDialogProps) {
  const [busy, setBusy] = React.useState(false);

  const handleConfirm = async () => {
    try {
      setBusy(true);
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-[var(--text-secondary)]">{description}</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={busy}>
            {confirmingText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
