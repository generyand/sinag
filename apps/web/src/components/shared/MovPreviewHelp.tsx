"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import {
  CircleHelp,
  Crop,
  ExternalLink,
  FileImage,
  FileText,
  Highlighter,
  MessageSquareMore,
  PlayCircle,
  RotateCw,
  ZoomIn,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuthStore } from "@/store/useAuthStore";

type MovPreviewHelpMode = "pdf" | "image" | "video" | "generic";

interface HelpContent {
  title: string;
  description: string;
  bullets: Array<{
    icon: LucideIcon;
    text: string;
  }>;
  buttonLabel: string;
}

const HELP_VERSION = "v1";

const HELP_CONTENT: Record<MovPreviewHelpMode, HelpContent> = {
  pdf: {
    title: "PDF preview help",
    description: "Review PDF uploads with two annotation modes depending on what you need to mark.",
    bullets: [
      {
        icon: Highlighter,
        text: "Use Highlight text for words, lines, or short phrases that can be selected.",
      },
      {
        icon: Crop,
        text: "Use Draw box for photos, signatures, stamps, or scanned sections.",
      },
      {
        icon: ZoomIn,
        text: "Use zoom controls first if the page needs a closer view before you review it.",
      },
      {
        icon: RotateCw,
        text: "Use rotation controls when the page needs a straighter orientation.",
      },
      {
        icon: MessageSquareMore,
        text: "Saved comments appear in the review panel so you can jump back to them later.",
      },
    ],
    buttonLabel: "Open PDF preview help",
  },
  image: {
    title: "Image preview help",
    description: "Image previews support direct box annotations for visual issues.",
    bullets: [
      {
        icon: Crop,
        text: "Click and drag to mark the exact area you want reviewed.",
      },
      {
        icon: MessageSquareMore,
        text: "Add a short comment so the issue is clear when revisiting the file.",
      },
      {
        icon: ZoomIn,
        text: "Use zoom controls before marking if the image needs a closer frame.",
      },
      {
        icon: RotateCw,
        text: "Use rotation controls before marking if the image orientation needs correction.",
      },
    ],
    buttonLabel: "Open image preview help",
  },
  video: {
    title: "Video preview help",
    description:
      "Video previews let you review motion content without interrupting the rest of the validation flow.",
    bullets: [
      {
        icon: PlayCircle,
        text: "Use the playback controls to inspect the clip closely.",
      },
      {
        icon: ZoomIn,
        text: "Use zoom controls when they are available in the preview toolbar to improve visibility.",
      },
      {
        icon: RotateCw,
        text: "Use rotation controls when they are available and the video needs reorientation.",
      },
      {
        icon: MessageSquareMore,
        text: "Video previews are review-only right now, so annotations still need to be added on supporting file types.",
      },
      {
        icon: ExternalLink,
        text: "If the video does not render well in the browser, open or download it in a new tab.",
      },
    ],
    buttonLabel: "Open video preview help",
  },
  generic: {
    title: "File preview help",
    description:
      "Some files can be previewed directly, while others are better reviewed outside the browser.",
    bullets: [
      {
        icon: ZoomIn,
        text: "Use zoom controls first when the current preview mode supports them.",
      },
      {
        icon: RotateCw,
        text: "Use rotation controls when the current preview mode supports reorientation.",
      },
      {
        icon: ExternalLink,
        text: "If the file preview is limited, use the open or download action to inspect it externally.",
      },
      {
        icon: FileText,
        text: "PDF and image files support richer review tools than general file previews.",
      },
      {
        icon: MessageSquareMore,
        text: "Use help again anytime if you need a reminder of the current preview mode.",
      },
    ],
    buttonLabel: "Open file preview help",
  },
};

export interface MovPreviewHelpProps {
  mode: MovPreviewHelpMode;
  enabled?: boolean;
}

export function MovPreviewHelp({ mode, enabled = true }: MovPreviewHelpProps) {
  const userId = useAuthStore((state) => state.user?.id);
  const [open, setOpen] = React.useState(false);
  const helpContent = HELP_CONTENT[mode];
  const storageKey = React.useMemo(
    () => `mov-preview-help:${HELP_VERSION}:${userId ?? "anon"}:${mode}`,
    [mode, userId]
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!enabled) return;
    if (localStorage.getItem(storageKey)) return;

    localStorage.setItem(storageKey, "seen");
    setOpen(true);
  }, [enabled, storageKey]);

  const Icon =
    mode === "pdf"
      ? FileText
      : mode === "image"
        ? FileImage
        : mode === "video"
          ? PlayCircle
          : CircleHelp;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2.5 text-xs"
          aria-label={helpContent.buttonLabel}
        >
          <CircleHelp className="h-4 w-4" aria-hidden="true" />
          <span>Help</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-80 border-[var(--border)] bg-[var(--card)] p-0 shadow-xl"
      >
        <div className="border-b border-[var(--border)] bg-[var(--background)] px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md bg-[var(--cityscape-yellow)]/20 p-2 text-[var(--foreground)]">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-[var(--foreground)]">
                {helpContent.title}
              </h4>
              <p className="text-xs leading-5 text-[var(--text-secondary)]">
                {helpContent.description}
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-2 px-4 py-3">
          {helpContent.bullets.map((bullet) => (
            <div
              key={bullet.text}
              className="flex items-start gap-2 text-xs leading-5 text-[var(--foreground)]"
            >
              <div className="mt-0.5 rounded-md bg-[var(--cityscape-yellow)]/15 p-1.5 text-[var(--cityscape-yellow-dark)]">
                <bullet.icon className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <span>{bullet.text}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default MovPreviewHelp;
