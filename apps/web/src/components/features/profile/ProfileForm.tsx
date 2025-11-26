'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { usePostAuthChangePassword, usePostAuthLogout } from '@sinag/shared';
import { useUserBarangay } from '@/hooks/useUserBarangay';
import { useAssessorGovernanceArea } from '@/hooks/useAssessorGovernanceArea';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { User, Mail, MapPin, Shield, Info, Lock, Key, CheckCircle, Save, Phone } from 'lucide-react';
import { User as UserType } from '@sinag/shared';

// Password change form schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordChangeForm = z.infer<typeof passwordChangeSchema>;

interface ProfileFormProps {
  user: UserType | null;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const { barangayName, isLoading: barangayLoading } = useUserBarangay();
  const { governanceAreaName, isLoading: governanceAreaLoading } = useAssessorGovernanceArea();
  
  const changePasswordMutation = usePostAuthChangePassword();
  const logoutMutation = usePostAuthLogout();

  const form = useForm<PasswordChangeForm>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
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

      toast.success('Your password has been updated successfully.');
      
      // Show logout dialog to inform user they will be logged out
      setShowLogoutDialog(true);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'status' in error.response && error.response.status === 401) {
        form.setError('currentPassword', {
          type: 'manual',
          message: 'The current password you entered is incorrect.',
        });
      } else {
        toast.error('Failed to update password. Please try again.');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      logout();
      router.push('/login');
    } catch {
      // Even if logout API fails, we should still clear local state
      logout();
      router.push('/login');
    }
  };

  // Password strength checker
  const newPassword = form.watch('newPassword');
  const passwordRequirements = {
    length: newPassword.length >= 8,
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
  };

  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);
    return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-stretch">
      {/* User Details Section - Enhanced */}
      <div className="xl:col-span-2">
        <Card className="relative overflow-hidden bg-[var(--card)] border border-[var(--border)] shadow-lg hover:shadow-xl transition-all duration-300 h-full">
          
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="text-xl font-semibold text-[var(--foreground)]">User Details</CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              Your account information and assigned role details
            </CardDescription>
          </CardHeader>
          
          <CardContent className="relative z-10 flex flex-col h-full">
            <div className="space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div className="space-y-3">
                   <label className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                     <User className="h-4 w-4 text-[var(--cityscape-yellow)]" />
                     Full Name
                   </label>
                   <div className="bg-[var(--hover)] backdrop-blur-sm rounded-sm p-4 border border-[var(--border)]">
                     <div className="text-base font-medium text-[var(--text-secondary)]">
                       {user?.name || 'N/A'}
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
                       {user?.email || 'N/A'}
                     </div>
                   </div>
                 </div>
                 
                 {user?.role !== 'MLGOO_DILG' && user?.role !== 'ASSESSOR' && (
                   <div className="space-y-3">
                     <label className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                       <MapPin className="h-4 w-4 text-[var(--cityscape-yellow)]" />
                       Assigned Barangay
                     </label>
                     <div className="bg-[var(--hover)] backdrop-blur-sm rounded-sm p-4 border border-[var(--border)]">
                       <div className="text-base font-medium text-[var(--text-secondary)]">
                         {barangayLoading ? 'Loading...' : barangayName || 'N/A'}
                       </div>
                     </div>
                   </div>
                 )}
                 
                 {user?.role === 'ASSESSOR' && (
                   <div className="space-y-3">
                     <label className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                       <MapPin className="h-4 w-4 text-[var(--cityscape-yellow)]" />
                       Assigned Governance Area
                     </label>
                     <div className="bg-[var(--hover)] backdrop-blur-sm rounded-sm p-4 border border-[var(--border)]">
                       <div className="text-base font-medium text-[var(--text-secondary)]">
                         {governanceAreaLoading ? 'Loading...' : governanceAreaName || 'N/A'}
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
                       {user?.phone_number || 'N/A'}
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
                       {user?.role === 'ASSESSOR' ? 'Area Assessor' : user?.role ? user.role.replace(/_/g, ' ') : 'N/A'}
                     </div>
                   </div>
                 </div>
              </div>
            </div>
            
            <Alert className="bg-[var(--cityscape-yellow)]/10 border-[var(--cityscape-yellow)]/20 backdrop-blur-sm mt-6">
              <Info className="h-4 w-4 text-[var(--cityscape-yellow)]" />
              <AlertDescription className="text-sm text-[var(--foreground)]">
                Your user details are managed by the administrator. To request a change, please contact your MLGOO-DILG.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Password Change Section - Enhanced */}
      <div className="space-y-6">
                 <Card className="relative overflow-hidden bg-[var(--card)] border border-[var(--border)] shadow-lg hover:shadow-xl transition-all duration-300">
          
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="text-lg font-semibold text-[var(--foreground)]">Change Password</CardTitle>
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
                      <FormLabel className="text-sm font-semibold text-[var(--foreground)]">Current Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="password"
                            placeholder="Enter your current password"
                            className="bg-[var(--card)] backdrop-blur-sm border-[var(--border)] rounded-sm"
                            {...field}
                          />
                          <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
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
                      <FormLabel className="text-sm font-semibold text-[var(--foreground)]">New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="password"
                            placeholder="Enter your new password"
                            className="bg-[var(--card)] backdrop-blur-sm border-[var(--border)] rounded-sm"
                            {...field}
                          />
                          <Key className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
                        </div>
                      </FormControl>
                      <FormMessage />
                      
                      {/* Enhanced Password Requirements */}
                      {newPassword && (
                        <div className="mt-3 bg-[var(--hover)] backdrop-blur-sm rounded-sm p-3 border border-[var(--border)]">
                          <p className="text-xs font-semibold text-[var(--foreground)] mb-2">Password Requirements:</p>
                          <div className="space-y-2">
                            <div className={`flex items-center gap-2 text-xs ${passwordRequirements.length ? 'text-green-600' : 'text-red-500'}`}>
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs ${passwordRequirements.length ? 'bg-green-500' : 'bg-red-500'}`}>
                                {passwordRequirements.length ? '✓' : '✗'}
                              </div>
                              <span>At least 8 characters</span>
                            </div>
                            <div className={`flex items-center gap-2 text-xs ${passwordRequirements.number ? 'text-green-600' : 'text-red-500'}`}>
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs ${passwordRequirements.number ? 'bg-green-500' : 'bg-red-500'}`}>
                                {passwordRequirements.number ? '✓' : '✗'}
                              </div>
                              <span>At least one number (0-9)</span>
                            </div>
                            <div className={`flex items-center gap-2 text-xs ${passwordRequirements.special ? 'text-green-600' : 'text-red-500'}`}>
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs ${passwordRequirements.special ? 'bg-green-500' : 'bg-red-500'}`}>
                                {passwordRequirements.special ? '✓' : '✗'}
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
                      <FormLabel className="text-sm font-semibold text-[var(--foreground)]">Confirm New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="password"
                            placeholder="Confirm your new password"
                            className="bg-[var(--card)] backdrop-blur-sm border-[var(--border)] rounded-sm"
                            {...field}
                          />
                          <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={!allRequirementsMet || changePasswordMutation.isPending}
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
                <AlertDialogTitle className="text-xl font-semibold text-[var(--foreground)]">Password Updated Successfully</AlertDialogTitle>
              </div>
            </div>
            <AlertDialogDescription className="text-[var(--text-secondary)] leading-relaxed">
              For security reasons, you will be logged out and redirected to the login page. 
              Please log in again with your new password.
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