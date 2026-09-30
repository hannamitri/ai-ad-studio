import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Generated creatives are served from Supabase Storage via short-lived
    // signed URLs. Allow the Supabase project host so next/image can optimise.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default nextConfig;
