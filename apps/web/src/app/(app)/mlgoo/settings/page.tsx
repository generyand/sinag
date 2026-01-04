"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Building2,
  Calendar,
  Clock,
  Download,
  ExternalLink,
  History,
  Settings,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsSkeleton } from "@/components/features/settings/SettingsSkeleton";

export default function AdminSettingsPage() {
  const { isAuthenticated, user } = useAuthStore();

  // Mock loading state - in real app this would come from API
  const [isLoading] = useState(false);

  // Show loading if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-[var(--muted-foreground)]">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show skeleton while loading
  if (isLoading) {
    return <SettingsSkeleton />;
  }

  const settingsSections = [
    {
      title: "Assessment Years",
      description: "Manage assessment years, deadlines, and submission periods",
      icon: Calendar,
      href: "/mlgoo/cycles",
      color: "var(--cityscape-yellow)",
      isLink: true,
    },
    {
      title: "User Management",
      description: "Manage system users, roles, and permissions",
      icon: Users,
      href: "/mlgoo/users",
      color: "#3B82F6",
      isLink: true,
    },
    {
      title: "Deadline Windows",
      description: "Configure rework and calibration window durations",
      icon: Clock,
      href: "/mlgoo/cycles?tab=deadline-windows",
      color: "#EF4444",
      isLink: true,
    },
    {
      title: "Municipal Offices",
      description: "Manage municipal offices linked to governance areas",
      icon: Building2,
      href: "/mlgoo/municipal-offices",
      color: "#10B981",
      isLink: true,
    },
    {
      title: "Activity Logs",
      description: "View assessment workflow activities and history",
      icon: History,
      href: "/mlgoo/activity-logs",
      color: "#8B5CF6",
      isLink: true,
    },
    {
      title: "Data Export",
      description: "Export municipal assessment data to Excel",
      icon: Download,
      href: "/mlgoo/data-export",
      color: "#F59E0B",
      isLink: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-8">
          {/* Enhanced Header Section */}
          <div className="relative overflow-hidden bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-8">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-100/40 to-indigo-100/20 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-100/30 to-pink-100/20 rounded-full translate-y-16 -translate-x-16"></div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-sm flex items-center justify-center shadow-sm"
                      style={{
                        background:
                          "linear-gradient(to bottom right, var(--cityscape-yellow), var(--cityscape-yellow-dark))",
                      }}
                    >
                      <Settings className="h-6 w-6 text-[var(--foreground)]" />
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--foreground)]">
                      System{" "}
                      <span className="bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] bg-clip-text text-transparent">
                        Settings
                      </span>
                    </h1>
                  </div>
                  <p className="text-[var(--muted-foreground)]">
                    Configure and manage SINAG system settings
                  </p>
                </div>

                {/* User Info */}
                {user && (
                  <div className="bg-[var(--card)]/80 backdrop-blur-sm rounded-sm p-4 shadow-sm border border-[var(--border)]">
                    <div className="text-sm text-[var(--muted-foreground)]">Logged in as</div>
                    <div className="font-semibold text-[var(--foreground)]">{user.name}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">{user.role}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const content = (
                <Card
                  className={`h-full bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-lg overflow-hidden transition-all duration-200 ${
                    section.isLink
                      ? "hover:shadow-xl hover:border-[var(--cityscape-yellow)]/50 cursor-pointer"
                      : "opacity-75"
                  }`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div
                        className="w-12 h-12 rounded-sm flex items-center justify-center shadow-sm"
                        style={{
                          backgroundColor: `${section.color}20`,
                        }}
                      >
                        <Icon className="h-6 w-6" style={{ color: section.color }} />
                      </div>
                      {section.badge && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          {section.badge}
                        </span>
                      )}
                      {section.isLink && (
                        <ExternalLink className="h-4 w-4 text-[var(--muted-foreground)]" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-lg font-semibold text-[var(--foreground)] mb-2">
                      {section.title}
                    </CardTitle>
                    <p className="text-sm text-[var(--muted-foreground)]">{section.description}</p>
                  </CardContent>
                </Card>
              );

              if (section.isLink) {
                return (
                  <Link key={section.title} href={section.href} className="h-full">
                    {content}
                  </Link>
                );
              }

              return (
                <div key={section.title} className="h-full">
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
