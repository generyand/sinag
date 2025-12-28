"use client";

import { Clock, PenTool, Search } from "lucide-react";

export function ProblemsSection() {
  return (
    <section id="problems" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Common Problems Students & Event Organizers Face
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Traditional attendance methods create unnecessary challenges that waste time and
            compromise accuracy.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Problem 1 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
              <PenTool className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Tedious Manual Writing</h3>
            <p className="text-gray-600 mb-6">
              Illegible handwriting and lost records make it difficult to track attendance
              accurately.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-red-400 rounded-full mr-3"></span>
                Hand cramps from writing
              </li>
              <li className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-red-400 rounded-full mr-3"></span>
                Illegible signatures
              </li>
            </ul>
          </div>

          {/* Problem 2 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6">
              <Search className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Easy to Manipulate Records</h3>
            <p className="text-gray-600 mb-6">
              Forged, altered, or lost records and friends sign for absent classmates.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-orange-400 rounded-full mr-3"></span>
                Fake signatures
              </li>
              <li className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-orange-400 rounded-full mr-3"></span>
                Lost paper records
              </li>
            </ul>
          </div>

          {/* Problem 3 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mb-6">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Significant Time Wasted</h3>
            <p className="text-gray-600 mb-6">
              Long queues and hours manually counting and organizing attendance data.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
                Long waiting lines
              </li>
              <li className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
                Manual data entry
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
