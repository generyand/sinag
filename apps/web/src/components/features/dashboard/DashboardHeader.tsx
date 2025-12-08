"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsActiveYear, useYearSelector } from "@/hooks/useAssessmentYear";
import { cn } from "@/lib/utils";
import { BarChart3, Building2, Calendar, Loader2 } from "lucide-react";

interface DashboardHeaderProps {
  municipality: string;
  performanceYear: string;
}

export function DashboardHeader({ municipality, performanceYear }: DashboardHeaderProps) {
  const { options, value, onChange, isLoading, hasMultipleYears } = useYearSelector();
  const isActiveYear = useIsActiveYear();

  return (
    <div className="relative overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg p-6 sm:p-8">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-100/40 to-indigo-100/20 rounded-full -translate-y-20 translate-x-20"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-100/30 to-pink-100/20 rounded-full translate-y-16 -translate-x-16"></div>

      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left side - Title and Municipality */}
          <div className="space-y-4 sm:space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
                Municipal{" "}
                <span className="bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] bg-clip-text text-transparent">
                  SGLGB
                </span>
              </h1>
              {/* Historical Year Indicator */}
              {!isActiveYear && value && (
                <span className="px-2 py-1 text-xs font-medium rounded-sm bg-amber-100 text-amber-800 border border-amber-200">
                  Viewing Historical Data
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm">
              <div className="flex items-center justify-center sm:justify-start gap-2 bg-[var(--card)]/60 backdrop-blur-sm px-3 py-2 sm:py-1.5 rounded-sm border border-[var(--border)] w-full sm:w-auto">
                <Building2 className="h-4 w-4" style={{ color: "var(--cityscape-yellow)" }} />
                <span className="font-medium text-[var(--text-secondary)]">Municipality:</span>
                <span className="font-semibold text-[var(--foreground)]">{municipality}</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2 bg-[var(--card)]/60 backdrop-blur-sm px-3 py-2 sm:py-1.5 rounded-sm border border-[var(--border)] w-full sm:w-auto">
                <BarChart3 className="h-4 w-4" style={{ color: "var(--cityscape-yellow)" }} />
                <span className="font-medium text-[var(--text-secondary)]">Performance Year:</span>
                <span className="font-semibold text-[var(--foreground)]">{performanceYear}</span>
              </div>
            </div>
          </div>

          {/* Right side - Assessment Year Selector */}
          <div className="flex items-center gap-4">
            <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 shadow-sm border border-[var(--border)]">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5" style={{ color: "var(--cityscape-yellow)" }} />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                    Assessment Year
                  </span>
                  {isLoading ? (
                    <div className="flex items-center gap-2 h-8">
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
                      <span className="text-sm text-[var(--muted-foreground)]">Loading...</span>
                    </div>
                  ) : hasMultipleYears ? (
                    <Select value={value} onValueChange={onChange}>
                      <SelectTrigger className="w-28 h-8 text-sm font-semibold border-0 bg-transparent p-0 focus:ring-0">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--card)] border border-[var(--border)] shadow-lg rounded-sm">
                        {options.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className={cn(
                              "text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10",
                              option.isActive && "font-semibold"
                            )}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm font-semibold text-[var(--foreground)] h-8 flex items-center">
                      {value || "No year available"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
