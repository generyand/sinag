"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ImageAnnotation {
  id: string;
  rect: Rect;
  comment: string;
  createdAt: string;
}

interface ImageAnnotatorProps {
  url: string;
  annotations?: ImageAnnotation[];
  annotateEnabled?: boolean;
  onAdd?: (annotation: { rect: Rect; comment: string }) => void;
}

export default function ImageAnnotator({
  url,
  annotations = [],
  annotateEnabled = true,
  onAdd,
}: ImageAnnotatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRect, setCurrentRect] = useState<Rect | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState("");
  const [pendingRect, setPendingRect] = useState<Rect | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Layout state to avoid reading refs in render
  const [layout, setLayout] = useState<{
    image: DOMRect;
    container: DOMRect;
  } | null>(null);

  const updateLayout = useCallback(() => {
    if (imageRef.current && containerRef.current) {
      setLayout({
        image: imageRef.current.getBoundingClientRect(),
        container: containerRef.current.getBoundingClientRect(),
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener("resize", updateLayout);
    // Also update on scroll as bounds might change
    window.addEventListener("scroll", updateLayout, true);
    return () => {
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("scroll", updateLayout, true);
    };
  }, [updateLayout]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // ... same logic using refs (events are safe) ...
      if (!annotateEnabled || !imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
      setIsDrawing(true);
      setStartPoint({ x, y });
      setCurrentRect(null);
    },
    [annotateEnabled]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDrawing || !startPoint || !imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      const clampedCurrentX = Math.max(0, Math.min(currentX, rect.width));
      const clampedCurrentY = Math.max(0, Math.min(currentY, rect.height));

      const x = Math.min(startPoint.x, clampedCurrentX);
      const y = Math.min(startPoint.y, clampedCurrentY);
      const w = Math.abs(clampedCurrentX - startPoint.x);
      const h = Math.abs(clampedCurrentY - startPoint.y);

      // Re-implement pixelToPercent logic inline or keep using the ref-based one since this is event handler
      const percentStart = {
        x: (x / rect.width) * 100,
        y: (y / rect.height) * 100,
      };
      const percentEnd = {
        x: ((x + w) / rect.width) * 100,
        y: ((y + h) / rect.height) * 100,
      };

      setCurrentRect({
        x: percentStart.x,
        y: percentStart.y,
        w: percentEnd.x - percentStart.x,
        h: percentEnd.y - percentStart.y,
      });
    },
    [isDrawing, startPoint]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentRect) {
      setIsDrawing(false);
      return;
    }
    setIsDrawing(false);
    setStartPoint(null);
    if (currentRect.w > 1 && currentRect.h > 1) {
      setPendingRect(currentRect);
      setShowCommentInput(true);
    }
    setCurrentRect(null);
  }, [isDrawing, currentRect]);

  const handleSaveAnnotation = useCallback(() => {
    if (!pendingRect || !comment.trim()) return;
    onAdd?.({
      rect: pendingRect,
      comment: comment.trim(),
    });
    setPendingRect(null);
    setComment("");
    setShowCommentInput(false);
  }, [pendingRect, comment, onAdd]);

  const handleCancelAnnotation = useCallback(() => {
    setPendingRect(null);
    setComment("");
    setShowCommentInput(false);
  }, []);

  // Render a rectangle overlay with optional comment tooltip
  const renderRect = useCallback(
    (rect: Rect, color: string, opacity: number, comment?: string) => {
      // Use layout state instead of refs
      if (!layout) return null;

      const { image, container } = layout;
      // Also need to use layout for percentToPixel conversion to be consistent
      // percentToPixel helper uses refs, so we inline it or pass layout
      const pixel = {
        x: (rect.x / 100) * image.width,
        y: (rect.y / 100) * image.height,
      };

      const pixelEnd = {
        x: ((rect.x + rect.w) / 100) * image.width,
        y: ((rect.y + rect.h) / 100) * image.height,
      };

      const imageOffsetX = image.left - container.left;
      const imageOffsetY = image.top - container.top;

      return (
        <div
          key={JSON.stringify(rect) /* Ensure key changes if rect changes */}
          className="group"
          style={{
            position: "absolute",
            left: `${imageOffsetX + pixel.x}px`,
            top: `${imageOffsetY + pixel.y}px`,
            width: `${pixelEnd.x - pixel.x}px`,
            height: `${pixelEnd.y - pixel.y}px`,
            border: `2px solid ${color}`,
            backgroundColor: `${color}${Math.round(opacity * 255)
              .toString(16)
              .padStart(2, "0")}`,
            borderRadius: "0.125rem",
            pointerEvents: comment ? "auto" : "none",
          }}
        >
          {comment && (
            <div className="invisible group-hover:visible absolute left-0 top-full mt-1 bg-white border border-gray-300 rounded-sm shadow-lg p-2 text-sm text-gray-800 max-w-xs z-50 whitespace-pre-wrap">
              {comment}
            </div>
          )}
        </div>
      );
    },
    [layout]
  );

  return (
    <div className="relative h-full w-full flex flex-col bg-gray-100">
      {/* Image Container */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-auto flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (isDrawing) {
            setIsDrawing(false);
            setStartPoint(null);
            setCurrentRect(null);
          }
        }}
        style={{ cursor: annotateEnabled ? "crosshair" : "default" }}
      >
        <img
          ref={imageRef}
          src={url}
          alt="Annotatable image"
          className="max-w-full max-h-full object-contain"
          draggable={false}
          onLoad={() => {
            setImageLoaded(true);
            updateLayout();
          }}
        />

        {/* Render existing annotations */}
        {imageLoaded &&
          layout &&
          annotations.map((ann) => (
            <React.Fragment key={ann.id}>
              {renderRect(ann.rect, "#fbbf24", 0.2, ann.comment)}
            </React.Fragment>
          ))}

        {/* Render current drawing rectangle */}
        {imageLoaded && layout && currentRect && renderRect(currentRect, "#3b82f6", 0.3)}

        {/* Render pending rectangle */}
        {imageLoaded && layout && pendingRect && renderRect(pendingRect, "#10b981", 0.3)}
      </div>

      {/* Comment Input Modal */}
      {showCommentInput && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm shadow-xl p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">Add Comment</h3>
            <textarea
              autoFocus
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Enter your comment for this annotation..."
              className="w-full h-32 p-3 border border-gray-300 rounded-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  handleSaveAnnotation();
                }
              }}
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={handleCancelAnnotation}
                className="px-4 py-2 text-sm border border-gray-300 rounded-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAnnotation}
                disabled={!comment.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Annotation
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Tip: Press Ctrl+Enter to save</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      {annotateEnabled && !showCommentInput && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
          Click and drag to draw a rectangle, then add a comment
        </div>
      )}
    </div>
  );
}
