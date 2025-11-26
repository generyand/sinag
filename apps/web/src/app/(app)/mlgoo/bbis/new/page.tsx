"use client";

import { useRouter } from "next/navigation";
import { useCreateBBIMutation } from "@/hooks/useBBIs";
import { BBIForm } from "@/components/features/bbis";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { BBICreate } from "@sinag/shared";

export default function NewBBIPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createBBIMutation = useCreateBBIMutation();

  const handleSubmit = async (data: BBICreate) => {
    try {
      await createBBIMutation.mutateAsync({ data });
      toast.success("BBI created successfully!");
      // Invalidate the BBIs list cache so it refetches with the new BBI
      queryClient.invalidateQueries({ queryKey: ['bbis'] });
      router.push("/mlgoo/bbis");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.detail || "Failed to create BBI. Please try again."
      );
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-8">
          {/* Enhanced Header Section */}
          <div className="relative overflow-hidden bg-[var(--card)] rounded-sm shadow-lg border border-[var(--border)] p-8">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-100/40 to-indigo-100/20 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-100/30 to-pink-100/20 rounded-full translate-y-16 -translate-x-16"></div>

            <div className="relative z-10">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 px-3 py-1.5 mb-4 rounded-sm text-sm bg-[var(--muted)]/20 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10 hover:border-[var(--cityscape-yellow)] transition-all duration-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to BBIs</span>
              </button>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">
                Create New{" "}
                <span className="bg-gradient-to-r from-[var(--cityscape-yellow)] to-[var(--cityscape-yellow-dark)] bg-clip-text text-transparent">
                  BBI
                </span>
              </h1>
            </div>
          </div>

          {/* Form */}
          <BBIForm
            onSubmit={handleSubmit as any}
            onCancel={handleCancel}
            isSubmitting={createBBIMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
