"use client";

import { Play, HelpCircle } from "lucide-react";
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
  /** Button variant - "prominent" uses branded styling for high visibility */
  variant?: "default" | "ghost" | "outline" | "prominent";
  /** Button size */
  size?: "default" | "sm" | "icon";
}

const tourLabels: Record<TourName, Record<string, string>> = {
  dashboard: {
    en: "Start Tour",
    fil: "Simulan ang Tour",
    ceb: "Sugdi ang Tour",
  },
  assessments: {
    en: "Start Tour",
    fil: "Simulan ang Tour",
    ceb: "Sugdi ang Tour",
  },
  indicatorForm: {
    en: "Form Guide",
    fil: "Gabay sa Form",
    ceb: "Gabay sa Form",
  },
  rework: {
    en: "Rework Guide",
    fil: "Gabay sa Pag-ayos",
    ceb: "Gabay sa Pag-ayo",
  },
};

const tooltipLabels: Record<string, string> = {
  en: "Click to start a guided tour of this page",
  fil: "I-click para simulan ang guided tour",
  ceb: "I-click para sugdi ang guided tour",
};

/**
 * Button to restart the onboarding tour from any BLGU page
 * Place this in page headers to allow users to restart tours
 *
 * Use variant="prominent" for high visibility on dashboard pages
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

  // Use prominent styling for high visibility
  const isProminent = variant === "prominent";
  const buttonVariant = isProminent ? "default" : variant;

  // Icon component - Play for prominent, HelpCircle for others
  const IconComponent = isProminent ? Play : HelpCircle;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={buttonVariant}
            size={isProminent ? "default" : size}
            onClick={handleClick}
            disabled={isRunning}
            className={cn(
              "gap-2",
              isProminent
                ? "bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow-dark)] text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 border-0"
                : "text-muted-foreground hover:text-foreground",
              className
            )}
          >
            <IconComponent className={cn("shrink-0", isProminent ? "h-4 w-4" : "h-4 w-4")} />
            {(showLabel || isProminent) && <span>{label}</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{tooltipLabel}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
