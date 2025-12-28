"use client";

import React from "react";
import { SulopBarangayMap } from "./SulopBarangayMap";

/**
 * Demo/Example usage of SulopBarangayMap component
 *
 * This file shows how to use the component with sample data.
 * Use this as a reference when integrating into your actual pages.
 */

// Sample data for all 25 Sulop barangays
const SULOP_BARANGAYS = [
  {
    id: "1katipunan",
    name: "Katipunan",
    status: "pass" as const,
    compliance_rate: 92.5,
    submission_count: 15,
  },
  {
    id: "2tanwalang",
    name: "Tanwalang",
    status: "pass" as const,
    compliance_rate: 88.3,
    submission_count: 14,
  },
  {
    id: "3solongvale",
    name: "Solong Vale",
    status: "in_progress" as const,
    compliance_rate: 75.0,
    submission_count: 12,
  },
  {
    id: "4kiblagon",
    name: "Kiblagon",
    status: "pass" as const,
    compliance_rate: 90.1,
    submission_count: 16,
  },
  {
    id: "5osmena",
    name: "Osmeña",
    status: "fail" as const,
    compliance_rate: 45.2,
    submission_count: 8,
  },
  {
    id: "6lapla",
    name: "Lapla",
    status: "pass" as const,
    compliance_rate: 85.7,
    submission_count: 13,
  },
  {
    id: "7clib",
    name: "Clib",
    status: "in_progress" as const,
    compliance_rate: 68.4,
    submission_count: 11,
  },
  {
    id: "8buguis",
    name: "Buguis",
    status: "pass" as const,
    compliance_rate: 91.2,
    submission_count: 15,
  },
  {
    id: "9buas",
    name: "Buas",
    status: "fail" as const,
    compliance_rate: 42.8,
    submission_count: 7,
  },
  {
    id: "10palili",
    name: "Palili",
    status: "pass" as const,
    compliance_rate: 87.6,
    submission_count: 14,
  },
  {
    id: "11tagolilong",
    name: "Tagolilong",
    status: "in_progress" as const,
    compliance_rate: 72.3,
    submission_count: 10,
  },
  {
    id: "12litos",
    name: "Litos",
    status: "pass" as const,
    compliance_rate: 89.4,
    submission_count: 15,
  },
  {
    id: "13ihan",
    name: "Ihan",
    status: "pass" as const,
    compliance_rate: 93.1,
    submission_count: 17,
  },
  {
    id: "14luparan",
    name: "Luparan",
    status: "not_started" as const,
    compliance_rate: 0,
    submission_count: 0,
  },
  {
    id: "15mahayahay",
    name: "Mahayahay",
    status: "in_progress" as const,
    compliance_rate: 65.7,
    submission_count: 9,
  },
  {
    id: "16melilia",
    name: "Melilia",
    status: "pass" as const,
    compliance_rate: 86.9,
    submission_count: 14,
  },
  {
    id: "17newcebu",
    name: "New Cebu",
    status: "pass" as const,
    compliance_rate: 94.2,
    submission_count: 18,
  },
  {
    id: "18parame",
    name: "Parame",
    status: "fail" as const,
    compliance_rate: 38.5,
    submission_count: 6,
  },
  {
    id: "19poblacion",
    name: "Poblacion",
    status: "pass" as const,
    compliance_rate: 95.8,
    submission_count: 20,
  },
  {
    id: "20rizal",
    name: "Rizal",
    status: "pass" as const,
    compliance_rate: 88.7,
    submission_count: 14,
  },
  {
    id: "21sanisidro",
    name: "San Isidro",
    status: "in_progress" as const,
    compliance_rate: 70.1,
    submission_count: 11,
  },
  {
    id: "22salakit",
    name: "Salakit",
    status: "pass" as const,
    compliance_rate: 84.3,
    submission_count: 13,
  },
  {
    id: "23talao",
    name: "Tala-o",
    status: "not_started" as const,
    compliance_rate: 0,
    submission_count: 0,
  },
  {
    id: "24upperloboc",
    name: "Upper Loboc",
    status: "pass" as const,
    compliance_rate: 90.5,
    submission_count: 16,
  },
  {
    id: "25waterfall",
    name: "Waterfall",
    status: "fail" as const,
    compliance_rate: 41.2,
    submission_count: 7,
  },
];

export function SulopBarangayMapDemo() {
  const handleBarangayClick = (barangay: any) => {
    console.log("Barangay clicked:", barangay);
    alert(
      `You clicked: ${barangay.name}\nStatus: ${barangay.status}\nCompliance: ${barangay.compliance_rate}%`
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Sulop Barangay Map Demo</h1>
        <p className="text-gray-600">
          Interactive geographic visualization of Sulop, Davao del Sur barangays
        </p>
      </div>

      <SulopBarangayMap
        barangays={SULOP_BARANGAYS}
        onBarangayClick={handleBarangayClick}
        title="Sulop Barangays Geographic Distribution"
        description="Click on a barangay to view details"
      />

      <div className="bg-white rounded-lg p-6 border">
        <h2 className="text-xl font-semibold mb-4">Statistics Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">
              {SULOP_BARANGAYS.filter((b) => b.status === "pass").length}
            </div>
            <div className="text-sm text-gray-600">Pass</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-3xl font-bold text-red-600">
              {SULOP_BARANGAYS.filter((b) => b.status === "fail").length}
            </div>
            <div className="text-sm text-gray-600">Fail</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-3xl font-bold text-orange-600">
              {SULOP_BARANGAYS.filter((b) => b.status === "in_progress").length}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-gray-600">
              {SULOP_BARANGAYS.filter((b) => b.status === "not_started").length}
            </div>
            <div className="text-sm text-gray-600">Not Started</div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">📍 Next Steps for Integration</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>1.</strong> Open{" "}
            <code className="bg-blue-100 px-1 rounded">SulopBarangayMap.tsx</code> and replace the
            placeholder rectangles with your actual SVG paths
          </p>
          <p>
            <strong>2.</strong> Ensure each path's{" "}
            <code className="bg-blue-100 px-1 rounded">id</code> attribute matches the barangay IDs
            in this demo data
          </p>
          <p>
            <strong>3.</strong> Copy the sample barangay data from this file to use as reference
          </p>
          <p>
            <strong>4.</strong> Integrate the component into your Analytics Dashboard or Reports
            page
          </p>
          <p>
            <strong>5.</strong> Connect to real API data using TanStack Query hooks
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border">
        <h3 className="text-lg font-semibold mb-3">Barangay List</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {SULOP_BARANGAYS.map((brgy) => (
            <div
              key={brgy.id}
              role="button"
              tabIndex={0}
              className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 cursor-pointer"
              onClick={() => handleBarangayClick(brgy)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleBarangayClick(brgy);
                }
              }}
            >
              <span className="text-sm font-medium">{brgy.name}</span>
              <span className="text-xs text-gray-500">{brgy.compliance_rate}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Export the sample data for reuse
export { SULOP_BARANGAYS };
