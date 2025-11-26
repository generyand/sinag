"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BarangayMapPoint } from "@sinag/shared";

// Fix Leaflet default marker icon issue in Next.js
// This is needed because webpack doesn't properly bundle the default marker images
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface BarangayMapProps {
  barangays: BarangayMapPoint[];
}

// Default center for Tubod municipality, Lanao del Norte
const DEFAULT_CENTER: [number, number] = [8.0525, 123.8097];
const DEFAULT_ZOOM = 13;

// Helper function to get marker color based on status
const getMarkerColor = (status: string): string => {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus.includes("pass")) return "#10b981"; // green-500
  if (normalizedStatus.includes("fail")) return "#ef4444"; // red-500
  if (normalizedStatus.includes("progress")) return "#f59e0b"; // amber-500
  return "#94a3b8"; // slate-400 for unknown
};

// Create custom marker icon based on status
const createCustomIcon = (status: string) => {
  const color = getMarkerColor(status);
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

export function BarangayMap({ barangays }: BarangayMapProps) {
  // Handle empty data
  if (!barangays || barangays.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-muted/30 rounded-md border border-dashed">
        <p className="text-sm text-muted-foreground">
          No barangay location data available
        </p>
      </div>
    );
  }

  // Filter barangays with valid coordinates
  const validBarangays = barangays.filter(
    (b) => b.lat !== null && b.lat !== undefined && b.lng !== null && b.lng !== undefined
  );

  // Calculate center from barangays with coordinates, or use default
  const center: [number, number] =
    validBarangays.length > 0
      ? [validBarangays[0].lat as number, validBarangays[0].lng as number]
      : DEFAULT_CENTER;

  // Show warning if some barangays don't have coordinates
  const missingCount = barangays.length - validBarangays.length;

  return (
    <div className="space-y-2">
      {missingCount > 0 && (
        <p className="text-xs text-muted-foreground">
          Note: {missingCount} barangay{missingCount > 1 ? "s" : ""} without
          location data
        </p>
      )}
      <div className="h-[400px] rounded-md overflow-hidden border border-border">
        <MapContainer
          center={center}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={true}
          className="h-full w-full"
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {validBarangays.map((barangay) => (
            <Marker
              key={barangay.barangay_id}
              position={[barangay.lat as number, barangay.lng as number]}
              icon={createCustomIcon(barangay.status)}
            >
              <Popup>
                <div className="text-sm space-y-1">
                  <p className="font-semibold">{barangay.name}</p>
                  <p className="text-xs">
                    Status:{" "}
                    <span
                      className="font-medium"
                      style={{ color: getMarkerColor(barangay.status) }}
                    >
                      {barangay.status}
                    </span>
                  </p>
                  {barangay.score !== null &&
                    barangay.score !== undefined && (
                      <p className="text-xs">
                        Score: {barangay.score.toFixed(1)}%
                      </p>
                    )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
