'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Building2, CheckCircle, XCircle, Clock, FileSearch } from 'lucide-react';
import type { MunicipalComplianceSummary } from '@sinag/shared';

interface ComplianceSummaryCardProps {
  data: MunicipalComplianceSummary;
}

export function ComplianceSummaryCard({ data }: ComplianceSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Municipal Compliance Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-gray-900">{data.total_barangays}</p>
            <p className="text-sm text-gray-600">Total Barangays</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{data.assessed_barangays}</p>
            <p className="text-sm text-gray-600">Assessed</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{data.passed_barangays}</p>
            <p className="text-sm text-gray-600">Passed SGLGB</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-600">{data.failed_barangays}</p>
            <p className="text-sm text-gray-600">Failed SGLGB</p>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Compliance Rate</span>
              <span className="text-sm font-bold text-green-600">{data.compliance_rate.toFixed(1)}%</span>
            </div>
            <Progress value={data.compliance_rate} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Assessment Progress</span>
              <span className="text-sm font-bold text-blue-600">{data.assessment_rate.toFixed(1)}%</span>
            </div>
            <Progress value={data.assessment_rate} className="h-2" />
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {data.pending_mlgoo_approval} Pending Approval
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <FileSearch className="h-3 w-3" />
            {data.in_progress} In Progress
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
