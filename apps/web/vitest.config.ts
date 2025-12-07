import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: true,
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "vitest.setup.ts",
        "**/*.config.{ts,js}",
        "**/types/**",
        "**/*.test.{ts,tsx}",
        "**/__tests__/**",
        "**/generated/**",
      ],
      thresholds: {
        // Start with achievable thresholds, increase over time
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@sinag/shared": path.resolve(__dirname, "../../packages/shared/src/generated/index.ts"),
    },
    conditions: ["import", "module", "node", "default"],
  },
});
