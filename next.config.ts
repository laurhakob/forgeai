import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    position: "bottom-right",
  },
  images: {
    remotePatterns: [
      {
        hostname: "91zwtiblc3.ufs.sh",
      },
    ],
  },
};

export default nextConfig;
