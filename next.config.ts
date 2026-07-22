import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Next.js assets when the storefront is opened via an HTTPS tunnel (Telegram Mini App).
  allowedDevOrigins: [
    "*.ngrok-free.dev",
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.trycloudflare.com",
  ],
};

export default nextConfig;
