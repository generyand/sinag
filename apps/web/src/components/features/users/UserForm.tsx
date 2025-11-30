import * as React from 'react';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGovernanceAreas } from '@/hooks/useGovernanceAreas';
import { useBarangays } from '@/hooks/useBarangays';
import { useToast } from '@/hooks/use-toast';
import { UserRole, UserAdminCreate, UserAdminUpdate, Barangay, GovernanceArea, UserRoleOption } from '@sinag/shared';
import { usePostUsers, usePutUsersUserId, getGetUsersQueryKey } from '@sinag/shared/src/generated/endpoints/users';
import { useGetLookupsRoles } from '@sinag/shared/src/generated/endpoints/lookups';
import { useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: {
    id?: number;
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
    phone_number?: string;
    validator_area_id?: number;
    barangay_id?: number;
    is_active?: boolean;
    is_superuser?: boolean;
    must_change_password?: boolean;
  };
  isEditing?: boolean;
}

// Helper function to extract error message from API response
function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    // Try to get the detail from the response
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') {
      return detail;
    }
    // Handle validation errors (array of objects)
    if (Array.isArray(detail)) {
      return detail.map((err: { msg?: string }) => err.msg || 'Validation error').join(', ');
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

export function UserForm({ open, onOpenChange, initialValues, isEditing = false }: UserFormProps) {
  // Use refs for text inputs to avoid re-renders on every keystroke
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  // Only use state for select values and checkboxes that need to control visibility
  const [role, setRole] = useState<UserRole>(UserRole.BLGU_USER);
  const [validatorAreaId, setValidatorAreaId] = useState<number | null>(null);
  const [barangayId, setBarangayId] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  // Fetch governance areas, barangays, and roles data
  const { data: governanceAreas, isLoading: isLoadingGovernanceAreas } = useGovernanceAreas();
  const { data: barangays, isLoading: isLoadingBarangays } = useBarangays();
  const { data: roles, isLoading: isLoadingRoles } = useGetLookupsRoles();

  // Type assertions for the data
  const typedGovernanceAreas = governanceAreas as GovernanceArea[] | undefined;
  const typedBarangays = barangays as Barangay[] | undefined;
  const typedRoles = roles as UserRoleOption[] | undefined;

  // Memoize the barangay options to prevent re-rendering on every form state change
  const barangayOptions = useMemo(() => {
    if (isLoadingBarangays) return null;
    if (!typedBarangays) return null;
    return typedBarangays.map((barangay: Barangay) => (
      <SelectItem key={barangay.id} value={barangay.id.toString()}>
        {barangay.name}
      </SelectItem>
    ));
  }, [typedBarangays, isLoadingBarangays]);

  // Memoize the governance area options to prevent re-rendering on every form state change
  const governanceAreaOptions = useMemo(() => {
    if (isLoadingGovernanceAreas) return null;
    if (!typedGovernanceAreas) return null;
    return typedGovernanceAreas.map((area: GovernanceArea) => (
      <SelectItem key={area.id} value={area.id.toString()}>
        {area.name} ({area.area_type})
      </SelectItem>
    ));
  }, [typedGovernanceAreas, isLoadingGovernanceAreas]);

  // Memoize the role options to prevent re-rendering on every form state change
  const roleOptions = useMemo(() => {
    if (isLoadingRoles) return null;
    if (!typedRoles) return null;
    return typedRoles.map((roleOption: UserRoleOption) => (
      <SelectItem key={roleOption.value} value={roleOption.value}>
        {roleOption.label}
      </SelectItem>
    ));
  }, [typedRoles, isLoadingRoles]);

  // Auto-generated mutation hooks
  const queryClient = useQueryClient();
  const createUserMutation = usePostUsers();
  const updateUserMutation = usePutUsersUserId();

  // Reset form when dialog opens/closes or initialValues change
  useEffect(() => {
    if (open) {
      if (initialValues) {
        // For editing, populate form with existing values
        if (nameRef.current) nameRef.current.value = initialValues.name || '';
        if (emailRef.current) emailRef.current.value = initialValues.email || '';
        if (passwordRef.current) passwordRef.current.value = '';
        if (phoneRef.current) phoneRef.current.value = initialValues.phone_number || '';
        setRole(initialValues.role || UserRole.BLGU_USER);
        setValidatorAreaId(initialValues.validator_area_id || null);
        setBarangayId(initialValues.barangay_id || null);
        setIsActive(initialValues.is_active ?? true);
        setIsSuperuser(initialValues.is_superuser ?? false);
        setMustChangePassword(initialValues.must_change_password ?? true);
      } else {
        // For creating new user, reset to empty form
        if (nameRef.current) nameRef.current.value = '';
        if (emailRef.current) emailRef.current.value = '';
        if (passwordRef.current) passwordRef.current.value = '';
        if (phoneRef.current) phoneRef.current.value = '';
        setRole(UserRole.BLGU_USER);
        setValidatorAreaId(null);
        setBarangayId(null);
        setIsActive(true);
        setIsSuperuser(false);
        setMustChangePassword(true);
      }
      setErrors({});
    }
  }, [open, initialValues]);

  const handleRoleChange = useCallback((newRole: string) => {
    const typedRole = newRole as UserRole;
    setRole(typedRole);
    // Clear area assignments when role changes
    if (typedRole !== UserRole.VALIDATOR) {
      setValidatorAreaId(null);
    }
    if (typedRole !== UserRole.BLGU_USER) {
      setBarangayId(null);
    }
  }, []);

  const handleSelectChange = useCallback((name: string, value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10);
    if (name === 'barangay_id') {
      setBarangayId(numValue);
    } else if (name === 'validator_area_id') {
      setValidatorAreaId(numValue);
    }
  }, []);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    const name = nameRef.current?.value || '';
    const email = emailRef.current?.value || '';
    const password = passwordRef.current?.value || '';

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!isEditing && !password.trim()) {
      newErrors.password = 'Password is required';
    } else if (!isEditing && password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Role-based validation
    if (role === UserRole.VALIDATOR && !validatorAreaId) {
      newErrors.validator_area_id = 'Governance area is required for Validator role';
    }

    if (role === UserRole.BLGU_USER && !barangayId) {
      newErrors.barangay_id = 'Barangay is required for BLGU User role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [isEditing, role, validatorAreaId, barangayId]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const name = nameRef.current?.value || '';
    const email = emailRef.current?.value || '';
    const password = passwordRef.current?.value || '';
    const phone_number = phoneRef.current?.value || '';

    if (isEditing && initialValues?.id) {
      // For editing, exclude password if not provided
      const updateData: UserAdminUpdate = {
        name: name || null,
        email: email || null,
        role: role,
        phone_number: phone_number || null,
        validator_area_id: validatorAreaId,
        barangay_id: barangayId,
        is_active: isActive,
        is_superuser: isSuperuser,
        must_change_password: mustChangePassword,
      };

      updateUserMutation.mutate(
        { userId: initialValues.id, data: updateData },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
            toast({
              title: 'User Updated',
              description: `Successfully updated ${name}'s account.`,
            });
            onOpenChange(false);
          },
          onError: (error) => {
            const errorMessage = getErrorMessage(error);
            toast({
              title: 'Update Failed',
              description: errorMessage,
              variant: 'destructive',
            });
          },
        }
      );
    } else {
      // For creating, include password
      const createData: UserAdminCreate = {
        name: name,
        email: email,
        password: password,
        role: role,
        phone_number: phone_number || null,
        validator_area_id: validatorAreaId,
        barangay_id: barangayId,
        is_active: isActive,
        is_superuser: isSuperuser,
        must_change_password: mustChangePassword,
      };

      createUserMutation.mutate(
        { data: createData },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
            toast({
              title: 'User Created',
              description: `Successfully created account for ${name}.`,
            });
            onOpenChange(false);
          },
          onError: (error) => {
            const errorMessage = getErrorMessage(error);
            toast({
              title: 'Creation Failed',
              description: errorMessage,
              variant: 'destructive',
            });
          },
        }
      );
    }
  }, [
    validateForm, isEditing, initialValues, role, validatorAreaId, barangayId,
    isActive, isSuperuser, mustChangePassword, updateUserMutation, createUserMutation,
    queryClient, toast, onOpenChange
  ]);

  const isLoading = createUserMutation.isPending || updateUserMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[var(--card)] border border-[var(--border)] shadow-lg rounded-sm" key={isEditing ? 'edit' : 'create'}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[var(--foreground)]">
            {isEditing ? 'Edit User' : 'Add User'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-[var(--foreground)]">Name *</Label>
              <Input
                ref={nameRef}
                id="name"
                name="name"
                defaultValue={initialValues?.name || ''}
                required
                disabled={isLoading}
                className={`mt-1 border-[var(--border)] focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20 ${errors.name ? 'border-red-500 dark:border-red-700 focus:border-red-500 focus:ring-red-500/20' : ''}`}
              />
              {errors.name && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium text-[var(--foreground)]">Email *</Label>
              <Input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                defaultValue={initialValues?.email || ''}
                required
                disabled={isLoading}
                autoComplete="off"
                className={`mt-1 border-[var(--border)] focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20 ${errors.email ? 'border-red-500 dark:border-red-700 focus:border-red-500 focus:ring-red-500/20' : ''}`}
              />
              {errors.email && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.email}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isEditing && (
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-[var(--foreground)]">Password *</Label>
                <div className="relative mt-1">
                  <Input
                    ref={passwordRef}
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    defaultValue=""
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                    className={`pr-10 border-[var(--border)] focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20 ${errors.password ? 'border-red-500 dark:border-red-700 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.password}</p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="role" className="text-sm font-medium text-[var(--foreground)]">Role</Label>
              <Select value={role} onValueChange={handleRoleChange} disabled={isLoading || isLoadingRoles}>
                <SelectTrigger className="mt-1 border-[var(--border)] focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--card)] border border-[var(--border)]">
                  {isLoadingRoles ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : roleOptions ? (
                    roleOptions
                  ) : (
                    <SelectItem value="no-data" disabled>No roles available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone_number" className="text-sm font-medium text-[var(--foreground)]">Phone Number</Label>
              <Input
                ref={phoneRef}
                id="phone_number"
                name="phone_number"
                defaultValue={initialValues?.phone_number || ''}
                disabled={isLoading}
                className="mt-1 border-[var(--border)] focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20"
              />
            </div>

            {/* Conditional dropdown for BLGU User role */}
            {role === UserRole.BLGU_USER && (
              <div>
                <Label htmlFor="barangay_id" className="text-sm font-medium text-[var(--foreground)]">Assigned Barangay *</Label>
                <Select
                  value={barangayId?.toString() || ''}
                  onValueChange={(value) => handleSelectChange('barangay_id', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className={`mt-1 border-[var(--border)] focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20 ${errors.barangay_id ? 'border-red-500 dark:border-red-700' : ''}`}>
                    <SelectValue placeholder="Select a barangay" />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--card)] border border-[var(--border)]">
                    {isLoadingBarangays ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : barangayOptions ? (
                      barangayOptions
                    ) : (
                      <SelectItem value="no-data" disabled>No barangays available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {errors.barangay_id && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.barangay_id}</p>
                )}
              </div>
            )}

            {/* Conditional dropdown for Validator role */}
            {role === UserRole.VALIDATOR && (
              <div>
                <Label htmlFor="validator_area_id" className="text-sm font-medium text-[var(--foreground)]">Assigned Governance Area *</Label>
                <Select
                  value={validatorAreaId?.toString() || ''}
                  onValueChange={(value) => handleSelectChange('validator_area_id', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className={`mt-1 border-[var(--border)] focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20 ${errors.validator_area_id ? 'border-red-500 dark:border-red-700' : ''}`}>
                    <SelectValue placeholder="Select a governance area" />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--card)] border border-[var(--border)]">
                    {isLoadingGovernanceAreas ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : governanceAreaOptions ? (
                      governanceAreaOptions
                    ) : (
                      <SelectItem value="no-data" disabled>No governance areas available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {errors.validator_area_id && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.validator_area_id}</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[var(--foreground)]">User Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isLoading}
                  className="rounded border-[var(--border)] h-4 w-4 text-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20 focus:ring-offset-[var(--background)]"
                />
                <Label htmlFor="is_active" className="text-sm text-[var(--foreground)]">Active</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_superuser"
                  name="is_superuser"
                  checked={isSuperuser}
                  onChange={(e) => setIsSuperuser(e.target.checked)}
                  disabled={isLoading}
                  className="rounded border-[var(--border)] h-4 w-4 text-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20 focus:ring-offset-[var(--background)]"
                />
                <Label htmlFor="is_superuser" className="text-sm text-[var(--foreground)]">Super User</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="must_change_password"
                  name="must_change_password"
                  checked={mustChangePassword}
                  onChange={(e) => setMustChangePassword(e.target.checked)}
                  disabled={isLoading}
                  className="rounded border-[var(--border)] h-4 w-4 text-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20 focus:ring-offset-[var(--background)]"
                />
                <Label htmlFor="must_change_password" className="text-sm text-[var(--foreground)]">Must Change Password</Label>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1 border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--hover)]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow-dark)] text-[var(--cityscape-accent-foreground)]"
            >
              {isLoading ? 'Saving...' : (isEditing ? 'Update User' : 'Create User')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
