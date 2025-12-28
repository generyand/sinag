// 🚀 Modern login form using auto-generated React Query hooks
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/useAuthStore";
import { useGetUsersMe, usePostAuthLogin, getGetUsersMeQueryKey } from "@sinag/shared";
import { AlertTriangle, Eye, EyeOff, Lock, Mail, ServerCrash, WifiOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

/**
 * Login form component with authentication and redirect logic
 *
 * Uses the auto-generated usePostAuthLogin hook and integrates with
 * the Zustand auth store for state management.
 */
interface LoginFormProps {
  isDarkMode?: boolean;
}

export default function LoginForm({ isDarkMode = false }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [shouldFetchUser, setShouldFetchUser] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Small entrance animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Get auth store actions
  const { setToken, setUser } = useAuthStore();

  // Auto-generated login mutation hook
  const loginMutation = usePostAuthLogin({
    mutation: {
      onSuccess: (response) => {
        // Extract token from response
        const accessToken = response.access_token;

        if (!accessToken) {
          return;
        }

        // Store token in auth store
        setToken(accessToken);
        setLoginSuccess(true);

        // Show success message with animation
        toast.success("🎉 Welcome back! Redirecting to your dashboard...", {
          duration: 3000,
          style: {
            background: isDarkMode ? "#1a1f2e" : "#ffffff",
            color: isDarkMode ? "#ffffff" : "#1a1f2e",
            border: `1px solid ${isDarkMode ? "#F7B520" : "#F7B520"}`,
            borderRadius: "12px",
            padding: "16px",
            fontSize: "14px",
            fontWeight: "500",
          },
        });

        // Trigger user data fetch
        setShouldFetchUser(true);
      },
      onError: (error) => {
        // Determine error type for appropriate message
        const err = error as {
          response?: { status?: number };
          message?: string;
          code?: string;
        };

        let toastMessage = "Wrong email or password";
        let toastIcon = "🔒";

        // Network/connection errors
        if (
          err.message === "Network Error" ||
          err.message?.includes("Failed to fetch") ||
          err.message?.includes("fetch failed") ||
          err.code === "ERR_NETWORK" ||
          err.code === "ECONNREFUSED"
        ) {
          toastMessage = "Unable to connect to server";
          toastIcon = "🔌";
        }
        // Server errors
        else if (err.response?.status && err.response.status >= 500) {
          toastMessage = "Server error - please try again later";
          toastIcon = "⚠️";
        }
        // Rate limiting
        else if (err.response?.status === 429) {
          toastMessage = "Too many attempts - please wait";
          toastIcon = "⏳";
        }

        toast.error(`${toastIcon} ${toastMessage}`, {
          duration: 4000,
          style: {
            background: isDarkMode ? "#1a1f2e" : "#ffffff",
            color: isDarkMode ? "#ffffff" : "#1a1f2e",
            border: "1px solid #ef4444",
            borderRadius: "12px",
            padding: "16px",
            fontSize: "14px",
            fontWeight: "500",
          },
        });
      },
      retry: false, // Disable retry to prevent multiple requests
    },
  });

  // Auto-generated hook to fetch current user data (disabled by default)
  const userQuery = useGetUsersMe({
    query: {
      enabled: false, // Don't fetch on mount, only when triggered
      queryKey: getGetUsersMeQueryKey(),
    },
  });

  // Handle user data fetch success/error
  useEffect(() => {
    if (shouldFetchUser) {
      // Trigger user data fetch
      userQuery.refetch().then((result) => {
        if (result.data) {
          // Store user in auth store
          setUser(result.data);

          // Check for redirect parameter first, then fall back to dashboard
          const redirectTo = searchParams.get("redirect");
          let targetPath;

          if (redirectTo) {
            // Validate the redirect path to prevent open redirects
            const isValidRedirect =
              redirectTo.startsWith("/blgu/") ||
              redirectTo.startsWith("/mlgoo/") ||
              redirectTo.startsWith("/assessor/") ||
              redirectTo.startsWith("/validator/") ||
              redirectTo.startsWith("/katuparan/") ||
              redirectTo.startsWith("/user-management/") ||
              redirectTo.startsWith("/change-password");

            if (isValidRedirect) {
              targetPath = redirectTo;
            } else {
              // Fall back to dashboard if redirect is invalid
              const isAdmin = result.data.role === "MLGOO_DILG";
              const isAssessor = result.data.role === "ASSESSOR";
              const isValidator = result.data.role === "VALIDATOR";
              const isExternalUser = result.data.role === "KATUPARAN_CENTER_USER";

              if (isAdmin) {
                targetPath = "/mlgoo/dashboard";
              } else if (isAssessor) {
                targetPath = "/assessor/submissions";
              } else if (isValidator) {
                targetPath = "/validator/submissions";
              } else if (isExternalUser) {
                targetPath = "/katuparan/dashboard";
              } else {
                targetPath = "/blgu/dashboard";
              }
            }
          } else {
            // No redirect parameter, go to appropriate dashboard
            const isAdmin = result.data.role === "MLGOO_DILG";
            const isAssessor = result.data.role === "ASSESSOR";
            const isValidator = result.data.role === "VALIDATOR";
            const isExternalUser = result.data.role === "KATUPARAN_CENTER_USER";

            if (isAdmin) {
              targetPath = "/mlgoo/dashboard";
            } else if (isAssessor) {
              targetPath = "/assessor/submissions";
            } else if (isValidator) {
              targetPath = "/validator/submissions";
            } else if (isExternalUser) {
              targetPath = "/katuparan/dashboard";
            } else {
              targetPath = "/blgu/dashboard";
            }
          }

          router.replace(targetPath);
        } else if (result.error) {
          // If user fetch fails, redirect to login
          router.replace("/login");
        }
        // Reset the flag
        setShouldFetchUser(false);
      });
    }
  }, [shouldFetchUser, userQuery, setUser, router, searchParams]);

  // Show toast on login success
  useEffect(() => {
    if (loginMutation.isSuccess) {
      toast.success("Login Successfully");
    }
  }, [loginMutation.isSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const credentials = {
      email,
      password,
      remember_me: rememberMe,
    };

    // Use regular mutate instead of mutateAsync to prevent form refresh
    loginMutation.mutate({ data: credentials });
  };

  // Error info structure for better UX
  interface ErrorInfo {
    type: "network" | "server" | "auth" | "unknown";
    title: string;
    message: string;
  }

  // Get structured error info for display
  const getErrorInfo = (): ErrorInfo | null => {
    if (!loginMutation.error) return null;

    const error = loginMutation.error as {
      response?: { data?: { detail?: string }; status?: number };
      message?: string;
      code?: string;
    };

    // Network/Server unreachable - check various network error signatures
    if (
      error.message === "Network Error" ||
      error.message?.includes("Failed to fetch") ||
      error.message?.includes("fetch failed") ||
      error.code === "ERR_NETWORK" ||
      error.code === "ECONNREFUSED"
    ) {
      return {
        type: "network",
        title: "Unable to connect to server",
        message:
          "The server may be down or unreachable. Please check your connection and try again.",
      };
    }

    // Server error (500+)
    if (error.response?.status && error.response.status >= 500) {
      return {
        type: "server",
        title: "Server error",
        message: "Something went wrong on our end. Please try again later.",
      };
    }

    // Auth failure (401)
    if (error.response?.status === 401 || error.message?.includes("401")) {
      return {
        type: "auth",
        title: "Login failed",
        message: "Incorrect email or password. Please try again.",
      };
    }

    // Rate limited (429)
    if (error.response?.status === 429) {
      return {
        type: "server",
        title: "Too many attempts",
        message: "Please wait a moment before trying again.",
      };
    }

    // Default fallback
    return {
      type: "unknown",
      title: "Something went wrong",
      message: error.response?.data?.detail || "Please try again.",
    };
  };

  const errorInfo = getErrorInfo();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {Boolean(loginMutation.isPending) ? (
        <>
          <div className={`transition-colors duration-200`}>
            <Label
              className={`block text-sm font-medium mb-2 transition-colors duration-500 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Email
            </Label>
            <Skeleton shape="rounded" size="lg" width="full" className="mb-2" />
          </div>
          <div className={`mt-4`}>
            <Label
              className={`block text-sm font-medium mb-2 transition-colors duration-500 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Password
            </Label>
            <Skeleton shape="rounded" size="lg" width="full" className="mb-2" />
          </div>
          <div className={`mt-4`}>
            <Skeleton shape="rounded" size="lg" width="full" className="mt-4" />
          </div>
        </>
      ) : (
        <>
          <div
            className={`transition-all duration-500 ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <Label
              htmlFor="email"
              className={`block text-sm font-medium mb-2 transition-colors duration-500 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Email
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-800 z-10">
                <Mail className="w-5 h-5" />
              </span>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loginMutation.isPending}
                className={`pl-10 py-3 text-base transition-all duration-300 focus:border-[#fbbf24] focus:ring-[#fbbf24]/30 focus:ring-2 hover:border-[#fbbf24]/60 relative z-0 ${
                  isDarkMode
                    ? "bg-gray-700/80 border-gray-600/60 text-white placeholder-gray-400 focus:bg-gray-600/80"
                    : "bg-white border-gray-300/60 text-gray-900 placeholder-gray-500 focus:bg-white"
                }`}
                shape="boxy"
                placeholder="Enter your email address"
                autoComplete="username"
              />
            </div>
          </div>
          <div
            className={`mt-4 transition-all duration-500 delay-100 ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <Label
              htmlFor="password"
              className={`block text-sm font-medium mb-2 transition-colors duration-500 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Password
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-800 z-10">
                <Lock className="w-5 h-5" />
              </span>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  // Show hint when Caps Lock is active
                  // getModifierState works across browsers
                  const caps = (e as unknown as KeyboardEvent).getModifierState?.("CapsLock");
                  if (typeof caps === "boolean") setIsCapsLockOn(caps);
                }}
                onKeyUp={(e) => {
                  const caps = (e as unknown as KeyboardEvent).getModifierState?.("CapsLock");
                  if (typeof caps === "boolean") setIsCapsLockOn(caps);
                }}
                required
                disabled={loginMutation.isPending}
                className={`pl-10 pr-10 py-3 text-base transition-all duration-300 focus:border-[#fbbf24] focus:ring-[#fbbf24]/30 focus:ring-2 hover:border-[#fbbf24]/60 relative z-0 ${
                  isDarkMode
                    ? "bg-gray-700/80 border-gray-600/60 text-white placeholder-gray-400 focus:bg-gray-600/80"
                    : "bg-white border-gray-300/60 text-gray-900 placeholder-gray-500 focus:bg-white"
                }`}
                shape="boxy"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              {isCapsLockOn && (
                <span
                  className={`absolute right-12 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border text-[10px] font-semibold select-none pointer-events-none ${
                    isDarkMode
                      ? "bg-amber-500/20 text-amber-200 border-amber-400/40"
                      : "bg-amber-100 text-amber-700 border-amber-300"
                  }`}
                  aria-live="polite"
                >
                  CAPS
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute inset-y-0 right-0 flex items-center justify-center w-10 bg-transparent border-none outline-none focus:outline-none transition-colors duration-200 ${
                  isDarkMode
                    ? "text-gray-500 hover:text-[#fbbf24]"
                    : "text-gray-400 hover:text-[#f59e0b]"
                }`}
                disabled={loginMutation.isPending}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Remember Me Checkbox */}
            <div className="flex items-center mt-3">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className={`w-4 h-4 rounded border-2 transition-all duration-200 focus:ring-2 focus:ring-[#fbbf24]/30 ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-[#fbbf24] focus:bg-gray-600"
                    : "bg-gray-50 border-gray-300 text-[#f59e0b] focus:bg-white"
                }`}
              />
              <label
                htmlFor="remember-me"
                className={`ml-3 text-sm cursor-pointer transition-colors duration-300 ${
                  isDarkMode
                    ? "text-gray-400 hover:text-gray-300"
                    : "text-gray-600 hover:text-gray-700"
                }`}
              >
                Keep me signed in for 30 days
              </label>
            </div>
          </div>
          {/* Error Display */}
          {errorInfo && (
            <div
              className={`
                rounded-md p-4 mt-4
                transition-colors duration-200
                ${
                  errorInfo.type === "network"
                    ? isDarkMode
                      ? "bg-orange-900/10 border border-orange-500/20"
                      : "bg-orange-50 border border-orange-200"
                    : isDarkMode
                      ? "bg-red-900/10 border border-red-500/20"
                      : "bg-red-50 border border-red-200"
                }
                flex items-start gap-3
              `}
            >
              {/* Icon based on error type */}
              {errorInfo.type === "network" ? (
                <WifiOff
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    isDarkMode ? "text-orange-400" : "text-orange-500"
                  }`}
                />
              ) : errorInfo.type === "server" ? (
                <ServerCrash
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    isDarkMode ? "text-red-400" : "text-red-500"
                  }`}
                />
              ) : (
                <AlertTriangle
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    isDarkMode ? "text-red-400" : "text-red-500"
                  }`}
                />
              )}
              <div className="flex flex-col gap-0.5">
                <div
                  className={`text-sm font-semibold ${
                    errorInfo.type === "network"
                      ? isDarkMode
                        ? "text-orange-400"
                        : "text-orange-700"
                      : isDarkMode
                        ? "text-red-400"
                        : "text-red-700"
                  }`}
                >
                  {errorInfo.title}
                </div>
                <div
                  className={`text-sm ${
                    errorInfo.type === "network"
                      ? isDarkMode
                        ? "text-orange-300/80"
                        : "text-orange-600"
                      : isDarkMode
                        ? "text-red-300/80"
                        : "text-red-600"
                  }`}
                >
                  {errorInfo.message}
                </div>
              </div>
            </div>
          )}
          {/* Submit Button with Loading State */}
          <div
            className={`transition-all duration-500 delay-200 ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className={`w-full mt-3 text-base h-12 text-white border-0 shadow-lg transition-all duration-300 font-semibold tracking-wide disabled:opacity-70 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] ${
                loginSuccess
                  ? "bg-gradient-to-r from-green-500 to-green-600"
                  : "bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d97706]"
              }`}
            >
              {loginMutation.isPending ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="font-medium">Signing you in...</span>
                </div>
              ) : loginSuccess ? (
                <span className="flex items-center justify-center gap-2 font-semibold">
                  Success! Redirecting...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2 font-semibold">
                  Sign in
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </span>
              )}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
