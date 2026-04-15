"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, LoaderCircle, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

type DraftSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

interface AutosaveStatusPillProps {
  state: DraftSaveState;
  completedSaveCount?: number;
  onRetry?: () => void | Promise<void>;
  className?: string;
}

const STATUS_CONFIG: Record<
  DraftSaveState,
  {
    label: string;
    detail: string;
    icon: typeof LoaderCircle;
    shellClassName: string;
    iconClassName: string;
    live: "polite" | "assertive";
  }
> = {
  idle: {
    label: "Autosave on",
    detail: "Changes save automatically while you work.",
    icon: CheckCircle2,
    shellClassName:
      "border-border/80 bg-background/95 text-muted-foreground shadow-black/5 dark:shadow-black/30",
    iconClassName: "text-emerald-600 dark:text-emerald-400",
    live: "polite",
  },
  dirty: {
    label: "Unsaved changes",
    detail: "Please wait for the autosave to complete.",
    icon: AlertCircle,
    shellClassName:
      "border-amber-200/90 bg-amber-50/95 text-amber-900 shadow-amber-950/10 dark:border-amber-900 dark:bg-amber-950/70 dark:text-amber-100",
    iconClassName: "text-amber-600 dark:text-amber-400",
    live: "polite",
  },
  saving: {
    label: "Saving...",
    detail: "Please wait while we save your changes.",
    icon: LoaderCircle,
    shellClassName:
      "border-sky-200/90 bg-sky-50/95 text-sky-950 shadow-sky-950/10 dark:border-sky-900 dark:bg-sky-950/70 dark:text-sky-50",
    iconClassName: "text-sky-600 dark:text-sky-400",
    live: "polite",
  },
  saved: {
    label: "Saved",
    detail: "All changes saved.",
    icon: CheckCircle2,
    shellClassName:
      "border-emerald-200/90 bg-emerald-50/95 text-emerald-950 shadow-emerald-950/10 dark:border-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-50",
    iconClassName: "text-emerald-600 dark:text-emerald-400",
    live: "polite",
  },
  error: {
    label: "Save failed",
    detail: "We couldn't save your latest edits.",
    icon: AlertCircle,
    shellClassName:
      "border-destructive/30 bg-destructive/10 text-destructive shadow-destructive/10 dark:bg-destructive/15",
    iconClassName: "text-destructive",
    live: "assertive",
  },
};

export function AutosaveStatusPill({
  state,
  completedSaveCount = 0,
  onRetry,
  className,
}: AutosaveStatusPillProps) {
  const [isExpanded, setIsExpanded] = useState(state === "error" || state === "dirty");
  const config = STATUS_CONFIG[state];
  const Icon = config.icon;
  const useIconOnly = completedSaveCount >= 3 && state !== "error" && state !== "dirty";
  const canForceSave = state === "dirty" && Boolean(onRetry);
  const canRetry = state === "error" && Boolean(onRetry);
  const isActionable = canForceSave || canRetry;
  const actionLabel = canRetry ? "Retry save" : "Save changes now";

  useEffect(() => {
    let animationFrameId: number | null = null;

    if (state === "error" || state === "dirty" || state === "saving") {
      animationFrameId = window.requestAnimationFrame(() => {
        setIsExpanded(true);
      });

      return;
    }

    animationFrameId = window.requestAnimationFrame(() => {
      setIsExpanded(true);
    });
    const timeoutId = window.setTimeout(() => {
      setIsExpanded(false);
    }, 2200);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      window.clearTimeout(timeoutId);
    };
  }, [state]);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-30 flex justify-center px-3",
        "bottom-[calc(env(safe-area-inset-bottom)+5.25rem)]",
        "sm:left-auto sm:right-4 sm:justify-end sm:px-0",
        "lg:right-6",
        className
      )}
    >
      {useIconOnly ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Autosave status"
                className={cn(
                  "pointer-events-auto flex size-11 items-center justify-center rounded-full border backdrop-blur-md shadow-lg",
                  "transition-[transform,opacity,background-color,border-color] duration-200 motion-reduce:transition-none",
                  config.shellClassName
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    state === "saving" && "animate-spin motion-reduce:animate-none",
                    config.iconClassName
                  )}
                  aria-hidden="true"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs pointer-events-none z-[100]">
              <div className="space-y-0.5">
                <div className="font-medium">{config.label}</div>
                <div className="text-xs text-muted-foreground">{config.detail}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <div
          role="status"
          aria-live={config.live}
          className={cn(
            "pointer-events-auto flex min-h-11 max-w-[min(92vw,28rem)] items-center gap-3 rounded-full border px-3 py-2",
            "backdrop-blur-md shadow-lg transition-[width,transform,opacity,background-color,border-color] duration-200 motion-reduce:transition-none",
            config.shellClassName
          )}
        >
          <div className="flex items-center gap-2">
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                state === "saving" && "animate-spin motion-reduce:animate-none",
                config.iconClassName
              )}
              aria-hidden="true"
            />
            <span className="text-sm font-medium">{config.label}</span>
          </div>

          {isExpanded || isActionable ? (
            <div className="flex items-center gap-3 border-l border-current/10 pl-3">
              {isExpanded ? (
                <span className="hidden text-xs text-current/80 sm:inline">{config.detail}</span>
              ) : null}
              {isActionable ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  className={cn(
                    "h-8 rounded-full border-current/20 bg-background/80 px-3 text-xs text-current shadow-none",
                    "hover:bg-background focus-visible:ring-2"
                  )}
                  aria-label={actionLabel}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {canRetry ? "Retry" : "Save now"}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
