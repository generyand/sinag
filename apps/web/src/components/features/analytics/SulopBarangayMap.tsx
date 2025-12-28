"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Barangay data structure
 */
interface BarangayData {
  id: string; // e.g., "1katipunan", "2tanwalang"
  name: string; // Display name
  status: "pass" | "fail" | "in_progress" | "not_started";
  compliance_rate?: number;
  submission_count?: number;
}

interface SulopBarangayMapProps {
  barangays: BarangayData[];
  onBarangayClick?: (barangay: BarangayData) => void;
  title?: string;
  description?: string;
}

/**
 * Color scheme for barangay status
 */
const STATUS_COLORS = {
  pass: "#22c55e", // Green
  fail: "#ef4444", // Red
  in_progress: "#f59e0b", // Orange
  not_started: "#94a3b8", // Gray
} as const;

const STATUS_LABELS = {
  pass: "Pass",
  fail: "Fail",
  in_progress: "In Progress",
  not_started: "Not Started",
} as const;

/**
 * Custom SVG-based interactive map for Sulop, Davao del Sur barangays
 *
 * This component renders an interactive SVG map with clickable barangay boundaries.
 * Each barangay can be color-coded based on performance data.
 *
 * To use this component:
 * 1. Place your Sulop barangay SVG file in /public/maps/sulop-barangays.svg
 * 2. Ensure each <path> element has an id attribute matching the barangay ID
 * 3. Pass barangay data with matching IDs to this component
 *
 * Example SVG structure:
 * <svg viewBox="0 0 1000 1000">
 *   <path id="1katipunan" d="M..." />
 *   <path id="2tanwalang" d="M..." />
 *   ...
 * </svg>
 */
