"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Eye, FileText } from "lucide-react";
import { useState } from "react";

interface TechNotesPDFProps {
  /** The governance area number (1-6) */
  areaNumber: number;
  /** The governance area name for display */
  areaName?: string;
}

/**
 * TechNotesPDF Component
 *
 * Displays a card with view and download options for governance area tech notes PDFs.
 * PDFs are located in /public/TechNotes/area{1-6}.pdf
 * Clicking view opens a fullscreen modal with the PDF.
 */
export function TechNotesPDF({ areaNumber, areaName }: TechNotesPDFProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Validate area number (1-6)
  if (areaNumber < 1 || areaNumber > 6) {
    return null;
  }

  const pdfPath = `/TechNotes/area${areaNumber}.pdf`;
  const displayName = areaName || `Area ${areaNumber}`;

  const handleView = () => {
    setIsModalOpen(true);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = pdfPath;
    link.download = `TechNotes-Area${areaNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2 bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Technical Notes
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          {/* File Info Card */}
          <div className="bg-white dark:bg-slate-800 rounded-md border border-amber-200 dark:border-amber-700 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    Tech Notes - {displayName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">PDF Document</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleView}
                  className="h-8 w-8 p-0"
                  title="View PDF"
                >
                  <Eye className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="h-8 w-8 p-0"
                  title="Download PDF"
                >
                  <Download className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen PDF Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0 pb-2 border-b">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-600" />
                Technical Notes - {displayName}
              </DialogTitle>
              <Button variant="outline" size="sm" onClick={handleDownload} className="h-8">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 mt-2">
            <iframe
              src={pdfPath}
              className="w-full h-full border rounded-md"
              title={`Tech Notes - ${displayName}`}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
