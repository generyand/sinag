"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGovernanceAreas } from "@/hooks/useGovernanceAreas";
import { BBICreate, BBIUpdate, GovernanceArea } from "@sinag/shared";
import { Save, ArrowLeft } from "lucide-react";

interface BBIFormProps {
  initialValues?: {
    id?: number;
    name?: string;
    abbreviation?: string;
    description?: string;
    governance_area_id?: number;
    mapping_rules?: any;
  };
  onSubmit: (data: BBICreate | BBIUpdate) => void;
  onCancel?: () => void;
  isEditing?: boolean;
  isSubmitting?: boolean;
}

export default function BBIForm({
  initialValues,
  onSubmit,
  onCancel,
  isEditing = false,
  isSubmitting = false,
}: BBIFormProps) {
  const [form, setForm] = React.useState({
    name: initialValues?.name || "",
    abbreviation: initialValues?.abbreviation || "",
    description: initialValues?.description || "",
    governance_area_id: initialValues?.governance_area_id || 0,
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Fetch governance areas data
  const { data: governanceAreas, isLoading: isLoadingGovernanceAreas } =
    useGovernanceAreas();
  const typedGovernanceAreas = governanceAreas as GovernanceArea[] | undefined;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = "BBI name is required";
    }

    if (!form.abbreviation.trim()) {
      newErrors.abbreviation = "Abbreviation is required";
    }

    if (!form.governance_area_id || form.governance_area_id === 0) {
      newErrors.governance_area_id = "Governance area is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData: BBICreate | BBIUpdate = {
      name: form.name,
      abbreviation: form.abbreviation,
      description: form.description || undefined,
      ...(isEditing
        ? {}
        : { governance_area_id: form.governance_area_id }),
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-6 space-y-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          Basic Information
        </h3>

        {/* BBI Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-[var(--foreground)]">
            BBI Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
            placeholder="e.g., Barangay Health Workers"
            className={`bg-[var(--background)] border-[var(--border)] focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)] transition-colors ${errors.name ? "border-red-500" : ""}`}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        {/* Abbreviation */}
        <div className="space-y-2">
          <Label htmlFor="abbreviation" className="text-[var(--foreground)]">
            Abbreviation <span className="text-red-500">*</span>
          </Label>
          <Input
            id="abbreviation"
            value={form.abbreviation}
            onChange={(e) =>
              setForm({ ...form, abbreviation: e.target.value })
            }
            placeholder="e.g., BHW"
            className={`bg-[var(--background)] border-[var(--border)] focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)] transition-colors ${errors.abbreviation ? "border-red-500" : ""}`}
          />
          {errors.abbreviation && (
            <p className="text-sm text-red-500">{errors.abbreviation}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-[var(--foreground)]">Description</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            placeholder="Describe the purpose and function of this BBI..."
            rows={3}
            className="bg-[var(--background)] border-[var(--border)] focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)] transition-colors"
          />
        </div>

        {/* Governance Area - Only for new BBIs */}
        {!isEditing && (
          <div className="space-y-2">
            <Label htmlFor="governance_area" className="text-[var(--foreground)]">
              Governance Area <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.governance_area_id.toString()}
              onValueChange={(value) =>
                setForm({ ...form, governance_area_id: parseInt(value) })
              }
            >
              <SelectTrigger
                className={`bg-[var(--background)] border-[var(--border)] focus:border-[var(--cityscape-yellow)] focus:ring-[var(--cityscape-yellow)] transition-colors ${errors.governance_area_id ? "border-red-500" : ""}`}
              >
                <SelectValue placeholder="Select governance area" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--card)] border border-[var(--border)] shadow-lg rounded-sm">
                {isLoadingGovernanceAreas ? (
                  <SelectItem value="0" disabled>
                    Loading...
                  </SelectItem>
                ) : (
                  typedGovernanceAreas?.map((area) => (
                    <SelectItem
                      key={area.id}
                      value={area.id.toString()}
                      className="text-[var(--foreground)] hover:bg-[var(--cityscape-yellow)]/10"
                    >
                      {area.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.governance_area_id && (
              <p className="text-sm text-red-500">
                {errors.governance_area_id}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-8 h-11 bg-[var(--background)] hover:bg-[var(--muted)]/20 border-[var(--border)] text-[var(--foreground)] rounded-sm font-semibold transition-all duration-200 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="px-8 h-11 font-semibold hover:shadow-lg transition-all duration-200 flex items-center gap-2 rounded-sm"
          style={{
            background:
              "linear-gradient(to bottom right, var(--cityscape-yellow), var(--cityscape-yellow-dark))",
            color: "var(--foreground)",
          }}
        >
          <Save className="h-4 w-4" />
          {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create BBI"}
        </Button>
      </div>
    </form>
  );
}
