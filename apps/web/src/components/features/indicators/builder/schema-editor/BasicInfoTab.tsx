'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import type { IndicatorNode } from '@/store/useIndicatorBuilderStore';

/**
 * BasicInfoTab Component
 *
 * Per indicator-builder-specification.md lines 1719-1723:
 * - Code (auto-generated or manual)
 * - Name, description
 * - Parent selection
 * - Display order
 */

interface BasicInfoTabProps {
  indicator: IndicatorNode;
  availableParents: Array<{ id: string; code: string; name: string }>;
  onUpdate: (updates: Partial<IndicatorNode>) => void;
}

export function BasicInfoTab({ indicator, availableParents, onUpdate }: BasicInfoTabProps) {
  return (
    <div className="space-y-6 p-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Define the basic properties of this indicator. Code is typically auto-generated from the hierarchy.
        </AlertDescription>
      </Alert>

      {/* Code */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Indicator Code</CardTitle>
          <CardDescription>
            Hierarchical code (e.g., 1, 1.1, 1.1.1). Usually auto-generated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={indicator.code || ''}
            onChange={(e) => onUpdate({ code: e.target.value })}
            placeholder="e.g., 1.1.1"
            className="font-mono"
          />
        </CardContent>
      </Card>

      {/* Name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Indicator Name *</CardTitle>
          <CardDescription>
            Short, descriptive name for the indicator
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={indicator.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Enter indicator name"
            required
          />
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Minimum Requirement</CardTitle>
          <CardDescription>
            Detailed description of what this indicator assesses (plain text)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={indicator.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Enter minimum requirement description..."
            rows={6}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* Parent Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parent Indicator</CardTitle>
          <CardDescription>
            Select the parent indicator in the hierarchy (optional for root indicators)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={(indicator as any).parent_id || 'none'}
            onValueChange={(value) => onUpdate({ parent_id: value === 'none' ? null : value } as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select parent indicator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (Root Indicator)</SelectItem>
              {availableParents.map((parent) => (
                <SelectItem key={parent.id} value={parent.id}>
                  {parent.code ? `${parent.code} - ` : ''}{parent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Display Order */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Display Order</CardTitle>
          <CardDescription>
            Order in which this indicator appears among siblings (lower numbers appear first)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="number"
            value={(indicator as any).display_order ?? 0}
            onChange={(e) => onUpdate({ display_order: parseInt(e.target.value, 10) || 0 } as any)}
            min={0}
            className="w-32"
          />
        </CardContent>
      </Card>
    </div>
  );
}
