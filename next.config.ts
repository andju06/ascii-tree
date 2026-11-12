import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The canvas app wires imperative DOM listeners once per mount; dev double-mounting would duplicate them.
  reactStrictMode: false,
  poweredByHeader: false,
};

export default nextConfig;
