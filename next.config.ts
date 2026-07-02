import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // P2-6: strip Next.js's default `s-maxage=31536000` prerender cache so
  // browsers don't hold onto HTML that references stale chunk hashes from a
  // previous build. Without this, a page can be served with chunk paths
  // that no longer exist on disk → 404 ChunkLoadError until the user does
  // a hard refresh. Static hashed assets in /_next/static/* keep their
  // long-lived caching (their filenames change between builds).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },
};

export default nextConfig;
