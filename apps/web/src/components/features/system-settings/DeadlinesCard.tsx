"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calendar, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AssessmentPeriodDeadlines, UpdateDeadlinesRequest } from "@/types/system-settings";

const deadlinesSchema = z
  .object({
    blguSubmissionDeadline: z.date({
      message: "BLGU submission deadline is required",
    }),
    reworkCompletionDeadline: z.date({
      message: "Rework completion deadline is required",
    }),
  })
  .refine((data) => data.reworkCompletionDeadline > data.blguSubmissionDeadline, {
    message: "Rework completion deadline must be after BLGU submission deadline",
    path: ["reworkCompletionDeadline"],
  });

type DeadlinesFormData = z.infer<typeof deadlinesSchema>;

interface DeadlinesCardProps {
  deadlines?: AssessmentPeriodDeadlines;
  activePeriodYear?: number;
  onSaveDeadlines: (data: UpdateDeadlinesRequest) => Promise<void>;
  isLoading?: boolean;
}

export function DeadlinesCard({
  deadlines,
  activePeriodYear,
  onSaveDeadlines,
  isLoading = false,
}: DeadlinesCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DeadlinesFormData>({
    resolver: zodResolver(deadlinesSchema),
    defaultValues: {
      blguSubmissionDeadline: deadlines?.blguSubmissionDeadline
        ? new Date(deadlines.blguSubmissionDeadline)
        : undefined,
      reworkCompletionDeadline: deadlines?.reworkCompletionDeadline
        ? new Date(deadlines.reworkCompletionDeadline)
        : undefined,
    },
  });

  const handleSubmit = async (data: DeadlinesFormData) => {
    setIsSubmitting(true);
    try {
      await onSaveDeadlines({
        blguSubmissionDeadline: data.blguSubmissionDeadline.toISOString(),
        reworkCompletionDeadline: data.reworkCompletionDeadline.toISOString(),
      });
    } catch (error) {
      console.error("Error saving deadlines:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Active Period Deadlines {activePeriodYear && `(SGLGB ${activePeriodYear})`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="blguSubmissionDeadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BLGU Submission Deadline</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        onDateChange={field.onChange}
                        placeholder="Select submission deadline"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reworkCompletionDeadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rework Completion Deadline</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        onDateChange={field.onChange}
                        placeholder="Select rework deadline"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || isLoading} className="min-w-[120px]">
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Saving..." : "Save Deadlines"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
