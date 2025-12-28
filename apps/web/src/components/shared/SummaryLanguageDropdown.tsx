"use client";

import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type LanguageCode,
  LANGUAGE_LABELS,
  LANGUAGE_SHORT_LABELS,
} from "@/providers/LanguageProvider";

interface SummaryLanguageDropdownProps {
  /** Current selected language */
  value: LanguageCode;
  /** Callback when language changes */
  onChange: (lang: LanguageCode) => void;
  /** Whether the dropdown should be disabled (e.g., while loading) */
  isLoading?: boolean;
  /** Use compact display (short labels) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Dropdown component for selecting the language of an AI-generated summary.
 *
 * This is used as a per-summary override, allowing users to view summaries
 * in different languages without changing their global preference.
 */
export function SummaryLanguageDropdown({
  value,
  onChange,
  isLoading = false,
  compact = false,
  className = "",
}: SummaryLanguageDropdownProps) {
  const labels = compact ? LANGUAGE_SHORT_LABELS : LANGUAGE_LABELS;

  return (
    <Select
      value={value}
      onValueChange={(val) => onChange(val as LanguageCode)}
      disabled={isLoading}
    >
      <SelectTrigger className={`h-8 gap-2 ${compact ? "w-[140px]" : "w-[180px]"} ${className}`}>
        <Globe className="h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Select language" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ceb">{labels.ceb}</SelectItem>
        <SelectItem value="fil">{labels.fil}</SelectItem>
        <SelectItem value="en">{labels.en}</SelectItem>
      </SelectContent>
    </Select>
  );
}
