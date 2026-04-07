import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  allowedDevOrigins: ['100.65.226.67']
};

export default nextConfig;
