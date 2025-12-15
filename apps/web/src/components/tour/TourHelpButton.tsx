"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTour, TourName } from "@/providers/TourProvider";
import { cn } from "@/lib/utils";

interface TourHelpButtonProps {
  /** Which tour to start when clicked */
  tourName: TourName;
  /** Optional custom class name */
  className?: string;
  /** Optional label text (shown on larger screens) */
  showLabel?: boolean;
  /** Button variant */
  variant?: "default" | "ghost" | "outline";
  /** Button size */
  size?: "default" | "sm" | "icon";
}

const tourLabels: Record<TourName, Record<string, string>> = {
  dashboard: {
    en: "Dashboard Tour",
    fil: "Dashboard Tour",
    ceb: "Dashboard Tour",
  },
  assessments: {
    en: "Assessment Tour",
    fil: "Assessment Tour",
    ceb: "Assessment Tour",
  },
  indicatorForm: {
    en: "Form Tour",
    fil: "Form Tour",
    ceb: "Form Tour",
  },
  rework: {
    en: "Rework Guide",
    fil: "Gabay sa Pag-ayos",
    ceb: "Gabay sa Pag-ayo",
  },
};

const tooltipLabels: Record<string, string> = {
  en: "Start guided tour",
  fil: "Simulan ang guided tour",
  ceb: "Sugdi ang guided tour",
};

/**
 * Button to restart the onboarding tour from any BLGU page
 * Place this in page headers to allow users to restart tours
 */
export function TourHelpButton({
  tourName,
  className,
  showLabel = false,
  variant = "ghost",
  size = "sm",
}: TourHelpButtonProps) {
  const { startTour, tourLanguage, isRunning } = useTour();

  const handleClick = () => {
    if (!isRunning) {
      startTour(tourName);
    }
  };

  const label = tourLabels[tourName][tourLanguage] || tourLabels[tourName].en;
  const tooltipLabel = tooltipLabels[tourLanguage] || tooltipLabels.en;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            disabled={isRunning}
            className={cn("gap-1.5 text-muted-foreground hover:text-foreground", className)}
          >
            <HelpCircle className="h-4 w-4" />
            {showLabel && <span className="hidden sm:inline">{label}</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{tooltipLabel}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
