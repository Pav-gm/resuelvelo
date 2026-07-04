import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Force project root to avoid incorrect root inference in nested/workspace setups.
    root: process.cwd(),
  },
};

export default nextConfig;
