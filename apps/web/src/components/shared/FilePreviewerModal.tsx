"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, FileText, Image, Video, X } from "lucide-react";
import { useEffect, useState } from "react";

interface FilePreviewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName?: string;
  fileType?: string;
}

export function FilePreviewerModal({
  isOpen,
  onClose,
  fileUrl,
  fileName = "File",
  fileType,
}: FilePreviewerModalProps) {
  const [detectedFileType, setDetectedFileType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Detect file type from URL or provided type
  useEffect(() => {
    if (fileType) {
      setDetectedFileType(fileType);
    } else {
      const clean = fileUrl.split('#')[0].split('?')[0];
      const extension = clean.split('.').pop()?.toLowerCase();
      setDetectedFileType(extension || "");
    }
    setIsLoading(false);
    setHasError(false);
  }, [fileUrl, fileType]);

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (type.includes('image')) return <Image className="h-8 w-8 text-blue-500" />;
    if (type.includes('video')) return <Video className="h-8 w-8 text-purple-500" />;
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  const isImage = (type: string) => {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(type.toLowerCase());
  };

  const isVideo = (type: string) => {
    return ['mp4', 'webm', 'ogg', 'avi', 'mov'].includes(type.toLowerCase());
  };

  const isPDF = (type: string) => {
    return type.toLowerCase() === 'pdf';
  };

  const renderFileContent = () => {
    if (hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <FileText className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Unable to Preview</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            This file type cannot be previewed in the browser.
          </p>
          <Button onClick={() => window.open(fileUrl, '_blank')} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download File
          </Button>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      );
    }

    if (isImage(detectedFileType)) {
      return (
        <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-800/50">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            onError={() => setHasError(true)}
            onLoad={() => setIsLoading(false)}
          />
        </div>
      );
    }

    if (isVideo(detectedFileType)) {
      return (
        <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-800/50">
          <video
            src={fileUrl}
            controls
            className="max-w-full max-h-full rounded-lg shadow-lg"
            onError={() => setHasError(true)}
            onLoadedData={() => setIsLoading(false)}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (isPDF(detectedFileType)) {
      return (
        <div className="h-96 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <iframe
            src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
            className="w-full h-full rounded-lg"
            title={fileName}
            onError={() => setHasError(true)}
            onLoad={() => setIsLoading(false)}
          />
        </div>
      );
    }

    // For other file types, show download option
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        {getFileIcon(detectedFileType)}
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 mt-4">{fileName}</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          This file type cannot be previewed in the browser.
        </p>
        <Button onClick={() => window.open(fileUrl, '_blank')} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download File
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="flex items-center gap-2">
            {getFileIcon(detectedFileType)}
            <span className="truncate">{fileName}</span>
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="overflow-auto">
          {renderFileContent()}
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => window.open(fileUrl, '_blank')}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

