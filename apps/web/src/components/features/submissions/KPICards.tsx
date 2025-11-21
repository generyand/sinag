'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubmissionsKPI } from '@/types/submissions';
import { Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react';

interface KPICardsProps {
  kpi: SubmissionsKPI;
}

export function KPICards({ kpi }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Awaiting Review */}
      <Card 
        className="border-[var(--border)] hover:shadow-md transition-all duration-300 group"
        style={{
          background: `linear-gradient(to bottom right, var(--kpi-blue-from), var(--kpi-blue-to))`
        }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold" style={{ color: 'var(--kpi-blue-text)' }}>
            Awaiting Your Review
          </CardTitle>
          <div 
            className="p-2 rounded-full group-hover:scale-110 transition-transform duration-200"
            style={{ backgroundColor: 'var(--kpi-blue-bg)' }}
          >
            <FileText className="h-4 w-4" style={{ color: 'var(--kpi-blue-text)' }} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-1" style={{ color: 'var(--kpi-blue-text)' }}>
            {kpi.awaitingReview}
          </div>
          <p className="text-xs font-medium opacity-70" style={{ color: 'var(--kpi-blue-text)' }}>
            Submissions ready for assessment
          </p>
          {kpi.awaitingReview > 0 && (
            <div className="mt-2 w-full rounded-full h-1" style={{ backgroundColor: 'var(--kpi-blue-bg)' }}>
              <div 
                className="h-1 rounded-full transition-all duration-500"
                style={{ 
                  backgroundColor: 'var(--kpi-blue-progress)',
                  width: `${Math.min((kpi.awaitingReview / 25) * 100, 100)}%` 
                }}
              ></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* In Rework */}
      <Card 
        className="border-[var(--border)] hover:shadow-md transition-all duration-300 group"
        style={{
          background: `linear-gradient(to bottom right, var(--kpi-orange-from), var(--kpi-orange-to))`
        }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold" style={{ color: 'var(--kpi-orange-text)' }}>
            Barangays in Rework
          </CardTitle>
          <div 
            className="p-2 rounded-full group-hover:scale-110 transition-transform duration-200"
            style={{ backgroundColor: 'var(--kpi-orange-bg)' }}
          >
            <AlertCircle className="h-4 w-4" style={{ color: 'var(--kpi-orange-text)' }} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-1" style={{ color: 'var(--kpi-orange-text)' }}>
            {kpi.inRework}
          </div>
          <p className="text-xs font-medium opacity-70" style={{ color: 'var(--kpi-orange-text)' }}>
            Addressing feedback
          </p>
          {kpi.inRework > 0 && (
            <div className="mt-2 w-full rounded-full h-1" style={{ backgroundColor: 'var(--kpi-orange-bg)' }}>
              <div 
                className="h-1 rounded-full transition-all duration-500"
                style={{ 
                  backgroundColor: 'var(--kpi-orange-progress)',
                  width: `${Math.min((kpi.inRework / 25) * 100, 100)}%` 
                }}
              ></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validated */}
      <Card 
        className="border-[var(--border)] hover:shadow-md transition-all duration-300 group"
        style={{
          background: `linear-gradient(to bottom right, var(--kpi-green-from), var(--kpi-green-to))`
        }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold" style={{ color: 'var(--kpi-green-text)' }}>
            Reviewed by You
          </CardTitle>
          <div
            className="p-2 rounded-full group-hover:scale-110 transition-transform duration-200"
            style={{ backgroundColor: 'var(--kpi-green-bg)' }}
          >
            <CheckCircle className="h-4 w-4" style={{ color: 'var(--kpi-green-text)' }} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-1" style={{ color: 'var(--kpi-green-text)' }}>
            {kpi.validated}
          </div>
          <p className="text-xs font-medium opacity-70" style={{ color: 'var(--kpi-green-text)' }}>
            Completed and sent to validator
          </p>
          {kpi.validated > 0 && (
            <div className="mt-2 w-full rounded-full h-1" style={{ backgroundColor: 'var(--kpi-green-bg)' }}>
              <div 
                className="h-1 rounded-full transition-all duration-500"
                style={{ 
                  backgroundColor: 'var(--kpi-green-progress)',
                  width: `${Math.min((kpi.validated / 25) * 100, 100)}%` 
                }}
              ></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Average Review Time */}
      <Card 
        className="border-[var(--border)] hover:shadow-md transition-all duration-300 group"
        style={{
          background: `linear-gradient(to bottom right, var(--kpi-purple-from), var(--kpi-purple-to))`
        }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold" style={{ color: 'var(--kpi-purple-text)' }}>
            Average Review Time
          </CardTitle>
          <div 
            className="p-2 rounded-full group-hover:scale-110 transition-transform duration-200"
            style={{ backgroundColor: 'var(--kpi-purple-bg)' }}
          >
            <Clock className="h-4 w-4" style={{ color: 'var(--kpi-purple-text)' }} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-1" style={{ color: 'var(--kpi-purple-text)' }}>
            {kpi.avgReviewTime}
          </div>
          <p className="text-xs font-medium opacity-70" style={{ color: 'var(--kpi-purple-text)' }}>
            Days per submission
          </p>
          <div className="mt-2 flex items-center space-x-1">
            <div 
              className="w-1 h-1 rounded-full animate-pulse" 
              style={{ backgroundColor: 'var(--kpi-purple-progress)' }}
            ></div>
            <span className="text-xs opacity-70" style={{ color: 'var(--kpi-purple-text)' }}>
              Real-time metric
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 