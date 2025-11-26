/**
 * Tests for CalculationRuleBuilder component
 *
 * Tests the main calculation rule builder interface including:
 * - Component initialization and loading
 * - Schema loading and state management
 * - Condition group management
 * - Output status configuration
 * - onChange callback integration
 * - Validation states
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CalculationRuleBuilder } from '../CalculationRuleBuilder';
import type { CalculationSchema, FormSchema } from '@sinag/shared';
import { useCalculationRuleStore } from '@/store/useCalculationRuleStore';

// Mock the Zustand store
vi.mock('@/store/useCalculationRuleStore', () => ({
  useCalculationRuleStore: vi.fn(),
}));

const mockUseCalculationRuleStore = useCalculationRuleStore as ReturnType<typeof vi.fn>;

// Helper to create a QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

// Helper to wrap component with QueryClientProvider
const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

// Mock form schema
const mockFormSchema: FormSchema = {
  input_fields: [
    {
      id: 'status_field',
      label: 'Status Field',
      type: 'text',
      required: true,
    },
    {
      id: 'percentage_field',
      label: 'Percentage Field',
      type: 'number',
      required: false,
    },
  ],
  sections: [],
};

// Mock calculation schema
const mockCalculationSchema: CalculationSchema = {
  condition_groups: [
    {
      operator: 'AND',
      rules: [
        {
          rule_type: 'MATCH_VALUE',
          field_id: 'status_field',
          operator: '==',
          expected_value: 'approved',
        },
      ],
    },
  ],
  output_status_on_pass: 'Pass',
  output_status_on_fail: 'Fail',
};

describe('CalculationRuleBuilder', () => {
  // Mock store functions
  const mockInitializeSchema = vi.fn();
  const mockLoadSchema = vi.fn();
  const mockAddConditionGroup = vi.fn();
  const mockIsSchemaValid = vi.fn(() => true);

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    mockUseCalculationRuleStore.mockReturnValue({
      schema: null,
      isDirty: false,
      initializeSchema: mockInitializeSchema,
      loadSchema: mockLoadSchema,
      addConditionGroup: mockAddConditionGroup,
      isSchemaValid: mockIsSchemaValid,
      updateConditionGroup: vi.fn(),
      deleteConditionGroup: vi.fn(),
      addRuleToGroup: vi.fn(),
      updateRuleInGroup: vi.fn(),
      deleteRuleFromGroup: vi.fn(),
      setOutputStatusOnPass: vi.fn(),
      setOutputStatusOnFail: vi.fn(),
      selectRule: vi.fn(),
      markAsSaved: vi.fn(),
      getConditionGroup: vi.fn(),
      clearSchema: vi.fn(),
      selectedRuleId: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state when not initialized', () => {
    renderWithQueryClient(
      <CalculationRuleBuilder formSchema={mockFormSchema} />
    );

    expect(screen.getByText(/loading calculation rule builder/i)).toBeInTheDocument();
  });

  it('initializes with empty schema when no initialSchema provided', async () => {
    // Set schema to initialized state after initializeSchema is called
    mockUseCalculationRuleStore.mockReturnValue({
      schema: {
        condition_groups: [],
        output_status_on_pass: 'Pass',
        output_status_on_fail: 'Fail',
      },
      isDirty: false,
      initializeSchema: mockInitializeSchema,
      loadSchema: mockLoadSchema,
      addConditionGroup: mockAddConditionGroup,
      isSchemaValid: vi.fn(() => false),
      updateConditionGroup: vi.fn(),
      deleteConditionGroup: vi.fn(),
      addRuleToGroup: vi.fn(),
      updateRuleInGroup: vi.fn(),
      deleteRuleFromGroup: vi.fn(),
      setOutputStatusOnPass: vi.fn(),
      setOutputStatusOnFail: vi.fn(),
      selectRule: vi.fn(),
      markAsSaved: vi.fn(),
      getConditionGroup: vi.fn(),
      clearSchema: vi.fn(),
      selectedRuleId: null,
    });

    renderWithQueryClient(
      <CalculationRuleBuilder formSchema={mockFormSchema} />
    );

    await waitFor(() => {
      expect(mockInitializeSchema).toHaveBeenCalledTimes(1);
    });
  });

  it('loads existing schema when initialSchema provided', async () => {
    // Set schema to loaded state
    mockUseCalculationRuleStore.mockReturnValue({
      schema: mockCalculationSchema,
      isDirty: false,
      initializeSchema: mockInitializeSchema,
      loadSchema: mockLoadSchema,
      addConditionGroup: mockAddConditionGroup,
      isSchemaValid: vi.fn(() => true),
      updateConditionGroup: vi.fn(),
      deleteConditionGroup: vi.fn(),
      addRuleToGroup: vi.fn(),
      updateRuleInGroup: vi.fn(),
      deleteRuleFromGroup: vi.fn(),
      setOutputStatusOnPass: vi.fn(),
      setOutputStatusOnFail: vi.fn(),
      selectRule: vi.fn(),
      markAsSaved: vi.fn(),
      getConditionGroup: vi.fn(),
      clearSchema: vi.fn(),
      selectedRuleId: null,
    });

    renderWithQueryClient(
      <CalculationRuleBuilder
        initialSchema={mockCalculationSchema}
        formSchema={mockFormSchema}
      />
    );

    await waitFor(() => {
      expect(mockLoadSchema).toHaveBeenCalledWith(mockCalculationSchema);
    });
  });

  it('renders main sections when initialized', () => {
    mockUseCalculationRuleStore.mockReturnValue({
      schema: mockCalculationSchema,
      isDirty: false,
      initializeSchema: mockInitializeSchema,
      loadSchema: mockLoadSchema,
      addConditionGroup: mockAddConditionGroup,
      isSchemaValid: vi.fn(() => true),
      updateConditionGroup: vi.fn(),
      deleteConditionGroup: vi.fn(),
      addRuleToGroup: vi.fn(),
      updateRuleInGroup: vi.fn(),
      deleteRuleFromGroup: vi.fn(),
      setOutputStatusOnPass: vi.fn(),
      setOutputStatusOnFail: vi.fn(),
      selectRule: vi.fn(),
      markAsSaved: vi.fn(),
      getConditionGroup: vi.fn(),
      clearSchema: vi.fn(),
      selectedRuleId: null,
    });

    renderWithQueryClient(
      <CalculationRuleBuilder
        initialSchema={mockCalculationSchema}
        formSchema={mockFormSchema}
      />
    );

    // Check for main title
    expect(screen.getByText(/calculation rule builder/i)).toBeInTheDocument();

    // Check for description
    expect(screen.getByText(/define rules to automatically calculate/i)).toBeInTheDocument();

    // Check for info alert about rule evaluation
    expect(screen.getByText(/rules are evaluated sequentially/i)).toBeInTheDocument();
  });

  it('displays Add Group button', () => {
    mockUseCalculationRuleStore.mockReturnValue({
      schema: mockCalculationSchema,
      isDirty: false,
      initializeSchema: mockInitializeSchema,
      loadSchema: mockLoadSchema,
      addConditionGroup: mockAddConditionGroup,
      isSchemaValid: vi.fn(() => true),
      updateConditionGroup: vi.fn(),
      deleteConditionGroup: vi.fn(),
      addRuleToGroup: vi.fn(),
      updateRuleInGroup: vi.fn(),
      deleteRuleFromGroup: vi.fn(),
      setOutputStatusOnPass: vi.fn(),
      setOutputStatusOnFail: vi.fn(),
      selectRule: vi.fn(),
      markAsSaved: vi.fn(),
      getConditionGroup: vi.fn(),
      clearSchema: vi.fn(),
      selectedRuleId: null,
    });

    renderWithQueryClient(
      <CalculationRuleBuilder
        initialSchema={mockCalculationSchema}
        formSchema={mockFormSchema}
      />
    );

    const addButton = screen.getByRole('button', { name: /add group/i });
    expect(addButton).toBeInTheDocument();
  });

  it('calls addConditionGroup when Add Group button clicked', async () => {
    const user = userEvent.setup();

    mockUseCalculationRuleStore.mockReturnValue({
      schema: mockCalculationSchema,
      isDirty: false,
      initializeSchema: mockInitializeSchema,
      loadSchema: mockLoadSchema,
      addConditionGroup: mockAddConditionGroup,
      isSchemaValid: vi.fn(() => true),
      updateConditionGroup: vi.fn(),
      deleteConditionGroup: vi.fn(),
      addRuleToGroup: vi.fn(),
      updateRuleInGroup: vi.fn(),
      deleteRuleFromGroup: vi.fn(),
      setOutputStatusOnPass: vi.fn(),
      setOutputStatusOnFail: vi.fn(),
      selectRule: vi.fn(),
      markAsSaved: vi.fn(),
      getConditionGroup: vi.fn(),
      clearSchema: vi.fn(),
      selectedRuleId: null,
    });

    renderWithQueryClient(
      <CalculationRuleBuilder
        initialSchema={mockCalculationSchema}
        formSchema={mockFormSchema}
      />
    );

    const addButton = screen.getByRole('button', { name: /add group/i });
    await user.click(addButton);

    expect(mockAddConditionGroup).toHaveBeenCalledWith({
      operator: 'AND',
      rules: [],
    });
  });

  it('calls onChange callback when schema changes', async () => {
    const mockOnChange = vi.fn();

    // Initial render with no schema
    const { rerender } = renderWithQueryClient(
      <CalculationRuleBuilder
        formSchema={mockFormSchema}
        onChange={mockOnChange}
      />
    );

    // Update mock to return initialized schema
    mockUseCalculationRuleStore.mockReturnValue({
      schema: mockCalculationSchema,
      isDirty: false,
      initializeSchema: mockInitializeSchema,
      loadSchema: mockLoadSchema,
      addConditionGroup: mockAddConditionGroup,
      isSchemaValid: vi.fn(() => true),
      updateConditionGroup: vi.fn(),
      deleteConditionGroup: vi.fn(),
      addRuleToGroup: vi.fn(),
      updateRuleInGroup: vi.fn(),
      deleteRuleFromGroup: vi.fn(),
      setOutputStatusOnPass: vi.fn(),
      setOutputStatusOnFail: vi.fn(),
      selectRule: vi.fn(),
      markAsSaved: vi.fn(),
      getConditionGroup: vi.fn(),
      clearSchema: vi.fn(),
      selectedRuleId: null,
    });

    // Rerender to trigger onChange
    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <CalculationRuleBuilder
          formSchema={mockFormSchema}
          onChange={mockOnChange}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(mockCalculationSchema);
    });
  });

  it('renders OutputStatusConfig component', () => {
    mockUseCalculationRuleStore.mockReturnValue({
      schema: mockCalculationSchema,
      isDirty: false,
      initializeSchema: mockInitializeSchema,
      loadSchema: mockLoadSchema,
      addConditionGroup: mockAddConditionGroup,
      isSchemaValid: vi.fn(() => true),
      updateConditionGroup: vi.fn(),
      deleteConditionGroup: vi.fn(),
      addRuleToGroup: vi.fn(),
      updateRuleInGroup: vi.fn(),
      deleteRuleFromGroup: vi.fn(),
      setOutputStatusOnPass: vi.fn(),
      setOutputStatusOnFail: vi.fn(),
      selectRule: vi.fn(),
      markAsSaved: vi.fn(),
      getConditionGroup: vi.fn(),
      clearSchema: vi.fn(),
      selectedRuleId: null,
    });

    renderWithQueryClient(
      <CalculationRuleBuilder
        initialSchema={mockCalculationSchema}
        formSchema={mockFormSchema}
      />
    );

    // Check for output status configuration text
    expect(screen.getByText(/output status/i)).toBeInTheDocument();
  });

  it('renders TestCalculationPanel component', () => {
    mockUseCalculationRuleStore.mockReturnValue({
      schema: mockCalculationSchema,
      isDirty: false,
      initializeSchema: mockInitializeSchema,
      loadSchema: mockLoadSchema,
      addConditionGroup: mockAddConditionGroup,
      isSchemaValid: vi.fn(() => true),
      updateConditionGroup: vi.fn(),
      deleteConditionGroup: vi.fn(),
      addRuleToGroup: vi.fn(),
      updateRuleInGroup: vi.fn(),
      deleteRuleFromGroup: vi.fn(),
      setOutputStatusOnPass: vi.fn(),
      setOutputStatusOnFail: vi.fn(),
      selectRule: vi.fn(),
      markAsSaved: vi.fn(),
      getConditionGroup: vi.fn(),
      clearSchema: vi.fn(),
      selectedRuleId: null,
    });

    renderWithQueryClient(
      <CalculationRuleBuilder
        initialSchema={mockCalculationSchema}
        formSchema={mockFormSchema}
      />
    );

    // Check for test calculation panel
    expect(screen.getByText(/test calculation/i)).toBeInTheDocument();
  });

  it('displays empty state message when no condition groups', () => {
    mockUseCalculationRuleStore.mockReturnValue({
      schema: {
        condition_groups: [],
        output_status_on_pass: 'Pass',
        output_status_on_fail: 'Fail',
      },
      isDirty: false,
      initializeSchema: mockInitializeSchema,
      loadSchema: mockLoadSchema,
      addConditionGroup: mockAddConditionGroup,
      isSchemaValid: vi.fn(() => false),
      updateConditionGroup: vi.fn(),
      deleteConditionGroup: vi.fn(),
      addRuleToGroup: vi.fn(),
      updateRuleInGroup: vi.fn(),
      deleteRuleFromGroup: vi.fn(),
      setOutputStatusOnPass: vi.fn(),
      setOutputStatusOnFail: vi.fn(),
      selectRule: vi.fn(),
      markAsSaved: vi.fn(),
      getConditionGroup: vi.fn(),
      clearSchema: vi.fn(),
      selectedRuleId: null,
    });

    renderWithQueryClient(
      <CalculationRuleBuilder formSchema={mockFormSchema} />
    );

    // Check for empty state message
    expect(screen.getByText(/no condition groups defined/i)).toBeInTheDocument();
  });

  it('passes formSchema to child components', () => {
    mockUseCalculationRuleStore.mockReturnValue({
      schema: mockCalculationSchema,
      isDirty: false,
      initializeSchema: mockInitializeSchema,
      loadSchema: mockLoadSchema,
      addConditionGroup: mockAddConditionGroup,
      isSchemaValid: vi.fn(() => true),
      updateConditionGroup: vi.fn(),
      deleteConditionGroup: vi.fn(),
      addRuleToGroup: vi.fn(),
      updateRuleInGroup: vi.fn(),
      deleteRuleFromGroup: vi.fn(),
      setOutputStatusOnPass: vi.fn(),
      setOutputStatusOnFail: vi.fn(),
      selectRule: vi.fn(),
      markAsSaved: vi.fn(),
      getConditionGroup: vi.fn(),
      clearSchema: vi.fn(),
      selectedRuleId: null,
    });

    renderWithQueryClient(
      <CalculationRuleBuilder
        initialSchema={mockCalculationSchema}
        formSchema={mockFormSchema}
      />
    );

    // TestCalculationPanel should receive formSchema
    expect(screen.getByText(/test calculation/i)).toBeInTheDocument();
  });
});
