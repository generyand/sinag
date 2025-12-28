import { FormSchemaBuilder } from "@/components/features/indicators/FormSchemaBuilder";

/**
 * Form Builder Demo Page
 *
 * Temporary page for testing the FormSchemaBuilder component.
 * This will be replaced by the proper indicator creation/editing pages in Story 2.6.
 */
export default function FormBuilderDemoPage() {
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Form Schema Builder Demo</h1>
        <p className="mt-1 text-sm text-gray-500">
          Test the drag-and-drop form builder (Story 2.3 & 2.4 complete)
        </p>
      </div>

      {/* Form Builder */}
      <div className="flex-1 overflow-hidden">
        <FormSchemaBuilder />
      </div>
    </div>
  );
}
