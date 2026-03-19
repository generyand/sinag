"use client";
"use no memo";

import * as React from "react";
import { useCallback, useRef, useState } from "react";

import { MovPreviewControls } from "@/components/shared/MovPreviewControls";

const DEFAULT_ZOOM = 100;
const MIN_ZOOM = 50;
const MAX_ZOOM = 300;
const ZOOM_STEP = 25;

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
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRect, setCurrentRect] = useState<Rect | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState("");
  const [pendingRect, setPendingRect] = useState<Rect | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [rotation, setRotation] = useState(0);

  React.useEffect(() => {
    setZoom(DEFAULT_ZOOM);
    setRotation(0);
    setIsDrawing(false);
    setCurrentRect(null);
    setStartPoint(null);
    setShowCommentInput(false);
    setComment("");
    setPendingRect(null);
    setImageLoaded(false);
  }, [url]);

  const getImagePoint = useCallback(
    (clientX: number, clientY: number) => {
      if (!imageRef.current) return null;

      const image = imageRef.current;
      const rect = image.getBoundingClientRect();
      const baseWidth = image.clientWidth;
      const baseHeight = image.clientHeight;

      if (!rect.width || !rect.height || !baseWidth || !baseHeight) return null;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const scale = zoom / 100;
      const radians = (-rotation * Math.PI) / 180;
      const deltaX = (clientX - centerX) / scale;
      const deltaY = (clientY - centerY) / scale;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);

      return {
        x: deltaX * cos - deltaY * sin + baseWidth / 2,
        y: deltaX * sin + deltaY * cos + baseHeight / 2,
        width: baseWidth,
        height: baseHeight,
      };
    },
    [rotation, zoom]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!annotateEnabled) return;

      const point = getImagePoint(e.clientX, e.clientY);
      if (!point) return;

      if (point.x < 0 || point.y < 0 || point.x > point.width || point.y > point.height) {
        return;
      }

      setIsDrawing(true);
      setStartPoint({ x: point.x, y: point.y });
      setCurrentRect(null);
    },
    [annotateEnabled, getImagePoint]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDrawing || !startPoint) return;

      const point = getImagePoint(e.clientX, e.clientY);
      if (!point) return;

      const clampedCurrentX = Math.max(0, Math.min(point.x, point.width));
      const clampedCurrentY = Math.max(0, Math.min(point.y, point.height));
      const x = Math.min(startPoint.x, clampedCurrentX);
      const y = Math.min(startPoint.y, clampedCurrentY);
      const w = Math.abs(clampedCurrentX - startPoint.x);
      const h = Math.abs(clampedCurrentY - startPoint.y);

      setCurrentRect({
        x: (x / point.width) * 100,
        y: (y / point.height) * 100,
        w: (w / point.width) * 100,
        h: (h / point.height) * 100,
      });
    },
    [getImagePoint, isDrawing, startPoint]
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
  }, [currentRect, isDrawing]);

  const handleSaveAnnotation = useCallback(() => {
    if (!pendingRect || !comment.trim()) return;

    onAdd?.({
      rect: pendingRect,
      comment: comment.trim(),
    });

    setPendingRect(null);
    setComment("");
    setShowCommentInput(false);
  }, [comment, onAdd, pendingRect]);

  const handleCancelAnnotation = useCallback(() => {
    setPendingRect(null);
    setComment("");
    setShowCommentInput(false);
  }, []);

  const renderRect = useCallback((rect: Rect, color: string, opacity: number, note?: string) => {
    return (
      <div
        key={JSON.stringify(rect)}
        className="group absolute"
        style={{
          left: `${rect.x}%`,
          top: `${rect.y}%`,
          width: `${rect.w}%`,
          height: `${rect.h}%`,
          border: `2px solid ${color}`,
          backgroundColor: `${color}${Math.round(opacity * 255)
            .toString(16)
            .padStart(2, "0")}`,
          borderRadius: "0.125rem",
          pointerEvents: note ? "auto" : "none",
        }}
      >
        {note && (
          <div className="invisible group-hover:visible absolute left-0 top-full mt-1 bg-white border border-gray-300 rounded-sm shadow-lg p-2 text-sm text-gray-800 max-w-xs z-50 whitespace-pre-wrap">
            {note}
          </div>
        )}
      </div>
    );
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((currentZoom) => Math.min(MAX_ZOOM, currentZoom + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((currentZoom) => Math.max(MIN_ZOOM, currentZoom - ZOOM_STEP));
  }, []);

  const handleRotateLeft = useCallback(() => {
    setRotation((currentRotation) => (currentRotation + 270) % 360);
  }, []);

  const handleRotateRight = useCallback(() => {
    setRotation((currentRotation) => (currentRotation + 90) % 360);
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    setRotation(0);
  }, []);

  return (
    <div className="relative h-full w-full flex flex-col bg-gray-100">
      <div className="flex items-center justify-end border-b border-gray-200 bg-white/80 px-2 py-1.5">
        <MovPreviewControls
          zoom={zoom}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          zoomStep={ZOOM_STEP}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleResetView}
          onRotateLeft={handleRotateLeft}
          onRotateRight={handleRotateRight}
        />
      </div>

      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className="flex-1 relative overflow-auto flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (!isDrawing) return;
          setIsDrawing(false);
          setStartPoint(null);
          setCurrentRect(null);
        }}
        style={{ cursor: annotateEnabled ? "crosshair" : "default" }}
      >
        <div
          data-testid="image-annotator-stage"
          className="relative inline-block"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transformOrigin: "center center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={url}
            alt="Annotatable document"
            className="max-w-full max-h-full object-contain"
            draggable={false}
            onLoad={() => setImageLoaded(true)}
          />

          <div className="absolute inset-0">
            {imageLoaded &&
              annotations.map((ann) => (
                <React.Fragment key={ann.id}>
                  {renderRect(ann.rect, "#fbbf24", 0.2, ann.comment)}
                </React.Fragment>
              ))}
            {imageLoaded && currentRect && renderRect(currentRect, "#3b82f6", 0.3)}
            {imageLoaded && pendingRect && renderRect(pendingRect, "#10b981", 0.3)}
          </div>
        </div>
      </div>

      {showCommentInput && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm shadow-xl p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">Add Comment</h3>
            <textarea
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

      {annotateEnabled && !showCommentInput && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
          Click and drag to draw a rectangle, then add a comment
        </div>
      )}
    </div>
  );
}
