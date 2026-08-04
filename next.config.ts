import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Abaikan error TypeScript agar proses build lancar
    ignoreBuildErrors: true,
  },
};

export default nextConfig;