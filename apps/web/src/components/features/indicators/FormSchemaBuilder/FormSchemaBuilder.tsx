"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { useFormBuilderStore } from "@/store/useFormBuilderStore";
import { FieldPalette } from "./FieldPalette";
import { FieldCanvasItem } from "./FieldCanvasItem";
import { FieldPropertiesPanel } from "./FieldPropertiesPanel";
import { FormPreview } from "./FormPreview";
import { JsonViewer } from "./JsonViewer";
import { ViewModeToggle, type ViewMode } from "./ViewModeToggle";

/**
 * FormSchemaBuilder - Visual form builder for creating indicator form schemas
 *
 * This component provides a drag-and-drop interface for MLGOO users to build
 * dynamic form schemas with 7 different field types.
 *
 * Layout:
 * - Left: Field Palette (drag source for field types)
 * - Center: Canvas (drop zone and field ordering)
 * - Right: Field Properties Panel (configure selected field)
 *
 * Features:
 * - Drag-and-drop field creation and reordering
 * - Real-time field configuration
 * - Live preview mode
 * - JSON export
 * - Validation before save
 */
export function FormSchemaBuilder() {
  const { fields, selectedFieldId, isDirty, reorderFields } = useFormBuilderStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPropertiesPanelCollapsed, setIsPropertiesPanelCollapsed] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("builder");

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    })
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((field) => field.field_id === active.id);
      const newIndex = fields.findIndex((field) => field.field_id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderFields(oldIndex, newIndex);
      }
    }

    setActiveId(null);
  };

  // Get the active field for drag overlay
  const activeField = activeId ? fields.find((f) => f.field_id === activeId) : null;

  return (
    <div className="flex h-full flex-col">
      {/* View Mode Toggle */}
      <div className="border-b border-[var(--border)] bg-[var(--card)] px-6 py-4">
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* Conditional Rendering Based on View Mode */}
      {viewMode === "preview" && (
        <div className="flex-1 overflow-auto">
          <FormPreview />
        </div>
      )}

      {viewMode === "json" && (
        <div className="flex-1 overflow-auto">
          <JsonViewer />
        </div>
      )}

      {viewMode === "builder" && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex h-full min-h-[600px] w-full flex-1">
            {/* Left Sidebar - Field Palette */}
            <aside
              className={`
          border-r border-[var(--border)] bg-[var(--muted)]/20 transition-all duration-300
          ${isSidebarCollapsed ? "w-0 overflow-hidden" : "w-64"}
        `}
            >
              <div className="h-full p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--foreground)]">Field Types</h3>
                  <button
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    aria-label="Collapse sidebar"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                      />
                    </svg>
                  </button>
                </div>

                {/* FieldPalette component */}
                <FieldPalette />
              </div>
            </aside>

            {/* Expand button when sidebar is collapsed */}
            {isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="flex h-full w-8 items-center justify-center border-r border-[var(--border)] bg-[var(--muted)]/20 hover:bg-[var(--muted)]/30"
                aria-label="Expand sidebar"
              >
                <svg
                  className="h-5 w-5 text-[var(--muted-foreground)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}

            {/* Center - Canvas (Drop Zone) */}
            <main className="flex-1 overflow-auto bg-[var(--background)]">
              <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--foreground)]">Form Builder</h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Drag fields from the palette to build your form
                    </p>
                  </div>

                  {/* Dirty indicator */}
                  {isDirty && (
                    <span className="inline-flex items-center rounded-full bg-[var(--cityscape-yellow)]/20 px-3 py-1 text-xs font-medium text-[var(--cityscape-yellow)]">
                      <svg
                        className="-ml-0.5 mr-1.5 h-2 w-2 fill-[var(--cityscape-yellow)]"
                        viewBox="0 0 8 8"
                      >
                        <circle cx={4} cy={4} r={3} />
                      </svg>
                      Unsaved changes
                    </span>
                  )}
                </div>

                {/* Canvas content */}
                {fields.length === 0 ? (
                  // Empty state
                  <div className="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--muted)]/10">
                    <div className="text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-[var(--muted-foreground)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-[var(--foreground)]">
                        No fields yet
                      </h3>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        Click field types from the left palette to get started
                      </p>
                    </div>
                  </div>
                ) : (
                  // Fields list with sortable context
                  <SortableContext
                    items={fields.map((f) => f.field_id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {fields.map((field) => (
                        <FieldCanvasItem key={field.field_id} field={field} />
                      ))}
                    </div>
                  </SortableContext>
                )}
              </div>
            </main>

            {/* Right Sidebar - Field Properties Panel */}
            <aside
              className={`
          border-l border-[var(--border)] bg-[var(--muted)]/20 transition-all duration-300
          ${isPropertiesPanelCollapsed ? "w-0 overflow-hidden" : "w-80"}
        `}
            >
              <div className="h-full p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--foreground)]">Field Properties</h3>
                  <button
                    onClick={() => setIsPropertiesPanelCollapsed(true)}
                    className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    aria-label="Collapse properties panel"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 5l7 7-7 7M5 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>

                {/* Properties panel content */}
                <FieldPropertiesPanel />
              </div>
            </aside>

            {/* Expand button when properties panel is collapsed */}
            {isPropertiesPanelCollapsed && (
              <button
                onClick={() => setIsPropertiesPanelCollapsed(false)}
                className="flex h-full w-8 items-center justify-center border-l border-[var(--border)] bg-[var(--muted)]/20 hover:bg-[var(--muted)]/30"
                aria-label="Expand properties panel"
              >
                <svg
                  className="h-5 w-5 text-[var(--muted-foreground)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Drag Overlay - Shows dragged item */}
          <DragOverlay>
            {activeField ? (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-lg opacity-90">
                <p className="text-sm font-medium text-[var(--foreground)]">{activeField.label}</p>
                <p className="text-xs text-[var(--text-secondary)]">{activeField.field_type}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
