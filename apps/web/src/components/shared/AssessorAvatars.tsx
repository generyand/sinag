import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Assessor } from "@/types/submissions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AssessorAvatarsProps {
  assessors: Assessor[];
  maxVisible?: number;
  className?: string;
}

function AssessorAvatars({ assessors, maxVisible = 3, className }: AssessorAvatarsProps) {
  if (assessors.length === 0) {
    return <span className="text-sm text-gray-500 italic">No assessors assigned</span>;
  }

  const visibleAssessors = assessors.slice(0, maxVisible);
  const hiddenCount = assessors.length - maxVisible;

  return (
    <TooltipProvider>
      <div className={cn("flex items-center space-x-1", className)}>
        {visibleAssessors.map((assessor, index) => (
          <Tooltip key={assessor.id}>
            <TooltipTrigger asChild>
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium border-2 border-white shadow-sm">
                  {assessor.avatar ? (
                    <Image
                      src={assessor.avatar}
                      alt={assessor.name}
                      width={32}
                      height={32}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    assessor.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                  )}
                </div>
                {index < visibleAssessors.length - 1 && (
                  <div className="absolute -right-1 top-0 w-2 h-2 bg-white rounded-full border border-gray-200" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <p className="font-medium">{assessor.name}</p>
                <p className="text-xs text-gray-500">{assessor.email}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}

        {hiddenCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium border-2 border-white shadow-sm">
                +{hiddenCount}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div>
                <p className="font-medium">Additional assessors:</p>
                {assessors.slice(maxVisible).map((assessor) => (
                  <p key={assessor.id} className="text-sm">
                    {assessor.name}
                  </p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

export { AssessorAvatars };
