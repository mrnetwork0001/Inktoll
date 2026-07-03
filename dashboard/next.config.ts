import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: "/proxy/backend/:path*",
        destination: "http://38.49.216.120:3001/:path*",
      },
      {
        source: "/proxy/agent/:path*",
        destination: "http://38.49.216.120:3002/:path*",
      }
    ];
  }
};

export default nextConfig;
