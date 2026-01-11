import type { NextConfig } from "next";

// Validate required environment variables in production builds
const isProduction = process.env.NODE_ENV === "production";
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (isProduction && (!apiUrl || apiUrl.includes("localhost"))) {
  console.warn(
    "\x1b[33m⚠️  WARNING: NEXT_PUBLIC_API_URL is not set or contains 'localhost' in production build.\x1b[0m"
  );
  console.warn("\x1b[33m   Set NEXT_PUBLIC_API_URL to your production API URL.\x1b[0m");
}

const nextConfig: NextConfig = {
  // Monorepo configuration for Vercel deployment
  transpilePackages: ["@sinag/shared"],

  // Image optimization configuration for external images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Ensure proper output configuration
  output: "standalone",

  // Canvas is a native module needed only server-side
  serverExternalPackages: ["canvas"],

  // Handle monorepo dependencies
  experimental: {
    externalDir: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  // Turbopack configuration (Next.js 16 uses Turbopack by default)
  // Note: transpilePackages handles @sinag/shared resolution in turbopack
  turbopack: {},

  // Webpack configuration for fallback (when using --webpack flag)
  webpack: (config, { isServer }) => {
    // Handle shared package resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      "canvas/node": false,
    };

    // Ignore canvas module on client side (it's a server-only native module)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }

    // Mark canvas as external to avoid bundling
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push("canvas");
    }

    return config;
  },

  // Environment variables for build
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },
};

export default nextConfig;
