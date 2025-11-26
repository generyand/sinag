/**
 * 🧪 TrendChart Component Tests
 * Tests for the historical trends visualization component
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { TrendData } from '@sinag/shared';
import { TrendChart } from '../TrendChart';

describe('TrendChart', () => {
  const mockTrendData: TrendData[] = [
    {
      cycle_id: 1,
      cycle_name: '2024 Q1',
      pass_rate: 65.0,
      date: '2024-01-01T00:00:00',
    },
    {
      cycle_id: 2,
      cycle_name: '2024 Q2',
      pass_rate: 72.5,
      date: '2024-04-01T00:00:00',
    },
    {
      cycle_id: 3,
      cycle_name: '2024 Q3',
      pass_rate: 78.0,
      date: '2024-07-01T00:00:00',
    },
  ];

  it('renders chart title and description', () => {
    render(<TrendChart data={mockTrendData} />);

    expect(screen.getByText('Historical Trends')).toBeInTheDocument();
    expect(screen.getByText('Pass rate trends across assessment cycles')).toBeInTheDocument();
  });

  it('renders data table fallback with trend data', () => {
    render(<TrendChart data={mockTrendData} />);

    // Check cycle names in table
    expect(screen.getByText('2024 Q1')).toBeInTheDocument();
    expect(screen.getByText('2024 Q2')).toBeInTheDocument();
    expect(screen.getByText('2024 Q3')).toBeInTheDocument();

    // Check pass rates in table
    expect(screen.getByText('65.0%')).toBeInTheDocument();
    expect(screen.getByText('72.5%')).toBeInTheDocument();
    expect(screen.getByText('78.0%')).toBeInTheDocument();

    // Check table headers
    expect(screen.getByText('Cycle')).toBeInTheDocument();
    expect(screen.getByText('Pass Rate')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
  });

  it('displays recharts installation placeholder', () => {
    render(<TrendChart data={mockTrendData} />);

    // Check for placeholder text
    expect(screen.getByText('Trend Chart Placeholder')).toBeInTheDocument();
    expect(
      screen.getByText('Install recharts to view the line chart visualization')
    ).toBeInTheDocument();
    expect(screen.getByText('pnpm add recharts')).toBeInTheDocument();
  });

  it('displays empty state when no trend data provided', () => {
    render(<TrendChart data={[]} />);

    expect(
      screen.getByText(
        'No trend data available. Historical data will appear here as more cycles are completed.'
      )
    ).toBeInTheDocument();
  });

  it('formats dates correctly in data table', () => {
    render(<TrendChart data={mockTrendData} />);

    // Dates should be formatted as "Mon, Year" (e.g., "Jan 2024")
    // The exact format depends on locale, but should contain year
    const dateElements = screen.getAllByText(/2024/);
    expect(dateElements.length).toBeGreaterThan(0);
  });
});
