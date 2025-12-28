"use client";

import { BarChart3, Calendar, Scan } from "lucide-react";

export function OrganizerWorkflowSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content - Steps */}
          <div className="space-y-8">
            <div className="inline-flex items-center space-x-2 bg-[#fbbf24]/10 px-4 py-2 rounded-full border border-[#fbbf24]/20">
              <span className="text-sm font-medium text-gray-700">For Event Organizers</span>
            </div>

            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
              Manage events effortlessly in 3 steps
            </h2>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-[#fbbf24] rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">1. Create Event</h3>
                  <p className="text-gray-600">
                    Set up your event details and generate a unique registration link for attendees.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-[#fbbf24] rounded-full flex items-center justify-center flex-shrink-0">
                  <Scan className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">2. Scan to Record</h3>
                  <p className="text-gray-600">
                    Use the scanner to quickly record attendance by scanning attendee QR codes.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-[#fbbf24] rounded-full flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">3. Track & Report</h3>
                  <p className="text-gray-600">
                    Monitor real-time attendance data and generate detailed reports when needed.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - UI Mockup */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Admin View</h3>
              </div>

              <div className="space-y-6">
                {/* Step 1 Card */}
                <div className="bg-[#fbbf24]/10 rounded-xl p-4 border border-[#fbbf24]/20">
                  <div className="flex items-center space-x-3 mb-2">
                    <Calendar className="w-5 h-5 text-[#fbbf24]" />
                    <span className="font-semibold text-gray-900">1. Create Event</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Set up your event details and generate a unique registration link for attendees.
                  </p>
                </div>

                {/* Step 2 Card */}
                <div className="bg-[#fbbf24]/10 rounded-xl p-4 border border-[#fbbf24]/20">
                  <div className="flex items-center space-x-3 mb-2">
                    <Scan className="w-5 h-5 text-[#fbbf24]" />
                    <span className="font-semibold text-gray-900">2. Scan to Record</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Use the scanner to quickly record attendance by scanning attendee QR codes.
                  </p>
                </div>

                {/* Step 3 Card */}
                <div className="bg-[#fbbf24]/10 rounded-xl p-4 border border-[#fbbf24]/20">
                  <div className="flex items-center space-x-3 mb-2">
                    <BarChart3 className="w-5 h-5 text-[#fbbf24]" />
                    <span className="font-semibold text-gray-900">3. Track & Report</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Monitor real-time attendance data and generate detailed reports when needed.
                  </p>
                </div>
              </div>

              {/* Decorative hand clicking button */}
              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full opacity-20 flex items-center justify-center">
                <div className="w-8 h-8 bg-white rounded-lg shadow-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
