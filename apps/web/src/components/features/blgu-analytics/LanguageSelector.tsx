"use client";

import { Globe } from "lucide-react";

interface LanguageSelectorProps {
  selectedLanguage: string;
  availableLanguages: string[];
  onLanguageChange: (lang: string) => void;
}

const LANGUAGE_LABELS: Record<string, string> = {
  ceb: "Bisaya",
  en: "English",
  fil: "Tagalog",
};

/**
 * Toggle between available languages for CapDev insights
 */
export function LanguageSelector({
  selectedLanguage,
  availableLanguages,
  onLanguageChange,
}: LanguageSelectorProps) {
  // If no languages available or only one, don't show selector
  if (!availableLanguages || availableLanguages.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">Language:</span>
      </div>
      <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
        {availableLanguages.map((lang) => (
          <button
            key={lang}
            onClick={() => onLanguageChange(lang)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedLanguage === lang
                ? "bg-[var(--cityscape-yellow)] text-[var(--cityscape-accent-foreground)]"
                : "bg-[var(--card)] text-[var(--text-secondary)] hover:bg-[var(--muted)]"
            }`}
          >
            {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
