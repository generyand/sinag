"use client";

import { QrCode, Smartphone, User } from "lucide-react";

export function StudentWorkflowSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content - Steps */}
          <div className="space-y-8">
            <div className="inline-flex items-center space-x-2 bg-[#fbbf24]/10 px-4 py-2 rounded-full border border-[#fbbf24]/20">
              <span className="text-sm font-medium text-gray-700">For Students</span>
            </div>

            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
              Simple steps to join any event
            </h2>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-[#fbbf24] rounded-full flex items-center justify-center flex-shrink-0">
                  <QrCode className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    1. Register & Save QR Code
                  </h3>
                  <p className="text-gray-600">
                    Complete your registration and save your unique QR code to your device for quick
                    access.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-[#fbbf24] rounded-full flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    2. Present Your QR Code
                  </h3>
                  <p className="text-gray-600">
                    Show your QR code to the event scanner for instant attendance recording.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-[#fbbf24] rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">3. Enjoy the Event</h3>
                  <p className="text-gray-600">
                    Relax and enjoy the event knowing your attendance has been automatically
                    recorded.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - UI Mockup */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Student View</h3>
              </div>

              <div className="space-y-6">
                {/* Step 1 Card */}
                <div className="bg-[#fbbf24]/10 rounded-xl p-4 border border-[#fbbf24]/20">
                  <div className="flex items-center space-x-3 mb-2">
                    <QrCode className="w-5 h-5 text-[#fbbf24]" />
                    <span className="font-semibold text-gray-900">1. Register & Save QR Code</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Complete your registration and save your unique QR code to your device for quick
                    access.
                  </p>
                </div>

                {/* Step 2 Card */}
                <div className="bg-[#fbbf24]/10 rounded-xl p-4 border border-[#fbbf24]/20">
                  <div className="flex items-center space-x-3 mb-2">
                    <Smartphone className="w-5 h-5 text-[#fbbf24]" />
                    <span className="font-semibold text-gray-900">2. Present Your QR Code</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Show your QR code to the event scanner for instant attendance recording.
                  </p>
                </div>

                {/* Step 3 Card */}
                <div className="bg-[#fbbf24]/10 rounded-xl p-4 border border-[#fbbf24]/20">
                  <div className="flex items-center space-x-3 mb-2">
                    <User className="w-5 h-5 text-[#fbbf24]" />
                    <span className="font-semibold text-gray-900">3. Enjoy the Event</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Relax and enjoy the event knowing your attendance has been automatically
                    recorded.
                  </p>
                </div>
              </div>

              {/* Decorative blob character */}
              <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
