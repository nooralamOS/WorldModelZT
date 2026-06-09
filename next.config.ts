import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ["three", "gsap", "@sparkjsdev/spark"],
  },
};

export default nextConfig;
