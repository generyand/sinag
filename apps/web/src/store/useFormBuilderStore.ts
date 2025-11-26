import type {
  CheckboxGroupField,
  DatePickerField,
  FileUploadField,
  FormSchemaFieldsItem,
  NumberInputField,
  RadioButtonField,
  TextAreaField,
  TextInputField,
} from '@sinag/shared';
import { create } from 'zustand';

/**
 * Type alias for all form field types
 * Matches the discriminated union from the backend
 */
export type FormField = FormSchemaFieldsItem;

/**
 * Form Builder state interface for managing form schema construction
 */
interface FormBuilderState {
  /** Array of form fields in the schema */
  fields: FormField[];

  /** ID of the currently selected field (for properties panel) */
  selectedFieldId: string | null;

  /** Whether there are unsaved changes */
  isDirty: boolean;

  // Actions
  /** Add a new field to the schema */
  addField: (field: FormField) => void;

  /** Update a field by ID */
  updateField: (fieldId: string, updates: Partial<FormField>) => void;

  /** Delete a field by ID */
  deleteField: (fieldId: string) => void;

  /** Reorder fields (for drag-and-drop) */
  reorderFields: (fromIndex: number, toIndex: number) => void;

  /** Clear all fields */
  clearFields: () => void;

  /** Select a field for editing */
  selectField: (fieldId: string | null) => void;

  /** Load fields from saved schema */
  loadFields: (fields: FormField[]) => void;

  /** Mark as saved (no unsaved changes) */
  markAsSaved: () => void;

  // Selectors
  /** Get a field by ID */
  getFieldById: (fieldId: string) => FormField | undefined;

  /** Get the currently selected field */
  getSelectedField: () => FormField | undefined;
}

/**
 * Zustand store for managing form builder state
 *
 * This store manages the construction of form schemas with drag-and-drop,
 * field configuration, and validation.
 *
 * Note: Does not use persistence to avoid conflicts with indicator editing.
 * State is managed per-session and should be saved explicitly via API.
 */
export const useFormBuilderStore = create<FormBuilderState>((set, get) => ({
  // Initial state
  fields: [],
  selectedFieldId: null,
  isDirty: false,

  // Actions
  addField: (field: FormField) => {
    set((state) => ({
      fields: [...state.fields, field],
      isDirty: true,
    }));
  },

  updateField: (fieldId: string, updates: Partial<FormField>) => {
    set((state) => ({
      fields: state.fields.map((field) =>
        field.field_id === fieldId
          ? { ...field, ...updates } as FormField
          : field
      ),
      isDirty: true,
    }));
  },

  deleteField: (fieldId: string) => {
    set((state) => ({
      fields: state.fields.filter((field) => field.field_id !== fieldId),
      selectedFieldId: state.selectedFieldId === fieldId ? null : state.selectedFieldId,
      isDirty: true,
    }));
  },

  reorderFields: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const newFields = [...state.fields];
      const [movedField] = newFields.splice(fromIndex, 1);
      newFields.splice(toIndex, 0, movedField);

      return {
        fields: newFields,
        isDirty: true,
      };
    });
  },

  clearFields: () => {
    set({
      fields: [],
      selectedFieldId: null,
      isDirty: false,
    });
  },

  selectField: (fieldId: string | null) => {
    set({ selectedFieldId: fieldId });
  },

  loadFields: (fields: FormField[]) => {
    set({
      fields,
      selectedFieldId: null,
      isDirty: false,
    });
  },

  markAsSaved: () => {
    set({ isDirty: false });
  },

  // Selectors
  getFieldById: (fieldId: string) => {
    return get().fields.find((field) => field.field_id === fieldId);
  },

  getSelectedField: () => {
    const { selectedFieldId, fields } = get();
    if (!selectedFieldId) return undefined;
    return fields.find((field) => field.field_id === selectedFieldId);
  },
}));

/**
 * Helper to generate a unique field ID
 */
export const generateFieldId = (fieldType: string, existingIds: string[]): string => {
  let counter = 1;
  let fieldId = `${fieldType}_${counter}`;

  while (existingIds.includes(fieldId)) {
    counter++;
    fieldId = `${fieldType}_${counter}`;
  }

  return fieldId;
};

/**
 * Type guards for field types
 */
export const isCheckboxGroupField = (field: FormField): field is CheckboxGroupField => {
  return field.field_type === 'checkbox_group';
};

export const isRadioButtonField = (field: FormField): field is RadioButtonField => {
  return field.field_type === 'radio_button';
};

export const isNumberInputField = (field: FormField): field is NumberInputField => {
  return field.field_type === 'number_input';
};

export const isTextInputField = (field: FormField): field is TextInputField => {
  return field.field_type === 'text_input';
};

export const isTextAreaField = (field: FormField): field is TextAreaField => {
  return field.field_type === 'text_area';
};

export const isDatePickerField = (field: FormField): field is DatePickerField => {
  return field.field_type === 'date_picker';
};

export const isFileUploadField = (field: FormField): field is FileUploadField => {
  return field.field_type === 'file_upload';
};
