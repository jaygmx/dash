import type { NextConfig } from "next";

// Security + cache headers, ported from the source `public/_headers`
// (Cloudflare Pages). Next serves `/_next/static/*` immutable already; the
// `/assets/*` and `/favicon.svg` rules below mirror the source for any static
// files we add under `public/`.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // TypeScript errors still fail the build (a real correctness guard). ESLint
  // is run separately, not as a build gate, to keep Vercel builds deterministic.
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        source: "/assets/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/favicon.svg",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
      },
    ];
  },
};

export default nextConfig;
