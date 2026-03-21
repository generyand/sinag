"use client";

import type { ReactNode } from "react";
import { Minus, Plus, RotateCcw, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MovPreviewControlsProps {
  zoom: number;
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  rotateLeftControl?: ReactNode;
  rotateRightControl?: ReactNode;
  helpControl?: ReactNode;
}

export function MovPreviewControls({
  zoom,
  minZoom,
  maxZoom,
  zoomStep,
  onZoomIn,
  onZoomOut,
  onReset,
  onRotateLeft,
  onRotateRight,
  rotateLeftControl,
  rotateRightControl,
  helpControl,
}: MovPreviewControlsProps) {
  const zoomLabel = `${Math.round(zoom)}%`;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white/90 px-2 py-1 shadow-sm",
        "dark:border-slate-700 dark:bg-slate-900/80"
      )}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onZoomOut}
        disabled={zoom <= minZoom}
        aria-label="Zoom out"
        title={`Zoom out by ${zoomStep}%`}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </Button>
      <div
        className="min-w-12 px-1 text-center text-xs font-medium tabular-nums text-slate-700"
        aria-label="Current zoom"
      >
        {zoomLabel}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onZoomIn}
        disabled={zoom >= maxZoom}
        aria-label="Zoom in"
        title={`Zoom in by ${zoomStep}%`}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </Button>
      <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
      {rotateLeftControl ?? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onRotateLeft}
          aria-label="Rotate left"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
      {rotateRightControl ?? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onRotateRight}
          aria-label="Rotate right"
        >
          <RotateCw className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
      {helpControl ? (
        <>
          <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
          {helpControl}
        </>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="ml-0.5 h-8 px-2.5 text-xs"
        onClick={onReset}
        aria-label="Reset view"
      >
        Reset view
      </Button>
    </div>
  );
}

export default MovPreviewControls;
