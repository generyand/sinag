"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ConfirmationDialogProps } from "@/types/system-settings";

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning",
}: ConfirmationDialogProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          action: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          icon: "text-destructive",
        };
      case "warning":
        return {
          action: "bg-orange-600 text-white hover:bg-orange-700",
          icon: "text-orange-600",
        };
      case "info":
        return {
          action: "bg-primary text-primary-foreground hover:bg-primary/90",
          icon: "text-primary",
        };
      default:
        return {
          action: "bg-primary text-primary-foreground hover:bg-primary/90",
          icon: "text-primary",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full ${styles.icon} bg-current opacity-20`} />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={styles.action}>
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
