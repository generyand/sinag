'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Building, CheckCircle, XCircle, Clock, FileSearch, Lightbulb } from 'lucide-react';
import { CapDevStatusBadge } from '../capdev';
import type { BarangayStatusList, BarangayAssessmentStatus } from '@sinag/shared';

interface BarangayStatusTableProps {
  data: BarangayStatusList;
  onViewCapDev?: (assessmentId: number) => void;
}

export function BarangayStatusTable({ data, onViewCapDev }: BarangayStatusTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredBarangays = data.barangays.filter((barangay: BarangayAssessmentStatus) => {
    const matchesSearch = barangay.barangay_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || barangay.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-600">Completed</Badge>;
      case 'AWAITING_MLGOO_APPROVAL':
        return <Badge className="bg-yellow-600">Awaiting Approval</Badge>;
      case 'REWORK':
        return <Badge className="bg-orange-600">Rework</Badge>;
      case 'SUBMITTED':
      case 'IN_REVIEW':
        return <Badge className="bg-blue-600">In Review</Badge>;
      case 'DRAFT':
        return <Badge variant="secondary">Draft</Badge>;
      case 'NO_ASSESSMENT':
        return <Badge variant="outline">No Assessment</Badge>;
      case 'NO_USER_ASSIGNED':
        return <Badge variant="outline" className="text-gray-400">No User</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getComplianceBadge = (status: string | null) => {
    if (!status) return null;
    if (status === 'PASSED') {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Passed
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-800">
        <XCircle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Barangay Assessment Status
        </CardTitle>
        <p className="text-sm text-gray-500">
          {data.total_count} barangays total
        </p>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search barangays..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'COMPLETED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('COMPLETED')}
            >
              Completed
            </Button>
            <Button
              variant={statusFilter === 'AWAITING_MLGOO_APPROVAL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('AWAITING_MLGOO_APPROVAL')}
            >
              Pending
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barangay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>CapDev</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBarangays.map((barangay: BarangayAssessmentStatus) => (
                <TableRow key={barangay.barangay_id}>
                  <TableCell className="font-medium">{barangay.barangay_name}</TableCell>
                  <TableCell>{getStatusBadge(barangay.status)}</TableCell>
                  <TableCell>
                    {barangay.compliance_status ? (
                      getComplianceBadge(barangay.compliance_status)
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {barangay.overall_score !== null && barangay.overall_score !== undefined ? (
                      <span className={`font-medium ${barangay.overall_score >= 70 ? 'text-green-600' : barangay.overall_score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {barangay.overall_score.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {barangay.has_capdev_insights ? (
                      <CapDevStatusBadge status={barangay.capdev_status || 'completed'} />
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {barangay.assessment_id && barangay.has_capdev_insights && onViewCapDev && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewCapDev(barangay.assessment_id!)}
                      >
                        <Lightbulb className="h-4 w-4 mr-1" />
                        View CapDev
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredBarangays.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    No barangays found matching your criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
