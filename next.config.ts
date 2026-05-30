import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["three", "gsap"],
  },
};

export default nextConfig;
