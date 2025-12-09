"use client";

import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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

interface SulopBarangayMapLeafletProps {
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
 * Sulop, Davao del Sur coordinates
 * Center of the municipality
 */
const SULOP_CENTER: [number, number] = [6.4833, 125.4667]; // Sulop, Davao del Sur
const DEFAULT_ZOOM = 12;

/**
 * Sample GeoJSON data for Sulop barangays
 *
 * To integrate your actual SVG:
 * 1. Convert your SVG paths to GeoJSON using:
 *    - QGIS (Open Source GIS software)
 *    - mapshaper.org (online tool)
 *    - svg2geojson library
 * 2. Replace this sampleGeoJSON with your converted data
 * 3. Ensure each feature has a 'properties.id' matching barangay IDs
 */
const sampleGeoJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { id: "1katipunan", name: "Katipunan" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [125.45, 6.5],
            [125.47, 6.5],
            [125.47, 6.48],
            [125.45, 6.48],
            [125.45, 6.5],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { id: "2tanwalang", name: "Tanwalang" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [125.47, 6.5],
            [125.49, 6.5],
            [125.49, 6.48],
            [125.47, 6.48],
            [125.47, 6.5],
          ],
        ],
      },
    },
    // Add more barangays here...
    // This is placeholder data - replace with your actual GeoJSON
  ],
};

/**
 * Custom map component to fit bounds
 */
function FitBounds({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds);
    }
  }, [bounds, map]);

  return null;
}

/**
 * Leaflet-based interactive map for Sulop, Davao del Sur barangays
 *
 * This version uses Leaflet with GeoJSON for barangay boundaries.
 *
 * Advantages over pure SVG:
 * - Pan and zoom functionality
 * - Street map context (OpenStreetMap tiles)
 * - Easy integration with other Leaflet plugins
 * - Standard GIS workflow (can import from QGIS, etc.)
 *
 * Disadvantages:
 * - Requires GeoJSON conversion from SVG
 * - Larger bundle size (Leaflet library)
 * - More complex coordinate system handling
 */
export function SulopBarangayMapLeaflet({
  barangays,
  onBarangayClick,
  title = "Sulop Barangays Geographic Distribution",
  description = "Click on a barangay to view details",
}: SulopBarangayMapLeafletProps) {
  const [hoveredBarangay, setHoveredBarangay] = useState<string | null>(null);
  const [selectedBarangay, setSelectedBarangay] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

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

  // Style function for GeoJSON features
  const styleFeature = (feature: any) => {
    const barangayId = feature.properties.id;
    const isSelected = selectedBarangay === barangayId;
    const isHovered = hoveredBarangay === barangayId;

    return {
      fillColor: getBarangayColor(barangayId),
      weight: isSelected || isHovered ? 3 : 1,
      opacity: 1,
      color: "#1e293b",
      fillOpacity: 0.7,
    };
  };

  // Event handlers for GeoJSON features
  const onEachFeature = (feature: any, layer: L.Layer) => {
    const barangayId = feature.properties.id;
    const brgy = barangayMap.get(barangayId);

    if (!brgy) return;

    // Bind popup
    layer.bindPopup(`
      <div class="text-sm">
        <div class="font-bold text-base mb-1">${brgy.name}</div>
        <div class="text-gray-600">Status: <span style="color: ${STATUS_COLORS[brgy.status]}">${STATUS_LABELS[brgy.status]}</span></div>
        ${brgy.compliance_rate !== undefined ? `<div class="text-gray-600">Compliance: ${brgy.compliance_rate.toFixed(1)}%</div>` : ""}
        ${brgy.submission_count !== undefined ? `<div class="text-gray-600">Submissions: ${brgy.submission_count}</div>` : ""}
      </div>
    `);

    // Mouse events
    layer.on({
      mouseover: (e: L.LeafletMouseEvent) => {
        setHoveredBarangay(barangayId);
        const layer = e.target;
        layer.setStyle({
          weight: 3,
          fillOpacity: 0.9,
        });
      },
      mouseout: (e: L.LeafletMouseEvent) => {
        setHoveredBarangay(null);
        const layer = e.target;
        layer.setStyle({
          weight: selectedBarangay === barangayId ? 3 : 1,
          fillOpacity: 0.7,
        });
      },
      click: (e: L.LeafletMouseEvent) => {
        setSelectedBarangay(barangayId);
        onBarangayClick?.(brgy);
        e.target.openPopup();
      },
    });
  };

  // Calculate bounds when GeoJSON loads
  useEffect(() => {
    const bounds = L.geoJSON(sampleGeoJSON).getBounds();
    setMapBounds(bounds);
  }, [mapBounds]);

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
            <div className="relative w-full h-[600px] rounded-lg overflow-hidden border">
              <MapContainer
                center={SULOP_CENTER}
                zoom={DEFAULT_ZOOM}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
              >
                {/* OpenStreetMap Tiles */}
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Barangay Boundaries (GeoJSON) */}
                <GeoJSON data={sampleGeoJSON} style={styleFeature} onEachFeature={onEachFeature} />

                {/* Fit bounds to show all barangays */}
                {mapBounds && <FitBounds bounds={mapBounds} />}
              </MapContainer>
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

        {/* Integration Instructions */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm font-semibold text-blue-900 mb-2">
            📍 SVG to GeoJSON Conversion Methods
          </div>
          <div className="text-xs text-blue-800 space-y-2">
            <p className="font-semibold">Option 1: Online Tools (Easiest)</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>
                <a
                  href="https://mapshaper.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  mapshaper.org
                </a>{" "}
                - Upload SVG, export as GeoJSON
              </li>
              <li>
                <a
                  href="https://geojson.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  geojson.io
                </a>{" "}
                - Manual boundary drawing and GeoJSON export
              </li>
            </ul>

            <p className="font-semibold pt-2">Option 2: QGIS (Most Accurate)</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Open QGIS (free GIS software)</li>
              <li>Import your SVG as a layer</li>
              <li>Georeference to real coordinates</li>
              <li>Export as GeoJSON</li>
            </ul>

            <p className="font-semibold pt-2">Option 3: Programming (Most Control)</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>
                Use <code className="bg-blue-100 px-1 rounded">svg-path-parser</code> library
              </li>
              <li>Parse SVG paths to coordinates</li>
              <li>Transform to lat/lng (requires bounds mapping)</li>
              <li>Generate GeoJSON programmatically</li>
            </ul>

            <p className="pt-2 font-semibold">After conversion:</p>
            <ul className="list-disc list-inside ml-2">
              <li>
                Replace <code className="bg-blue-100 px-1 rounded">sampleGeoJSON</code> in this file
              </li>
              <li>
                Ensure each feature has{" "}
                <code className="bg-blue-100 px-1 rounded">properties.id</code> matching barangay
                IDs
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
