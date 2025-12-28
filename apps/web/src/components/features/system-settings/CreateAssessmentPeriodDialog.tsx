"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const createPeriodSchema = z
  .object({
    performanceYear: z.number().min(2020, "Performance year must be 2020 or later"),
    assessmentYear: z.number().min(2021, "Assessment year must be 2021 or later"),
  })
  .refine((data) => data.assessmentYear > data.performanceYear, {
    message: "Assessment year must be after performance year",
    path: ["assessmentYear"],
  });

type CreatePeriodFormData = z.infer<typeof createPeriodSchema>;

interface CreateAssessmentPeriodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { performanceYear: number; assessmentYear: number }) => void;
}

export function CreateAssessmentPeriodDialog({
  isOpen,
  onClose,
  onSubmit,
}: CreateAssessmentPeriodDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreatePeriodFormData>({
    resolver: zodResolver(createPeriodSchema),
    defaultValues: {
      performanceYear: new Date().getFullYear(),
      assessmentYear: new Date().getFullYear() + 1,
    },
  });

  const handleSubmit = async (data: CreatePeriodFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      form.reset();
      onClose();
    } catch (error) {
      console.error("Error creating assessment period:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Assessment Period</DialogTitle>
          <DialogDescription>
            Create a new SGLGB assessment cycle. This will automatically generate assessment records
            for all barangays.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="performanceYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Performance Year</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 2024"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assessmentYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assessment Year</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 2025"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Period"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
