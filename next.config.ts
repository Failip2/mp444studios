import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle so the VPS image stays small and does
  // not need node_modules at runtime.
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,

  // All imagery is pre-derived by scripts/build-media.mjs into /public/media,
  // so the runtime image optimiser is never needed. This keeps the VPS from
  // burning CPU on 22 MB source JPEGs.
  images: { unoptimized: true },

  async redirects() {
    return [
      { source: "/equipment", destination: "/udstyr", permanent: true },
      { source: "/cv", destination: "/om-os", permanent: true },
      { source: "/catalog/landing", destination: "/portfolio", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        // Derived media is content-hashed by path + immutable in practice.
        source: "/media/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
