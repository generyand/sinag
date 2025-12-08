import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi, beforeEach } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Setup global mocks before each test
beforeEach(() => {
  // Mock fetch globally
  global.fetch = vi.fn();
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/analytics",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Zustand stores
vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 1, email: "test@example.com", role: "MLGOO_DILG" },
    isAuthenticated: true,
    setUser: vi.fn(),
  })),
}));

// Mock environment variables for Supabase
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock pointer capture API for Radix UI
if (typeof HTMLElement !== "undefined") {
  HTMLElement.prototype.hasPointerCapture = vi.fn();
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
}
