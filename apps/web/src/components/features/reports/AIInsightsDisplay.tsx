"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, TrendingUp, Users } from "lucide-react";

interface AIInsightsDisplayProps {
  insights: {
    summary: string;
    recommendations: string[];
    capacity_development_needs: string[];
  } | null;
  className?: string;
}

export function AIInsightsDisplay({ insights, className }: AIInsightsDisplayProps) {
  if (!insights) {
    return (
      <Card className={cn("border-muted", className)}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            No AI insights available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Assessment Summary
          </CardTitle>
          <CardDescription>AI-generated overview of compliance status</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground">{insights.summary}</p>
        </CardContent>
      </Card>

      {/* Recommendations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Recommendations
          </CardTitle>
          <CardDescription>Actionable steps to improve compliance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.recommendations.map((recommendation, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-md bg-muted/50 border border-muted"
              >
                <Badge
                  variant="outline"
                  className="shrink-0 mt-0.5 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-semibold"
                >
                  {index + 1}
                </Badge>
                <p className="text-sm leading-relaxed text-foreground flex-1">{recommendation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Capacity Development Needs Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Capacity Development Needs
          </CardTitle>
          <CardDescription>Training and development areas for barangay officials</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {insights.capacity_development_needs.map((need, index) => (
              <div key={index} className="flex items-start gap-2 p-2 rounded-sm bg-accent/50">
                <span className="text-primary text-xs font-medium">•</span>
                <p className="text-sm leading-relaxed text-foreground">{need}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
