"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { UserListSection } from "@/components/features/users";

export default function UserManagementPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  // Redirect non-admin users to their appropriate dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      const isAdmin = user.role === "MLGOO_DILG";
      if (!isAdmin) {
        // Redirect to appropriate dashboard based on role
        if (user.role === "ASSESSOR" || user.role === "VALIDATOR") {
          router.replace("/assessor/submissions");
        } else {
          router.replace("/blgu/dashboard");
        }
      }
    }
  }, [isAuthenticated, user, router]);

  // Show loading if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-[var(--muted-foreground)]">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show loading if user is not admin
  if (user && user.role !== "MLGOO_DILG") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-[var(--muted-foreground)]">
            Access denied. Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <UserListSection />
      </div>
    </div>
  );
}
