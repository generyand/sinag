"use client";

import { useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, Eye, Code2 } from "lucide-react";

export type ViewMode = "builder" | "preview" | "json";

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

/**
 * ViewModeToggle Component
 *
 * Three-way toggle for switching between Builder, Preview, and JSON views.
 *
 * Features:
 * - Three modes: Builder, Preview, JSON
 * - Keyboard shortcuts: Ctrl+1, Ctrl+2, Ctrl+3
 * - Visual active state
 * - Icons for each mode
 */
export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl/Cmd key
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "1":
            e.preventDefault();
            onChange("builder");
            break;
          case "2":
            e.preventDefault();
            onChange("preview");
            break;
          case "3":
            e.preventDefault();
            onChange("json");
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onChange]);

  return (
    <div className="flex items-center gap-3">
      <Tabs value={value} onValueChange={(v) => onChange(v as ViewMode)}>
        <TabsList>
          <TabsTrigger value="builder" className="gap-2">
            <Settings2 className="h-4 w-4" />
            <span>Builder</span>
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-[var(--border)] bg-[var(--muted)]/20 px-1.5 font-mono text-[10px] font-medium text-[var(--muted-foreground)] opacity-60">
              <span className="text-xs">⌘</span>1
            </kbd>
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="h-4 w-4" />
            <span>Preview</span>
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-[var(--border)] bg-[var(--muted)]/20 px-1.5 font-mono text-[10px] font-medium text-[var(--muted-foreground)] opacity-60">
              <span className="text-xs">⌘</span>2
            </kbd>
          </TabsTrigger>
          <TabsTrigger value="json" className="gap-2">
            <Code2 className="h-4 w-4" />
            <span>JSON</span>
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-[var(--border)] bg-[var(--muted)]/20 px-1.5 font-mono text-[10px] font-medium text-[var(--muted-foreground)] opacity-60">
              <span className="text-xs">⌘</span>3
            </kbd>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="text-xs text-[var(--text-secondary)]">
        {value === "builder" && "Build and configure your form"}
        {value === "preview" && "See how it looks to users"}
        {value === "json" && "View and copy JSON schema"}
      </div>
    </div>
  );
}
