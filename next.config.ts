import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Development-time proxy: forward /api/* to the backend to avoid CORS preflight locally.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:11211/api/:path*',
      },
    ];
  },
};

export default nextConfig;
