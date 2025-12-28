"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      const isAdmin = user.role === ("MLGOO_DILG" as any);
      const isAssessor = user.role === ("ASSESSOR" as any);

      let dashboardPath;
      if (isAdmin) {
        dashboardPath = "/mlgoo/dashboard";
      } else if (isAssessor) {
        dashboardPath = "/assessor/submissions";
      } else {
        dashboardPath = "/blgu/dashboard";
      }

      console.log("Root page redirecting:", {
        userRole: user.role,
        isAdmin,
        isAssessor,
        dashboardPath,
      });

      router.replace(dashboardPath);
    } else if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
