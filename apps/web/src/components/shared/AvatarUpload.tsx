"use client";

/**
 * AvatarUpload Component
 *
 * A reusable avatar/logo upload component with image cropping functionality.
 * Supports drag-and-drop, file picker, and includes preview before upload.
 */

import { useState, useRef, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { Upload, X, User as UserIcon, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import Image from "next/image";

// Types
interface CroppedAreaPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AvatarUploadProps {
  currentImageUrl?: string | null;
  onUpload: (file: File) => void | Promise<void>;
  onRemove?: () => void | Promise<void>;
  isUploading?: boolean;
  disabled?: boolean;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  error?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
  fallbackInitials?: string;
}

// Utility: Create image from URL
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

// Utility: Get cropped image as blob
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CroppedAreaPixels,
  outputSize: number = 512
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  // Set canvas size to output size
  canvas.width = outputSize;
  canvas.height = outputSize;

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.9
    );
  });
}

// Size configurations
const sizeConfig = {
  sm: { container: "w-24 h-24", icon: "w-8 h-8", text: "text-xs" },
  md: { container: "w-32 h-32", icon: "w-12 h-12", text: "text-sm" },
  lg: { container: "w-40 h-40", icon: "w-16 h-16", text: "text-base" },
};

export function AvatarUpload({
  currentImageUrl,
  onUpload,
  onRemove,
  isUploading = false,
  disabled = false,
  maxSizeMB = 5,
  acceptedFormats = ["image/jpeg", "image/png", "image/webp"],
  error,
  className,
  size = "md",
  fallbackInitials,
}: AvatarUploadProps) {
  // State
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [showRemoveConfirmDialog, setShowRemoveConfirmDialog] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedAreaPixels | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const config = sizeConfig[size];

  // Validate file before processing
  const validateFile = useCallback(
    (file: File): string | null => {
      // Size validation
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `File size exceeds ${maxSizeMB}MB limit`;
      }

      // Format validation
      if (!acceptedFormats.includes(file.type)) {
        const formats = acceptedFormats.map((f) => f.split("/")[1].toUpperCase()).join(", ");
        return `Invalid file type. Accepted: ${formats}`;
      }

      return null;
    },
    [maxSizeMB, acceptedFormats]
  );

  // Handle file selection
  const handleFileSelect = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        setValidationError(error);
        return;
      }

      setValidationError(null);

      // Create preview URL and open crop dialog
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
        setShowCropDialog(true);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      };
      reader.readAsDataURL(file);
    },
    [validateFile]
  );

  // Handle crop complete
  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Handle save cropped image
  const handleSaveCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    setIsCropping(true);
    try {
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels, 512);
      const croppedFile = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });

      await onUpload(croppedFile);
      setShowCropDialog(false);
      setImageToCrop(null);
    } catch (err) {
      console.error("Error cropping image:", err);
      setValidationError("Failed to process image. Please try again.");
    } finally {
      setIsCropping(false);
    }
  };

  // Handle cancel crop
  const handleCancelCrop = () => {
    setShowCropDialog(false);
    setImageToCrop(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  // Handle drag events
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);

    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  // Handle remove - show confirmation first
  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowRemoveConfirmDialog(true);
  };

  // Confirm remove
  const handleConfirmRemove = async () => {
    if (onRemove) {
      setIsRemoving(true);
      try {
        await onRemove();
      } finally {
        setIsRemoving(false);
        setShowRemoveConfirmDialog(false);
      }
    }
  };

  const displayError = validationError || error;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Avatar Display / Upload Area */}
      <div
        className={cn(
          "relative rounded-full border-2 border-dashed transition-all cursor-pointer",
          config.container,
          dragActive && "border-[var(--cityscape-yellow)] bg-[var(--cityscape-yellow)]/10",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && !isUploading && "hover:border-[var(--cityscape-yellow)]",
          !displayError && "border-[var(--border)]",
          displayError && "border-red-500"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload avatar"
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled && !isUploading) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(",")}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isUploading}
          aria-label="Upload avatar file"
        />

        {currentImageUrl ? (
          <Image
            src={currentImageUrl}
            alt="Profile logo"
            fill
            className="rounded-full object-cover"
            sizes="160px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[var(--hover)] rounded-full">
            {fallbackInitials ? (
              <span className={cn("font-semibold text-[var(--text-secondary)]", config.text)}>
                {fallbackInitials}
              </span>
            ) : (
              <UserIcon className={cn("text-[var(--text-secondary)]", config.icon)} />
            )}
          </div>
        )}

        {/* Upload Overlay */}
        {!disabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 hover:opacity-100 transition-opacity">
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-white" />
            )}
          </div>
        )}

        {/* Remove Button */}
        {currentImageUrl && onRemove && !disabled && !isUploading && (
          <button
            onClick={handleRemoveClick}
            className="absolute -top-1 -right-1 p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors shadow-md"
            aria-label="Remove avatar"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className={cn("text-[var(--text-secondary)]", config.text)}>
        <p>Click to upload or drag and drop</p>
        <p className="text-xs mt-0.5">
          {acceptedFormats.map((f) => f.split("/")[1].toUpperCase()).join(", ")} up to {maxSizeMB}MB
        </p>
      </div>

      {/* Error Display */}
      {displayError && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-sm">{displayError}</AlertDescription>
        </Alert>
      )}

      {/* Crop Dialog */}
      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adjust Your Logo</DialogTitle>
            <DialogDescription>
              Drag to reposition and use the slider to zoom. The image will be cropped to a square.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Crop Area */}
            <div className="relative aspect-square bg-[var(--hover)] rounded-lg overflow-hidden">
              {imageToCrop && (
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              )}
            </div>

            {/* Zoom Control */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Zoom</Label>
              <div className="flex items-center gap-3">
                <ZoomOut className="w-4 h-4 text-[var(--text-secondary)]" />
                <Slider
                  value={[zoom]}
                  onValueChange={([value]: number[]) => setZoom(value)}
                  min={1}
                  max={3}
                  step={0.1}
                  className="flex-1"
                />
                <ZoomIn className="w-4 h-4 text-[var(--text-secondary)]" />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelCrop} disabled={isCropping}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveCrop}
              disabled={isCropping}
              className="bg-[var(--cityscape-yellow)] text-[var(--cityscape-accent-foreground)] hover:bg-[var(--cityscape-yellow-dark)]"
            >
              {isCropping ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Save Logo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={showRemoveConfirmDialog} onOpenChange={setShowRemoveConfirmDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Profile Logo</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove your profile logo? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRemoveConfirmDialog(false)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmRemove} disabled={isRemoving}>
              {isRemoving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
