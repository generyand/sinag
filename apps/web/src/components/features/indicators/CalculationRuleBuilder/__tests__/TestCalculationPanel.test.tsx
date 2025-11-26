/**
 * Tests for TestCalculationPanel component
 *
 * Tests the test calculation interface including:
 * - Component rendering and validation messages
 * - Test execution with Run Test button
 * - Pass/Fail result display
 * - Error handling
 * - Loading states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TestCalculationPanel } from '../TestCalculationPanel';
import { useCalculationRuleStore } from '@/store/useCalculationRuleStore';

// Mock the Zustand store
vi.mock('@/store/useCalculationRuleStore', () => ({
  useCalculationRuleStore: vi.fn(),
}));

// Mock the API hook
vi.mock('@sinag/shared', async () => {
  const actual = await vi.importActual('@sinag/shared');
  return {
    ...actual,
    usePostIndicatorsTestCalculation: vi.fn(),
  };
});

import { usePostIndicatorsTestCalculation } from '@sinag/shared';

const mockUseCalculationRuleStore = useCalculationRuleStore as ReturnType<typeof vi.fn>;
const mockUsePostIndicatorsTestCalculation = usePostIndicatorsTestCalculation as ReturnType<typeof vi.fn>;

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

// Mock form schema (using the structure the component expects)
const mockFormSchema: any = {
  input_fields: [
    {
      field_id: 'text_field',
      label: 'Text Field',
      type: 'text',
      required: true,
    },
    {
      field_id: 'number_field',
      label: 'Number Field',
      type: 'number',
      required: false,
    },
  ],
};

// Mock calculation schema
const mockCalculationSchema = {
  condition_groups: [
    {
      operator: 'AND' as const,
      rules: [
        {
          rule_type: 'MATCH_VALUE' as const,
          field_id: 'text_field',
          operator: '==' as const,
          expected_value: 'approved',
        },
      ],
    },
  ],
  output_status_on_pass: 'Pass' as const,
  output_status_on_fail: 'Fail' as const,
};

describe('TestCalculationPanel', () => {
  const mockIsSchemaValid = vi.fn();
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default store mock
    mockUseCalculationRuleStore.mockReturnValue({
      schema: mockCalculationSchema,
      isSchemaValid: mockIsSchemaValid,
      isDirty: false,
      initializeSchema: vi.fn(),
      loadSchema: vi.fn(),
      addConditionGroup: vi.fn(),
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

    // Default API mock
    mockUsePostIndicatorsTestCalculation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      data: null,
      error: null,
      isSuccess: false,
      isError: false,
    });
  });

  it('renders title and description', () => {
    mockIsSchemaValid.mockReturnValue(true);

    renderWithQueryClient(
      <TestCalculationPanel formSchema={mockFormSchema} />
    );

    expect(screen.getByText(/test calculation/i)).toBeInTheDocument();
    expect(screen.getByText(/test your calculation rules with sample data/i)).toBeInTheDocument();
  });

  it('shows validation error when schema is invalid', () => {
    mockIsSchemaValid.mockReturnValue(false);

    renderWithQueryClient(
      <TestCalculationPanel formSchema={mockFormSchema} />
    );

    expect(screen.getByText(/please add at least one condition group/i)).toBeInTheDocument();
  });

  it('shows error when no form schema provided', () => {
    mockIsSchemaValid.mockReturnValue(true);

    renderWithQueryClient(
      <TestCalculationPanel formSchema={null} />
    );

    expect(screen.getByText(/no form schema found/i)).toBeInTheDocument();
  });

  it('shows error when form schema has no fields', () => {
    mockIsSchemaValid.mockReturnValue(true);

    const emptyFormSchema: any = {
      input_fields: [],
    };

    renderWithQueryClient(
      <TestCalculationPanel formSchema={emptyFormSchema} />
    );

    expect(screen.getByText(/form schema has no fields/i)).toBeInTheDocument();
  });

  it('displays Run Test button when valid', () => {
    mockIsSchemaValid.mockReturnValue(true);

    renderWithQueryClient(
      <TestCalculationPanel formSchema={mockFormSchema} />
    );

    const runButton = screen.getByRole('button', { name: /run test/i });
    expect(runButton).toBeInTheDocument();
    expect(runButton).toBeEnabled();
  });

  it('calls API when Run Test clicked', async () => {
    const user = userEvent.setup();
    mockIsSchemaValid.mockReturnValue(true);

    renderWithQueryClient(
      <TestCalculationPanel formSchema={mockFormSchema} />
    );

    // Click Run Test
    const runButton = screen.getByRole('button', { name: /run test/i });
    await user.click(runButton);

    // Verify mutation was called
    expect(mockMutate).toHaveBeenCalledWith({
      data: {
        calculation_schema: mockCalculationSchema,
        assessment_data: {},
      },
    });
  });

  it('displays loading state during API call', () => {
    mockIsSchemaValid.mockReturnValue(true);
    mockUsePostIndicatorsTestCalculation.mockReturnValue({
      mutate: mockMutate,
      isPending: true,
      data: null,
      error: null,
      isSuccess: false,
      isError: false,
    });

    renderWithQueryClient(
      <TestCalculationPanel formSchema={mockFormSchema} />
    );

    // Check for loading indicator
    expect(screen.getByText(/testing/i)).toBeInTheDocument();
  });

  it('displays Pass result', async () => {
    mockIsSchemaValid.mockReturnValue(true);
    mockUsePostIndicatorsTestCalculation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      data: {
        result: 'Pass',
        explanation: 'All conditions passed',
      },
      error: null,
      isSuccess: true,
      isError: false,
    });

    renderWithQueryClient(
      <TestCalculationPanel formSchema={mockFormSchema} />
    );

    await waitFor(() => {
      expect(screen.getByText('Pass')).toBeInTheDocument();
    });
  });

  it('displays Fail result', async () => {
    mockIsSchemaValid.mockReturnValue(true);
    mockUsePostIndicatorsTestCalculation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      data: {
        result: 'Fail',
        explanation: 'Condition not met',
      },
      error: null,
      isSuccess: true,
      isError: false,
    });

    renderWithQueryClient(
      <TestCalculationPanel formSchema={mockFormSchema} />
    );

    await waitFor(() => {
      expect(screen.getByText('Fail')).toBeInTheDocument();
    });
  });

  it('displays error message when API call fails', async () => {
    mockIsSchemaValid.mockReturnValue(true);
    mockUsePostIndicatorsTestCalculation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      data: null,
      error: new Error('API Error: Invalid schema'),
      isSuccess: false,
      isError: true,
    });

    renderWithQueryClient(
      <TestCalculationPanel formSchema={mockFormSchema} />
    );

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
