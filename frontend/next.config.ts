import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        // In Docker Compose, the backend is reachable at http://backend:8000
        // We allow overriding this via BACKEND_INTERNAL_URL.
        destination: `${process.env.BACKEND_INTERNAL_URL || "http://localhost:8000"}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
