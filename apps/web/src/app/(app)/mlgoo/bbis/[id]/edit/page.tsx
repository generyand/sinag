"use client";

import { useRouter, useParams } from "next/navigation";
import { useBBI, useUpdateBBIMutation } from "@/hooks/useBBIs";
import { BBIForm, BBIMappingBuilder } from "@/components/features/bbis";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import type { BBIUpdate } from "@sinag/shared";

export default function EditBBIPage() {
  const router = useRouter();
  const params = useParams();
  const bbiId = parseInt(params.id as string);
  const queryClient = useQueryClient();

  const { data: bbi, isLoading } = useBBI(bbiId);
  const updateBBIMutation = useUpdateBBIMutation();

  const handleSubmit = async (data: BBIUpdate) => {
    try {
      await updateBBIMutation.mutateAsync({ bbiId, data });
      toast.success("BBI updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['bbis', bbiId] });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.detail || "Failed to update BBI. Please try again."
      );
    }
  };

  const handleSaveMappingRules = async (mappingRules: any) => {
    try {
      await updateBBIMutation.mutateAsync({
        bbiId,
        data: { mapping_rules: mappingRules },
      });
      toast.success("Mapping rules saved successfully!");
      queryClient.invalidateQueries({ queryKey: ['bbis', bbiId] });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.detail || "Failed to save mapping rules. Please try again."
      );
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--cityscape-yellow)] mx-auto mb-4"></div>
          <p className="text-[var(--muted-foreground)]">Loading BBI...</p>
        </div>
      </div>
    );
  }

  if (!bbi) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              BBI Not Found
            </h2>
            <p className="text-[var(--muted-foreground)]">
              The BBI you're looking for doesn't exist.
            </p>
            <button
              onClick={() => router.push("/mlgoo/bbis")}
              className="mt-4 text-[var(--cityscape-yellow)] hover:underline"
            >
              ← Back to BBIs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to BBIs
          </button>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Edit{" "}
            <span className="bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] bg-clip-text text-transparent">
              {bbi.name}
            </span>
          </h1>
          <p className="text-[var(--muted-foreground)] mt-2">
            Configure the BBI details and mapping rules to determine functionality status.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="mapping">Mapping Rules</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <BBIForm
              initialValues={{
                id: bbi.id,
                name: bbi.name,
                abbreviation: bbi.abbreviation,
                description: bbi.description || undefined,
                governance_area_id: bbi.governance_area_id,
                mapping_rules: bbi.mapping_rules || undefined,
              }}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isEditing
              isSubmitting={updateBBIMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="mapping" className="space-y-6">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  Functionality Mapping Rules
                </h3>
              </div>

              <BBIMappingBuilder
                governanceAreaId={bbi.governance_area_id}
                initialMappingRules={bbi.mapping_rules as any}
                onSave={handleSaveMappingRules}
                isSaving={updateBBIMutation.isPending}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
