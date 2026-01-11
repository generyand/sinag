"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGovernanceAreas } from "@/hooks/useGovernanceAreas";
import {
  usePostMunicipalOffices,
  usePutMunicipalOfficesOfficeId,
  MunicipalOfficeResponse,
} from "@sinag/shared";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  abbreviation: z
    .string()
    .min(1, "Abbreviation is required")
    .max(20, "Abbreviation must be less than 20 characters"),
  description: z.string().optional().nullable(),
  governance_area_id: z.number({ required_error: "Governance area is required" }),
  contact_person: z.string().max(100).optional().nullable(),
  contact_number: z.string().max(20).optional().nullable(),
  contact_email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

interface MunicipalOfficeFormProps {
  office?: MunicipalOfficeResponse;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MunicipalOfficeForm({ office, onSuccess, onCancel }: MunicipalOfficeFormProps) {
  const { data: governanceAreas, isLoading: isLoadingAreas } = useGovernanceAreas();
  const createMutation = usePostMunicipalOffices();
  const updateMutation = usePutMunicipalOfficesOfficeId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: office?.name || "",
      abbreviation: office?.abbreviation || "",
      description: office?.description || "",
      governance_area_id: office?.governance_area_id,
      contact_person: office?.contact_person || "",
      contact_number: office?.contact_number || "",
      contact_email: office?.contact_email || "",
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (data: FormValues) => {
    try {
      // Clean up empty strings to null
      const cleanData = {
        ...data,
        description: data.description || null,
        contact_person: data.contact_person || null,
        contact_number: data.contact_number || null,
        contact_email: data.contact_email || null,
      };

      if (office) {
        await updateMutation.mutateAsync({
          officeId: office.id,
          data: cleanData,
        });
        toast.success(`${data.abbreviation} updated successfully`);
      } else {
        await createMutation.mutateAsync({ data: cleanData });
        toast.success(`${data.abbreviation} created successfully`);
      }
      onSuccess();
    } catch {
      toast.error(office ? "Failed to update office" : "Failed to create office");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="abbreviation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Abbreviation *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., MBO, LDRRMO" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Municipal Budget Office" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="governance_area_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Governance Area *</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                defaultValue={field.value?.toString()}
                disabled={!!office || isLoadingAreas}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select governance area" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {governanceAreas?.map((area) => (
                    <SelectItem key={area.id} value={area.id.toString()}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {office && (
                <p className="text-xs text-[var(--muted-foreground)]">
                  Governance area cannot be changed after creation
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Office description (optional)"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contact_person"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Person</FormLabel>
                <FormControl>
                  <Input placeholder="Name" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contact_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Number</FormLabel>
                <FormControl>
                  <Input placeholder="Phone" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="contact_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[var(--cityscape-yellow)] hover:bg-[var(--cityscape-yellow)]/90 text-black"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {office ? "Update" : "Create"} Office
          </Button>
        </div>
      </form>
    </Form>
  );
}
