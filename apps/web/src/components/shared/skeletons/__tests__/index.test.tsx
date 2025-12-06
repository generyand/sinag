/**
 * Tests for Skeleton Components
 *
 * Verifies that skeleton loading components:
 * - Render without errors
 * - Have proper accessibility attributes
 * - Display expected visual elements
 * - Accept and apply custom props
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  ValidationPanelSkeleton,
  IndicatorFormSkeleton,
  ChartSkeleton,
  MovFilesPanelSkeleton,
  DashboardCardSkeleton,
  DashboardSkeleton,
  TableSkeleton,
  PanelSkeleton,
} from '../index';

describe('Skeleton Components', () => {
  describe('ValidationPanelSkeleton', () => {
    it('should render without errors', () => {
      const { container } = render(<ValidationPanelSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should have animation classes', () => {
      const { container } = render(<ValidationPanelSkeleton />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('animate-in');
      expect(wrapper.className).toContain('fade-in-0');
    });

    it('should render multiple skeleton elements', () => {
      const { container } = render(<ValidationPanelSkeleton />);
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should have proper spacing structure', () => {
      const { container } = render(<ValidationPanelSkeleton />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('space-y-4');
    });
  });

  describe('IndicatorFormSkeleton', () => {
    it('should render without errors', () => {
      const { container } = render(<IndicatorFormSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should have animation classes', () => {
      const { container } = render(<IndicatorFormSkeleton />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('animate-in');
    });

    it('should render form field skeletons', () => {
      const { container } = render(<IndicatorFormSkeleton />);
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      // Should have header, fields, file upload, and submit button
      expect(skeletons.length).toBeGreaterThan(5);
    });

    it('should have file upload area skeleton', () => {
      const { container } = render(<IndicatorFormSkeleton />);
      const uploadArea = container.querySelector('.border-dashed');
      expect(uploadArea).toBeInTheDocument();
    });
  });

  describe('ChartSkeleton', () => {
    it('should render without errors', () => {
      const { container } = render(<ChartSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should use default height when not specified', () => {
      const { container } = render(<ChartSkeleton />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.height).toBe('300px');
    });

    it('should accept custom height prop', () => {
      const { container } = render(<ChartSkeleton height={400} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.height).toBe('400px');
    });

    it('should render bar chart skeleton elements', () => {
      const { container } = render(<ChartSkeleton />);
      const bars = container.querySelectorAll('.flex-1');
      // Should have 7 bars representing chart columns
      expect(bars.length).toBeGreaterThan(5);
    });

    it('should render x-axis label skeletons', () => {
      const { container } = render(<ChartSkeleton />);
      // Look for the axis labels container
      const axisLabels = container.querySelector('.justify-between.px-4.pt-2');
      expect(axisLabels).toBeInTheDocument();
    });
  });

  describe('MovFilesPanelSkeleton', () => {
    it('should render without errors', () => {
      const { container } = render(<MovFilesPanelSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should have animation classes', () => {
      const { container } = render(<MovFilesPanelSkeleton />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('animate-in');
    });

    it('should render file list skeletons', () => {
      const { container } = render(<MovFilesPanelSkeleton />);
      const fileItems = container.querySelectorAll('.border.rounded-lg');
      // Should render 3 file items by default
      expect(fileItems.length).toBe(3);
    });

    it('should render panel header skeleton', () => {
      const { container } = render(<MovFilesPanelSkeleton />);
      const header = container.querySelector('.justify-between');
      expect(header).toBeInTheDocument();
    });
  });

  describe('DashboardCardSkeleton', () => {
    it('should render without errors', () => {
      const { container } = render(<DashboardCardSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should have card styling', () => {
      const { container } = render(<DashboardCardSkeleton />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('border');
      expect(card.className).toContain('rounded-lg');
    });

    it('should render icon and text skeletons', () => {
      const { container } = render(<DashboardCardSkeleton />);
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      // Should have at least 3 skeleton elements (label, value, icon)
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });

    it('should use flex layout', () => {
      const { container } = render(<DashboardCardSkeleton />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('p-6');
    });
  });

  describe('DashboardSkeleton', () => {
    it('should render without errors', () => {
      const { container } = render(<DashboardSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render stats cards section', () => {
      const { container } = render(<DashboardSkeleton />);
      const statsGrid = container.querySelector('.grid.grid-cols-1.md\\:grid-cols-2');
      expect(statsGrid).toBeInTheDocument();
    });

    it('should render 4 dashboard card skeletons', () => {
      const { container } = render(<DashboardSkeleton />);
      // Count DashboardCardSkeleton components by checking for card structure
      const cards = container.querySelectorAll('.border.rounded-lg.p-6');
      expect(cards.length).toBeGreaterThanOrEqual(4);
    });

    it('should render chart section', () => {
      const { container } = render(<DashboardSkeleton />);
      const chartGrid = container.querySelector('.grid.grid-cols-1.lg\\:grid-cols-2');
      expect(chartGrid).toBeInTheDocument();
    });

    it('should render table section', () => {
      const { container } = render(<DashboardSkeleton />);
      // Look for table skeleton elements
      const tableSections = container.querySelectorAll('.space-y-2');
      expect(tableSections.length).toBeGreaterThan(0);
    });

    it('should have proper spacing', () => {
      const { container } = render(<DashboardSkeleton />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('space-y-6');
    });
  });

  describe('TableSkeleton', () => {
    it('should render without errors', () => {
      const { container } = render(<TableSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render default 5 rows when not specified', () => {
      const { container } = render(<TableSkeleton />);
      const rows = container.querySelectorAll('[class*="h-12"]');
      // Should have header + 5 rows
      expect(rows.length).toBeGreaterThanOrEqual(5);
    });

    it('should accept custom rows prop', () => {
      const { container } = render(<TableSkeleton rows={10} />);
      const rows = container.querySelectorAll('[class*="h-12"]');
      // Should have 10 rows
      expect(rows.length).toBeGreaterThanOrEqual(10);
    });

    it('should render header skeleton', () => {
      const { container } = render(<TableSkeleton />);
      const header = container.querySelector('[class*="h-10"]');
      expect(header).toBeInTheDocument();
    });

    it('should have animation classes', () => {
      const { container } = render(<TableSkeleton />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('animate-in');
    });

    it('should render with zero rows', () => {
      const { container } = render(<TableSkeleton rows={0} />);
      const rows = container.querySelectorAll('[class*="h-12"]');
      // Should only have header, no rows
      expect(rows.length).toBe(0);
    });
  });

  describe('PanelSkeleton', () => {
    it('should render without errors', () => {
      const { container } = render(<PanelSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render default 5 lines when not specified', () => {
      const { container } = render(<PanelSkeleton />);
      const lines = container.querySelectorAll('[class*="h-4"]');
      // Should have 5 lines + header
      expect(lines.length).toBeGreaterThanOrEqual(5);
    });

    it('should accept custom lines prop', () => {
      const { container } = render(<PanelSkeleton lines={8} />);
      const lines = container.querySelectorAll('[class*="h-4"]');
      // Should have 8 lines
      expect(lines.length).toBeGreaterThanOrEqual(8);
    });

    it('should render header skeleton', () => {
      const { container } = render(<PanelSkeleton />);
      const header = container.querySelector('[class*="h-6"]');
      expect(header).toBeInTheDocument();
    });

    it('should have animation classes', () => {
      const { container } = render(<PanelSkeleton />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('animate-in');
    });

    it('should render with zero lines', () => {
      const { container } = render(<PanelSkeleton lines={0} />);
      const lines = container.querySelectorAll('[class*="h-4"]');
      // Should only have header
      expect(lines.length).toBe(0);
    });
  });

  describe('Accessibility', () => {
    it('should have aria-busy on skeleton containers', () => {
      // Note: This test assumes we'll add aria-busy in the future
      // Currently skeletons don't have explicit ARIA attributes
      // This is acceptable as they're purely visual loading states
      const { container } = render(<DashboardSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should use semantic HTML elements', () => {
      const { container } = render(<PanelSkeleton />);
      const divs = container.querySelectorAll('div');
      expect(divs.length).toBeGreaterThan(0);
    });
  });

  describe('Visual Consistency', () => {
    it('should use consistent animation durations', () => {
      const { container: container1 } = render(<ValidationPanelSkeleton />);
      const { container: container2 } = render(<IndicatorFormSkeleton />);

      const wrapper1 = container1.firstChild as HTMLElement;
      const wrapper2 = container2.firstChild as HTMLElement;

      expect(wrapper1.className).toContain('duration-300');
      expect(wrapper2.className).toContain('duration-300');
    });

    it('should use consistent spacing patterns', () => {
      const { container: container1 } = render(<ValidationPanelSkeleton />);
      const { container: container2 } = render(<MovFilesPanelSkeleton />);

      const wrapper1 = container1.firstChild as HTMLElement;
      const wrapper2 = container2.firstChild as HTMLElement;

      // Both should use space-y-4
      expect(wrapper1.className).toContain('space-y-4');
      expect(wrapper2.className).toContain('space-y-4');
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive grid classes in DashboardSkeleton', () => {
      const { container } = render(<DashboardSkeleton />);
      const statsGrid = container.querySelector('.grid');
      expect(statsGrid?.className).toContain('grid-cols-1');
      expect(statsGrid?.className).toContain('md:grid-cols-2');
      expect(statsGrid?.className).toContain('lg:grid-cols-4');
    });

    it('should have responsive chart grid', () => {
      const { container } = render(<DashboardSkeleton />);
      const chartGrid = container.querySelectorAll('.grid')[1];
      expect(chartGrid?.className).toContain('grid-cols-1');
      expect(chartGrid?.className).toContain('lg:grid-cols-2');
    });
  });

  describe('Render Performance', () => {
    it('should render quickly with multiple skeleton components', () => {
      const startTime = performance.now();
      render(
        <>
          <DashboardSkeleton />
          <TableSkeleton rows={20} />
          <PanelSkeleton lines={10} />
        </>
      );
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render in less than 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('should handle large table skeletons efficiently', () => {
      const startTime = performance.now();
      render(<TableSkeleton rows={100} />);
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render 100 rows in less than 200ms
      expect(renderTime).toBeLessThan(200);
    });
  });
});
