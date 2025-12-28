"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface PredictionAccuracyData {
  accuracy: number;
  falsePositives: number;
  falseNegatives: number;
  totalPredictions: number;
}

interface DiscrepancyData {
  barangay: string;
  sinagPrediction: "Pass" | "Fail";
  officialResult: "Pass" | "Fail";
  supervisorRemarks: string;
}

interface CrossMatchingData {
  predictionAccuracy: PredictionAccuracyData;
  discrepancies: DiscrepancyData[];
}

interface CrossMatchingWidgetProps {
  data: CrossMatchingData;
}

export function CrossMatchingWidget({ data }: CrossMatchingWidgetProps) {
  const { predictionAccuracy, discrepancies } = data;

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Pre-Assessment Effectiveness Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="accuracy" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="accuracy">Prediction Accuracy</TabsTrigger>
            <TabsTrigger value="discrepancies">Discrepancy Report</TabsTrigger>
          </TabsList>

          <TabsContent value="accuracy" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Prediction Accuracy KPI */}
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div
                      className="text-3xl font-bold"
                      style={{ color: "var(--analytics-success-text-light)" }}
                    >
                      {predictionAccuracy.accuracy}%
                    </div>
                    <div className="text-sm text-[var(--text-secondary)] mt-1">
                      Prediction Accuracy
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      {predictionAccuracy.totalPredictions} total predictions
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* False Positives KPI */}
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div
                      className="text-3xl font-bold"
                      style={{ color: "var(--analytics-danger-text-light)" }}
                    >
                      {predictionAccuracy.falsePositives}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)] mt-1">False Positives</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      Predicted Pass, Actually Failed
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* False Negatives KPI */}
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div
                      className="text-3xl font-bold"
                      style={{ color: "var(--analytics-warning-text-light)" }}
                    >
                      {predictionAccuracy.falseNegatives}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)] mt-1">False Negatives</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      Predicted Fail, Actually Passed
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Accuracy Summary */}
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: "var(--analytics-neutral-bg)" }}
            >
              <h4 className="font-semibold text-[var(--foreground)] mb-2">Analysis Summary</h4>
              <p className="text-sm text-[var(--text-secondary)]">
                The V-ANTAGE pre-assessment system achieved a {predictionAccuracy.accuracy}%
                accuracy rate, with {predictionAccuracy.falsePositives} false positives and{" "}
                {predictionAccuracy.falseNegatives} false negatives. This indicates the
                system&apos;s effectiveness in predicting SGLGB outcomes.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="discrepancies" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-[var(--foreground)] mb-2">
                  Discrepancies Found: {discrepancies.length}
                </h4>
                <p className="text-sm text-[var(--text-secondary)]">
                  Barangays where pre-assessment results did not match official outcomes
                </p>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barangay</TableHead>
                      <TableHead>V-ANTAGE Prediction</TableHead>
                      <TableHead>Official Result</TableHead>
                      <TableHead>Supervisor Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discrepancies.map((discrepancy, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{discrepancy.barangay}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              discrepancy.sinagPrediction === "Pass" ? "default" : "destructive"
                            }
                            className="border-0 text-white"
                            style={{
                              backgroundColor:
                                discrepancy.sinagPrediction === "Pass"
                                  ? "var(--analytics-success)"
                                  : "var(--analytics-danger)",
                            }}
                          >
                            {discrepancy.sinagPrediction}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              discrepancy.officialResult === "Pass" ? "default" : "destructive"
                            }
                            className="border-0 text-white"
                            style={{
                              backgroundColor:
                                discrepancy.officialResult === "Pass"
                                  ? "var(--analytics-success)"
                                  : "var(--analytics-danger)",
                            }}
                          >
                            {discrepancy.officialResult}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p
                            className="text-sm text-[var(--text-secondary)] truncate"
                            title={discrepancy.supervisorRemarks}
                          >
                            {discrepancy.supervisorRemarks}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
