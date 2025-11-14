'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Eye, User, Shield, InfoIcon } from 'lucide-react';
import type { IndicatorNode } from '@/store/useIndicatorBuilderStore';

/**
 * PreviewTab Component
 *
 * Per indicator-builder-specification.md lines 1736-1738:
 * - Live preview of BLGU view
 * - Live preview of Validator view
 *
 * Shows how the indicator will appear to different user roles.
 */

interface PreviewTabProps {
  indicator: IndicatorNode;
}

export function PreviewTab({ indicator }: PreviewTabProps) {
  const hasDescription = indicator.description && indicator.description.trim().length > 0;
  const hasMOVChecklist = indicator.mov_checklist_items &&
    typeof indicator.mov_checklist_items === 'object' &&
    'items' in indicator.mov_checklist_items &&
    Array.isArray((indicator.mov_checklist_items as any).items) &&
    (indicator.mov_checklist_items as any).items.length > 0;

  return (
    <div className="space-y-6 p-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Preview how this indicator will appear to BLGU users (submission) and Validators (assessment).
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="blgu" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="blgu" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            BLGU View
          </TabsTrigger>
          <TabsTrigger value="validator" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Validator View
          </TabsTrigger>
        </TabsList>

        {/* BLGU View Preview */}
        <TabsContent value="blgu" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {indicator.code && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {indicator.code}
                      </Badge>
                    )}
                    <CardTitle className="text-base">{indicator.name}</CardTitle>
                  </div>
                  <CardDescription>
                    How BLGU users see this indicator during self-assessment submission
                  </CardDescription>
                </div>
                <Eye className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Minimum Requirement */}
              {hasDescription ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Minimum Requirement</h4>
                  <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg whitespace-pre-wrap">
                    {indicator.description}
                  </div>
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertDescription>
                    No minimum requirement defined. BLGU users need guidance on what to assess.
                  </AlertDescription>
                </Alert>
              )}

              {/* BLGU Interaction */}
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-semibold">BLGU Actions</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex gap-2">
                      <div className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">YES</div>
                      <div className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">NO</div>
                      <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">N/A</div>
                    </div>
                    <span className="text-sm text-muted-foreground">Toggle response</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">Upload Documents</div>
                    <span className="text-sm text-muted-foreground">Attach supporting evidence (MOV)</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">Add Notes</div>
                    <span className="text-sm text-muted-foreground">Optional comments</span>
                  </div>
                </div>
              </div>

              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Note:</strong> BLGU users only upload documents. They do NOT enter data in MOV checklist fields (currency, dates, etc.).
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validator View Preview */}
        <TabsContent value="validator" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {indicator.code && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {indicator.code}
                      </Badge>
                    )}
                    <CardTitle className="text-base">{indicator.name}</CardTitle>
                  </div>
                  <CardDescription>
                    How Validators see this indicator during assessment review
                  </CardDescription>
                </div>
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Minimum Requirement */}
              {hasDescription ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Minimum Requirement</h4>
                  <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg whitespace-pre-wrap">
                    {indicator.description}
                  </div>
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertDescription>
                    No minimum requirement defined. Validators need criteria to assess against.
                  </AlertDescription>
                </Alert>
              )}

              {/* BLGU's Response */}
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-semibold">BLGU Response</h4>
                <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  Validator sees BLGU's answer (YES/NO/N/A) and uploaded documents
                </div>
              </div>

              {/* MOV Checklist */}
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-semibold">MOV Checklist (Validator Assessment)</h4>
                {hasMOVChecklist ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700">
                        ✓ MOV Checklist configured with {(indicator.mov_checklist_items as any).items.length} item(s)
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      Validator will:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Check off verified items</li>
                        <li>Enter data values (currency, numbers, dates)</li>
                        <li>Verify document counts where required</li>
                        <li>View validation warnings (comparison failures, thresholds)</li>
                        <li>System auto-calculates PASS/FAIL status</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <AlertDescription>
                      No MOV Checklist defined. Validators need a structured checklist to verify compliance.
                      Switch to the "MOV Checklist" tab to configure.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Processing Result */}
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-semibold">Processing Result</h4>
                <div className="space-y-2">
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    <p className="text-muted-foreground">
                      System automatically calculates validation status based on MOV checklist:
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">PASSED</Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">CONSIDERED</Badge>
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">FAILED</Badge>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    Validator can manually override with justification if needed
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
