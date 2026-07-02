import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Use webpack instead of Turbopack for dev mode. Turbopack's file
  // watcher on this machine detects its own cache writes in
  // .next/dev/cache/turbopack/, triggering an infinite HMR fullReload
  // loop. webpack doesn't have this issue.
  webpack: (config) => config,
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
