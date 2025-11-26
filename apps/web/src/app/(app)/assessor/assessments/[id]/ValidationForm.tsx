"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { ValidationStatus, usePostAssessorAssessmentResponsesResponseIdValidate } from "@sinag/shared";
import { AlertTriangle, CheckCircle, MessageSquare, XCircle } from "lucide-react";
import { useState } from "react";

interface ValidationFormProps {
  responseId: number;
  assessmentId: string;
  currentValidationStatus: string | null;
  existingComments: Array<{
    id: number;
    comment: string;
    comment_type: string;
    is_internal_note: boolean;
    created_at: string;
    assessor: {
      id: number;
      name: string;
      email: string;
    } | null;
  }>;
}

export function ValidationForm({ 
  responseId, 
  assessmentId, 
  currentValidationStatus,
  existingComments 
}: ValidationFormProps) {
  const [validationStatus, setValidationStatus] = useState<string>(currentValidationStatus || "");
  const [comment, setComment] = useState("");
  const [commentType, setCommentType] = useState<string>("validation");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  const validationMutation = usePostAssessorAssessmentResponsesResponseIdValidate({
    mutation: {
      onSuccess: () => {
        // Invalidate the assessment details query to refresh the data
        queryClient.invalidateQueries({ 
          queryKey: ["assessor", "assessment", assessmentId] 
        });
        
        // Reset form
        setComment("");
        setIsInternalNote(false);
      },
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validationStatus) {
      alert("Please select a validation status");
      return;
    }

    setIsSubmitting(true);
    
    try {
      await validationMutation.mutateAsync({
        responseId,
        data: {
          validation_status: validationStatus as ValidationStatus,
          public_comment: comment.trim() || null,
          assessor_remarks: isInternalNote ? comment.trim() || null : null,
        },
      });
      
      alert("Validation submitted successfully!");
    } catch (error) {
      console.error("Validation submission failed:", error);
      alert("Failed to submit validation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pass":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Fail":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "Conditional":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-green-900">
          <MessageSquare className="h-5 w-5" />
          Validation Form
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Validation Status */}
          <div>
            <Label className="text-sm font-medium">Validation Status *</Label>
            <RadioGroup
              value={validationStatus}
              onValueChange={setValidationStatus}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Pass" id="pass" />
                <Label htmlFor="pass" className="flex items-center gap-2">
                  {getStatusIcon("Pass")}
                  Pass
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Fail" id="fail" />
                <Label htmlFor="fail" className="flex items-center gap-2">
                  {getStatusIcon("Fail")}
                  Fail
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Conditional" id="conditional" />
                <Label htmlFor="conditional" className="flex items-center gap-2">
                  {getStatusIcon("Conditional")}
                  Conditional
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Comment Type */}
          <div>
            <Label className="text-sm font-medium">Comment Type</Label>
            <RadioGroup
              value={commentType}
              onValueChange={setCommentType}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="validation" id="validation" />
                <Label htmlFor="validation">Validation Comment</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="feedback" id="feedback" />
                <Label htmlFor="feedback">General Feedback</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="rework" id="rework" />
                <Label htmlFor="rework">Rework Request</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Comment */}
          <div>
            <Label htmlFor="comment" className="text-sm font-medium">
              Comment
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Enter your validation comment or feedback..."
              className="mt-2"
              rows={4}
            />
          </div>

          {/* Internal Note Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="internal-note"
              checked={isInternalNote}
              onCheckedChange={(checked) => setIsInternalNote(checked as boolean)}
            />
            <Label htmlFor="internal-note" className="text-sm">
              This is an internal note (not visible to BLGU)
            </Label>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || !validationStatus}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "Submitting..." : "Submit Validation"}
            </Button>
          </div>
        </form>

        {/* Existing Comments Summary */}
        {existingComments.length > 0 && (
          <div className="mt-6 pt-4 border-t border-green-200">
            <h4 className="text-sm font-medium text-green-900 mb-2">
              Previous Comments ({existingComments.length})
            </h4>
            <div className="space-y-2">
              {existingComments.slice(-3).map((comment) => (
                <div key={comment.id} className="text-xs text-green-700 bg-white rounded p-2 border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {comment.assessor?.name || 'Unknown'}
                    </span>
                    <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1">{comment.comment}</p>
                  {comment.is_internal_note && (
                    <span className="text-xs text-blue-600">(Internal Note)</span>
                  )}
                </div>
              ))}
              {existingComments.length > 3 && (
                <p className="text-xs text-green-600">
                  +{existingComments.length - 3} more comments
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
