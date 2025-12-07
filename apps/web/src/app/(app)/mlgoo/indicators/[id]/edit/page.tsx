"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSchemaBuilder } from "@/components/features/indicators/FormSchemaBuilder";
import { SaveFormSchemaButton } from "@/components/features/indicators/SaveFormSchemaButton";
import { useFormBuilderStore } from "@/store/useFormBuilderStore";
import {
  useGetIndicatorsIndicatorId,
  usePutIndicatorsIndicatorId,
  useGetLookupsGovernanceAreas,
} from "@sinag/shared";
interface IndicatorFormData {
  name: string;
  description?: string;
  governance_area_id: number;
  parent_id?: number;
}

/**
 * Edit Indicator Page
 *
 * Allows MLGOO users to edit an existing indicator and its form schema.
 *
 * Features:
 * - Fetch and pre-populate existing indicator data
 * - Load existing form_schema into Zustand store
 * - Form schema builder integration
 * - "Save Changes" button
 * - Warning on navigate away with unsaved changes
 * - Redirects to indicator detail on success
 */
export default function EditIndicatorPage() {
  const router = useRouter();
  const params = useParams();
  const indicatorId = parseInt(params.id as string);
  const { loadFields, fields, markAsSaved, isDirty } = useFormBuilderStore();
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch indicator data
  const { data: indicator, isLoading } = useGetIndicatorsIndicatorId(indicatorId);

  // Fetch governance areas
  const { data: governanceAreas } = useGetLookupsGovernanceAreas();

  // Form for basic indicator fields
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<IndicatorFormData>();

  // Update indicator mutation
  const updateIndicator = usePutIndicatorsIndicatorId();

  // Load indicator data into form and store
  useEffect(() => {
    if (indicator && !isLoaded) {
      // Pre-populate basic fields
      reset({
        name: indicator.name,
        description: indicator.description || "",
        governance_area_id: indicator.governance_area_id,
        parent_id: indicator.parent_id || undefined,
      });

      // Load form_schema into Zustand store
      if (indicator.form_schema && indicator.form_schema.fields) {
        loadFields(indicator.form_schema.fields as any);
      }

      setIsLoaded(true);
    }
  }, [indicator, isLoaded, reset, loadFields]);

  // Warn before unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-sm text-gray-600">Loading indicator...</p>
        </div>
      </div>
    );
  }

  if (!indicator) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-900">Indicator not found</p>
          <Button className="mt-4" onClick={() => router.push("/mlgoo/indicators")}>
            Back to Indicators
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header with Breadcrumb */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => router.push("/mlgoo/dashboard")} className="hover:text-gray-700">
            Admin
          </button>
          <ChevronRight className="h-4 w-4" />
          <button onClick={() => router.push("/mlgoo/indicators")} className="hover:text-gray-700">
            Indicators
          </button>
          <ChevronRight className="h-4 w-4" />
          <button
            onClick={() => router.push(`/mlgoo/indicators/${indicatorId}`)}
            className="hover:text-gray-700"
          >
            {indicator.name}
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">Edit</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Indicator</h1>
            <p className="mt-1 text-sm text-gray-500">Modify indicator details and form schema</p>
            {isDirty && <p className="mt-1 text-sm text-yellow-600">You have unsaved changes</p>}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/mlgoo/indicators/${indicatorId}`)}
            >
              Cancel
            </Button>
            <SaveFormSchemaButton
              onSave={async () => {
                await handleSubmit(async (data) => {
                  const formSchema = { fields };
                  await updateIndicator.mutateAsync({
                    indicatorId: indicatorId,
                    data: {
                      name: data.name,
                      description: data.description || undefined,
                      governance_area_id: data.governance_area_id,
                      parent_id: data.parent_id || undefined,
                      form_schema: formSchema as any,
                    },
                  });
                  markAsSaved();
                  router.push(`/mlgoo/indicators/${indicatorId}`);
                })();
              }}
            >
              Save Changes
            </SaveFormSchemaButton>
          </div>
        </div>
      </div>

      {/* Basic Fields Form */}
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
        <div className="grid grid-cols-2 gap-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Indicator Name <span className="text-red-600">*</span>
            </Label>
            <Input
              id="name"
              {...register("name", { required: "Name is required", minLength: 3 })}
              placeholder="Enter indicator name"
            />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>

          {/* Governance Area */}
          <div className="space-y-2">
            <Label htmlFor="governance_area_id">
              Governance Area <span className="text-red-600">*</span>
            </Label>
            <Select
              defaultValue={indicator.governance_area_id?.toString()}
              onValueChange={(value) => setValue("governance_area_id", parseInt(value))}
            >
              <SelectTrigger>
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
              <p className="text-sm text-red-600">{errors.governance_area_id.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="col-span-2 space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Enter indicator description"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Form Schema Builder */}
      <div className="flex-1 overflow-hidden">
        <FormSchemaBuilder />
      </div>
    </div>
  );
}
