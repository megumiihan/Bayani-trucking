import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Truck certificates (PDF/photo) upload through a server action. Vercel caps
    // request bodies at 4.5 MB, so stay under that.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
