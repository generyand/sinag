"use client";

import { useState } from "react";
import { Save, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFormBuilderStore } from "@/store/useFormBuilderStore";
import { validateFormSchema, type ValidationError } from "@/lib/form-schema-validation";
import { useToast } from "@/hooks/use-toast";

interface SaveFormSchemaButtonProps {
  onSave: () => Promise<void>;
  disabled?: boolean;
  variant?: "default" | "outline";
  children?: React.ReactNode;
}

/**
 * SaveFormSchemaButton Component
 *
 * Handles form schema validation and save logic.
 *
 * Features:
 * - Client-side validation before save
 * - Server-side validation integration (via parent onSave)
 * - Loading states during save
 * - Error dialog with validation errors
 * - Success feedback
 */
export function SaveFormSchemaButton({
  onSave,
  disabled,
  variant = "default",
  children,
}: SaveFormSchemaButtonProps) {
  const { fields } = useFormBuilderStore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const handleSave = async () => {
    // Client-side validation
    const errors = validateFormSchema(fields);

    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowErrorDialog(true);
      return;
    }

    // Proceed with save
    setIsSaving(true);
    try {
      await onSave();

      toast({
        title: "Success",
        description: "Form schema saved successfully",
      });
    } catch (error: any) {
      // Check if error contains validation errors from server
      if (error?.response?.data?.detail?.errors) {
        setValidationErrors(
          error.response.data.detail.errors.map((err: string) => ({
            message: err,
          }))
        );
        setShowErrorDialog(true);
      } else {
        toast({
          title: "Error",
          description: error?.message || "Failed to save form schema",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button onClick={handleSave} disabled={disabled || isSaving} variant={variant}>
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            {children || "Save"}
          </>
        )}
      </Button>

      {/* Validation Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Validation Errors
            </DialogTitle>
            <DialogDescription>Please fix the following errors before saving:</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {validationErrors.map((error, index) => (
              <div key={index} className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    {error.fieldId && (
                      <p className="text-sm font-medium text-red-900">
                        Field:{" "}
                        <code className="rounded bg-red-100 px-1 py-0.5">{error.fieldId}</code>
                      </p>
                    )}
                    <p className="text-sm text-red-700 mt-1">{error.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={() => setShowErrorDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
