import type { NextConfig } from "next";

/**
 * Payment-proof (and similar) Server Actions upload up to 5 MB of image bytes.
 * Next.js defaults these limits to 1 MB; keep them aligned with a small multipart overhead buffer.
 */
const UPLOAD_BODY_SIZE_LIMIT = "8mb";

const nextConfig: NextConfig = {
  // Allow Next.js assets when the storefront is opened via an HTTPS tunnel (Telegram Mini App).
  allowedDevOrigins: [
    "*.ngrok-free.dev",
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.trycloudflare.com",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: UPLOAD_BODY_SIZE_LIMIT,
    },
    // Requests that pass through middleware (e.g. storefront account routes) also
    // default to a 1 MB client body limit in Next 15.5+.
    middlewareClientMaxBodySize: UPLOAD_BODY_SIZE_LIMIT,
  },
  images: {
    // AUD-009: only fetch/optimize images from known hosts (no wildcard "**").
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co", pathname: "/**" },
      { protocol: "https", hostname: "**.supabase.in", pathname: "/**" },
      { protocol: "http", hostname: "localhost", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", pathname: "/**" },
    ],
  },
  async headers() {
    // AUD-009: harden responses, but do NOT site-wide X-Frame-Options: DENY —
    // Telegram Desktop Mini Apps embed the storefront in an iframe and will show
    // "refused to connect". Allow framing for the storefront; deny it for Admin.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://web.telegram.org https://telegram.org;",
          },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none';" },
        ],
      },
    ];
  },
};

export default nextConfig;
