"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PeaceAndOrderFormProps {
  onSubmit?: (data: FormData) => void;
  initialData?: FormData;
  isLoading?: boolean;
}

interface FormData {
  situationalAwareness: number;
  riskAssessment: number;
  communicationClarity: number;
  decisionMaking: number;
  conflictResolution: number;
  notes: string;
}

interface RatingScaleProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  description: string;
}

function RatingScale({ label, value, onChange, description }: RatingScaleProps) {
  return (
    <div className="space-y-2">
      <div>
        <Label className="block text-sm font-medium text-gray-700">{label}</Label>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-xs text-gray-500">Poor</span>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`w-8 h-8 rounded-full border-2 text-sm font-medium transition-colors ${
              value === rating
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:border-blue-300"
            }`}
          >
            {rating}
          </button>
        ))}
        <span className="text-xs text-gray-500">Excellent</span>
      </div>
    </div>
  );
}

export default function PeaceAndOrderForm({
  onSubmit,
  initialData,
  isLoading = false,
}: PeaceAndOrderFormProps) {
  const [formData, setFormData] = useState<FormData>({
    situationalAwareness: initialData?.situationalAwareness || 1,
    riskAssessment: initialData?.riskAssessment || 1,
    communicationClarity: initialData?.communicationClarity || 1,
    decisionMaking: initialData?.decisionMaking || 1,
    conflictResolution: initialData?.conflictResolution || 1,
    notes: initialData?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  const handleRatingChange = (field: keyof FormData, value: number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Peace and Order Assessment</h2>
        <p className="mt-1 text-sm text-gray-600">
          Evaluate leadership performance in maintaining peace and order during critical situations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 gap-8">
          <RatingScale
            label="Situational Awareness"
            value={formData.situationalAwareness}
            onChange={(value) => handleRatingChange("situationalAwareness", value)}
            description="Ability to understand and assess the current situation quickly and accurately"
          />

          <RatingScale
            label="Risk Assessment"
            value={formData.riskAssessment}
            onChange={(value) => handleRatingChange("riskAssessment", value)}
            description="Capacity to identify potential threats and evaluate their severity"
          />

          <RatingScale
            label="Communication Clarity"
            value={formData.communicationClarity}
            onChange={(value) => handleRatingChange("communicationClarity", value)}
            description="Effectiveness in communicating instructions and information under pressure"
          />

          <RatingScale
            label="Decision Making"
            value={formData.decisionMaking}
            onChange={(value) => handleRatingChange("decisionMaking", value)}
            description="Quality and speed of critical decisions made during tense situations"
          />

          <RatingScale
            label="Conflict Resolution"
            value={formData.conflictResolution}
            onChange={(value) => handleRatingChange("conflictResolution", value)}
            description="Ability to de-escalate tensions and find peaceful solutions"
          />
        </div>

        <div>
          <Label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Additional Notes
          </Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
            placeholder="Add any additional comments or observations here."
          />
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Overall Score:{" "}
            <span className="font-medium">
              {Math.round(
                (Object.values(formData)
                  .slice(0, 5)
                  .reduce((a, b) => a + b, 0) /
                  5) *
                  20
              )}
              %
            </span>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving Assessment...
              </>
            ) : (
              "Save Assessment"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
