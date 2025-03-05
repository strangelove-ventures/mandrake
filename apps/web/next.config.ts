import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  // Specify server-only packages
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    serverComponentsExternalPackages: [
      '@mandrake/workspace',
      '@mandrake/mcp', 
      '@mandrake/session',
      '@mandrake/utils'
    ],
  },
  // Exclude or "empty out" the server-only packages for client
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // These packages should never be used on the client side
      config.resolve.alias = {
        ...config.resolve.alias,
        '@mandrake/workspace': false,
        '@mandrake/mcp': false,
        '@mandrake/session': false,
        '@mandrake/utils': false,
        'bun:sqlite': false
      };
    }
    return config;
  },
};

export default nextConfig;
