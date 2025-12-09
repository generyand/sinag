"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Assessment } from "@/types/assessment";
import { AlertCircle, CheckCircle, Circle, FileText, Target } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { RecursiveIndicator } from "./IndicatorAccordion";

interface AssessmentTabsProps {
  assessment: Assessment;
  isLocked: boolean;
  updateAssessmentData?: (updater: (data: Assessment) => Assessment) => void;
}

export function AssessmentTabs({
  assessment,
  isLocked,
  updateAssessmentData,
}: AssessmentTabsProps) {
  const [activeTab, setActiveTab] = useState(assessment.governanceAreas[0]?.id || "");

  // Count only leaf indicators (actionable items)
  const countAllIndicators = (indicators: any[]): number => {
    return indicators.reduce((count, indicator) => {
      const children = indicator.children || [];
      if (children.length > 0) {
        return count + countAllIndicators(children);
      }
      return count + 1;
    }, 0);
  };

  // Count only completed leaf indicators
  const countCompletedIndicators = (indicators: any[]): number => {
    return indicators.reduce((count, indicator) => {
      const children = indicator.children || [];
      if (children.length > 0) {
        return count + countCompletedIndicators(children);
      }
      // Use the same detailed completion logic as validation and counting
      // Check if indicator has responseData with compliance answers
      const responseData = indicator.responseData || {};
      let complianceAnswer: string | undefined;

      // Extract compliance answer from response_data
      const complianceFields: string[] = [];
      for (const key in responseData) {
        if (key.endsWith("_compliance") && typeof responseData[key] === "string") {
          const val = String(responseData[key]).toLowerCase();
          if (val === "yes" || val === "no" || val === "na") {
            complianceFields.push(val);
          }
        }
      }

      if (complianceFields.length > 0) {
        const formSchema = indicator.formSchema || {};
        const requiredFields = formSchema.required || [];
        const complianceRequiredFields = requiredFields.filter((f: string) =>
          f.endsWith("_compliance")
        );

        if (
          complianceFields.length >= complianceRequiredFields.length ||
          complianceRequiredFields.length === 0
        ) {
          if (complianceFields.some((v) => v === "yes")) {
            complianceAnswer = "yes";
          } else {
            complianceAnswer = complianceFields[0];
          }
        }
      } else {
        // Fall back to status or complianceAnswer
        if (indicator.status === "completed") {
          return count + 1;
        }
        if (indicator.complianceAnswer) {
          complianceAnswer = String(indicator.complianceAnswer).toLowerCase();
        }
      }

      // If we have a compliance answer, check completion based on it
      if (complianceAnswer === "yes") {
        // Check MOVs only for sections with "yes" answers
        const props = (indicator.formSchema as any)?.properties || {};
        const fieldToSection: Record<string, string> = {};
        for (const [fieldName, fieldProps] of Object.entries(props)) {
          const section = (fieldProps as any)?.mov_upload_section;
          if (typeof section === "string") {
            fieldToSection[fieldName] = section;
          }
        }

        const requiredSectionsWithYes = new Set<string>();
        for (const [fieldName, section] of Object.entries(fieldToSection)) {
          const value = responseData[fieldName];
          if (typeof value === "string" && value.toLowerCase() === "yes") {
            requiredSectionsWithYes.add(section);
          }
        }

        if (requiredSectionsWithYes.size > 0) {
          const present = new Set<string>();
          for (const mov of indicator.movFiles || []) {
            const sp =
              (mov as any).storagePath || (mov as any).storage_path || (mov as any).url || "";
            const movSection = (mov as any).section;
            for (const rs of requiredSectionsWithYes) {
              if (movSection === rs) {
                present.add(rs);
              } else if (typeof sp === "string" && sp.length > 0) {
                const pathOnly = sp.split("?")[0];
                const hasSection =
                  pathOnly.includes(`/${rs}/`) ||
                  pathOnly.endsWith(`/${rs}`) ||
                  pathOnly.includes(`/${rs}-`) ||
                  pathOnly.includes(`${rs}/`) ||
                  new RegExp(`[/_-]${rs.replace(/_/g, "[_/]")}[_/-]`).test(pathOnly);
                if (hasSection) {
                  present.add(rs);
                }
              }
            }
          }
          const allSectionsHaveMOVs = Array.from(requiredSectionsWithYes).every((s) =>
            present.has(s)
          );
          return count + (allSectionsHaveMOVs ? 1 : 0);
        } else {
          const hasMOVs = (indicator.movFiles || []).length > 0;
          return count + (hasMOVs ? 1 : 0);
        }
      } else if (complianceAnswer === "no" || complianceAnswer === "na") {
        // "no" or "na" - no MOVs needed, completed
        return count + 1;
      } else if (indicator.status === "completed") {
        // Fallback to status if no compliance answer found
        return count + 1;
      }

      return count;
    }, 0);
  };

  // Count only needs_rework leaf indicators
  const countNeedsReworkIndicators = (indicators: any[]): number => {
    return indicators.reduce((count, indicator) => {
      const children = indicator.children || [];
      if (children.length > 0) {
        return count + countNeedsReworkIndicators(children);
      }
      return count + (indicator.status === "needs_rework" ? 1 : 0);
    }, 0);
  };

  // Function to get the logo path based on area name
  const getAreaLogo = (areaName: string) => {
    const name = areaName.toLowerCase();

    if (name.includes("financial") || name.includes("admin")) {
      return "/Assessment_Areas/financialAdmin.png";
    } else if (name.includes("disaster") || name.includes("preparedness")) {
      return "/Assessment_Areas/disasterPreparedness.png";
    } else if (name.includes("safety") || name.includes("peace") || name.includes("order")) {
      return "/Assessment_Areas/safetyPeaceAndOrder.png";
    } else if (
      name.includes("social") ||
      name.includes("protection") ||
      name.includes("sensitivity")
    ) {
      return "/Assessment_Areas/socialProtectAndSensitivity.png";
    } else if (
      name.includes("business") ||
      name.includes("friendliness") ||
      name.includes("competitiveness")
    ) {
      return "/Assessment_Areas/businessFriendliness.png";
    } else if (name.includes("environmental") || name.includes("management")) {
      return "/Assessment_Areas/environmentalManagement.png";
    }

    // Default fallback
    return "/Assessment_Areas/financialAdmin.png";
  };

  const getAreaStatusIcon = (areaId: string) => {
    const area = assessment.governanceAreas.find((a) => a.id === areaId);
    if (!area) return <Circle className="h-4 w-4 text-gray-400" />;

    const totalIndicators = countAllIndicators(area.indicators);
    const completedIndicators = countCompletedIndicators(area.indicators);
    const needsReworkIndicators = countNeedsReworkIndicators(area.indicators);

    if (needsReworkIndicators > 0) {
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    }

    if (completedIndicators === totalIndicators) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }

    return <Circle className="h-4 w-4 text-gray-400" />;
  };

  const getAreaProgress = (areaId: string) => {
    const area = assessment.governanceAreas.find((a) => a.id === areaId);
    if (!area) return 0;

    const totalIndicators = countAllIndicators(area.indicators);
    const completedIndicators = countCompletedIndicators(area.indicators);

    return totalIndicators > 0 ? Math.round((completedIndicators / totalIndicators) * 100) : 0;
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Enhanced Tab Navigation with Core/Essential Separation */}
        <div className="bg-[var(--hover)] border-b border-[var(--border)] px-6 py-6">
          <div className="space-y-8">
            {/* Core Governance Areas Section Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-red-500 to-red-600 rounded-sm"></div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--foreground)]">
                    Core Governance Areas
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    All 3 core areas must be completed for assessment completion
                  </p>
                </div>
              </div>
              <div className="bg-red-100 text-red-800 px-3 py-1 rounded-sm text-xs font-semibold uppercase tracking-wide">
                Required: 3/3
              </div>
            </div>

            {/* Essential Governance Areas Section Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-sm"></div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--foreground)]">
                    Essential Governance Areas
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Choose and complete at least 1 essential area from the 3 options below
                  </p>
                </div>
              </div>
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-sm text-xs font-semibold uppercase tracking-wide">
                Required: 1/3
              </div>
            </div>
          </div>

          {/* Tabs List - All tabs must be within this component */}
          <TabsList className="w-full h-auto bg-transparent mt-6">
            <div className="w-full space-y-6">
              {/* Core Areas Grid */}
              <div className="grid grid-cols-3 gap-4">
                {assessment.governanceAreas
                  .filter((area) => area.isCore)
                  .map((area) => {
                    const progress = getAreaProgress(area.id);
                    const logoPath = getAreaLogo(area.name);
                    const isActive = activeTab === area.id;

                    return (
                      <TabsTrigger
                        key={area.id}
                        value={area.id}
                        className={`group relative flex flex-col items-center p-4 rounded-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] min-h-[140px] overflow-hidden ${
                          isActive
                            ? "bg-[var(--card)] shadow-xl scale-[1.03] border-2 border-[var(--cityscape-yellow)]"
                            : "bg-[var(--card)]/90 backdrop-blur-sm border-2 border-[var(--border)] hover:border-[var(--cityscape-yellow)]/60"
                        }`}
                      >
                        {/* Core Badge */}
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-sm font-bold shadow-sm">
                          CORE
                        </div>

                        {/* Decorative background for active state */}
                        {isActive && (
                          <>
                            <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--cityscape-yellow)]/10 rounded-full -translate-y-8 translate-x-8"></div>
                            <div className="absolute bottom-0 left-0 w-12 h-12 bg-[var(--cityscape-yellow)]/5 rounded-full translate-y-6 -translate-x-6"></div>
                          </>
                        )}

                        {/* Content */}
                        <div className="relative z-10 flex flex-col items-center space-y-2 w-full pt-3">
                          {/* Logo and Status */}
                          <div className="relative">
                            <div
                              className={`w-14 h-14 rounded-sm p-2 shadow-md transition-all duration-200 ${
                                isActive
                                  ? "bg-[var(--card)]/95 shadow-lg"
                                  : "bg-[var(--card)]/90 group-hover:shadow-lg"
                              }`}
                            >
                              <Image
                                src={logoPath}
                                alt={`${area.name} logo`}
                                width={40}
                                height={40}
                                className="object-contain w-full h-full"
                              />
                            </div>
                            <div className="absolute -top-1 -right-1 bg-[var(--card)] rounded-full p-0.5 shadow-sm">
                              {getAreaStatusIcon(area.id)}
                            </div>
                          </div>

                          {/* Area Code - Main Display */}
                          <div
                            className={`px-3 py-1 rounded-sm text-lg font-bold transition-colors duration-200 ${
                              isActive
                                ? "text-[var(--cityscape-yellow)] bg-[var(--card)]/90 shadow-sm"
                                : "text-[var(--foreground)] bg-[var(--hover)] group-hover:bg-[var(--cityscape-yellow)]/10"
                            }`}
                          >
                            {area.code}
                          </div>

                          {/* Progress Section */}
                          <div className="w-full space-y-1 mt-auto">
                            {/* Progress Percentage */}
                            <div
                              className={`text-center transition-colors duration-200 ${
                                isActive
                                  ? "text-[var(--cityscape-yellow)]"
                                  : "text-[var(--foreground)]"
                              }`}
                            >
                              <div className="text-lg font-bold">{progress}%</div>
                              <div className="text-xs opacity-80">complete</div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-[var(--border)]/80 rounded-sm h-1.5 overflow-hidden shadow-inner">
                              <div
                                className={`h-full rounded-sm transition-all duration-500 ${
                                  isActive
                                    ? "bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)]"
                                    : "bg-gradient-to-r from-red-400 to-red-500"
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>

                            {/* Progress Text */}
                            <div className="text-xs text-center text-[var(--text-secondary)]">
                              {countCompletedIndicators(area.indicators)} of{" "}
                              {countAllIndicators(area.indicators)} indicators
                            </div>
                          </div>
                        </div>

                        {/* Hover Effect Overlay */}
                        <div
                          className={`absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-sm ${
                            isActive ? "hidden" : ""
                          }`}
                        />
                      </TabsTrigger>
                    );
                  })}
              </div>

              {/* Essential Areas Grid */}
              <div className="grid grid-cols-3 gap-4">
                {assessment.governanceAreas
                  .filter((area) => !area.isCore)
                  .map((area) => {
                    const progress = getAreaProgress(area.id);
                    const logoPath = getAreaLogo(area.name);
                    const isActive = activeTab === area.id;
                    const isCompleted = progress === 100;

                    return (
                      <TabsTrigger
                        key={area.id}
                        value={area.id}
                        className={`group relative flex flex-col items-center p-4 rounded-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] min-h-[140px] overflow-hidden ${
                          isActive
                            ? "bg-[var(--card)] shadow-xl scale-[1.03] border-2 border-[var(--cityscape-yellow)]"
                            : "bg-[var(--card)]/90 backdrop-blur-sm border-2 border-[var(--border)] hover:border-[var(--cityscape-yellow)]/60"
                        }`}
                      >
                        {/* Essentials Badge */}
                        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-sm font-bold shadow-sm">
                          ESSENTIALS
                        </div>

                        {/* Decorative background for active state */}
                        {isActive && (
                          <>
                            <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--cityscape-yellow)]/10 rounded-full -translate-y-8 translate-x-8"></div>
                            <div className="absolute bottom-0 left-0 w-12 h-12 bg-[var(--cityscape-yellow)]/5 rounded-full translate-y-6 -translate-x-6"></div>
                          </>
                        )}

                        {/* Content */}
                        <div className="relative z-10 flex flex-col items-center space-y-2 w-full pt-3">
                          {/* Logo and Status */}
                          <div className="relative">
                            <div
                              className={`w-14 h-14 rounded-sm p-2 shadow-md transition-all duration-200 ${
                                isActive
                                  ? "bg-[var(--card)]/95 shadow-lg"
                                  : "bg-[var(--card)]/90 group-hover:shadow-lg"
                              }`}
                            >
                              <Image
                                src={logoPath}
                                alt={`${area.name} logo`}
                                width={40}
                                height={40}
                                className="object-contain w-full h-full"
                              />
                            </div>
                            <div className="absolute -top-1 -right-1 bg-[var(--card)] rounded-full p-0.5 shadow-sm">
                              {getAreaStatusIcon(area.id)}
                            </div>
                          </div>

                          {/* Area Code - Main Display */}
                          <div
                            className={`px-3 py-1 rounded-sm text-lg font-bold transition-colors duration-200 ${
                              isActive
                                ? "text-[var(--cityscape-yellow)] bg-[var(--card)]/90 shadow-sm"
                                : "text-[var(--foreground)] bg-[var(--hover)] group-hover:bg-[var(--cityscape-yellow)]/10"
                            }`}
                          >
                            {area.code}
                          </div>

                          {/* Progress Section */}
                          <div className="w-full space-y-1 mt-auto">
                            {/* Progress Percentage */}
                            <div
                              className={`text-center transition-colors duration-200 ${
                                isActive
                                  ? "text-[var(--cityscape-yellow)]"
                                  : "text-[var(--foreground)]"
                              }`}
                            >
                              <div className="text-lg font-bold">{progress}%</div>
                              <div className="text-xs opacity-80">complete</div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-[var(--border)]/80 rounded-sm h-1.5 overflow-hidden shadow-inner">
                              <div
                                className={`h-full rounded-sm transition-all duration-500 ${
                                  isActive
                                    ? "bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)]"
                                    : isCompleted
                                      ? "bg-gradient-to-r from-green-400 to-green-500"
                                      : "bg-gradient-to-r from-blue-400 to-blue-500"
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>

                            {/* Progress Text */}
                            <div className="text-xs text-center text-[var(--text-secondary)]">
                              {countCompletedIndicators(area.indicators)} of{" "}
                              {countAllIndicators(area.indicators)} indicators
                            </div>
                          </div>
                        </div>

                        {/* Hover Effect Overlay */}
                        <div
                          className={`absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-sm ${
                            isActive ? "hidden" : ""
                          }`}
                        />
                      </TabsTrigger>
                    );
                  })}
              </div>
            </div>
          </TabsList>
        </div>

        {/* Enhanced Tab Content */}
        {assessment.governanceAreas.map((area) => {
          const logoPath = getAreaLogo(area.name);
          const progress = getAreaProgress(area.id);
          const completedIndicators = countCompletedIndicators(area.indicators);

          return (
            <TabsContent key={area.id} value={area.id} className="p-0">
              <div className="space-y-6">
                {/* Enhanced Area Header */}
                <div
                  className={`relative overflow-hidden bg-[var(--card)] p-8 border-b border-[var(--border)]`}
                >
                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--cityscape-yellow)]/10 rounded-full -translate-y-16 translate-x-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-[var(--cityscape-yellow)]/5 rounded-full translate-y-12 -translate-x-12"></div>

                  <div className="relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                      {/* Left side - Area info */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-[var(--card)]/90 rounded-sm p-3 shadow-sm">
                            <Image
                              src={logoPath}
                              alt={`${area.name} logo`}
                              width={40}
                              height={40}
                              className="object-contain w-full h-full"
                            />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-1">
                              {area.name}
                            </h2>
                            <div className="flex items-center gap-3 text-sm">
                              <span
                                className={`px-3 py-1 rounded-sm bg-[var(--card)]/60 backdrop-blur-sm text-[var(--cityscape-yellow)] font-medium`}
                              >
                                {area.code}
                              </span>
                              <span className="text-[var(--text-secondary)]">
                                {area.isCore ? "Core Area" : "Essential Area"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl">
                          {area.description}
                        </p>
                      </div>

                      {/* Right side - Stats */}
                      <div className="flex items-center gap-4">
                        <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)]">
                          <div className="text-2xl font-bold text-[var(--foreground)]">
                            {completedIndicators}
                          </div>
                          <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                            Completed
                          </div>
                        </div>
                        <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)]">
                          <div className="text-2xl font-bold text-[var(--foreground)]">
                            {countAllIndicators(area.indicators) - completedIndicators}
                          </div>
                          <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                            Remaining
                          </div>
                        </div>
                        <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 text-center shadow-sm border border-[var(--border)]">
                          <div className="text-2xl font-bold text-[var(--cityscape-yellow)]">
                            {progress}%
                          </div>
                          <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                            Complete
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6 bg-[var(--hover)] backdrop-blur-sm rounded-sm p-4 border border-[var(--border)]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-[var(--text-secondary)]" />
                          <span className="text-sm font-medium text-[var(--foreground)]">
                            Area Progress
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-[var(--foreground)]">
                          {progress}%
                        </span>
                      </div>
                      <div className="w-full bg-[var(--border)]/80 rounded-sm h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] rounded-sm transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-2">
                        <span>{completedIndicators} indicators completed</span>
                        <span>
                          {countAllIndicators(area.indicators) - completedIndicators} remaining
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Indicators Section */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <FileText className="h-5 w-5 text-[var(--text-secondary)]" />
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">
                      Assessment Indicators
                    </h3>
                    <span className="text-sm text-[var(--text-secondary)]">
                      ({countAllIndicators(area.indicators)} total)
                    </span>
                  </div>

                  <div className="space-y-4">
                    {area.indicators.map((indicator) => {
                      const indicatorLocked =
                        isLocked ||
                        (assessment.status === "Needs Rework" &&
                          !(indicator as any).requiresRework);
                      return (
                        <RecursiveIndicator
                          key={indicator.id}
                          indicator={indicator}
                          isLocked={indicatorLocked}
                          updateAssessmentData={updateAssessmentData}
                          level={0}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
