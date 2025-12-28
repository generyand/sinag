"use client";

import { Menu } from "lucide-react";
import { useEffect, useState } from "react";

interface MobileNavButtonProps {
  progress: number;
  onClick: () => void;
}

export function MobileNavButton({ progress, onClick }: MobileNavButtonProps) {
  const [showPulse, setShowPulse] = useState(false);

  // Show pulse animation on first visit to help users discover the button
  useEffect(() => {
    const hasSeenMobileNav = sessionStorage.getItem("sinag-mobile-nav-seen");
    if (!hasSeenMobileNav) {
      setShowPulse(true);
      // Stop pulsing after 10 seconds or when user clicks
      const timer = setTimeout(() => {
        setShowPulse(false);
        sessionStorage.setItem("sinag-mobile-nav-seen", "true");
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClick = () => {
    if (showPulse) {
      setShowPulse(false);
      sessionStorage.setItem("sinag-mobile-nav-seen", "true");
    }
    onClick();
  };

  return (
    <>
      {/* Pulsing backdrop for first-time users - hide on tablet+ */}
      {showPulse && (
        <div
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-[var(--cityscape-yellow)] opacity-40 animate-ping md:hidden pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Main button - hide on tablet+ (md: 768px) */}
      <button
        onClick={handleClick}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[var(--cityscape-yellow)] shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--cityscape-yellow)] focus:ring-offset-2 md:hidden active:scale-95"
        aria-label={`Open assessment navigation (${progress}% complete)`}
        style={{
          // Minimum touch target size for accessibility
          minWidth: "44px",
          minHeight: "44px",
        }}
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
          <Menu className="h-6 w-6 text-white" aria-hidden="true" />
        </div>

        {/* Progress Badge */}
        <div
          className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-white shadow-md flex items-center justify-center"
          aria-hidden="true"
        >
          <span className="text-xs font-bold text-[var(--cityscape-yellow)]">{progress}%</span>
        </div>
      </button>
    </>
  );
}
