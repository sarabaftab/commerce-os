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
    // Product media may live on Supabase Storage or arbitrary HTTPS CDNs.
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co", pathname: "/**" },
      { protocol: "https", hostname: "**.supabase.in", pathname: "/**" },
      { protocol: "https", hostname: "**", pathname: "/**" },
      { protocol: "http", hostname: "localhost", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", pathname: "/**" },
    ],
  },
};

export default nextConfig;
