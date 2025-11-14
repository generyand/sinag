'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { IndicatorNode } from '@/store/useIndicatorBuilderStore';

/**
 * CalculationTab Component
 *
 * Per indicator-builder-specification.md lines 1725-1728:
 * - Auto-calc method: AUTO / MANUAL / NONE
 * - Logical operator: AND / OR (for parent indicators)
 * - BBI Association: Dropdown to select BBI (optional)
 *
 * Also includes selection_mode from database schema (line 1750):
 * - Selection mode: 'all' or 'one_of' (for mutually exclusive scenarios)
 */

interface BBI {
  id: number;
  code: string;
  name: string;
}

interface CalculationTabProps {
  indicator: IndicatorNode;
  availableBBIs: BBI[];
  hasChildren: boolean; // Whether this indicator has child indicators
  onUpdate: (updates: Partial<IndicatorNode>) => void;
}

export function CalculationTab({ indicator, availableBBIs, hasChildren, onUpdate }: CalculationTabProps) {
  return (
    <div className="space-y-6 p-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Configure how this indicator's result is calculated or aggregated from child indicators.
        </AlertDescription>
      </Alert>

      {/* Auto-Calc Method */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Auto-Calculation Method
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
          <CardDescription>
            How should this indicator's result be determined?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={indicator.auto_calc_method || 'NONE'}
            onValueChange={(value) => onUpdate({ auto_calc_method: value as 'AUTO' | 'MANUAL' | 'NONE' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">
                <div className="flex flex-col items-start gap-1">
                  <span className="font-medium">NONE</span>
                  <span className="text-xs text-muted-foreground">No automatic calculation (leaf indicator)</span>
                </div>
              </SelectItem>
              <SelectItem value="AUTO">
                <div className="flex flex-col items-start gap-1">
                  <span className="font-medium">AUTO</span>
                  <span className="text-xs text-muted-foreground">Automatically aggregate from children</span>
                </div>
              </SelectItem>
              <SelectItem value="MANUAL">
                <div className="flex flex-col items-start gap-1">
                  <span className="font-medium">MANUAL</span>
                  <span className="text-xs text-muted-foreground">Manually assessed by validator</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            {indicator.auto_calc_method === 'NONE' && (
              <p><strong>NONE:</strong> This indicator is directly assessed. Typically used for leaf indicators with MOV checklists.</p>
            )}
            {indicator.auto_calc_method === 'AUTO' && (
              <p><strong>AUTO:</strong> Result is calculated from child indicators using the logical operator below.</p>
            )}
            {indicator.auto_calc_method === 'MANUAL' && (
              <p><strong>MANUAL:</strong> Validator manually determines the result after reviewing evidence.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logical Operator (for parent indicators) */}
      {hasChildren && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Logical Operator
              <Badge variant="outline" className="text-xs">For Parent Indicators</Badge>
            </CardTitle>
            <CardDescription>
              How should child indicator results be combined?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={indicator.logical_operator || 'AND'}
              onValueChange={(value) => onUpdate({ logical_operator: value as 'AND' | 'OR' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">AND</span>
                    <span className="text-xs text-muted-foreground">All children must pass</span>
                  </div>
                </SelectItem>
                <SelectItem value="OR">
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">OR</span>
                    <span className="text-xs text-muted-foreground">At least one child must pass</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              {indicator.logical_operator === 'AND' && (
                <p><strong>AND:</strong> This indicator passes only if ALL child indicators pass.</p>
              )}
              {indicator.logical_operator === 'OR' && (
                <p><strong>OR:</strong> This indicator passes if ANY child indicator passes.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection Mode (for mutually exclusive scenarios) */}
      {hasChildren && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Selection Mode
              <Badge variant="outline" className="text-xs">For Parent Indicators</Badge>
            </CardTitle>
            <CardDescription>
              Are all children applicable, or only one scenario?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={indicator.selection_mode || 'all'}
              onValueChange={(value) => onUpdate({ selection_mode: value as 'all' | 'one_of' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">ALL</span>
                    <span className="text-xs text-muted-foreground">All child indicators apply</span>
                  </div>
                </SelectItem>
                <SelectItem value="one_of">
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">ONE_OF</span>
                    <span className="text-xs text-muted-foreground">Only one child scenario applies (mutually exclusive)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              {indicator.selection_mode === 'all' && (
                <p><strong>ALL:</strong> All child indicators are assessed. Example: Indicator 1.1 has both 1.1.1 and 1.1.2, both must be completed.</p>
              )}
              {indicator.selection_mode === 'one_of' && (
                <p><strong>ONE_OF:</strong> Only ONE child applies per barangay. Example: Indicator 1.6.1 has three mutually exclusive scenarios (1.6.1.1, 1.6.1.2, 1.6.1.3) - validator selects which scenario applies.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* BBI Association */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            BBI Association
            <Badge variant="outline" className="text-xs">Optional</Badge>
          </CardTitle>
          <CardDescription>
            Link this indicator to a Barangay-Based Institution (BBI) for functionality tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={indicator.associated_bbi_id?.toString() || 'none'}
            onValueChange={(value) => onUpdate({ associated_bbi_id: value === 'none' ? null : parseInt(value, 10) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="No BBI association" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">No BBI Association</span>
              </SelectItem>
              {availableBBIs.map((bbi) => (
                <SelectItem key={bbi.id} value={bbi.id.toString()}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">{bbi.code}</Badge>
                    <span>{bbi.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {indicator.associated_bbi_id && (
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                When this indicator passes/fails, the associated BBI's functionality status will be updated accordingly for the barangay.
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p>
              <strong>BBI Functionality:</strong> Link this indicator to one of the 9 mandatory Barangay-Based Institutions (BDRRMC, BADAC, BPOC, LT, VAW Desk, BDC, BCPC, BNC, BESWMC).
              The indicator's result determines whether the BBI is "Functional" or "Non-Functional".
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
