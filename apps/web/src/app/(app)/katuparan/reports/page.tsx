'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  Calendar,
  Info,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

/**
 * Katuparan Center Reports Page
 *
 * Data Export & Trends - Allows downloading aggregated data for research
 * All exports contain anonymized, aggregated data only.
 */

interface ReportType {
  id: string;
  name: string;
  description: string;
  formats: ('pdf' | 'csv' | 'txt')[];
  icon: React.ReactNode;
  endpoint: string;
}

const REPORT_TYPES: ReportType[] = [
  {
    id: 'performance-summary',
    name: 'Municipal SGLGB Performance Summary',
    description:
      'Contains aggregated data including overall pass/fail rates, governance area breakdowns, and compliance statistics.',
    formats: ['pdf', 'csv'],
    icon: <FileText className="h-5 w-5" />,
    endpoint: '/api/v1/external/analytics/export',
  },
  {
    id: 'failing-indicators',
    name: 'Top Failing Indicators Report',
    description:
      'A detailed list of indicators ranked by failure rate across the municipality, useful for identifying systemic gaps.',
    formats: ['csv'],
    icon: <FileSpreadsheet className="h-5 w-5" />,
    endpoint: '/api/v1/external/analytics/export/csv',
  },
  {
    id: 'ai-insights',
    name: 'Aggregated AI Insights',
    description:
      'A downloadable version of AI-generated recommendations and capacity development needs based on aggregated assessment data.',
    formats: ['pdf'],
    icon: <FileText className="h-5 w-5" />,
    endpoint: '/api/v1/external/analytics/export/pdf',
  },
];

export default function KatuparanReportsPage() {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  const handleDownload = async (reportId: string, format: 'pdf' | 'csv' | 'txt') => {
    setDownloadingReport(`${reportId}-${format}`);
    setDownloadSuccess(null);
    setDownloadError(null);

    try {
      // Map report type to appropriate endpoint
      let endpoint = '';
      if (format === 'csv') {
        endpoint = '/api/v1/external/analytics/export/csv';
      } else if (format === 'pdf') {
        endpoint = '/api/v1/external/analytics/export/pdf';
      }

      // Use axios instance which handles auth automatically
      const response = await api.get(endpoint, {
        params: { assessment_cycle: selectedYear },
        responseType: 'blob',
      });

      // Get the blob and create download
      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'text/csv',
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = `sinag_report_${reportId}_${selectedYear}.${format}`;
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename=([^;]+)/);
        if (matches && matches[1]) {
          filename = matches[1].replace(/"/g, '');
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setDownloadSuccess(`${reportId}-${format}`);
      toast({
        title: 'Download Complete',
        description: `${filename} has been downloaded successfully.`,
      });
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (error) {
      console.error('Download error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to download report. Please try again.';
      setDownloadError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: errorMessage,
      });
    } finally {
      setDownloadingReport(null);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'txt':
        return <FileText className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'pdf':
        return 'PDF Document';
      case 'csv':
        return 'CSV Spreadsheet';
      case 'txt':
        return 'Text File';
      default:
        return format.toUpperCase();
    }
  };

  return (
    <div className="space-y-6">
      {/* Privacy Notice */}
      <Alert className="bg-blue-50 border-blue-200">
        <ShieldCheck className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Data Privacy:</strong> All downloadable reports contain aggregated and anonymized
          data only. Individual barangay performance is not identifiable in any export.
        </AlertDescription>
      </Alert>

      {/* Error Alert */}
      {downloadError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{downloadError}</AlertDescription>
        </Alert>
      )}

      {/* Filter Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Report Filters</CardTitle>
          </div>
          <CardDescription>Select the assessment year for the reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="year-select" className="text-sm font-medium">
                Assessment Year:
              </label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year-select" className="w-[140px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      CY {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Reports */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Available Reports</h2>

        {REPORT_TYPES.map((report) => (
          <Card key={report.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">{report.icon}</div>
                  <div className="space-y-1">
                    <h3 className="font-semibold">{report.name}</h3>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">Available formats:</span>
                      {report.formats.map((format) => (
                        <Badge key={format} variant="outline" className="text-xs uppercase">
                          {format}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {report.formats.map((format) => {
                    const isDownloading = downloadingReport === `${report.id}-${format}`;
                    const isSuccess = downloadSuccess === `${report.id}-${format}`;

                    return (
                      <Button
                        key={format}
                        variant={isSuccess ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleDownload(report.id, format)}
                        disabled={isDownloading}
                        className={`min-w-[140px] ${isSuccess ? 'bg-green-600 hover:bg-green-600' : ''}`}
                        aria-label={
                          isDownloading
                            ? `Downloading ${report.name} as ${format.toUpperCase()}`
                            : isSuccess
                            ? `${report.name} ${format.toUpperCase()} downloaded successfully`
                            : `Download ${report.name} as ${format.toUpperCase()}`
                        }
                        aria-live="polite"
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Downloading...
                          </>
                        ) : isSuccess ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Downloaded!
                          </>
                        ) : (
                          <>
                            {getFormatIcon(format)}
                            <span className="ml-2">{getFormatLabel(format)}</span>
                          </>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Information Note */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>About these reports:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>All reports are generated from the latest validated assessment data.</li>
                <li>Data is refreshed daily as new assessments are processed.</li>
                <li>
                  Historical data (if available) can be accessed by changing the assessment year
                  filter.
                </li>
                <li>
                  For questions about the data or methodology, please contact the DILG-Sulop office.
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground pt-4 border-t">
        <p className="font-medium">SINAG: SGLGB Insights Nurturing Assessments and Governance</p>
        <p className="mt-1 text-xs">
          To Assess And Assist Barangays utilizing a Large Language Model and Classification
          Algorithm
        </p>
      </div>
    </div>
  );
}
