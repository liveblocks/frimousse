import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  async rewrites() {
    return [
      {
        source: "/r/:path*",
        destination: "/registry/:path*.json",
      },
    ];
  },
};

export default nextConfig;
