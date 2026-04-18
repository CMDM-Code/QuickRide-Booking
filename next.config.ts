import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['*']
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.kiloapps.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'toyota.com.ph',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
