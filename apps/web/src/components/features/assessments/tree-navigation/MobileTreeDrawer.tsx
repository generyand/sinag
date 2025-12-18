"use client";

import { Assessment } from "@/types/assessment";
import { X } from "lucide-react";
import { useEffect } from "react";
import { TreeNavigator } from "./TreeNavigator";

interface MobileTreeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment;
  selectedIndicatorId: string | null;
  onIndicatorSelect: (indicatorId: string) => void;
}

export function MobileTreeDrawer({
  isOpen,
  onClose,
  assessment,
  selectedIndicatorId,
  onIndicatorSelect,
}: MobileTreeDrawerProps) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleIndicatorSelect = (indicatorId: string) => {
    onIndicatorSelect(indicatorId);
    onClose(); // Close drawer after selection
  };

  return (
    <>
      {/* Backdrop - hide on tablet+ */}
      <div
        className={`
          fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer - hide on tablet+ (md: 768px) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-nav-title"
        className={`
          fixed bottom-0 left-0 right-0 z-50 bg-[var(--card)] rounded-t-2xl shadow-2xl
          transition-transform duration-300 ease-out md:hidden
          ${isOpen ? "translate-y-0" : "translate-y-full"}
        `}
        style={{
          maxHeight: "80vh",
        }}
      >
        {/* Handle Bar */}
        <div className="flex items-center justify-center pt-2 pb-1" aria-hidden="true">
          <div className="w-12 h-1 bg-[var(--border)] rounded-sm" />
        </div>

        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h2 id="mobile-nav-title" className="text-lg font-semibold text-[var(--foreground)]">
            Assessment Navigation
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-sm hover:bg-[var(--hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--cityscape-yellow)]"
            aria-label="Close navigation drawer"
          >
            <X className="h-5 w-5 text-[var(--text-secondary)]" aria-hidden="true" />
          </button>
        </header>

        {/* Content */}
        <div
          className="overflow-y-auto"
          style={{
            maxHeight: "calc(80vh - 80px)",
          }}
        >
          <TreeNavigator
            assessment={assessment}
            selectedIndicatorId={selectedIndicatorId}
            onIndicatorSelect={handleIndicatorSelect}
          />
        </div>
      </div>
    </>
  );
}
