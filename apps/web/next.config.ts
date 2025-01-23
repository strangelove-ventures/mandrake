/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mandrake/storage', '@mandrake/types', '@mandrake/mcp'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000']
    },
    esmExternals: true
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.failback,
        fs: false,
        net: false,
        tls: false
      };
    }
    return config;
  }
};

export default nextConfig;