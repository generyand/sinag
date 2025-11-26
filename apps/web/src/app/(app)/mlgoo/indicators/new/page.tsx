'use client';

import { FormSchemaBuilder } from '@/components/features/indicators/FormSchemaBuilder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFormBuilderStore } from '@/store/useFormBuilderStore';
import { useGetLookupsGovernanceAreas, usePostIndicators } from '@sinag/shared';
import { ChevronRight, FileText, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

interface IndicatorFormData {
  name: string;
  description?: string;
  governance_area_id: number;
  parent_id?: number;
}

/**
 * Create New Indicator Page
 *
 * Allows MLGOO users to create a new indicator with form schema builder.
 *
 * Features:
 * - Basic indicator fields (name, description, governance area, parent)
 * - Form schema builder integration
 * - "Save Draft" (without form_schema validation)
 * - "Save & Publish" (with full validation)
 * - Redirects to indicator detail on success
 */
export default function NewIndicatorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { fields, clearFields, markAsSaved } = useFormBuilderStore();
  const [isSaving, setIsSaving] = useState(false);

  // Fetch governance areas
  const { data: governanceAreas, isLoading } = useGetLookupsGovernanceAreas();

  // Form for basic indicator fields
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<IndicatorFormData>({
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const selectedGovernanceAreaId = watch('governance_area_id');

  // Create indicator mutation
  const createIndicator = usePostIndicators();

  // Clear form builder on mount
  useEffect(() => {
    clearFields();
  }, [clearFields]);

  // Handle save draft (without form_schema)
  const handleSaveDraft = handleSubmit(async (data) => {
    setIsSaving(true);
    try {
      const result = await createIndicator.mutateAsync({
        data: {
          name: data.name,
          description: data.description || undefined,
          governance_area_id: data.governance_area_id,
          parent_id: data.parent_id || undefined,
          is_active: false, // Draft mode
        },
      });

      toast({
        title: 'Draft saved',
        description: 'Indicator draft created successfully',
      });

      markAsSaved();
      router.push(`/mlgoo/indicators/${result.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to save draft',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  });

  // Handle save & publish (with form_schema)
  const handleSaveAndPublish = handleSubmit(async (data) => {
    // Validate governance area is selected
    if (!data.governance_area_id) {
      toast({
        title: 'Validation Error',
        description: 'Please select a Governance Area',
        variant: 'destructive',
      });
      return;
    }

    // Validate that form has fields
    if (fields.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one field to the form',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const formSchema = {
        fields: fields,
      };

      const result = await createIndicator.mutateAsync({
        data: {
          name: data.name,
          description: data.description || undefined,
          governance_area_id: data.governance_area_id,
          parent_id: data.parent_id || undefined,
          form_schema: formSchema as any,
          is_active: true, // Published
        },
      });

      toast({
        title: 'Success',
        description: 'Indicator created and published successfully',
      });

      markAsSaved();
      // Redirect to indicators list page
      router.push(`/mlgoo/indicators`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.detail || error?.message || 'Failed to create indicator',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  });

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-8">
            {/* Header Skeleton */}
            <div className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--card)] shadow-lg rounded-sm animate-pulse">
              <div className="relative overflow-hidden p-6">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/30 to-indigo-100/15 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-100/20 to-pink-100/10 rounded-full translate-y-12 -translate-x-12"></div>

                <div className="relative z-10">
                  {/* Breadcrumb skeleton */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-4 bg-[var(--muted)]/50 rounded w-16"></div>
                    <div className="h-4 w-4 bg-[var(--muted)]/50 rounded"></div>
                    <div className="h-4 bg-[var(--muted)]/50 rounded w-20"></div>
                    <div className="h-4 w-4 bg-[var(--muted)]/50 rounded"></div>
                    <div className="h-4 bg-[var(--muted)]/50 rounded w-12"></div>
                  </div>

                  {/* Header content skeleton */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-3">
                      <div className="h-9 bg-[var(--muted)]/50 rounded w-80"></div>
                      <div className="h-4 bg-[var(--muted)]/50 rounded w-96"></div>
                    </div>

                    {/* Action buttons skeleton */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="h-11 bg-[var(--muted)]/50 rounded w-36"></div>
                      <div className="h-11 bg-[var(--muted)]/50 rounded w-44"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Information Section Skeleton */}
            <div className="bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-6 sm:p-8 animate-pulse">
              <div className="h-7 bg-[var(--muted)]/50 rounded w-48 mb-6 pb-4"></div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Name field skeleton */}
                <div className="space-y-2">
                  <div className="h-4 bg-[var(--muted)]/50 rounded w-32 mb-2"></div>
                  <div className="h-9 bg-[var(--muted)]/50 rounded"></div>
                </div>

                {/* Governance Area field skeleton */}
                <div className="space-y-2">
                  <div className="h-4 bg-[var(--muted)]/50 rounded w-36 mb-2"></div>
                  <div className="h-9 bg-[var(--muted)]/50 rounded"></div>
                </div>

                {/* Description field skeleton */}
                <div className="col-span-1 lg:col-span-2 space-y-2">
                  <div className="h-4 bg-[var(--muted)]/50 rounded w-28 mb-2"></div>
                  <div className="h-24 bg-[var(--muted)]/50 rounded"></div>
                  <div className="h-3 bg-[var(--muted)]/50 rounded w-80"></div>
                </div>
              </div>
            </div>

            {/* Form Schema Builder Section Skeleton */}
            <div className="bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] overflow-hidden animate-pulse">
              <div className="px-6 sm:px-8 py-5 border-b border-[var(--border)]">
                <div className="h-7 bg-[var(--muted)]/50 rounded w-56 mb-2"></div>
                <div className="h-4 bg-[var(--muted)]/50 rounded w-96"></div>
              </div>
              <div className="p-6 sm:p-8">
                {/* Form builder placeholder */}
                <div className="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--muted)]/10">
                  <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-[var(--muted)]/50 rounded mb-2"></div>
                    <div className="h-4 bg-[var(--muted)]/50 rounded w-32 mx-auto mb-1"></div>
                    <div className="h-4 bg-[var(--muted)]/50 rounded w-56 mx-auto"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-8">
          {/* Enhanced Header with Breadcrumb - Sticky */}
          <div className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--card)] shadow-lg rounded-sm">
            <div className="relative overflow-hidden p-6">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/30 to-indigo-100/15 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-100/20 to-pink-100/10 rounded-full translate-y-12 -translate-x-12"></div>

              <div className="relative z-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)] mb-4">
              <button
                onClick={() => router.push('/mlgoo/dashboard')}
                className="hover:text-[var(--cityscape-yellow)] transition-colors font-medium px-2 py-1 rounded-sm hover:bg-[var(--cityscape-yellow)]/10"
              >
                Admin
              </button>
              <ChevronRight className="h-4 w-4" />
              <button
                onClick={() => router.push('/mlgoo/indicators')}
                className="hover:text-[var(--cityscape-yellow)] transition-colors font-medium px-2 py-1 rounded-sm hover:bg-[var(--cityscape-yellow)]/10"
              >
                Indicators
              </button>
              <ChevronRight className="h-4 w-4" />
              <span className="text-[var(--foreground)] font-semibold px-2 py-1">New</span>
            </div>

            {/* Header Content */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-[var(--foreground)]">
                  Create{" "}
                  <span className="bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] bg-clip-text text-transparent">
                    New Indicator
                  </span>
                </h1>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="px-6 py-2.5 hover:border-[var(--cityscape-yellow)] hover:text-[var(--cityscape-yellow)] transition-all font-medium"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Save Draft
                </Button>
                <Button
                  onClick={async () => {
                    await handleSubmit(async (data) => {
                      // Validate governance area is selected
                      if (!data.governance_area_id) {
                        toast({
                          title: 'Validation Error',
                          description: 'Please select a Governance Area',
                          variant: 'destructive',
                        });
                        throw new Error('Governance area is required');
                      }

                      const formSchema = { fields };
                      await createIndicator.mutateAsync({
                        data: {
                          name: data.name,
                          description: data.description || undefined,
                          governance_area_id: data.governance_area_id,
                          parent_id: data.parent_id || undefined,
                          form_schema: formSchema as any,
                          is_active: true,
                        },
                      });

                      toast({
                        title: 'Success',
                        description: 'Indicator created and published successfully',
                      });

                      markAsSaved();
                      // Redirect to indicators list page
                      router.push(`/mlgoo/indicators`);
                    })();
                  }}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] hover:shadow-lg transition-all text-[var(--foreground)] font-semibold"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save & Publish
                </Button>
              </div>
            </div>
              </div>
            </div>
          </div>

          {/* Basic Information Section */}
          <div className="bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 pb-4 border-b border-[var(--border)]">Basic Information</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-[var(--foreground)]">
                  Indicator Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="name"
                  {...register('name', { required: 'Name is required', minLength: 3 })}
                  placeholder="Enter indicator name"
                  className={`${errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <span className="text-red-600">⚠</span> {errors.name.message}
                  </p>
                )}
              </div>

              {/* Governance Area */}
              <div className="space-y-2">
                <Label htmlFor="governance_area_id" className="text-sm font-semibold text-[var(--foreground)]">
                  Governance Area <span className="text-red-600">*</span>
                </Label>
                <Select
                  onValueChange={(value) => {
                    setValue('governance_area_id', parseInt(value), { shouldValidate: true });
                  }}
                  required
                >
                  <SelectTrigger className={`${errors.governance_area_id ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Select governance area" />
                  </SelectTrigger>
                  <SelectContent>
                    {governanceAreas?.map((area) => (
                      <SelectItem key={area.id} value={area.id.toString()}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.governance_area_id && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <span className="text-red-600">⚠</span> {errors.governance_area_id.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="col-span-1 lg:col-span-2 space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold text-[var(--foreground)]">
                  Description <span className="text-[var(--text-secondary)] font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Enter a brief description of this indicator..."
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-[var(--text-secondary)]">
                  Provide context and guidance for assessors completing this indicator
                </p>
              </div>
              </div>
            </div>

            {/* Form Schema Builder Section */}
            <div className="bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] overflow-hidden">
              <div className="px-6 sm:px-8 py-5 border-b border-[var(--border)]">
                <h2 className="text-2xl font-bold text-[var(--foreground)]">Form Schema Builder</h2>
              </div>
              <div className="p-6 sm:p-8">
                <FormSchemaBuilder />
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
