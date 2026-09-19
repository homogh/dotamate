import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Default is [75]; the auth key art is rendered large and needs to stay
    // near-lossless, so 100 is allowed alongside the site-wide default.
    qualities: [75, 100],
  },
};

export default nextConfig;
