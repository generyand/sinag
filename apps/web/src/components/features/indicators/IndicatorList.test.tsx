/**
 * Tests for IndicatorList component
 *
 * Tests loading states, error states, data rendering, search, filters, and pagination.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import IndicatorList from './IndicatorList';
import type { IndicatorResponse } from '@sinag/shared';

// Mock the custom hooks
vi.mock('@/hooks/useIndicators', () => ({
  useIndicators: vi.fn(),
}));

import { useIndicators } from '@/hooks/useIndicators';

const mockUseIndicators = useIndicators as ReturnType<typeof vi.fn>;

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

// Mock indicator data
const mockIndicators: IndicatorResponse[] = [
  {
    id: 1,
    name: 'Indicator A',
    description: 'Description A',
    governance_area_id: 1,
    version: 1,
    is_active: true,
    is_auto_calculable: false,
    is_profiling_only: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    governance_area: {
      id: 1,
      name: 'Governance Area 1',
      area_type: 'CORE',
    },
  },
  {
    id: 2,
    name: 'Indicator B',
    description: 'Description B',
    governance_area_id: 2,
    version: 2,
    is_active: true,
    is_auto_calculable: true,
    is_profiling_only: false,
    created_at: '2025-01-02T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
    governance_area: {
      id: 2,
      name: 'Governance Area 2',
      area_type: 'ESSENTIAL',
    },
  },
  {
    id: 3,
    name: 'Indicator C Inactive',
    description: 'Description C',
    governance_area_id: 1,
    version: 1,
    is_active: false,
    is_auto_calculable: false,
    is_profiling_only: true,
    created_at: '2025-01-03T00:00:00Z',
    updated_at: '2025-01-03T00:00:00Z',
    governance_area: {
      id: 1,
      name: 'Governance Area 1',
      area_type: 'CORE',
    },
  },
];

describe('IndicatorList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state with skeletons', () => {
    mockUseIndicators.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    renderWithQueryClient(
      <IndicatorList indicators={[]} isLoading={true} onCreateNew={vi.fn()} />
    );

    // Check for loading indicators (skeletons or spinners)
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders error state with user-friendly message', () => {
    const errorMessage = 'Failed to fetch indicators';

    renderWithQueryClient(
      <IndicatorList
        indicators={[]}
        isLoading={false}
        error={new Error(errorMessage)}
        onCreateNew={vi.fn()}
      />
    );

    expect(screen.getByText(/error/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(errorMessage, 'i'))).toBeInTheDocument();
  });

  it('renders indicator cards with correct data', () => {
    renderWithQueryClient(
      <IndicatorList
        indicators={mockIndicators}
        isLoading={false}
        onCreateNew={vi.fn()}
      />
    );

    // Check that all indicators are rendered
    expect(screen.getByText('Indicator A')).toBeInTheDocument();
    expect(screen.getByText('Indicator B')).toBeInTheDocument();
    expect(screen.getByText('Indicator C Inactive')).toBeInTheDocument();

    // Check governance area names
    expect(screen.getAllByText('Governance Area 1')).toHaveLength(2);
    expect(screen.getByText('Governance Area 2')).toBeInTheDocument();

    // Check version badges
    expect(screen.getAllByText(/version 1/i)).toHaveLength(2);
    expect(screen.getByText(/version 2/i)).toBeInTheDocument();
  });

  it('displays active/inactive badges correctly', () => {
    renderWithQueryClient(
      <IndicatorList
        indicators={mockIndicators}
        isLoading={false}
        onCreateNew={vi.fn()}
      />
    );

    // Active badges
    const activeBadges = screen.getAllByText(/active/i);
    expect(activeBadges.length).toBeGreaterThanOrEqual(2);

    // Inactive badge
    expect(screen.getByText(/inactive/i)).toBeInTheDocument();
  });

  it('displays auto-calculable badge when applicable', () => {
    renderWithQueryClient(
      <IndicatorList
        indicators={mockIndicators}
        isLoading={false}
        onCreateNew={vi.fn()}
      />
    );

    // Only Indicator B has auto-calculable = true
    const autoCalcBadges = screen.getAllByText(/auto/i);
    expect(autoCalcBadges).toHaveLength(1);
  });

  it('filters indicators by search query', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <IndicatorList
        indicators={mockIndicators}
        isLoading={false}
        onCreateNew={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search/i);

    // Search for "Indicator B"
    await user.type(searchInput, 'Indicator B');

    await waitFor(() => {
      expect(screen.getByText('Indicator B')).toBeInTheDocument();
      expect(screen.queryByText('Indicator A')).not.toBeInTheDocument();
      expect(screen.queryByText('Indicator C Inactive')).not.toBeInTheDocument();
    });
  });

  it('filters indicators by governance area', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <IndicatorList
        indicators={mockIndicators}
        isLoading={false}
        onCreateNew={vi.fn()}
      />
    );

    // Find and click governance area filter
    const areaFilter = screen.getByLabelText(/governance area/i);
    await user.click(areaFilter);

    // Select "Governance Area 1"
    const area1Option = screen.getByText('Governance Area 1');
    await user.click(area1Option);

    await waitFor(() => {
      // Should show only indicators from Area 1
      expect(screen.getByText('Indicator A')).toBeInTheDocument();
      expect(screen.getByText('Indicator C Inactive')).toBeInTheDocument();
      expect(screen.queryByText('Indicator B')).not.toBeInTheDocument();
    });
  });

  it('filters indicators by active/inactive status', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <IndicatorList
        indicators={mockIndicators}
        isLoading={false}
        onCreateNew={vi.fn()}
      />
    );

    // Find and click status filter
    const statusFilter = screen.getByLabelText(/status/i);
    await user.click(statusFilter);

    // Select "Inactive"
    const inactiveOption = screen.getByText('Inactive');
    await user.click(inactiveOption);

    await waitFor(() => {
      // Should show only inactive indicators
      expect(screen.getByText('Indicator C Inactive')).toBeInTheDocument();
      expect(screen.queryByText('Indicator A')).not.toBeInTheDocument();
      expect(screen.queryByText('Indicator B')).not.toBeInTheDocument();
    });
  });

  it('calls onCreateNew when Create Indicator button is clicked', async () => {
    const user = userEvent.setup();
    const onCreateNew = vi.fn();

    renderWithQueryClient(
      <IndicatorList
        indicators={mockIndicators}
        isLoading={false}
        onCreateNew={onCreateNew}
      />
    );

    const createButton = screen.getByRole('button', { name: /create indicator/i });
    await user.click(createButton);

    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });

  it('displays empty state when no indicators match filters', async () => {
    const user = userEvent.setup();

    renderWithQueryClient(
      <IndicatorList
        indicators={mockIndicators}
        isLoading={false}
        onCreateNew={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search/i);

    // Search for non-existent indicator
    await user.type(searchInput, 'NonExistentIndicator');

    await waitFor(() => {
      expect(screen.getByText(/no indicators found/i)).toBeInTheDocument();
    });
  });

  it('renders with no indicators (empty state)', () => {
    renderWithQueryClient(
      <IndicatorList indicators={[]} isLoading={false} onCreateNew={vi.fn()} />
    );

    expect(screen.getByText(/no indicators/i)).toBeInTheDocument();
  });

  it('navigates to indicator detail when card is clicked', async () => {
    const user = userEvent.setup();
    const mockPush = vi.fn();

    // Mock useRouter
    vi.mock('next/navigation', () => ({
      useRouter: () => ({ push: mockPush }),
    }));

    renderWithQueryClient(
      <IndicatorList
        indicators={mockIndicators}
        isLoading={false}
        onCreateNew={vi.fn()}
      />
    );

    const indicatorCard = screen.getByText('Indicator A').closest('div[role="button"]');
    if (indicatorCard) {
      await user.click(indicatorCard);
      expect(mockPush).toHaveBeenCalledWith('/mlgoo/indicators/1');
    }
  });
});