export function SulopBarangayMap({
  barangays,
  onBarangayClick,
  title = "Sulop Barangays Geographic Distribution",
  description = "Click on a barangay to view details",
}: SulopBarangayMapProps) {
  const [hoveredBarangay, setHoveredBarangay] = useState<string | null>(null);
  const [selectedBarangay, setSelectedBarangay] = useState<string | null>(null);

  // Create a lookup map for quick barangay data access
  const barangayMap = React.useMemo(() => {
    const map = new Map<string, BarangayData>();
    barangays.forEach((brgy) => map.set(brgy.id, brgy));
    return map;
  }, [barangays]);

  // Get color for a barangay based on its status
  const getBarangayColor = (barangayId: string): string => {
    const brgy = barangayMap.get(barangayId);
    if (!brgy) return STATUS_COLORS.not_started;
    return STATUS_COLORS[brgy.status];
  };

  // Handle barangay path click
  const handleBarangayClick = (barangayId: string) => {
    const brgy = barangayMap.get(barangayId);
    if (brgy) {
      setSelectedBarangay(barangayId);
      onBarangayClick?.(brgy);
    }
  };

  // Get currently displayed barangay (hovered or selected)
  const displayedBarangay = barangayMap.get(hoveredBarangay || selectedBarangay || "");

  // Count barangays by status
  const statusCounts = React.useMemo(() => {
    const counts = {
      pass: 0,
      fail: 0,
      in_progress: 0,
      not_started: 0,
    };
    barangays.forEach((brgy) => {
      counts[brgy.status]++;
    });
    return counts;
  }, [barangays]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>

        {/* Status Legend */}
        <div className="flex flex-wrap gap-2 pt-2">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <Badge key={status} variant="outline" className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs">
                {STATUS_LABELS[status as keyof typeof STATUS_LABELS]} (
                {statusCounts[status as keyof typeof statusCounts]})
              </span>
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map Container */}
          <div className="lg:col-span-2">
            <div className="relative w-full aspect-square bg-gray-50 rounded-lg overflow-hidden border">
              <svg viewBox="0 0 1000 1000" className="w-full h-full" style={{ maxHeight: "600px" }}>
                {/* Background */}
                <rect width="1000" height="1000" fill="#f8fafc" />

                {/* Title */}
                <text
                  x="500"
                  y="30"
                  textAnchor="middle"
                  className="text-lg font-semibold"
                  fill="#1e293b"
                >
                  Sulop, Davao del Sur
                </text>

                {/* Placeholder for barangay paths */}
                {/*
                  To integrate your custom SVG:
                  1. Copy the <path> elements from your Sulop SVG file
                  2. Paste them here, replacing the sample paths below
                  3. Ensure each path has an id attribute matching barangay IDs

                  Example:
                  <path
                    id="1katipunan"
                    d="M 100 100 L 200 100 L 200 200 L 100 200 Z"
                    fill={getBarangayColor('1katipunan')}
                    stroke="#000"
                    strokeWidth={selectedBarangay === '1katipunan' ? 3 : 1}
                    className="cursor-pointer transition-all duration-200 hover:brightness-110"
                    onClick={() => handleBarangayClick('1katipunan')}
                    onMouseEnter={() => setHoveredBarangay('1katipunan')}
                    onMouseLeave={() => setHoveredBarangay(null)}
                  />
                */}

                {/* Sample barangay paths - Replace with your actual SVG paths */}
                {barangays.map((brgy, index) => {
                  // Generate placeholder positions in a grid
                  const cols = 5;
                  const size = 150;
                  const padding = 50;
                  const x = (index % cols) * (size + padding) + 100;
                  const y = Math.floor(index / cols) * (size + padding) + 100;

                  return (
                    <g key={brgy.id}>
                      <rect
                        x={x}
                        y={y}
                        width={size}
                        height={size}
                        fill={getBarangayColor(brgy.id)}
                        stroke="#1e293b"
                        strokeWidth={
                          selectedBarangay === brgy.id || hoveredBarangay === brgy.id ? 3 : 1
                        }
                        className="cursor-pointer transition-all duration-200 hover:brightness-110"
                        onClick={() => handleBarangayClick(brgy.id)}
                        onMouseEnter={() => setHoveredBarangay(brgy.id)}
                        onMouseLeave={() => setHoveredBarangay(null)}
                      />
                      <text
                        x={x + size / 2}
                        y={y + size / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs font-medium pointer-events-none"
                        fill="#fff"
                      >
                        {brgy.name}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Hover Tooltip */}
              {hoveredBarangay && displayedBarangay && (
                <div className="absolute top-2 left-2 bg-white shadow-lg rounded-lg p-3 border pointer-events-none z-10">
                  <div className="text-sm font-semibold">{displayedBarangay.name}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Status:{" "}
                    <span
                      className="font-medium"
                      style={{ color: STATUS_COLORS[displayedBarangay.status] }}
                    >
                      {STATUS_LABELS[displayedBarangay.status]}
                    </span>
                  </div>
                  {displayedBarangay.compliance_rate !== undefined && (
                    <div className="text-xs text-gray-600">
                      Compliance: {displayedBarangay.compliance_rate.toFixed(1)}%
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg p-4 border h-full">
              <h3 className="text-sm font-semibold mb-3">Barangay Details</h3>

              {displayedBarangay ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-lg font-bold text-gray-900">{displayedBarangay.name}</div>
                    <div className="text-xs text-gray-500">ID: {displayedBarangay.id}</div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-600">Status:</span>
                      <Badge
                        style={{
                          backgroundColor: STATUS_COLORS[displayedBarangay.status],
                          color: "white",
                        }}
                      >
                        {STATUS_LABELS[displayedBarangay.status]}
                      </Badge>
                    </div>

                    {displayedBarangay.compliance_rate !== undefined && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600">Compliance Rate:</span>
                        <span className="text-sm font-semibold">
                          {displayedBarangay.compliance_rate.toFixed(1)}%
                        </span>
                      </div>
                    )}

                    {displayedBarangay.submission_count !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Submissions:</span>
                        <span className="text-sm font-semibold">
                          {displayedBarangay.submission_count}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-8">
                  Hover over or click a barangay to view details
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions for Integration */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm font-semibold text-blue-900 mb-2">
            📍 Integration Instructions
          </div>
          <div className="text-xs text-blue-800 space-y-1">
            <p>
              <strong>1.</strong> Place your Sulop barangay SVG file in{" "}
              <code className="bg-blue-100 px-1 rounded">/public/maps/sulop-barangays.svg</code>
            </p>
            <p>
              <strong>2.</strong> Open this file and replace the placeholder{" "}
              <code className="bg-blue-100 px-1 rounded">&lt;rect&gt;</code> elements in the SVG
              with your actual <code className="bg-blue-100 px-1 rounded">&lt;path&gt;</code>{" "}
              elements
            </p>
            <p>
              <strong>3.</strong> Ensure each path has an{" "}
              <code className="bg-blue-100 px-1 rounded">id</code> attribute matching barangay IDs
              (e.g., "1katipunan", "2tanwalang")
            </p>
            <p>
              <strong>4.</strong> The component will automatically color-code each barangay based on
              performance data
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
