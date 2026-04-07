import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  allowedDevOrigins: ['100.65.226.67', '100.82.182.82']
};

export default nextConfig;
