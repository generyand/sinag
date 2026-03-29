"use client";

import { AlertTriangle, Info, Loader2 } from "lucide-react";
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
  pendingText = "Working...",
  cancelText = "Cancel",
  variant = "warning",
  isPending = false,
}: ConfirmationDialogProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          action:
            "h-10 min-w-[9rem] rounded-xl border border-red-700 bg-red-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-200",
          iconWrap: "bg-red-100 text-red-600",
          Icon: AlertTriangle,
        };
      case "warning":
        return {
          action:
            "h-10 min-w-[9rem] rounded-xl border border-orange-700 bg-orange-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 focus-visible:ring-orange-200",
          iconWrap: "bg-orange-100 text-orange-600",
          Icon: AlertTriangle,
        };
      case "info":
        return {
          action:
            "h-10 min-w-[9rem] rounded-xl border border-sky-700 bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus-visible:ring-sky-200",
          iconWrap: "bg-sky-100 text-sky-600",
          Icon: Info,
        };
      default:
        return {
          action:
            "h-10 min-w-[9rem] rounded-xl border border-sky-700 bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus-visible:ring-sky-200",
          iconWrap: "bg-sky-100 text-sky-600",
          Icon: Info,
        };
    }
  };

  const styles = getVariantStyles();
  const Icon = styles.Icon;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl sm:max-w-md dark:border-slate-800 dark:bg-slate-950">
        <AlertDialogHeader className="gap-3 px-6 py-5">
          <AlertDialogTitle className="flex items-start gap-3 text-base font-semibold leading-6 text-slate-900 dark:text-slate-50">
            <span
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${styles.iconWrap}`}
            >
              <Icon className="h-4.5 w-4.5" />
            </span>
            <span>{title}</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="pl-12 text-left text-sm leading-6 text-slate-600 dark:text-slate-300">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="rounded-b-2xl border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
          <AlertDialogCancel
            disabled={isPending}
            className="h-10 cursor-pointer rounded-xl border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 disabled:cursor-not-allowed"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className={`${styles.action} cursor-pointer disabled:cursor-wait`}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {pendingText}
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
