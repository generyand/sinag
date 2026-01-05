"use client";

import { cn } from "@/lib/utils";

interface OfficialLogosProps {
  /** Display variant */
  variant?: "header" | "compact" | "minimal";
  /** Show partnership text below logos */
  showSubtitle?: boolean;
  /** Stack logos vertically (for collapsed sidebar) */
  stacked?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const LOGOS = [
  {
    src: "/officialLogo/DILG.webp",
    alt: "Department of the Interior and Local Government (DILG)",
  },
  {
    src: "/officialLogo/MLGRC.webp",
    alt: "Municipal Local Government Resource Center (MLGRC)",
  },
  {
    src: "/officialLogo/Municipality.webp",
    alt: "Municipality of Sulop Official Seal",
  },
];

/**
 * OfficialLogos Component
 *
 * Displays official government partner logos (DILG, MLGRC, Municipality of Sulop).
 * Used across all dashboards for institutional branding and credibility.
 */
export function OfficialLogos({
  variant = "header",
  showSubtitle = false,
  stacked = false,
  className,
}: OfficialLogosProps) {
  const sizeClasses = {
    header: "w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20",
    compact: "w-12 h-12",
    minimal: "w-8 h-8",
  };

  const gapClasses = {
    header: "gap-4 sm:gap-6 md:gap-8",
    compact: "gap-2 sm:gap-3 md:gap-4",
    minimal: "gap-2",
  };

  return (
    <div
      className={cn("w-full overflow-visible", className)}
      role="region"
      aria-label="Official government partners"
    >
      <div
        className={cn(
          "flex items-center justify-center overflow-visible",
          stacked ? "flex-col" : "flex-row",
          gapClasses[variant]
        )}
      >
        {LOGOS.map((logo) => (
          <div
            key={logo.src}
            className={cn("relative flex-shrink-0 rounded-lg", sizeClasses[variant])}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo.src}
              alt={logo.alt}
              className="w-full h-full object-contain"
              loading="eager"
            />
          </div>
        ))}
      </div>

      {showSubtitle && (
        <p className="mt-3 text-xs sm:text-sm text-center text-muted-foreground max-w-md">
          In partnership with DILG, MLGRC, and the Municipality of Sulop
        </p>
      )}
    </div>
  );
}
