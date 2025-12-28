"use client";

import type { FormField } from "@/store/useFormBuilderStore";
import { useFormBuilderStore } from "@/store/useFormBuilderStore";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  Circle,
  GripVertical,
  Hash,
  Trash2,
  Type,
  Upload,
} from "lucide-react";

/**
 * Map field types to their icons and colors
 */
const FIELD_TYPE_CONFIG = {
  checkbox_group: {
    icon: CheckSquare,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  radio_button: {
    icon: Circle,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  number_input: {
    icon: Hash,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  text_input: {
    icon: Type,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  text_area: {
    icon: AlignLeft,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
  },
  date_picker: {
    icon: Calendar,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
  },
  file_upload: {
    icon: Upload,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
} as const;

interface FieldCanvasItemProps {
  field: FormField;
}

/**
 * FieldCanvasItem Component
 *
 * A draggable, sortable field item displayed in the canvas.
 *
 * Features:
 * - Drag handle for reordering
 * - Click to select and edit in properties panel
 * - Delete button
 * - Visual indicator when selected
 * - Field type icon and metadata display
 */
export function FieldCanvasItem({ field }: FieldCanvasItemProps) {
  const { selectedFieldId, selectField, deleteField } = useFormBuilderStore();

  // Sortable hook for drag-and-drop
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.field_id,
  });

  // Apply transform styles
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Get field type configuration
  const config = FIELD_TYPE_CONFIG[field.field_type as keyof typeof FIELD_TYPE_CONFIG];
  const Icon = config?.icon || Type;

  // Check if this field is selected
  const isSelected = selectedFieldId === field.field_id;

  // Handle field selection
  const handleSelect = () => {
    selectField(field.field_id);
  };

  // Handle field deletion
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selection when deleting
    if (confirm(`Delete field "${field.label}"?`)) {
      deleteField(field.field_id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative rounded-lg border-2 bg-white transition-all
        ${isDragging ? "opacity-50 shadow-2xl" : "shadow-sm hover:shadow-md"}
        ${isSelected ? `${config.borderColor} ring-2 ring-offset-2` : "border-gray-200"}
        ${isSelected ? config.bgColor : "hover:bg-gray-50"}
      `}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className={`
            flex-shrink-0 cursor-grab active:cursor-grabbing
            text-gray-400 hover:text-gray-600
            focus:outline-none
          `}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Field Icon and Content */}
        <div onClick={handleSelect} className="flex-1 cursor-pointer min-w-0">
          <div className="flex items-center gap-2">
            <div className={`flex-shrink-0 ${config.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{field.label}</p>
              <p className="text-xs text-gray-500">
                {field.field_type?.replace("_", " ") || "Unknown"} • {field.field_id}
                {field.required && <span className="ml-2 text-red-600">Required</span>}
              </p>
            </div>
          </div>

          {/* Field-specific metadata */}
          <div className="mt-2 text-xs text-gray-500">
            {/* Show options count for checkbox/radio */}
            {"options" in field && field.options && <span>{field.options.length} options</span>}
            {/* Show max length for text fields */}
            {"max_length" in field && field.max_length && (
              <span>Max length: {field.max_length}</span>
            )}
            {/* Show min/max for number fields */}
            {"min_value" in field && field.min_value !== undefined && (
              <span>Min: {field.min_value}</span>
            )}
            {"max_value" in field && field.max_value !== undefined && (
              <span> Max: {field.max_value}</span>
            )}
            {/* Show file constraints */}
            {"allowed_file_types" in field && field.allowed_file_types && (
              <span>
                Files: {field.allowed_file_types.join(", ")}
                {field.max_file_size_mb && ` (max ${field.max_file_size_mb}MB)`}
              </span>
            )}
          </div>
        </div>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          className={`
            flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity
            text-gray-400 hover:text-red-600 focus:opacity-100 focus:outline-none
          `}
          aria-label="Delete field"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div
          className={`absolute -left-1 top-0 bottom-0 w-1 rounded-l-lg ${config.color.replace("text", "bg")}`}
        />
      )}
    </div>
  );
}
