import * as React from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGovernanceAreas } from '@/hooks/useGovernanceAreas';
import { useBarangays } from '@/hooks/useBarangays';
import { UserRole, UserAdminCreate, UserAdminUpdate, Barangay, GovernanceArea } from '@sinag/shared';
import { usePostUsers, usePutUsersUserId, getGetUsersQueryKey } from '@sinag/shared/src/generated/endpoints/users';
import { useQueryClient } from '@tanstack/react-query';

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

export function UserForm({ open, onOpenChange, initialValues, isEditing = false }: UserFormProps) {
  const [form, setForm] = React.useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.BLGU_USER as UserRole,
    phone_number: '',
    validator_area_id: null as number | null,
    barangay_id: null as number | null,
    is_active: true,
    is_superuser: false,
    must_change_password: true,
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Fetch governance areas and barangays data
  const { data: governanceAreas, isLoading: isLoadingGovernanceAreas } = useGovernanceAreas();
  const { data: barangays, isLoading: isLoadingBarangays } = useBarangays();

  // Type assertions for the data
  const typedGovernanceAreas = governanceAreas as GovernanceArea[] | undefined;
  const typedBarangays = barangays as Barangay[] | undefined;

  // Auto-generated mutation hooks
  const queryClient = useQueryClient();
  const createUserMutation = usePostUsers();
  const updateUserMutation = usePutUsersUserId();

  React.useEffect(() => {
    if (initialValues) {
      // For editing, populate form with existing values
      setForm({
        name: initialValues.name || '',
        email: initialValues.email || '',
        password: initialValues.password || '',
        role: initialValues.role || UserRole.BLGU_USER,
        phone_number: initialValues.phone_number || '',
        validator_area_id: initialValues.validator_area_id || null,
        barangay_id: initialValues.barangay_id || null,
        is_active: initialValues.is_active ?? true,
        is_superuser: initialValues.is_superuser ?? false,
        must_change_password: initialValues.must_change_password ?? true,
      });
    } else {
      // For creating new user, reset to empty form
      setForm({
        name: '',
        email: '',
        password: '',
        role: UserRole.BLGU_USER,
        phone_number: '',
        validator_area_id: null,
        barangay_id: null,
        is_active: true,
        is_superuser: false,
        must_change_password: true,
      });
    }
    setErrors({}); // Clear errors when form is reset
  }, [initialValues, open]);

  // Additional effect to ensure form is reset when dialog opens for new user
  React.useEffect(() => {
    if (open && !initialValues && !isEditing) {
      // Force reset form when opening for new user
      setForm({
        name: '',
        email: '',
        password: '',
        role: UserRole.BLGU_USER,
        phone_number: '',
        validator_area_id: null,
        barangay_id: null,
        is_active: true,
        is_superuser: false,
        must_change_password: true,
      });
      setErrors({});
    }
  }, [open, initialValues, isEditing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm((prev) => ({ 
      ...prev, 
      [name]: value === '' ? null : value 
    }));
  };

  const handleRoleChange = (role: string) => {
    setForm((prev) => ({
      ...prev,
      role: role as UserRole,
      // Clear area assignments when role changes based on new role structure
      // VALIDATOR: keeps validator_area_id, clears barangay_id
      // BLGU_USER: keeps barangay_id, clears validator_area_id
      // ASSESSOR/MLGOO_DILG: clears both
      validator_area_id: role === UserRole.VALIDATOR ? prev.validator_area_id : null,
      barangay_id: role === UserRole.BLGU_USER ? prev.barangay_id : null,
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!form.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!isEditing && !form.password.trim()) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (isEditing && initialValues?.id) {
      // For editing, exclude password if not provided
      const updateData: UserAdminUpdate = {
        name: form.name || null,
        email: form.email || null,
        role: form.role,
        phone_number: form.phone_number || null,
        validator_area_id: form.validator_area_id,
        barangay_id: form.barangay_id,
        is_active: form.is_active,
        is_superuser: form.is_superuser,
        must_change_password: form.must_change_password,
      };
      
      updateUserMutation.mutate(
        { userId: initialValues.id, data: updateData },
        {
          onSuccess: () => {
            // Invalidate the users query to refetch the data
            queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
            onOpenChange(false);
          },
          onError: (error) => {
            console.error('Failed to update user:', error);
            // TODO: Add proper error handling/toast notification
          },
        }
      );
    } else {
      // For creating, include password
      const createData: UserAdminCreate = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        phone_number: form.phone_number || null,
        validator_area_id: form.validator_area_id,
        barangay_id: form.barangay_id,
        is_active: form.is_active,
        is_superuser: form.is_superuser,
        must_change_password: form.must_change_password,
      };
      
      createUserMutation.mutate(
        { data: createData },
        {
          onSuccess: () => {
            // Invalidate the users query to refetch the data
            queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
            onOpenChange(false);
          },
          onError: (error) => {
            console.error('Failed to create user:', error);
            // TODO: Add proper error handling/toast notification
          },
        }
      );
    }
  };

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
                id="name" 
                name="name" 
                value={form.name} 
                onChange={handleInputChange} 
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
                id="email" 
                name="email" 
                type="email" 
                value={form.email} 
                onChange={handleInputChange} 
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
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  value={form.password} 
                  onChange={handleInputChange} 
                  required 
                  disabled={isLoading}
                  autoComplete="new-password"
                  className={`mt-1 border-[var(--border)] focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20 ${errors.password ? 'border-red-500 dark:border-red-700 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                />
                {errors.password && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.password}</p>
                )}
              </div>
            )}
            
            <div>
              <Label htmlFor="role" className="text-sm font-medium text-[var(--foreground)]">Role</Label>
              <Select value={form.role} onValueChange={handleRoleChange} disabled={isLoading}>
                <SelectTrigger className="mt-1 border-[var(--border)] focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--card)] border border-[var(--border)]">
                  <SelectItem value={UserRole.BLGU_USER}>BLGU User</SelectItem>
                  <SelectItem value={UserRole.ASSESSOR}>Assessor</SelectItem>
                  <SelectItem value={UserRole.VALIDATOR}>Validator</SelectItem>
                  <SelectItem value={UserRole.MLGOO_DILG}>MLGOO-DILG (Admin)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone_number" className="text-sm font-medium text-[var(--foreground)]">Phone Number</Label>
              <Input 
                id="phone_number" 
                name="phone_number" 
                value={form.phone_number} 
                onChange={handleInputChange} 
                disabled={isLoading}
                className="mt-1 border-[var(--border)] focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20"
              />
            </div>
            
            {/* Conditional dropdown for BLGU User role */}
            {form.role === UserRole.BLGU_USER && (
              <div>
                <Label htmlFor="barangay_id" className="text-sm font-medium text-[var(--foreground)]">Assigned Barangay</Label>
                <Select 
                  value={form.barangay_id?.toString() || ''} 
                  onValueChange={(value) => handleSelectChange('barangay_id', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="mt-1 border-[var(--border)] focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20">
                    <SelectValue placeholder="Select a barangay" />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--card)] border border-[var(--border)]">
                    {isLoadingBarangays ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : typedBarangays ? (
                      typedBarangays.map((barangay: Barangay) => (
                        <SelectItem key={barangay.id} value={barangay.id.toString()}>
                          {barangay.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-data" disabled>No barangays available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Conditional dropdown for Validator role */}
            {form.role === UserRole.VALIDATOR && (
              <div>
                <Label htmlFor="validator_area_id" className="text-sm font-medium text-[var(--foreground)]">Assigned Governance Area *</Label>
                <Select
                  value={form.validator_area_id?.toString() || ''}
                  onValueChange={(value) => handleSelectChange('validator_area_id', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="mt-1 border-[var(--border)] focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)]/20">
                    <SelectValue placeholder="Select a governance area" />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--card)] border border-[var(--border)]">
                    {isLoadingGovernanceAreas ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : typedGovernanceAreas ? (
                      typedGovernanceAreas.map((area: GovernanceArea) => (
                        <SelectItem key={area.id} value={area.id.toString()}>
                          {area.name} ({area.area_type})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-data" disabled>No governance areas available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
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
                  checked={form.is_active}
                  onChange={handleInputChange}
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
                  checked={form.is_superuser}
                  onChange={handleInputChange}
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
                  checked={form.must_change_password}
                  onChange={handleInputChange}
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