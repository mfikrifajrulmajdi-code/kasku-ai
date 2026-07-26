import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy API calls to Express backend
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
