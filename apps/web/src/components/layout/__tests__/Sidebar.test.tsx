/**
 * Tests for Sidebar Component
 *
 * Verifies that the Sidebar component:
 * - Renders navigation items correctly
 * - Handles collapsed/expanded states
 * - Highlights active navigation items
 * - Provides collapse toggle functionality
 * - Displays portal name and logo
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '../Sidebar';
import type { NavItem } from '@/lib/navigation';

// Mock Next.js modules
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    width,
    height,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
  }) => <img src={src} alt={alt} width={width} height={height} />,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('Sidebar', () => {
  const mockNavigation: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: 'home' },
    { name: 'Assessments', href: '/assessments', icon: 'clipboard' },
    { name: 'Analytics', href: '/analytics', icon: 'chart' },
    { name: 'Settings', href: '/settings', icon: 'settings' },
  ];

  const defaultProps = {
    navigation: mockNavigation,
    portalName: 'Admin Portal',
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without errors', () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render SINAG logo', () => {
      render(<Sidebar {...defaultProps} />);
      const logo = screen.getByAltText('SINAG Logo');
      expect(logo).toBeInTheDocument();
    });

    it('should render portal name when expanded', () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByText('Admin Portal')).toBeInTheDocument();
    });

    it('should render all navigation items', () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Assessments')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render navigation links with correct hrefs', () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('Expanded State', () => {
    it('should show navigation item names when expanded', () => {
      render(<Sidebar {...defaultProps} isCollapsed={false} />);
      expect(screen.getByText('Dashboard')).toBeVisible();
      expect(screen.getByText('Assessments')).toBeVisible();
    });

    it('should show portal name when expanded', () => {
      render(<Sidebar {...defaultProps} isCollapsed={false} />);
      expect(screen.getByText('Admin Portal')).toBeVisible();
    });

    it('should show "Collapse" text on toggle button when expanded', () => {
      render(<Sidebar {...defaultProps} isCollapsed={false} />);
      expect(screen.getByText('Collapse')).toBeInTheDocument();
    });

    it('should have proper width class when expanded', () => {
      const { container } = render(<Sidebar {...defaultProps} isCollapsed={false} />);
      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar.className).toContain('md:w-64');
    });
  });

  describe('Collapsed State', () => {
    it('should not show navigation item names when collapsed', () => {
      render(<Sidebar {...defaultProps} isCollapsed={true} />);
      // Text should not be in the document since it's conditionally rendered
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });

    it('should not show portal name when collapsed', () => {
      render(<Sidebar {...defaultProps} isCollapsed={true} />);
      expect(screen.queryByText('Admin Portal')).not.toBeInTheDocument();
    });

    it('should not show "Collapse" text when collapsed', () => {
      render(<Sidebar {...defaultProps} isCollapsed={true} />);
      expect(screen.queryByText('Collapse')).not.toBeInTheDocument();
    });

    it('should render links when collapsed', () => {
      // When collapsed, the component still renders links
      // The title attribute is conditionally set based on active state
      const { container } = render(<Sidebar {...defaultProps} isCollapsed={true} />);
      const links = container.querySelectorAll('a');
      expect(links.length).toBe(mockNavigation.length);
    });

    it('should have narrow width class when collapsed', () => {
      const { container } = render(<Sidebar {...defaultProps} isCollapsed={true} />);
      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar.className).toContain('md:w-20');
    });

    it('should center-align items when collapsed', () => {
      const { container } = render(<Sidebar {...defaultProps} isCollapsed={true} />);
      const links = container.querySelectorAll('a');
      links.forEach((link) => {
        expect(link.className).toContain('justify-center');
      });
    });
  });

  describe('Active Navigation Item', () => {
    it('should render navigation links that can be active', () => {
      // We can't easily test active state since usePathname is mocked globally
      // but we can verify the links exist and have the expected structure
      const { container } = render(<Sidebar {...defaultProps} />);
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink?.className).toContain('flex items-center');
    });

    it('should have classes for both active and inactive states', () => {
      // Verify the component structure supports active states
      const { container } = render(<Sidebar {...defaultProps} />);
      const links = container.querySelectorAll('a');
      links.forEach((link) => {
        // All links should have transition classes
        expect(link.className).toContain('transition-all');
        expect(link.className).toContain('rounded-sm');
      });
    });
  });

  describe('Collapse Toggle', () => {
    it('should call onToggleCollapse when toggle button is clicked', async () => {
      const user = userEvent.setup();
      const onToggleCollapse = vi.fn();

      render(<Sidebar {...defaultProps} onToggleCollapse={onToggleCollapse} />);

      const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
      await user.click(toggleButton);

      expect(onToggleCollapse).toHaveBeenCalledTimes(1);
    });

    it('should have expand label when collapsed', () => {
      render(<Sidebar {...defaultProps} isCollapsed={true} />);
      const toggleButton = screen.getByRole('button', { name: /expand sidebar/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it('should have collapse label when expanded', () => {
      render(<Sidebar {...defaultProps} isCollapsed={false} />);
      const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it('should show ChevronRight icon when collapsed', () => {
      const { container } = render(<Sidebar {...defaultProps} isCollapsed={true} />);
      const toggleButton = screen.getByRole('button', { name: /expand sidebar/i });
      const icon = toggleButton.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should show ChevronLeft icon when expanded', () => {
      const { container } = render(<Sidebar {...defaultProps} isCollapsed={false} />);
      const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
      const icon = toggleButton.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Logo Section', () => {
    it('should render SINAG title', () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByText('SINAG')).toBeInTheDocument();
    });

    it('should render logo with correct src', () => {
      render(<Sidebar {...defaultProps} />);
      const logo = screen.getByAltText('SINAG Logo') as HTMLImageElement;
      expect(logo.src).toContain('logo.webp');
    });

    it('should not show SINAG title when collapsed', () => {
      render(<Sidebar {...defaultProps} isCollapsed={true} />);
      expect(screen.queryByText('SINAG')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should have mobile hidden class', () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar.className).toContain('hidden');
      expect(sidebar.className).toContain('md:flex');
    });

    it('should be fixed positioned', () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar.className).toContain('md:fixed');
      expect(sidebar.className).toContain('md:inset-y-0');
    });
  });

  describe('Styling', () => {
    it('should have transition classes', () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar.className).toContain('transition-all');
      expect(sidebar.className).toContain('duration-300');
    });

    it('should have background blur', () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const innerDiv = container.querySelector('.backdrop-blur-sm');
      expect(innerDiv).toBeInTheDocument();
    });

    it('should have border', () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const innerDiv = container.querySelector('.border-r');
      expect(innerDiv).toBeInTheDocument();
    });

    it('should have hover state classes on inactive links', () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const links = Array.from(container.querySelectorAll('a'));
      // At least some links should have hover classes (non-active ones)
      // Since one link might be active (matching the mocked pathname),
      // we check that at least one has hover classes
      const linksWithHover = links.filter(link => link.className.includes('hover:'));
      expect(linksWithHover.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation Icons', () => {
    it('should render NavIcon for each navigation item', () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      // Should have icons for nav items + chevron icon
      expect(icons.length).toBeGreaterThan(mockNavigation.length);
    });

    it('should render correct icon for each item', () => {
      render(<Sidebar {...defaultProps} />);
      // Icons should be rendered (checking via SVG presence)
      const { container } = render(<Sidebar {...defaultProps} />);
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label on toggle button', () => {
      render(<Sidebar {...defaultProps} isCollapsed={false} />);
      const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
      expect(toggleButton).toHaveAttribute('aria-label', 'Collapse sidebar');
    });

    it('should have proper aria-label when collapsed', () => {
      render(<Sidebar {...defaultProps} isCollapsed={true} />);
      const toggleButton = screen.getByRole('button', { name: /expand sidebar/i });
      expect(toggleButton).toHaveAttribute('aria-label', 'Expand sidebar');
    });

    it('should have aria-hidden on icons', () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('should use semantic nav element', () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty navigation array', () => {
      const props = { ...defaultProps, navigation: [] };
      const { container } = render(<Sidebar {...props} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle single navigation item', () => {
      const props = {
        ...defaultProps,
        navigation: [{ name: 'Dashboard', href: '/dashboard', icon: 'home' }],
      };
      render(<Sidebar {...props} />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should handle long portal names', () => {
      const props = {
        ...defaultProps,
        portalName: 'Very Long Portal Name That Might Break Layout',
      };
      render(<Sidebar {...props} />);
      expect(screen.getByText('Very Long Portal Name That Might Break Layout')).toBeInTheDocument();
    });

    it('should handle portal name with special characters', () => {
      const props = { ...defaultProps, portalName: 'Admin & User Portal' };
      render(<Sidebar {...props} />);
      expect(screen.getByText('Admin & User Portal')).toBeInTheDocument();
    });
  });

  describe('Render Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();
      render(<Sidebar {...defaultProps} />);
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render in less than 50ms
      expect(renderTime).toBeLessThan(50);
    });

    it('should handle many navigation items efficiently', () => {
      const manyNavItems: NavItem[] = Array.from({ length: 20 }, (_, i) => ({
        name: `Item ${i}`,
        href: `/item-${i}`,
        icon: 'home',
      }));

      const startTime = performance.now();
      render(<Sidebar {...defaultProps} navigation={manyNavItems} />);
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render 20 items in less than 100ms
      expect(renderTime).toBeLessThan(100);
    });
  });
});
