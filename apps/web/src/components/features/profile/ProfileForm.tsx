"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import {
  usePostAuthChangePassword,
  usePostAuthLogout,
  usePostUsersMeLogo,
  useDeleteUsersMeLogo,
  getGetUsersMeQueryKey,
} from "@sinag/shared";
import { useUserBarangay } from "@/hooks/useUserBarangay";
import { useAssessorGovernanceArea } from "@/hooks/useAssessorGovernanceArea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  User,
  Mail,
  MapPin,
  Shield,
  Info,
  Lock,
  Key,
  CheckCircle,
  Save,
  Phone,
  Eye,
  EyeOff,
  ImageIcon,
} from "lucide-react";
import { User as UserType } from "@sinag/shared";
import { classifyError } from "@/lib/error-utils";
import { AvatarUpload } from "@/components/shared";

// Password change form schema
const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\;'`~]/,
        "Password must contain at least one special character"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

type PasswordChangeForm = z.infer<typeof passwordChangeSchema>;

interface ProfileFormProps {
  user: UserType | null;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { logout, setUser } = useAuthStore();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPasswords, setShowNewPasswords] = useState(false); // Linked toggle for new + confirm
  const [logoError, setLogoError] = useState<string | null>(null);
  const { barangayName, isLoading: barangayLoading } = useUserBarangay();
  const { governanceAreaName, isLoading: governanceAreaLoading } = useAssessorGovernanceArea();

  const changePasswordMutation = usePostAuthChangePassword();
  const logoutMutation = usePostAuthLogout();

  // Logo upload/delete mutations
  const uploadLogoMutation = usePostUsersMeLogo();
  const deleteLogoMutation = useDeleteUsersMeLogo();

  const handleLogoUpload = async (file: File) => {
    setLogoError(null);
    try {
      const updatedUser = await uploadLogoMutation.mutateAsync({
        data: { file },
      });
      // Update auth store with the new user data (includes logo_url)
      setUser(updatedUser);
      // Invalidate user query to refresh the logo in other components
      queryClient.invalidateQueries({ queryKey: getGetUsersMeQueryKey() });
      toast.success("Profile logo updated successfully");
    } catch (error: unknown) {
      const errorInfo = classifyError(error);
      setLogoError(errorInfo.message);
      toast.error(`Failed to upload logo: ${errorInfo.message}`);
    }
  };

  const handleLogoRemove = async () => {
    setLogoError(null);
    try {
      const updatedUser = await deleteLogoMutation.mutateAsync();
      // Update auth store with the new user data (logo_url will be null)
      setUser(updatedUser);
      // Invalidate user query to refresh the logo in other components
      queryClient.invalidateQueries({ queryKey: getGetUsersMeQueryKey() });
      toast.success("Profile logo removed");
    } catch (error: unknown) {
      const errorInfo = classifyError(error);
      setLogoError(errorInfo.message);
      toast.error(`Failed to remove logo: ${errorInfo.message}`);
    }
  };

  const form = useForm<PasswordChangeForm>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: PasswordChangeForm) => {
    try {
      await changePasswordMutation.mutateAsync({
        data: {
          current_password: data.currentPassword,
          new_password: data.newPassword,
        },
      });

      toast.success("Your password has been updated successfully.");

      // Show logout dialog to inform user they will be logged out
      setShowLogoutDialog(true);
    } catch (error: unknown) {
      // Check for the specific "incorrect current password" error from backend (returns 400)
      if (
        isAxiosError<{ detail?: string }>(error) &&
        error.response?.status === 400 &&
        error.response?.data?.detail === "Incorrect current password"
      ) {
        form.setError("currentPassword", {
          type: "manual",
          message: "The current password you entered is incorrect.",
        });
        return;
      }

      // For other errors, show a toast with detailed error info
      const errorInfo = classifyError(error);
      toast.error(`${errorInfo.title}: ${errorInfo.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      logout();
      router.push("/login");
    } catch {
      // Even if logout API fails, we should still clear local state
      logout();
      router.push("/login");
    }
  };

  // Password strength checker
  const newPassword = form.watch("newPassword");
  const confirmPassword = form.watch("confirmPassword");
  const passwordRequirements = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\;'`~]/.test(newPassword),
  };

  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-stretch">
      {/* User Details Section - Enhanced */}
      <div className="xl:col-span-2">
        <Card className="relative overflow-hidden bg-[var(--card)] border border-[var(--border)] shadow-lg hover:shadow-xl transition-all duration-300 h-full">
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="text-xl font-semibold text-[var(--foreground)]">
              User Details
            </CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              Your account information and assigned role details
            </CardDescription>
          </CardHeader>

          <CardContent className="relative z-10 flex flex-col h-full">
            <div className="space-y-6 flex-1">
              {/* Profile Logo Section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-[var(--border)]">
                <AvatarUpload
                  currentImageUrl={user?.logo_url}
                  onUpload={handleLogoUpload}
                  onRemove={user?.logo_url ? handleLogoRemove : undefined}
                  isUploading={uploadLogoMutation.isPending || deleteLogoMutation.isPending}
                  error={logoError}
                  size="lg"
                  fallbackInitials={user?.name?.slice(0, 2).toUpperCase()}
                />
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-[var(--cityscape-yellow)]" />
                    Profile Logo
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] max-w-xs">
                    Upload your organization logo or profile picture. This will be displayed in the
                    navigation header.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                    <User className="h-4 w-4 text-[var(--cityscape-yellow)]" />
                    Full Name
                  </label>
                  <div className="bg-[var(--hover)] backdrop-blur-sm rounded-sm p-4 border border-[var(--border)]">
                    <div className="text-base font-medium text-[var(--text-secondary)]">
                      {user?.name || "N/A"}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[var(--cityscape-yellow)]" />
                    Email Address (Login ID)
                  </label>
                  <div className="bg-[var(--hover)] backdrop-blur-sm rounded-sm p-4 border border-[var(--border)]">
                    <div className="text-base font-medium text-[var(--text-secondary)]">
                      {user?.email || "N/A"}
                    </div>
                  </div>
                </div>

                {user?.role !== "MLGOO_DILG" && user?.role !== "ASSESSOR" && (
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[var(--cityscape-yellow)]" />
                      Assigned Barangay
                    </label>
                    <div className="bg-[var(--hover)] backdrop-blur-sm rounded-sm p-4 border border-[var(--border)]">
                      <div className="text-base font-medium text-[var(--text-secondary)]">
                        {barangayLoading ? "Loading..." : barangayName || "N/A"}
                      </div>
                    </div>
                  </div>
                )}

                {user?.role === "ASSESSOR" && (
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[var(--cityscape-yellow)]" />
                      Assigned Governance Area
                    </label>
                    <div className="bg-[var(--hover)] backdrop-blur-sm rounded-sm p-4 border border-[var(--border)]">
                      <div className="text-base font-medium text-[var(--text-secondary)]">
                        {governanceAreaLoading ? "Loading..." : governanceAreaName || "N/A"}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[var(--cityscape-yellow)]" />
                    Mobile Number
                  </label>
                  <div className="bg-[var(--hover)] backdrop-blur-sm rounded-sm p-4 border border-[var(--border)]">
                    <div className="text-base font-medium text-[var(--text-secondary)]">
                      {user?.phone_number || "N/A"}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[var(--cityscape-yellow)]" />
                    Role
                  </label>
                  <div className="bg-[var(--hover)] backdrop-blur-sm rounded-sm p-4 border border-[var(--border)]">
                    <div className="text-base font-medium text-[var(--text-secondary)]">
                      {user?.role === "ASSESSOR"
                        ? "Area Assessor"
                        : user?.role
                          ? user.role.replace(/_/g, " ")
                          : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {user?.role !== "MLGOO_DILG" && (
              <Alert className="bg-[var(--cityscape-yellow)]/10 border-[var(--cityscape-yellow)]/20 backdrop-blur-sm mt-6">
                <Info className="h-4 w-4 text-[var(--cityscape-yellow)]" />
                <AlertDescription className="text-sm text-[var(--foreground)]">
                  Your user details are managed by the administrator. To request a change, please
                  contact your MLGOO-DILG.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Password Change Section - Enhanced */}
      <div className="space-y-6">
        <Card className="relative overflow-hidden bg-[var(--card)] border border-[var(--border)] shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="text-lg font-semibold text-[var(--foreground)]">
              Change Password
            </CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>

          <CardContent className="relative z-10">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-[var(--foreground)]">
                        Current Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="Enter your current password"
                            className="bg-[var(--card)] backdrop-blur-sm border-[var(--border)] rounded-sm pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-[var(--foreground)]">
                        New Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showNewPasswords ? "text" : "password"}
                            placeholder="Enter your new password"
                            className="bg-[var(--card)] backdrop-blur-sm border-[var(--border)] rounded-sm pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPasswords(!showNewPasswords)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
                          >
                            {showNewPasswords ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />

                      {/* Enhanced Password Requirements */}
                      {newPassword && (
                        <div className="mt-3 bg-[var(--hover)] backdrop-blur-sm rounded-sm p-3 border border-[var(--border)]">
                          <p className="text-xs font-semibold text-[var(--foreground)] mb-2">
                            Password Requirements:
                          </p>
                          <div className="space-y-2">
                            <div
                              className={`flex items-center gap-2 text-xs ${passwordRequirements.length ? "text-green-600" : "text-red-500"}`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs ${passwordRequirements.length ? "bg-green-500" : "bg-red-500"}`}
                              >
                                {passwordRequirements.length ? "✓" : "✗"}
                              </div>
                              <span>At least 8 characters</span>
                            </div>
                            <div
                              className={`flex items-center gap-2 text-xs ${passwordRequirements.uppercase ? "text-green-600" : "text-red-500"}`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs ${passwordRequirements.uppercase ? "bg-green-500" : "bg-red-500"}`}
                              >
                                {passwordRequirements.uppercase ? "✓" : "✗"}
                              </div>
                              <span>At least one uppercase letter (A-Z)</span>
                            </div>
                            <div
                              className={`flex items-center gap-2 text-xs ${passwordRequirements.lowercase ? "text-green-600" : "text-red-500"}`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs ${passwordRequirements.lowercase ? "bg-green-500" : "bg-red-500"}`}
                              >
                                {passwordRequirements.lowercase ? "✓" : "✗"}
                              </div>
                              <span>At least one lowercase letter (a-z)</span>
                            </div>
                            <div
                              className={`flex items-center gap-2 text-xs ${passwordRequirements.number ? "text-green-600" : "text-red-500"}`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs ${passwordRequirements.number ? "bg-green-500" : "bg-red-500"}`}
                              >
                                {passwordRequirements.number ? "✓" : "✗"}
                              </div>
                              <span>At least one number (0-9)</span>
                            </div>
                            <div
                              className={`flex items-center gap-2 text-xs ${passwordRequirements.special ? "text-green-600" : "text-red-500"}`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs ${passwordRequirements.special ? "bg-green-500" : "bg-red-500"}`}
                              >
                                {passwordRequirements.special ? "✓" : "✗"}
                              </div>
                              <span>At least one special character</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-[var(--foreground)]">
                        Confirm New Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showNewPasswords ? "text" : "password"}
                            placeholder="Confirm your new password"
                            className={`bg-[var(--card)] backdrop-blur-sm border-[var(--border)] rounded-sm pr-10 ${
                              confirmPassword
                                ? passwordsMatch
                                  ? "border-green-500 focus-visible:ring-green-500"
                                  : "border-red-500 focus-visible:ring-red-500"
                                : ""
                            }`}
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPasswords(!showNewPasswords)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
                          >
                            {showNewPasswords ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      {/* Password match indicator */}
                      {confirmPassword && (
                        <div
                          className={`flex items-center gap-2 text-xs mt-2 ${
                            passwordsMatch ? "text-green-600" : "text-red-500"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs ${
                              passwordsMatch ? "bg-green-500" : "bg-red-500"
                            }`}
                          >
                            {passwordsMatch ? "✓" : "✗"}
                          </div>
                          <span>
                            {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                          </span>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={
                      !allRequirementsMet || !passwordsMatch || changePasswordMutation.isPending
                    }
                    className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] hover:from-[var(--cityscape-yellow-dark)] hover:to-[var(--cityscape-yellow)] text-[var(--cityscape-accent-foreground)] rounded-sm shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating Password...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Logout Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="bg-[var(--card)] border border-[var(--border)] shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-[var(--cityscape-yellow)]/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-[var(--cityscape-yellow)]" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-semibold text-[var(--foreground)]">
                  Password Updated Successfully
                </AlertDialogTitle>
              </div>
            </div>
            <AlertDialogDescription className="text-[var(--text-secondary)] leading-relaxed">
              For security reasons, you will be logged out and redirected to the login page. Please
              log in again with your new password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] hover:from-[var(--cityscape-yellow-dark)] hover:to-[var(--cityscape-yellow)] text-[var(--cityscape-accent-foreground)] rounded-sm"
            >
              Continue to Login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
