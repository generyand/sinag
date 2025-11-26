"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePostAuthChangePassword, ValidationError } from "@sinag/shared";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Eye,
  EyeOff,
  Lock,
  Shield,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import "./change-password.css";

/**
 * Change Password Page
 *
 * This page is shown when a user must change their password.
 * It provides a form for users to enter their current password
 * and set a new password with a modern dashboard-inspired design.
 */
export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, setMustChangePassword } = useAuthStore();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState<{
    current_password?: string;
    new_password?: string;
    confirm_password?: string;
    general?: string;
  }>({});

  // Add change-password-page class to html and body for CSS targeting
  useEffect(() => {
    document.documentElement.classList.add('change-password-page');
    document.body.classList.add('change-password-page');
    
    return () => {
      document.documentElement.classList.remove('change-password-page');
      document.body.classList.remove('change-password-page');
    };
  }, []);

  // Auto-generated change password mutation hook
  const changePasswordMutation = usePostAuthChangePassword({
    mutation: {
      onSuccess: () => {
        // Update auth store to reflect password change
        setMustChangePassword(false);

        // Redirect to appropriate dashboard based on user role
        const isAdmin = user?.role === "MLGOO_DILG";
        const dashboardPath = isAdmin ? "/mlgoo/dashboard" : "/blgu/dashboard";
        router.replace(dashboardPath);
      },
      onError: (error) => {
        console.error("Password change failed:", error);

        // Handle specific error cases
        if (error?.detail) {
          if (typeof error.detail === "string") {
            setErrors({ general: error.detail });
          } else if (Array.isArray(error.detail)) {
            // Handle validation errors
            const validationErrors: Record<string, string> = {};
            error.detail.forEach((err: ValidationError) => {
              if (err.loc && err.loc.length > 0) {
                const field = String(err.loc[err.loc.length - 1]);
                validationErrors[field] = err.msg || 'Validation error';
              }
            });
            setErrors(validationErrors);
          }
        } else {
          setErrors({
            general: "Failed to change password. Please try again.",
          });
        }
      },
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.current_password) {
      newErrors.current_password = "Current password is required";
    }

    if (!formData.new_password) {
      newErrors.new_password = "New password is required";
    } else if (formData.new_password.length < 8) {
      newErrors.new_password =
        "New password must be at least 8 characters long";
    }

    if (!formData.confirm_password) {
      newErrors.confirm_password = "Please confirm your new password";
    } else if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = "Passwords do not match";
    }

    if (formData.current_password === formData.new_password) {
      newErrors.new_password =
        "New password must be different from current password";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Clear any previous errors
    setErrors({});

    // Submit the form
    changePasswordMutation.mutate({
      data: {
        current_password: formData.current_password,
        new_password: formData.new_password,
      },
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear field-specific error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    // Clear general error when user starts typing
    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: undefined }));
    }
  };

  return (
    <div className="min-h-screen w-full bg-[var(--background)] flex flex-col change-password-page">
      {/* Header */}
      <div className="bg-[var(--card)] border-b border-[var(--border)] px-4 sm:px-6 py-4 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] rounded-sm flex items-center justify-center">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--cityscape-accent-foreground)]" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-[var(--foreground)]">SINAG</h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">Security Portal</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 flex-shrink-0">
            <span className="px-2 sm:px-3 py-1 bg-[var(--cityscape-yellow)] text-[var(--cityscape-accent-foreground)] text-xs sm:text-sm font-medium rounded-sm self-start sm:self-auto whitespace-nowrap">
              Required Action
            </span>
            <div className="text-xs sm:text-sm text-[var(--text-secondary)] whitespace-nowrap">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Height */}
      <div className="flex-1 flex items-center p-4 sm:p-6 w-full overflow-hidden">
        <div className="w-full h-full max-w-6xl mx-auto px-2 sm:px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-4 h-full max-w-full">
            {/* Main Form - Takes up 2 columns on lg, 3 columns on xl, full width on smaller screens */}
            <div className="lg:col-span-2 xl:col-span-3 flex flex-col min-w-0 overflow-hidden">
              <Card className="bg-[var(--card)] border border-[var(--border)] shadow-lg rounded-sm overflow-hidden flex-1 flex flex-col min-w-0">
                <CardHeader className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 bg-gradient-to-r from-[var(--muted)] to-[var(--card)]">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] rounded-sm flex items-center justify-center self-start sm:self-auto">
                      <Lock className="h-6 w-6 sm:h-8 sm:w-8 text-[var(--cityscape-accent-foreground)]" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
                        Change Your Password
                      </CardTitle>
                      <CardDescription className="text-[var(--text-secondary)] mt-2 text-sm sm:text-base">
                        For security reasons, you must update your password before continuing
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 flex flex-col">
                  {/* General Error Alert */}
                  {errors.general && (
                    <Alert
                      variant="destructive"
                      className="mb-6 sm:mb-8 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{errors.general}</AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 flex-1 flex flex-col">
                    {/* Current Password */}
                    <div className="space-y-3">
                      <Label htmlFor="current_password" className="text-base font-medium text-[var(--foreground)]">
                        Current Password
                      </Label>
                      <div className="relative">
                                                   <Input
                             id="current_password"
                             type={showCurrentPassword ? "text" : "password"}
                             value={formData.current_password}
                             onChange={(e) => handleInputChange("current_password", e.target.value)}
                             placeholder="Enter your current password"
                             className={cn(
                               "h-14 px-4 pr-12 text-base border rounded-sm transition-all duration-200",
                               errors.current_password
                                 ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20 focus:border-red-500 focus:ring-red-500/20"
                                 : "border-[var(--border)] focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20"
                             )}
                             disabled={changePasswordMutation.isPending}
                           />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 w-14 flex items-center justify-center hover:bg-[var(--hover)] rounded-r-sm transition-colors"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-5 w-5 text-[var(--text-muted)] hover:text-[var(--foreground)]" />
                          ) : (
                            <Eye className="h-5 w-5 text-[var(--text-muted)] hover:text-[var(--foreground)]" />
                          )}
                        </button>
                      </div>
                      {errors.current_password && (
                        <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          {errors.current_password}
                        </p>
                      )}
                    </div>

                    {/* New Password */}
                    <div className="space-y-3">
                      <Label htmlFor="new_password" className="text-base font-medium text-[var(--foreground)]">
                        New Password
                      </Label>
                      <div className="relative">
                                                   <Input
                             id="new_password"
                             type={showNewPassword ? "text" : "password"}
                             value={formData.new_password}
                             onChange={(e) => handleInputChange("new_password", e.target.value)}
                             placeholder="Enter your new password"
                             className={cn(
                               "h-14 px-4 pr-12 text-base border rounded-sm transition-all duration-200",
                               errors.new_password
                                 ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20 focus:border-red-500 focus:ring-red-500/20"
                                 : "border-[var(--border)] focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20"
                             )}
                             disabled={changePasswordMutation.isPending}
                           />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 w-14 flex items-center justify-center hover:bg-[var(--hover)] rounded-r-sm transition-colors"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-5 w-5 text-[var(--text-muted)] hover:text-[var(--foreground)]" />
                          ) : (
                            <Eye className="h-5 w-5 text-[var(--text-muted)] hover:text-[var(--foreground)]" />
                          )}
                        </button>
                      </div>
                      {errors.new_password && (
                        <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          {errors.new_password}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 text-sm text-[var(--text-secondary)]">
                        <CheckCircle className="h-4 w-4" />
                        <span>Password must be at least 8 characters long</span>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-3">
                      <Label htmlFor="confirm_password" className="text-base font-medium text-[var(--foreground)]">
                        Confirm New Password
                      </Label>
                      <div className="relative">
                                                   <Input
                             id="confirm_password"
                             type={showConfirmPassword ? "text" : "password"}
                             value={formData.confirm_password}
                             onChange={(e) => handleInputChange("confirm_password", e.target.value)}
                             placeholder="Confirm your new password"
                             className={cn(
                               "h-14 px-4 pr-12 text-base border rounded-sm transition-all duration-200",
                               errors.confirm_password
                                 ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20 focus:border-red-500 focus:ring-red-500/20"
                                 : "border-[var(--border)] focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20"
                             )}
                             disabled={changePasswordMutation.isPending}
                           />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 w-14 flex items-center justify-center hover:bg-[var(--hover)] rounded-r-sm transition-colors"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5 text-[var(--text-muted)] hover:text-[var(--foreground)]" />
                          ) : (
                            <Eye className="h-5 w-5 text-[var(--text-muted)] hover:text-[var(--foreground)]" />
                          )}
                        </button>
                      </div>
                      {errors.confirm_password && (
                        <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          {errors.confirm_password}
                        </p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 sm:pt-6 mt-auto">
                                               <Button
                           type="submit"
                           className="w-full h-12 sm:h-14 bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] hover:from-[var(--cityscape-yellow-dark)] hover:to-[var(--cityscape-yellow-darker)] text-[var(--cityscape-accent-foreground)] font-semibold text-sm sm:text-base rounded-sm shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2 sm:space-x-3"
                           disabled={changePasswordMutation.isPending}
                         >
                        {changePasswordMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-2 border-white border-t-transparent"></div>
                            <span>Updating Password...</span>
                          </>
                        ) : (
                          <>
                            <span>Update Password</span>
                            <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar - Takes up 1 column on lg, 2 columns on xl, full width on smaller screens */}
            <div className="lg:col-span-1 xl:col-span-2 flex flex-col space-y-4 sm:space-y-6 min-w-0 overflow-hidden max-w-full">
              {/* Security Status Card */}
              <Card className="bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-sm overflow-hidden">
                <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-[var(--muted)] to-[var(--card)]">
                  <CardTitle className="text-base sm:text-lg font-semibold text-[var(--foreground)] flex items-center">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-[var(--cityscape-yellow)]" />
                    Security Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 py-4 sm:py-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Password Status</span>
                      <span className="px-3 py-1 bg-[var(--cityscape-yellow)] text-[var(--cityscape-accent-foreground)] text-xs font-medium rounded-sm">
                        Requires Update
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Last Updated</span>
                      <span className="text-sm text-[var(--foreground)]">Never</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Account Status</span>
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-medium rounded-sm">
                        Active
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Tips Card */}
              <Card className="bg-gradient-to-br from-[var(--muted)] to-[var(--card)] border border-[var(--border)] shadow-sm rounded-sm overflow-hidden">
                <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
                  <CardTitle className="text-base sm:text-lg font-semibold text-[var(--foreground)] flex items-center">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-[var(--cityscape-yellow)]" />
                    Security Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 py-4 sm:py-6">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[var(--cityscape-yellow)] rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-[var(--foreground)]">
                        Use a combination of letters, numbers, and symbols
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[var(--cityscape-yellow)] rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-[var(--foreground)]">
                        Avoid using personal information like birthdays
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[var(--cityscape-yellow)] rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-[var(--foreground)]">
                        Make it at least 8 characters long
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[var(--cityscape-yellow)] rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-[var(--foreground)]">
                        Don&apos;t reuse passwords from other accounts
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User Info Card */}
              <Card className="bg-[var(--card)] border border-[var(--border)] shadow-sm rounded-sm overflow-hidden flex-1">
                <CardContent className="px-4 sm:px-6 py-4 sm:py-6">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] rounded-sm flex items-center justify-center">
                      <span className="text-[var(--cityscape-accent-foreground)] text-base sm:text-lg font-bold">
                        {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--foreground)] text-sm sm:text-base">
                        {user?.name || "User"}
                      </p>
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                        {user?.role || "User"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
