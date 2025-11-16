"use client";

import LoginForm from "@/components/features/auth/LoginForm";
import { useAuthStore } from "@/store/useAuthStore";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Custom hook for theme detection that integrates with the app's theme system
function useLoginTheme() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Function to determine theme using the app's theme system
    const getTheme = () => {
      // Check for saved theme preference in localStorage using the app's key
      const savedTheme = localStorage.getItem("vantage-theme") as
        | "light"
        | "dark"
        | "system";

      // Check system preference
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      const systemPrefersLight = window.matchMedia(
        "(prefers-color-scheme: light)"
      ).matches;

      // Priority: saved theme > system preference > default to light
      if (savedTheme === "dark") return true;
      if (savedTheme === "light") return false;
      if (savedTheme === "system") {
        return systemPrefersDark;
      }

      // If no saved theme, check system preference
      if (systemPrefersLight) return false;
      if (systemPrefersDark) return true;

      // Default to light mode if no preference is set
      return false;
    };

    // Set initial theme
    setIsDarkMode(getTheme());

    // Listen for system preference changes
    const darkMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const lightMediaQuery = window.matchMedia("(prefers-color-scheme: light)");

    const handleDarkChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem("vantage-theme");
      if (e.matches && (savedTheme === "system" || !savedTheme)) {
        setIsDarkMode(true);
      }
    };

    const handleLightChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem("vantage-theme");
      if (e.matches && (savedTheme === "system" || !savedTheme)) {
        setIsDarkMode(false);
      }
    };

    // Listen for storage changes (if user changes theme in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "vantage-theme") {
        const newTheme = e.newValue as "light" | "dark" | "system";
        if (newTheme === "dark") {
          setIsDarkMode(true);
        } else if (newTheme === "light") {
          setIsDarkMode(false);
        } else if (newTheme === "system") {
          setIsDarkMode(
            window.matchMedia("(prefers-color-scheme: dark)").matches
          );
        }
      }
    };

    darkMediaQuery.addEventListener("change", handleDarkChange);
    lightMediaQuery.addEventListener("change", handleLightChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      darkMediaQuery.removeEventListener("change", handleDarkChange);
      lightMediaQuery.removeEventListener("change", handleLightChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return isDarkMode;
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const isDarkMode = useLoginTheme();

  // Redirect authenticated users to appropriate dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      const isAdmin = user.role === "MLGOO_DILG";
      const isAssessor = user.role === "ASSESSOR";
      const isValidator = user.role === "VALIDATOR";

      let dashboardPath;
      if (isAdmin) {
        dashboardPath = "/mlgoo/dashboard";
      } else if (isAssessor) {
        dashboardPath = "/assessor/submissions";
      } else if (isValidator) {
        dashboardPath = "/validator/submissions";
      } else {
        dashboardPath = "/blgu/dashboard";
      }

      router.replace(dashboardPath);
    }
  }, [isAuthenticated, user, router]);

  // Show loading or redirect if user is authenticated
  if (isAuthenticated) {
    return (
      <div
        className={`relative h-screen flex items-center justify-center transition-colors duration-500 ${
          isDarkMode
            ? "bg-gradient-to-br from-slate-800 via-gray-900 to-black"
            : "bg-gradient-to-br from-slate-50 via-yellow-50 to-amber-50"
        }`}
      >
        <div className="text-center">
          <div className="rounded-full h-6 w-6 border-2 border-[#fbbf24] border-t-transparent mx-auto mb-4 animate-spin"></div>
          <p
            className={`transition-colors duration-500 ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }
  return (
    <div
      className={`relative min-h-screen flex flex-col transition-colors duration-500 ${
        isDarkMode
          ? "bg-gradient-to-br from-slate-800 via-gray-900 to-black"
          : "bg-gradient-to-br from-slate-50 via-yellow-50 to-amber-50"
      }`}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Sophisticated geometric background pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          {/* Grid pattern */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
              linear-gradient(rgba(251, 191, 36, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(251, 191, 36, 0.1) 1px, transparent 1px)
            `,
              backgroundSize: "50px 50px",
            }}
          ></div>
          {/* Geometric shapes */}
          <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-[#fbbf24] rounded-full"></div>
          <div className="absolute bottom-1/3 right-1/3 w-24 h-24 border border-[#f59e0b] rounded-full"></div>
          <div className="absolute top-1/2 right-1/4 w-16 h-16 border border-[#d97706] rounded-full"></div>
          <div
            className="absolute top-1/6 right-1/6 w-20 h-20 border border-[#fbbf24] transform rotate-45"
            style={{ animationDelay: "0.5s" }}
          ></div>
          <div
            className="absolute bottom-1/4 left-1/6 w-28 h-28 border border-[#f59e0b] transform rotate-12"
            style={{ animationDelay: "1.5s" }}
          ></div>
        </div>

        {/* Enhanced glowing blobs - Dynamic opacity based on theme */}
        {/* top right - Primary yellow glow */}
        <div
          className={`absolute -top-40 -right-40 w-48 h-48 lg:w-60 lg:h-60 xl:w-80 xl:h-80 rounded-full filter blur-xl transition-all duration-500 ${
            isDarkMode
              ? "bg-[#fbbf24]/60 mix-blend-screen"
              : "bg-[#fbbf24]/30 mix-blend-multiply"
          }`}
        ></div>
        <div
          className={`absolute -top-20 -right-20 w-32 h-32 lg:w-40 lg:h-40 xl:w-48 xl:h-48 rounded-full filter blur-lg transition-all duration-500 ${
            isDarkMode
              ? "bg-[#fbbf24]/40 mix-blend-screen"
              : "bg-[#fbbf24]/20 mix-blend-multiply"
          }`}
        ></div>

        {/* bottom left - Secondary amber glow */}
        <div
          className={`absolute -bottom-40 -left-40 w-48 h-48 lg:w-60 lg:h-60 xl:w-80 xl:h-80 rounded-full filter blur-xl transition-all duration-500 ${
            isDarkMode
              ? "bg-[#f59e0b]/60 mix-blend-screen"
              : "bg-[#f59e0b]/30 mix-blend-multiply"
          }`}
        ></div>
        <div
          className={`absolute -bottom-20 -left-20 w-32 h-32 lg:w-40 lg:h-40 xl:w-48 xl:h-48 rounded-full filter blur-lg transition-all duration-500 ${
            isDarkMode
              ? "bg-[#f59e0b]/40 mix-blend-screen"
              : "bg-[#f59e0b]/20 mix-blend-multiply"
          }`}
        ></div>

        {/* top left - Tertiary orange accent */}
        <div
          className={`absolute top-40 left-40 w-48 h-48 lg:w-60 lg:h-60 xl:w-80 xl:h-80 rounded-full filter blur-xl transition-all duration-500 ${
            isDarkMode
              ? "bg-[#d97706]/50 mix-blend-screen"
              : "bg-[#d97706]/25 mix-blend-multiply"
          }`}
        ></div>

        {/* Center accent glow */}
        <div
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full filter blur-3xl transition-all duration-500 ${
            isDarkMode
              ? "bg-[#fbbf24]/10 mix-blend-screen"
              : "bg-[#fbbf24]/5 mix-blend-multiply"
          }`}
        ></div>
      </div>
      {/* Main content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-center gap-x-24 flex-1 py-2">
        {/* Left Panel */}
        <div className="hidden lg:flex flex-col items-center justify-center">
          {/* Floating Logo */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-6">
              <div className="relative">
                {/* Logo only - no box */}
                <div className="flex items-center justify-center p-0">
                  <Image
                    src="/logo/logo.webp"
                    alt="SINAG official logo"
                    width={280}
                    height={280}
                    sizes="240px"
                    priority
                    className="w-[240px] h-[240px] object-contain"
                  />
                </div>
              </div>
            </div>
            <h1
              className={`text-4xl font-extrabold mb-4 tracking-tight text-center ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              SINAG
            </h1>
            <p
              className={`text-base font-medium text-center max-w-md mb-8 leading-relaxed ${
                isDarkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Strategic Insights Nurturing Assessments and Governance
            </p>
          </div>
        </div>
        {/* Right Panel (Login Card) */}
        <div className="flex flex-col items-center justify-center min-w-[380px] max-w-md w-full px-4 py-2 sm:px-6 lg:px-0">
          {/* Single Card: Welcome, subtitle, LoginForm, and assistance text all in one */}
          <div
            className={`w-full backdrop-blur-md rounded-2xl p-8 md:p-8 flex flex-col space-y-5 ${
              isDarkMode
                ? "bg-gray-800/95 border border-gray-700/40"
                : "bg-white/95 border border-white/50"
            }`}
            style={{
              boxShadow: isDarkMode
                ? "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 40px 60px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(251, 191, 36, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 0 20px rgba(251, 191, 36, 0.03)"
                : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 40px 60px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(251, 191, 36, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 0 20px rgba(251, 191, 36, 0.02)",
            }}
          >
            <div className="text-center">
              <h2
                className={`text-2xl md:text-3xl font-extrabold mb-2 leading-tight tracking-tight transition-colors duration-500 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Welcome, Partner in Governance
              </h2>
              <p
                className={`text-base leading-relaxed transition-colors duration-500 ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Sign in to the VANTAGE Platform.
              </p>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <LoginForm isDarkMode={isDarkMode} />
            </div>
            <p
              className={`text-sm text-center mt-4 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              For account assistance, please contact your MLGRC Administrator.
            </p>
          </div>
        </div>
      </div>
      {/* Footer */}
      <footer
        className={`relative z-20 w-full backdrop-blur-md py-3 px-4 transition-colors duration-500 ${
          isDarkMode
            ? "bg-black/50 border-t border-white/10"
            : "bg-white/90 border-t border-gray-200/80"
        }`}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <div
            className={`flex items-center gap-3 text-xs ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            <span>&copy; 2024 MLGRC Davao del Sur</span>
            <span className="hidden md:inline">|</span>
            <span className="flex items-center gap-1">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Secured Platform
            </span>
          </div>
          <div
            className={`text-center text-xs ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            <div>Support: (02) 1234-5678 | support.vantage@mlgrc.gov.ph</div>
            <div className="text-xs opacity-75">
              Version 1.0.0 | Build 2024.01.15
            </div>
          </div>
        </div>
      </footer>
      <style jsx global>{`
        @keyframes float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-16px);
          }
          100% {
            transform: translateY(0px);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes fade-in-blob {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 0.6;
          }
        }
        .animate-fade-in-blob {
          animation: fade-in-blob 1.2s ease-in forwards;
        }
        .animate-fade-in-blob-light {
          animation: fade-in-blob 1.2s 0.5s ease-in forwards;
        }
        .animate-blob {
          animation: blob 8s infinite linear alternate;
        }
        @keyframes blob {
          0% {
            transform: scale(1) translate(0px, 0px);
          }
          33% {
            transform: scale(1.1, 0.9) translate(30px, -20px);
          }
          66% {
            transform: scale(0.9, 1.1) translate(-20px, 30px);
          }
          100% {
            transform: scale(1) translate(0px, 0px);
          }
        }
        .animation-delay-800 {
          animation-delay: 0.8s;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .shadow-3xl {
          box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25),
            0 0 0 1px rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
}
