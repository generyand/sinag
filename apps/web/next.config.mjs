/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['canvas'],

  // Enable standalone output for Docker production builds
  // This creates a minimal production bundle with all dependencies included
  output: 'standalone',

  webpack: (config) => {
    // Exclude native 'canvas' from client bundles; some dependencies attempt to resolve it
    // even though it's only needed in Node environments.
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
      'canvas/node': false,
    };
    // Additionally mark as external to avoid bundling if referenced
    config.externals = config.externals || [];
    config.externals.push('canvas');
    return config;
  },
};

export default nextConfig;


