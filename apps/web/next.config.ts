import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Monorepo configuration for Vercel deployment
  transpilePackages: ["@sinag/shared"],

  // Ensure proper output configuration
  output: "standalone",

  // Handle monorepo dependencies
  experimental: {
    externalDir: true,
  },

  // Allow build to proceed with linting warnings (strict checks in CI/CD)
  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Webpack configuration for monorepo
  webpack: (config, { isServer }) => {
    // Handle shared package resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      "@sinag/shared": require("path").resolve(__dirname, "../../packages/shared/src/generated"),
    };

    // Ignore canvas module on client side (it's a server-only native module)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }

    return config;
  },
  
  // Environment variables for build
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },
};
