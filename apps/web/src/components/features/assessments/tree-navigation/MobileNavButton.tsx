"use client";

import { Menu } from "lucide-react";

interface MobileNavButtonProps {
  progress: number;
  onClick: () => void;
}

export function MobileNavButton({ progress, onClick }: MobileNavButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[var(--cityscape-yellow)] shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--cityscape-yellow)] focus:ring-offset-2 lg:hidden"
      aria-label="Open assessment navigation"
    >
      {/* Progress Ring */}
      <svg className="absolute inset-0 transform -rotate-90" viewBox="0 0 56 56">
        {/* Background ring */}
        <circle
          cx="28"
          cy="28"
          r="24"
          fill="none"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth="3"
        />
        {/* Progress ring */}
        <circle
          cx="28"
          cy="28"
          r="24"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeDasharray={`${progress * 1.508} ${(100 - progress) * 1.508}`}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>

      {/* Icon */}
      <div className="relative flex items-center justify-center h-full w-full">
        <Menu className="h-6 w-6 text-white" />
      </div>

      {/* Progress Badge */}
      <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-white shadow-md flex items-center justify-center">
        <span className="text-xs font-bold text-[var(--cityscape-yellow)]">{progress}%</span>
      </div>
    </button>
  );
}
